import './loading-screen.css';

/** Columns between the strings (top edge at y=40, bottom edge at y=600), left to right. */
const COLUMNS = [
  '0,40 217,40 128,600 0,600',
  '217,40 262,40 201,600 128,600',
  '262,40 300,40 278,600 201,600',
  '300,40 340,40 353,600 278,600',
  '340,40 382,40 431,600 353,600',
  '382,40 425,40 504,600 431,600',
  '425,40 640,40 640,600 504,600',
];

/** The 6 strings: [x at the nut, x at the bottom]. */
const STRINGS = [
  [210, 135],
  [255, 209],
  [298, 280],
  [341, 352],
  [386, 425],
  [430, 497],
];

/**
 * Full-screen night background with the animated FretPath mark: the fretboard lights up
 * column by column and each string gives a small pluck. Used by the route loading.tsx files.
 * Covers the whole screen, header and nav included, so only the mark shows while a page loads.
 */
export function LoadingScreen() {
  return (
    <div className="fp-loading" role="status" aria-busy="true">
      <svg className="fp-loading-mark" viewBox="0 0 640 640" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="fp-loading-shape">
            <path d="M210 83 L430 83 Q475 83 484 125 L568 490 Q580 556 515 556 L125 556 Q60 556 72 490 L156 125 Q165 83 210 83 Z" />
          </clipPath>
          <clipPath id="fp-loading-bands">
            <rect x="0" y="0" width="640" height="176" />
            <rect x="0" y="215" width="640" height="116" />
            <rect x="0" y="391" width="640" height="249" />
          </clipPath>
        </defs>
        <g clipPath="url(#fp-loading-bands)">
          <g clipPath="url(#fp-loading-shape)">
            {COLUMNS.map((points, i) => (
              <polygon key={points} className="col" points={points} style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
            {STRINGS.map(([top, bottom], i) => (
              <line
                key={top}
                className="str"
                x1={top}
                y1={88}
                x2={bottom}
                y2={550}
                style={{ animationDelay: `${0.12 + i * 0.15}s` }}
              />
            ))}
          </g>
        </g>
      </svg>
      <span className="sr-only">กำลังโหลด…</span>
    </div>
  );
}
