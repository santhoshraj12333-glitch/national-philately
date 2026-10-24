/**
 * Deterministic SVG postage-stamp artwork.
 * Renders a believable engraved stamp (perforated edge, guilloche panel,
 * category emblem, denomination, country, year) with no external images.
 *
 * Colour comes from the stamp's CATEGORY (what kind of issue it is);
 * the central emblem comes from its THEME (what it is about).
 */

const PALETTES = {
  Historical: { bg: '#FDF6E3', ink: '#8C1D18', accent: '#D4A843', deep: '#5C1010' },
  Commemorative: { bg: '#FBF3E4', ink: '#9A3412', accent: '#E0A458', deep: '#5A1F08' },
  Definitive: { bg: '#EFF4F7', ink: '#2A4B5C', accent: '#6FA0B8', deep: '#152C38' },
  Cultural: { bg: '#FBF0F5', ink: '#6B2A5B', accent: '#C97BA8', deep: '#3F1638' },
  Sports: { bg: '#FDF0EC', ink: '#B23A1E', accent: '#E08A4B', deep: '#6E2110' },
  Science: { bg: '#EAF0FA', ink: '#1B3A5C', accent: '#5B87C4', deep: '#0E2340' },
  Wildlife: { bg: '#EEF6EA', ink: '#1F5B34', accent: '#7BAE5A', deep: '#123A22' },
}

const FALLBACK = { bg: '#F5F0E8', ink: '#1B3A5C', accent: '#D4A843', deep: '#0E2340' }

const EMBLEMS = {
  Independence: (
    <g>
      <rect x="96" y="118" width="8" height="66" fill="currentColor" />
      <rect x="84" y="112" width="32" height="9" rx="2" fill="currentColor" />
      <circle cx="140" cy="140" r="20" fill="none" stroke="currentColor" strokeWidth="3" />
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1="140"
          y1="122"
          x2="140"
          y2="158"
          stroke="currentColor"
          strokeWidth="1.6"
          transform={`rotate(${i * 15} 140 140)`}
        />
      ))}
      <circle cx="140" cy="140" r="5" fill="currentColor" />
    </g>
  ),
  Space: (
    <g>
      <path d="M118 96 q26 16 26 62 l0 26 -52 0 0 -26 q0 -46 26 -62z" fill="currentColor" />
      <circle cx="131" cy="140" r="11" fill={PALETTES.Science.bg} />
      <path d="M94 168 l-20 30 26 -8z" fill="currentColor" />
      <path d="M168 168 l20 30 -26 -8z" fill="currentColor" />
      <path d="M118 196 q13 16 26 0 l-4 22 -18 0z" fill="currentColor" opacity="0.75" />
      <circle cx="196" cy="118" r="3" fill="currentColor" />
      <circle cx="86" cy="132" r="2.4" fill="currentColor" />
    </g>
  ),
  Wildlife: (
    <g>
      <ellipse cx="100" cy="150" rx="26" ry="30" fill="currentColor" />
      <circle cx="176" cy="132" r="20" fill="currentColor" />
      <circle cx="196" cy="120" r="12" fill="currentColor" />
      <circle cx="170" cy="128" r="2.6" fill="#fff" />
      <path d="M74 176 q26 26 52 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 108 q10 -22 26 -14" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  Art: (
    <g>
      <circle cx="140" cy="148" r="34" fill="none" stroke="currentColor" strokeWidth="3" />
      {Array.from({ length: 10 }).map((_, i) => (
        <path
          key={i}
          d={`M140 148 l${34 * Math.cos((i * Math.PI) / 5)} ${-34 * Math.sin((i * Math.PI) / 5)}`}
          stroke="currentColor"
          strokeWidth="2.4"
        />
      ))}
      <circle cx="140" cy="148" r="10" fill="currentColor" />
      <path d="M84 196 q56 -18 112 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  Architecture: (
    <g>
      <path d="M88 186 v-52 q0 -34 32 -34 t32 34 v52z" fill="currentColor" />
      <path d="M120 84 l6 -14 6 14z" fill="currentColor" />
      <path d="M74 190 h92 v10 h-92z" fill="currentColor" />
      <path d="M112 186 v-38 q0 -12 8 -12 t8 12 v38z" fill="#fff" opacity="0.85" />
      <path d="M84 150 q36 -12 72 0" fill="none" stroke="#fff" strokeWidth="3" opacity="0.8" />
    </g>
  ),
  Personalities: (
    <g>
      <circle cx="140" cy="126" r="22" fill="currentColor" />
      <path d="M96 196 q0 -38 44 -38 t44 38z" fill="currentColor" />
      <path d="M74 118 q10 -30 30 -34" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M206 118 q-10 -30 -30 -34" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  Sports: (
    <g>
      <path d="M104 106 h32 v10 h-32z" fill="currentColor" />
      <path d="M112 116 h16 v16 h-16z" fill="currentColor" />
      <path d="M100 132 q-18 6 -18 26 t26 20 h44 q26 -4 26 -24 t-20 -22z" fill="currentColor" />
      <path d="M120 178 q20 10 40 0 v10 q-20 10 -40 0z" fill="currentColor" />
      <circle cx="140" cy="150" r="9" fill="#fff" opacity="0.85" />
    </g>
  ),
  Culture: (
    <g>
      <path d="M84 190 h92 v10 h-92z" fill="currentColor" />
      <path d="M96 182 v-40 l44 -30 44 30 v40z" fill="currentColor" />
      <circle cx="140" cy="140" r="14" fill="none" stroke="#fff" strokeWidth="3" />
      <path d="M140 126 v28" stroke="#fff" strokeWidth="3" />
      <path d="M126 140 h28" stroke="#fff" strokeWidth="3" />
    </g>
  ),
}

