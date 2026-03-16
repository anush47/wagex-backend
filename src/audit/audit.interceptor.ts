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
                    // Path parsing: /api/v1/resource/...
                    const paths = req.path.split('/').filter(p => p.length > 0);
                    const resource = paths.length > 2 ? paths[2] : (paths[0] || 'unknown');

                    const userAgent = req.get('user-agent');
                    
                    // Smart Extraction of Company ID
                    let companyId = req.params.companyId || req.body.companyId || req.query.companyId;
                    
                    // If entity is company itself, id param is likely the companyId
                    if (!companyId && resource === 'companies' && req.params.id) {
                        companyId = req.params.id;
                    }

                    // Extract Resource ID (e.g. for updates or deletes)
                    const resourceId = req.params.id || (data && data.id) || null;

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
                        entity: resource,
                        resourceId: resourceId?.toString(),
                        userId: user?.id,
                        ipAddress: req.ip,
                        userAgent,
                        companyId,
                        details,
                    });
                }),
            );
        }

        return next.handle();
    }
}
