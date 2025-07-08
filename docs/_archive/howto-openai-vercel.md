Perfect. I’ll prepare detailed guidance for your Cursor AI agent on implementing a Vercel AI SDK–powered assistant chat in your Next.js Curia forum app.

This will include:

* How to ingest and embed community posts as vector data to create a "hivemind" context layer via OpenAI embedding APIs.
* The use of the Vercel AI SDK (`useChat`, `streamText`) to power a chat assistant with streaming and function calling support.
* Best practices for OpenAI function calls, including multi-step tool chaining.
* Review and improvement suggestions for your existing database schema to support advanced AI interactions.
* Any additional setup steps needed for API keys, OpenAI API features, or Vercel integrations.

I’ll get started and update you shortly.


# Integrating AI Assistant with OpenAI & Vercel SDK in Curia

## Overview

We will integrate OpenAI’s GPT models (via the Vercel AI SDK) into the Curia Next.js app to provide two key AI features:

1. **Community “Hive Mind” Assistant** – an AI chatbot that answers user questions by leveraging the community’s existing forum posts (as if the community’s collective knowledge is speaking). This uses **retrieval-augmented generation (RAG)**: we embed forum posts as vectors and let the AI retrieve relevant content to include in its answers.

2. **AI Proofreading Assistant** – an AI helper that assists users in drafting and improving posts/comments in real-time. It will check grammar/style, enforce community rules, suggest improvements, and even provide an interactive diff of changes. This uses OpenAI’s new **function calling** capability (supported by the Vercel AI SDK) to analyze content and generate improvements in a structured way.

We’ll implement these on top of a streaming chat foundation using the Vercel AI SDK’s `useChat` hook and backend utilities. Below, we outline how to set up the streaming chat, the vector search for the community assistant, the function-calling workflow for proofreading, and any necessary database/schema adjustments.

## Setting Up Vercel AI SDK for Streaming Chat and Tools

**Vercel AI SDK Integration:** The Vercel AI SDK (the `ai` and `@ai-sdk/openai` packages) simplifies streaming OpenAI responses to the frontend. On the client, we’ll use the `useChat` hook (from `@ai-sdk/react`) to manage the chat state and stream tokens as they arrive. On the server (Next.js API route or Edge function), we’ll use the `streamText` helper to send user messages to OpenAI and stream back the reply. This SDK handles the heavy lifting of maintaining the event stream and even integrates with OpenAI’s function calling (“tools”) interface.

* **API Route:** Create a Next.js API route (e.g. `POST /api/ai/chat`) that will handle chat requests. In this route, call `streamText` from the `ai` package. For example:

  ```ts
  // app/api/ai/chat/route.ts (Next.js App Router style)
  import { openai } from '@ai-sdk/openai';
  import { streamText } from 'ai';
  import { z } from 'zod';

  export async function POST(req: Request) {
    const { messages } = await req.json();
    const responseStream = streamText({
      model: openai('gpt-4'),  // or 'gpt-3.5-turbo' etc, configured via ai-sdk
      messages,
      tools: { /* we will define tools (functions) here for function calling */ },
      // ... (other options like temperature, maxTokens if needed)
    });
    return responseStream.toDataStreamResponse();  // Next.js will stream this response
  }
  ```

  In the above, `messages` is the conversation history (an array of `{role, content}` objects, possibly with function call parts). The `openai('gpt-4')` is configured via the `@ai-sdk/openai` provider. We’ll inject our function definitions into the `tools` field (more on that below).

* **Streaming to the UI:** On the client side, use `useChat` to send user input to this API route and receive streaming responses. For example:

  ```tsx
  import { useChat } from '@ai-sdk/react';

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/ai/chat',        // the API route to POST to
    maxSteps: 3,                // allow multi-step tool calls (more below)
    onToolCall: async ({ toolCall }) => {
      // handle any client-side tools if we define them (e.g., user confirmation tools)
      // (for our use cases, likely not needed or handled server-side)
    }
  });
  ```

  Here, `maxSteps: 3` is important – it allows the model to make multiple function/tool calls in a single conversation turn. By default, the SDK only allows one step; increasing `maxSteps` lets the assistant call a tool, get a result, and continue reasoning (which we need for the proofreading chain). OpenAI tool calls (function calls) will be forwarded and executed, then the results fed back to the model, potentially triggering another call or a final answer. In our case, we expect up to two function calls (analysis then improvement) before the final assistant message, so setting `maxSteps` to 3–5 is sufficient.

