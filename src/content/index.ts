import { parseFenbiQuestion } from '../parser/fenbi';
import { computeQuestionHash } from '../shared/hash';
import type { BackgroundResponse, FenbiQuestion } from '../shared/types';
import { normalizeFenbiUrl } from '../shared/url';

const BUTTON_CLASS = 'fenbi-siyuan-btn';
const MODAL_ID = 'fenbi-siyuan-preview-root';

const QUESTION_SELECTORS = [
  'app-ti[data-question-key]',
  '.questions-single-container',
];

function sendMessage<TResponse>(message: unknown): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage<TResponse>(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? '\u6269\u5c55\u540e\u53f0\u65e0\u54cd\u5e94'));
        return;
      }
      resolve(response);
    });
  });
}

function showToast(message: string): void {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = [
    'position:fixed',
    'right:24px',
    'bottom:86px',
    'z-index:2147483647',
    'max-width:360px',
    'padding:12px 20px',
    'border-radius:20px',
    'background:#F0F7FF',
    'color:#4A90E2',
    'font-size:14px',
    'font-weight:600',
    'box-shadow:0 8px 24px rgba(138,191,255,0.25)',
    'border:1px solid rgba(138,191,255,0.3)'
  ].join(';');
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function parseKeypoints(value: string): string[] {
  return value
    .split(/[,\s\u3001]+/)
    .map((kp) => kp.trim())
    .filter(Boolean);
}

function parseOptions(value: string): Array<{ label: string; text: string }> {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^([A-H])[\s.\u3001\u3000\uff1a\u0020]+(.+)$/);
      if (match) return { label: match[1], text: match[2].trim() };
      return { label: String.fromCharCode(65 + index), text: line };
    });
}

function optionText(question: FenbiQuestion): string {
  return question.options.map((option) => `${option.label}. ${option.text}`).join('\n');
}

function field(root: ShadowRoot, name: string): HTMLInputElement | HTMLTextAreaElement {
  const el = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
  if (!el) throw new Error(`\u7f3a\u5c11\u5b57\u6bb5 ${name}`);
  return el;
}

async function questionFromForm(root: ShadowRoot, original: FenbiQuestion): Promise<FenbiQuestion> {
  const q: FenbiQuestion = {
    ...original,
    url: original.url || location.href,
    urlKey: normalizeFenbiUrl(original.url || location.href),
    subject: field(root, 'subject').value.trim(),
    module: field(root, 'module').value.trim(),
    questionText: field(root, 'questionText').value.trim(),
    options: parseOptions(field(root, 'options').value),
    userAnswer: field(root, 'userAnswer').value.trim(),
    correctAnswer: field(root, 'correctAnswer').value.trim(),
    analysis: field(root, 'analysis').value.trim(),
    keypoints: parseKeypoints(field(root, 'keypoints').value),
    capturedAt: original.capturedAt || new Date().toISOString().slice(0, 10)
  };
  q.contentHash = await computeQuestionHash(q);
  return q;
}

function removePreview(): void {
  document.getElementById(MODAL_ID)?.remove();
}

// Persist last-used subject/module so the next collection defaults to them.
const MEMORY_KEY = 'fenbiSiyuanMemory';
type FieldMemory = { subject: string; module: string };

function loadFieldMemory(): Promise<FieldMemory> {
  return new Promise((resolve) => {
    chrome.storage.local.get(MEMORY_KEY, (items) => {
      const m = items[MEMORY_KEY] as FieldMemory | undefined;
      resolve(m ?? { subject: '', module: '' });
    });
  });
}

function saveFieldMemory(values: FieldMemory): void {
  chrome.storage.local.set({ [MEMORY_KEY]: values });
}

