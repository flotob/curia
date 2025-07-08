Great, I’ll now put together expert-level guidance on your V1 'Smart Feed System' launch, focusing on ranking algorithm implementation, architecture choices, and extensibility—balancing simplicity and future-proofing based on your clarified constraints. I’ll get back to you shortly with detailed recommendations.


# Balanced Feed Ranking for V1: Design & Implementation

## A Solid V1 Algorithm: Log Upvotes + Recency Decay

Your proposed formula is a **sensible starting point** for a feed ranking algorithm. It balances post popularity with freshness in a simple way:

* **Logarithmic vote count:** Using `log(upvotes + 1)` dampens the effect of large vote counts. This is a common technique (Reddit uses a log for votes as well) to prevent runaway “network effect” posts from dominating. Each additional upvote gives a smaller incremental boost, which **prevents ultra-upvoted posts from forever sticking to the top**.
* **Exponential time decay:** The term `exp(- ageInHours / decayRate)` gives a smooth penalty to older posts. Exponential decay is a well-regarded method to gradually decrease influence over time. For example, a decayRate of 24h means a post’s *recency value* halves roughly every 24 hours. This continuous decay is **more nuanced than a hard cutoff window**, and it satisfies a desirable property: if no new votes occur, all posts decay proportionally and their **relative order stays the same over time** (no sudden reordering “jitter” just from time passing).
* **Recency bias weight:** The factor `recencyBias` (0.0–1.0) lets you tune the importance of freshness. A higher value makes new posts rank higher by default, whereas a lower value leans more on upvote count. This **tunable parameter is great for V1** because you can start conservative (e.g. 0.3–0.5) and adjust based on community feedback without changing the core formula.

Overall, **this algorithm is a solid foundation** for a V1 launch. It’s straightforward to implement and reason about, yet flexible enough to adjust. The use of log for votes and exponential decay for time are **reasonable, industry-proven choices** for combining popularity and age.

**Edge-case considerations:** With `log(upvotes+1)`, posts with 0 upvotes get a base score of 0. That means a brand-new post starts with `score ≈ recencyBias * 1` (since `exp(0)=1`). So, a fresh post with zero upvotes will have some non-zero score from recency. This is actually desirable: it gives new submissions a fighting chance to appear in the feed briefly. However, if `recencyBias` is very high (close to 1.0), **brand-new no-vote posts could overshadow older content too much**. You might start with a moderate bias (say 0.5) so that new posts appear near the top for a while but won’t outrank significantly upvoted content unless they earn votes. Also note that extremely high-upvote posts (e.g. a post with 500 upvotes vs one with 50) will still rank higher, but the log term ensures the difference isn’t 10× — it’s `log(501) ≈ 6.2` vs `log(51) ≈ 3.93`. In combination with decay, a slightly older post with enormous upvotes can still hold a top spot, but **truly “stale” viral posts will eventually be overtaken by newer content** that’s accumulating votes (solving the “Katamari ball” effect of perpetual viral posts). Overall, the log+decay formula should perform well for a mid-stage community feed.

## Alternatives & Trade-offs: Reddit Hot, Hacker News, Wilson Score

It’s wise to consider known ranking formulas, but each comes with trade-offs. Here’s how they compare and why your current plan is reasonable for V1:

* **Hacker News algorithm (gravity-based):** HN famously ranks by roughly `score = upvotes / (age_in_hours + 2)^1.8`. This is conceptually similar to your approach: it divides points by a **power of age** to push down older posts. It’s simple and can even be done in a single SQL query. However, an algorithm that explicitly uses current age (like HN’s) **requires continual recalculation** as time passes. If you implemented HN’s formula naïvely, you’d have to recompute scores for all posts or at query-time on each request. This can be inefficient at scale. Also, HN’s approach might penalize posts based solely on post age, which can be unfair if a good post was submitted during a slow period (it might decay before it ever had a chance to get votes). In short, HN’s method is effective but would introduce more complexity (continuous updates or on-the-fly computation) for your feed. Your log+exp formula achieves a similar decay effect and is **more easily tweakable** via `recencyBias` and `decayRate` rather than a hard-coded power.

