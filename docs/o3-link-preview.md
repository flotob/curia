Great — I’ll research the best practices and tools for implementing inline link previews in a Tiptap-based Next.js application. This will include how to detect and display previews inside the editor, backend strategies for metadata fetching with security in mind, and how to integrate the two parts efficiently.

I’ll let you know as soon as I have the findings ready.


# Implementing Automatic Link Previews in a Next.js + Tiptap App

Building an automatic link preview feature involves coordination between the rich text editor (Tiptap/ProseMirror) and a backend service to fetch metadata. Below is a comprehensive strategy covering frontend integration, backend setup, data flow, and UX considerations.

## Frontend: Tiptap Editor Integration

### URL Detection with Input/Paste Rules

* **Detecting URLs:** Leverage Tiptap’s extensibility to detect when a user types or pastes a URL. By default, Tiptap’s Link extension will automatically linkify pasted URLs, but for previews you may override this behavior.
* **Input Rules:** Implement an input rule that matches URL patterns (e.g. using a regex for `http(s)://...`) when the user types a space or press Enter after a URL. This triggers your logic to convert the text into a preview. You can disable `autolink`/`linkOnPaste` on the default Link extension to avoid conflicts.
* **Paste Rules:** Similarly, use a paste rule or a ProseMirror plugin’s `handlePaste` to intercept pasted content. If the pasted text is a URL or contains URLs, prevent the default behavior and replace those with preview nodes. This ensures that a URL pasted on its own immediately transforms into a preview card.

### Custom LinkPreview Node Schema

* **ProseMirror Node:** Define a custom *node* in the schema for link previews (e.g. name it `"linkPreview"`). This will represent the preview card as a block element in the document. Mark it as an *atom/block* node so it’s treated as a single unit (non-editable content). For example:

  ```ts
  Node.create({
    name: 'linkPreview',
    group: 'block',
    atom: true,   // treated as a single unit
    draggable: true,  // (optional) allow drag-and-drop
    addAttributes() {
      return {
        href: { default: null },       // original URL
        title: { default: null },
        description: { default: null },
        image: { default: null },
        siteName: { default: null },
      }
    },
    parseHTML() {
      return [{ tag: 'div[data-type="linkPreview"]' }]
    },
    renderHTML({ node }) {
      // Example static rendering using a div wrapper
      const { href, title, description, image, siteName } = node.attrs;
      return [
        'div', { 'data-type': 'linkPreview', class: 'link-preview-card' },
        image ? ['img', { src: image, class: 'link-preview-img' }] : null,
        ['div', { class: 'link-preview-content' },
          ['strong', { class: 'link-preview-title' }, title || href],
          siteName ? ['span', { class: 'link-preview-site' }, siteName] : null,
          ['p', { class: 'link-preview-description' }, description || '']
        ]
      ];
    },
  });
  ```

  *The above schema stores metadata in attributes and defines how to render a preview card in HTML. In practice, you might use a Tiptap NodeView with a React/Vue component for more complex rendering and interactivity.*
* **Rendering in Editor:** Use a NodeView (e.g. Tiptap’s `ReactNodeViewRenderer`) to render the preview node as a React component. This allows you to include styled HTML, images, icons, and even interactive elements (like a remove button) in the editor. The NodeView component can read the node’s attributes (`title`, `description`, etc.) and display an attractive card UI. For example, you might show a thumbnail image on the left, and text on the right, similar to how social media cards appear.
* **Non-Editable Content:** Because the preview is an atomic node, users won’t be able to edit the title/description directly. Ensure the node is selectable as a single unit so that it can be deleted or moved easily. Setting `atom: true` or not providing an inner content schema makes the entire node act like one object. In the DOM, you might use `contenteditable="false"` on the outer wrapper to prevent cursor from entering the preview card.

### Asynchronous Metadata Fetch & Loading State

