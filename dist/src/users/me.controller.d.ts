import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class MeController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): any;
    updateProfile(req: any, updateUserDto: UpdateUserDto): Promise<import("./entities/user.entity").User>;
}
