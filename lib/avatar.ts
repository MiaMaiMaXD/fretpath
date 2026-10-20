const AVATAR_FILE = /^avatar\.(png|jpg|webp|gif)(\?v=\d+)?$/;

/** The only URLs allowed are this project's public avatars URL under the caller's own folder. */
export function isOwnAvatarUrl(url: string, userId: string, supabaseUrl: string | undefined): boolean {
  if (!supabaseUrl) return false;
  const prefix = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/avatars/${userId}/`;
  return url.startsWith(prefix) && AVATAR_FILE.test(url.slice(prefix.length));
}
