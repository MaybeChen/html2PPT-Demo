import { exportToPptx } from 'dom-to-pptx'
import { waitForIframeStable } from './waitForRender'

export function collectExportTargets(stage) {
  const slides = [...stage.querySelectorAll('.slide')]
  if (slides.length) return slides
  const byId = stage.querySelector('#slide')
  if (byId) return [byId]
  const container = stage.querySelector('.slide-container')
  if (container) return [container]
  return [stage.querySelector('body') || stage]
}

export function createOffscreenStage() {
  const stage = document.createElement('div')
  stage.style.cssText = 'position:fixed;left:-100000px;top:0;width:auto;height:auto;pointer-events:none;opacity:0;'
  document.body.appendChild(stage)
  return stage
}

function cleanTextForPpt(node) {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
  const cleaned = []
  while (walker.nextNode()) {
    const textNode = walker.currentNode
    const raw = textNode.nodeValue || ''
    const normalized = raw
      .normalize('NFC')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    if (normalized !== raw) {
      textNode.nodeValue = normalized
      cleaned.push({ before: raw.slice(0, 24), after: normalized.slice(0, 24) })
    }
  }
  return cleaned
}

export async function cloneIframeToStage(iframe, stage, options = {}) {
  await waitForIframeStable(iframe)
  const container = document.createElement('section')
  const clonedRoot = iframe.contentDocument.documentElement.cloneNode(true)
  const cleanedTextNodes = options.sanitizeText ? cleanTextForPpt(clonedRoot) : []
  container.appendChild(clonedRoot)
  stage.appendChild(container)
  return { targets: collectExportTargets(container), cleanedTextNodes }
}

export async function exportTargetsToPptx(targets, fileName) {
  await exportToPptx(targets, {
    fileName,
    autoEmbedFonts: true,
    // 为了降低中文在部分 Office 环境下的乱码风险，默认关闭 SVG 矢量文本导出。
    // 如需更高矢量质量可改回 true，但需确保字体可用/可嵌入。
    svgAsVector: false,
    layout: 'LAYOUT_WIDE',
    skipDownload: false,
  })
}

export async function exportFromIframe({ iframe, fileName, sanitizeText = true }) {
  const stage = createOffscreenStage()
  try {
    const { targets, cleanedTextNodes } = await cloneIframeToStage(iframe, stage, { sanitizeText })
    await exportTargetsToPptx(targets, fileName)
    return { targetsCount: targets.length, cleanedTextNodes }
  } finally {
    stage.remove()
  }
}
