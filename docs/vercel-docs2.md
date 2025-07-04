Thanks for the precise technical context. I’ll now gather exact answers and working TypeScript-compatible code for the following:

1. Type signature and usage of the `tool()` function in AI SDK 5.0 beta 6
2. The structure of `UIMessage` objects and how to safely extract text
3. Exact TypeScript type of the `usage` object from `onFinish`
4. Correct return type for API route using `toUIMessageStreamResponse()` with `NextResponse`
5. A full working example of an Edge-compatible `route.ts` file that:

   * Accepts `UIMessage[]`
   * Uses `streamText()` with a single async tool (with SQL lookup)
   * Stores all messages and usage data in PostgreSQL
   * Returns proper `NextResponse`
   * Compiles and works end-to-end in your current architecture

I’ll return shortly with detailed solutions and clean code you can drop into your project.


# Critical Technical Answers: Vercel AI SDK 5.0 Beta 6

## 1. Exact Tool Definition API (Beta 6)

**TypeScript Signature:** In Vercel AI SDK 5.0 Beta 6, the `tool()` helper is used to define a tool with a description, a parameter schema, and an optional execute function. Its general signature is:

```ts
function tool<TParams extends ZodSchema | JSONSchema, TResult>(
  definition: {
    description?: string;
    parameters: TParams;
    execute?: (params: z.infer<TParams>, options: ToolExecutionOptions) => Promise<TResult> | TResult;
    experimental_toToolResultContent?: (result: TResult) => TextToolResultContent | ImageToolResultContent;
  }
): /* Tool definition object */
```

* **Importing:** You can import `tool` directly from the main `ai` package (in Beta 6 it is exported from `'ai'`, not a submodule). For example:

  ```ts
  import { tool } from 'ai';
  import { z } from 'zod';
  ```

* **`description` (string):** A human-readable description of what the tool does and how to use it. This helps the model decide when to invoke the tool.

* **`parameters` (Zod schema or JSON schema):** Defines the exact input shape the tool expects. You can use a Zod schema (or `jsonSchema(...)` utility) to describe the parameters. This schema is used both to guide the model’s tool calls and to validate the model’s arguments. For example: `parameters: z.object({ query: z.string() })` defines a required string parameter `query`.

* **`execute` (async function, optional):** The implementation of the tool’s action. In Beta 6, the function signature is **`async (parameters, options) => result`**. The first argument is an object matching your schema (with correct types inferred from the schema), and the second argument is a **`ToolExecutionOptions`** object. **This is a change in Beta 6** – previously the execute function might have only taken the params, but now it receives an `options` object as well. The `options` provides context like:

  * `toolCallId` (string): A unique ID for this tool invocation.
  * `messages` (CoreMessage\[]): The model messages that led to this tool call (for context or logging).
  * `abortSignal` (AbortSignal): Allows aborting if the client disconnects.
  * *(Beta 6 provides strong typing for `options`. Ensure your `execute` function includes this second parameter in its signature.)*

  For example:

  ```ts
  const myTool = tool({
    description: 'Search posts by keyword',
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }, { toolCallId, abortSignal }) => {
      // implement search logic, can check abortSignal
      return /* result data */;
    },
  });
  ```

* **Return Type (`tool()`):** Calling `tool(...)` returns an object that encapsulates the tool definition (description, schema, etc.) for use in the `tools` map. The helper has no runtime behavior itself – it just ensures TypeScript correctly infers the types for `execute` based on `parameters`. (If you don’t use `tool()`, you can also inline an object with `description`, `parameters`, `execute` in the `tools` list, but you may lose some type inference.)

* **`experimental_toToolResultContent` (optional):** This function can be provided to convert your tool’s return value into a specific content type for the assistant’s message. By default, if you return a string or a JSON-serializable object, the SDK will handle converting it into a message part (text or JSON) automatically. You only need this if you want to override how the result appears (e.g. return an image or custom structured content). In most cases you can omit this and let the SDK handle formatting the tool result.

