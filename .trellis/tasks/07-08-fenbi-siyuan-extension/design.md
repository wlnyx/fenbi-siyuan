# Fenbi to Siyuan Question Collector Design

## Architecture

The project is a TypeScript Manifest V3 browser extension.

- `content script`: runs on Fenbi pages, injects the `收进思源` button, parses the page, and displays the preview editor.
- `parser`: converts the current Fenbi DOM into a `FenbiQuestion` object. It is isolated so Fenbi page changes mostly affect one module.
- `formatter`: converts confirmed `FenbiQuestion` data into Markdown.
- `background service worker`: owns extension settings access, Siyuan API calls, duplicate checks, and append operations.
- `options page`: lets the user configure Siyuan connection settings and test the API connection.
- `shared`: contains message contracts, domain types, hash utilities, URL normalization, and settings types.

This keeps DOM-specific logic out of the service worker and keeps Siyuan API details out of the content script.

## Data Contract

```ts
export type FenbiQuestion = {
  source: 'fenbi';
  url: string;
  urlKey: string;
  contentHash: string;
  title: string;
  subject?: string;
  module?: string;
  questionText: string;
  options: Array<{ label: string; text: string }>;
  userAnswer?: string;
  correctAnswer?: string;
  analysis?: string;
  imageUrls: string[];
  tags: string[];
  capturedAt: string;
};
```

## Markdown Format

The first version deliberately uses a minimal review-oriented template:

```md
## {{subject}}｜{{module}}｜{{capturedAt}}

> 来源：粉笔
> 链接：{{url}}
> 题目指纹：fenbi:{{contentHash}}

### 题目

{{questionText}}

{{imageMarkdown}}

### 选项

{{options}}

### 答案

- 我的答案：{{userAnswer}}
- 正确答案：{{correctAnswer}}

### 解析

{{analysis}}

{{tags}}
```

No mistake reason, review state, memory note, or AI summary fields are allowed in the MVP template.

## Message Flow

1. Content script injects `收进思源`.
2. User clicks the button.
3. Content script calls `parseFenbiQuestion(document)`.
4. Content script opens the preview editor with parsed data.
5. User confirms edited data.
6. Content script sends `SAVE_QUESTION` to the background service worker.
7. Background loads settings.
8. Background fetches target document content from Siyuan.
9. Background checks for `题目指纹：fenbi:${contentHash}` and `链接：${urlKey}`.
10. Background appends Markdown when no duplicate exists.
11. Background returns `success`, `duplicate`, or `error`.
12. Content script shows the result.

## Siyuan API Boundary

The Siyuan client should be a small wrapper around `fetch` with these operations:

- `testConnection(settings)`
- `getBlockMarkdown(settings, targetBlockId)`
- `appendMarkdown(settings, targetBlockId, markdown)`

The implementation should keep endpoint names in one module. If Siyuan API behavior differs locally, this module is the only expected adjustment point.

## Duplicate Strategy

- `urlKey` is generated from `location.href` by removing common volatile query parameters such as session, token, timestamp, and tracking keys.
- `contentHash` is generated from normalized question text, options, and correct answer.
- A question is treated as duplicate if either the target document already contains `fenbi:<contentHash>` or the normalized URL key.
- Content hash is the primary identity because Fenbi URLs may change.

## Error Handling

The user must see actionable messages for:

- missing base URL, token, or target block ID
- Siyuan not reachable
- invalid token or forbidden response
- target block not found or invalid
- parser returned too little usable content
- duplicate question
- append failure

The background worker returns structured error codes rather than raw exceptions.

## Compatibility Notes

- Target browsers are Chromium-based browsers that support Manifest V3.
- The extension will be loaded unpacked during development.
- Fenbi selectors are expected to change; parser heuristics should prefer readable fallback extraction over hard-coded single selectors.
- The MVP preserves image URLs instead of uploading assets, so old links may expire or require Fenbi login.

## Testing Strategy

- Unit test URL normalization.
- Unit test content hash stability.
- Unit test Markdown formatting.
- Unit test settings validation.
- Unit test Siyuan client request construction with mocked `fetch`.
- Unit test parser behavior using HTML fixtures where available.
- Manually verify loading the unpacked extension and options page behavior.
