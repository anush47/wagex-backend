import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const method = req.method;

    // Only audit mutative actions
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap((data: { id?: string | number } | null) => {
          const user = req.user;
          // Path parsing: /api/v1/resource/...
          const paths = req.path.split('/').filter((p) => p.length > 0);
          const resource = paths.length > 2 ? paths[2] : paths[0] || 'unknown';

          const userAgent = req.get('user-agent');

          // Smart Extraction of Company ID
          const params = req.params as Record<string, string>;
          const body = (req.body || {}) as Record<string, any>;
          const query = (req.query || {}) as Record<string, string>;

          let companyId: string | undefined = params.companyId || (body.companyId as string) || query.companyId;

          // If entity is company itself, id param is likely the companyId
          if (!companyId && resource === 'companies' && params.id) {
            companyId = params.id;
          }

          // Extract Resource ID (e.g. for updates or deletes)
          const resourceId = params.id || (data && data.id) || null;

          const details: Record<string, any> = {
            path: req.path,
            body: req.body as Record<string, any>,
          };

          // Capture File Metadata if present
          if (req.file) {
            const file = req.file as Record<string, any>;
            details.file = {
              name: file.originalname as string,
              size: file.size as number,
              mimetype: file.mimetype as string,
            };
          }
          if (req.files) {
            const files = req.files;
            details.filesCount = files.length;
          }

          void this.auditService.logAction({
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
