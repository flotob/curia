build logs:

This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:

https://nextjs.org/telemetry


   ▲ Next.js 15.1.6



   Creating an optimized production build ...

(node:92) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)

(node:260) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)

 ✓ Compiled successfully

   Linting and checking validity of types ...


./src/contexts/SocketContext.tsx
301:6  Warning: React Hook useEffect has a missing dependency: 'socket'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules

   Collecting page data ...

   Generating static pages (0/13) ...

   Generating static pages (3/13) 
   Generating static pages (6/13) 

   Generating static pages (9/13) 

 ✓ Generating static pages (13/13)

Closing database pool...

   Finalizing page optimization ...
   Collecting build traces ...

Closing database pool...

Closing database pool...

Closing database pool...

Closing database pool...

Closing database pool...

Closing database pool...

Closing database pool...

Closing database pool...

Closing database pool...

Closing database pool...

Closing database pool...

Closing database pool...



Route (app)                                          Size     First Load JS
┌ ○ /                                                6.69 kB         419 kB
├ ○ /_not-found                                      982 B           106 kB
├ ƒ /api/auth/session                                168 B           105 kB
├ ƒ /api/communities/[communityId]                   168 B           105 kB
├ ƒ /api/communities/[communityId]/boards            168 B           105 kB
├ ƒ /api/communities/[communityId]/boards/[boardId]  168 B           105 kB
├ ƒ /api/me                                          168 B           105 kB
├ ƒ /api/posts                                       168 B           105 kB
├ ƒ /api/posts/[postId]                              168 B           105 kB
├ ƒ /api/posts/[postId]/comments                     168 B           105 kB
├ ƒ /api/posts/[postId]/comments/[commentId]         168 B           105 kB
├ ƒ /api/posts/[postId]/move                         168 B           105 kB
├ ƒ /api/posts/[postId]/votes                        168 B           105 kB
├ ƒ /api/search/posts                                168 B           105 kB
├ ƒ /api/sign                                        168 B           105 kB
├ ○ /board-settings                                  6.92 kB         153 kB
├ ƒ /board/[boardId]/post/[postId]                   1.83 kB         410 kB
├ ○ /community-settings                              9.07 kB         142 kB
└ ○ /create-board                                    7.03 kB         142 kB
+ First Load JS shared by all                        105 kB
  ├ chunks/4bd1b696-89c32f02fc3f55a4.js              53 kB
  ├ chunks/517-f6f5fc4c903ab197.js                   50.4 kB
  └ other shared chunks (total)                      1.92 kB



○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand


npm warn config production Use `--omit=dev` instead.

Done in 27.94s.

[stage-0  8/10] RUN --mount=type=cache,id=s/4e2b9409-8c73-46b7-8138-65c2c3cbd2f2-next/cache,target=/app/.next/cache --mount=type=cache,id=s/4e2b9409-8c73-46b7-8138-65c2c3cbd2f2-node_modules/cache,target=/app/node_modules/.cache yarn run build  ✔ 28s

[stage-0  9/10] RUN printf '\nPATH=/app/node_modules/.bin:$PATH' >> /root/.profile

[stage-0  9/10] RUN printf '\nPATH=/app/node_modules/.bin:$PATH' >> /root/.profile  ✔ 70ms

[stage-0 10/10] COPY . /app

[stage-0 10/10] COPY . /app  ✔ 26ms

[auth] sharing credentials for production-europe-west4-drams3a.railway-registry.com

[auth] sharing credentials for production-europe-west4-drams3a.railway-registry.com  ✔ 0ms

=== Successfully Built! ===

Run:

docker run -it production-europe-west4-drams3a.railway-registry.com/4e2b9409-8c73-46b7-8138-65c2c3cbd2f2:c479f69c-22bb-4ea7-a598-6a6d90add6b7

Build time: 105.76 seconds

crash logs:

  throw err;

  ^

 

Error: Cannot find module './src/lib/db'

Require stack:

- /app/server.js

    at Function.<anonymous> (node:internal/modules/cjs/loader:1249:15)

    at /app/node_modules/next/dist/server/require-hook.js:55:36

    at Function._load (node:internal/modules/cjs/loader:1075:27)

    at TracingChannel.traceSync (node:diagnostics_channel:315:14)

    at wrapModuleLoad (node:internal/modules/cjs/loader:218:24)

    at Module.<anonymous> (node:internal/modules/cjs/loader:1340:12)

    at mod.require (/app/node_modules/next/dist/server/require-hook.js:65:28)

    at require (node:internal/modules/helpers:141:16)

    at Object.<anonymous> (/app/server.js:11:14)

    at Module._compile (node:internal/modules/cjs/loader:1546:14) {

  code: 'MODULE_NOT_FOUND',

  requireStack: [ '/app/server.js' ]

}

 

Node.js v22.11.0

error Command failed with exit code 1.

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

yarn run v1.22.22

$ node server.js

node:internal/modules/cjs/loader:1252

  throw err;

  ^

 

Error: Cannot find module './src/lib/db'

Require stack:

- /app/server.js

    at Function.<anonymous> (node:internal/modules/cjs/loader:1249:15)

    at /app/node_modules/next/dist/server/require-hook.js:55:36

    at Function._load (node:internal/modules/cjs/loader:1075:27)

    at TracingChannel.traceSync (node:diagnostics_channel:315:14)

    at wrapModuleLoad (node:internal/modules/cjs/loader:218:24)

    at Module.<anonymous> (node:internal/modules/cjs/loader:1340:12)

    at mod.require (/app/node_modules/next/dist/server/require-hook.js:65:28)

    at require (node:internal/modules/helpers:141:16)

    at Object.<anonymous> (/app/server.js:11:14)

    at Module._compile (node:internal/modules/cjs/loader:1546:14) {

  code: 'MODULE_NOT_FOUND',

  requireStack: [ '/app/server.js' ]

}

 

Node.js v22.11.0

error Command failed with exit code 1.

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

yarn run v1.22.22

$ node server.js

node:internal/modules/cjs/loader:1252

  throw err;

  ^

 

Error: Cannot find module './src/lib/db'

Require stack:

- /app/server.js

    at Function.<anonymous> (node:internal/modules/cjs/loader:1249:15)

    at /app/node_modules/next/dist/server/require-hook.js:55:36

    at Function._load (node:internal/modules/cjs/loader:1075:27)

    at TracingChannel.traceSync (node:diagnostics_channel:315:14)

    at wrapModuleLoad (node:internal/modules/cjs/loader:218:24)

    at Module.<anonymous> (node:internal/modules/cjs/loader:1340:12)

    at mod.require (/app/node_modules/next/dist/server/require-hook.js:65:28)

    at require (node:internal/modules/helpers:141:16)

    at Object.<anonymous> (/app/server.js:11:14)

    at Module._compile (node:internal/modules/cjs/loader:1546:14) {

  code: 'MODULE_NOT_FOUND',

  requireStack: [ '/app/server.js' ]

}

 

Node.js v22.11.0

error Command failed with exit code 1.

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