* **Reddit “hot” algorithm:** Reddit’s hot ranking formula is another well-proven approach. Simplified, it’s something like: `Score = log10(upvotes - downvotes) + (timestamp - epoch) / 45000`. In essence, Reddit adds a time component (based on post creation time) to a log vote score. One result of their constants is that **a post needs about 10× more votes to stay ranked above another post that is 12.5 hours newer**. The clever aspect is that Reddit doesn’t use current age – it uses a static reference (creation timestamp), so the score is **fixed at submission/upvote time**. This means they only update the score when votes change, not continuously over time. The advantage is huge for performance: you can store the score and index it, and items naturally fall as newer items get higher base timestamps. However, there are trade-offs:

  * Reddit’s formula is more complex (with magic numbers and needing a reference epoch). It’s less intuitive to tune than a `recencyBias` parameter.
  * It relies on net votes (upvotes minus downvotes) and a **sign**, which may not directly apply if your app only has upvotes (no downvotes).
  * More importantly, using static post time as a factor can **disadvantage posts made during slow periods**. As one analysis noted, if a post is created at night when users are inactive, it starts “older” and needs significantly more votes in the morning to catch up with a newer morning post. In other words, Reddit’s method can inadvertently favor timing over quality in some cases.
  * Given your community and V1 needs, implementing Reddit’s exact algorithm might be overkill. Your current formula already captures the spirit (log votes + time decay) in a simpler way.

* **Wilson score (lower confidence bound):** The Wilson score interval is a technique to rank items by **confidence in their upvote ratio**. It’s great for sorting by quality when you have up/down votes or star ratings. For example, Reddit and Yelp have used Wilson score to surface content with a high proportion of upvotes in a statistically sound way. However, **Wilson score does not account for time/freshness** – it’s time-agnostic. It’s most useful for a “best posts” or review ranking where you want the **highest-quality content regardless of age**. In a feed context, Wilson score isn’t ideal for *trending* content because a year-old post with 100% upvotes would always beat a new post with 95% upvotes, even if the new one is highly relevant now. Unless you have downvotes and want to sort by pure quality, Wilson score is not a direct fit for the main feed (though it could be an interesting secondary sort option for e.g. “Top posts of all time” or something).

**Bottom line:** Your log+decay formula is in the same family as Hacker News and Reddit “hot” algorithms – all are trying to balance score with age. It should serve well for V1. The alternatives each have merits:

* HN’s approach is simple but would require on-the-fly calculation or background updates.
* Reddit’s approach is performant and avoids continuous updates, but introduces complexity and potential timing bias.
* Wilson score is great for quality ranking with downvotes, but doesn’t solve the freshness aspect for a feed.

For a mid-stage app looking to improve feed relevance quickly, **stick with your proposal**. It’s easy to implement now and you can always evolve towards more complex algorithms (even switching to Reddit’s or others) once you have infrastructure (like background jobs) and more data on how the community behaves.

## Computing & Storing `feed_score` Without a Job Queue

One of the biggest implementation questions is **when and where to calculate the `feed_score`**, especially since you don’t yet have background jobs or cron tasks. There are a few strategies, each with pros and cons:

* **Compute on the fly at query time:** The simplest approach for V1 is to calculate the score in the SQL query that fetches posts for the feed. For example, you could write a query (or use an ORM scope) that does:

  ```sql
  SELECT 
    p.*, 
    LOG(LEAST(p.upvotes, 1e6) + 1)  -- log(upvotes+1) part (capped to avoid overflow)
    + :recencyBias * EXP(- EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0 / :decayRate)
    AS feed_score
  FROM posts p
  ORDER BY feed_score DESC
  LIMIT 20;
  ```

  *(Using natural log LN() or LOG10 is fine – base doesn’t matter as long as it’s consistent. Above we cap upvotes to avoid any floating overflow in extreme cases.)*

  This approach requires **no additional storage** and ensures the score is always up-to-date with the current time. It’s exactly how the HN algorithm can be implemented in SQL. The downside is performance: calculating `log()` and `exp()` on the fly for many posts can be slow without indexes, and the database can’t use a normal index on the computed value (since it depends on `NOW()`). If your post table is modest (say, a few thousand rows) this is likely fine. But as data grows, **query-time computation will strain the DB** and could become a bottleneck.

