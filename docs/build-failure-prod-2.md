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

Failed to compile.

./src/app/test-meta/page.tsx
71:29  Warning: Image elements must have an alt prop, either with meaningful text, or an empty string for decorative images.  jsx-a11y/alt-text
./src/components/comment/InlineUPConnection.tsx
322:21  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
536:35  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/ethereum/EthereumConnectionWidget.tsx
78:9  Error: 'requirementsKey' is assigned a value but never used.  @typescript-eslint/no-unused-vars
./src/components/ethereum/EthereumRichRequirementsDisplay.tsx
323:21  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
432:25  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
576:33  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
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
417:43  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/layout/Sidebar.tsx
192:17  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
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
./src/components/tiptap/EnhancedImageExtension.tsx
179:9  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
./src/components/universal-profile/UPConnectionButton.tsx
50:6  Warning: React Hook React.useEffect has a missing dependency: 'getLyxBalance'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
./src/components/verification/LockVerificationPanel.tsx
55:9  Warning: The 'context' logical expression could make the dependencies of useCallback Hook (at line 111) change on every render. To fix this, wrap the initialization of 'context' in its own useMemo() Hook.  react-hooks/exhaustive-deps
99:6  Warning: React Hook React.useEffect has a missing dependency: 'verificationStatus'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
./src/components/voting/PostCard.tsx
388:6  Warning: React Hook React.useCallback has missing dependencies: 'boardContext' and 'boardInfo'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
./src/contexts/AuthContext.tsx
238:6  Warning: React Hook useCallback has missing dependencies: 'cgIframeUid', 'cgInstance', 'fetchUserStats', and 'isCgLibInitializing'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
./src/contexts/FriendsContext.tsx
108:28  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
109:25  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/hooks/gating/up/useUPRequirementVerification.ts
14:9  Error: 'requirementsKey' is assigned a value but never used.  @typescript-eslint/no-unused-vars
./src/hooks/gating/up/useUpFollowerVerification.ts
18:9  Error: 'requirementsKey' is assigned a value but never used.  @typescript-eslint/no-unused-vars
./src/hooks/gating/up/useUpTokenVerification.ts
127:6  Warning: React Hook useEffect has a missing dependency: 'requirements'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
./src/hooks/useAsyncState.ts
12:22  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
29:28  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
51:47  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
172:61  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
181:26  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/errors/ApiErrors.ts
11:22  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
31:42  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
71:42  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
81:60  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/errors/ErrorTypes.ts
77:19  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
78:17  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/queries/enrichedPosts.ts
715:34  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/queries/lockVerification.ts
19:42  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
131:31  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/queries/userStats.ts
74:31  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/services/PaginationService.ts
49:13  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
51:25  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
86:24  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
173:48  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
174:31  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
176:19  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/lib/services/ValidationService.ts
66:39  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
121:12  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
151:12  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
176:12  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
178:20  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
203:12  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
206:6  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/repositories/BaseRepository.ts
38:43  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
93:38  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
105:39  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
129:40  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
148:40  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
172:44  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
244:29  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
246:37  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
248:19  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
278:58  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
295:55  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
295:77  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
296:37  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/repositories/LockRepository.ts
16:18  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
35:18  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
45:19  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
125:19  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
230:19  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
501:19  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/repositories/PostRepository.ts
38:14  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
45:20  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
46:24  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
47:24  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
69:14  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
77:14  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
92:90  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
563:19  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/services/AuthenticationService.ts
169:17  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/services/LockService.ts
20:21  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
31:17  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
72:17  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
80:18  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
388:65  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
450:53  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
./src/services/VerificationService.ts
15:18  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
23:28  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
60:35  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules

error Command failed with exit code 1.

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