* **Defining Functions (Tools):** The Vercel SDK allows defining server-side “tools” that the model can call (which correspond to OpenAI function calling). We will define our custom functions `analyze_content` and `generate_improvements` in the `tools` object passed to `streamText`. Each tool is defined with a name, a description, input parameters schema (using Zod for structure), and an `execute` function that runs on the server to produce the result. For example:

  ```ts
  tools: {
    analyze_content: {
      description: "Analyze a post or comment for grammar, style, and rule compliance",
      parameters: z.object({
        content: z.string(),
        context: z.object({
          board_rules: z.array(z.string()).optional(),
          post_type: z.enum(['post','comment']),
          community_guidelines: z.string().optional()
        })
      }),
      execute: async ({ content, context }) => {
        // Server-side logic to analyze `content`...
        // (In practice, we might call OpenAI or some library, 
        // but here the model itself will generate this via function calling, 
        // so execute might simply validate inputs or stub if needed.)
        return /* analysis result object matching the specified return schema */;
      }
    },
    generate_improvements: {
      description: "Generate diff of improvements for a piece of content given specific suggestions",
      parameters: z.object({
        original_content: z.string(),
        improvements: z.array(z.object({
          type: z.enum(['grammar','style','rule_compliance','clarity']),
          description: z.string(),
          original_text: z.string(),
          suggested_text: z.string(),
          line_start: z.number(),
          char_start: z.number(),
          char_end: z.number(),
          confidence: z.number(),
          reasoning: z.string()
        }))
      }),
      execute: async ({ original_content, improvements }) => {
        // Server-side logic to create a unified diff or structured diff data...
        return /* diff_data object matching return schema */;
      }
    },
    // (We can add a searchPosts tool here for the community assistant, discussed later)
  }
  ```

  In our case, the **OpenAI model will actually decide when to call** these functions and will generate the content of the results – so our `execute` might not need to do heavy computation. For example, we might not implement complex logic in `execute` for `analyze_content` because we want GPT-4 itself to analyze the text. One approach is to let the model *simulate* the function result: e.g., the model calls `analyze_content`, the SDK’s `execute` function could simply take the input and perhaps run a quick check or just echo a placeholder. However, a cleaner approach is to have the model *describe the analysis in the function call output*, which the SDK then returns as the function result. In practice, the Vercel SDK will capture the model’s function call arguments as `toolCalls` and execute our `execute` function. We can choose to actually implement analysis logic in `execute` (using an algorithm or another AI call), or we can treat these tools as **“self-reflection” functions** where the model’s function output is essentially its analysis.

  For simplicity, you might initially implement these tools such that the **model itself fills out the return structure** (OpenAI’s function calling allows the model to return JSON that matches the schema), and our `execute` just returns that JSON unmodified. This way, GPT-4 does the heavy lifting of deciding the content of `analysis` and `diff_data`. As we refine, if needed we can add validation or post-processing in `execute`.

* **System Prompts and Guidelines:** We will craft a system prompt to guide the model’s behavior. For example, a system message could say: *“You are an AI assistant for a forum. You can access community posts and have functions to analyze and improve content. Follow community guidelines and only use provided functions for their intended purpose.”* We should list the available functions in the system prompt so the model is aware of them and when to use them (OpenAI often recommends including a brief description of each function in the system prompt). For example:

  > *Available tools:*
  > *- `analyze_content` – for analyzing a draft’s grammar, style, and rule compliance.*
  > *- `generate_improvements` – for creating a diff of suggested improvements.*
  > *Use these tools when a user asks for proofreading or content improvement.*

  Similarly, for the community Q\&A assistant, we might list a `search_posts` tool (if implemented) or explain that it has access to community knowledge via context.

* **OpenAI Model Selection:** We will use GPT-4 for the best results (as `gpt-4` or the appropriate model ID). GPT-4’s larger capacity and better reasoning will handle the complex tasks (like analyzing text and generating diffs) more reliably. If GPT-4 is not available, GPT-3.5-Turbo (with the 0613 version for functions) can be used, but expect the quality of suggestions to be lower. No special OpenAI account permissions are needed beyond an API key with access to these models – function calling and embeddings are part of the standard OpenAI API. Just ensure your API key is valid and has billing enabled (and access to GPT-4 if possible). All requests will use your API key (e.g., put `OPENAI_API_KEY` in your `.env.local` and have the SDK or OpenAI client use it).

