import { Role } from '@prisma/client';
import { BaseUserProfileDto } from '../../users/dto/base-user-profile.dto';
export declare class RegisterDto extends BaseUserProfileDto {
    role: Role;
    companyName?: string;
}