async function openPreview(question: FenbiQuestion): Promise<void> {
  removePreview();
  // Load remembered subject/module first so the form builds with them. Memory
  // takes priority over parsed values: a student who set a custom subject keeps
  // it across questions instead of fighting an overeager parser default.
  const memory = await loadFieldMemory();
  const host = document.createElement('div');
  host.id = MODAL_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif; }
      .kawaii-scroll::-webkit-scrollbar { width: 8px; }
      .kawaii-scroll::-webkit-scrollbar-track { background: transparent; }
      .kawaii-scroll::-webkit-scrollbar-thumb { background: #BFE0FF; border-radius: 20px; }
      .kawaii-scroll::-webkit-scrollbar-thumb:hover { background: #8ABFFF; }
      .ease-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
      .backdrop {
        position: fixed; inset: 0; z-index: 2147483647;
        background: rgba(235, 244, 255, 0.6);
        backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
      }
      .panel {
        background: #FAFDFF;
        border-radius: 32px;
        box-shadow: 0 16px 40px rgba(138, 191, 255, 0.2);
        border: 2px solid white;
        width: min(640px, calc(100vw - 48px));
        max-height: calc(100vh - 48px);
        display: flex; flex-direction: column;
        position: relative; overflow: hidden;
      }
      .header {
        padding: 32px 32px 12px 32px;
        display: flex; justify-content: space-between; align-items: center;
        position: relative; z-index: 10;
      }
      .header h2 {
        margin: 0;
        font-size: 24px; font-weight: 900;
        color: #52606D; letter-spacing: 0.05em;
        display: flex; align-items: center; gap: 8px;
      }
      .header h2 .cloud { font-size: 26px; }
      .close-btn {
        color: #B0C4D9;
        padding: 8px;
        border-radius: 50%;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        cursor: pointer;
        border: none; background: transparent;
        display: flex; align-items: center;
      }
      .close-btn:hover { color: #5A9CF8; background: #F0F7FF; }
      .close-btn:active { transform: scale(0.9); }
      .body {
        padding: 16px 32px 16px 32px;
        overflow-y: auto;
        display: flex; flex-direction: column; gap: 20px;
      }
      .row { display: flex; gap: 16px; }
      .row > * { flex: 1; }
      .field-group { display: flex; flex-direction: column; }
      .field-label {
        font-size: 14px; font-weight: 700;
        color: #8BA0B2; padding-left: 4px; margin-bottom: 8px;
        transition: color 0.3s;
      }
      .field-group:focus-within .field-label { color: #5A9CF8; }
      input, textarea {
        box-sizing: border-box; width: 100%;
        background: white;
        border: 2px solid #F0F5FA;
        border-radius: 20px;
        padding: 12px 20px;
        font-size: 14px; font-weight: 500;
        color: #52606D;
        outline: none;
        transition: all 0.3s ease-out;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      }
      input:hover, textarea:hover { border-color: #CBE0FF; }
      input:focus, textarea:focus {
        border-color: #8ABFFF;
        box-shadow: 0 0 0 4px rgba(138, 191, 255, 0.2);
        background: white;
      }
      textarea {
        border-radius: 24px;
        padding: 16px 20px;
        font-size: 15px;
        line-height: 1.6;
        resize: vertical;
        min-height: 80px;
      }
      textarea.large { min-height: 112px; }
      .tags-wrapper {
        display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
        background: white;
        border: 2px solid #F0F5FA;
        border-radius: 20px;
        padding: 8px 12px;
        transition: all 0.3s ease-out;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      }
      .tags-wrapper:hover { border-color: #CBE0FF; }
      .tags-wrapper:focus-within {
        border-color: #8ABFFF;
        box-shadow: 0 0 0 4px rgba(138, 191, 255, 0.2);
      }
      .tags-wrapper input {
        flex: 1; min-width: 80px;
        border: none !important;
        padding: 4px 4px;
        background: transparent !important;
        box-shadow: none !important;
        font-size: 14px; font-weight: 500;
        color: #52606D;
      }
      .tags-wrapper input:focus {
        box-shadow: none !important;
        border-color: transparent !important;
      }
      .green-input {
        background: #F2FBF6 !important;
        border-color: #A7E6C4 !important;
        color: #319B68 !important;
        font-weight: 900 !important;
        text-align: center;
      }
.green-input:focus {
        background: #E8F8EF !important;
        border-color: #73D59F !important;
        box-shadow: 0 0 0 4px rgba(115, 213, 159, 0.2) !important;
      }
      .footer {
        padding: 20px 32px;
        background: linear-gradient(to top, #FAFDFF, transparent);
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 16px;
        border-radius: 0 0 32px 32px;
      }
      .status-msg { color: #6B7F94; font-size: 13px; margin-right: auto; }
      .btn {
        border-radius: 9999px;
        font-size: 15px; font-weight: 700;
        padding: 12px 28px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: none;
      }
      .btn-ghost {
        background: transparent;
        color: #A5B6C7;
      }
      .btn-ghost:hover {
        background: #F0F7FF;
        color: #5A9CF8;
        transform: translateY(-4px);
      }
      .btn-primary {
        background: linear-gradient(to right, #8AC4FF, #5A9CF8);
        color: white;
        font-weight: 900;
        font-size: 16px;
        box-shadow: 0 8px 20px rgba(90, 156, 248, 0.3);
        display: flex; align-items: center; gap: 8px;
      }
      .btn-primary:hover {
        box-shadow: 0 12px 24px rgba(90, 156, 248, 0.45);
        transform: translateY(-4px);
      }
      .btn-primary:active {
        transform: scale(0.95) translateY(0);
      }
    </style>
    <div class="backdrop">
      <section class="panel">
        <div class="header">
          <h2><span class="cloud">☁️</span> 收进思源</h2>
          <button class="close-btn" name="close">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="body kawaii-scroll">
          <div class="row">
            <div class="field-group">
              <label class="field-label">📚 科目</label>
              <input name="subject" />
            </div>
            <div class="field-group">
              <label class="field-label">📁 模块</label>
              <input name="module" />
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">🎯 考点</label>
            <input name="keypoints" placeholder="唯物论 认识论" />
          </div>
          <div class="field-group">
            <label class="field-label">📝 题目</label>
            <textarea class="large kawaii-scroll" name="questionText"></textarea>
          </div>
          <div class="field-group">
            <label class="field-label">📋 选项</label>
            <textarea class="kawaii-scroll" name="options"></textarea>
          </div>
          <div class="row">
            <div class="field-group">
              <label class="field-label">📝 我的答案</label>
              <input name="userAnswer" />
            </div>
            <div class="field-group">
              <label class="field-label">✅ 正确答案</label>
              <input class="green-input" name="correctAnswer" />
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">💡 解析</label>
            <textarea class="large kawaii-scroll" name="analysis"></textarea>
          </div>
        </div>
        <div class="footer">
          <div class="status-msg" part="status"></div>
          <button class="btn btn-ghost" name="cancel">取消</button>
          <button class="btn btn-primary" name="save"><span>✨</span> 确认写入</button>
        </div>
      </section>
    </div>
  `;
  document.body.append(host);

  // Memory takes priority; fall back to parser output when stored value is empty.
  field(shadow, 'subject').value = memory.subject || question.subject || '';
  field(shadow, 'module').value = memory.module || question.module || '';
  field(shadow, 'keypoints').value = question.keypoints.join(' ');
  field(shadow, 'questionText').value = question.questionText;
  field(shadow, 'options').value = optionText(question);
  field(shadow, 'userAnswer').value = question.userAnswer ?? '';
  field(shadow, 'correctAnswer').value = question.correctAnswer ?? '';
  field(shadow, 'analysis').value = question.analysis ?? '';

  const status = shadow.querySelector<HTMLElement>('[part="status"]');
  shadow.querySelector('[name="close"]')?.addEventListener('click', removePreview);
  shadow.querySelector('[name="cancel"]')?.addEventListener('click', removePreview);
  shadow.querySelector('[name="save"]')?.addEventListener('click', async () => {
    try {
      if (status) status.textContent = '正在写入...';
      const editedQuestion = await questionFromForm(shadow, question);
      const response = await sendMessage<BackgroundResponse>({
        type: 'SAVE_QUESTION',
        question: editedQuestion
      });
      if (!response.ok) {
        if (status) status.textContent = response.message;
        return;
      }
      if (response.status === 'duplicate') {
        if (status) status.textContent = '已收录，不重复追加';
        return;
      }
      saveFieldMemory({
        subject: editedQuestion.subject ?? '',
        module: editedQuestion.module ?? ''
      });
      removePreview();
      showToast('已写入思源');
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : '写入失败';
    }
  });
}

// --- Per-question button logic ---

function isDescendant(parent: Element, child: Element): boolean {
  let node: Element | null = child;
  while (node) {
    if (node === parent) return true;
    node = node.parentElement;
  }
  return false;
}

function findQuestionContainers(): HTMLElement[] {
  const nodes = new Map<HTMLElement, number>();

  for (const selector of QUESTION_SELECTORS) {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    for (const el of elements) {
      const textLen = el.innerText.length;
      if (textLen < 120) continue;

      // Keep or replace based on nesting
      let dominant = true;
      for (const [existing] of nodes) {
        if (isDescendant(el, existing)) {
          // existing is deeper, replace it with this ancestor
          nodes.delete(existing);
        } else if (isDescendant(existing, el)) {
          // existing is ancestor, skip this one
          dominant = false;
          break;
        }
      }
      if (dominant) {
        nodes.set(el, textLen);
      }
    }
  }

  return Array.from(nodes.keys());
}

async function handleCollectQuestion(container: HTMLElement, event: MouseEvent): Promise<void> {
  event.stopPropagation();
  try {
    const question = await parseFenbiQuestion(document, container);
    await openPreview(question);
  } catch (error) {
    showToast(error instanceof Error ? error.message : '\u89e3\u6790\u7c89\u7b14\u9898\u76ee\u5931\u8d25');
  }
}

function createCollectButton(container: HTMLElement): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = BUTTON_CLASS;
  el.textContent = '\u6536\u8fdb\u601d\u6e90';
  el.title = '\u5c06\u6b64\u9898\u6536\u5f55\u5230\u601d\u6e90\u7b14\u8bb0';
  el.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    'margin:8px 0 4px auto',
    'padding:5px 12px',
    'border:1px solid #2563eb',
    'border-radius:6px',
    'background:#2563eb',
    'color:#fff',
    'font-size:12px',
    'font-weight:500',
    'cursor:pointer',
    'line-height:1.4',
    'transition:opacity .15s',
  ].join(';');

  el.addEventListener('click', (e) => void handleCollectQuestion(container, e));
  return el;
}

function injectQuestionButtons(): void {
  const containers = findQuestionContainers();
  for (const container of containers) {
    // Skip if already has a button
    if (container.querySelector(`.${BUTTON_CLASS}`)) continue;
    // Add button at the end of the container
    const btn = createCollectButton(container);
    container.appendChild(btn);
  }
}

// Watch for dynamically loaded content
function setupObserver(): void {
  const observer = new MutationObserver(() => {
    injectQuestionButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectQuestionButtons();
    setupObserver();
  });
} else {
  injectQuestionButtons();
  setupObserver();
}
