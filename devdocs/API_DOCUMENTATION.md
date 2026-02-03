# WageX API Documentation

**Base URL**: `/api` (Assumed based on standard NestJS setup, verify if different)
**Authentication**: Bearer Token (JWT) required for most endpoints.
**Roles**: `ADMIN`, `EMPLOYER`, `EMPLOYEE`

---

## 🔐 Authentication (`/auth`)

### Register
**POST** `/auth/register`
- **Desc**: Register a new user using Supabase token.
- **Roles**: Public (Authenticated via Supabase Token)
- **Body**:
    - `email`: string
    - `firstName`: string
    - `lastName`: string
- **Response**: `201 Created`

### Change Password
**POST** `/auth/change-password`
- **Desc**: Placeholder. use Supabase Client SDK.

---

## 👥 Users (`/users` & `/me`)

### Get My Profile
**GET** `/me`
- **Roles**: All Authenticated
- **Response**: Current User Profile

### Update My Profile
**PUT** `/me`
- **Roles**: All Authenticated
- **Body**: `UpdateUserDto` (Partial User fields)
- **Response**: Updated Profile

### List Users (Admin)
**GET** `/users`
- **Roles**: `ADMIN`
- **Query**: `page`, `limit`, `search`

### Create User (Admin)
**POST** `/users`
- **Roles**: `ADMIN`
- **Body**: `CreateUserDto`

### Get/Update/Delete User (Admin)
- **GET** `/users/:id`
- **PUT** `/users/:id`
- **DELETE** `/users/:id`

---

## 🏢 Companies (`/companies`)

### Create Company
**POST** `/companies`
- **Roles**: `ADMIN`, `EMPLOYER`
- **Body**: `CreateCompanyDto`
    ```json
    {
      "name": "WageX Inc.",
      "employerNumber": "B/50139",  // <-- Example
      "address": "123 Main St",
      "startedDate": "2023-01-01T00:00:00Z",
      "logo": "https://url-to-logo.png",
      "files": [{ "key": "doc1", "name": "Registration", "url": "..." }]
    }
    ```

### List Companies
**GET** `/companies`
- **Roles**: `ADMIN`, `EMPLOYER`
- **Query**: `page`, `limit`, `search`
- **Note**: Employers only see companies they belong to.

### Get Company
**GET** `/companies/:id`
- **Roles**: `ADMIN`, `EMPLOYER`

### Update Company
**PUT** `/companies/:id`
- **Roles**: `ADMIN`, `EMPLOYER`
- **Body**: `UpdateCompanyDto` (Partial creation fields)

### Delete Company
**DELETE** `/companies/:id`
- **Roles**: `ADMIN`

---

## 🧑‍💼 Employees (`/employees`)

### Create Employee
**POST** `/employees`
- **Roles**: `ADMIN`, `EMPLOYER`
- **Permission**: `MANAGE_EMPLOYEES`
- **Body**: `CreateEmployeeDto`
    - `name`: string
    - `employeeNo`: string
    - `email`: string (optional)
    - `companyId`: string
    - `managerId`: string (optional)

### List Employees
**GET** `/employees`
- **Roles**: `ADMIN`, `EMPLOYER`
- **Query**: `companyId` (Required for context often), `page`, `limit`

### Get Employee
**GET** `/employees/:id`
- **Roles**: `ADMIN`, `EMPLOYER`

### Update Employee
**PUT** `/employees/:id`
- **Roles**: `ADMIN`, `EMPLOYER`
- **Body**: `UpdateEmployeeDto`

### Delete Employee
**DELETE** `/employees/:id`
- **Roles**: `ADMIN`, `EMPLOYER`

### Provision User
**POST** `/employees/:id/provision-user`
- **Roles**: `ADMIN`, `EMPLOYER`
- **Desc**: Creates/Links a User account for this employee.

---

## 📜 Policies (`/policies`)

### Create Policy
**POST** `/policies`
- **Roles**: `ADMIN`, `EMPLOYER`
- **Body**: `CreatePolicyDto` (Settings JSON)

### Get Company Policy
**GET** `/policies/company/:companyId`
- **Roles**: All (View Access)

### Get Effective Employee Policy
**GET** `/policies/effective/:employeeId`
- **Roles**: All
- **Desc**: Merges Company policy with Employee specific overrides.

### Update Policy
**PATCH** `/policies/:id`
- **Roles**: `ADMIN`, `EMPLOYER`

### Delete Policy
**DELETE** `/policies/:id`

### Remove Override
**DELETE** `/policies/override/:employeeId`

---

## 📁 Storage (`/storage`)

### Upload File
**POST** `/storage/upload`
- **Roles**: All (Context aware)
- **Type**: `multipart/form-data`
- **Body**:
    - `file`: Binary
    - `companyId`: string
    - `folder`: string (`employees`, `general`, etc)
    - `employeeId`: string (Required for Employee uploads)

### Get Signed URL
**GET** `/storage/url`
- **Query**: `key` (e.g., `companies/123/employees/doc.pdf`)
- **Roles**: All (Strict privacy checks: Employees can only see their own files).

### Delete File
**DELETE** `/storage`
- **Query**: `key`

---

## 🔔 Notifications (`/notifications`)

### Broadcast
**POST** `/notifications/broadcast`
- **Roles**: `ADMIN`, `EMPLOYER`
- **Body**:
    - `title`: string
    - `message`: string
    - `userIds`: string[] (optional target specific users)
    - `targetRole`: Enum (optional target all users of role)

### Get My Notifications
**GET** `/notifications`
- **Roles**: All

### Mark Read
**PATCH** `/notifications/:id/read`
**PATCH** `/notifications/read-all`
