import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    private readonly logger;
    constructor(authService: AuthService);
    changePassword(body: any): {
        message: string;
    };
    register(req: any, dto: RegisterDto): Promise<{
        user: any;
        company?: any;
    }>;
}
