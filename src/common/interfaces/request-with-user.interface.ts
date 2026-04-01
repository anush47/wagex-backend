import { Request } from 'express';
import { User, UserCompany } from '@prisma/client';

export interface RequestWithUser extends Request {
  user: User & {
    memberships?: (UserCompany & { company: any })[];
    employees?: { id: string; companyId: string }[];
    isGuest?: boolean;
  };
  file?: any;
  files?: any[];
}
