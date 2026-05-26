# HTML2PPT Demo

基于 Vue 3 + Vite + JavaScript 的本地 HTML 导出 PPTX 工具，使用 `dom-to-pptx` 在浏览器端完成导出。

## 使用

1. 安装依赖

```bash
npm install
```

2. 启动开发环境

```bash
npm run dev
```

3. 在页面中：

- 选择多个 `.html/.htm` 文件；
- 或选择整个目录（包含 HTML、CSS、图片、字体等资源）；
- 点击左侧某个 HTML 预览；
- 点击“导出当前 HTML”导出当前文件；
- 点击“导出全部 HTML”导出一个多页 `all-html-files.pptx`。

## 说明

- 工具优先导出 `.slide`，否则回退 `#slide`、`.slide-container`、`body`。
- 本地资源会重写为 blob URL；找不到资源会显示 warning。
- 若页面依赖复杂运行时 JS，请先确保 iframe 内已经渲染完成再导出。
- 中文乱码排查建议：
  - 确认 HTML 使用 `UTF-8`（`<meta charset="UTF-8">`）；
  - 尽量使用明确的中文字体（如 `Noto Sans SC` / `Microsoft YaHei`），并确保字体文件可被本地目录模式读取；
  - 当前默认 `svgAsVector: false` 以降低部分 Office 环境中文乱码概率；若追求矢量文本可改回 `true` 并验证字体可用性。

- 页面提供“字体诊断”按钮：会扫描当前预览中的中文文本元素并展示其最终 `font-family`，用于排查字体回退导致的乱码。
