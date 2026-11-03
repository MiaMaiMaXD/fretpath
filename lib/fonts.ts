import { IBM_Plex_Sans_Thai } from 'next/font/google';

/** Brand typeface for the redesigned pages; exposed as the CSS variable --font-plex-thai. */
export const plexThai = IBM_Plex_Sans_Thai({
  variable: '--font-plex-thai',
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
});
