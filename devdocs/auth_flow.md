# Authentication & Registration Flow

Since we are using **Supabase** for Identity (Auth) and **NestJS/Prisma** for Data, the registration flow requires a synchronization step.

## 1. The Sign-Up Flow

1.  **Frontend**: User enters Email/Password or clicks "Login with Google".
2.  **Supabase**: Handles the credential validation and creates a user in its internal `auth.users` table.
3.  **Supabase**: Returns a **JSON Web Token (JWT)** to the Frontend.

## 2. Onboarding (The Missing Link)

At this point, the user has a valid Supabase Token, but **does not exist in your PostgreSQL `public.User` table**.

1.  **Frontend**: Checks if the user has a profile (calls `GET /api/me`).
2.  **Backend**: Returns `404 Not Found` (or specific error) because the user isn't in `public.User`.
3.  **Frontend**: Redirects user to a **"Complete Profile"** screen.
4.  **Frontend**: User enters their Name, Role (if manually selecting), or Company Name.
5.  **Frontend**: Calls **`POST /api/auth/register`** with the Token.
6.  **Backend**:
    *   Verifies the Token signature.
    *   Creates the `User` record in `public.User`.
    *   (Optional) Creates a `Company` if the user is an Employer.

## 3. Subsequent Logins

1.  **Frontend**: User logs in via Supabase.
2.  **Frontend**: Calls `GET /api/me`.
3.  **Backend**: Finds the user in `public.User`. Returns profile.
4.  **Frontend**: Grants access to the dashboard.

---

## Required Backend Changes

To support this, we need to modify our strict Auth Guards:

1.  **Update `SupabaseStrategy`**: Allow it to pass *even if local User doesn't exist* (mark them as "Guest" or "New").
2.  **Create `UserRequiredGuard`**: Enforce "Must exist in DB" for all standard endpoints (`/employees`, `/companies` etc).
3.  **Create `POST /auth/register`**: An endpoint accessible to "New" users to create their DB record.