* **Token Limits & Streaming:** Because we are streaming, the user gets partial results in real time, which is great for UX. Keep an eye on token limits: GPT-4 has an \~8K token context window (or 32K if you have the extended model), so we must ensure that the conversation history + any retrieved context (for the hive mind) + functions JSON stay within that. We will manage this by retrieving only the top relevant posts and possibly summarizing them (discussed below), and by not letting the conversation history grow unbounded (we can archive or summarize older turns if needed for long sessions). The `ai_usage_logs` table will help track tokens used per call to gauge cost.

## Community “Hive Mind” Assistant with Vector Search

The goal for the **community knowledge chatbot** is to let users ask questions and have the assistant answer using information from all the posts in that community. We achieve this with **embeddings and semantic search**:

* **Embeddings for Posts:** We will represent each post’s content as a vector in a high-dimensional space so that semantically similar content is near each other. OpenAI provides an embedding API (e.g. `text-embedding-ada-002`) that takes text and returns a 1536-dimensional vector. We’ll use this to vectorize all existing posts (and update when new posts are made or edited). Essentially, we create a knowledge base of post embeddings.

* **Storing Vectors:** We need to store these embedding vectors in a database that allows similarity search. The recommended approach is to use PostgreSQL with the **pgvector** extension for efficient vector storage and cosine similarity search. Since our app already uses Postgres, we can add pgvector. This involves running `CREATE EXTENSION pgvector;` on the database and then adding a new table or column for embeddings. For example, we might add a new table `post_embeddings(post_id INT PRIMARY KEY, embedding vector(1536))` or simply add a column to the `posts` table (e.g., `embedding vector(1536)`). A separate table is often cleaner to avoid bloating the main posts table. We’d also add an index: `CREATE INDEX posts_embedding_idx ON post_embeddings USING ivfflat (embedding vector_cosine_ops);` to enable fast nearest-neighbor search by cosine similarity.

* **Creating Embeddings:** We will write a script or use a server action to generate embeddings for all existing posts. We may need to **chunk** very long posts before embedding – embeddings work best on reasonably sized text (a few hundred tokens per chunk). If posts are generally short (a few paragraphs), we can embed the whole content. If some posts are long (say, hundreds of lines), we might break them into chunks (e.g., by paragraphs or sentences) and embed each chunk separately, associating each chunk with the post ID. The Vercel AI SDK provides convenience functions like `embedMany` which can batch embed multiple chunks at once. For each post, we could store multiple chunk vectors if needed; but a simpler approach is to store a single vector for the entire post content (perhaps combined title + body) for now.

* **Querying for Relevant Posts:** When a user asks the community assistant a question, we will **embed the user’s query** using the same embedding model, then perform a vector similarity search in our embeddings table to find the top *n* most relevant posts. This finds posts that are semantically related to the query, even if they don’t share exact keywords. This is the core of retrieval-augmented generation: *the model can answer using information outside its training data by retrieving relevant context at query time.*

* **Providing Context to GPT:** After retrieving, say, the top 3 post contents (or summaries of them), we will provide them to the GPT model as context. There are a couple of ways to do this:

  * **System Message Context:** We can construct a system message that includes the retrieved information. For example: *“You are the collective knowledge of the community. You have access to the following relevant posts from the community archive to help answer the question. Posts:\n1. \[Excerpt from Post A]\n2. \[Excerpt from Post B]\nUse this information to answer the user’s query.”* By putting this in the system role (or as an assistant message before the answer), the model will incorporate these facts into its answer.
  * **Function (Tool) for Search:** Alternatively, we can expose a `search_posts` tool that the model can call when it needs information. For example, define in `tools`:

    ```ts
    search_posts: {
      description: "Find relevant community posts by semantic similarity to a query",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        // embed query and do a vector search in the DB
        const embedding = await openaiEmbed(query);
        const results = await db.searchPostsByEmbedding(embedding, topK=3);
        return { results: results.map(r => ({ id: r.id, content: r.content.slice(0, 200) })) }; 
        // maybe return snippets for brevity
      }
    }
    ```

    If we do this, the model could decide on its own to call `search_posts` with the user’s question, get the results, and then use them to formulate an answer. This is a more dynamic approach. However, it adds complexity: we’d need to ensure the model knows *when* to call the function (which we can hint in the prompt, e.g., “If the user asks about community knowledge, use the `search_posts` tool to find relevant information before answering.”).

  For a **first implementation**, a simpler approach is to perform the search **outside** of the model (in the API route) and always include the top results in the prompt. This guarantees the model sees some relevant data. Later, we can refine by letting the model call the tool if we want more flexibility or iterative searching.

