    '/app/dist/src/lib/telegram/directMetadataFetcher.js',

    '/app/dist/src/lib/telegram/TelegramEventHandler.js',

    '/app/dist/server.js'

  ]

}

 

Node.js v20.19.3

error Command failed with exit code 1.

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

yarn run v1.22.22

$ NODE_ENV=production node dist/server.js

[TelegramService] Initialized with bot token

node:internal/modules/cjs/loader:1215

  throw err;

  ^

 

Error: Cannot find module '@/lib/queries/enrichedPosts'

Require stack:

- /app/dist/src/lib/telegram/directMetadataFetcher.js

- /app/dist/src/lib/telegram/TelegramEventHandler.js

- /app/dist/server.js

    at Module._resolveFilename (node:internal/modules/cjs/loader:1212:15)

    at /app/node_modules/next/dist/server/require-hook.js:55:36

    at Module._load (node:internal/modules/cjs/loader:1043:27)

    at Module.require (node:internal/modules/cjs/loader:1298:19)

    at mod.require (/app/node_modules/next/dist/server/require-hook.js:65:28)

    at require (node:internal/modules/helpers:182:18)

    at Object.<anonymous> (/app/dist/src/lib/telegram/directMetadataFetcher.js:10:25)

    at Module._compile (node:internal/modules/cjs/loader:1529:14)

    at Module._extensions..js (node:internal/modules/cjs/loader:1613:10)

    at Module.load (node:internal/modules/cjs/loader:1275:32) {

  code: 'MODULE_NOT_FOUND',

  requireStack: [

    '/app/dist/src/lib/telegram/directMetadataFetcher.js',

    '/app/dist/src/lib/telegram/TelegramEventHandler.js',

    '/app/dist/server.js'

  ]

}

 

Node.js v20.19.3

error Command failed with exit code 1.

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

yarn run v1.22.22

$ NODE_ENV=production node dist/server.js

[TelegramService] Initialized with bot token

node:internal/modules/cjs/loader:1215

  throw err;

  ^

 

Error: Cannot find module '@/lib/queries/enrichedPosts'

Require stack:

- /app/dist/src/lib/telegram/directMetadataFetcher.js

- /app/dist/src/lib/telegram/TelegramEventHandler.js

- /app/dist/server.js

    at Module._resolveFilename (node:internal/modules/cjs/loader:1212:15)

    at /app/node_modules/next/dist/server/require-hook.js:55:36

    at Module._load (node:internal/modules/cjs/loader:1043:27)

    at Module.require (node:internal/modules/cjs/loader:1298:19)

    at mod.require (/app/node_modules/next/dist/server/require-hook.js:65:28)

    at require (node:internal/modules/helpers:182:18)

    at Object.<anonymous> (/app/dist/src/lib/telegram/directMetadataFetcher.js:10:25)

    at Module._compile (node:internal/modules/cjs/loader:1529:14)

    at Module._extensions..js (node:internal/modules/cjs/loader:1613:10)

    at Module.load (node:internal/modules/cjs/loader:1275:32) {

  code: 'MODULE_NOT_FOUND',

  requireStack: [

    '/app/dist/src/lib/telegram/directMetadataFetcher.js',

    '/app/dist/src/lib/telegram/TelegramEventHandler.js',

    '/app/dist/server.js'

  ]

}

 

Node.js v20.19.3

error Command failed with exit code 1.