* **Placeholder Insertion:** When a URL is detected, insert the custom node immediately with only the URL (`href`) set, and perhaps no title/description yet. This can display a temporary “Loading preview…” state. For instance, you might render the node with a spinner or a greyed-out card indicating that the preview is being fetched.
* **Fetching Metadata:** Kick off an asynchronous fetch to your backend API to retrieve the link’s metadata. This can be done in the paste/input rule handler. For example, using an API route `/api/link-preview`:

  ```js
  // Inside the Tiptap extension's paste handling:
  editor.commands.insertContent({ type: 'linkPreview', attrs: { href: url } });
  fetch('/api/link-preview', {
    method: 'POST',
    body: JSON.stringify({ url })
  })
    .then(res => res.json())
    .then(data => {
      // Update the node’s attributes with fetched metadata
      editor.commands.updateAttributes('linkPreview', { 
        href: url,
        title: data.title,
        description: data.description,
        image: data.image,
        siteName: data.siteName 
      });
    })
    .catch(() => {
      // Handle failure: maybe revert to a simple link or notify user
      editor.commands.updateAttributes('linkPreview', { title: url }); 
    });
  ```

  Because the fetch is asynchronous, the editor will have already inserted the placeholder node. Once data returns, update that node’s attributes to populate the preview. Tiptap’s command `updateAttributes` can target the node if it’s selected or if you have a way to find it. Another approach is to use a plugin state with placeholders: for example, the open-source *prosemirror-link-preview* plugin uses a placeholder decoration to track pending links and replace them when data arrives. The concept is to identify the node (perhaps store a unique ID in the node’s attrs or use the position) so you know which preview to update when the async call completes.
* **One Fetch per URL:** Ensure you fetch metadata only once per unique URL per post. You can keep a set of URLs already fetched in the editor state – if the user pastes the same link multiple times in one document, reuse the metadata to create the preview nodes. If a user edits the link text (before it converts to a node), avoid triggering multiple calls (e.g. use a short debounce for input detection).
* **Loading Indicator:** During fetch, the preview node can show minimal info (e.g. just the URL as the title, or a spinner). Optionally, use a CSS class like `.loading` on the node’s container to style it differently until the real data replaces it. This gives immediate visual feedback that a preview is being generated.

### Deleting or Repositioning Preview Blocks

* **Deletion:** Users should be able to remove a preview if desired. Since the preview is a block/atom node, they can place the cursor next to it and press Backspace/Delete to remove it entirely. You should verify that your schema and keybindings allow selecting the node. In ProseMirror, when an atomic node is selected, hitting Delete will remove it. You can also provide a small “✕” remove button on the card (rendered via NodeView) – clicking it can call a command to delete the node from the document.
* **Repositioning:** Treat the preview card similar to an image or embed that can be moved. Possible approaches:

  * Enable drag-and-drop: setting `draggable: true` on the node schema and implementing the drag handlers allows users to drag the card to a new position in the document.
  * Cut and paste: users can click the card (which selects it as one unit), press Ctrl/Cmd+X to cut, then paste it elsewhere.
  * Arrow key navigation: Ensure the preview node is keyboard-accessible. Tiptap/ProseMirror typically lets you navigate out of atomic nodes with arrow keys (they are either completely selected or skipped). You might need to fine-tune arrow key behavior so that the user can move the cursor above or below the card easily.
* **Preventing Edits:** Since the preview content is auto-generated, you likely want it non-editable. The user shouldn’t accidentally change the title or description. Using a NodeView or the `atom` setting as described achieves this. If the user wants to edit the URL, one strategy is to let them delete the preview and re-paste the link (or provide a UI to convert the preview back to plain link text).

## Backend: Next.js API for Metadata Fetching

### Metadata Fetching Libraries and Techniques

Fetching link metadata on the server ensures you can bypass CORS restrictions and keep secrets (if any) safe. Some recommended Node.js approaches:

* **`link-preview-js`:** A convenient library that takes a URL and returns Open Graph / Twitter card info (title, description, images, etc.) in one call. It handles many cases internally. For example, `getLinkPreview(url)` returns an object with metadata. This library is straightforward and used in the Tiptap link preview example:

  ```js
  import { getLinkPreview } from 'link-preview-js';
  const data = await getLinkPreview(url); 
  // data contains fields like title, description, images, mediaType, etc.
  ```

  *Note:* Ensure you use an updated version, as older versions had SSRF vulnerabilities (allowing requests to internal networks) – this has been patched in newer releases.
