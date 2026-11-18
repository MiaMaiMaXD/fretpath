import Image from 'next/image';

/** FretPath logo mark (amber fretboard). Decorative: the surrounding link carries the accessible name.
    `height` is the displayed height in px; next/image picks a sharp source for it. */
export function LogoMark({ height = 30 }: { height?: number }) {
  const width = Math.round((height * 125) / 120);
  return <Image src="/fretpath-mark.png" alt="" width={width} height={height} priority className="logo-mark" />;
}
