Starting Container

yarn run v1.22.22

warning package.json: No license field

$ node dist/index.js

[Embedding Worker] Starting service...

[EmbeddingService] Database connection established

[EmbeddingWorker] Connected to PostgreSQL

[EmbeddingWorker] Listening for embedding events

[EmbeddingWorker] Checking for posts needing embeddings...

[EmbeddingWorker] Found 10 posts needing embeddings

[EmbeddingWorker] Processing INSERT for post 57 (normal priority)

[EmbeddingService] Generated embedding: 8 tokens, $0.000000, 1326ms

[EmbeddingService] Successfully stored embedding for post 57 (8 tokens, $0.000000)

[EmbeddingWorker] ✅ Generated embedding for post 57 in 1336ms

[EmbeddingWorker] Processing INSERT for post 56 (normal priority)

[EmbeddingService] Generated embedding: 383 tokens, $0.000008, 415ms

[EmbeddingService] Successfully stored embedding for post 56 (383 tokens, $0.000008)

[EmbeddingWorker] ✅ Generated embedding for post 56 in 423ms

[EmbeddingWorker] Processing INSERT for post 55 (normal priority)

[EmbeddingService] Generated embedding: 5 tokens, $0.000000, 287ms

[EmbeddingService] Successfully stored embedding for post 55 (5 tokens, $0.000000)

[EmbeddingWorker] ✅ Generated embedding for post 55 in 293ms

[EmbeddingWorker] Processing INSERT for post 54 (normal priority)

[EmbeddingService] Generated embedding: 303 tokens, $0.000006, 796ms

[EmbeddingService] Successfully stored embedding for post 54 (303 tokens, $0.000006)

[EmbeddingWorker] ✅ Generated embedding for post 54 in 805ms

[EmbeddingWorker] Processing INSERT for post 53 (normal priority)

[EmbeddingService] Generated embedding: 303 tokens, $0.000006, 317ms

[EmbeddingService] Successfully stored embedding for post 53 (303 tokens, $0.000006)

[EmbeddingWorker] ✅ Generated embedding for post 53 in 326ms

[EmbeddingWorker] Processing INSERT for post 52 (normal priority)

[EmbeddingService] Generated embedding: 75 tokens, $0.000002, 467ms

[EmbeddingService] Successfully stored embedding for post 52 (75 tokens, $0.000002)

[EmbeddingWorker] ✅ Generated embedding for post 52 in 474ms

[EmbeddingWorker] Processing INSERT for post 51 (normal priority)

[EmbeddingService] Generated embedding: 143 tokens, $0.000003, 417ms

[EmbeddingService] Successfully stored embedding for post 51 (143 tokens, $0.000003)

[EmbeddingWorker] ✅ Generated embedding for post 51 in 423ms

[EmbeddingWorker] Processing INSERT for post 49 (normal priority)

[EmbeddingService] Generated embedding: 26 tokens, $0.000001, 1725ms

[EmbeddingService] Successfully stored embedding for post 49 (26 tokens, $0.000001)

[EmbeddingWorker] ✅ Generated embedding for post 49 in 1731ms

[EmbeddingWorker] Processing INSERT for post 48 (normal priority)

[EmbeddingService] Generated embedding: 173 tokens, $0.000003, 291ms

[EmbeddingService] Successfully stored embedding for post 48 (173 tokens, $0.000003)

[EmbeddingWorker] ✅ Generated embedding for post 48 in 298ms

[EmbeddingWorker] Processing INSERT for post 47 (normal priority)

[EmbeddingService] Generated embedding: 145 tokens, $0.000003, 477ms

[EmbeddingService] Successfully stored embedding for post 47 (145 tokens, $0.000003)

[EmbeddingWorker] ✅ Generated embedding for post 47 in 485ms

[EmbeddingWorker] Service started successfully

[Embedding Worker] Service started successfully

[Health Server] Health checks available on port 3001

[Health Server] - Liveness:  http://localhost:3001/health

[Health Server] - Readiness: http://localhost:3001/ready

[Health Server] - Metrics:   http://localhost:3001/metrics

2025-07-08 19:21:44.639 UTC [23] LOG:  checkpoint starting: time

2025-07-08 19:21:49.853 UTC [23] LOG:  checkpoint complete: wrote 53 buffers (0.3%); 0 WAL file(s) added, 0 removed, 0 recycled; write=5.211 s, sync=0.002 s, total=5.215 s; sync files=17, longest=0.001 s, average=0.001 s; distance=276 kB, estimate=820 kB; lsn=0/153C1590, redo lsn=0/153C1558