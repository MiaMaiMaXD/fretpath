'use client';

import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Color, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

const SIZES = ['12', '14', '16', '18', '20', '24', '28'];
const COLORS = ['#1e293b', '#e38b12', '#b45309', '#dc2626', '#059669', '#2563eb', '#7c3aed', '#64748b'];
const IMG_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const IMG_MAX = 2 * 1024 * 1024;

/** Word-style editor for text pages. Emits HTML (sanitized on the server before saving). */
export function RichTextEditor({
  lessonId,
  value,
  onChange,
  label,
}: {
  lessonId: string;
  value: string;
  onChange: (html: string) => void;
  label: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }),
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
    ],
    content: value,
    editorProps: { attributes: { class: 'rte-body', 'aria-label': label, role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });

  return (
    <div className="rte">
      {editor ? <Toolbar editor={editor} lessonId={lessonId} /> : <div className="rte-bar" />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, lessonId }: { editor: Editor; lessonId: string }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      size: ((e.getAttributes('textStyle').fontSize as string | undefined) ?? '').replace('px', ''),
      color: (e.getAttributes('textStyle').color as string | undefined) ?? '',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
      ordered: e.isActive('orderedList'),
      bullet: e.isActive('bulletList'),
      heading: e.isActive('heading', { level: 2 }),
      link: e.isActive('link'),
    }),
  });
  const [colorsOpen, setColorsOpen] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const chain = () => editor.chain().focus();

  async function upload(f: File) {
    const ext = IMG_TYPES[f.type];
    if (!ext || f.size > IMG_MAX) {
      setImgError('รองรับรูป PNG, JPG, WEBP, GIF ไม่เกิน 2 MB');
      return;
    }
    setImgError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${lessonId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from('lesson-images').upload(path, f, { contentType: f.type });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from('lesson-images').getPublicUrl(path);
      chain().setImage({ src: data.publicUrl, alt: '' }).run();
    } catch {
      setImgError('อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setUploading(false);
    }
  }

  function setLink() {
    const prev = (editor.getAttributes('link').href as string | undefined) ?? 'https://';
    const url = window.prompt('ใส่ลิงก์ (เว้นว่างเพื่อเอาลิงก์ออก)', prev);
    if (url === null) return;
    if (url.trim() === '' || url.trim() === 'https://') chain().extendMarkRange('link').unsetLink().run();
    else if (/^https?:\/\//.test(url.trim())) chain().extendMarkRange('link').setLink({ href: url.trim() }).run();
    else window.alert('ลิงก์ต้องขึ้นต้นด้วย https://');
  }

  return (
    <div className="rte-bar" role="toolbar" aria-label="จัดรูปแบบข้อความ">
      <select
        aria-label="ขนาดตัวอักษร"
        value={s.size || '14'}
        onChange={(e) => (e.target.value === '14' ? chain().unsetFontSize().run() : chain().setFontSize(`${e.target.value}px`).run())}
      >
        {SIZES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <span className="sep" />
      <Btn on={s.heading} label="หัวข้อ" onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <path d="M5 5h14M12 5v14" />
      </Btn>
      <div className="rte-colors">
        <button type="button" className="btn-ic" aria-label="สีตัวอักษร" aria-expanded={colorsOpen} onClick={() => setColorsOpen((o) => !o)}>
          <span className="swatch" style={{ background: s.color || '#1e293b' }} />
        </button>
        {colorsOpen ? (
          <div className="rte-palette">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`สี ${c}`}
                style={{ background: c }}
                onClick={() => {
                  if (c === '#1e293b') chain().unsetColor().run();
                  else chain().setColor(c).run();
                  setColorsOpen(false);
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <span className="sep" />
      <Btn on={s.bold} label="ตัวหนา" onClick={() => chain().toggleBold().run()} text="B" />
      <Btn on={s.italic} label="ตัวเอียง" onClick={() => chain().toggleItalic().run()} text="I" italic />
      <Btn on={s.underline} label="ขีดเส้นใต้" onClick={() => chain().toggleUnderline().run()} text="U" underline />
      <Btn on={s.strike} label="ขีดฆ่า" onClick={() => chain().toggleStrike().run()} text="S" strike />
      <span className="sep" />
      <Btn on={s.left} label="ชิดซ้าย" onClick={() => chain().setTextAlign('left').run()}>
        <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />
      </Btn>
      <Btn on={s.center} label="กึ่งกลาง" onClick={() => chain().setTextAlign('center').run()}>
        <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />
      </Btn>
      <Btn on={s.right} label="ชิดขวา" onClick={() => chain().setTextAlign('right').run()}>
        <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />
      </Btn>
      <span className="sep" />
      <Btn on={s.ordered} label="รายการลำดับเลข" onClick={() => chain().toggleOrderedList().run()}>
        <path d="M10 6h10M10 12h10M10 18h10M4 5h1v3M4 11h2l-2 3h2M4 17h2v3H4" />
      </Btn>
      <Btn on={s.bullet} label="รายการจุด" onClick={() => chain().toggleBulletList().run()}>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <circle cx="4.5" cy="6" r="1" />
        <circle cx="4.5" cy="12" r="1" />
        <circle cx="4.5" cy="18" r="1" />
      </Btn>
      <span className="sep" />
      <Btn label={uploading ? 'กำลังอัปโหลดรูป' : 'แทรกรูป'} onClick={() => file.current?.click()} disabled={uploading}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m21 16-5-5-9 9" />
      </Btn>
      <input
        ref={file}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void upload(f);
        }}
      />
      <Btn on={s.link} label="ลิงก์" onClick={setLink}>
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </Btn>
      {imgError ? (
        <span className="rte-err" role="alert">
          {imgError}
        </span>
      ) : null}
    </div>
  );
}

function Btn({
  on,
  label,
  onClick,
  children,
  text,
  italic,
  underline,
  strike,
  disabled,
}: {
  on?: boolean;
  label: string;
  onClick: () => void;
  children?: React.ReactNode;
  text?: string;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`btn-ic ${on ? 'on' : ''}`}
      aria-label={label}
      aria-pressed={on === undefined ? undefined : on}
      title={label}
      disabled={disabled}
      // keep the text selection when clicking a toolbar button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {text ? (
        <span
          style={{
            fontWeight: 700,
            fontStyle: italic ? 'italic' : undefined,
            textDecoration: underline ? 'underline' : strike ? 'line-through' : undefined,
          }}
        >
          {text}
        </span>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {children}
        </svg>
      )}
    </button>
  );
}
