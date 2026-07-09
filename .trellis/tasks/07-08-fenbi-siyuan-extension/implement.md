# Implementation Plan

## Steps

1. Scaffold a TypeScript Manifest V3 extension project.
   - Add `manifest.json`, `package.json`, `tsconfig.json`, build script, and source directories.
   - Keep output under `dist/` and source under `src/`.
2. Define shared types and message contracts.
   - `FenbiQuestion`
   - settings types
   - background request/response types
3. Implement core utilities.
   - URL normalization
   - stable text normalization
   - SHA-256 content hash
   - Markdown escaping/formatting helpers where needed
4. Implement formatter.
   - Convert `FenbiQuestion` to the approved Markdown template.
   - Ensure no mistake, review, memory-note, or AI summary sections exist.
5. Implement settings storage.
   - Load/save via `chrome.storage.sync`.
   - Validate required settings before API calls.
6. Implement Siyuan client.
   - Test connection.
   - Read target document Markdown.
   - Append Markdown to target block.
   - Return structured errors.
7. Implement background service worker.
   - Handle settings test and `SAVE_QUESTION`.
   - Run duplicate detection before append.
8. Implement Fenbi parser.
   - Extract question text, options, answers, analysis, images, subject/module, title, URL, and tags.
   - Use fallback text extraction for early MVP resilience.
9. Implement content script UI.
   - Inject `收进思源` button.
   - Render preview editor.
   - Allow editing approved fields.
   - Send confirmed data to background and show result messages.
10. Implement options page.
    - Save and load base URL, token, target block ID.
    - Test connection through background worker.
11. Add automated tests for core modules.
12. Build and manually verify the extension can be loaded from `dist/`.

## Validation Commands

- `npm install`
- `npm test`
- `npm run build`

## Risk Points

- Fenbi DOM selectors are unknown until tested against real pages.
- Siyuan API endpoint details may need local adjustment.
- Browser extension content-script styling can conflict with page CSS.
- Cross-origin requests to local Siyuan require correct manifest host permissions.

## Rollback Points

- Parser can be simplified to preview-window manual correction if selectors fail.
- Siyuan client is isolated so endpoint changes do not affect UI modules.
- Image handling can remain plain Markdown links until asset upload is explicitly added later.