* **Answering as the Community:** However we feed the data, the assistant should answer using it. We’ll instruct the model to **use only the given posts to answer, and not hallucinate**. For example, the system prompt can emphasize: *“Respond using the provided community posts as knowledge. If the answer is not found in those posts, say you don’t know or suggest starting a new discussion.”* This will keep answers grounded in actual community content. In testing, verify that the model cites or at least draws from the provided text.

* **No OpenAI Fine-tune Required:** This approach doesn’t require training a custom model; we’re simply using OpenAI’s API (embeddings + GPT) at runtime. All you need on the OpenAI side is your API key and access to the embedding endpoint (which is available by default). You might want to monitor usage since embedding all posts has a cost (though `text-embedding-ada-002` is fairly inexpensive, about \$0.0001 per thousand tokens). The `ai_usage_logs` table can store these costs – for each chat or search we do, log the tokens and estimated cost in USD.

* **Keeping Embeddings Updated:** We should integrate embedding generation into the app’s workflows:

  * When a new post is created, generate its embedding and insert into the `post_embeddings` table.
  * If a post is edited, consider re-generating the embedding.
  * Optionally, do a one-time backfill for all existing posts (a script that goes through all posts, embeds them, and stores them).
  * This ensures the knowledge base is up-to-date.

* **Limitations & Possible Enhancements:** The main limitation is context size – we can’t feed *all* posts to the model, just the most relevant few. If a user asks a very broad question, the top 3–5 posts might not contain everything, and the model might have to summarize or say it’s uncertain. In future, you could enhance this by:

  * Summarizing each post in a vector store so that the text fed to the model is concise.
  * Allowing follow-up retrieval: e.g., the model could ask for more info or call the search tool again if needed (this is possible with multi-step tool usage).
  * Using a cache of question→answer or leveraging user upvotes to improve the quality of answers.

For now, the above strategy (embeddings + retrieval) will implement the **“community hive mind”** feature effectively.

## AI-Powered Proofreading with OpenAI Function Calling

The second feature is a **proofreading assistant** that helps users refine their posts or comments. The specification breaks this into a sophisticated multi-step process with two core functions (analysis and diff generation) and an interactive UI for applying changes. Here’s how we can implement it:

### Workflow Overview

1. **User Invocation:** The user, while composing a post or comment, clicks a “AI Proofread” button or toggles the proofreading panel. This triggers the creation of a new AI conversation (in `ai_conversations` table) of type “proofreading” (more on schema updates later). We capture the current draft content from the editor.

