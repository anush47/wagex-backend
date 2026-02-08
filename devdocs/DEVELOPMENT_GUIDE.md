# WageX Backend Development Guide

Welcome to the WageX Backend Development Guide. This document outlines the architectural patterns, technology stack, and best practices used in this project to ensure a "Gold Standard" enterprise-grade codebase.

## 🛠 Technology Stack
- **Framework**: [NestJS](https://nestjs.com/) (Enterprise-grade Node.js framework)
- **Runtime**: [Bun](https://bun.sh/) (Fast all-in-one JavaScript runtime)
- **Database**: PostgreSQL (Managed via **Prisma ORM**)
- **Storage**: Cloudflare R2 (S3-Compatible)
- **Authentication**: Supabase Auth (JWT + JWKS validation)
- **Documentation**: Swagger/OpenAPI (`/api/docs`)

---

## 🏗 Core Architecture

### 1. Explicit Multi-Tenancy
We use an **Explicit Membership Model** for multi-tenancy.
- **Join Table**: `UserCompany` links `User` to `Company`.
- **Tenancy Context**: Every request requiring company access must define a `companyId` context (Query, Param, or Body).
- **Enforcement**: 
    - `PermissionsGuard` verifies the user has a membership in the target company.
    - Service layer `findAll(companyId)` filters data strictly by the provided ID.

### 2. Standardized Authorization
Authorization is tiered to provide maximum flexibility and security:
- **Global Roles**: `ADMIN`, `EMPLOYER`, `EMPLOYEE` (Defined on the `User` model).
- **Per-Company Permissions**: Granular capabilities (e.g., `manage_employees`) defined in the `UserCompany.permissions` JSON field.
- **Implementation**:
    - Use `@Roles(Role.ADMIN)` for high-level guarding.
    - Use `@Permissions(Permission.MANAGE_EMPLOYEES)` for granular capability checks.

### 3. Employee Hierarchy
We support a **Self-Referencing Parent-Child** relationship for employees.
- **Model**: `Employee.managerId` links to another `Employee.id`.
- **Benefit**: Allows for organizational charts, approval chains, and manager-specific views.

---

## 🌟 Gold Standards & Best Practices

### 1. Robust Service Layer
Every service method must follow these principles:
- **Explicit Return Types**: Always specify `Promise<T>` or `Promise<T[]>`.
- **Logging**: Use the NestJS `Logger` for critical lifecycle events and warnings.
- **Error Handling**: Throw specific NestJS exceptions (e.g., `NotFoundException`) instead of generic errors.
- **Defensive Queries**: Always check if a resource exists before performing mutations.

### 2. Data Integrity
- **DTOs (Data Transfer Objects)**: All incoming data must be validated via DTOs using `class-validator`.
- **Unique Constraints**: Business-logic-specific uniqueness (e.g., `employeeNo` unique per `companyId`) is enforced at the DB level.

### 3. Code Organization
- **Entities**: Mirror Prisma models but include Swagger decorators for API documentation.
- **Separation of Concerns**: Controllers handle HTTP context; Services handle business logic; Guards handle security.

### 4. Data Normalization
To maintain a clean and searchable database, follow these formatting rules:
- **Employee Names**: Both `nameWithInitials` and `fullName` **MUST** be stored in **UPPERCASE**. This is enforced on the frontend before submission and should be validated/normalized in the service layer if necessary.
- **Member IDs**: `employeeNo` should be treated as a unique numerical identifier within a company context.
- **Dates**: Always store and transmit dates in ISO 8601 format.

---

## 📊 Attendance System Architecture

### Overview
The attendance system uses a **two-table architecture** to separate raw event logs from processed attendance sessions.

### Tables

#### 1. AttendanceEvent (Raw Logs)
- **Purpose**: Immutable audit trail of all attendance events
- **Source Types**: 
  - `WEB`: Employee portal check-in/out
  - `API_KEY`: External devices (biometric, time clocks)
  - `MANUAL`: Employer-created entries
- **Status**: `ACTIVE`, `REJECTED`, `IGNORED`
- **Key Fields**: `employeeId`, `eventTime`, `eventType` (IN/OUT), `source`, `device`, `location`

#### 2. AttendanceSession (Processed Sessions)
- **Purpose**: Calculated daily work sessions with approval workflow
- **Lifecycle**: Created from events, can be manually edited, requires approval
- **Key Fields**: 
  - Times: `checkInTime`, `checkOutTime`, `sessionDate`
  - Approvals: `inApprovalStatus`, `outApprovalStatus`
  - Calculations: `totalMinutes`, `workMinutes`, `breakMinutes`, `overtimeMinutes`
  - Flags: `isLate`, `isEarlyLeave`, `isOnLeave`, `isHalfDay`

### External API Integration

The system provides API key authentication for external devices:

**Endpoints**:
- `POST /attendance/external/event` - Single event submission
- `POST /attendance/external/events/bulk` - Bulk event submission
- `GET /attendance/external/verify` - API key verification

**Authentication**: API keys are managed per company and passed via `X-API-Key` header.

See [ATTENDANCE_EXTERNAL_API.md](./ATTENDANCE_EXTERNAL_API.md) for complete integration guide.

### Approval Workflow

1. **Event Creation**: Raw events are logged with `ACTIVE` status
2. **Session Processing**: Events are grouped into daily sessions
3. **Approval States**: 
   - `PENDING`: Awaiting employer approval
   - `APPROVED`: Confirmed by employer
   - `REJECTED`: Rejected by employer
4. **Manual Edits**: Sessions can be edited, which sets times to `PENDING` for re-approval

### Session Lifecycle

```
Event (IN) → Event (OUT) → Session Created → Approval → Salary Calculation
```

- Events are processed into sessions automatically
- Sessions can be manually edited (times, shift, flags)
- Approved sessions are used for salary calculations
- Rejected sessions are excluded from calculations

---

## 🚀 Common Commands
- **Sync Database**: `bun x prisma db push`
- **Generate Client**: `bun x prisma generate`
- **Seed Permissions**: `bun run scripts/seed-permissions.ts`
- **Run Dev Mode**: `bun start:dev`

---

## 🛡 Security Review Checklist
- [ ] Is this endpoint guarded by `JwtAuthGuard`?
- [ ] Does this endpoint need `@Roles` check?
- [ ] For multi-tenant actions, does it use `PermissionsGuard`?
- [ ] Is the `companyId` being verified against the user's `memberships`?
