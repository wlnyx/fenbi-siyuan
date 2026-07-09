# 粉笔题目收进思源

> 一键将粉笔题库解析页的题目、选项、答案、解析收进思源笔记，方便复习背诵。

Chrome / Edge 浏览器扩展（Manifest V3），专为**政治理论、常识判断等客观题**设计。做完题后，在每道题下方点击「收进思源」按钮，预览编辑后一键写入思源笔记。

## 功能

- **逐题收集**：每道题底部注入「收进思源」按钮，扫码范围限定该题
- **自动解析**：提取题干、选项、正确答案、你的答案、解析、考点、来源、图片
- **预览编辑**：弹窗可改科目、模块、标签、答案、解析后再写入
- **逐题新建文档**：每道题在思源中新建一个文档，方便单独打标签和管理
- **多级标签**：自动生成 `#科目/考点#` 思源多级标签，考点可检索筛选
- **去重**：基于内容哈希 + 规范化 URL，SQL 查询已有文档防止重复收录
- **思源对接**：调用 `/api/filetree/createDocWithMarkdown` 为每道题新建思源文档

## 安装

### 从源码构建

```bash
git clone https://github.com/wlnyx/fenbi-siyuan.git
cd fenbi-siyuan
npm install
npm run build
```

### 加载扩展

1. 打开 `chrome://extensions`（Edge 是 `edge://extensions`）
2. 打开右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择项目 `dist/` 目录
4. 在粉笔做题解析页右下角会出现「收进思源」按钮

## 配置

1. 点击扩展图标打开设置页
2. 填入思源笔地址（默认 `http://127.0.0.1:6806`）
3. 填入思源 API Token（在思源「设置 → 关于」里查看）
4. 填入笔记本 ID（在思源笔记本上右键 → 复制 ID）
5. 填入文件夹路径（如 `/` 或 `/粉笔错题`，新文档将创建在此路径下）
6. 点击「测试连接」确认

## 技术栈

- TypeScript 5 + esbuild 打包
- Manifest V3（Service Worker + Content Script）
- 思源笔记 Kernel HTTP API
- 无框架、无 React，原生 Shadow DOM 弹窗

## 目录结构

```
src/
  manifest.json          # MV3 清单
  background/index.ts    # 后台消息处理，调动思源 API
  content/index.ts       # 内容脚本，注入按钮、预览弹窗
  parser/fenbi.ts        # 粉笔 DOM 解析器
  siyuan/client.ts       # 思源 API 客户端
  shared/                # 类型、设置、格式化、哈希、URL 规范化
  options/               # 扩展设置页
dist/                    # 构建产物（被 .gitignore 忽略）
tests/                   # 原生 node:test 单元测试
```

## 开发

```bash
npm run build       # esbuild 打包输出到 dist/
npm run typecheck   # tsc --noEmit 类型检查
npm test            # build + node --test
```

## 许可

MIT
