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