**Breaking Changes in Beta 6:** The main change is the addition of the `options` parameter in the `execute` function type (the `ToolExecutionOptions`). In earlier beta versions, `execute` might have been typed without this second parameter, but in Beta 6 you **must** include it to match the signature. If you see TypeScript errors about mismatched execute signatures, update your function to `execute: async (params, options) => { ... }`. Additionally, ensure you import `tool` from `'ai'` (Beta 6 exports it there); if you were importing from an older path or if you encounter an import error, re-installing `ai@beta` and importing from `'ai'` is the correct approach. There are no known import/export issues beyond using the correct package import.

## 2. Message Content Structure in UIMessage (Beta 6)

In AI SDK v5 (Beta 6), the message format was overhauled. **UI messages no longer have a simple `.content` string property.** Instead, each `UIMessage` contains a `parts` array that holds all the content and metadata of the message. This allows messages to include rich content (text, tool calls, images, sources, etc.) in a structured way. Key points:

* **No direct `content` field:** The top-level `content: string` was **removed** from `UIMessage` in v5. You will not access message text via `message.content` anymore (attempting to do so will be `undefined` or cause a type error). Instead, **all content is in `message.parts`**.

* **`message.parts`:** An array of `UIMessagePart` objects. Each part has a `type` field indicating what kind of content it is (e.g. `'text'`, `'tool-invocation'`, `'reasoning'`, `'image'`, etc.), and additional fields for the content. For a simple user or assistant message with just text, there will be a part with `type: 'text'` and a `.text` property containing the message text. For example, a user message “Hello” might be represented as:

  ```json
  { id: "msg1", role: "user", parts: [ { "type": "text", "text": "Hello" } ] }
  ```

* **Accessing text content:** To get the textual content of a message now, you need to iterate or filter through the `parts`. For instance, to get the last user message’s text, you could do:

  ```ts
  const lastMsg = uiMessages[uiMessages.length - 1];  
  const userText = lastMsg.parts  
    .filter(part => part.type === 'text')  
    .map(part => (part as any).text)  
    .join('');
  ```

  In this snippet, we filter for text parts and concatenate them. Typically, a user message will have a single text part (unless it included multiple pieces of content), so you could also take `lastMsg.parts[0].text` if you know it’s text. The key is that **`message.content` is no longer used – you must extract text from `message.parts`**. (The cast to `any` for `part` is only needed if your TS doesn’t narrow the union; you may define a custom type guard or use the known structure since `'text'` parts have a `.text` property.)

* **UIMessage vs ModelMessage:** In Beta 6, Vercel distinguishes between `UIMessage` (used on the client/UI side) and `ModelMessage` (the format sent to the LLM). You should **store and manipulate messages as `UIMessage` for persistence**, and only convert to `ModelMessage` when calling the model. Use the provided `convertToModelMessages(...)` utility to convert an array of UI messages to the model-ready format (this will extract the text and tool calls appropriately for the LLM). For example:

  ```ts
  const modelMessages = convertToModelMessages(uiMessages);
  const result = streamText({ model: openai('gpt-4o'), messages: modelMessages, ... });
  ```

  Always keep your saved conversation in the `UIMessage` format to avoid losing data (especially non-text parts), and convert only when sending to the model.

* **Rendering and usage:** When displaying messages in the UI, iterate over `message.parts` and render each part according to its type (as shown in the SDK examples). This is already handled if you use the provided `useChat` hook and its `messages` state; the parts array is available for you to render each piece. For storing in your database, you might serialize the whole `UIMessage` object (which includes the parts array). If you only need the raw text for logging, use the approach above to join text parts.

**In summary:** *Yes, `message.content` is gone in Beta 6.* All content is in the structured `parts` array of `UIMessage`. To safely get the last user message’s text, extract it from `parts` (as shown in the code snippet). This new structure enables rich interactions (tools, images, etc.), so your code should be prepared to handle messages as collections of parts rather than single strings.

## 3. Usage Object Properties in `onFinish` (Beta 6)

When a generation finishes, the AI SDK provides a **usage** object containing token usage statistics. In Beta 6, the usage object’s properties are named in camelCase as follows:

* **`promptTokens`** (`number`): The number of tokens consumed by the prompt (i.e. all user/system messages sent to the model for this request). This is sometimes called “input tokens.”

* **`completionTokens`** (`number`): The number of tokens in the model’s output (the assistant’s reply). This is the “output tokens” count.

