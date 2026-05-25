<template>
  <div class="app">
    <header class="toolbar">
      <div>
        <label>选择 HTML 文件：</label>
        <input type="file" accept=".html,.htm,text/html" multiple @change="onSelectHtmlFiles" />
      </div>
      <div>
        <label>选择目录（可选）：</label>
        <input type="file" webkitdirectory multiple @change="onSelectDirectory" />
      </div>
      <p class="notice">安全提示：iframe 允许脚本执行，请仅加载可信本地 HTML。</p>
    </header>

    <main class="layout">
      <aside class="sidebar">
        <h3>HTML 列表</h3>
        <ul>
          <li v-for="item in htmlFiles" :key="item.path">
            <button :class="{ active: item.path === activePath }" @click="setActive(item.path)">{{ item.path }}</button>
          </li>
        </ul>
      </aside>

      <section class="preview">
        <div class="actions">
          <button :disabled="!activePath || loading" @click="exportCurrent">导出当前 HTML</button>
          <button :disabled="!htmlFiles.length || loading" @click="exportAll">导出全部 HTML</button>
          <span v-if="loading">导出中...</span>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <ul v-if="warnings.length" class="warnings">
          <li v-for="(w, idx) in warnings" :key="idx">⚠️ {{ w }}</li>
        </ul>
        <iframe ref="iframeRef" sandbox="allow-scripts allow-same-origin" :srcdoc="previewHtml"></iframe>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { buildFileMap, revokeAllObjectUrls } from './utils/fileMap'
import { rewriteHtmlAssets } from './utils/rewriteAssets'
import { cloneIframeToStage, collectExportTargets, createOffscreenStage, exportFromIframe, exportTargetsToPptx } from './utils/exportHtmlToPptx'

const fileMap = ref(new Map())
const htmlFiles = ref([])
const activePath = ref('')
const previewHtml = ref('')
const warnings = ref([])
const error = ref('')
const loading = ref(false)
const iframeRef = ref(null)
const objectUrlCache = new Map()

const activeFile = computed(() => htmlFiles.value.find((f) => f.path === activePath.value) || null)

function resetAssets() {
  revokeAllObjectUrls(objectUrlCache)
  previewHtml.value = ''
  warnings.value = []
}

function updateFileState(files) {
  resetAssets()
  fileMap.value = buildFileMap(files)
  htmlFiles.value = files
    .filter((f) => /\.html?$/i.test(f.name))
    .map((f) => ({ path: (f.webkitRelativePath || f.name).replaceAll('\\', '/'), file: f }))

  activePath.value = htmlFiles.value[0]?.path || ''
  if (activePath.value) loadPreview(activePath.value)
}

function onSelectHtmlFiles(e) {
  updateFileState([...(e.target.files || [])])
}

function onSelectDirectory(e) {
  updateFileState([...(e.target.files || [])])
}

async function loadPreview(path) {
  error.value = ''
  const item = htmlFiles.value.find((h) => h.path === path)
  if (!item) return
  activePath.value = path
  const htmlText = await item.file.text()
  const result = await rewriteHtmlAssets(htmlText, item.path, fileMap.value, objectUrlCache)
  previewHtml.value = result.html
  warnings.value = result.warnings
}

async function setActive(path) {
  await loadPreview(path)
}

function waitIframeLoad() {
  return new Promise((resolve) => {
    const iframe = iframeRef.value
    if (!iframe) return resolve()
    iframe.onload = () => resolve()
    if (iframe.contentDocument?.readyState === 'complete') resolve()
  })
}

function appendSlideSizeWarnings() {
  if (!iframeRef.value?.contentDocument) return
  const stageDoc = iframeRef.value.contentDocument
  const slides = collectExportTargets(stageDoc.body || stageDoc)
  slides.forEach((slide, idx) => {
    const style = stageDoc.defaultView.getComputedStyle(slide)
    if ((!style.width || style.width === 'auto') || (!style.height || style.height === 'auto')) {
      warnings.value.push(`Slide #${idx + 1} 缺少明确尺寸，建议 width:1920px;height:1080px;position:relative;overflow:hidden;`)
    }
  })
}

async function exportCurrent() {
  if (!activeFile.value || !iframeRef.value) return
  error.value = ''
  loading.value = true
  try {
    await waitIframeLoad()
    await exportFromIframe({ iframe: iframeRef.value, fileName: `${activeFile.value.file.name.replace(/\.html?$/i, '')}.pptx` })
    appendSlideSizeWarnings()
  } catch (e) {
    error.value = `导出失败：${e?.message || e}`
  } finally {
    loading.value = false
  }
}

async function exportAll() {
  if (!htmlFiles.value.length || !iframeRef.value) return
  error.value = ''
  loading.value = true
  const stage = createOffscreenStage()
  const allTargets = []
  try {
    for (const item of htmlFiles.value) {
      await loadPreview(item.path)
      await waitIframeLoad()
      const targets = await cloneIframeToStage(iframeRef.value, stage)
      allTargets.push(...targets)
    }
    await exportTargetsToPptx(allTargets, 'all-html-files.pptx')
  } catch (e) {
    error.value = `批量导出失败：${e?.message || e}`
  } finally {
    stage.remove()
    loading.value = false
  }
}

onBeforeUnmount(() => {
  resetAssets()
})
</script>

<style scoped>
.app { padding: 16px; font-family: Arial, sans-serif; }
.toolbar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.notice { color: #ad6800; }
.layout { display: grid; grid-template-columns: 280px 1fr; gap: 12px; min-height: 75vh; }
.sidebar { border: 1px solid #ddd; padding: 8px; overflow: auto; }
.sidebar button { width: 100%; text-align: left; padding: 6px; border: 1px solid #ddd; background: #fff; }
.sidebar button.active { background: #e6f4ff; border-color: #91caff; }
.preview { border: 1px solid #ddd; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.actions { display: flex; gap: 8px; align-items: center; }
iframe { width: 100%; height: 65vh; border: 1px solid #ccc; }
.warnings { margin: 0; padding-left: 20px; color: #d48806; }
.error { color: #cf1322; }
</style>
