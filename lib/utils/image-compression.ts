/**
 * Client-side High-Fidelity Image Pre-compression Utility
 *
 * Designed to handle massive smartphone photos (iPhone Pro, Samsung Galaxy, DSLR 10MB - 30MB+)
 * by downscaling to Retina 3x master dimensions (up to 1600px) with visually lossless quality (92%).
 *
 * If the image is already lightweight and reasonably sized, it is passed through untouched
 * to ensure 100% original pixel data is preserved.
 */

export interface OptimizeImageOptions {
  /** Maximum pixel dimension for width or height (default: 1600) */
  maxDimension?: number
  /** JPEG export quality factor 0.0 - 1.0 (default: 0.92 for studio quality) */
  quality?: number
  /** Maximum file size in MB where pre-compression can be skipped if dimensions fit (default: 4) */
  skipThresholdMB?: number
}

export async function optimizeImageForUpload(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<File> {
  const {
    maxDimension = 1600,
    quality = 0.92,
    skipThresholdMB = 4,
  } = options

  // Only process images
  if (!file.type.startsWith('image/')) {
    return file
  }

  // Animated GIFs or SVGs should never be raster-compressed
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height

      // Conditional Pass-Through:
      // If the image is already within acceptable dimensions and size, keep original file untouched!
      const fileSizeMB = file.size / (1024 * 1024)
      if (width <= maxDimension && height <= maxDimension && fileSizeMB <= skipThresholdMB) {
        resolve(file)
        return
      }

      // Calculate aspect-ratio-preserving dimensions
      let targetWidth = width
      let targetHeight = height

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height)
        targetWidth = Math.round(width * ratio)
        targetHeight = Math.round(height * ratio)
      }

      // High-Fidelity Canvas Rendering
      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        // Fallback to original if 2D context is unavailable
        resolve(file)
        return
      }

      // Highest smoothing quality (bicubic filter)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }

          // If the compressed output happens to be larger than the original, keep original
          if (blob.size >= file.size) {
            resolve(file)
            return
          }

          const newFileName = file.name.replace(/\.[^/.]+$/, '.jpg')
          const optimizedFile = new File([blob], newFileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })

          resolve(optimizedFile)
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      // Fallback to original on decoding error
      resolve(file)
    }

    img.src = objectUrl
  })
}