* **`metascraper`:** A more configurable toolkit for scraping metadata from webpages. Metascraper uses a series of plugins to extract Open Graph tags, Twitter cards, JSON-LD, etc., providing a rich set of data. It can retrieve not just basic OG fields, but also things like author, published date, etc., if needed. Use this if you need fine-grained control or additional metadata beyond the basics.
* **`open-graph-scraper`:** A simple Node.js module specifically for scraping Open Graph and Twitter Card info. It returns a consistent result object (e.g. `result.ogTitle`, `result.ogDescription`, `result.ogImage`, etc.). This library has options for timeouts and even a blacklist of hosts to avoid. It’s a good choice if you want to explicitly focus on OG/Twitter meta tags.
* **Manual (cheerio):** For full control, you can fetch the raw HTML (using `fetch` or `axios`) and parse it with a DOM parser like **Cheerio**. This way, you can manually extract `<meta>` tags (`property="og:*"`, `name="twitter:*"`) and any other info (e.g. find the page `<title>` as a fallback). This approach requires more code, but lets you handle edge cases directly. It’s useful if you want to limit download size (e.g. only fetch the `<head>` or first N bytes where meta tags usually reside).
* **External APIs:** Alternatively, use a hosted service or API (like [linkpreview.net](https://www.linkpreview.net/) or OpenGraph.io) that returns link metadata. This offloads the work but introduces external dependencies and potential costs. If using a client-side only approach (not recommended), such services would be needed due to CORS (since browsers block direct cross-origin requests to arbitrary sites).

### Security Considerations (SSRF, CORS, etc.)

* **Server-Side Request Forgery (SSRF):** Be careful that the metadata API cannot be abused to request internal or sensitive URLs. Validate the input URL – ensure it has a proper URL format and allowed protocol (`http` or `https` only). Before fetching, you can perform a DNS lookup or IP check: reject private or local IP ranges (e.g. `localhost`, `127.0.0.1`, `10.x.x.x`, etc.) to prevent internal network access. If using `getLinkPreview` or similar libraries, check their documentation or updates regarding SSRF protection (for example, a known SSRF issue was patched in **link-preview-js** v2.1.17). You can also set a whitelist/blacklist of domains if your app only expects certain links.
* **Limit Download Size:** To avoid huge responses (someone could link to a 100 MB file), set a reasonable timeout and size limit. Many HTTP libraries or scrapers allow this. For instance, **open-graph-scraper** has a timeout option and you could stop after reading the head section of HTML. If using `node-fetch`, you can manually abort the request if the content-length is too large or if it’s taking too long.
* **Malicious Content:** Parse the HTML in a way that scripts aren’t executed (using a parsing library like Cheerio ensures scripts in the page won’t run). Only extract text and URLs from the metadata fields. Additionally, be cautious of XSS in metadata – e.g., a page could contain a `<meta property="og:title" content="<script>alert(1)"/>`. Sanitize the outputs if you plan to render them in the frontend. Typically, encoding any user-provided string when rendering in React/HTML will suffice.
* **CORS for API route:** The Next.js API route will be called from the client. If your Next.js app domain hosts the API, you don’t need special CORS handling for same-origin requests. However, if you have a separate domain or want to allow external clients, enable CORS in the API handler. You can use the `cors` middleware in Next API routes. For example:

  ```js
  // Next.js API route (pages/api/link-preview.js)
  import Cors from 'cors';
  import { getLinkPreview } from 'link-preview-js';
  // Initialize CORS middleware
  const cors = Cors({ methods: ['POST'] });
  export default async function handler(req, res) {
    await runMiddleware(req, res, cors);  // runMiddleware is a helper to await middleware
    const { url } = JSON.parse(req.body);
    try {
      const data = await getLinkPreview(url);
      res.status(200).json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
  ```

  In the above, `getLinkPreview` fetches the URL and extracts metadata. CORS middleware is invoked to allow cross-origin calls if needed. (If the editor is served from the same Next.js app, this may not be necessary.)

### Rate Limiting and Caching

* **Rate Limiting:** Implement rate limiting on the metadata API to prevent abuse (accidental or malicious). For example, you might limit each IP to a certain number of preview requests per minute. This can be done using packages like `express-rate-limit` (compatible with Next’s API through a wrapper) or with an in-memory counter in the handler. If your app requires user authentication, you could rate-limit per user account as well.
* **Caching Results:** To improve performance and avoid repeated fetches, cache the metadata results:

  * *In-memory cache:* Within the API process, store a simple cache object mapping URL -> fetched metadata (and perhaps a timestamp). If the same URL is requested again within, say, some minutes, return the cached data instead of fetching again. This speeds up cases where multiple users or multiple posts use the same link.
  * *Persistent cache:* For longer-term caching, you could store previews in a database or in-memory store like Redis. For example, save the metadata JSON keyed by URL (or a hash of it) along with a timestamp. The next time a preview is needed for that URL, if it’s not too old, you can return the stored data. This also allows reuse across server restarts or deployments.
  * *CDN caching:* If your API route is deployed on a platform like Vercel, you can leverage caching headers. For instance, respond with `Cache-Control: s-maxage=86400` to let the Vercel edge cache store the response for 24 hours for identical requests. This way, if many clients request the same preview, the fetch happens once. **Note:** Use careful cache keys (the URL is the primary key; include all query params if any).
* **Staleness:** Consider how to update cache when a page’s metadata changes. In many cases, this isn’t critical (the preview can remain as it was when the post was created). But if freshness matters, you could implement a cache expiry (e.g. refresh the data if cached result is older than X days when a new request comes in). This ensures that if a frequently referenced link updates its OG image or title, your previews eventually catch up.

## Frontend–Backend Integration Workflow

### Client-Server Communication

* **Triggering the API Call:** As described, when the editor identifies a URL, it should call the Next.js API route (e.g. `/api/link-preview`) with the URL. This can be done via `fetch` in JavaScript. Using `POST` is recommended (to avoid URL-length issues and to keep the URL encapsulated in JSON).
* **Receiving Metadata:** The API will return a JSON payload containing the metadata (e.g. `{ title, description, image, siteName, url }`). On the frontend, handle this response and update the corresponding linkPreview node’s attributes with the data. The update can be done through a Tiptap command or by using ProseMirror transactions. For example, if you inserted a placeholder node with only `href`, you can either:

  * Replace the node with a new fully-populated node (i.e., find its position and do `tr.replaceWith(newNode)` via a custom command).
  * Or use `editor.commands.updateAttributes('linkPreview', {...})` if you have a way to target that specific node (this might update all selected nodes of that type, so ensure the selection or implementation is scoped to one).
* **Node Identification:** If multiple link previews are loading simultaneously, you need to match responses to the correct node. One strategy is to include a unique ID in the request and node: e.g., generate an ID when inserting the placeholder (store it in node attrs and send it to the API as well). The API can just return the same ID back along with data. Then your frontend knows which node to update by ID. Alternatively, the ProseMirror plugin approach (as in prosemirror-link-preview) uses an internal mapping from a placeholder decoration to the request promise, so when it resolves it knows which placeholder to replace. Choose an approach that fits your architecture (explicit IDs can be simplest to implement).
* **Error Handling:** If the API call fails (network error or the URL is unreachable/invalid), handle it gracefully:

  * You might remove the placeholder preview node and just insert the plain URL text (so the user still has the link).
  * Or keep the node but mark it as a failure state (e.g. set an attribute like `error: true` and render a small message like “Preview not available”). This way the user can decide to delete it or keep the link.
  * Logging the error (to the console or a monitoring service) is helpful for debugging issues with certain URLs.

### Persisting Preview Data with Post Content

* **Storing in Document:** The easiest approach is to store the preview metadata as part of the post’s content (within the Tiptap/ProseMirror JSON). The custom node’s attributes (href, title, description, image, etc.) will be saved alongside the rest of the document. This means when you save the post (e.g. in your database as JSON or HTML), the preview card data is included. Later, when you render the post in read-only mode, you don’t need to fetch metadata again – you can directly use the stored data to display the preview card.
* **Database Schema:** If you store posts as rich-text JSON, the linkPreview node will appear in that JSON with its attrs. If you store as HTML, the rendered HTML (with the preview card structure) can be stored, but that’s less portable for re-editing. Generally, storing the structured document (e.g. ProseMirror JSON or Markdown) is better for editing. Ensure that the serialization and parsing of this node is handled (you might need to extend your editor’s JSON/HTML parser so that it knows how to regenerate a linkPreview node from saved content).
* **Separate Metadata Store:** Another strategy is to store only the URL (or a reference) in the document, and keep the fetched metadata in a separate table or cache. For example, your post content might just include a node like `{ type: "linkPreview", attrs: { href: "https://example.com/article/123" } }` and nothing else. Then, when rendering, your application would look up that URL in a LinkPreview table or call the preview API on the fly. This can eliminate data duplication if the same link is used in many posts and makes it easier to update previews globally. However, it adds complexity: reading a post now involves joining with preview data, and if the preview service is down, your post might not show the info. In a Next.js context, you could pre-fetch the preview data on server-side rendering of the post page if needed.
* **Trade-offs:**

  * *Custom Node (Inline Data):* **Pros:** Self-contained content, quick rendering (no extra lookup), works offline once loaded. **Cons:** Increases content size, might become outdated if the external page changes, duplicates data if the same URL appears often.
  * *Separate Store (By URL):* **Pros:** Single source for each URL’s info, easy to update or refresh all posts’ previews by updating one record, potentially smaller post payload. **Cons:** More complex rendering logic, need to manage references, risk of missing data if not fetched in time, and harder to export the post as a standalone document with its preview.
* **Recommended:** For simplicity, storing the metadata in the post content (custom node) is effective. The preview is essentially a snapshot in time of the link’s metadata when the post was created – which is usually acceptable. If needed, you can always update it by editing the post (e.g. re-triggering a fetch).

## UX Considerations for Preview Cards

### Designing an Attractive Preview Card

* **Content of Card:** A good link preview card typically includes:

  * **Title** – the page’s title or Open Graph title (usually bold or larger text).
  * **Description** – a short snippet or summary of the page (OG description or a portion of the article).
  * **Image Thumbnail** – an image representing the link (OG image, Twitter card image, etc.). This could be a small square thumbnail or a larger banner-style image.
  * **Site Name or URL** – the source of the link, e.g., the domain or the Open Graph site name. This helps users identify where the link points at a glance. You might also include a small favicon of the site for a nice touch (you can get a site’s favicon URL from the page’s HTML or by convention `https://favicon.yandex.net/favicon/` or similar services).
* **Visual Style:** Present the preview in a visually distinct container so it’s clear it’s an embedded link card. Common design choices:

  * A bordered card with light background and slight shadow to make it stand out from regular text.
  * If using a thumbnail image, you can align it to the left of the text or span full width at the top of the card. Ensure the image has a fixed aspect ratio or max height so it doesn’t overwhelm the editor.
  * Typography: Title in bold, description in a smaller, grayish font for contrast. The site name/domain could be in an upper corner or below the title in uppercase small text.
  * Spacing: Some padding inside the card, margin around the card so it doesn’t bump into text.
* **Responsive (Inline) Behavior:** Since this is within a text editor, you might treat the preview as a block element (with block-level layout). If the editor content area is narrow (e.g., on mobile), ensure the card adapts (the image might shrink or stack above text). Using flexible CSS (max-width: 100%, etc.) helps.
* **Interactive Elements:** Decide if clicking the card should do anything. Often, clicking a link preview in read-only mode opens the link. In edit mode, clicking might simply select the card (to move or delete it). You can make the card non-interactive in edit mode except for perhaps a remove “✕” button. In read-only view, you could wrap the whole card in an anchor tag so the user can click anywhere to visit the link (just be mindful of target=\_blank and rel=noreferrer for safety).
* **Accessibility:** Provide alt text for the image (e.g., use the OG image alt if available, or the title as alt). Also, ensure screen readers can make sense of the card – for example, the HTML could be an `<a>` tag wrapper with aria-label combining the title and site name. Since it’s a summary of another page, it should be navigable and understandable via assistive tech.

### Fallback Behavior for Failures or Missing Data

* **No Metadata Found:** Not all pages have useful Open Graph or meta tags. If your fetch returns minimal data (or if the site is offline), implement graceful degradation:

  * You could simply leave the URL as a normal hyperlink in the text (i.e., do not insert a preview node at all if fetch indicates failure). This is simplest – the user sees a regular link if the preview can’t load.
  * Alternatively, insert a preview card using the URL itself as the title, and perhaps the domain as the site name. For example, a card that just says “example.com” with no description, or “No preview available” message. This at least preserves the space where the preview would be, but if it’s too empty it might confuse the user. Often, just a plain link is clearer in failure cases.
  * If you already inserted a placeholder card and the fetch fails, you can either remove it or keep it with an error state. A nice UX could be to show a small error indicator and allow the user to retry (for example, a refresh icon button on the card to fetch again).
* **Partial Data:** Sometimes you get a title but no image, or an image but no description. Design the card to handle missing fields:

  * If no image, expand the text area to full width and perhaps add a default icon (like a link icon or placeholder graphic) to indicate it’s a link.
  * If no description, you might just omit the description section and only show the title and site name.
  * If the title is missing (very rare for well-formed pages), you might use the URL as the title.
* **Timeouts/Slow Responses:** If the metadata fetch is taking long, you might not want the editor UI to hang. Since the call is async, the user can keep typing, but the placeholder might sit there loading. Consider a timeout on the backend (e.g., 5-10 seconds). If exceeded, treat it as a fail and either leave the link or show “preview not available”. It’s better to fail fast than to keep a spinner indefinitely. The user can still choose to keep the link itself.

### Automatic vs User-Triggered Previews

* **Automatic Previews:** The approach described assumes automatic generation – as soon as a URL is recognized, the preview block appears. This is convenient and mirrors behavior in apps like Slack, Discord, etc., where link unfurling is default. It requires no extra effort from the user and ensures that posts have rich previews by default.
* **User-Triggered Option:** In some contexts (like document editors or blogging platforms), users may want control. For example, Notion and Google Docs let you paste a URL and then choose whether to show it as a preview card or keep it as plain text. You can consider a small prompt or toolbar: e.g., after paste, show a small button or toast – “Show Preview” – which the user can click to insert the preview. If they ignore it, the link stays as text. This avoids clutter if the user prefers a clean link.
* **Toggling:** Even with auto previews, provide a way to revert. For instance, a right-click context menu or a small “convert to link” option on the preview card could remove the preview and just insert the URL text back. Likewise, if a user initially has a link, you might allow them to trigger a preview via a command (like selecting the link text and clicking “Unfurl link” in a menu).
* **Settings:** If appropriate, a user preference can control link preview behavior (some users might find automatic previews distracting). This could be a simple on/off setting in the editor preferences.
* **Best of Both:** Many implementations default to automatic because it creates a richer post without extra steps. As long as removal is easy (one delete key press to remove the card), it usually isn’t troublesome. If you foresee users needing to paste many links without wanting previews, then adding the optional trigger mechanism would improve UX.

## Tools & Examples

### Tiptap/ProseMirror Extension Examples

* **Emergence Engineering’s Plugin:** Emergence Engineering has an open-source ProseMirror plugin called *prosemirror-link-preview* which offers Slack/Discord-like link previews. It automatically catches pasted links, calls a callback for metadata, and renders a preview card with title, description, and image. The plugin is configurable (you can customize the card appearance via CSS, etc.). This can serve as a reference or even be used directly in a Tiptap setup. For instance, their usage example shows integrating it with a Next.js API using `link-preview-js`. If you prefer not to reinvent the wheel, using this plugin can jump-start your implementation – you’d include the plugin in Tiptap’s ProseMirror plugins and supply the fetch callback.
* **Custom Tiptap Extension:** If you build your own, Tiptap’s documentation and community discussions are helpful. The GitHub discussion “Link preview” shows a custom Node extension definition for a linkPreview node (with attributes for href, title, etc.) and a command to insert it. Reviewing such examples can guide your implementation of schema and commands.
* **Similar Features in Other Editors:** The Outline rich-markdown-editor (by Outline wiki) and Dante editor are ProseMirror-based editors that you might explore for inspiration, although they focus on Markdown and might not have link unfurling out-of-the-box. Another example is Atlassian’s editor (used in Confluence) which has smart link cards – though not open source, it validates the approach of treating link previews as special nodes.

### React Components for Link Preview Rendering

If you want to separate the concern of rendering the preview card from the editor logic, there are React libraries that generate preview card UIs:

* **react-link-preview:** A customizable React component that takes a URL and displays a preview card. It handles fetching metadata internally (it even used a proxy for CORS). While you might not use its fetching (since you have your own backend), you could use it for its card UI or as reference for how to structure the card.
* **react-tiny-link:** A lightweight link preview component that can render a card given meta data (or fetch it if configured). This could be used in read-only views if you store only URL and want to fetch on the fly, but in your case it’s probably better to use the data you already have.
* **opengraph-react:** A set of React components for displaying website previews using data from OpenGraph.io. This might be overkill for your needs, but it’s an option if you were to offload to a service.
* **DIY:** Given you already have all metadata, you might find it simpler to create a small React component for the preview card. That way you can style it to match your app’s design. Use the metadata fields as props and lay them out accordingly. (For example, a component that takes `{ title, description, image, siteName, url }` and returns the JSX for the card).

**Note:** If using a third-party React component that performs its own fetch, be cautious – some rely on external proxies or might not handle failures as you like. Since you have a robust backend API, it’s usually better to use it and just feed the results into the card component.

### Metadata Parsing Libraries (Node.js)

As mentioned in the backend section, here are popular libraries to assist with metadata extraction:

* **Metascraper:** High-level scraper for unified metadata (Open Graph, HTML metadata, JSON+LD). Good for comprehensive needs.
* **Open Graph Scraper (ogs):** Focused on OG/Twitter tags, easy to use, with some built-in safety options.
* **link-preview-js:** Quick solution to get basic info (title, description, media) and works in Node and browser (for browser it uses CORS proxy internally). Used in many projects and in the Emergence example.
* **url-metadata:** A simple package to get metadata from a URL (similar API, returns an object with fields).
* **cheerio:** The go-to library for parsing HTML in Node – if none of the above perfectly suits your needs, you can always fetch and use Cheerio to pick out `<meta property="og:title">`, etc., and even fall back to things like `<title>` or meta description if OG is missing. This gives you full control.

All of these tools can mitigate the heavy lifting of parsing HTML. They typically cover the majority of use cases, but always test a variety of URLs (some sites only have Twitter tags, some only OG tags, some none at all, some have huge HTML). Using a well-maintained library means you benefit from community handling of weird cases. For instance, **metascraper** will check multiple sources for an image (OG image, Twitter image, etc.) and pick the best one.

## Conclusion

By combining Tiptap’s extensibility with a secure Next.js API, you can create a smooth user experience where simply typing or pasting a link results in a rich preview. The editor integration ensures the preview card is part of the document (non-editable but movable), and the backend handles the complexities of fetching and parsing metadata safely. Remember to pay attention to edge cases – not every URL will have complete metadata – and provide users with ways to manage previews (removing them or opting out if needed). With the above approach, your application will deliver modern, attractive inline link previews that enhance the content and engagement.

**Sources:**

* Tiptap Link extension documentation (automatic link detection)
* Emergence Engineering blog – *ProseMirror Link Preview* (plugin features and CORS caveat)
* Emergence Engineering’s open-source plugin (integration with Next.js and `link-preview-js`)
* GitHub discussion example for a custom linkPreview node (schema with attributes and rendering)
* NPM library info for metadata scraping: metascraper, open-graph-scraper.
