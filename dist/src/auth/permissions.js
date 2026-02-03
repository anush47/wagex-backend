"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EMPLOYEE_PERMISSIONS = exports.DEFAULT_EMPLOYER_PERMISSIONS = exports.Permission = void 0;
var Permission;
(function (Permission) {
    Permission["MANAGE_EMPLOYEES"] = "manage_employees";
    Permission["VIEW_EMPLOYEES"] = "view_employees";
    Permission["CREATE_EMPLOYEES"] = "create_employees";
    Permission["EDIT_EMPLOYEES"] = "edit_employees";
    Permission["DELETE_EMPLOYEES"] = "delete_employees";
    Permission["MANAGE_COMPANY"] = "manage_company";
    Permission["VIEW_COMPANY"] = "view_company";
    Permission["EDIT_COMPANY"] = "edit_company";
    Permission["VIEW_AUDIT_LOGS"] = "view_audit_logs";
    Permission["MANAGE_PAYROLL"] = "manage_payroll";
    Permission["VIEW_PAYROLL"] = "view_payroll";
    Permission["CAN_UPLOAD_FILES"] = "can_upload_files";
    Permission["CAN_DELETE_FILES"] = "can_delete_files";
})(Permission || (exports.Permission = Permission = {}));
exports.DEFAULT_EMPLOYER_PERMISSIONS = {
    [Permission.MANAGE_EMPLOYEES]: true,
    [Permission.MANAGE_COMPANY]: true,
    [Permission.VIEW_AUDIT_LOGS]: true,
    [Permission.VIEW_EMPLOYEES]: true,
    [Permission.CREATE_EMPLOYEES]: true,
    [Permission.EDIT_EMPLOYEES]: true,
    [Permission.DELETE_EMPLOYEES]: true,
    [Permission.VIEW_COMPANY]: true,
    [Permission.EDIT_COMPANY]: true,
    [Permission.CAN_UPLOAD_FILES]: true,
    [Permission.CAN_DELETE_FILES]: true,
};
exports.DEFAULT_EMPLOYEE_PERMISSIONS = {
    [Permission.VIEW_EMPLOYEES]: true,
    [Permission.VIEW_COMPANY]: true,
    [Permission.CAN_UPLOAD_FILES]: true,
};
//# sourceMappingURL=permissions.js.map