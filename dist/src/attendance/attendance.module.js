"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceModule = void 0;
const common_1 = require("@nestjs/common");
const attendance_controller_1 = require("./attendance.controller");
const attendance_service_1 = require("./attendance.service");
const shift_selection_service_1 = require("./services/shift-selection.service");
const attendance_calculation_service_1 = require("./services/attendance-calculation.service");
const attendance_processing_service_1 = require("./services/attendance-processing.service");
const leave_integration_service_1 = require("./services/leave-integration.service");
const prisma_module_1 = require("../prisma/prisma.module");
const policies_module_1 = require("../policies/policies.module");
let AttendanceModule = class AttendanceModule {
};
exports.AttendanceModule = AttendanceModule;
exports.AttendanceModule = AttendanceModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, policies_module_1.PoliciesModule],
        controllers: [attendance_controller_1.AttendanceManualController, attendance_controller_1.AttendanceExternalController],
        providers: [
            attendance_service_1.AttendanceService,
            shift_selection_service_1.ShiftSelectionService,
            attendance_calculation_service_1.AttendanceCalculationService,
            attendance_processing_service_1.AttendanceProcessingService,
            leave_integration_service_1.LeaveIntegrationService,
        ],
        exports: [attendance_service_1.AttendanceService, attendance_processing_service_1.AttendanceProcessingService],
    })
], AttendanceModule);
//# sourceMappingURL=attendance.module.js.map