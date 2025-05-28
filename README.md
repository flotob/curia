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
