<div align='center'>
    <h1>CG Sample Plugin</h1>
</div>

This sample plugin demonstrates the core capabilities of the [Common Ground Plugin Library](https://github.com/Common-Ground-DAO/CGPluginLib). It provides a practical example of integrating the plugin library, showcasing essential frontend-backend interactions and common use cases.

Use this as a reference implementation to understand how to leverage the full feature set of CG plugins in your own applications.

## Database Migrations

This project uses `node-pg-migrate` to manage PostgreSQL database schema changes. Migrations are written in TypeScript and then compiled to JavaScript before being executed.

### Workflow for Adding a New Migration

1.  **Create a New Migration File:**
    Use the following yarn script to generate a new migration file. Replace `<migration_name>` with a descriptive name for your migration (e.g., `add-posts-table`, `add-status-to-users`).
    ```bash
    yarn migrate:create <migration_name>
    ```
    This command will create a new TypeScript file in the `migrations/` directory, prefixed with a timestamp (e.g., `migrations/1748449754626_add-posts-table.ts`).

2.  **Edit the Migration File:**
    Open the newly created `.ts` file in the `migrations/` directory. You will see `up` and `down` functions.
    *   **`up(pgm: MigrationBuilder): Promise<void>`:** Write your schema changes here (e.g., creating tables, adding columns). Use the `pgm` object provided by `node-pg-migrate` for schema operations.
    *   **`down(pgm: MigrationBuilder): Promise<void>`:** Write the reverse operations here to roll back the changes made in the `up` function (e.g., dropping tables, removing columns).

    ```typescript
    // Example: migrations/<timestamp>_your-migration-name.ts
    import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

    export const shorthands: ColumnDefinitions | undefined = undefined;

    export async function up(pgm: MigrationBuilder): Promise<void> {
      // pgm.createTable(...);
      // pgm.addColumn(...);
    }

    export async function down(pgm: MigrationBuilder): Promise<void> {
      // pgm.dropTable(...);
      // pgm.removeColumn(...);
    }
    ```

3.  **Apply the Migration:**
    Once you have defined your `up` and `down` functions, run the following command to apply the migration (and any other pending migrations):
    ```bash
    yarn migrate:up
    ```
    This command does two things:
    *   First, it automatically runs `yarn migrate:compile` (due to the `premigrate:up` script in `package.json`). This compiles all TypeScript files from the `migrations/` directory into JavaScript files in the `dist/migrations/` directory, using `tsconfig.migrations.json` for configuration.
    *   Then, it executes `node-pg-migrate up`, telling it to use the compiled JavaScript migrations from the `dist/migrations/` directory.

### Rolling Back Migrations

To roll back the last applied migration, use:
```bash
yarn migrate:down
```
This will also automatically compile first and then run the `down` function of the last applied migration from the compiled files in `dist/migrations/`.

### Key Files and Configuration

*   **`migrations/`**: This directory contains the source TypeScript migration files that you create and edit.
*   **`dist/migrations/`**: This directory contains the JavaScript files compiled from `migrations/`. It is automatically generated and should be added to `.gitignore` (already done).
*   **`tsconfig.migrations.json`**: A dedicated TypeScript configuration file used solely for compiling the migration files. It extends the main `tsconfig.json` but overrides settings like `module`, `outDir`, `noEmit`, and `incremental` to ensure migrations are compiled correctly to CommonJS JavaScript.
*   **`.env` file**: Must contain the `DATABASE_URL` environment variable pointing to your PostgreSQL instance (e.g., `DATABASE_URL=postgres://plugin_user:plugin_password@localhost:5434/plugin_db`). `node-pg-migrate` uses this to connect to the database. The `dotenv` package is included to help load this file.
*   **`package.json` (scripts section)**:
    *   `migrate:create`: Generates new TypeScript migration templates.
    *   `migrate:compile`: Compiles TypeScript migrations to `dist/migrations/`. Cleans `dist/migrations` before compiling.
    *   `premigrate:up`: Automatically runs `migrate:compile` before `migrate:up`.
    *   `migrate:up`: Applies pending migrations from `dist/migrations/`.
    *   `premigrate:down`: Automatically runs `migrate:compile` before `migrate:down`.
    *   `migrate:down`: Rolls back the last migration from `dist/migrations/`.

This setup ensures that you can write your migrations in TypeScript with full type safety and modern features, while `node-pg-migrate` executes reliable JavaScript code against your database.

## Authentication & Protected API Routes

This boilerplate implements a plugin-specific JWT-based authentication system to secure its backend API routes. This allows the plugin to have its own authenticated sessions independent of, but initialized by, the Common Ground platform's user context.

### Core Flow

1.  **Initial Context from Common Ground:** When the plugin loads in an iframe, the frontend (`src/app/myInfo.tsx` or a similar entry component) initializes `CgPluginLib` using the `iframeUid` and your plugin's public/private keys (via `/api/sign`). It then fetches user information (`cgUserInfo`) and community information (`communityInfo`) from `CgPluginLib`.
2.  **Determine Admin Status:** Based on `cgUserInfo.roles`, `communityInfo.roles`, and the `NEXT_PUBLIC_ADMIN_ROLE_IDS` environment variable, the frontend determines if the current user has administrative privileges within the plugin's context.
3.  **Request Plugin JWT:** The frontend then calls the `login()` function from `AuthContext` (`src/contexts/AuthContext.tsx`). This function sends a `POST` request to the plugin's backend endpoint `/api/auth/session` with the user's ID, name, profile picture URL (if available), and the determined admin status.
4.  **Issue Plugin JWT:** The `/api/auth/session/route.ts` endpoint receives this information, validates it, and if successful, mints a new JWT. This JWT is signed with your plugin's `JWT_SECRET` (from `.env`) and includes claims such as:
    *   `sub`: The user's Common Ground ID.
    *   `name`: The user's name.
    *   `picture`: The user's profile picture URL.
    *   `adm`: A boolean indicating if the user is an admin for this plugin.
    *   It also includes standard JWT claims like `iat` (issued at) and `exp` (expiry time, controlled by `JWT_EXPIRES_IN_SECONDS` in `.env`).
5.  **Store JWT on Client:** The `AuthContext` receives this JWT from `/api/auth/session` and stores it in its state. It also decodes the JWT to populate a `user` object in the context and optionally persists the token to `localStorage` to attempt session resumption on subsequent loads (with expiry checks).
6.  **Authenticated API Calls:** For subsequent calls to the plugin's backend API routes:
    *   The frontend uses the `authFetchJson` utility (`src/utils/authFetch.ts`).
    *   This utility retrieves the stored plugin JWT from `AuthContext` (via the `useAuth` hook) and includes it in the `Authorization: Bearer <token>` header of the request.
7.  **Protect API Routes with `withAuth` Middleware:**
    *   Backend API routes that require authentication are wrapped with the `withAuth` higher-order function (`src/lib/withAuth.ts`).
    *   `withAuth` verifies the incoming JWT. If valid, it decodes the claims and attaches them to the `req.user` object.
    *   **User Profile Sync:** On every successful JWT verification, `withAuth` also performs an `UPSERT` operation into the `users` table in your PostgreSQL database. This syncs the `user_id`, `name`, and `profile_picture_url` from the JWT claims, ensuring your local user profile data is kept up-to-date.
    *   `withAuth` can also enforce admin-only access to a route.

### Key Files for Authentication

*   **`src/contexts/AuthContext.tsx`:** Manages client-side authentication state (JWT, user info, loading/error states), provides `login` and `logout` functions, and handles `localStorage` persistence of the token.
*   **`src/app/api/auth/session/route.ts`:** Server-side Next.js API route that issues the plugin-specific JWTs.
*   **`src/lib/withAuth.ts`:** Server-side middleware (higher-order function) to protect API routes by verifying JWTs and performing user profile sync to the database.
*   **`src/utils/authFetch.ts`:** Client-side utility for making `fetch` requests that automatically include the plugin JWT in the `Authorization` header.
*   **`src/app/myInfo.tsx` (Example Usage):** Demonstrates initializing `CgPluginLib`, determining admin status, calling `auth.login()`, and then making an authenticated API call to a protected route (`/api/me`).
*   **`src/app/api/me/route.ts` (Example Protected Route):** A simple GET route protected by `withAuth` that returns information from the authenticated user's JWT.
*   **`.env` (and `.env.example`):** Contains crucial secrets and configurations:
    *   `JWT_SECRET`: For signing and verifying plugin JWTs.
    *   `JWT_EXPIRES_IN_SECONDS`: Defines the lifetime of the plugin JWTs.
    *   `NEXT_PUBLIC_ADMIN_ROLE_IDS`: Comma-separated list of role *titles* from Common Ground that grant admin privileges in this plugin.

### Creating a New Protected API Route

1.  Create your API route file (e.g., `src/app/api/my-data/route.ts`).
2.  Import `withAuth` and `AuthenticatedRequest` (if you need to access `req.user`) from `src/lib/withAuth.ts`.
3.  Define your handler function(s) (e.g., `async function GET(req: AuthenticatedRequest) { ... }`).
4.  Wrap your handler with `withAuth`. For admin-only routes, pass `true` as the second argument to `withAuth`.

    ```typescript
    // src/app/api/my-data/route.ts
    import { NextResponse } from 'next/server';
    import { withAuth, AuthenticatedRequest, JwtPayload } from '@/lib/withAuth';

    async function myDataHandler(req: AuthenticatedRequest) {
      // Access claims from the verified JWT via req.user
      const userId = req.user?.sub;
      const isAdmin = req.user?.adm;

      if (!userId) {
        return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
      }

      // Your logic here...
      const data = { message: `Hello user ${userId}! Your admin status is: ${isAdmin}` };
      return NextResponse.json(data);
    }

    // Protect the GET method for this route. 
    // Set second arg to `true` if it should be admin-only: export const GET = withAuth(myDataHandler, true);
    export const GET = withAuth(myDataHandler, false);
    ```

### Important Security Considerations

*   **`JWT_SECRET`:** Keep this secret secure and ensure it's a strong, random string. Do not commit it to version control (it should only be in your `.env` file, which is gitignored).
*   **HTTPS:** Always use HTTPS in production environments to protect JWTs transmitted in headers.
*   **Token Expiry:** Use reasonably short expiry times for your JWTs (e.g., 15 minutes to a few hours, configured by `JWT_EXPIRES_IN_SECONDS`) and implement a token refresh strategy if longer-lived sessions are required (currently not implemented in this boilerplate).
*   **Input Validation:** Always validate any data received in API route handlers, even for protected routes.
*   **Admin Logic:** The current admin determination relies on matching role *titles* defined in `NEXT_PUBLIC_ADMIN_ROLE_IDS`. Ensure these titles are accurate and consistently managed in your Common Ground community settings.

## Getting Started
Install the dependencies:
```bash
yarn
```
Then run the development server:
```bash
yarn dev
```

The project will start running on [http://localhost:5000](http://localhost:5000). Unfortunately, there's not a lot of use for running this project locally since, as a plugin, it requests all its data from Common Ground when running through an iframe.

To use this plugin, you have three options:

1. Use a reverse proxy (such as ngrok):
   - [Install ngrok](https://ngrok.com/docs/getting-started/)
   - Start your local dev server: `yarn dev` 
   - In a new terminal, start ngrok: `ngrok http 5000`
   - Copy the ngrok HTTPS URL (e.g. https://abc123.ngrok.io)
   - Register this URL as your plugin on Common Ground
   - Test the plugin functionality within Common Ground's interface

   Note: Only use ngrok for development/testing. Running a production plugin through ngrok could be a security risk.


2. Deploy and test it live:
   - Host this project on a server with a public URL (e.g. using Vercel, Netlify, etc.)
   - Register it as a plugin on Common Ground using your public URL
   - Test the plugin functionality within Common Ground's interface

3. Use it as a reference implementation:
   - Use it as a starting point for building your own custom plugin
   - Adapt the functionality to match your specific use case

## Architecture

![diagram](https://github.com/user-attachments/assets/37a77777-160f-4e88-bd6b-63038e7285cc)


## Next steps

For details on how the Plugin Library works and more, be sure to check [the repo for the Plugin Library](https://github.com/Common-Ground-DAO/CGPluginLib)
