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

export async function cloneIframeToStage(iframe, stage) {
  await waitForIframeStable(iframe)
  const container = document.createElement('section')
  const clonedRoot = iframe.contentDocument.documentElement.cloneNode(true)
  container.appendChild(clonedRoot)
  stage.appendChild(container)
  return collectExportTargets(container)
}

export async function exportTargetsToPptx(targets, fileName) {
  await exportToPptx(targets, {
    fileName,
    autoEmbedFonts: true,
    svgAsVector: true,
    layout: 'LAYOUT_WIDE',
    skipDownload: false,
  })
}

export async function exportFromIframe({ iframe, fileName }) {
  const stage = createOffscreenStage()
  try {
    const targets = await cloneIframeToStage(iframe, stage)
    await exportTargetsToPptx(targets, fileName)
    return { targetsCount: targets.length }
  } finally {
    stage.remove()
  }
}
