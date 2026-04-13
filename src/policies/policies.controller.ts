import { Controller, Get, Post, Body, Patch, Param, Delete, Request, ForbiddenException } from '@nestjs/common';
import * as RequestWithUserNamespace from '../common/interfaces/request-with-user.interface';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

@ApiTags('Policies')
@ApiBearerAuth()
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_COMPANY)
  @ApiOperation({ summary: 'Create policy template' })
  create(@Body() createPolicyDto: CreatePolicyDto) {
    return this.policiesService.create(createPolicyDto);
  }

  @Get('company/:companyId')
  @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
  @Permissions(Permission.VIEW_COMPANY)
  @ApiOperation({ summary: 'Get all company policies' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.policiesService.findByCompany(companyId);
  }

  @Get('company/:companyId/default')
  @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get company default policy' })
  async getDefault(@Param('companyId') companyId: string, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    const user = req.user;
    
    // Hardened Security: Enforce membership for everyone except ADMIN
    if (user.role !== Role.ADMIN) {
      const membership = user.memberships?.find((m) => m.companyId === companyId);
      if (!membership) {
        throw new ForbiddenException('You do not have access to this company.');
      }
    }

    return this.policiesService.getDefaultPolicy(companyId);
  }

  @Get('effective/:employeeId')
  @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get effective employee policy (Merged structure)' })
  async getEffective(@Param('employeeId') employeeId: string, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    const user = req.user;

    // Hardened Security: 
    // 1. Employees can only see their own policy
    // 2. Employers can only see employees in their company
    if (user.role === Role.EMPLOYEE) {
      const detail = await this.policiesService.getEffectivePolicyDetail(employeeId);
      if (detail.employee.id !== employeeId) {
          // This should never happen based on service logic, but let's check userId link
      }
      
      // Need to re-verify the employee belongs to this user
      const employee = await this.policiesService.prisma.employee.findUnique({
          where: { id: employeeId },
          select: { userId: true }
      });
      
      if (!employee || employee.userId !== user.id) {
          throw new ForbiddenException('You can only view your own effective policy.');
      }
    } else if (user.role === Role.EMPLOYER) {
      const employee = await this.policiesService.prisma.employee.findUnique({
          where: { id: employeeId },
          select: { companyId: true }
      });
      
      if (!employee || !user.memberships?.some(m => m.companyId === employee.companyId)) {
          throw new ForbiddenException('This employee does not belong to your company.');
      }
    }

    return this.policiesService.getEffectivePolicyDetail(employeeId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_COMPANY)
  @ApiOperation({ summary: 'Update policy template' })
  update(@Param('id') id: string, @Body() updatePolicyDto: UpdatePolicyDto) {
    return this.policiesService.update(id, updatePolicyDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_COMPANY)
  @ApiOperation({ summary: 'Delete policy' })
  remove(@Param('id') id: string) {
    return this.policiesService.remove(id);
  }
}
