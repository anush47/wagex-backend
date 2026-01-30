import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private readonly auditService: AuditService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const method = req.method;

        // Only audit mutative actions
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return next.handle().pipe(
                tap((data) => {
                    const user = req.user;
                    const resource = req.path.split('/')[2] || 'unknown'; // naive resource extraction

                    this.auditService.logAction({
                        action: method,
                        resource: resource,
                        userId: user?.id, // Supabase UID
                        ipAddress: req.ip,
                        details: {
                            path: req.path,
                            body: req.body, // Be careful with sensitive data!
                            // response_id: data?.id // Try to capture ID of created resource
                        },
                    });
                }),
            );
        }

        return next.handle();
    }
}
