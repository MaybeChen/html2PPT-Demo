const SKIP_PROTOCOLS = ['http://', 'https://', 'data:', 'blob:', '#', 'mailto:', 'tel:']

export function isSkippableUrl(rawUrl = '') {
  const value = String(rawUrl).trim().toLowerCase()
  return SKIP_PROTOCOLS.some((p) => value.startsWith(p))
}

export function buildFileMap(files) {
  const map = new Map()
  for (const file of files || []) {
    const key = (file.webkitRelativePath || file.name || '').replaceAll('\\\\', '/')
    if (key) map.set(normalizePath(key), file)
  }
  return map
}

export function normalizePath(path) {
  const input = String(path || '').replaceAll('\\\\', '/')
  const parts = []
  for (const seg of input.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') {
      parts.pop()
      continue
    }
    parts.push(seg)
  }
  return parts.join('/')
}

function dirname(path) {
  const normalized = normalizePath(path)
  const idx = normalized.lastIndexOf('/')
  return idx === -1 ? '' : normalized.slice(0, idx)
}

export function resolveToFilePath(currentHtmlPath, rawUrl) {
  const source = String(rawUrl || '').trim()
  const urlNoHash = source.split('#')[0]
  const [pathPart] = urlNoHash.split('?')
  const htmlDir = dirname(currentHtmlPath)
  const cleanPath = pathPart.startsWith('/') ? pathPart.slice(1) : pathPart
  return normalizePath(pathPart.startsWith('/') ? cleanPath : [htmlDir, cleanPath].filter(Boolean).join('/'))
}

export function resolveLocalAssetUrl(currentHtmlPath, rawUrl, fileMap, objectUrlCache) {
  if (!rawUrl) return rawUrl
  const source = String(rawUrl).trim()
  if (isSkippableUrl(source)) return source

  const urlNoHash = source.split('#')[0]
  const [, query = ''] = urlNoHash.split('?')
  const resolvedPath = resolveToFilePath(currentHtmlPath, source)

  const found = fileMap.get(resolvedPath)
  if (!found) return source

  if (!objectUrlCache.has(resolvedPath)) {
    objectUrlCache.set(resolvedPath, URL.createObjectURL(found))
  }

  const objectUrl = objectUrlCache.get(resolvedPath)
  const querySuffix = query ? `?${query}` : ''
  return `${objectUrl}${querySuffix}`
}

export function revokeAllObjectUrls(objectUrlCache) {
  for (const url of objectUrlCache.values()) URL.revokeObjectURL(url)
  objectUrlCache.clear()
}