* **Store `feed_score` in the database (denormalized):** Since you mentioned adding a `feed_score` column, the idea is to **compute the score when data changes, not on every read**. In V1 (with no background worker), the events that change a post’s score are basically new votes (which change upvote count) or new posts (initial score). You can update the `feed_score` at those times:

  * On a new post insert, set its `feed_score = log(1) + recencyBias * 1` (since upvotes will be 0 and age=0). Essentially `feed_score = 0 + recencyBias`.
  * On an upvote (or any vote change), recalculate that post’s score using the formula and update the column.

  This can be done in application code or via a Postgres trigger/stored function. For example, your voting API call can execute an UPDATE like:

  ```sql
  UPDATE posts
  SET upvotes = upvotes + 1,
      feed_score = LN(upvotes + 1) 
                   + :recencyBias * EXP(- EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0 / :decayRate)
  WHERE id = $postId;
  ```

  Each post’s score will be **recomputed at the moment of a new upvote**. This means the “age” used in the formula is the age at the last vote. Effectively, a post that hasn’t received any votes in a while will *stop decaying* in stored score. (Its score in the DB still includes the recency from the last update.) Interestingly, this matches the property that *ranking only changes in response to votes, not mere passage of time*. If post A and B get no new votes, their relative order stays the same – which can avoid jitter. The trade-off is that a once-hot post might linger with a somewhat inflated score if it hasn’t been recalculated recently. In practice, that’s usually okay: truly “stale” posts likely have been surpassed by others that continued getting votes. And if not, you’ll eventually introduce background re-scoring to continuously decay scores. For V1, this on-write approach is **pragmatic and performant**:

  * You can **index the `feed_score` column** for fast sorting (and even a compound index like `(feed_score DESC, id DESC)` for pagination as we’ll discuss).
  * Calculations happen infrequently (only on new posts or votes), so load is low. Post creation and vote handling are already events you’re processing, so the extra math is negligible overhead.
  * You avoid doing heavy math in every feed query. Selecting precomputed scores is cheap.

  One thing to watch out for: if `recencyBias` or `decayRate` settings change, you’ll need to **recompute all stored scores** (one-time migration or script) to apply the new formula uniformly. That’s manageable if it’s rare. During V1, you might hard-code or keep these settings constant; later, when you allow tuning, plan a way to recalc en masse (SQL update or backfill job).

* **Periodic background job recomputation:** Without a dedicated job queue system, this is harder in V1, but you could simulate it if needed. For example, you could write a script or use a tool (like a cron, or even a scheduled serverless function call) to periodically update `feed_score` for aging posts. For instance, a daily job could run:

  ```sql
  UPDATE posts
  SET feed_score = LN(upvotes + 1) 
                   + :recencyBias * EXP(- EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0 / :decayRate);
  ```

  This would refresh all scores based on current age. However, doing this for all posts frequently could be expensive. A smarter approach is to target older posts or those whose scores are likely to change more rapidly. In most cases, **you can defer this complexity** until you have a proper job system. Many successful platforms (Reddit, HN) *don’t continuously decay scores in real-time*; they update when new votes come, which is what the on-write strategy gives you.

**Recommended approach for V1:** Given your constraints, **compute and store `feed_score` at write-time (on new post or vote)**. This aligns with Reddit’s approach where score = f(votes, time) is updated on votes and stored. It provides stable ordering unless new interactions occur, and it’s efficient. In code, ensure whenever an upvote is processed, you also update the post’s `feed_score` column in the same transaction. Likewise, set an initial score on post creation. This way, your feed queries simply do `ORDER BY feed_score DESC`.

If you find that old posts aren’t dropping as expected (because they retained a high score from past activity), you can do a *lightweight manual recalibration* by running a one-off SQL update for older content occasionally. But to keep V1 simple, it’s fine to launch without a scheduled decay job. Monitor the results; if you notice anomalies (e.g., a week-old post with no new votes still hanging high), you can address it by either tweaking `recencyBias` or running an admin script to nudge scores down.

**Tip:** Using a stored `feed_score` opens up the possibility of a **functional index** or materialized view later if needed. For example, once you have background jobs, you might periodically recompute scores for top N posts or use a materialized view to always have the top feed pre-sorted. For now, a normal b-tree index on the `feed_score` column will help with sorting performance.

## API Endpoint & Pagination Strategy

You will need to adjust how the feed data is fetched and paginated once `feed_score` is in play:

* **Use `feed_score` for sorting:** The simplest approach is to modify your existing `/api/posts` (or whatever API returns the feed) to sort by `feed_score DESC` instead of the old `upvotes DESC, created_at DESC`. This ensures the backend is returning posts in the new ranked order. If the feed is global, this is straightforward. If your API supports listing posts by community/board, include that in the ORDER BY as appropriate (e.g., `ORDER BY feed_score DESC` *within* a board filter).

* **Implement keyset pagination for stability:** Since the feed is no longer strictly chronological, cursor-based pagination must be handled carefully. You likely used a `(created_at, postId)` cursor before; now you’ll want to paginate by `(feed_score, postId)` (or a similar composite). A good pattern is to use the last item of the previous page as a cursor. For example, if the last post on page 1 has `feed_score = S` and `id = X`, the next page query can use **keyset conditions**:

  ```sql
  SELECT * FROM posts
  WHERE feed_score < :lastScore
     OR (feed_score = :lastScore AND id < :lastPostId)
  ORDER BY feed_score DESC, id DESC
  LIMIT :pageSize;
  ```

  This ensures the next page starts below the last seen item. By including the `id` tiebreaker, you handle cases where multiple posts have the exact same score (rare but possible, especially if many have 0 votes and similar ages). You’ll need to propagate `lastScore` and `lastPostId` in your API responses so the client can request the next page. One convenient way is to encode them together (e.g., base64 encode `"S:X"` as a single cursor string). Alternatively, use a stable opaque cursor if you have an ORM that supports it.

* **Separate `/api/feed` vs reuse `/api/posts`:** This depends on your app architecture:

  * If `/api/posts` is currently used in multiple contexts (some that expect chronological order, etc.), you might not want to change its behavior globally. In that case, creating a dedicated `/api/feed` endpoint for the ranked feed is safer. It could internally call the same database but apply the `ORDER BY feed_score` and use the new cursor logic. This also allows you to leave any “latest posts” or other lists unaffected.
  * If the intention is that the main use of `/api/posts` **is** the feed and you want to universally improve its sort, then you can modify it in place. Just be sure to update the frontend to handle the new cursor. Since the old cursor was based on time or ID, you’ll likely need to reset pagination or translate the cursor for existing users (e.g., when deploying, users might need to refresh their feed).

For V1, it’s common to **repurpose the existing listing endpoint** to avoid extra complexity – just document that it’s now sorted by relevance. If you ever need both chronological and ranked feeds, you could introduce a query param like `?sort=top` vs `?sort=new` to the same endpoint, or split endpoints. But that can be deferred until there’s a product need.

One more thing: if you *don’t* store `feed_score` (and instead compute on the fly per request), keyset pagination becomes trickier because the scores continuously change. It’s another reason to favor storing it. With stored scores, the ordering is consistent during pagination (it only changes when a vote comes in, at which point the client will eventually see that on a refresh anyway). If you were to compute on each page, a post that was last on page 1 could theoretically end up first on page 2 if time decayed it just enough — messy! So, to keep pagination consistent and avoid gaps/dupes, go with a stored score and keyset as above for V1.

## Reducing Initial Complexity: What to Defer

Launching a new ranking system can get complicated fast, so it’s wise to **trim non-essentials for the first version**. Here’s what you can defer to keep things simple:

* **Board/community-specific tuning:** Although you envision per-board `recencyBias` in the future, implementing that now means extra schema (storing a setting per community), UI to manage it, and logic to apply different formulas depending on context. For V1, **use a single global `recencyBias` (and decayRate)** for all content. You can store it in a small `settings` table or even an environment variable. This global setting will likely work fine as a default. Later, if some communities need different behavior, you can add a column to your Boards table or a separate config table and override the value per board. That extension will be straightforward once the core system is in place.

* **Admin UI for algorithm settings:** It’s nice to have a panel to tweak `recencyBias` or decayRate, but you don’t need that on day one. Choose sensible defaults (e.g., recencyBias = 0.5, decayRate = 24h) and launch. If you need to adjust, a developer can change a config value or run a simple SQL update. Fine-tuning via a UI can come after you see how the feed performs in the wild.

* **Background score recomputation:** As discussed, you can defer setting up a full job scheduler or cron in V1. The on-demand recompute strategy (on votes) plus maybe occasional manual maintenance is enough. Once the system is proven, you might introduce a background worker (perhaps using something like BullMQ, a lightweight cron job, or a managed service) to continuously decay scores or handle more complex metrics. Until then, keep it simple.

