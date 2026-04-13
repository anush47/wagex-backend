export class EmployerDashboardDto {
  companiesCount: number;
  employeesCount: number;
  pendingLeavesCount: number;
  attendance: {
    present: number;
    late: number;
    absent: number;
    total: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    details: string;
    createdAt: Date;
    type: 'COMPANY' | 'EMPLOYEE' | 'LEAVE' | 'PAYROLL';
  }>;
}
