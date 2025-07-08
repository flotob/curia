build logs:

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
┌ ○ /                                                6.72 kB         419 kB
├ ○ /_not-found                                      979 B           106 kB
├ ƒ /api/auth/session                                166 B           106 kB
├ ƒ /api/communities/[communityId]                   166 B           106 kB
├ ƒ /api/communities/[communityId]/boards            166 B           106 kB
├ ƒ /api/communities/[communityId]/boards/[boardId]  166 B           106 kB
├ ƒ /api/me                                          166 B           106 kB
├ ƒ /api/posts                                       166 B           106 kB
├ ƒ /api/posts/[postId]                              166 B           106 kB
├ ƒ /api/posts/[postId]/comments                     166 B           106 kB
├ ƒ /api/posts/[postId]/comments/[commentId]         166 B           106 kB
├ ƒ /api/posts/[postId]/move                         166 B           106 kB
├ ƒ /api/posts/[postId]/votes                        166 B           106 kB
├ ƒ /api/search/posts                                166 B           106 kB
├ ƒ /api/sign                                        166 B           106 kB
├ ○ /board-settings                                  6.95 kB         154 kB
├ ƒ /board/[boardId]/post/[postId]                   1.84 kB         410 kB
├ ○ /community-settings                              9.09 kB         142 kB
└ ○ /create-board                                    7.06 kB         142 kB
+ First Load JS shared by all                        105 kB
  ├ chunks/4bd1b696-89c32f02fc3f55a4.js              52.9 kB
  ├ chunks/517-f6f5fc4c903ab197.js                   50.5 kB
  └ other shared chunks (total)                      1.93 kB




○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand


npm notice
npm notice New major version of npm available! 10.8.2 -> 11.4.1
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.4.1
npm notice To update run: npm install -g npm@11.4.1
npm notice

Done in 38.20s.

[builder 6/7] RUN yarn build  ✔ 38s

[builder 7/7] RUN echo "Contents of /app/dist in builder stage:" && ls -R /app/dist

Contents of /app/dist in builder stage:

/app/dist:
tsconfig.server.tsbuildinfo

[builder 7/7] RUN echo "Contents of /app/dist in builder stage:" && ls -R /app/dist  ✔ 106ms

[stage-1 4/8] RUN yarn install --production --frozen-lockfile  ✔ 0ms – CACHED

[stage-1 5/8] COPY --from=builder /app/.next ./.next

[stage-1 5/8] COPY --from=builder /app/.next ./.next  ✔ 239ms

[stage-1 6/8] COPY --from=builder /app/dist ./dist

[stage-1 6/8] COPY --from=builder /app/dist ./dist  ✔ 16ms

[stage-1 7/8] COPY --from=builder /app/public ./public

[stage-1 7/8] COPY --from=builder /app/public ./public  ✔ 13ms

[stage-1 8/8] RUN echo "Contents of /app/dist in production stage:" && ls -R /app/dist

Contents of /app/dist in production stage:

/app/dist:
tsconfig.server.tsbuildinfo

[stage-1 8/8] RUN echo "Contents of /app/dist in production stage:" && ls -R /app/dist  ✔ 63ms

[auth] sharing credentials for production-europe-west4-drams3a.railway-registry.com

[auth] sharing credentials for production-europe-west4-drams3a.railway-registry.com  ✔ 0ms

Build time: 51.38 seconds




deploy logs (with crash):

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

error Command failed with exit code 1.

yarn run v1.22.22

$ NODE_ENV=production node dist/server.js

node:internal/modules/cjs/loader:1215

  throw err;

  ^

 

Error: Cannot find module '/app/dist/server.js'

    at Module._resolveFilename (node:internal/modules/cjs/loader:1212:15)

    at Module._load (node:internal/modules/cjs/loader:1043:27)

    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:164:12)

    at node:internal/main/run_main_module:28:49 {

  code: 'MODULE_NOT_FOUND',

  requireStack: []

}

 

Node.js v20.19.2

error Command failed with exit code 1.

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

yarn run v1.22.22

$ NODE_ENV=production node dist/server.js

node:internal/modules/cjs/loader:1215

  throw err;

  ^

 

Error: Cannot find module '/app/dist/server.js'

    at Module._resolveFilename (node:internal/modules/cjs/loader:1212:15)

    at Module._load (node:internal/modules/cjs/loader:1043:27)

    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:164:12)

    at node:internal/main/run_main_module:28:49 {

  code: 'MODULE_NOT_FOUND',

  requireStack: []

}

 

Node.js v20.19.2

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

error Command failed with exit code 1.

yarn run v1.22.22

$ NODE_ENV=production node dist/server.js

node:internal/modules/cjs/loader:1215

  throw err;

  ^

 

Error: Cannot find module '/app/dist/server.js'

    at Module._resolveFilename (node:internal/modules/cjs/loader:1212:15)

    at Module._load (node:internal/modules/cjs/loader:1043:27)

    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:164:12)

    at node:internal/main/run_main_module:28:49 {

  code: 'MODULE_NOT_FOUND',

  requireStack: []

}

 

Node.js v20.19.2

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

error Command failed with exit code 1.

yarn run v1.22.22

$ NODE_ENV=production node dist/server.js

node:internal/modules/cjs/loader:1215

  throw err;

  ^

 

Error: Cannot find module '/app/dist/server.js'

    at Module._resolveFilename (node:internal/modules/cjs/loader:1212:15)

    at Module._load (node:internal/modules/cjs/loader:1043:27)

    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:164:12)

    at node:internal/main/run_main_module:28:49 {

  code: 'MODULE_NOT_FOUND',

  requireStack: []

}

 

Node.js v20.19.2

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

error Command failed with exit code 1.

Stopping Container