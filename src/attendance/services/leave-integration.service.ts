import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface LeaveRequest {
    id: string;
    type: string;
    startDate: Date;
    endDate: Date;
    days: number;
    minutes?: number;
}

@Injectable()
export class LeaveIntegrationService {
    private readonly logger = new Logger(LeaveIntegrationService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get approved leaves for employee on a specific date
     */
    async getApprovedLeaves(
        employeeId: string,
        date: Date,
    ): Promise<LeaveRequest[]> {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const leaves = await this.prisma.leaveRequest.findMany({
                where: {
                    employeeId,
                    status: 'APPROVED',
                    OR: [
                        {
                            AND: [
                                { startDate: { lte: endOfDay } },
                                { endDate: { gte: startOfDay } },
                            ],
                        },
                    ],
                },
            });

            return leaves.map((leave) => ({
                id: leave.id,
                type: leave.type,
                startDate: leave.startDate,
                endDate: leave.endDate,
                days: leave.days,
                minutes: leave.minutes ?? undefined,
            }));
        } catch (error) {
            this.logger.error(`Error fetching leaves: ${error.message}`);
            return [];
        }
    }

    /**
     * Check if employee has full day leave on date
     */
    async hasFullDayLeave(employeeId: string, date: Date): Promise<boolean> {
        const leaves = await this.getApprovedLeaves(employeeId, date);
        return leaves.some((leave) => leave.type === 'FULL_DAY');
    }

    /**
     * Check if employee has half day leave on date
     */
    async hasHalfDayLeave(employeeId: string, date: Date): Promise<boolean> {
        const leaves = await this.getApprovedLeaves(employeeId, date);
        return leaves.some(
            (leave) =>
                leave.type === 'HALF_DAY_FIRST' || leave.type === 'HALF_DAY_LAST',
        );
    }

    /**
     * Get total short leave minutes for date
     */
    async getShortLeaveMinutes(
        employeeId: string,
        date: Date,
    ): Promise<number> {
        const leaves = await this.getApprovedLeaves(employeeId, date);
        return leaves
            .filter((leave) => leave.type === 'SHORT_LEAVE')
            .reduce((total, leave) => total + (leave.minutes || 0), 0);
    }
}
