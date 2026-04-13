import { Controller, Get, Post, Body, Patch, Param, Query, Delete, UseGuards, Logger, Request, ForbiddenException } from '@nestjs/common';
import * as RequestWithUserNamespace from '../common/interfaces/request-with-user.interface';
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

  constructor(private readonly leavesService: LeavesService) {}

  @Post()
  @Roles(Role.EMPLOYER, Role.EMPLOYEE, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new leave request' })
  @ApiResponse({ status: 201, description: 'Leave request created successfully' })
  async create(@Body() createLeaveRequestDto: CreateLeaveRequestDto, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    const user = req.user;
    
    // Security: If employee, force their own ID
    if (user.role === Role.EMPLOYEE) {
      const employee = await this.leavesService.getEmployeeByUserId(user.id);
      if (!employee || employee.id !== createLeaveRequestDto.employeeId) {
        throw new ForbiddenException('You can only create leave requests for yourself.');
      }
    }

    this.logger.log(`Creating leave request for employee ${createLeaveRequestDto.employeeId}`);
    return this.leavesService.createRequest(createLeaveRequestDto);
  }

  @Get('balances/:employeeId')
  @Roles(Role.EMPLOYER, Role.EMPLOYEE, Role.ADMIN)
  @ApiOperation({ summary: 'Get leave balances for an employee' })
  @ApiResponse({ status: 200, description: 'Leave balances retrieved successfully' })
  async getBalances(@Param('employeeId') employeeId: string, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    const user = req.user;

    // Security: Employee can only see their own balance
    if (user.role === Role.EMPLOYEE) {
      const employee = await this.leavesService.getEmployeeByUserId(user.id);
      if (!employee || employee.id !== employeeId) {
        throw new ForbiddenException('You can only view your own leave balances.');
      }
    }

    this.logger.log(`Fetching balances for employee ${employeeId}`);
    return this.leavesService.getBalances(employeeId);
  }

  @Get('company/:companyId')
  @Roles(Role.EMPLOYER, Role.EMPLOYEE, Role.ADMIN)
  @ApiOperation({ summary: 'Get all leave requests for a company' })
  @ApiResponse({ status: 200, description: 'Leave requests retrieved successfully' })
  async findAll(
    @Param('companyId') companyId: string,
    @Request() req: RequestWithUserNamespace.RequestWithUser,
    @Query('status') status?: LeaveStatus,
    @Query('employeeId') employeeId?: string,
  ) {
    const user = req.user;

    // Security: If employee, force their own ID and omit other employees
    let effectiveEmployeeId = employeeId;
    if (user.role === Role.EMPLOYEE) {
      const employee = await this.leavesService.getEmployeeByUserId(user.id);
      if (!employee) throw new ForbiddenException('Employee profile not found.');
      effectiveEmployeeId = employee.id;
    }

    this.logger.log(`Fetching leave requests for company ${companyId}`);
    return this.leavesService.findAll(companyId, { status, employeeId: effectiveEmployeeId });
  }

  @Get(':id')
  @Roles(Role.EMPLOYER, Role.EMPLOYEE, Role.ADMIN)
  @ApiOperation({ summary: 'Get a single leave request' })
  @ApiResponse({ status: 200, description: 'Leave request retrieved successfully' })
  async findOne(@Param('id') id: string, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    const user = req.user;
    const request = await this.leavesService.findOne(id);

    // Security: Employee can only see their own requests
    if (user.role === Role.EMPLOYEE) {
      const requestWithEmployee = request as any; // Cast for relation access
      if (requestWithEmployee.employee?.userId !== user.id) {
        throw new ForbiddenException('You do not have access to this leave request.');
      }
    }

    this.logger.log(`Fetching leave request ${id}`);
    return request;
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
  async delete(@Param('id') id: string, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    const user = req.user;
    
    // Security: Employee can only delete their own requests
    if (user.role === Role.EMPLOYEE) {
      const request = await this.leavesService.findOne(id) as any;
      if (request.employee?.userId !== user.id) {
        throw new ForbiddenException('You can only delete your own leave requests.');
      }
    }

    this.logger.log(`Deleting leave request ${id}`);
    return this.leavesService.deleteRequest(id);
  }
}