* **Materialized views or external search engine:** These are often used for complex feed ranking at scale, but they add ops overhead. Materialized views could offload computation but come with refresh complexity. An external system (like Elasticsearch or a recommendation service) is overkill for V1. **Defer these** unless you hit performance wall that simple indexes can’t handle.

* **Additional ranking signals:** You already plan to incorporate things like comment velocity or user reputation down the line. Don’t add them yet. Each new signal means more data tracking and possibly new tables or updates. They also complicate validation of the algorithm (harder to tell which factor caused what ranking). Launch with just upvotes and age. This will already be a big improvement over pure chronological or pure upvote sorting, and it gives you a clean baseline to evaluate. You can start logging data to analyze later (e.g., maybe log post views or comment counts for potential future use), but **no need to include them in the score until you’re ready**.

* **Edge-case polish:** Some things that can be deferred until after launch:

  * Perfecting the exact formula constants (gravity/exponents/etc.): get in the ballpark and iterate later.
  * Handling of downvotes (if your app has them) in the formula: if downvotes exist, you might eventually treat them as negative weight or use a Wilson score for quality. If downvoting is rare or not implemented, skip for now.
  * **UI labeling**: Perhaps show a subtle sort indicator (“Top posts” vs “New”) if needed, but you can even roll it out silently and see if users notice the feed is smarter.

Focus on delivering a feed that **simply works and is faster/better than before**. The critical pieces for usability are:

* The feed returns a reasonable mix of fresh and popular posts (which your formula provides).
* Performance is acceptable (hence using the stored score and index).
* Pagination is smooth (keyset done right).
* No obvious “stuck” posts at the top for too long (tune `recencyBias` as needed).

Everything else (fine-tuning, admin controls, more signals) can be layered on once the core is proven.

## Future-Proofing: Designing for More Signals & Flexibility

Although we want to keep V1 simple, it’s smart to lay groundwork for future enhancements:

* **Flexible score computation logic:** Encapsulate the ranking formula in one place in your codebase. For instance, if you have a serverless function or API route for fetching posts, implement the score calculation either as a database function or a clearly defined code function. This makes it easier to modify the formula later or even A/B test changes. You might have something like:

  ```js
  function computeFeedScore(post, settings) {
    const base = Math.log(post.upvotes + 1);
    const ageHours = (Date.now() - new Date(post.created_at)) / 3600000;
    const recency = settings.recencyBias * Math.exp(- ageHours / settings.decayRate);
    return base + recency;
  }
  ```

  If using raw SQL updates, keep the formula consistent in one SQL snippet (maybe via a Postgres function or at least a well-tested query fragment). The key is to avoid scattering magic numbers throughout the code. Future signals (comments, etc.) can be added to this function easily.

* **DB schema for new signals:** Plan to store or access additional metrics efficiently:

  * *Comments:* If you want to use comment count or velocity, consider maintaining a `comments_count` on the post (updated via trigger or in code when new comments happen). For “velocity” (comments in last N hours), you might later introduce a small table or materialized view that tracks recent comment counts. But initially, just having total comments ready avoids a join each query.
  * *User reputation:* If posts will be weighted by author reputation, have a field in the users table for reputation score that you can join on. Since that changes slowly, it’s fine to join for each feed query or update. Alternatively, you could denormalize a snapshot of author rep into the post’s score at vote time (but that gets complex to keep updated if rep changes).
  * *Other reactions or signals:* Keep an eye on any other engagement metrics your app has (views, shares, etc.). If they become relevant, you might store a rolling average or score for them that can feed into the algorithm. The schema should remain fairly normalized (e.g., don’t create a giant “score components” table; just augment the posts table or related tables with what you need).

* **Configuration settings:** Introduce a simple configuration mechanism for the ranking parameters. For example, a table `site_settings` with columns like `recency_bias` and `decay_rate` (and perhaps a primary key or single row, since it’s global). In the future, if you do board-specific overrides, you can create a `board_settings` table with columns (board\_id, recency\_bias, decay\_rate) that default to null = use global. Designing it this way means when you want to enable per-board tuning, you can do so without refactoring the whole system – just a JOIN on that table when computing scores or a slight code change to pick the specific setting. Until then, one row in `site_settings` can hold the global defaults.

