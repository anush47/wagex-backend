# WageX Backend Development Guide

Welcome to the WageX Backend Development Guide. This document outlines the architectural patterns, technology stack, and best practices used in this project to ensure a "Gold Standard" enterprise-grade codebase.

## 🛠 Technology Stack
- **Framework**: [NestJS](https://nestjs.com/) (Enterprise-grade Node.js framework)
- **Runtime**: [Bun](https://bun.sh/) (Fast all-in-one JavaScript runtime)
- **Database**: PostgreSQL (Managed via **Prisma ORM**)
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