2. **Initial AI Call (Analysis):** We send the draft content to the AI via our chat endpoint. The system prompt will instruct the assistant to perform proofreading. The assistant will then **call the `analyze_content` function** with the draft text. Since we defined `analyze_content` in the `tools`, the model knows it can use it to get a structured analysis. For example, the model might internally decide: *“I have this content, I should analyze it first”* and produce a function call:

   ```json
   {"function_call": {
      "name": "analyze_content",
      "arguments": {
         "content": "<user draft text here>",
         "context": {
            "board_rules": [...],
            "post_type": "post",
            "community_guidelines": "..."
         }
      }
   }}
   ```

   We need to provide the `board_rules` and `community_guidelines` somewhere. **How to include board rules:** If the community/board has specific rules or guidelines (e.g. “No hate speech”, “Use tags appropriately”), we should fetch those from the database. For instance, if such rules are stored in `boards.settings` JSON or a separate field, we can retrieve them on the server when the request comes in. We could include them in the system prompt or even populate the `context` object for the function call. One approach is to insert them into the system prompt (so the model is aware of them and may put them in the `context` args itself). Alternatively, we could intercept the function call: if the model calls `analyze_content` without the rules, our `execute` function on the server can attach the actual rules from the DB before running. Either way, ensure the model has access to the rules/guidelines text to compare against the content.

   The `execute` of `analyze_content` could theoretically run a separate process (like using a grammar-checking library or another AI call) to analyze, but here we expect GPT-4 to handle it. We might implement `execute` to simply return some placeholder or minor processing, effectively letting the **model’s output** (the arguments it “intended” for the function’s return) serve as the analysis. In practice, when using OpenAI function calling, after the model requests a function, it’s usually up to the developer to actually produce a result. If we trust GPT-4, we can even have it *format the analysis as the function arguments themselves*, but a safer pattern:

   * Have the model call `analyze_content` with just the input content.
   * Our server code for `analyze_content.execute` actually calls OpenAI’s GPT-4 (or some analysis API) behind the scenes to generate the analysis. However, that would be a recursive call to GPT-4 (GPT calling GPT), which is possible but doubles cost and complexity.

   Since GPT-4 is capable of producing a structured analysis, we can try a simpler loop: **give GPT-4 the content and ask it (via prompt instructions) to output the analysis through the function call mechanism**. This way, the analysis comes out as a JSON object per our schema, without us writing the logic. This is one of the benefits of function calling – the model can format its response to fit the schema. We should verify the structure carefully during testing and adjust prompts to get the model to fill all fields (`grammar_issues`, `style_improvements`, etc.).

3. **Function Result (Analysis Data):** The `analyze_content` function returns a JSON object containing lists of grammar issues, style suggestions, any rule violations, an overall quality score, and a recommendation. This structured data will be fed back into the model’s message stream as a `function_result`. In the conversation, this appears (to the model) like the user now has provided the analysis results. The model (still following its internal chain) will then have this data available.

4. **Second AI Call (Generate Improvements):** Next, the assistant/model is expected to call `generate_improvements` using the original content and the list of improvements found. The model now knows the specific issues (from the analysis), so it can request a diff. For example, it might call:

   ```json
   {"function_call": {
      "name": "generate_improvements",
      "arguments": {
         "original_content": "<user draft text>",
         "improvements": [
            {
              "type": "grammar",
              "description": "Fix subject-verb agreement in sentence 2",
              "original_text": "…",
              "suggested_text": "…",
              "line_start": 3,
              "char_start": 15,
              "char_end": 27,
              "confidence": 0.9,
              "reasoning": "Singular subject with plural verb"
            },
            ...
         ]
      }
   }}
   ```

   The details of the improvements list come from the previous analysis. Again, we rely on the model to format this properly. Our `generate_improvements.execute` will take these improvements and compute a diff. This `execute` **can be implemented with a diff library** (like the `diff` npm package or a custom diff algorithm):

   * Take the original\_content and each suggested change, apply the change to get a modified version (or use a diff algorithm to compute differences).
   * Construct a `diff_data` object listing the changes in a structured way (additions, deletions, modifications, with line numbers and maybe a unified diff hunk view). The schema provided in the prompt suggests returning lists of original and suggested lines and an array of change objects with `change_id` and `reasoning`【prompt】.
   * We should also generate unique IDs for each change (for tracking accept/reject).

   However, note that the model itself might be capable of generating a diff if instructed, but it’s safer and more deterministic to do it in code. So likely, we implement `generate_improvements.execute` fully in code using the improvements list:

   * For each improvement, we know the exact substring to replace (`original_text -> suggested_text` at given positions). We can apply them one by one or all at once to get the new content.
   * Use a diff utility to compare the original and new content line by line, to generate the diff representation (side-by-side or unified).
   * Return the `diff_data` object.

   The result is sent back to the model as the function result. At this point, the model has both the analysis and the diff data.

5. **Final AI Response:** After the `generate_improvements` result, the model should produce a final **assistant message** to the user. This message could say something like: *“I have proofread your post. Here are the changes I suggest:”* and perhaps summarize the changes or embed the diff. In practice, since we have a custom interactive diff viewer, we might not need the AI to output the full diff in text form (the UI will present it). We mainly need the structured `diff_data`. The assistant’s final message could be relatively simple, e.g. “I found some issues and made improvements. See the diff below. You can accept or reject each change.” We can format the final assistant message to include a brief summary (maybe using the `analysis.overall_score` or recommendation as a sentence).

   In the streaming response to the frontend, we will include not just plain text but also the *tool invocation parts*. The Vercel SDK `useChat` provides each message in a structured form with `parts`. The `diff_data` returned by `generate_improvements` will be present in the assistant message’s `parts` as a tool result. Our React component can access this and render the diff appropriately (as opposed to just showing raw JSON). **Important:** Ensure that when rendering `messages` on the client, you use `message.parts` as in the Vercel SDK example, so that any `tool-invocation` parts (like our diff result) are accessible in the UI.

