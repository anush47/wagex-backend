# WageX Backend - SalaryApp

Enterprise-grade NestJS backend for Salary Application options.

## Quick Links

- [**Setup & Running Instructions**](./devdocs/setup_guide.md)
- [**API Specification**](./devdocs/openapi.yaml)

## Project Overview

WageX is a modular, high-performance backend serving the SalaryApp platform. It is built with:

- **Framework**: NestJS (Platform Express)
- **Runtime**: Bun
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Documentation**: Swagger (Auto-generated)

## Core Modules

*   `src/auth`: Authentication (Supabase Strategy, Guards)
*   `src/users`: User management & Profile
*   `src/companies`: Company management (Tenant)
*   `src/employees`: Employee records
*   `prisma/schema.prisma`: Database Schema
