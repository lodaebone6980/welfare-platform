'use client'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback } from 'react'
import { ImageUploadButton } from './ImageUpload'

interface Props {
  content:  string
  onChange: (html: string) => void
}

export function RichEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Placeholder.configure({ placeholder: '정책 내용을 입력하세요...' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  const insertImage = useCallback((url: string) => {
    editor?.chain().focus().setImage({ src: url, alt: '정책 이미지' }).run()
  }, [editor])

  const insertCTA = useCallback(() => {
    editor?.chain().focus().insertContent(
      `<p><a href="" class="cta-button" rel="nofollow">지금 신청하기 →</a></p>`
    ).run()
  }, [editor])

  const insertFAQ = useCallback(() => {
    editor?.chain().focus().insertContent(`
      <div class="faq-block">
        <details><summary>Q. 신청 대상은 누구인가요?</summary><p>A. 여기에 답변을 입력하세요.</p></details>
        <details><summary>Q. 신청 방법은?</summary><p>A. 여기에 답변을 입력하세요.</p></details>
        <details><summary>Q. 지원 금액은?</summary><p>A. 여기에 답변을 입력하세요.</p></details>
      </div>
    `).run()
  }, [editor])

  if (!editor) return null

  const btn = (label: string, onClick: () => void, active?: boolean, variant?: 'blue' | 'green') => (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-2 py-1 text-xs rounded border transition-colors',
        active
          ? 'bg-blue-100 text-blue-700 border-blue-300'
          : variant === 'blue'
            ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
            : variant === 'green'
              ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
      ].join(' ')}
    >
      {label}
    </button>
  )

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 툴바 */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b border-gray-200">
        {btn('B',  () => editor.chain().focus().toggleBold().run(),                    editor.isActive('bold'))}
        {btn('I',  () => editor.chain().focus().toggleItalic().run(),                  editor.isActive('italic'))}
        {btn('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(),     editor.isActive('heading', { level: 2 }))}
        {btn('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(),     editor.isActive('heading', { level: 3 }))}
        <div className="w-px bg-gray-200 mx-1" />
        {btn('목록',   () => editor.chain().focus().toggleBulletList().run(),          editor.isActive('bulletList'))}
        {btn('번호목록', () => editor.chain().focus().toggleOrderedList().run(),       editor.isActive('orderedList'))}
        {btn('표',    () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
        <div className="w-px bg-gray-200 mx-1" />
        <ImageUploadButton onUpload={insertImage} />
        {btn('CTA 버튼', insertCTA,  false, 'blue')}
        {btn('FAQ 블록', insertFAQ,  false, 'green')}
      </div>

      {/* 버블 메뉴 */}
      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div className="flex bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <button onClick={() => editor.chain().focus().toggleBold().run()}
            className="px-2 py-1 text-xs hover:bg-gray-50 font-bold">B</button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()}
            className="px-2 py-1 text-xs hover:bg-gray-50 italic">I</button>
          <button onClick={() => editor.chain().focus().toggleLink({ href: '' }).run()}
            className="px-2 py-1 text-xs hover:bg-gray-50 text-blue-600">링크</button>
        </div>
      </BubbleMenu>

      {/* 에디터 본문 */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-96 focus-within:outline-none
          [&_.cta-button]:inline-block [&_.cta-button]:bg-blue-600 [&_.cta-button]:text-white
          [&_.cta-button]:px-6 [&_.cta-button]:py-3 [&_.cta-button]:rounded-lg
          [&_.cta-button]:no-underline [&_.cta-button]:font-medium
          [&_.faq-block_details]:border [&_.faq-block_details]:border-gray-200
          [&_.faq-block_details]:rounded [&_.faq-block_details]:mb-2 [&_.faq-block_details]:p-3"
      />
    </div>
  )
}
