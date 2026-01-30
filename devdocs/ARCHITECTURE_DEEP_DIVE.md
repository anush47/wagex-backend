# Architecture: Multi-Tenancy & Permissions

This project implements a robust, explicit multi-tenant architecture designed for massive scalability and granular security.

## 🏢 Multi-Tenancy Strategy
Instead of a simple "User belongs to one Company" model, we use an **Explicit Membership Table** (`UserCompany`).

### Why this is Better?
1. **User Portability**: A single user identity can participate in multiple organizations.
2. **Context-Aware Metadata**: We store the user's role and permissions *specific to each company* in the membership record.
3. **Auditability**: Every connection between a user and a company is a traceable record.

---

## 🔐 The Permission Matrix
Permissions are stored as a JSON object in the `UserCompany` table.

### 1. The `Permission` Enum
All capabilities are defined in `src/auth/permissions.ts`. Never use magic strings.
```typescript
export enum Permission {
  MANAGE_EMPLOYEES = 'manage_employees',
  // ...
}
```

### 2. Authorization Flow
1. **JWT Strategy**: Populates `req.user` and includes the `memberships` relation.
2. **PermissionsGuard**: 
   - Extract `companyId` context from request.
   - Find the matching membership in `user.memberships`.
   - Verify the required capability exists in the `permissions` JSON.

### 3. Usage in Controllers
Simply decorate your routes:
```typescript
@Permissions(Permission.MANAGE_EMPLOYEES)
async create(...) { ... }
```

---

## 🌳 Employee Hierarchy
The `Employee` model features a recursive self-relation (`managerId`).
- **One Manager**: Each employee has at most one manager (N:1).
- **Multiple Reports**: A manager can have many reporting employees (1:N).
- **Service Layer Safety**: Always verify that the `managerId` belongs to the same `companyId` as the employee being created/updated.
