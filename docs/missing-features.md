Okay, I'll now look into the `docs/CGSamplePlugin` directory to understand the additions made in your previous, more sophisticated application.

Ran tool
This `CGSamplePlugin` directory looks like a complete, separate project, also based on Next.js. I see familiar files like `package.json`, `next.config.ts`, `tailwind.config.ts`, and `src`, but also some new additions like `migrations`, `docker-compose.yml`, and `components.json`.

Let's start by examining the `README.md` as it often provides a good overview of a project.

Read file: docs/CGSamplePlugin/README.md
The `README.md` for `CGSamplePlugin` describes a much more feature-rich application called "OnBoard: Common Ground Wizard Plugin".

Here's a summary of what I've gathered so far:

*   **Purpose:** It's a configurable onboarding wizard system. Community admins can create step-by-step flows (Wizards) to guide users through various processes like credential verification (ENS), content consumption, and role acquisition.
*   **Database:** It uses PostgreSQL, managed with `node-pg-migrate` for migrations. There's a `docker-compose.yml` for easy local database setup.
*   **Key Concepts:**
    *   **Wizards & Steps:** Admins define wizards composed of multiple steps.
    *   **Step Types:** Different kinds of steps (e.g., ENS verification, content display).
    *   **User Progress & Sessions:** Tracks user completion of steps and their last viewed step to allow resumption.
    *   **User Profiles:** Stores basic user info synced from the auth provider.
*   **Tech Stack & Architecture:**
    *   Next.js (App Router), React, TypeScript.
    *   Tailwind CSS and `shadcn/ui` for UI.
    *   React Query for data fetching/state management, along with Context API.
    *   Custom JWT-based authentication (`withAuth` HOC) for API routes.
    *   Key libraries include `@common-ground-dao/cg-plugin-lib`, `@tanstack/react-query`, `jsonwebtoken`, `dnd-kit`, `react-markdown`.
*   **Core Flows:**
    *   **Admin Configuration:** Admins can create, manage, and reorder wizards and steps.
    *   **User Completion:** Users go through the wizard steps, with progress saved.
*   **Advanced Features (compared to the boilerplate):**
    *   **Database Integration:** Stores wizard configurations, user progress, etc.
    *   **Sophisticated Auth:** Custom JWT system with profile syncing.
    *   **ENS Verification:** Integrated ENS ownership checks.
    *   **Stripe Integration:** For subscription billing and managing paid plans.
    *   **AI Image Library & Background Generation:** Admins can generate background images for steps using DALL·E 3, manage them, and share them within the community. This involves object storage for the images.
    *   **JWT Refresh & Role Updates:** A mechanism to refresh JWTs immediately after a user earns a new role, ensuring they get access to newly available wizards without a manual page reload. This includes a cooldown system to prevent infinite refresh loops.
    *   **Quotas/Resource Limits:** Enforces limits based on community subscription plans (e.g., max active wizards, image generation quota).

This "OnBoard" plugin is significantly more complex than the initial boilerplate. It introduces a database, a custom authentication layer, several third-party integrations (Stripe, OpenAI), and a more involved application logic for managing wizards and user progression.

Next, I'll look into the `src` directory of this `CGSamplePlugin` to see how these features are implemented in the code.

Ran tool
The `src` directory of `CGSamplePlugin` has a more organized structure than the boilerplate:

*   `app/`: Likely contains the Next.js pages and API routes.
*   `components/`: For React components.
*   `context/`: For React Context API providers.
*   `hooks/`: For custom React hooks, likely including those for React Query.
*   `lib/`: Utility functions, external service integrations (Stripe, OpenAI), database query functions, etc.
*   `stores/`: Potentially for state management stores (though the README mentioned React Query and Context primarily).
*   `types/`: TypeScript type definitions.

This structure reflects a more mature and complex application. I'll start by examining the `app` directory to understand the routing and page structure.

Ran tool
Interesting. In `docs/CGSamplePlugin/src/app/`, we see:
- `layout.tsx` and `page.tsx`: Standard Next.js entry points.
- `globals.css`: Likely more extensive global styles.
- `providers.tsx`: This is a common pattern for wrapping the application with various context providers (e.g., Auth, React Query, Theme).
- `PluginContainer.tsx`: This seems like a significant component, possibly handling the main logic and layout for the plugin's UI.
- `api/`: For backend API routes.
- `stripe-callback/` and `stripe-handler/`: Directories suggesting specific handling for Stripe interactions, likely related to redirects and webhooks.

