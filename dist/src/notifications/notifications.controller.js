"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("./notifications.service");
const notification_query_dto_1 = require("./dto/notification-query.dto");
const broadcast_notification_dto_1 = require("./dto/broadcast-notification.dto");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
let NotificationsController = class NotificationsController {
    notificationsService;
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    broadcast(body, req) {
        return this.notificationsService.broadcast(req.user, body.targetRole || null, body.title, body.message, body.userIds, body.type, body.metadata);
    }
    findAll(req, query) {
        return this.notificationsService.getUserNotifications(req.user.id, query);
    }
    markAsRead(id, req) {
        return this.notificationsService.markAsRead(id, req.user.id);
    }
    markAllAsRead(req) {
        return this.notificationsService.markAllAsRead(req.user.id);
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Post)('broadcast'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, swagger_1.ApiOperation)({ summary: 'Broadcast notification (Admin -> All/Role, Employer -> Employees)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [broadcast_notification_dto_1.BroadcastNotificationDto, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "broadcast", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my notifications (Paginated)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, notification_query_dto_1.NotificationQueryDto]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark notification as read' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Patch)('read-all'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark all my notifications as read' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markAllAsRead", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map