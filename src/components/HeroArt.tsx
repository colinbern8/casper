import React from 'react';

/**
 * Left-panel artwork for the landing page: a phone running a Casper chat, with the
 * dispatch slip and red-tag chip a request produces. Fixed example text, like the chat
 * beside it. Decorative, so it is hidden from assistive tech.
 */
export const HeroArt: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 560 540" className={className} aria-hidden="true" focusable="false" fill="none" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
    <defs>
      <clipPath id="ha-screen"><rect x="196" y="58" width="208" height="424" rx="30" /></clipPath>
      <linearGradient id="ha-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1b3bd6" stopOpacity="0" />
        <stop offset="1" stopColor="#1b3bd6" stopOpacity="1" />
      </linearGradient>
    </defs>

    {/* Rings, like a signal going out. */}
    <g stroke="#fff" strokeOpacity="0.14">
      <circle cx="300" cy="270" r="150" />
      <circle cx="300" cy="270" r="215" strokeOpacity="0.1" />
      <circle cx="300" cy="270" r="262" strokeOpacity="0.07" />
    </g>

    {/* Phone */}
    <g transform="translate(-28 0) rotate(-5 300 270)">
      <rect x="186" y="48" width="228" height="444" rx="38" fill="#0a0a0a" />
      <rect x="196" y="58" width="208" height="424" rx="30" fill="#fff" />
      <g clipPath="url(#ha-screen)">
        <rect x="196" y="58" width="208" height="46" fill="#171717" />
        <rect x="270" y="66" width="60" height="14" rx="7" fill="#0a0a0a" />
        <text x="212" y="98" fill="#fff" fontSize="15" fontWeight="900" fontFamily="Fraunces, Georgia, serif">Casper</text>
        <text x="392" y="98" fill="#a3a3a3" fontSize="8.5" textAnchor="end">IT Help Desk</text>

        {/* User bubble */}
        <rect x="222" y="120" width="170" height="30" rx="14" fill="#171717" />
        <text x="234" y="139" fill="#fff" fontSize="10">My Chromebook won’t charge.</text>

        {/* Casper steps */}
        <rect x="208" y="160" width="172" height="96" rx="14" fill="#f5f5f5" />
        <text x="220" y="178" fill="#171717" fontSize="10.5" fontWeight="600">Try these first:</text>
        {[
          ['Try a different outlet', true],
          ['Look for a light on the charger', true],
          ['Hold power for 10 seconds', false],
        ].map(([label, done], i) => (
          <g key={String(label)} transform={`translate(220 ${192 + i * 20})`}>
            <rect width="11" height="11" rx="3" fill={done ? '#1b3bd6' : '#fff'} stroke="#1b3bd6" strokeWidth="1.4" />
            {done && <path d="M2.6 5.8l2.1 2.1 3.9-4.2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
            <text x="19" y="9" fill="#262626" fontSize="9.5">{label}</text>
          </g>
        ))}

        {/* Casper offers a loaner */}
        <rect x="208" y="268" width="172" height="46" rx="14" fill="#ffc83d" />
        <text x="220" y="287" fill="#171717" fontSize="9.5" fontWeight="600">Still dead? I can set up a loaner</text>
        <text x="220" y="302" fill="#171717" fontSize="9.5" fontWeight="600">and send it to a technician.</text>

        {/* Composer */}
        <rect x="204" y="430" width="192" height="40" rx="20" fill="#f5f5f5" />
        <rect x="212" y="438" width="104" height="24" rx="12" fill="#fff" />
        <text x="222" y="454" fill="#737373" fontSize="9">Describe the problem</text>
        <circle cx="372" cy="450" r="14" fill="#1b3bd6" />
        <path d="M366 450h12m-5-5l5 5-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="196" y="400" width="208" height="30" fill="url(#ha-fade)" opacity="0" />
      </g>
    </g>

    {/* Dispatch slip, printed and pinned to the phone */}
    <g transform="rotate(4 450 150)">
      <rect x="378" y="96" width="160" height="112" rx="10" fill="#ffc83d" />
      <g fill="#171717">
        <text x="390" y="118" fontSize="8.5" fontWeight="700" letterSpacing="1.2">DISPATCH SLIP</text>
        <text x="390" y="144" fontSize="17" fontWeight="900" fontFamily="Fraunces, Georgia, serif">Priority 1</text>
        <text x="390" y="163" fontSize="10" fontWeight="600">Projector: no signal</text>
        <text x="390" y="178" fontSize="9">Room 214 · Class in session</text>
      </g>
      <line x1="390" y1="187" x2="524" y2="187" stroke="#171717" strokeOpacity="0.35" strokeDasharray="3 3" />
      <text x="390" y="200" fill="#171717" fontSize="8.5" fontWeight="700">HTSD-2026-0042 · Queued</text>
    </g>

    {/* Red tag, the number that finds the Chromebook */}
    <g transform="rotate(-6 120 400) translate(0 -8)">
      <rect x="40" y="366" width="156" height="70" rx="12" fill="#fff" />
      <rect x="40" y="366" width="10" height="70" rx="5" fill="#e11d2e" />
      <text x="62" y="387" fill="#737373" fontSize="8.5" fontWeight="700" letterSpacing="1.2">RED TAG</text>
      <text x="62" y="415" fill="#171717" fontSize="25" fontWeight="900" fontFamily="Fraunces, Georgia, serif" letterSpacing="1.5">482193</text>
      <text x="62" y="428" fill="#737373" fontSize="8">Chromebook found</text>
    </g>

    {/* Queue chip: a technician has it */}
    <g transform="rotate(3 470 410)">
      <rect x="364" y="380" width="164" height="52" rx="26" fill="#fff" />
      <circle cx="392" cy="406" r="14" fill="#1b3bd6" />
      <path d="M385 406l5 5 9-10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="414" y="403" fill="#171717" fontSize="10.5" fontWeight="700">Technician on it</text>
      <text x="414" y="418" fill="#737373" fontSize="9">Media Center desk</text>
    </g>
  </svg>
);
