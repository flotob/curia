curia


production
Architecture
Observability
Logs
Settings

Share













Activity


curia standalone
Deployments
Variables
Metrics
Settings
Unexposed service
europe-west4-drams3a
1 Replica











curia standalone
/
6efc023
Jul 10, 2025, 10:38 PM
Failed

Get Help

Details
Build Logs
Deploy Logs

Filter
Filter logs using "", (), AND, OR, -



You reached the start of the range → Jul 10, 2025, 10:38 PM


./src/app/api/ai/chat/route.ts
26:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
41:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/boards/[boardId]/rss/route.ts
174:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
187:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
259:57  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/communities/[communityId]/rss/route.ts
256:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
370:84  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/me/settings/route.ts
101:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/posts/[postId]/related/route.ts
13:84  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/posts/validate/route.ts
19:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/test-meta/page.tsx
73:29  Warning: Image elements must have an alt prop, either with meaningful text, or an empty string for decorative images.  jsx-a11y/alt-text

./src/components/ai/AIChatBubble.tsx
100:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
104:37  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
530:6  Warning: React Hook useCallback has missing dependencies: 'context?.boardId' and 'showFallbackWelcome'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
543:6  Warning: React Hook useEffect has missing dependencies: 'loadWelcomeMessage', 'user', 'welcomeLoaded', and 'welcomeLoading'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
553:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/ai/AIChatInterface.tsx
332:64  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
578:72  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
581:67  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
582:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
603:70  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
605:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
605:80  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/ai/PostImprovementModal.tsx
224:6  Warning: React Hook useEffect has missing dependencies: 'improveContent', 'improvedContent', and 'isImproving'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps

./src/components/comment/InlineUPConnection.tsx
322:21  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
536:35  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/ethereum/EthereumRichRequirementsDisplay.tsx
323:21  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
440:25  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
584:33  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/gating/EFPUserSearch.tsx
244:21  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/gating/GatingRequirementsPanel.tsx
58:9  Warning: The 'verificationContext' conditional could make the dependencies of useCallback Hook (at line 147) change on every render. To fix this, wrap the initialization of 'verificationContext' in its own useMemo() Hook.  react-hooks/exhaustive-deps
128:6  Warning: React Hook React.useEffect has a missing dependency: 'verificationStatus'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/components/gating/LUKSOVerificationSlot.tsx
76:6  Warning: React Hook useCallback has unnecessary dependencies: 'invalidateVerificationStatus', 'onVerificationComplete', and 'postId'. Either exclude them or remove the dependency array.  react-hooks/exhaustive-deps

./src/components/gating/RichCategoryHeader.tsx
180:19  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/gating/RichRequirementsDisplay.tsx
180:6  Warning: React Hook useEffect has a missing dependency: 'requirements.followerRequirements'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
335:27  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
480:25  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
590:37  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/layout/MainLayoutWithSidebar.tsx
412:43  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/layout/Sidebar.tsx
214:17  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/locks/NameFirstSearch.tsx
269:6  Warning: React Hook useCallback has missing dependencies: 'searchEFP', 'searchENS', and 'searchUP'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps

./src/components/locks/configurators/EFPMustBeFollowedByConfigurator.tsx
341:23  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/locks/configurators/EFPMustFollowConfigurator.tsx
341:23  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/locks/configurators/LSP8NFTConfigurator.tsx
277:15  Warning: Image elements must have an alt prop, either with meaningful text, or an empty string for decorative images.  jsx-a11y/alt-text

./src/components/locks/configurators/UPMustBeFollowedByConfigurator.tsx
244:23  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/locks/configurators/UPMustFollowConfigurator.tsx
244:23  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/settings/BoardAIAutoModerationSettings.tsx
74:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/settings/CommunityAIAutoModerationSettings.tsx
54:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/theme-provider.tsx
67:6  Warning: React Hook React.useEffect has missing dependencies: 'backgroundForcedTheme', 'cgTheme', and 'theme'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
151:6  Warning: React Hook React.useEffect has a missing dependency: 'setTheme'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/components/tiptap/EnhancedImageExtension.tsx
179:9  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/universal-profile/UPConnectionButton.tsx
50:6  Warning: React Hook React.useEffect has a missing dependency: 'getLyxBalance'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/components/verification/LockVerificationPanel.tsx
55:9  Warning: The 'context' logical expression could make the dependencies of useCallback Hook (at line 111) change on every render. To fix this, wrap the initialization of 'context' in its own useMemo() Hook.  react-hooks/exhaustive-deps
99:6  Warning: React Hook React.useEffect has a missing dependency: 'verificationStatus'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/components/voting/PostCard.tsx
389:6  Warning: React Hook React.useCallback has missing dependencies: 'boardContext' and 'boardInfo'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps

./src/contexts/AuthContext.tsx
238:6  Warning: React Hook useCallback has missing dependencies: 'cgIframeUid', 'cgInstance', 'fetchUserStats', and 'isCgLibInitializing'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
277:58  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/contexts/BackgroundContext.tsx
149:6  Warning: React Hook useEffect has a missing dependency: 'activeBackground'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/hooks/gating/up/useUpTokenVerification.ts
127:6  Warning: React Hook useEffect has a missing dependency: 'requirements'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/lib/ai/functions/getCommunityTrends.ts
51:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
84:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/functions/searchCommunityKnowledge.ts
64:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
65:27  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/functions/searchLocks.ts
73:72  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
77:69  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/registry/FunctionRegistry.ts
29:33  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
34:33  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/types/FunctionCall.ts
14:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
14:63  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/types/FunctionResult.ts
151:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/backend-url-builder/DatabaseService.ts
234:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/rss.ts
100:27  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/services/SemanticSearchService.ts
381:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules

Failed to compile.


./servers/host-service/src/app/api/community/route.ts:9:28
Type error: Cannot find module '@/lib/PluginHost' or its corresponding type declarations.

   7 |
   8 | import { NextRequest, NextResponse } from 'next/server';
>  9 | import { PluginHost } from '@/lib/PluginHost';
     |                            ^
  10 | import { DatabaseDataProvider } from '@/lib/DataProvider';
  11 |
  12 | // Initialize the plugin host with data provider

Static worker exited with code: 1 and signal: null

error Command failed with exit code 1.

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

✕ [builder 6/7] RUN yarn build 
process "/bin/sh -c yarn build" did not complete successfully: exit code: 1
 

Dockerfile:42

-------------------

40 |     # Run the build script (next build && tsc)

41 |     # The ARGs declared above will be available as environment variables to this command

42 | >>> RUN yarn build

43 |

44 |     # DEBUG: List the contents of /app/dist in the builder stage

-------------------

ERROR: failed to build: failed to solve: process "/bin/sh -c yarn build" did not complete successfully: exit code: 1


Build failed with 1 error
[builder 6/7] RUN yarn build
process "/bin/sh -c yarn build" did not complete successfully: exit code: 1

View in context

yarn run v1.22.22

$ next build && rimraf dist && npx tsc -p tsconfig.server.json --extendedDiagnostics

Attention: Next.js now collects completely anonymous telemetry regarding usage.

This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:

https://nextjs.org/telemetry

   ▲ Next.js 15.1.6


   Creating an optimized production build ...

 ⚠ Compiled with warnings

./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/app/node_modules/pino/lib'
Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/components/ethereum/EthereumWagmiProvider.tsx
./src/contexts/EthereumProfileContext.tsx
./src/components/verification/LockVerificationPanel.tsx
./src/components/boards/BoardVerificationModal.tsx
./src/app/page.tsx

 ✓ Compiled successfully

   Linting and checking validity of types ...

