export declare enum GeofencingEnforcement {
    STRICT = "STRICT",
    FLAG_ONLY = "FLAG_ONLY",
    NONE = "NONE"
}
export declare enum ApprovalPolicyMode {
    AUTO_APPROVE = "AUTO_APPROVE",
    REQUIRE_APPROVAL_ALL = "REQUIRE_APPROVAL_ALL",
    REQUIRE_APPROVAL_EXCEPTIONS = "REQUIRE_APPROVAL_EXCEPTIONS"
}
export declare class GeoZoneDto {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    address: string;
}
export declare class GeofencingConfigDto {
    enabled: boolean;
    enforcement: GeofencingEnforcement;
    zones: GeoZoneDto[];
}
export declare class ExceptionTriggersDto {
    outsideZone: boolean;
    deviceMismatch: boolean;
    unrecognizedIp?: boolean;
}
export declare class ApprovalPolicyConfigDto {
    mode: ApprovalPolicyMode;
    exceptionTriggers: ExceptionTriggersDto;
}
export declare class CompanyApiKeyDto {
    id: string;
    name: string;
    key: string;
    createdAt: string;
    lastUsedAt?: string;
}
export declare class AttendanceConfigDto {
    allowSelfCheckIn: boolean;
    requireLocation: boolean;
    requireDeviceInfo: boolean;
    geofencing: GeofencingConfigDto;
    approvalPolicy: ApprovalPolicyConfigDto;
    apiKeys: CompanyApiKeyDto[];
}
