export async function waitForIframeStable(iframe) {
  if (!iframe?.contentDocument) throw new Error('iframe not ready')
  const doc = iframe.contentDocument

  if (doc.fonts?.ready) {
    await doc.fonts.ready
  }

  const images = [...doc.querySelectorAll('img')]
  await Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) return resolve()
          img.addEventListener('load', resolve, { once: true })
          img.addEventListener('error', resolve, { once: true })
        }),
    ),
  )

  await new Promise((resolve) => setTimeout(resolve, 300))
}