Given its name and size, `PluginContainer.tsx` seems like a good candidate to understand the plugin's core frontend logic. I'll read this file.

Read file: docs/CGSamplePlugin/src/app/PluginContainer.tsx
`PluginContainer.tsx` is indeed a central piece. Here's what it does:

*   **State Management & Context:** It heavily uses React Context (`CgLibContext`, `AuthContext`, `StripeWaitContext`, `WizardSlideshowContext`) and custom hooks (`useCgQuery`, `useCgMutation`, `useAdminStatus`, etc.) for managing application state, data fetching, and authentication. It also uses Jotai for some state (`hasSeenWelcomeAnimationAtom`).
*   **Layout & Navigation:** It sets up the main `AppLayout` which includes a `Sidebar`. The sidebar links (`adminLinks`, `userLinks`, `superAdminLinks`) change based on the user's role (admin, super-admin, regular user) and whether an admin is "previewing as user". It manages the active view/section of the plugin.
*   **Views:** It dynamically renders different views based on the active section:
    *   `AdminView`: For wizard configuration, dashboard, etc.
    *   `UserView`: For users to see their profile.
    *   `WizardView`: For users to interact with wizards.
    *   `HelpView`, `ContactView`, `DebugSettingsView`, `SuperAdminDashboardView`.
*   **Modals:** It orchestrates several global modals:
    *   `WizardSlideshowModal`: For users taking a wizard.
    *   `WizardEditorModal`: For admins editing a wizard (likely manages its own open state).
    *   `StripeWaitingModal`: For showing a loading state during Stripe operations.
    *   `UpgradeModal`: For prompting users to upgrade their plan (likely manages its own open state).
*   **Data Fetching:** It fetches various pieces of data: user info, community info, friends list, user's accessible wizards, wizard completions, etc., using custom hooks that likely wrap React Query.
*   **Authentication & Authorization:**
    *   It handles the login process (getting a JWT).
    *   Determines if the user is an admin or super-admin.
    *   Controls which views and links are available based on roles.
*   **Error Handling & Loading States:** It has comprehensive loading and error states for various asynchronous operations (CgLib initialization, data fetching, authentication).
*   **Welcome Animation:** Shows a welcome animation to new users.
*   **Redirection:** Redirects to a home URL if the `iframeUid` is missing.

The file is split into `PluginContainer` (which seems to set up providers and initial logic), `PluginContent` (which likely contains the main data fetching and state setup), and `AppCore` (which handles the core rendering logic, view switching, and prop drilling to views and modals).

This `PluginContainer.tsx` clearly demonstrates a much more sophisticated frontend architecture compared to the simple `page.tsx` and `myInfo.tsx` in the boilerplate. It's designed for a multi-faceted application with distinct user roles, various views, global modals, and a robust data-fetching and state management strategy.

Now, I'll examine the `src/lib` directory, as the README mentioned it contains important logic like `withAuth.ts` and utility functions.

Ran tool
The `src/lib` directory in `CGSamplePlugin` contains several interesting files, aligning with the features mentioned in the README:

*   `withAuth.ts`: Implements the JWT authentication middleware for API routes.
*   `authFetch.ts`: A wrapper around `fetch` that likely injects the JWT for authenticated API calls from the frontend.
*   `db.ts`: Probably contains database connection utilities and query functions (the README mentioned a `query` utility).
*   `onboardingDbService.ts`: Suggests a service layer for interacting with onboarding-specific database tables.
*   `quotas.ts`: Handles logic related to feature quotas based on subscription plans.
*   `storage.ts`: For interacting with object storage (e.g., S3 for AI-generated images).
*   `wagmi.ts`: Configuration for `wagmi` (React Hooks for Ethereum), used for ENS verification.
*   `utils.ts`, `validationUtils.ts`: General utility and validation functions.
*   `constants/`: For application-wide constants.
*   `services/`: Likely contains integrations with external services like Stripe or OpenAI.
*   `step-logic/`: This directory might contain specific logic for different types of wizard steps.