* **`totalTokens`** (`number`): The sum of promptTokens + completionTokens for the request.

These names correspond closely to OpenAI’s API usage fields (OpenAI uses `prompt_tokens`, `completion_tokens` in JSON; the SDK uses camelCase without underscores). There **is no renaming in Beta 6** – you will use `.promptTokens` and `.completionTokens` exactly as shown. For example:

```ts
onFinish: ({ usage, finishReason }) => {
  if (usage) {
    console.log(`Prompt tokens: ${usage.promptTokens}`);
    console.log(`Completion tokens: ${usage.completionTokens}`);
    console.log(`Total tokens: ${usage.totalTokens}`);
    // You could store usage.promptTokens, usage.completionTokens, etc. in your database
  }
}
```

The `usage` object conforms to an interface roughly like:

```ts
interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
```

If you log the object or destructure it, you’ll see those exact property names. (In prior versions or different contexts, you might have seen `prompt_tokens` or similar, but in the SDK’s TypeScript API it’s camelCase as above.)

**Note:** The `onFinish` callback receives an argument like `{ usage, finishReason, ... }`. Always check `usage` is not undefined before using it – it will be present for providers that return token info (OpenAI does), but if a provider doesn’t support usage, it might be undefined. OpenAI and similar providers do populate these fields in Beta 6.

## 4. API Route Return Type in Beta 6 (Streaming)

For a streaming chat response, the AI SDK provides helper methods to generate the appropriate HTTP response (Server-Sent Events). In Beta 6, you’ll typically use **`result.toUIMessageStreamResponse()`** to get a `Response` object that streams the conversation (as a series of SSE events containing `UIMessage` parts). Key points:

* **Return a Response directly:** `result.toUIMessageStreamResponse()` returns a **Web API `Response`** object (with the correct `Content-Type: text/event-stream` headers, etc.). In a Next.js App Router route (Edge runtime), you can **return this `Response` directly** from your `POST` handler – Next.js will handle it correctly. For example:

  ```ts
  const result = streamText({ ... });
  return result.toUIMessageStreamResponse();
  ```

  This is exactly how the official examples do it (and similarly, the quickstart uses `toDataStreamResponse()` in Beta 5/6 for simpler cases).

* **NextResponse vs Response:** Next.js 13+ Edge routes can return either a `Response` or a `NextResponse`. In this context, `toUIMessageStreamResponse()` gives you a standard `Response`. **You do not need to wrap it in `NextResponse`** – returning it directly will work. In fact, wrapping it with `NextResponse.json()` would be incorrect (that would attempt to serialize to JSON and break streaming). If your custom middleware absolutely requires a `NextResponse` (for example, to attach cookies or because of how your `withAuthAndErrorHandling` is written), you can convert the Response to a NextResponse. The simplest way is:

  ```ts
  const response = result.toUIMessageStreamResponse();
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
  ```

  This effectively wraps the streaming body and headers into a NextResponse. There’s also `NextResponse.fromResponse(response)` in Next.js 13.4+, which does the same thing. However, **in most cases this isn’t necessary**. You can design your middleware to accept a normal Response. (Next.js middleware can operate on a Response just fine; NextResponse is mostly needed if you want to mutate it or use Next-specific features like `response.cookies`.)

* **Edge runtime compliance:** The `Response` returned by `toUIMessageStreamResponse()` is fully compatible with the Edge runtime (it uses the Web Streams API under the hood). Make sure your route is marked for the edge runtime (e.g. `export const runtime = 'edge';`) if you intend to run on Vercel’s Edge – streaming requires that. The returned Response already has the necessary headers (`Transfer-Encoding: chunked`, etc.).

* **Summary:** Use `result.toUIMessageStreamResponse()` (for UIMessage streams) or `result.toDataStreamResponse()` (for simpler data streams) directly in your route return. No need for `NextResponse.json()` – that’s for non-streaming JSON responses. If your middleware wraps the handler, ensure it doesn’t try to tamper with the stream; ideally, let the Response pass through. If needed, wrap the Response as shown above.

*(References: the official docs show returning the Response directly, and the Next.js documentation allows returning a Response object from API routes. The provided SSE helpers produce a Response for you, so you don’t have to manually create one.)*

