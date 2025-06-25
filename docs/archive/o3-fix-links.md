Thanks for the clarification. I’ll investigate how the CGSamplePlugin makes external links clickable—specifically identifying the API, function, or integration in CGlib that enables this behavior. I’ll also review the support page and how internal CG links are handled to trace any clues that apply to external links.

I’ll get back to you with concrete implementation details shortly.


# Making External Links Clickable in Common Ground Plugins

## CGlib Navigation API for Links

Common Ground’s plugin library (CGlib) provides a dedicated **navigation action** to handle link clicks. The `CgPluginLib` client exposes a `navigate(url)` method that instructs the host platform to navigate either within the Common Ground app or open an external link in a new browser tab. Under the hood, this triggers a secure request from the plugin iframe to the parent app with `type: 'navigate'` and the target URL. For example, the CGlib code defines:

```typescript
/**
 * Asks the user to open a new window with the given URL.
 * @param {string} url – The URL to navigate to. Must be a valid URL.
 */
public async navigate(url: string): Promise<CGPluginResponse<NavigateResponse>> {
  return this.__safeRequest<NavigateResponse>({
    type: 'navigate',
    to: url,
  });
}
```



Using this API is the **intended mechanism** for making links clickable. It ensures the Common Ground container handles the link properly – either routing internally (for CG pages) or launching an external link in a new tab/window – all while respecting the platform’s security and rate limits (Common Ground enforces at most one navigation action per 5 seconds to prevent spam).

## Internal vs External Link Handling

Common Ground treats **internal links** (links to pages within the platform) and **external links** (to outside websites) similarly through the `navigate` action. The difference lies in the URL you provide:

* **Internal CG Links:** If you pass a path or Common Ground URL (e.g. a relative URL like `/community/12345` or a full Common Ground app URL), the host will navigate the user within the Common Ground interface instead of opening a new tab. In the plugin’s UI, this is used for things like navigating to a user’s profile or a community page. For instance, the sample plugin uses the same `navigate` method to jump to internal sections (like a support or profile page) by providing the appropriate route string. The CGlib README notes that `navigate` can “move to another page inside Common Ground” – so the plugin would simply call `plugin.navigate('/desired/internal/path')` to trigger in-app navigation.

* **External Links:** If the URL is an external address (e.g. starts with `http://` or `https://` to a different domain), Common Ground will open it outside of the app (usually in a new browser tab or an external browser window). The CGlib `navigate` call is designed for this scenario: *“open a new tab somewhere else”*. In practice, the plugin should call `plugin.navigate('https://external-site.com')` when a user clicks an external link. This signals the Common Ground host to safely open the link in the user’s browser (keeping the plugin sandbox secure).

**Note:** In the current CGlib implementation, the `navigate` action always prompts a new window/tab for the given URL. The host likely decides internally if a URL is within its domain and can be handled in-app or if it should spawn an external tab. From the plugin developer’s perspective, you use the same function for both cases – just supply the appropriate URL.

## Implementation Pattern for Clickable Links

To ensure external links are clickable, you should **invoke the CGlib navigate method in response to user actions** (instead of relying on a plain anchor tag alone). Here are two patterns for implementation:

* **1. Programmatic Navigation on Click:** In your React/JSX code, attach an `onClick` handler to link elements that calls the plugin’s navigate function. For example:

  ```jsx
  import CgPluginLib from '@common-ground-dao/cg-plugin-lib';

  // ... within a component render:
  const handleExternalClick = (e) => {
    e.preventDefault();  // prevent default anchor navigation
    const plugin = await CgPluginLib.getInstance();
    plugin.navigate('https://example.com');
  };

  <a href="https://example.com" onClick={handleExternalClick}>
    Open External Resource
  </a>
  ```

  In this pattern, clicking the link prevents the default behavior (which would try to load the URL inside the iframe) and instead sends a navigate request via CGlib. The Common Ground app then opens the link externally. This approach is useful if you’re rendering links in JSX or want explicit control. It’s the same approach the sample plugin uses for internal links (e.g. sidebar or help links) – simply providing a different URL to `navigate()` extends it to external targets.

* **2. Custom Link Component or Markdown Renderer:** If your plugin displays user-generated or static content with links (for example, rendering Markdown for a help page or wizard step), you can intercept link rendering and funnel it through `navigate()`. For instance, when using a Markdown renderer like `react-markdown`, you can supply a custom `a` component:

  ```jsx
  <ReactMarkdown components={{
    a: ({href, children}) => (
      <a href={href} onClick={(e) => {
        e.preventDefault();
        CgPluginLib.getInstance().then(plugin => plugin.navigate(href));
      }}>
        {children}
      </a>
    )
  }}>
    {markdownText}
  </ReactMarkdown>
  ```

  This ensures that any hyperlink in the content – whether it’s an internal CG link or an external URL – will use the Common Ground navigate action when clicked. The result is that **internal links route inside the app and external links open in the browser**, exactly as intended, with no extra user steps.

## Alternative Approaches and Considerations

* **Direct Anchor Tags:** In some cases, a standard anchor with `target="_blank"` could open an external link in a new tab. For example, if the Common Ground iframe sandbox allows popups, a link like `<a href="https://externalsite.com" target="_blank" rel="noopener">` will indeed open outside the iframe. However, this approach is **not guaranteed or recommended**. Sandboxed iframes may block direct navigation for security, and using CGlib’s `navigate` is safer. Moreover, CGlib’s navigate is subject to platform controls (like rate limiting and user confirmation if needed), whereas a raw anchor might bypass those checks. It’s best to use the official API so your plugin works consistently across web and desktop/mobile containers.

* **Registering/Formatting Links:** There is **no special registration step** needed to make a link clickable – you don’t have to “register” allowed domains or anything in the plugin manifest. The key requirement is to call the CG-provided navigate action. Ensure the URL string you pass is well-formed (the API expects a valid URL format). Common Ground will handle external vs internal destinations automatically. If you simply embed an external URL as text, it won’t be clickable by default; you need to output it as a link and use one of the patterns above to hook into CGlib.

* **Internal Navigation within Plugin:** For completeness, note that navigating **within your plugin’s own pages** (if you have multiple routes in your Next.js app) does not require CGlib – you can use Next.js `<Link>` or client-side routing for that, since it’s all inside the iframe. The CGlib `navigate` comes into play when you want to jump **out of the plugin context** – either deeper into the host app or out to the web.

In summary, the **concrete mechanism** to make external links clickable in Common Ground is to use the Common Ground plugin library’s navigation API. In practice, developers should wrap or intercept link clicks and call `CgPluginLib.navigate(url)` with the external URL. This ensures the link is rendered as a clickable element in the UI and that clicking it triggers the proper Common Ground behavior (opening the link externally). By following this pattern – as already used for internal CG links in the sample plugin – you can seamlessly extend clickable link support to any external URL in your Common Ground plugin environment.

**Sources:** The Common Ground Plugin Library documentation and code define the `navigate` action for link handling, which is the basis for implementing clickable external links.