6. **Interactive Diff UI:** Now the user sees the assistant’s message and the diff suggestions. We will build a custom React component to display the diff side-by-side or inline:

   * Use a diffing library (for example, `diff` or `diff-match-patch`) to highlight added vs removed text. We can also leverage `react-markdown` and `remark-gfm` if we choose to represent the diff in markdown format (like using ~~strikethrough~~ for deletions, etc.), but a custom diff view might be better.
   * The diff JSON we got contains each change with an ID and the reasoning/confidence. We can map over these changes and render them with accept/reject buttons.
   * Accepting a change will apply that change to the draft content. We can manage state using **Jotai atoms** as planned:

     * e.g. `pending_changes`, `accepted_changes`, `rejected_changes` in a `proofreadingSessionAtom` to track what’s been done.
     * When a user clicks “accept”, we move that change from pending to accepted, and update the `current_content` in the state by actually performing the edit. The diff viewer should then update (that change might disappear from the diff view, or show as accepted).
     * A “reject” would simply remove it from pending (move to rejected) without changing the content.
     * We should also update the displayed diff accordingly (e.g., remove that change’s highlight or mark it as handled).
   * Batch operations: We can have buttons like “Accept all grammar fixes” or “Accept all” which iterate and apply those quickly – this is a UX enhancement.
   * Real-time preview: As changes are applied, the user’s editor content should update. If the user is in a rich text editor, we might programmatically insert/delete text at the specified positions. Since we have exact character indices from the suggestions, this is doable. We just must be careful with indices if multiple changes apply – applying one change can shift the positions for subsequent ones. A robust method is to apply changes from last to first (so earlier indices don’t shift) or recalculate offsets as we go.
   * **Undo/Redo:** We can keep history of accepted changes to allow undo. This is additional complexity but can be done via storing previous content states in the atom or using something like `useReducer` to manage a history stack.
   * **Confidence indicators:** Show a small icon or percentage next to suggestions to indicate confidence. Possibly color-code suggestions (e.g., high confidence in green, lower in amber).
   * **Reasoning tooltips:** For each change, a tooltip or expandable section can display the `reasoning` text explaining *why* the AI suggested that change. This improves transparency and user learning.

7. **Applying Changes to Draft:** The user can iteratively accept/reject suggestions. Ultimately, they have a modified draft ready to post. If they accept some changes, those changes are already reflected in the `current_content` state which should sync with the editor input. We’ll provide a way to finalize the proofreading:

   * If the user is happy, they continue to submit the post/comment as usual (the content is already improved).
   * Alternatively, we might provide a button “Apply all remaining suggestions to post” which applies anything still pending.
   * The `apply-changes` API endpoint (as per spec) could be used if we decide to offload the actual text merging to the server, but given we can do it on the client with our state, it might not be strictly necessary. That endpoint could instead be used for analytics (e.g., recording which suggestions were accepted vs rejected, to measure usefulness).

8. **Conversation Persistence:** We will save the AI conversation and messages to the database for record-keeping and possibly allowing the user to revisit the session. The `ai_conversations` table will get a new entry for this proofread session (with `user_id`, `community_id`, type, etc), and `ai_messages` will store each turn:

   * The initial user message could be something like “Proofread my content” (or even just the content itself as the user message, if we treat the content as the user’s prompt).
   * Then a system or assistant message representing the function calls and results (the SDK might store function call outputs in the `tool_calls`/`tool_results` JSONB fields of `ai_messages`).
   * Finally the assistant’s conclusion message.
     We should mark the conversation’s `status` as completed once done (so it’s not active in history if we only want active chats persisted).

9. **Post-Processing & Logging:** Each AI call will be logged in `ai_usage_logs` with token counts and cost. The Vercel SDK’s `streamText` returns usage info at the end (or the OpenAI client does). We can hook into that after the stream completes and insert a record:

   * `conversation_id`, `message_id` (the assistant’s final message id), `user_id`, `community_id`, `model` (e.g., `gpt-4`), `prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost_usd`, `tool_calls_count` (the SDK can tell how many tool calls were used), `success`/`error`.
     This will fulfill the logging design and help with analytics (e.g., average tokens per proofread).

