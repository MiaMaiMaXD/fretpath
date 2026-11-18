const mailpitUrl = () => process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

type Search = { messages?: { ID: string }[] };
type Message = { HTML?: string; Text?: string };

/** Polls Mailpit for mail to `email` and returns the first URL containing `contains`. */
export async function latestLinkFor(
  email: string,
  opts: { contains?: string; timeoutMs?: number } = {},
): Promise<string> {
  const contains = opts.contains ?? '/auth/confirm';
  const deadline = Date.now() + (opts.timeoutMs ?? 15_000);
  const base = mailpitUrl();
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
      if (res.ok) {
        const { messages } = (await res.json()) as Search;
        // Newest first; check each message until one carries a matching link.
        for (const m of messages ?? []) {
          const msgRes = await fetch(`${base}/api/v1/message/${m.ID}`);
          if (!msgRes.ok) continue;
          const msg = (await msgRes.json()) as Message;
          const body = `${msg.HTML ?? ''}\n${msg.Text ?? ''}`.replace(/&amp;/g, '&');
          const urls = body.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
          const hit = urls.find((u) => u.includes(contains));
          if (hit) return hit;
        }
      }
    } catch {
      // Transient Mailpit/network error: retry until the deadline.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`latestLinkFor: no mail with link containing "${contains}" for ${email}`);
}

/**
 * Polls Mailpit for the newest code mail to `email` (the recovery and confirmation templates mark the code with data-otp)
 * and returns the 6-digit code. Pass `not` to wait for a code different from one already used (after a resend).
 */
export async function latestOtpFor(email: string, opts: { not?: string; timeoutMs?: number } = {}): Promise<string> {
  const deadline = Date.now() + (opts.timeoutMs ?? 15_000);
  const base = mailpitUrl();
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
      if (res.ok) {
        const { messages } = (await res.json()) as Search;
        const newest = messages?.[0];
        if (newest) {
          const msgRes = await fetch(`${base}/api/v1/message/${newest.ID}`);
          if (msgRes.ok) {
            const msg = (await msgRes.json()) as Message;
            const code = /data-otp[^>]*>\s*(\d{6})\s*</.exec(msg.HTML ?? '')?.[1];
            if (code && code !== opts.not) return code;
          }
        }
      }
    } catch {
      // Transient Mailpit/network error: retry until the deadline.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`latestOtpFor: no code mail for ${email}`);
}

/** How many mails Mailpit holds for `email` right now (to prove that nothing new was sent). */
export async function mailCountFor(email: string): Promise<number> {
  const res = await fetch(`${mailpitUrl()}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  if (!res.ok) throw new Error(`mailCountFor: Mailpit answered ${res.status}`);
  const { messages } = (await res.json()) as Search;
  return messages?.length ?? 0;
}
