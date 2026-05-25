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
