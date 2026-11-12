'use client';

import { useState } from 'react';
import { updateAvatar } from '@/app/(learner)/profile/actions';
import { CameraIcon } from '@/app/(learner)/profile/icons';
import { createClient } from '@/lib/supabase/browser';

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_BYTES = 1024 * 1024;
const ERROR = 'อัปโหลดรูปไม่สำเร็จ (PNG, JPG, WEBP ไม่เกิน 1 MB)';

type Props = { userId: string; avatarUrl: string | null; initial: string };

export function AvatarUpload({ userId, avatarUrl, initial }: Props) {
  const [url, setUrl] = useState<string | null>(avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  function onPick(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (file) void upload(file);
  }

  async function upload(file: File) {
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
    <div className="avatar-col">
      <label
        className={dragging ? 'avatar-pick is-drag' : 'avatar-pick'}
        aria-busy={busy}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !busy) void upload(file);
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="รูปโปรไฟล์" width={112} height={112} className="avatar-img" />
        ) : (
          <span className="avatar-img avatar-initial" aria-hidden="true">
            {initial}
          </span>
        )}
        <span className="cam" aria-hidden="true">
          {busy ? <span className="spin" /> : <CameraIcon />}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          disabled={busy}
          aria-label="เปลี่ยนรูปโปรไฟล์"
          title="คลิกหรือลากรูปมาวางเพื่อเปลี่ยน"
          onChange={(e) => onPick(e.currentTarget)}
        />
      </label>
      {url ? (
        <button type="button" disabled={busy} onClick={() => void onRemove()} className="link-btn">
          ลบรูป
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="field-err">
          {error}
        </p>
      ) : null}
    </div>
  );
}
