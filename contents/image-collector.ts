import type { PlasmoCSConfig } from "plasmo"
import type { ImageInfo, ImageFormat, ImageSourceType } from "~lib/types"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

// 生成唯一ID
function generateId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 从URL或base64提取图片格式
function extractImageFormat(src: string): ImageFormat {
  if (src.startsWith('data:image/')) {
    const match = src.match(/data:image\/(\w+);/)
    if (match) {
      const format = match[1].toLowerCase()
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(format)) {
        return format as ImageFormat
      }
    }
    return 'unknown'
  }

  const urlWithoutQuery = src.split('?')[0].toLowerCase()
  if (urlWithoutQuery.endsWith('.png')) return 'png'
  if (urlWithoutQuery.endsWith('.jpg') || urlWithoutQuery.endsWith('.jpeg')) return 'jpg'
  if (urlWithoutQuery.endsWith('.gif')) return 'gif'
  if (urlWithoutQuery.endsWith('.webp')) return 'webp'
  if (urlWithoutQuery.endsWith('.svg')) return 'svg'
  if (urlWithoutQuery.endsWith('.bmp')) return 'bmp'
  if (urlWithoutQuery.endsWith('.ico')) return 'ico'

  return 'unknown'
}

// 计算base64图片大小
function calculateBase64Size(base64: string): number {
  const base64Data = base64.split(',')[1] || base64
  return Math.floor(base64Data.length * 0.75)
}

// 生成文件名
function generateFilename(src: string, format: ImageFormat, index: number): string {
  if (!src.startsWith('data:')) {
    try {
      const url = new URL(src, window.location.href)
      const pathname = url.pathname
      const filename = pathname.split('/').pop()
      if (filename && filename.includes('.')) {
        return filename
      }
    } catch (e) {
      // URL解析失败，使用默认命名
    }
  }

  const formatExt = format === 'jpg' ? 'jpg' : format === 'unknown' ? 'png' : format
  return `image-${index + 1}.${formatExt}`
}

// 收集img标签图片
function collectImgElements(): ImageInfo[] {
  const images: ImageInfo[] = []
  const imgElements = document.querySelectorAll('img')

  imgElements.forEach((img, index) => {
    const src = img.src || img.currentSrc
    if (!src || src === window.location.href) return

    const format = extractImageFormat(src)
    const isBase64 = src.startsWith('data:')

    images.push({
      id: generateId(),
      src,
      sourceType: 'img',
      format,
      filename: generateFilename(src, format, index),
      width: img.naturalWidth || img.width || undefined,
      height: img.naturalHeight || img.height || undefined,
      size: isBase64 ? calculateBase64Size(src) : undefined,
      alt: img.alt || undefined,
      sourceElement: `img[src="${src.substring(0, 50)}..."]`
    })
  })

  return images
}

// 收集背景图片
function collectBackgroundImages(): ImageInfo[] {
  const images: ImageInfo[] = []
  const elements = document.querySelectorAll('*')
  const seenUrls = new Set<string>()

  elements.forEach((element) => {
    const computed = window.getComputedStyle(element)
    const bgImage = computed.backgroundImage

    if (bgImage && bgImage !== 'none') {
      const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/)
      if (urlMatch) {
        let src = urlMatch[1]

        // 转换相对路径为绝对路径
        if (!src.startsWith('data:') && !src.startsWith('http')) {
          try {
            src = new URL(src, window.location.href).href
          } catch (e) {
            return
          }
        }

        // 去重
        if (seenUrls.has(src)) return
        seenUrls.add(src)

        const format = extractImageFormat(src)
        const isBase64 = src.startsWith('data:')

        images.push({
          id: generateId(),
          src,
          sourceType: 'background',
          format,
          filename: generateFilename(src, format, images.length),
          size: isBase64 ? calculateBase64Size(src) : undefined,
          sourceElement: element.tagName.toLowerCase()
        })
      }
    }
  })

  return images
}

// 收集canvas图片
function collectCanvasImages(): ImageInfo[] {
  const images: ImageInfo[] = []
  const canvases = document.querySelectorAll('canvas')

  canvases.forEach((canvas, index) => {
    try {
      const dataUrl = canvas.toDataURL('image/png')
      images.push({
        id: generateId(),
        src: dataUrl,
        sourceType: 'canvas',
        format: 'png',
        filename: `canvas-${index + 1}.png`,
        width: canvas.width,
        height: canvas.height,
        size: calculateBase64Size(dataUrl),
        sourceElement: `canvas[width="${canvas.width}"][height="${canvas.height}"]`
      })
    } catch (e) {
      // Canvas可能被污染（跨域），无法导出
      console.warn('无法导出canvas图片:', e)
    }
  })

  return images
}

// 收集SVG图片
function collectSvgImages(): ImageInfo[] {
  const images: ImageInfo[] = []

  // SVG标签
  const svgElements = document.querySelectorAll('svg')
  svgElements.forEach((svg, index) => {
    try {
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svg)
      const base64 = btoa(unescape(encodeURIComponent(svgString)))
      const dataUrl = `data:image/svg+xml;base64,${base64}`

      images.push({
        id: generateId(),
        src: dataUrl,
        sourceType: 'svg',
        format: 'svg',
        filename: `svg-${index + 1}.svg`,
        width: svg.clientWidth || undefined,
        height: svg.clientHeight || undefined,
        size: calculateBase64Size(dataUrl),
        sourceElement: 'svg'
      })
    } catch (e) {
      console.warn('无法导出SVG:', e)
    }
  })

  return images
}

// 收集所有图片
function collectAllImages(): ImageInfo[] {
  const allImages: ImageInfo[] = []

  // 收集各类图片
  allImages.push(...collectImgElements())
  allImages.push(...collectBackgroundImages())
  allImages.push(...collectCanvasImages())
  allImages.push(...collectSvgImages())

  // 去重（基于src）
  const uniqueImages = new Map<string, ImageInfo>()
  allImages.forEach(img => {
    const key = img.src.substring(0, 200) // 使用前200个字符作为key
    if (!uniqueImages.has(key)) {
      uniqueImages.set(key, img)
    }
  })

  return Array.from(uniqueImages.values())
}

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COLLECT_IMAGES') {
    try {
      const images = collectAllImages()
      sendResponse({ success: true, images })
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    return true // 保持消息通道开启
  }
})