I'll examine `withAuth.ts` first, as authentication is a critical part.

Read file: docs/CGSamplePlugin/src/lib/withAuth.ts
The `withAuth.ts` file in `CGSamplePlugin` defines a higher-order function `withAuth` used to protect Next.js API routes.
Key features:
- It expects a JWT in the `Authorization: Bearer <token>` header.
- It verifies the token using a `JWT_SECRET` from environment variables.
- **User Profile Sync:** Upon successful token verification, it extracts `userId`, `username`, and `profilePictureUrl` from the JWT payload and performs an `UPSERT` operation into a `user_profiles` table in the database. This keeps basic user profile information in the plugin's database synchronized with the authentication provider. This is a significant addition compared to the boilerplate.
- It attaches the decoded JWT payload to the request object (as `req.user`).
- It can enforce admin-only access if the `adminOnly` flag is true when wrapping a route.
- It handles various JWT errors (expired, invalid).

This `withAuth` middleware is crucial for securing the backend and enabling features that rely on knowing the user's identity and profile.

Next, I'll look at `src/lib/db.ts` to understand how database interactions are handled.

Read file: docs/CGSamplePlugin/src/lib/db.ts
The `docs/CGSamplePlugin/src/lib/db.ts` file sets up and exports a PostgreSQL connection pool using the `pg` library.

Key aspects:
-   **Connection Pool:** It initializes a `Pool` instance, configuring it with environment variables for database credentials (`POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`). It also sets sensible defaults for pool size and timeouts.
-   **Error Handling:** It includes a basic error listener for idle clients in the pool.
-   **`query` Function:** It exports a generic `query` function that:
    -   Acquires a client from the pool.
    -   Executes the provided SQL query text and parameters.
    -   Logs the executed query, its duration, and row count.
    -   Releases the client back to the pool.
    -   Includes error logging for failed queries.

This `db.ts` provides a centralized way to interact with the PostgreSQL database, and the `query` function is likely used throughout the backend API routes for data access, as seen in `withAuth.ts` for the user profile upsert.

This concludes my initial deep dive into the `docs/CGSamplePlugin` directory.

**Report on `docs/CGSamplePlugin` (OnBoard: Common Ground Wizard Plugin):**

The `docs/CGSamplePlugin` directory contains a significantly more advanced Next.js application compared to the boilerplate you initially showed me. It's a full-fledged "Onboarding Wizard Plugin" designed for the Common Ground platform.

**Key Architectural Differences & Additions:**

1.  **Database Integration (PostgreSQL):**
    *   Manages its own PostgreSQL database to store wizard configurations, step details, user progress, user profiles, AI-generated image metadata, and subscription/plan information.
    *   Uses `node-pg-migrate` for database schema migrations.
    *   Provides a `docker-compose.yml` for easy local database setup.
    *   Centralized database access via a connection pool and a utility `query` function in `src/lib/db.ts`.

2.  **Sophisticated Authentication & Authorization (`src/lib/withAuth.ts`):**
    *   Implements a custom JWT-based authentication system.
    *   A `withAuth` higher-order component protects API routes.
    *   **User Profile Sync:** Automatically syncs user information (ID, name, profile picture) from the JWT into a local `user_profiles` database table on each authenticated request.
    *   Supports admin-only and super-admin roles with distinct permissions.

3.  **Structured Application Code (`src/`):**
    *   Well-organized directories for `app` (routes), `components`, `context`, `hooks`, `lib`, `services`, and `types`.
    *   `PluginContainer.tsx` acts as a central orchestrator for the frontend, managing views, modals, data fetching, and overall application state.

4.  **Advanced Frontend Features:**
    *   **Dynamic Views & Modals:** The UI changes based on user roles (admin, user, super-admin) and navigation, with global modals for wizards, an editor, Stripe interactions, and plan upgrades.
    *   **React Query & Context API:** Extensive use for server state management, data fetching, and global client state (auth, CgLib instance, wizard slideshows). Jotai is also used for some specific state.
    *   **Admin Interface:** Allows creation and management of "Wizards" (multi-step onboarding flows) and their individual "Steps."
    *   **User Interface:** Guides users through these wizards, tracking their progress.

