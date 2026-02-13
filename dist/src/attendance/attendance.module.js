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
const shift_selection_service_1 = require("./services/shift-selection.service");
const attendance_calculation_service_1 = require("./services/attendance-calculation.service");
const attendance_processing_service_1 = require("./services/attendance-processing.service");
const leave_integration_service_1 = require("./services/leave-integration.service");
const session_grouping_service_1 = require("./services/session-grouping.service");
const attendance_external_service_1 = require("./services/attendance-external.service");
const attendance_manual_service_1 = require("./services/attendance-manual.service");
const attendance_query_service_1 = require("./services/attendance-query.service");
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
            shift_selection_service_1.ShiftSelectionService,
            attendance_calculation_service_1.AttendanceCalculationService,
            attendance_processing_service_1.AttendanceProcessingService,
            leave_integration_service_1.LeaveIntegrationService,
            session_grouping_service_1.SessionGroupingService,
            attendance_external_service_1.AttendanceExternalService,
            attendance_manual_service_1.AttendanceManualService,
            attendance_query_service_1.AttendanceQueryService,
        ],
        exports: [
            attendance_processing_service_1.AttendanceProcessingService,
            attendance_external_service_1.AttendanceExternalService,
            attendance_manual_service_1.AttendanceManualService,
            attendance_query_service_1.AttendanceQueryService,
        ],
    })
], AttendanceModule);
//# sourceMappingURL=attendance.module.js.map