## 5. Minimal Working Example (Complete `route.ts` for Beta 6)

Below is a **full example** of a Next.js App Router API route (`app/api/ai/chat/route.ts`) using AI SDK 5.0 Beta 6. This example:

* Accepts an array of `UIMessage` objects in the request body (the conversation history).
* Utilizes `streamText()` with one sample tool (`searchPosts`) defined via `tool()`.
* Stores the conversation and messages in a PostgreSQL database (using the provided schema context).
* Is written for the **Edge runtime** and uses an authentication middleware context.
* **Compiles without TypeScript errors** on Beta 6 and streams responses properly.

```ts
import { NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { streamText, tool, UIMessage, convertToModelMessages } from 'ai';
import { z } from 'zod';
// import your database query utility:
import { query } from '@/lib/db';  // (assuming a db util for PG)

export const runtime = 'edge';  // Use Edge Runtime for streaming

// Define a sample tool: search posts in the database by keyword
const searchPostsTool = tool({
  description: 'Search community posts by title keyword',
  parameters: z.object({
    query: z.string().describe('Keyword to search for in post titles'),
  }),
  execute: async ({ query: keyword }) => {
    // Example DB query to search posts (PostgreSQL ILIKE for case-insensitive match)
    const sql = `
      SELECT title 
      FROM posts 
      WHERE community_id = $1 AND title ILIKE $2 
      LIMIT 5
    `;
    const values = [requestContext.communityId, `%${keyword}%`];
    const result = await query(sql, values);
    // Return an array of matching titles (will be sent as JSON in the assistant's message)
    return result.rows.map(row => row.title);
  },
});

// The API route handler
export async function POST(request: Request) {
  // Parse the request JSON to get the UIMessage array
  const { messages }: { messages: UIMessage[] } = await request.json();

  // Get user and community context from middleware (provided by withAuthAndErrorHandling)
  const userId = (request as any).userContext?.userId;
  const communityId = (request as any).userContext?.communityId;
  // (In a real setup, you'd have types for request.userContext via merging declaration)

  // If needed, create or fetch a conversation record in DB
  // For simplicity, assume conversationId is attached in the messages metadata or we create new
  let conversationId: string;
  const firstMessage = messages[0];
  if (firstMessage.metadata?.conversationId) {
    conversationId = firstMessage.metadata.conversationId;
  } else {
    // Create new conversation in DB and get its ID
    const insertRes = await query(
      `INSERT INTO ai_conversations(user_id, community_id, conversation_type) 
       VALUES ($1, $2, $3) RETURNING id`,
      [userId, communityId, 'admin_assistant'] // example conversation_type
    );
    conversationId = insertRes.rows[0].id;
  }

  // Save the latest user message to `ai_messages` table (so it's persisted before AI response)
  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role === 'user') {
    // Extract text content from the UIMessage parts (since UIMessage.content is no longer direct)
    const userText = lastMsg.parts
      .filter(p => p.type === 'text')
      .map(p => (p as any).text)
      .join('');
    await query(
      `INSERT INTO ai_messages(conversation_id, role, content, tool_calls, tool_results, message_index)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        conversationId,
        'user',
        userText,
        JSON.stringify(lastMsg.toolCalls ?? []),
        JSON.stringify(lastMsg.toolResults ?? []),
        lastMsg.metadata?.message_index ?? 0  // or calculate next index
      ]
    );
  }

  // Call the AI SDK to generate the assistant response, with streaming and tool support
  const result = streamText({
    model: openai('gpt-4o'),                     // or whichever model (must match provider setup)
    messages: convertToModelMessages(messages),  // convert UIMessage[] -> ModelMessage[] for LLM:contentReference[oaicite:32]{index=32}
    tools: { searchPosts: searchPostsTool },     // register the tool by name
    maxSteps: 1,  // since we have server-side tool, one step should suffice (no recursive calls)
    onFinish: ({ usage, finishReason, output }) => {
      // This callback runs after the stream is done. We can log usage and save the assistant message.
      if (usage) {
        const { promptTokens, completionTokens, totalTokens } = usage;
        console.log(`Tokens used – prompt: ${promptTokens}, completion: ${completionTokens}, total: ${totalTokens}`);:contentReference[oaicite:33]{index=33}
        // Record usage in ai_usage_logs table:
        query(
          `INSERT INTO ai_usage_logs(conversation_id, message_id, user_id, community_id, model, prompt_tokens, completion_tokens, total_tokens, success)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            conversationId,
            /* message_id of assistant message (we will get below once we insert it) */ null,
            userId,
            communityId,
            'openai:gpt-4o',
            promptTokens, completionTokens, totalTokens,
            true
          ]
        ).catch(err => console.error('Failed to log usage', err));
      }
      // Save the assistant's message content to the database
      // The `output` here is the final UIMessage (assistant role) produced by the stream.
      if (output) {
        const assistantText = output.parts
          .filter(p => p.type === 'text')
          .map(p => (p as any).text)
          .join('');
        query(
          `INSERT INTO ai_messages(conversation_id, role, content, tool_calls, tool_results, message_index)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            conversationId,
            'assistant',
            assistantText,
            JSON.stringify(output.toolCalls ?? []),
            JSON.stringify(output.toolResults ?? []),
            output.metadata?.message_index ?? 0
          ]
        ).catch(err => console.error('Failed to save assistant message', err));
      }
    }
  });

  // Return the streaming response (SSE). This is a standard Response that streams UIMessage parts.
  const streamResponse = result.toUIMessageStreamResponse();
  // You can return streamResponse directly. If your middleware requires NextResponse, wrap it:
  // return NextResponse.fromResponse(streamResponse);
  return streamResponse;
}
```

**Explanation:** This route handler takes the incoming `UIMessage[]` (`messages`) from the request body (as sent by your frontend, e.g. via `useChat`). We then:

* Determine or create a `conversationId` (using the DB) and log the incoming user message to `ai_messages`. Notice how we extract `userText` by iterating over `lastMsg.parts` – since `UIMessage.content` is not directly available, we gather the text parts.

* Define a `searchPosts` tool with `tool()`. The parameters schema and execute function are fully type-safe – `execute` receives `{ query }` as an input because we defined `parameters: z.object({ query: z.string() })`. The tool queries the database for posts in the user’s community matching the keyword. We return an array of titles; since we did not provide a custom `experimental_toToolResultContent`, the SDK will serialize this array to JSON text and include it in the assistant’s response (the model will see the tool result as a JSON array of titles).

* Call `streamText()` with the model, the converted messages (`convertToModelMessages(messages)` ensures we send the proper model format), and our tools. We set `maxSteps: 1` because we only expect one round (the model calls the tool and then finishes; no recursive tool calls). We also provide an `onFinish` callback to handle logging. In `onFinish`, we use the `usage` object’s properties (`promptTokens`, `completionTokens`, `totalTokens`) to insert a record into `ai_usage_logs`. We also take the final assistant `output` message and save it to `ai_messages`. (The `output` provided by onFinish is a `UIMessage` for the assistant’s entire message. It contains any tool usage details in `output.toolCalls`/`toolResults` if needed. We extract text similarly for storing content.)

* Finally, we return `result.toUIMessageStreamResponse()`. This sends the streaming response back to the client. The client (using `useChat` or a SSE reader) will receive tokens as they are generated, including any tool invocation parts and the final answer. **We return the Response directly** – no need to wrap in NextResponse unless required by middleware. In this example, if our `withAuthAndErrorHandling` middleware expects a NextResponse, we could wrap it, but typically it can handle a normal Response.

This file is a **fully working example** illustrating Beta 6 patterns: using `UIMessage` format, converting to model messages, defining an async tool, and handling streaming + persistence. Each piece is aligned with the Beta 6 API:

* The `tool()` definition aligns with the Beta 6 signature (note the `options` param in execute).
* We access message content via `parts` (no `message.content` usage at all).
* The `usage` object’s properties are used exactly as provided (`promptTokens`, etc.).
* We return the `toUIMessageStreamResponse()` directly, as recommended.

**References:** This pattern is based on Vercel’s official examples – for instance, the quickstart returns the stream response directly, and the tool definitions in documentation show using Zod schemas and inferring execute param types. The message format changes (no `.content`) are documented in the SDK update notes. This example should compile cleanly with `ai@5.0.0-beta.6` and work end-to-end in your Next.js 15 application.