### Schema Adjustments and Validation

Our existing database schema is largely suitable, but a few tweaks are needed:

* **Conversation Types:** Currently, `ai_conversations.conversation_type` is restricted to `'admin_assistant'` or `'onboarding_quiz'`. We should extend this to include new types, such as `'proofreading'` and perhaps `'community_assistant'` (for the hive-mind chat). This can be done by altering the CHECK constraint or using an enum type. For example:

  ```sql
  ALTER TABLE ai_conversations 
    DROP CONSTRAINT ai_conversations_conversation_type_check;
  ALTER TABLE ai_conversations
    ADD CONSTRAINT ai_conversations_conversation_type_check 
      CHECK (conversation_type = ANY (ARRAY['admin_assistant','onboarding_quiz','proofreading','community_assistant']));
  ```

  This will allow categorizing conversations. Alternatively, remove the constraint for flexibility or convert to an ENUM that we alter.

* **Storing Draft Content:** We might want to store the actual text that was proofread for record or debugging. Currently, we don’t have a direct field for “context content” in `ai_conversations`. We do have `context_id` in the older design (from the archive docs) which isn’t in the final schema. We can simply store the draft content as the first user message in `ai_messages` (content field). That way, it’s saved. Additionally, we could put a copy in `ai_conversations.metadata` JSONB if needed for quick reference. It’s not strictly necessary, but could be useful for analytics (like comparing original vs final quality).

* **Board Rules and Guidelines:** Ensure we have a place to get the rules/guidelines per community or board. Likely, we will use `boards.settings` or `communities.settings` JSON to store a list of rules or a guidelines text. If it’s not already there, we can add it (for example, a key `"rules": ["No spam", "Be respectful"]` in the board’s settings JSON). The AI functions will use this. This doesn’t require a schema migration if using the JSON field.

* **Embeddings Table:** As discussed, add a table or column for post embeddings (if we go the vector route). For instance:

  ```sql
  CREATE TABLE post_embeddings (
    post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    embedding VECTOR(1536) NOT NULL
  );
  CREATE INDEX post_embeddings_idx ON post_embeddings USING ivfflat (embedding vector_cosine_ops);
  ```

  This assumes pgvector is enabled. Alternatively, if using another vector store, this table may differ (or not exist if external).

### Additional Best Practices and Considerations

* **Prompt Engineering:** We’ll need to refine the system and user prompts to ensure the model knows how to behave. For proofreading, stress that it *must* use the functions and not just reply with raw text. For example: *“When the user requests proofreading, first call `analyze_content`. Do not directly tell the user the issues; instead, return analysis via the function. Then call `generate_improvements` to produce a diff. Finally, present the suggestions once all function results are obtained.”* By clearly instructing the model, we increase the reliability of it following the function call workflow. We should also instruct it not to hallucinate rules that weren’t given, etc., and to be polite and helpful.

* **Testing the Chain:** The multi-step chain (analysis → improvements → final) is complex, so test with various sample texts. You might find the model sometimes tries to skip a step or the function outputs need formatting tweaks. Use tools like the OpenAI Playground or console to simulate function calls. The Vercel AI SDK’s `maxSteps` mechanism will handle looping the calls automatically as long as the model follows the expected pattern (call function → get result → possibly call another → then answer). If something goes wrong (e.g., the model outputs an answer without calling both functions), we may need to adjust the prompt or in worst case manually enforce the sequence (but ideally the model should handle it).

* **Security & Moderation:** The proofreading assistant should also enforce community guidelines. The `analyze_content` function’s output includes `rule_violations` with severity. We will ensure the model populates that if any board rules are broken. If severe violations are found, the system could prevent the user from posting until fixed (depending on community policies). We should also consider using OpenAI’s content moderation API on the user’s content or the AI’s suggestions to filter out disallowed content. For example, before sending the user’s draft to GPT, run it through the moderation endpoint to catch extreme cases (hate, self-harm, etc.), and handle accordingly (maybe warn the user or refuse to continue proofreading such content). This wasn’t explicitly asked, but it’s a good safety measure in a community forum context.

