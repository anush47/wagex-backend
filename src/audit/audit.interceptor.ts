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
                    // Extract resource more significantly? e.g. /api/v1/companies -> companies
                    // Assuming /api/v1/RESOURCE/...
                    const paths = req.path.split('/').filter(p => p.length > 0);
                    const resource = paths.length > 2 ? paths[2] : paths[0];

                    const details: any = {
                        path: req.path,
                        body: req.body,
                    };

                    // Capture File Metadata if present
                    if (req.file) {
                        details.file = {
                            name: req.file.originalname,
                            size: req.file.size,
                            mimetype: req.file.mimetype
                        };
                    }
                    if (req.files) {
                        details.filesCount = req.files.length;
                    }

                    this.auditService.logAction({
                        action: method,
                        resource: resource,
                        userId: user?.id,
                        ipAddress: req.ip,
                        details,
                    });
                }),
            );
        }

        return next.handle();
    }
}
