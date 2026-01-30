import { BaseUserProfileDto } from './base-user-profile.dto';
declare const UpdateUserDto_base: import("@nestjs/common").Type<Partial<BaseUserProfileDto>>;
export declare class UpdateUserDto extends UpdateUserDto_base {
    active?: boolean;
}
export {};
