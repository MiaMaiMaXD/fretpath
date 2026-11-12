import Image from 'next/image';

/** FretPath logo mark (amber fretboard). Decorative: the surrounding link carries the accessible name. */
export function LogoMark() {
  return <Image src="/logo-mark.png" alt="" width={40} height={30} priority className="logo-mark" />;
}
