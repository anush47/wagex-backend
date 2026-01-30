# WageX Backend - Setup & Running Guide

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- Supabase (PostgreSQL) Account

## Setup

1. **Install Dependencies**
   ```bash
   bun install
   ```

2. **Environment Configuration**
   Copy `.env.example` to `.env` and fill in your details:
   ```bash
   cp .env.example .env
   ```
   *   `DATABASE_URL`: Your Supabase Transaction Pooler URL (usually port 6543) or Session connection.
   *   `SUPABASE_JWT_SECRET`: Found in Supabase ID Project Settings -> API.

3. **Database Sync**
   Push the Prisma schema to your database:
   ```bash
   bun x prisma db push
   ```

## Running the Server

*   **Development Mode** (with hot-reload):
    ```bash
    bun start:dev
    ```

*   **Production Mode**:
    ```bash
    bun run build
    bun start:prod
    ```

## API Documentation (Swagger)

Once the server is running, access the interactive API documentation at:

**[http://localhost:3000/api](http://localhost:3000/api)**