5.  **Rich Feature Set (driven by backend & frontend logic):**
    *   **Wizard System:** The core functionality, allowing admins to build custom onboarding flows.
    *   **ENS Verification:** Integrates with Ethereum libraries (`wagmi`) to allow steps that verify ENS domain ownership.
    *   **Stripe Integration (`src/app/api/stripe/`, `src/lib/services/stripe/`):**
        *   Handles subscription billing for different community plans.
        *   Uses Stripe Checkout and Stripe Portal.
        *   Relies on Stripe Webhooks (`src/app/api/webhooks/stripe/`) to keep the plugin's database synced with subscription statuses.
        *   Implements logic for redirecting users after Stripe actions.
    *   **AI Image Library & Background Generation (`src/components/onboarding/ImageLibraryModal.tsx`, `src/app/api/admin/steps/generate-background/`):**
        *   Allows admins to generate background images for wizard steps using DALL·E 3 (via OpenAI API).
        *   Manages these images (upload to object storage via `src/lib/storage.ts`, store metadata in DB).
        *   Admins can make images public within their community.
    *   **Quotas & Resource Limiting (`src/lib/quotas.ts`):**
        *   Enforces limits on features (e.g., number of active wizards, AI image generations) based on the community's active Stripe subscription plan.
    *   **JWT Refresh & Role Cooldown:**
        *   A system to automatically refresh the user's JWT after they are granted a new role (e.g., by completing a wizard step). This ensures immediate access to content/wizards gated by that new role.
        *   Includes a cooldown mechanism to prevent infinite refresh loops if multiple roles are granted in quick succession.
    *   **User Profile Management:** Beyond the sync, there's a dedicated "Profile" view for users.
    *   **Super Admin Dashboard:** A separate view for super administrators with potentially broader oversight.

**In summary, `docs/CGSamplePlugin` (OnBoard) represents a mature, database-backed, feature-rich plugin with a robust architecture. It addresses many complexities of a real-world application, including payments, external AI service integration, advanced authentication, and a flexible content management system (the wizards).**

This provides a very clear picture of the kinds of additions and patterns you've found useful in the past. This understanding will be very helpful if you want to bring some of these more advanced features into the new boilerplate or develop new plugins based on this more sophisticated model.

What would you like to do next?

## Roadmap for Enhancing Boilerplate from CGSamplePlugin (OnBoard)

This roadmap outlines the steps to integrate key, generalizable features from the `CGSamplePlugin` (the "OnBoard" wizard plugin) into the current boilerplate. The goal is to create a more robust and feature-rich foundation for future Common Ground plugin development.

**Guiding Principles:**
*   **Generalizability:** Focus on features that are broadly useful for various types of plugins, avoiding highly specific business logic from the OnBoard plugin.
*   **Phased Approach:** Implement features incrementally to ensure stability and manage complexity.
*   **Modern Practices:** Adopt modern web development practices and tools.

**Summary of Key Features to Generalize:**

1.  **Database Integration (PostgreSQL):**
    *   **Rationale:** Essential for any plugin needing to store persistent data beyond what the CG platform provides (e.g., user-specific settings, plugin-managed content, progress tracking).
    *   **Components:** PostgreSQL instance (local dev via Docker), schema migration system (`node-pg-migrate`), database client library (`pg`), utility functions for database interaction.
2.  **Enhanced Authentication & Authorization:**
    *   **Rationale:** Provides a secure way for the plugin to manage its own sessions and user data, and to protect its API routes. Enables features tied to user identity within the plugin's scope.
    *   **Components:** JWT-based system, `withAuth.ts` middleware for API routes, synchronization of basic user profile data (ID, name, avatar) from CG JWT into the plugin's local database.
3.  **Structured Application Code:**
    *   **Rationale:** Improves maintainability, scalability, and developer experience as the plugin grows in complexity.
    *   **Components:** Organized `src` directory structure (e.g., `app/`, `components/`, `hooks/`, `lib/`, `context/`, `types/`).
4.  **Server State Management (e.g., React Query / `@tanstack/react-query`):**
    *   **Rationale:** Simplifies data fetching, caching, and synchronization with the backend, leading to a more responsive and robust UI.
    *   **Components:** React Query library, `QueryClientProvider`, custom hooks for data fetching.