* **Ease of extension:** The ranking formula should be easy to extend mathematically. Typically, these algorithms become a linear combination of features (votes, age, comments, etc.). For example, you might later use:
  `score = log(upvotes+1) + w1*log(comments+1) + w2*log(views+1) + recencyBias * exp(-age/decay)`.
  When that time comes, try to **keep the formula additive** and each component normalized to a reasonable scale. (Logarithms are handy for large counts; rates or percentages can be used for ratios.) Additive models are easier to tweak than multiplicative ones. Your current design is already additive (vote term + time term), so continuing that pattern is natural.

* **Event-driven updates:** Right now, you’ll update scores in the same request that a vote happens. In the future, with more signals, not all can be updated in real-time (for example, a comment being added might or might not instantly change the post rank significantly). Prepare to eventually move score updates to a background process or use an event queue:

  * When something significant happens (new vote, a post gets X comments in an hour, etc.), you could enqueue a job to recalc that post’s score (or many posts’ scores).
  * Design your system so that *if* a background worker is introduced, you can funnel all score calculations through it easily. This might mean having a service layer function like `recalculatePostScore(postId)` that is called by both the real-time path (in V1) and could later be triggered by a job.
  * By decoupling the calculation logic (as mentioned above) and calling it from one place, you can later replace the implementation (e.g., call a job queue instead of doing it inline) with minimal disruption.

* **Indexing and query patterns:** As you add more signals, your queries might become more complex (more joins or computed columns). Keep an eye on database performance. Some patterns that help:

  * If you filter by board, have composite indexes like `(board_id, feed_score DESC)` to quickly fetch top posts per board.
  * If you add user reputation by joining users, ensure that’s indexed (but since it’s one-to-one, it’s fine).
  * Test the feed query with EXPLAIN to ensure it’s using indexes. If you do stick with computing on the fly in SQL for a while, consider **partial indexes** or materialized views in the future. For example, a materialized view of the top 100 posts updated every 10 minutes could reduce load if necessary (but defer until needed).

* **Monitoring and tuning:** Build in some observability for your new feed:

  * Log the `feed_score` values or rank positions of posts occasionally to see if the distribution makes sense.
  * You might even expose an admin-only API or page that lists the top N posts with their components (upvotes, age, score breakdown) – very helpful for debugging why something is ranked where it is.
  * As new signals come, you’ll want to experiment. Feature-flagging new formula components or running A/B tests (serve a percentage of users a slightly different `recencyBias`, for example) could be valuable. That’s beyond V1, but a consideration for later – having the config in DB and score calc in one place will facilitate that.

In summary, **design V1 in a way that adding or adjusting inputs is straightforward**. Your database schema for posts already has upvotes and created\_at; you’ll add `feed_score`. Likely you’ll also maintain `comments_count` and other aggregates on the posts table as needed. This denormalized approach (storing counts and a composite score) is normal in production systems – it’s trading some extra writes for much faster reads. And it sets you up well to incorporate more factors when the time comes.

---

**Conclusion:** Launching an improved feed ranking is a great step for your community app. The proposed algorithm (log upvotes + decaying recency) is a strong choice that balances quality and freshness. It’s simple to implement, yet based on principles used by Reddit and Hacker News. For V1, focus on getting this core logic in place with minimal moving parts: calculate scores during writes, store them, and adjust your feed query & pagination. Avoid premature optimizations or complexities like per-board settings, background jobs, or exotic algorithms until you see real data on how the feed performs. By laying a solid foundation now – with clear code structure and a bit of foresight in the schema – you’ll be in a great position to iterate. Over time, you can experiment with the `recencyBias`, try alternative formulas for specific needs, or add new engagement signals to further improve relevance. But even this V1 should be a **significant improvement over a pure upvote or chronological sort**, and it gives you a platform to build on. Good luck, and happy ranking!

**Sources:**

* Herman, *“A better ranking algorithm”* – Describes Hacker News and Reddit ranking formulas and the rationale for using logarithmic scaling and time decay.
* Jules Jacobs, *“Determining hot items with exponentially decaying likes”* – Explains why exponential decay is useful and how updating scores only on new votes (not continuously) preserves ranking order stability.
* Evan Miller, *“How Not To Sort By Average Rating”* – Discusses the Wilson score confidence interval for ranking by upvote/downvote quality, which is more relevant for “best content” than time-based feeds.
