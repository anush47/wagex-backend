export enum Permission {
    // Employee Management
    MANAGE_EMPLOYEES = 'manage_employees',
    VIEW_EMPLOYEES = 'view_employees',
    CREATE_EMPLOYEES = 'create_employees',
    EDIT_EMPLOYEES = 'edit_employees',
    DELETE_EMPLOYEES = 'delete_employees',

    // Company Management
    MANAGE_COMPANY = 'manage_company',
    VIEW_COMPANY = 'view_company',
    EDIT_COMPANY = 'edit_company',

    // Audit & Compliance
    VIEW_AUDIT_LOGS = 'view_audit_logs',

    // Payroll (Future placeholder)
    MANAGE_PAYROLL = 'manage_payroll',
    VIEW_PAYROLL = 'view_payroll',

    // File Management
    CAN_UPLOAD_FILES = 'can_upload_files',
    CAN_DELETE_FILES = 'can_delete_files',
}

export const DEFAULT_EMPLOYER_PERMISSIONS = {
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

export const DEFAULT_EMPLOYEE_PERMISSIONS = {
    [Permission.VIEW_EMPLOYEES]: true, // Can see colleagues?
    [Permission.VIEW_COMPANY]: true,
};
