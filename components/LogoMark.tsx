import Image from 'next/image';

/** FretPath logo mark: amber fretboard with white strings (the gaps between its three bands are transparent).
    Decorative: the surrounding link carries the accessible name.
    `height` is the displayed height in px; next/image picks a sharp source for it. */
export function LogoMark({ height = 30 }: { height?: number }) {
  const width = Math.round((height * 125) / 120);
  return <Image src="/fretpath-mark-v2.png" alt="" width={width} height={height} priority className="logo-mark" />;
}
