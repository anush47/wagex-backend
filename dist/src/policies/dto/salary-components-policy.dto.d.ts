export declare enum PayrollComponentType {
    FLAT_AMOUNT = "FLAT_AMOUNT",
    PERCENTAGE_BASIC = "PERCENTAGE_BASIC",
    PERCENTAGE_GROSS = "PERCENTAGE_GROSS"
}
export declare enum PayrollComponentCategory {
    ADDITION = "ADDITION",
    DEDUCTION = "DEDUCTION"
}
export declare class PayrollComponentDto {
    id: string;
    name: string;
    category: PayrollComponentCategory;
    type: PayrollComponentType;
    value: number;
    isStatutory?: boolean;
    affectsTotalEarnings?: boolean;
    minCap?: number;
    maxCap?: number;
}
export declare class SalaryComponentsConfigDto {
    components?: PayrollComponentDto[];
}
