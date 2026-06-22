// Instagram-style filters. CSS strings double as canvas ctx.filter values.
export const FILTER_CSS: Record<string, string> = {
  none: 'none',
  warm: 'saturate(1.4) sepia(0.25) contrast(1.05)',
  cool: 'saturate(1.1) hue-rotate(-15deg) brightness(1.05)',
  vivid: 'saturate(1.8) contrast(1.15)',
  fade: 'contrast(0.9) brightness(1.1) saturate(0.8)',
  mono: 'grayscale(1) contrast(1.1)',
  noir: 'grayscale(1) contrast(1.4) brightness(0.9)',
  dream: 'blur(0.4px) saturate(1.3) brightness(1.08) contrast(0.95)',
}
export const FILTER_NAMES = Object.keys(FILTER_CSS)

// Bake a CSS filter into an image File via canvas (so the upload is filtered).
export async function bakeImageFilter(file: File, filterName: string): Promise<File> {
  const css = FILTER_CSS[filterName]
  if (!css || css === 'none') return file
  const img = document.createElement('img')
  const url = URL.createObjectURL(file)
  try {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.filter = css
    ctx.drawImage(img, 0, 0)
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(b => res(b), 'image/jpeg', 0.92))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}
