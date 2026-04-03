'use client'
import { useRef, useState } from 'react'

interface Props {
  onUpload: (url: string) => void
}

export function ImageUploadButton({ onUpload }: Props) {
  const ref        = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res  = await fetch('/api/upload', { method: 'POST', body: formData })
      const { url } = await res.json()
      onUpload(url)
    } catch (err) {
      console.error('업로드 실패:', err)
    } finally {
      setLoading(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        disabled={loading}
        onClick={() => ref.current?.click()}
        className="px-2 py-1 text-xs rounded border border-blue-200 bg-blue-50 text-blue-600
          hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '업로드 중...' : '이미지'}
      </button>
    </>
  )
}
