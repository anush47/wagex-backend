export declare enum SortOrder {
    ASC = "asc",
    DESC = "desc"
}
export declare class QueryDto {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: SortOrder;
    companyId?: string;
}
