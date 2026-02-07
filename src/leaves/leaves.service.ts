import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PoliciesService } from '../policies/policies.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { LeaveRequestType, LeaveStatus } from './enums/leave.enum';
import { LeaveRequest } from '@prisma/client';

@Injectable()
export class LeavesService {
    private readonly logger = new Logger(LeavesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly policiesService: PoliciesService
    ) { }

    /**
     * Calculate available leave balances for an employee
     */
    async getBalances(employeeId: string, currentDate: Date = new Date()) {
        this.logger.log(`Calculating balances for employee ${employeeId}`);

        // Fetch employee with company
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: { company: true }
        });

        if (!employee) {
            throw new NotFoundException(`Employee ${employeeId} not found`);
        }

        // Get effective policy
        const policyDetail = await this.policiesService.getEffectivePolicyDetail(employeeId);
        const leaveTypes = policyDetail.effective.leaves?.leaveTypes || [];

        const balances: Array<{
            leaveTypeId: string;
            leaveTypeName: string;
            leaveTypeCode: string;
            entitled: number;
            used: number;
            pending: number;
            available: number;
            period: { start: Date; end: Date };
        }> = [];

        for (const leaveType of leaveTypes) {
            // Calculate period based on accrual frequency
            const period = this.calculatePeriod(leaveType.accrualFrequency, employee.joinedDate, currentDate);

            // Calculate entitlement
            const entitled = this.calculateEntitlement(leaveType, employee.joinedDate, period);

            // Calculate usage from approved requests
            const used = await this.calculateUsage(employeeId, leaveType.id, period);

            // Calculate pending
            const pending = await this.calculatePending(employeeId, leaveType.id, period);

            balances.push({
                leaveTypeId: leaveType.id,
                leaveTypeName: leaveType.name,
                leaveTypeCode: leaveType.code,
                entitled,
                used,
                pending,
                available: entitled - used - pending,
                period
            });
        }

        return balances;
    }

    /**
     * Create a new leave request
     */
    async createRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
        this.logger.log(`Creating leave request for employee ${dto.employeeId}`);

        // Validate employee exists
        const employee = await this.prisma.employee.findUnique({
            where: { id: dto.employeeId }
        });

        if (!employee) {
            throw new NotFoundException(`Employee ${dto.employeeId} not found`);
        }

        // Get policy to validate leave type
        const policyDetail = await this.policiesService.getEffectivePolicyDetail(dto.employeeId);
        const leaveType = policyDetail.effective.leaves?.leaveTypes?.find(lt => lt.id === dto.leaveTypeId);

        if (!leaveType) {
            throw new BadRequestException(`Leave type ${dto.leaveTypeId} not found in employee policy`);
        }

        // Calculate days and minutes
        const { days, minutes } = this.calculateDuration(dto, leaveType);

        // Calculate period
        const period = this.calculatePeriod(leaveType.accrualFrequency, employee.joinedDate, new Date(dto.startDate));

        // Calculate leave number (frequency tracking)
        const leaveNumber = await this.calculateLeaveNumber(dto.employeeId, dto.leaveTypeId, period);

        // Validate balance
        const balances = await this.getBalances(dto.employeeId, new Date(dto.startDate));
        const balance = balances.find(b => b.leaveTypeId === dto.leaveTypeId);

        if (!balance || balance.available < days) {
            const formatted = balance ? Number(balance.available).toFixed(1).replace(/\.0$/, '') : '0';
            throw new BadRequestException(`Insufficient leave balance. Available: ${formatted}, Requested: ${days}`);
        }

        // Validate short leave duration
        if (dto.type === LeaveRequestType.SHORT_LEAVE && leaveType.isShortLeave) {
            if (minutes && leaveType.maxDurationMinutes && minutes > leaveType.maxDurationMinutes) {
                throw new BadRequestException(`Short leave duration exceeds maximum of ${leaveType.maxDurationMinutes} minutes`);
            }
        }

        // Check for overlapping requests
        // Fetch potential overlaps by date range (inclusive of day)
        // Then perform strict check in memory handling Short vs Full day logic
        const potentialOverlaps = await this.prisma.leaveRequest.findMany({
            where: {
                employeeId: dto.employeeId,
                status: {
                    in: [LeaveStatus.PENDING, LeaveStatus.APPROVED]
                },
                OR: [
                    { startDate: { lte: new Date(dto.endDate) } },
                    { endDate: { gte: new Date(dto.startDate) } }
                ]
            }
        });

        // Current Request Range
        const reqStart = new Date(dto.startDate);
        const reqEnd = new Date(dto.endDate);
        const isReqFullDay = dto.type !== LeaveRequestType.SHORT_LEAVE;

        // If Full Day, normalize to end of day to catch Short Leaves inside
        const normReqStart = new Date(reqStart);
        const normReqEnd = new Date(reqEnd);
        if (isReqFullDay || dto.type === LeaveRequestType.FULL_DAY) {
            normReqStart.setHours(0, 0, 0, 0);
            normReqEnd.setHours(23, 59, 59, 999);
        }

        for (const existing of potentialOverlaps) {
            // Existing Request Range
            const exStart = new Date(existing.startDate);
            const exEnd = new Date(existing.endDate);
            const isExFullDay = existing.type !== LeaveRequestType.SHORT_LEAVE;

            const normExStart = new Date(exStart);
            const normExEnd = new Date(exEnd);

            // Normalize existing if Full Day
            if (isExFullDay) {
                normExStart.setHours(0, 0, 0, 0);
                normExEnd.setHours(23, 59, 59, 999);
            }

            // Strict Overlap Check: StartA < EndB && EndA > StartB
            if (normReqStart < normExEnd && normReqEnd > normExStart) {
                throw new BadRequestException(`Leave request overlaps with an existing request (${existing.startDate.toLocaleDateString()} - ${existing.endDate.toLocaleDateString()})`);
            }
        }

        // Validate Document Requirements
        let documentsRequired = leaveType.requireDocuments;

        if (leaveType.requireDocumentsIfConsecutiveMoreThan && days > leaveType.requireDocumentsIfConsecutiveMoreThan) {
            documentsRequired = true;
        }

        if (documentsRequired && (!dto.documents || dto.documents.length === 0)) {
            throw new BadRequestException("Supporting documents are required for this leave request.");
        }

        // Create request
        return this.prisma.leaveRequest.create({
            data: {
                employeeId: dto.employeeId,
                companyId: dto.companyId,
                leaveTypeId: dto.leaveTypeId,
                leaveTypeName: leaveType.name,
                type: dto.type,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                days,
                minutes,
                leaveNumber,
                reason: dto.reason,
                documents: dto.documents || [],
                status: LeaveStatus.PENDING
            }
        });
    }

    /**
     * Update leave request (approve/reject)
     */
    async updateRequest(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest> {
        this.logger.log(`Updating leave request ${id}`);

        const request = await this.prisma.leaveRequest.findUnique({ where: { id } });

        if (!request) {
            throw new NotFoundException(`Leave request ${id} not found`);
        }

        return this.prisma.leaveRequest.update({
            where: { id },
            data: {
                status: dto.status,
                responseReason: dto.responseReason,
                managerId: dto.managerId
            }
        });
    }

    /**
     * Delete a leave request (only pending requests can be deleted)
     */
    async deleteRequest(id: string): Promise<{ message: string }> {
        this.logger.log(`Deleting leave request ${id}`);

        const request = await this.prisma.leaveRequest.findUnique({ where: { id } });

        if (!request) {
            throw new NotFoundException(`Leave request ${id} not found`);
        }

        if (request.status !== LeaveStatus.PENDING) {
            throw new BadRequestException(`Cannot delete leave request with status ${request.status}. Only pending requests can be deleted.`);
        }

        await this.prisma.leaveRequest.delete({ where: { id } });

        return { message: 'Leave request deleted successfully' };
    }

    /**
     * Get all leave requests for a company
     */
    async findAll(companyId: string, filters?: { status?: LeaveStatus; employeeId?: string }) {
        return this.prisma.leaveRequest.findMany({
            where: {
                companyId,
                ...(filters?.status && { status: filters.status }),
                ...(filters?.employeeId && { employeeId: filters.employeeId })
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeNo: true,
                        nameWithInitials: true,
                        fullName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Get single leave request
     */
    async findOne(id: string): Promise<LeaveRequest> {
        const request = await this.prisma.leaveRequest.findUnique({
            where: { id },
            include: {
                employee: true
            }
        });

        if (!request) {
            throw new NotFoundException(`Leave request ${id} not found`);
        }

        return request;
    }

    // ===== HELPER METHODS =====

    private calculatePeriod(frequency: string, joinedDate: Date, currentDate: Date) {
        const start = new Date(currentDate);
        const end = new Date(currentDate);

        switch (frequency) {
            case 'MONTHLY':
                start.setDate(1);
                end.setMonth(end.getMonth() + 1, 0);
                break;
            case 'YEARLY':
                start.setMonth(0, 1);
                end.setMonth(11, 31);
                break;
            case 'QUARTERLY':
                const quarter = Math.floor(currentDate.getMonth() / 3);
                start.setMonth(quarter * 3, 1);
                end.setMonth(quarter * 3 + 3, 0);
                break;
            default:
                start.setMonth(0, 1);
                end.setMonth(11, 31);
        }

        return { start, end };
    }

    private calculateEntitlement(leaveType: any, joinedDate: Date, period: { start: Date; end: Date }): number {
        let entitlement = leaveType.baseAmount;

        // Only apply pro-rata if configured AND joined mid-period
        if (leaveType.accrualMethod === 'PRO_RATA' && joinedDate > period.start) {
            const totalDays = (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24);
            const remainingDays = (period.end.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24);
            entitlement = (leaveType.baseAmount * remainingDays) / totalDays;
        }
        // If FULL_UPFRONT or accrualMethod not set (backwards compatibility), use baseAmount as-is

        return Math.round(entitlement * 10) / 10; // Round to 1 decimal
    }

    private async calculateUsage(employeeId: string, leaveTypeId: string, period: { start: Date; end: Date }): Promise<number> {
        const result = await this.prisma.leaveRequest.aggregate({
            where: {
                employeeId,
                leaveTypeId,
                status: LeaveStatus.APPROVED,
                startDate: { gte: period.start },
                endDate: { lte: period.end }
            },
            _sum: { days: true }
        });

        return result._sum.days || 0;
    }

    private async calculatePending(employeeId: string, leaveTypeId: string, period: { start: Date; end: Date }): Promise<number> {
        const result = await this.prisma.leaveRequest.aggregate({
            where: {
                employeeId,
                leaveTypeId,
                status: LeaveStatus.PENDING,
                startDate: { gte: period.start },
                endDate: { lte: period.end }
            },
            _sum: { days: true }
        });

        return result._sum.days || 0;
    }

    private async calculateLeaveNumber(employeeId: string, leaveTypeId: string, period: { start: Date; end: Date }): Promise<number> {
        const count = await this.prisma.leaveRequest.count({
            where: {
                employeeId,
                leaveTypeId,
                startDate: { gte: period.start },
                endDate: { lte: period.end }
            }
        });

        return count + 1;
    }

    private calculateDuration(dto: CreateLeaveRequestDto, leaveType: any): { days: number; minutes: number | null } {
        if (dto.type === LeaveRequestType.SHORT_LEAVE) {
            // Calculate minutes from DateTime difference
            const start = new Date(dto.startDate);
            const end = new Date(dto.endDate);
            const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
            return { days: 1, minutes }; // Short leaves count as 1 unit
        }

        if (dto.type === LeaveRequestType.HALF_DAY_FIRST || dto.type === LeaveRequestType.HALF_DAY_LAST) {
            return { days: 0.5, minutes: null };
        }

        // Full day - calculate business days
        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        let days = 0;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
                days++;
            }
        }

        return { days, minutes: null };
    }
}
