export declare enum Permission {
    MANAGE_EMPLOYEES = "manage_employees",
    VIEW_EMPLOYEES = "view_employees",
    CREATE_EMPLOYEES = "create_employees",
    EDIT_EMPLOYEES = "edit_employees",
    DELETE_EMPLOYEES = "delete_employees",
    MANAGE_COMPANY = "manage_company",
    VIEW_COMPANY = "view_company",
    EDIT_COMPANY = "edit_company",
    VIEW_AUDIT_LOGS = "view_audit_logs",
    MANAGE_PAYROLL = "manage_payroll",
    VIEW_PAYROLL = "view_payroll",
    CAN_UPLOAD_FILES = "can_upload_files",
    CAN_DELETE_FILES = "can_delete_files"
}
export declare const DEFAULT_EMPLOYER_PERMISSIONS: {
    manage_employees: boolean;
    manage_company: boolean;
    view_audit_logs: boolean;
    view_employees: boolean;
    create_employees: boolean;
    edit_employees: boolean;
    delete_employees: boolean;
    view_company: boolean;
    edit_company: boolean;
    can_upload_files: boolean;
    can_delete_files: boolean;
};
export declare const DEFAULT_EMPLOYEE_PERMISSIONS: {
    view_employees: boolean;
    view_company: boolean;
    can_upload_files: boolean;
};
