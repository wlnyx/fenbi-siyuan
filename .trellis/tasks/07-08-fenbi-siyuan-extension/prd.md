# Fenbi to Siyuan Question Collector

## Goal

Build a Chrome/Edge browser extension that collects the current question from a Fenbi answer-analysis page and appends it to a fixed Siyuan document as a clean Markdown question card.

The first version is for memorizing political theory and general-knowledge questions. It should preserve the original question, options, answers, explanation, source link, image links, and tags. It must not add mistake-analysis, review-plan, spaced-repetition, AI summary, or "memory note" features.

## Background

- The user studies with Fenbi and wants to move questions into Siyuan for review.
- The target workflow is one-at-a-time collection from the post-answer analysis page.
- The extension writes directly to the local Siyuan API.
- The user will manually configure the Siyuan base URL, API token, and target document block ID.
- Images should be kept as Markdown links to their original Fenbi URLs in the first version.
- Duplicate collection should be prevented with both a normalized source URL and content hash.

## Requirements

1. The extension must run on Fenbi pages and expose a visible `收进思源` action on supported question-analysis pages.
2. Clicking `收进思源` must parse the current page into structured question data:
   - source URL
   - normalized URL key
   - content hash
   - title
   - subject
   - module
   - question text
   - options
   - user's answer
   - correct answer
   - explanation
   - image URLs
   - tags
   - capture timestamp
3. The extension must show a preview editor before writing to Siyuan.
4. The preview editor must allow editing subject, module, tags, question text, options, user answer, correct answer, and explanation.
5. The extension must format the confirmed data into Markdown using only the agreed core fields: source, link, fingerprint, question, options, answers, explanation, images, and tags.
6. The extension must store settings for:
   - Siyuan base URL, defaulting to `http://127.0.0.1:6806`
   - Siyuan API token
   - target document block ID
7. The options page must provide a test-connection action.
8. Before appending a question, the extension must check whether the target document already contains the same `fenbi:<contentHash>` fingerprint or normalized source URL.
9. If the question already exists, the extension must show a duplicate message and avoid appending.
10. If the question does not exist, the extension must append the Markdown question card to the target document through the Siyuan API.
11. The UI must show clear failure messages for missing settings, Siyuan connection failure, invalid target block ID, parse failure, duplicate question, and write failure.

## Out Of Scope

- Batch import from Fenbi wrong-question pages.
- Automatic Siyuan document creation.
- Downloading Fenbi images into Siyuan assets.
- AI-generated summaries, memory notes, mistake reasons, or review plans.
- Full coverage of every Fenbi question type in the first version.
- Browser store packaging and publishing.

## Acceptance Criteria

- [ ] Loading the unpacked extension in Chromium-based browsers succeeds without manifest errors.
- [ ] The options page saves and reloads Siyuan base URL, API token, and target block ID.
- [ ] The options page can test the Siyuan connection and report success or failure.
- [ ] On a Fenbi page, the extension can inject a `收进思源` button.
- [ ] Clicking the button opens a preview editor populated by the parser.
- [ ] The preview editor can save edited data through the background service worker.
- [ ] The formatter emits Markdown with question, options, answers, explanation, image links, source link, fingerprint, and tags, without mistake/review/memory-note sections.
- [ ] Duplicate detection checks both `fenbi:<contentHash>` and normalized URL before writing.
- [ ] A new question is appended to the configured Siyuan target document.
- [ ] Duplicate, parse, configuration, connection, and write errors are visible to the user.
- [ ] Core parser, formatter, hash, URL normalization, settings, and Siyuan client behavior have automated coverage where practical.