* **Rate Limiting & Cost Control:** Using these AI features incurs cost (especially GPT-4). We have the `ai_usage_logs` to track usage per user and community. We should implement checks like:

  * Only allow a certain number of proofreads or Q\&A calls per user per day (to prevent abuse).
  * Potentially limit the length of content that can be proofread in one go (long novels would cost a lot).
  * Since we log `total_tokens` and `estimated_cost_usd`, we could accumulate those and set monthly quotas. This can be done via simple queries on `ai_usage_logs` (e.g., sum tokens where user\_id = X and created\_at > start\_of\_month).
  * For now, manual monitoring is okay, but building automated limits is advisable as a next step.

* **Performance:** The embedding search is very fast with a proper index, but generating embeddings for each new post adds a bit of overhead on post creation. This can be done asynchronously (e.g., via a background job or a Next.js API route called after post creation). Proofreading calls are real-time and can take a couple of seconds (GPT-4 is a bit slower). Use streaming to mitigate perceived latency. Also consider caching results: if a user repeatedly asks to proofread the same text without changes, you could reuse the analysis. However, this might be over-optimization; usually the user will only run it once after writing the draft.

* **Analytics:** As per the spec, we want to track metrics:

  * *Improvement acceptance rate:* We can calculate what fraction of suggested changes were accepted vs rejected. We have to record somewhere the decisions. We could extend `ai_usage_logs` or create a new table for “ai\_suggestion\_feedback” that logs each suggestion ID and whether user accepted it. Alternatively, log counts in the conversation’s metadata (e.g., metadata: `{accepted: 5, rejected: 2}`).
  * *Before/after readability score:* We might integrate a readability library or use the `overall_score` from AI (if it represents quality) to see improvement.
  * *User satisfaction:* perhaps via a thumbs-up/down after using the assistant.
  * *Board-level compliance:* We can see if rule violations in posts drop over time when proofreading is used.
  * *Cost per session:* easily derived from usage logs.

These can be reported to admins or displayed to users (e.g., “Your post’s clarity improved from 60 to 85 after AI suggestions.”).

* **User Agency and Privacy:** We must ensure the AI does not *force* changes. The user should be in control – which is why we have the accept/reject UI. Always allow the user to dismiss the AI’s suggestions and use their original text if they prefer. Also, clarify what the AI is doing: for example, an onboarding tooltip like “This AI will suggest improvements to your post. You can choose which suggestions to apply.” Keep the tone of the assistant’s suggestions positive and supportive, per the guidelines in the system prompt (helpful, not harsh). As for data, the user’s content is being sent to OpenAI’s API – this should be disclosed (OpenAI will retain it for 30 days by policy). If needed, provide an option to opt-out of AI assistance for privacy.

In summary, we’ll implement a robust AI integration in Curia by:

* Setting up the Vercel AI SDK for streaming chat and function execution.
* Using OpenAI embeddings and Postgres (pgvector) to give the AI access to community knowledge for the “hive mind” Q\&A feature.
* Utilizing OpenAI’s function calling with two custom functions to analyze and improve user-generated content, enabling a rich proofreading experience with real-time diff feedback.
* Adjusting the database schema where needed (conversation types, embeddings storage) and leveraging the existing tables to log conversations and usage.
* Following OpenAI and Vercel best practices for multi-step tool usage (e.g. enabling `maxSteps` for automatic iterative calls and structuring prompts to guide the model’s tool use).

With these foundations in place, the Cursor AI agent can proceed to implement the code for each part (database migrations for any new fields, API route logic, front-end components for chat and diff UI, etc.). By building and testing incrementally (as suggested in phases), we can ensure each piece – basic chat, function calls, diff viewer – works before integrating them into a seamless user experience.

## References

* Vercel AI SDK Documentation – *Streaming and Tool (Function) Usage*: The SDK supports defining server-side tools that the model can call (function calling) and streaming multi-step interactions.
* OpenAI Documentation – *Function Calling & Embeddings*: OpenAI’s function calling allows the model to return structured data and call developer-defined functions. Embeddings enable semantic search by representing text as vectors.
* Curia Codebase Schema – *AI Tables*: The existing `ai_conversations` table can be extended with new types for our features, and `ai_messages`/`ai_usage_logs` will record the content and costs of AI interactions. This provides a solid backend foundation for the AI assistant.
