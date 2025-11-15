import { useState, useEffect } from "react"
import type { ImageInfo } from "~lib/types"
import "./images.css"

function ImagesPage() {
  const [images, setImages] = useState<ImageInfo[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  // 加载图片数据
  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_COLLECTED_IMAGES' })
      if (response.images) {
        setImages(response.images)
      }
    } catch (error) {
      console.error('加载图片失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(images.map(img => img.id)))
    }
  }

  // 切换单个图片选中状态
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // 格式化文件大小
  const formatSize = (bytes?: number): string => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // 下载单个图片
  const downloadImage = async (image: ImageInfo) => {
    try {
      let url = image.src
      let filename = image.filename

      // 如果是base64，转换为Blob URL
      if (url.startsWith('data:')) {
        const response = await fetch(url)
        const blob = await response.blob()
        url = URL.createObjectURL(blob)
      }

      // 使用chrome.downloads API下载
      await chrome.downloads.download({
        url,
        filename,
        saveAs: false
      })
    } catch (error) {
      console.error('下载失败:', error)
      alert(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 批量下载
  const downloadSelected = async () => {
    if (selectedIds.size === 0) {
      alert('请先选择要下载的图片')
      return
    }

    setDownloading(true)

    try {
      const selectedImages = images.filter(img => selectedIds.has(img.id))

      for (const image of selectedImages) {
        await downloadImage(image)
        // 添加延迟避免浏览器限制
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      alert(`成功下载 ${selectedImages.length} 张图片`)
    } catch (error) {
      console.error('批量下载失败:', error)
      alert('批量下载时出错')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="images-page">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="images-page">
        <div className="empty">未找到任何图片</div>
      </div>
    )
  }

  return (
    <div className="images-page">
      <header className="page-header">
        <h1>页面图片管理</h1>
        <div className="header-info">
          共找到 {images.length} 张图片，已选择 {selectedIds.size} 张
        </div>
      </header>

      <div className="toolbar">
        <button onClick={toggleSelectAll} className="btn btn-secondary">
          {selectedIds.size === images.length ? '取消全选' : '全选'}
        </button>
        <button
          onClick={downloadSelected}
          disabled={selectedIds.size === 0 || downloading}
          className="btn btn-primary"
        >
          {downloading ? '下载中...' : `下载选中 (${selectedIds.size})`}
        </button>
      </div>

      <div className="images-grid">
        {images.map(image => (
          <div key={image.id} className="image-card">
            <div className="image-checkbox">
              <input
                type="checkbox"
                checked={selectedIds.has(image.id)}
                onChange={() => toggleSelect(image.id)}
              />
            </div>

            <div className="image-preview">
              <img src={image.src} alt={image.alt || image.filename} />
            </div>

            <div className="image-info">
              <div className="image-filename" title={image.filename}>
                {image.filename}
              </div>
              <div className="image-meta">
                <span className="badge badge-type">{image.sourceType}</span>
                <span className="badge badge-format">{image.format}</span>
              </div>
              <div className="image-details">
                {image.width && image.height && (
                  <span>{image.width} × {image.height}</span>
                )}
                {image.size && <span>{formatSize(image.size)}</span>}
              </div>
            </div>

            <button
              onClick={() => downloadImage(image)}
              className="btn-download"
              title="下载此图片"
            >
              ⬇
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ImagesPage