5.  **UI Framework (shadcn/ui + Tailwind CSS):**
    *   **Rationale:** Provides a consistent, accessible, and customizable set of UI components, accelerating frontend development. Boilerplate already uses Tailwind; `shadcn/ui` complements it well.
    *   **Components:** `shadcn/ui` library, updated Tailwind config, `components.json`.
6.  **Basic Role-Based Access Control (RBAC):**
    *   **Rationale:** Allows the plugin to offer different experiences or functionalities based on user roles (e.g., admin vs. regular user).
    *   **Components:** Logic in `withAuth.ts` to check roles, conditional rendering in the UI based on roles.
7.  **Comprehensive Environment Variable Management:**
    *   **Rationale:** Securely manages configuration and secrets, essential for different deployment environments.
    *   **Components:** `.env.example` file, clear documentation on required variables.

---

**Proposed Development Roadmap:**

**Phase 1: Core Backend Foundation**

*   **Goal:** Establish robust database connectivity and a secure plugin-internal authentication layer.
*   **Key Outcomes:**
    *   Local PostgreSQL instance runnable via Docker.
    *   Functioning database migration system.
    *   Plugin-specific `users` table.
    *   `withAuth.ts` middleware capable of JWT verification and syncing user data to the `users` table.
*   **Detailed Steps:**
    1.  **Database Setup & Integration:**
        *   **Action:** Add `docker-compose.yml` to the project root for PostgreSQL (e.g., using `postgres:latest` image). Configure default user, password, and database.
        *   **Action:** Install `pg` (Node.js PostgreSQL client) and `node-pg-migrate` as development dependencies.
        *   **Action:** Create `src/lib/db.ts`.
            *   Implement a connection pool using `pg.Pool`, configured via environment variables (e.g., `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_DB`, etc.).
            *   Export a reusable `query(text, params)` async function for executing SQL queries, including basic logging and error handling.
        *   **Action:** Initialize `node-pg-migrate`:
            *   Add scripts to `package.json` for `migrate up`, `migrate down`, `migrate create <migration_name>`.
            *   Configure `node-pg-migrate` (e.g., via a config file or environment variables) to point to the correct database and migrations directory (`migrations/`).
        *   **Action:** Create an initial migration (`migrations/<timestamp>_create_users_table.js`):
            *   Define a `users` table schema:
                *   `id` (SERIAL PRIMARY KEY or UUID)
                *   `cg_user_id` (TEXT UNIQUE NOT NULL - from CG JWT `sub` claim, for linking)
                *   `name` (TEXT)
                *   `profile_picture_url` (TEXT)
                *   `is_admin` (BOOLEAN DEFAULT FALSE - can be synced from CG JWT `adm` claim)
                *   `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
                *   `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
            *   Include an `up` and `down` function.
        *   **Action:** Run the initial migration to create the table locally.
    2.  **Enhanced Authentication (`withAuth.ts`) & User Sync:**
        *   **Action:** Create `src/lib/withAuth.ts`.
        *   **Action:** Implement JWT verification using `jsonwebtoken` and a `JWT_SECRET` from environment variables. This JWT is internal to the plugin, distinct from the CG iframe communication.
        *   **Action:** Inside `withAuth.ts`, after successful JWT verification:
            *   Extract user claims (e.g., `sub` as `cg_user_id`, `name`, `picture` as `profile_picture_url`, `adm` as `is_admin`).
            *   Perform an `UPSERT` into the `users` table using the `query` function from `db.ts`. Match on `cg_user_id`. Update `name`, `profile_picture_url`, `is_admin`, and `updated_at`.
            *   Attach the decoded user payload (including `id` from the `users` table if fetched, or at least `cg_user_id` and `is_admin`) to the `req.user` object.
    3.  **Plugin Session Token API Route (`src/app/api/auth/session/route.ts`):**
        *   **Rationale:** To provide the frontend with a JWT that `withAuth.ts` can verify for subsequent API calls *to the plugin's own backend*. This decouples the plugin's internal session from direct reliance on CG context for every API call *after initial load*.
        *   **Action:** Create this POST route.
        *   **Action:** This route should itself be protected or carefully validate the incoming request (e.g., it might be called once after `CgPluginLib.initialize` is successful).
        *   **Action:** On successful validation of the CG context (e.g., `iframeUid`, user info from `cgPluginLibInstance.getUserInfo()`), this route will:
            *   Fetch/confirm the `cg_user_id` and `is_admin` status.
            *   Issue a new JWT signed with the plugin's `JWT_SECRET`. This JWT's payload should include `sub` (set to `cg_user_id`), `name`, `picture`, `is_admin`, and an expiry.
            *   Return this JWT to the client.
    4.  **Environment Variables:**
        *   **Action:** Create/update `.env.example` with placeholders for: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL` (for migrations), `JWT_SECRET`.

---

**Phase 2: Frontend Structure & Core UI Enhancements**

*   **Goal:** Organize frontend code, establish robust client-side data management, and integrate a modern UI component library.
*   **Key Outcomes:**
    *   Well-defined frontend directory structure.
    *   React Query setup for server state.
    *   `shadcn/ui` initialized and available.
    *   Basic `AuthContext` for client-side auth state.
*   **Detailed Steps:**
    1.  **Refactor Frontend Project Structure:**
        *   **Action:** Create/organize the following directories within `src/`:
            *   `components/` (for UI components: `layout/`, `ui/` (from shadcn), feature-specific)
            *   `hooks/` (for custom React hooks, including data-fetching hooks)
            *   `context/` (for React Context providers)
            *   `lib/` (for client-side utility functions, API client wrappers like `authFetch`)
            *   `types/` (for TypeScript interfaces and types)
            *   `app/` (will contain pages and API routes as per Next.js App Router)
    2.  **Server State Management (`@tanstack/react-query`):**
        *   **Action:** Install `@tanstack/react-query`.
        *   **Action:** Create `src/app/providers.tsx` (if not existing).
        *   **Action:** In `providers.tsx`, initialize a `QueryClient` and wrap children with `QueryClientProvider`.
        *   **Action:** Use this `Providers` component in `src/app/layout.tsx` to wrap the main application.
    3.  **UI Components & Styling (`shadcn/ui`):**
        *   **Action:** Run the `shadcn/ui init` command to set up the library. This will:
            *   Create/update `components.json`.
            *   Update `tailwind.config.ts` with `shadcn/ui` presets.
            *   Update `globals.css` with necessary base styles.
        *   **Action:** Install a few example `shadcn/ui` components (e.g., `button`, `card`) to verify setup.
        *   **Action (Optional):** Create a basic `AppLayout.tsx` component in `src/components/layout/` using `shadcn/ui` components for structure (e.g., a simple header or sidebar placeholder).
    4.  **Client-Side Authentication Context (`AuthContext`):**
        *   **Action:** Create `src/context/AuthContext.tsx`.
        *   **Action:** Define the context to store:
            *   The plugin's internal JWT (obtained from `/api/auth/session`).
            *   User information (e.g., `cg_user_id`, `name`, `profile_picture_url`, `is_admin`).
            *   Loading/authentication status.
            *   `login` function: Calls the `/api/auth/session` endpoint, stores the token and user info.
            *   `logout` function: Clears token and user info.
        *   **Action:** Wrap the application with `AuthProvider` in `src/app/providers.tsx`.
    5.  **Authenticated Fetch Utility (`authFetch`):**
        *   **Action:** Create `src/lib/authFetch.ts`.
        *   **Action:** This utility function will wrap the native `fetch` API.
        *   **Action:** It should retrieve the JWT from `AuthContext` (or localStorage/sessionStorage if preferred, though context is often better for React state flow) and automatically include it in the `Authorization: Bearer <token>` header for requests to the plugin's own backend API routes.

---

**Phase 3: Basic Role-Based Access & UI Stubs**

*   **Goal:** Implement and demonstrate basic admin/user role distinctions in both the backend and frontend.
*   **Key Outcomes:**
    *   `withAuth.ts` can protect admin-only routes.
    *   Frontend can display different content based on user's admin status.
    *   Example of an admin-only API call.
*   **Detailed Steps:**
    1.  **Role Handling in `withAuth.ts`:**
        *   **Action:** Refine `withAuth.ts` so the `adminOnly` parameter correctly checks the `is_admin` (or `adm`) claim from the decoded JWT.
        *   **Action:** Ensure non-admins attempting to access admin-only routes receive a 403 Forbidden response.
    2.  **Frontend Role Awareness & UI Stubs:**
        *   **Action:** Ensure `AuthContext` correctly stores and provides the `is_admin` status.
        *   **Action:** Create stub components:
            *   `src/components/admin/AdminDashboard.tsx`: A simple placeholder component.
            *   `src/components/user/UserProfile.tsx`: Another simple placeholder.
    3.  **Conditional Rendering/Routing Example:**
        *   **Action:** In `src/app/page.tsx` (or a designated main plugin view component):
            *   Use the `is_admin` status from `AuthContext` to conditionally render either `AdminDashboard.tsx` or `UserProfile.tsx`.
            *   This provides a basic visual distinction.
    4.  **Example Admin-Only API Route & Call:**
        *   **Action:** Create an example admin-only API route: `src/app/api/admin/test/route.ts`.
            *   Protect it using `withAuth(handler, true)`.
            *   Make it return a simple JSON response (e.g., `{ message: "Hello from admin route!" }`).
        *   **Action:** In `AdminDashboard.tsx`, add a button.
            *   When clicked, use `authFetch` and React Query (`useQuery` or `useMutation`) to call the `/api/admin/test` endpoint.
            *   Display the response or any errors. This demonstrates a complete flow for admin-restricted functionality.

---

**Phase 4: Polish, Examples & Documentation**

*   **Goal:** Make the enhanced boilerplate robust, easy to understand, and ready for use as a starting point.
*   **Key Outcomes:**
    *   Comprehensive `.env.example`.
    *   Updated `README.md` explaining all new features and setup.
    *   Clear, working examples of core functionalities.
*   **Detailed Steps:**
    1.  **Documentation - `.env.example`:**
        *   **Action:** Ensure `.env.example` is complete and clearly documents each variable required for all features implemented (database, JWT secret, etc.).
    2.  **Documentation - `README.md`:**
        *   **Action:** Thoroughly update the main project `README.md`:
            *   Explain the new architecture and features (database, auth, React Query, shadcn/ui, RBAC).
            *   Provide clear instructions for local setup:
                *   Docker for PostgreSQL (how to start).
                *   Setting up `.env` from `.env.example`.
                *   Running database migrations.
                *   Installing dependencies (`npm install` / `yarn install`).
                *   Running the dev server.
            *   Briefly describe the project structure (`src/` layout).
            *   Explain how to use `withAuth.ts` and `authFetch`.
    3.  **Working Examples & Cleanup:**
        *   **Action:** Review all implemented examples (admin-only API, conditional UI) to ensure they are clear, concise, and functional.
        *   **Action:** Remove any temporary or overly verbose logging not suitable for a boilerplate.
        *   **Action:** Ensure consistent code style and formatting.
    4.  **Final Review & Testing:**
        *   **Action:** Perform a full walkthrough of the setup and features as if you were a new developer using the boilerplate.
        *   **Action:** Test all key functionalities.

---

**Proposed First Steps (Immediate Actions from Phase 1):**

1.  **Integrate PostgreSQL with Docker:**
    *   Create `docker-compose.yml` for PostgreSQL.
    *   Install `pg` and `node-pg-migrate`.
2.  **Setup Database Connection & Migrations:**
    *   Create `src/lib/db.ts` (connection pool, query utility).
    *   Configure `package.json` scripts for migrations.
    *   Create and run the initial migration for the `users` table (including `cg_user_id`, `name`, `profile_picture_url`, `is_admin`).
3.  **Implement Initial `withAuth.ts` & API Route for Plugin JWT:**
    *   Create `src/lib/withAuth.ts` for plugin-internal JWT verification.
    *   Add logic to `withAuth.ts` for syncing user details from the CG JWT (via the plugin's internal JWT) to the `users` table.
    *   Create `src/app/api/auth/session/route.ts` to issue the plugin's internal JWT to the frontend after validating CG context.
4.  **Update `.env.example`** with initial variables for DB connection and JWT secret.

This roadmap provides a structured path to significantly enhance the boilerplate, making it a much stronger starting point for developing sophisticated Common Ground plugins.
