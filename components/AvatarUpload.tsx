'use client';

import { useState } from 'react';
import { updateAvatar } from '@/app/(learner)/profile/actions';
import { createClient } from '@/lib/supabase/browser';

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_BYTES = 1024 * 1024;
const ERROR = 'อัปโหลดรูปไม่สำเร็จ (PNG, JPG, WEBP ไม่เกิน 1 MB)';

type Props = { userId: string; avatarUrl: string | null };

export function AvatarUpload({ userId, avatarUrl }: Props) {
  const [url, setUrl] = useState<string | null>(avatarUrl);
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
      const name = `avatar.${ext}`;
      const up = await supabase.storage.from('avatars').upload(`${userId}/${name}`, file, { contentType: file.type, upsert: true });
      if (up.error) throw up.error;
      // Drop a previous avatar with a different extension.
      const list = await supabase.storage.from('avatars').list(userId);
      const stale = (list.data ?? []).filter((f) => f.name !== name).map((f) => `${userId}/${f.name}`);
      if (stale.length > 0) await supabase.storage.from('avatars').remove(stale);
      const { data } = supabase.storage.from('avatars').getPublicUrl(`${userId}/${name}`);
      const next = `${data.publicUrl}?v=${Date.now()}`;
      const res = await updateAvatar(next);
      if (!res.ok) throw new Error(res.message);
      setUrl(next);
    } catch {
      setError(ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setError(null);
    setBusy(true);
    try {
      const res = await updateAvatar(null);
      if (!res.ok) throw new Error(res.message);
      setUrl(null);
    } catch {
      setError(ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="รูปโปรไฟล์" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
        ) : null}
        <label className="inline-flex w-fit cursor-pointer items-center rounded border border-neutral-400 px-3 py-2 text-sm focus-within:ring-2">
          {busy ? 'กำลังอัปโหลด…' : 'เปลี่ยนรูปโปรไฟล์'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            disabled={busy}
            aria-label="เปลี่ยนรูปโปรไฟล์"
            onChange={(e) => void onPick(e.currentTarget)}
          />
        </label>
        {url ? (
          <button type="button" disabled={busy} onClick={() => void onRemove()} className="rounded border border-neutral-400 px-3 py-2 text-sm disabled:opacity-50">
            ลบรูป
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
