Deploying a Next.js Custom Server (with Socket.IO) on Railway

Compiling the Custom Server & Including Dependencies

A Next.js build (next build) will not compile or bundle your custom server code. In local development, you might use ts-node or similar for server.ts, but in production you must transpile it to JavaScript (along with any modules it imports) so Node can require them ￼. The error Cannot find module './src/lib/db' indicates that the compiled server.js cannot locate the db module – likely because the src/lib/db.ts file wasn’t included or resolved in the build output.

To fix this, ensure all custom server files are present in production:
	•	Transpile your server code after the Next build. For example, update your build script to run the TypeScript compiler (or a bundler) on server.ts and its dependencies. A common approach is: next build && tsc -p tsconfig.server.json ￼. This produces a server.js (and any imported modules like db.js) in a dist directory. For instance:

// package.json
"scripts": {
  "build": "next build && tsc -p tsconfig.server.json",
  "start": "NODE_ENV=production node dist/server.js"
}

Here tsconfig.server.json would be a custom TS config that specifies an output folder (e.g. dist/) and includes server.ts and src/lib/** so that db.ts is compiled into dist/src/lib/db.js. This way, the relative import require('./src/lib/db') in server.js will point to a real file in production.

	•	Verify the output structure. After build, your deployed app should contain the compiled server and the required files. For example, you might see a structure like:

.next/          (Next.js build output)
dist/           (compiled custom server code)
  └── src/lib/db.js   (compiled DB module)
  └── server.js       (compiled custom server)

Ensuring the file exists and the path matches the import is crucial. If the custom server still cannot find the module, you may need to adjust the import path or the compiler output. (For instance, in an ESModule context you might need to append .js extensions to imports ￼, or simply use CommonJS module format for simplicity.)

Path Resolution and Module Aliases

If your project uses TypeScript path aliases or absolute imports, be aware that Node won’t resolve those by default in a custom server. Next.js supports aliasing (e.g. using baseUrl and paths in tsconfig.json) for application code, but when running your own Node server, you must compile or transform aliases to real paths. By default, tsc does not rewrite import aliases to relative paths ￼.

Options to handle this:
	•	Leverage tools like tsc-alias or babel module-resolver to adjust import paths in the compiled output. These can append extensions or convert aliases (e.g. @/lib/db) into relative ../lib/db requires.
	•	Bundle the server code using a tool like esbuild, webpack, or tsup. Bundling will resolve all imports (including aliased paths) into a single file. For example, using esbuild to bundle the server entry produces a self-contained server.js with dependencies inlined (except for Node/Next externals) ￼. This approach can simplify deployment since the custom server won’t be missing any local modules at runtime.

If you prefer to keep using relative imports (like ./src/lib/db), ensure your tsconfig and build preserve the folder structure. The compiled server.js should retain a relative require that points to the correct location of db.js. In practice, as long as the output directory contains an analogous src/lib/db.js subpath, a require('./src/lib/db') will resolve correctly.

Next.js output: 'standalone' Considerations

Be cautious with Next.js’s standalone output mode when using a custom server. The Next.js documentation notes that standalone mode outputs its own minimal server.js and does not trace/include custom server files, so “these cannot be used together” ￼. In other words, if you enable output: 'standalone' in next.config.js, the build will create a .next/standalone directory with a Next.js server, but your custom server.ts (and Socket.IO logic) won’t be part of that output. This mismatch can lead to missing module errors or a conflict between Next’s generated server and your custom server.

How to proceed:
	•	For simplicity, you may disable standalone mode when using a custom server. Rely on the regular Next build output plus your own compiled server. Railway’s Node environment will have node_modules available (since it runs npm/yarn install), so a full standalone bundle isn’t strictly necessary unless you’re optimizing for container size.
	•	If you do use standalone (e.g. in a Docker deploy), you must manually include the custom server and its deps in the runtime image. For example, you might copy the compiled server file into the standalone folder and ensure Next’s files are present for it to import. A Dockerfile could look like:

# After building in a multi-stage setup...
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Include custom server and any needed modules:
COPY --from=builder /app/dist/server.js ./server.js
COPY --from=builder /app/node_modules/next ./node_modules/next
# ...copy other needed files (e.g. DB config, views, etc.)
CMD ["node", "server.js"]

This ensures the deployed container has both the Next app (from standalone output) and your server.js entry with access to the Next runtime ￼. Alternatively, as mentioned, bundling the server can avoid having to copy a bunch of dependencies by baking them into one file ￼.

In short, standalone mode and custom servers require extra work to coexist. Unless you specifically need the slim bundle, it’s often easier to stick to the non-standalone output for a custom Node server deployment.

Build & Deployment on Railway

Deploying to Railway (without a custom Dockerfile) means using its buildpacks, which will run your package scripts. To ensure a smooth deployment:
	•	Package Scripts: Set the start script to run your compiled server. For example, in package.json:

"scripts": {


	•	“start”: “next start”,

	•	“start”: “NODE_ENV=production node server.js”,
“build”: “next build && tsc -p tsconfig.server.json”,
“dev”: “next dev” // or “ts-node server.ts” for development
}

This matches the Socket.IO+Next.js guide’s recommendation to replace `next start` with your custom server entry [oai_citation:8‡socket.io](https://socket.io/how-to/use-with-nextjs#:~:text=%7B%20%22scripts%22%3A%20%7B%20,next%20lint). Railway will by default use `yarn start` or `npm start` to boot your app, so it must point to your server. (During development you can run `node server.js` or use `ts-node`/`tsx` to launch the server for testing Socket.IO.)

- **Port and Host:** Railway typically provisions a port (exposed via `process.env.PORT`). Make sure your server listens on that. In your `server.ts`, use `const port = process.env.PORT || 3000` and `hostname = '0.0.0.0'` (Railway’s default host) when calling `app.prepare()` and starting the HTTP server. This ensures the server binds correctly in the Railway environment. For example:  

```ts
const port = process.env.PORT || 3000;
const hostname = '0.0.0.0';
const app = next({ dev: false, hostname, port });
// ... createServer, attach Socket.IO, etc., then listen on port

	•	Include all necessary files: Double-check that any files your server needs (database config, certs, etc.) are not omitted by .gitignore or build ignores. Since you have a ./src/lib/db module, ensure the compiled version or the source (if you choose to require the source directly) is present. The safest approach is compiling it into your dist or including the src/lib folder in the deployment. In a Node environment on Railway, having the original src isn’t harmful – but your server should not import TypeScript files at runtime. It’s better to import the compiled .js. Thus, adjust your import if needed (e.g., require('./dist/src/lib/db')) or simply compile and use the same relative structure as discussed.

Example Configuration Adjustments

To summarize, here are recommended changes to your project setup for Railway:
	•	Project Structure: Keep Next’s pages/components under src/ (if using that convention), and consider placing custom server code in its own folder (or at the project root). For example:

/src/           (Next.js application code)
server.ts       (custom server entry)
tsconfig.json   (for Next.js, base config)
tsconfig.server.json  (for custom server build)

In tsconfig.server.json, set "outDir": "dist" (or similar) and include any server-related files. For instance:

{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "target": "ES2020",
    "module": "CommonJS"
    // ...plus any path aliases from base tsconfig if needed
  },
  "include": ["server.ts", "src/lib/**/*"]
}


	•	Scripts: Use a combined build step. As noted, one approach is:

"build": "next build && tsc -p tsconfig.server.json"

This will output the Next app (under .next) and also produce dist/server.js (plus dist/src/lib/db.js, etc.). Then:

"start": "NODE_ENV=production node dist/server.js"

so Railway runs the compiled server. (During development you might keep using next dev and a separate socket.io server process, but in production a single combined server serves both HTTP and WebSocket traffic.)

	•	Optional – Docker Deployment: If you choose to use a custom Dockerfile on Railway, enable output: 'standalone' in Next.js and copy the necessary files as shown above. This can slim down the image by excluding dev files. However, remember to bundle or include your custom server files, since Next won’t automatically include them in the standalone build ￼. The simplest Railway deployment is often to let it handle Node installation and just run your start script (avoiding Docker), which works well once your build outputs are correctly set up.

By following these practices – compiling the custom server (and its src imports) into the production bundle, fixing import paths, and configuring the start command – you can successfully deploy a Next.js + Socket.IO app on Railway. This setup ensures that server.js has access to all required modules in production and avoids module resolution errors. In summary, compile and include your server code in the build output, use correct path resolutions (or alias tools) for any non-relative imports, and align your build/start scripts with the custom server entrypoint. These changes will allow your app to run on Railway just as it does locally ￼ ￼, with both HTTP and WebSocket traffic served on one port.

Sources:
	•	Next.js Custom Server Guide and community discussions ￼ ￼
	•	Socket.IO’s official Next.js example (for script and server setup) ￼
	•	Deployment insights from Docker/Node experts on bundling and path issues ￼ ￼ ￼