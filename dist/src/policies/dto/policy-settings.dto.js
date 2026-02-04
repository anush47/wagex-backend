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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicySettingsDto = exports.WorkingDaysConfigDto = exports.CalendarType = exports.AttendanceConfigDto = exports.CompanyApiKeyDto = exports.ApprovalPolicyConfigDto = exports.ExceptionTriggersDto = exports.GeofencingConfigDto = exports.GeoZoneDto = exports.ApprovalPolicyMode = exports.GeofencingEnforcement = exports.DailyWorkConfigDto = exports.HalfDayShift = exports.WorkDayType = exports.PayrollSettingsConfigDto = exports.LateDeductionType = exports.UnpaidLeaveAction = exports.PayrollCalculationMethod = exports.PayCycleFrequency = exports.SalaryComponentsConfigDto = exports.PayrollComponentDto = exports.ShiftsConfigDto = exports.ShiftDto = exports.PayrollComponentCategory = exports.PayrollComponentType = exports.ShiftSelectionPolicy = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var ShiftSelectionPolicy;
(function (ShiftSelectionPolicy) {
    ShiftSelectionPolicy["FIXED"] = "FIXED";
    ShiftSelectionPolicy["CLOSEST_START_TIME"] = "CLOSEST_START_TIME";
    ShiftSelectionPolicy["MANUAL"] = "MANUAL";
    ShiftSelectionPolicy["EMPLOYEE_ROSTER"] = "EMPLOYEE_ROSTER";
})(ShiftSelectionPolicy || (exports.ShiftSelectionPolicy = ShiftSelectionPolicy = {}));
var PayrollComponentType;
(function (PayrollComponentType) {
    PayrollComponentType["FLAT_AMOUNT"] = "FLAT_AMOUNT";
    PayrollComponentType["PERCENTAGE_BASIC"] = "PERCENTAGE_BASIC";
    PayrollComponentType["PERCENTAGE_GROSS"] = "PERCENTAGE_GROSS";
})(PayrollComponentType || (exports.PayrollComponentType = PayrollComponentType = {}));
var PayrollComponentCategory;
(function (PayrollComponentCategory) {
    PayrollComponentCategory["ADDITION"] = "ADDITION";
    PayrollComponentCategory["DEDUCTION"] = "DEDUCTION";
})(PayrollComponentCategory || (exports.PayrollComponentCategory = PayrollComponentCategory = {}));
class ShiftDto {
    id;
    name;
    startTime;
    endTime;
    minStartTime;
    maxOutTime;
    breakTime;
    gracePeriodLate;
    gracePeriodEarly;
    useShiftStartAsClockIn;
    autoClockOut;
}
exports.ShiftDto = ShiftDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'shift-1', description: 'Unique ID for the shift' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Standard Morning', description: 'Display name of the shift' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '08:00', description: 'Shift start time (HH:mm)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '17:00', description: 'Shift end time (HH:mm)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '07:30', description: 'Earliest allowed clock-in' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftDto.prototype, "minStartTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '19:00', description: 'Latest allowed clock-out' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftDto.prototype, "maxOutTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 60, description: 'Break duration in minutes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ShiftDto.prototype, "breakTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 15, description: 'Minutes allowed after startTime before marked late' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ShiftDto.prototype, "gracePeriodLate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 10, description: 'Minutes allowed before endTime before marked early leave' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ShiftDto.prototype, "gracePeriodEarly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Use shift start time as clock-in time if early' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ShiftDto.prototype, "useShiftStartAsClockIn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false, description: 'Automatically clock out at maxOutTime' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ShiftDto.prototype, "autoClockOut", void 0);
class ShiftsConfigDto {
    list;
    defaultShiftId;
    selectionPolicy;
}
exports.ShiftsConfigDto = ShiftsConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [ShiftDto], description: 'List of available shifts' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ShiftDto),
    __metadata("design:type", Array)
], ShiftsConfigDto.prototype, "list", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'shift-1', description: 'Default shift ID to use' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftsConfigDto.prototype, "defaultShiftId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ShiftSelectionPolicy, description: 'How to select the active shift' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ShiftSelectionPolicy),
    __metadata("design:type", String)
], ShiftsConfigDto.prototype, "selectionPolicy", void 0);
class PayrollComponentDto {
    id;
    name;
    category;
    type;
    value;
    isStatutory;
    affectsTotalEarnings;
    minCap;
    maxCap;
}
exports.PayrollComponentDto = PayrollComponentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'comp-1' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PayrollComponentDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Performance Bonus' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PayrollComponentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PayrollComponentCategory }),
    (0, class_validator_1.IsEnum)(PayrollComponentCategory),
    __metadata("design:type", String)
], PayrollComponentDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PayrollComponentType }),
    (0, class_validator_1.IsEnum)(PayrollComponentType),
    __metadata("design:type", String)
], PayrollComponentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5000 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PayrollComponentDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PayrollComponentDto.prototype, "isStatutory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Does this component affect the total reportable earnings?' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PayrollComponentDto.prototype, "affectsTotalEarnings", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Minimum limit amount if percentage based' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PayrollComponentDto.prototype, "minCap", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Maximum limit amount if percentage based' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PayrollComponentDto.prototype, "maxCap", void 0);
class SalaryComponentsConfigDto {
    components;
}
exports.SalaryComponentsConfigDto = SalaryComponentsConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [PayrollComponentDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PayrollComponentDto),
    __metadata("design:type", Array)
], SalaryComponentsConfigDto.prototype, "components", void 0);
var PayCycleFrequency;
(function (PayCycleFrequency) {
    PayCycleFrequency["MONTHLY"] = "MONTHLY";
    PayCycleFrequency["SEMI_MONTHLY"] = "SEMI_MONTHLY";
    PayCycleFrequency["BI_WEEKLY"] = "BI_WEEKLY";
    PayCycleFrequency["WEEKLY"] = "WEEKLY";
    PayCycleFrequency["DAILY"] = "DAILY";
})(PayCycleFrequency || (exports.PayCycleFrequency = PayCycleFrequency = {}));
var PayrollCalculationMethod;
(function (PayrollCalculationMethod) {
    PayrollCalculationMethod["HOURLY_ATTENDANCE_WITH_OT"] = "HOURLY_ATTENDANCE_WITH_OT";
    PayrollCalculationMethod["SHIFT_ATTENDANCE_WITH_OT"] = "SHIFT_ATTENDANCE_WITH_OT";
    PayrollCalculationMethod["SHIFT_ATTENDANCE_FLAT"] = "SHIFT_ATTENDANCE_FLAT";
    PayrollCalculationMethod["DAILY_ATTENDANCE_FLAT"] = "DAILY_ATTENDANCE_FLAT";
    PayrollCalculationMethod["FIXED_MONTHLY_SALARY"] = "FIXED_MONTHLY_SALARY";
})(PayrollCalculationMethod || (exports.PayrollCalculationMethod = PayrollCalculationMethod = {}));
var UnpaidLeaveAction;
(function (UnpaidLeaveAction) {
    UnpaidLeaveAction["DEDUCT_FROM_TOTAL"] = "DEDUCT_FROM_TOTAL";
    UnpaidLeaveAction["ADD_AS_DEDUCTION"] = "ADD_AS_DEDUCTION";
})(UnpaidLeaveAction || (exports.UnpaidLeaveAction = UnpaidLeaveAction = {}));
var LateDeductionType;
(function (LateDeductionType) {
    LateDeductionType["DIVISOR_BASED"] = "DIVISOR_BASED";
    LateDeductionType["FIXED_AMOUNT"] = "FIXED_AMOUNT";
})(LateDeductionType || (exports.LateDeductionType = LateDeductionType = {}));
class PayrollSettingsConfigDto {
    frequency;
    runDay;
    runDayAnchor;
    cutoffDaysBeforePayDay;
    calculationMethod;
    baseRateDivisor;
    autoDeductUnpaidLeaves;
    unpaidLeaveAction;
    lateDeductionType;
    lateDeductionValue;
}
exports.PayrollSettingsConfigDto = PayrollSettingsConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PayCycleFrequency, example: PayCycleFrequency.MONTHLY }),
    (0, class_validator_1.IsEnum)(PayCycleFrequency),
    __metadata("design:type", String)
], PayrollSettingsConfigDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'LAST', description: 'Day pattern: "1"-"31", "LAST", "MON"-"SUN"' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PayrollSettingsConfigDto.prototype, "runDay", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-01-01', description: 'Reference date for Bi-Weekly cycles' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PayrollSettingsConfigDto.prototype, "runDayAnchor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5, description: 'Days before PayDay to close attendance' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PayrollSettingsConfigDto.prototype, "cutoffDaysBeforePayDay", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PayrollCalculationMethod, example: PayrollCalculationMethod.FIXED_MONTHLY_SALARY }),
    (0, class_validator_1.IsEnum)(PayrollCalculationMethod),
    __metadata("design:type", String)
], PayrollSettingsConfigDto.prototype, "calculationMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 30, description: 'Divisor for rate calculation (30, 26, 22)' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PayrollSettingsConfigDto.prototype, "baseRateDivisor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Automatically deduct for unpaid leaves/absences' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PayrollSettingsConfigDto.prototype, "autoDeductUnpaidLeaves", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: UnpaidLeaveAction, example: UnpaidLeaveAction.DEDUCT_FROM_TOTAL }),
    (0, class_validator_1.IsEnum)(UnpaidLeaveAction),
    __metadata("design:type", String)
], PayrollSettingsConfigDto.prototype, "unpaidLeaveAction", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: LateDeductionType, example: LateDeductionType.DIVISOR_BASED }),
    (0, class_validator_1.IsEnum)(LateDeductionType),
    __metadata("design:type", String)
], PayrollSettingsConfigDto.prototype, "lateDeductionType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 8, description: 'Divisor (e.g. 8 hours) or Fixed Amount' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PayrollSettingsConfigDto.prototype, "lateDeductionValue", void 0);
var WorkDayType;
(function (WorkDayType) {
    WorkDayType["FULL"] = "FULL";
    WorkDayType["HALF"] = "HALF";
    WorkDayType["OFF"] = "OFF";
})(WorkDayType || (exports.WorkDayType = WorkDayType = {}));
var HalfDayShift;
(function (HalfDayShift) {
    HalfDayShift["FIRST"] = "FIRST";
    HalfDayShift["LAST"] = "LAST";
})(HalfDayShift || (exports.HalfDayShift = HalfDayShift = {}));
class DailyWorkConfigDto {
    type;
    halfDayShift;
}
exports.DailyWorkConfigDto = DailyWorkConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: WorkDayType }),
    (0, class_validator_1.IsEnum)(WorkDayType),
    __metadata("design:type", String)
], DailyWorkConfigDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: HalfDayShift }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(HalfDayShift),
    __metadata("design:type", String)
], DailyWorkConfigDto.prototype, "halfDayShift", void 0);
var GeofencingEnforcement;
(function (GeofencingEnforcement) {
    GeofencingEnforcement["STRICT"] = "STRICT";
    GeofencingEnforcement["FLAG_ONLY"] = "FLAG_ONLY";
    GeofencingEnforcement["NONE"] = "NONE";
})(GeofencingEnforcement || (exports.GeofencingEnforcement = GeofencingEnforcement = {}));
var ApprovalPolicyMode;
(function (ApprovalPolicyMode) {
    ApprovalPolicyMode["AUTO_APPROVE"] = "AUTO_APPROVE";
    ApprovalPolicyMode["REQUIRE_APPROVAL_ALL"] = "REQUIRE_APPROVAL_ALL";
    ApprovalPolicyMode["REQUIRE_APPROVAL_EXCEPTIONS"] = "REQUIRE_APPROVAL_EXCEPTIONS";
})(ApprovalPolicyMode || (exports.ApprovalPolicyMode = ApprovalPolicyMode = {}));
class GeoZoneDto {
    id;
    name;
    latitude;
    longitude;
    radius;
    address;
}
exports.GeoZoneDto = GeoZoneDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'zone-1' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeoZoneDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Head Office' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeoZoneDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GeoZoneDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GeoZoneDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100, description: 'Radius in meters' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GeoZoneDto.prototype, "radius", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123 Main St' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeoZoneDto.prototype, "address", void 0);
class GeofencingConfigDto {
    enabled;
    enforcement;
    zones;
}
exports.GeofencingConfigDto = GeofencingConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], GeofencingConfigDto.prototype, "enabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: GeofencingEnforcement }),
    (0, class_validator_1.IsEnum)(GeofencingEnforcement),
    __metadata("design:type", String)
], GeofencingConfigDto.prototype, "enforcement", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [GeoZoneDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => GeoZoneDto),
    __metadata("design:type", Array)
], GeofencingConfigDto.prototype, "zones", void 0);
class ExceptionTriggersDto {
    outsideZone;
    deviceMismatch;
    unrecognizedIp;
}
exports.ExceptionTriggersDto = ExceptionTriggersDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ExceptionTriggersDto.prototype, "outsideZone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ExceptionTriggersDto.prototype, "deviceMismatch", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ExceptionTriggersDto.prototype, "unrecognizedIp", void 0);
class ApprovalPolicyConfigDto {
    mode;
    exceptionTriggers;
}
exports.ApprovalPolicyConfigDto = ApprovalPolicyConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ApprovalPolicyMode }),
    (0, class_validator_1.IsEnum)(ApprovalPolicyMode),
    __metadata("design:type", String)
], ApprovalPolicyConfigDto.prototype, "mode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ExceptionTriggersDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ExceptionTriggersDto),
    __metadata("design:type", ExceptionTriggersDto)
], ApprovalPolicyConfigDto.prototype, "exceptionTriggers", void 0);
class CompanyApiKeyDto {
    id;
    name;
    key;
    createdAt;
    lastUsedAt;
}
exports.CompanyApiKeyDto = CompanyApiKeyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'key-1' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyApiKeyDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Reception Kiosk' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyApiKeyDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyApiKeyDto.prototype, "key", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyApiKeyDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyApiKeyDto.prototype, "lastUsedAt", void 0);
class AttendanceConfigDto {
    allowSelfCheckIn;
    requireLocation;
    requireDeviceInfo;
    geofencing;
    approvalPolicy;
    apiKeys;
}
exports.AttendanceConfigDto = AttendanceConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Allow employees to check in from their own devices' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AttendanceConfigDto.prototype, "allowSelfCheckIn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Require GPS location for check-in' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AttendanceConfigDto.prototype, "requireLocation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Capture device info (User-Agent, IP)' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AttendanceConfigDto.prototype, "requireDeviceInfo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: GeofencingConfigDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => GeofencingConfigDto),
    __metadata("design:type", GeofencingConfigDto)
], AttendanceConfigDto.prototype, "geofencing", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ApprovalPolicyConfigDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ApprovalPolicyConfigDto),
    __metadata("design:type", ApprovalPolicyConfigDto)
], AttendanceConfigDto.prototype, "approvalPolicy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CompanyApiKeyDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CompanyApiKeyDto),
    __metadata("design:type", Array)
], AttendanceConfigDto.prototype, "apiKeys", void 0);
var CalendarType;
(function (CalendarType) {
    CalendarType["SL_DEFAULT"] = "sl_default";
})(CalendarType || (exports.CalendarType = CalendarType = {}));
class WorkingDaysConfigDto {
    defaultPattern;
    isDynamic;
    workingCalendar;
    payrollCalendar;
}
exports.WorkingDaysConfigDto = WorkingDaysConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Default generic pattern for standard week (MON-SUN)' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], WorkingDaysConfigDto.prototype, "defaultPattern", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Enable week-specific override patterns' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], WorkingDaysConfigDto.prototype, "isDynamic", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID of the selected working calendar', default: CalendarType.SL_DEFAULT, enum: CalendarType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CalendarType),
    __metadata("design:type", String)
], WorkingDaysConfigDto.prototype, "workingCalendar", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID of the selected payroll calendar', default: CalendarType.SL_DEFAULT, enum: CalendarType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CalendarType),
    __metadata("design:type", String)
], WorkingDaysConfigDto.prototype, "payrollCalendar", void 0);
class PolicySettingsDto {
    shifts;
    attendance;
    salaryComponents;
    payrollConfiguration;
    workingDays;
}
exports.PolicySettingsDto = PolicySettingsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: ShiftsConfigDto, description: 'Shifts configuration' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ShiftsConfigDto),
    __metadata("design:type", ShiftsConfigDto)
], PolicySettingsDto.prototype, "shifts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: AttendanceConfigDto, description: 'Attendance tracking, geofencing, and approval rules' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AttendanceConfigDto),
    __metadata("design:type", AttendanceConfigDto)
], PolicySettingsDto.prototype, "attendance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: SalaryComponentsConfigDto, description: 'Salary components (additions/deductions) configuration' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SalaryComponentsConfigDto),
    __metadata("design:type", SalaryComponentsConfigDto)
], PolicySettingsDto.prototype, "salaryComponents", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: PayrollSettingsConfigDto, description: 'Global payroll settings (cycles, dates, logic)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PayrollSettingsConfigDto),
    __metadata("design:type", PayrollSettingsConfigDto)
], PolicySettingsDto.prototype, "payrollConfiguration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: WorkingDaysConfigDto, description: 'Working days configuration' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => WorkingDaysConfigDto),
    __metadata("design:type", WorkingDaysConfigDto)
], PolicySettingsDto.prototype, "workingDays", void 0);
//# sourceMappingURL=policy-settings.dto.js.map