const hash = (str = '') => {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export default function StampArt({ stamp, className = '' }) {
  const category = stamp?.category || 'Commemorative'
  const theme = stamp?.theme || 'Culture'
  const p = PALETTES[category] || FALLBACK
  const emblem = EMBLEMS[theme] || EMBLEMS.Culture
  const seed = hash(`${stamp?.name}${stamp?.year}`)
  const tilt = ((seed % 5) - 2) * 0.35

  const countryLabel = stamp?.countryName || stamp?.country?.name || 'India'

  const perforations = []
  const step = 19
  for (let x = 10; x <= 290; x += step) {
    perforations.push({ cx: x, cy: 0 })
    perforations.push({ cx: x, cy: 322 })
  }
  for (let y = 10; y <= 312; y += step) {
    perforations.push({ cx: 0, cy: y })
    perforations.push({ cx: 300, cy: y })
  }

  const lines = Array.from({ length: 26 }).map((_, i) => (
    <path
      key={i}
      d={`M0 ${i * 13} q75 ${i % 2 ? 7 : -7} 150 0 t150 0`}
      fill="none"
      stroke={p.accent}
      strokeWidth="0.7"
      opacity="0.35"
    />
  ))

  return (
    <svg
      viewBox="0 0 300 322"
      className={className}
      role="img"
      aria-label={`${stamp?.name || 'Stamp'} postage stamp`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id={`perf-${seed}`}>
          <rect x="0" y="0" width="300" height="322" fill="#fff" />
          {perforations.map((c, i) => (
            <circle key={i} cx={c.cx} cy={c.cy} r="5.4" fill="#000" />
          ))}
        </mask>
        <clipPath id={`panel-${seed}`}>
          <rect x="16" y="16" width="268" height="290" rx="2" />
        </clipPath>
      </defs>

      <g mask={`url(#perf-${seed})`}>
        <rect width="300" height="322" fill="#FFFDF8" />

        <g clipPath={`url(#panel-${seed})`}>
          <rect x="16" y="16" width="268" height="290" fill={p.bg} />
          <g transform={`rotate(${tilt} 150 160)`}>{lines}</g>

          <rect x="16" y="16" width="268" height="290" fill="none" stroke={p.ink} strokeWidth="2.5" />
          <rect
            x="24"
            y="24"
            width="252"
            height="274"
            fill="none"
            stroke={p.ink}
            strokeWidth="1"
            opacity="0.55"
          />

          <text
            x="150"
            y="52"
            textAnchor="middle"
            fill={p.ink}
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="19"
            fontWeight="700"
            letterSpacing="2.5"
          >
            {String(countryLabel).toUpperCase().slice(0, 18)}
          </text>
          <line x1="60" y1="60" x2="240" y2="60" stroke={p.accent} strokeWidth="1.6" />

          <text
            x="150"
            y="80"
            textAnchor="middle"
            fill={p.deep}
            fontFamily="Georgia, serif"
            fontSize="12.5"
            letterSpacing="1.4"
          >
            {String(stamp?.name || 'Commemorative').toUpperCase().slice(0, 30)}
          </text>

          <g color={p.ink} transform="translate(0,10)">
            {emblem}
          </g>

          <g>
            <rect x="24" y="248" width="120" height="42" fill={p.ink} opacity="0.92" rx="2" />
            <text
              x="84"
              y="267"
              textAnchor="middle"
              fill={p.bg}
              fontFamily="Georgia, serif"
              fontSize="11"
              letterSpacing="1"
            >
              {(stamp?.category || 'Commemorative').toUpperCase().slice(0, 14)}
            </text>
            <text
              x="84"
              y="283"
              textAnchor="middle"
              fill={p.accent}
              fontFamily="Georgia, serif"
              fontSize="10"
            >
              {stamp?.year || ''}
            </text>

            <rect x="222" y="252" width="54" height="34" fill="#fff" stroke={p.ink} strokeWidth="1.6" rx="2" />
            <text
              x="249"
              y="275"
              textAnchor="middle"
              fill={p.deep}
              fontFamily="Georgia, serif"
              fontSize="14"
              fontWeight="700"
            >
              {(stamp?.denomination || '5.00').toString().slice(0, 7)}
            </text>
          </g>

          <text
            x="150"
            y="309"
            textAnchor="middle"
            fill={p.deep}
            fontFamily="Georgia, serif"
            fontSize="9.5"
            letterSpacing="3"
          >
            {String(theme).toUpperCase().slice(0, 16)}
          </text>
        </g>
      </g>
    </svg>
  )
}
