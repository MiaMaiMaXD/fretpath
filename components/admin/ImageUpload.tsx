'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_BYTES = 2 * 1024 * 1024;
const ERROR = 'อัปโหลดรูปไม่สำเร็จ (รองรับ PNG, JPG, WEBP, GIF ไม่เกิน 2 MB)';

type Props = { lessonId: string; textareaId: string };

/** Uploads an image as the signed-in admin and inserts Markdown for it at the textarea cursor. */
export function ImageUpload({ lessonId, textareaId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setError(null);
    const ext = TYPES[file.type];
    if (!ext || file.size > MAX_BYTES) {
      setError(ERROR);
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const path = `${lessonId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from('lesson-images').upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from('lesson-images').getPublicUrl(path);
      const area = document.getElementById(textareaId) as HTMLTextAreaElement | null;
      if (!area) throw new Error('textarea missing');
      const md = `![คำอธิบายรูป](${data.publicUrl})`;
      const at = area.selectionStart ?? area.value.length;
      const end = area.selectionEnd ?? at;
      const next = area.value.slice(0, at) + md + area.value.slice(end);
      // Native setter + input event so React's onChange (counter) and form submit see the new value.
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(area, next);
      area.dispatchEvent(new Event('input', { bubbles: true }));
      const pos = at + md.length;
      area.setSelectionRange(pos, pos);
    } catch {
      setError(ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="inline-flex w-fit cursor-pointer items-center rounded border border-neutral-400 px-3 py-2 text-sm focus-within:ring-2">
        {busy ? 'กำลังอัปโหลด…' : 'แทรกรูป'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          disabled={busy}
          aria-label="แทรกรูป"
          onChange={(e) => void onPick(e.currentTarget)}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
