import { isSkippableUrl, resolveLocalAssetUrl, resolveToFilePath } from './fileMap'

const URL_RE = /url\((['"]?)(.*?)\1\)/g

function rewriteCssUrls(cssText, htmlPath, fileMap, objectUrlCache, warnings, context) {
  return cssText.replace(URL_RE, (full, quote, value) => {
    const raw = String(value || '').trim()
    if (!raw || isSkippableUrl(raw)) return full
    const resolved = resolveLocalAssetUrl(htmlPath, raw, fileMap, objectUrlCache)
    if (resolved === raw) {
      warnings.push(`[${context}] Missing CSS asset: ${raw}`)
      return full
    }
    return `url(${quote}${resolved}${quote})`
  })
}

async function rewriteLinkedCss(doc, htmlPath, fileMap, objectUrlCache, warnings) {
  const links = [...doc.querySelectorAll('link[href]')]
  for (const link of links) {
    const href = link.getAttribute('href')
    if (!href || isSkippableUrl(href)) continue

    const filePath = resolveToFilePath(htmlPath, href)
    const cssFile = fileMap.get(filePath)
    if (!cssFile) {
      warnings.push(`[link] Missing stylesheet: ${href}`)
      continue
    }

    const cssText = await cssFile.text()
    const rewritten = rewriteCssUrls(cssText, filePath, fileMap, objectUrlCache, warnings, `css:${filePath}`)
    const cacheKey = `__rewritten_css__:${filePath}`
    if (objectUrlCache.has(cacheKey)) URL.revokeObjectURL(objectUrlCache.get(cacheKey))
    const cssBlobUrl = URL.createObjectURL(new Blob([rewritten], { type: 'text/css' }))
    objectUrlCache.set(cacheKey, cssBlobUrl)
    link.setAttribute('href', cssBlobUrl)
  }
}

export async function rewriteHtmlAssets(htmlText, htmlPath, fileMap, objectUrlCache) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlText, 'text/html')
  const warnings = []

  const attrTargets = [
    ['img', 'src'],
    ['link', 'href'],
    ['source', 'src'],
    ['video', 'src'],
    ['video', 'poster'],
    ['audio', 'src'],
    ['script', 'src'],
  ]

  for (const [selector, attr] of attrTargets) {
    for (const el of doc.querySelectorAll(`${selector}[${attr}]`)) {
      const raw = el.getAttribute(attr)
      if (!raw) continue
      const resolved = resolveLocalAssetUrl(htmlPath, raw, fileMap, objectUrlCache)
      if (resolved === raw && !isSkippableUrl(raw)) warnings.push(`[${selector}] Missing asset: ${raw}`)
      el.setAttribute(attr, resolved)
    }
  }

  for (const styleEl of doc.querySelectorAll('style')) {
    styleEl.textContent = rewriteCssUrls(styleEl.textContent || '', htmlPath, fileMap, objectUrlCache, warnings, 'inline-style')
  }

  await rewriteLinkedCss(doc, htmlPath, fileMap, objectUrlCache, warnings)

  return { html: '<!doctype html>\n' + doc.documentElement.outerHTML, warnings }
}
