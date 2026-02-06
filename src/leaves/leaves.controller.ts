import { Controller, Get, Post, Body, Patch, Param, Query, Delete, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LeavesService } from './leaves.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { LeaveStatus } from './enums/leave.enum';

@ApiTags('Leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leaves')
export class LeavesController {
    private readonly logger = new Logger(LeavesController.name);

    constructor(private readonly leavesService: LeavesService) { }

    @Post()
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Create a new leave request' })
    @ApiResponse({ status: 201, description: 'Leave request created successfully' })
    create(@Body() createLeaveRequestDto: CreateLeaveRequestDto) {
        this.logger.log(`Creating leave request for employee ${createLeaveRequestDto.employeeId}`);
        return this.leavesService.createRequest(createLeaveRequestDto);
    }

    @Get('balances/:employeeId')
    @Roles(Role.EMPLOYER, Role.EMPLOYEE, Role.ADMIN)
    @ApiOperation({ summary: 'Get leave balances for an employee' })
    @ApiResponse({ status: 200, description: 'Leave balances retrieved successfully' })
    getBalances(@Param('employeeId') employeeId: string) {
        this.logger.log(`Fetching balances for employee ${employeeId}`);
        return this.leavesService.getBalances(employeeId);
    }

    @Get('company/:companyId')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Get all leave requests for a company' })
    @ApiResponse({ status: 200, description: 'Leave requests retrieved successfully' })
    findAll(
        @Param('companyId') companyId: string,
        @Query('status') status?: LeaveStatus,
        @Query('employeeId') employeeId?: string
    ) {
        this.logger.log(`Fetching leave requests for company ${companyId}`);
        return this.leavesService.findAll(companyId, { status, employeeId });
    }

    @Get(':id')
    @Roles(Role.EMPLOYER, Role.EMPLOYEE, Role.ADMIN)
    @ApiOperation({ summary: 'Get a single leave request' })
    @ApiResponse({ status: 200, description: 'Leave request retrieved successfully' })
    findOne(@Param('id') id: string) {
        this.logger.log(`Fetching leave request ${id}`);
        return this.leavesService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Update leave request (approve/reject)' })
    @ApiResponse({ status: 200, description: 'Leave request updated successfully' })
    update(@Param('id') id: string, @Body() updateLeaveRequestDto: UpdateLeaveRequestDto) {
        this.logger.log(`Updating leave request ${id}`);
        return this.leavesService.updateRequest(id, updateLeaveRequestDto);
    }

    @Delete(':id')
    @Roles(Role.EMPLOYER, Role.EMPLOYEE, Role.ADMIN)
    @ApiOperation({ summary: 'Delete a pending leave request' })
    @ApiResponse({ status: 200, description: 'Leave request deleted successfully' })
    @ApiResponse({ status: 400, description: 'Cannot delete non-pending leave request' })
    @ApiResponse({ status: 403, description: 'Not authorized to delete this request' })
    delete(@Param('id') id: string) {
        this.logger.log(`Deleting leave request ${id}`);
        return this.leavesService.deleteRequest(id);
    }
}