./src/app/api/ai/chat/route.ts
26:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
41:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/app/api/boards/[boardId]/rss/route.ts
174:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
187:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
259:57  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/app/api/communities/[communityId]/rss/route.ts
256:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
370:84  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/app/api/me/settings/route.ts
101:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/app/api/posts/[postId]/related/route.ts
13:84  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/app/api/posts/validate/route.ts
19:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/app/test-meta/page.tsx
73:29  Warning: Image elements must have an alt prop, either with meaningful text, or an empty string for decorative images.  jsx-a11y/alt-text
./src/components/ai/AIChatBubble.tsx
100:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
104:37  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
530:6  Warning: React Hook useCallback has missing dependencies: 'context?.boardId' and 'showFallbackWelcome'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
543:6  Warning: React Hook useEffect has missing dependencies: 'loadWelcomeMessage', 'user', 'welcomeLoaded', and 'welcomeLoading'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
553:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/components/ai/AIChatInterface.tsx
332:64  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
578:72  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
581:67  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
582:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
603:70  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
605:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
605:80  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/components/ai/PostImprovementModal.tsx
224:6  Warning: React Hook useEffect has missing dependencies: 'improveContent', 'improvedContent', and 'isImproving'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
./src/components/comment/InlineUPConnection.tsx
322:21  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
536:35  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/ethereum/EthereumRichRequirementsDisplay.tsx
323:21  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
440:25  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
584:33  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/gating/EFPUserSearch.tsx
244:21  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/gating/GatingRequirementsPanel.tsx
58:9  Warning: The 'verificationContext' conditional could make the dependencies of useCallback Hook (at line 147) change on every render. To fix this, wrap the initialization of 'verificationContext' in its own useMemo() Hook.  react-hooks/exhaustive-deps
128:6  Warning: React Hook React.useEffect has a missing dependency: 'verificationStatus'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
./src/components/gating/LUKSOVerificationSlot.tsx
76:6  Warning: React Hook useCallback has unnecessary dependencies: 'invalidateVerificationStatus', 'onVerificationComplete', and 'postId'. Either exclude them or remove the dependency array.  react-hooks/exhaustive-deps
./src/components/gating/RichCategoryHeader.tsx
180:19  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/gating/RichRequirementsDisplay.tsx
180:6  Warning: React Hook useEffect has a missing dependency: 'requirements.followerRequirements'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
335:27  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
480:25  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
590:37  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/layout/MainLayoutWithSidebar.tsx
412:43  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/layout/Sidebar.tsx
214:17  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/locks/NameFirstSearch.tsx
269:6  Warning: React Hook useCallback has missing dependencies: 'searchEFP', 'searchENS', and 'searchUP'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
./src/components/locks/configurators/EFPMustBeFollowedByConfigurator.tsx
341:23  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/locks/configurators/EFPMustFollowConfigurator.tsx
341:23  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/locks/configurators/LSP8NFTConfigurator.tsx
277:15  Warning: Image elements must have an alt prop, either with meaningful text, or an empty string for decorative images.  jsx-a11y/alt-text
./src/components/locks/configurators/UPMustBeFollowedByConfigurator.tsx
244:23  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/locks/configurators/UPMustFollowConfigurator.tsx
244:23  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/settings/BoardAIAutoModerationSettings.tsx
74:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/components/settings/CommunityAIAutoModerationSettings.tsx
54:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/components/theme-provider.tsx
67:6  Warning: React Hook React.useEffect has missing dependencies: 'backgroundForcedTheme', 'cgTheme', and 'theme'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
151:6  Warning: React Hook React.useEffect has a missing dependency: 'setTheme'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
./src/components/tiptap/EnhancedImageExtension.tsx
179:9  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/universal-profile/UPConnectionButton.tsx
50:6  Warning: React Hook React.useEffect has a missing dependency: 'getLyxBalance'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
./src/components/verification/LockVerificationPanel.tsx
55:9  Warning: The 'context' logical expression could make the dependencies of useCallback Hook (at line 111) change on every render. To fix this, wrap the initialization of 'context' in its own useMemo() Hook.  react-hooks/exhaustive-deps
99:6  Warning: React Hook React.useEffect has a missing dependency: 'verificationStatus'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
./src/components/voting/PostCard.tsx
389:6  Warning: React Hook React.useCallback has missing dependencies: 'boardContext' and 'boardInfo'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
./src/contexts/AuthContext.tsx
238:6  Warning: React Hook useCallback has missing dependencies: 'cgIframeUid', 'cgInstance', 'fetchUserStats', and 'isCgLibInitializing'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
277:58  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/contexts/BackgroundContext.tsx
149:6  Warning: React Hook useEffect has a missing dependency: 'activeBackground'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
./src/hooks/gating/up/useUpTokenVerification.ts
127:6  Warning: React Hook useEffect has a missing dependency: 'requirements'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
./src/lib/ai/functions/getCommunityTrends.ts
51:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
84:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/ai/functions/searchCommunityKnowledge.ts
64:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
65:27  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/ai/functions/searchLocks.ts
73:72  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
77:69  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/ai/registry/FunctionRegistry.ts
29:33  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
34:33  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/ai/types/FunctionCall.ts
14:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
14:63  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/ai/types/FunctionResult.ts
151:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/backend-url-builder/DatabaseService.ts
234:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/rss.ts
100:27  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/services/SemanticSearchService.ts
381:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules

Failed to compile.

./servers/host-service/src/app/api/community/route.ts:9:28
Type error: Cannot find module '@/lib/PluginHost' or its corresponding type declarations.

   7 |
   8 | import { NextRequest, NextResponse } from 'next/server';
>  9 | import { PluginHost } from '@/lib/PluginHost';
     |                            ^
  10 | import { DatabaseDataProvider } from '@/lib/DataProvider';
  11 |
  12 | // Initialize the plugin host with data provider

Static worker exited with code: 1 and signal: null

error Command failed with exit code 1.

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
curia standalone | Railway