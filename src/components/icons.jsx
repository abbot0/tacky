import React from 'react';

const ICONS = {
  search: [
    'M11 4a7 7 0 1 1-4.95 11.95l-1.63 1.63a1 1 0 0 1-1.41-1.41l1.63-1.63A7 7 0 0 1 11 4zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z'
  ],
  check: [
    'M9.55 16.55 5.3 12.3a1 1 0 0 1 1.4-1.4l2.85 2.84 7.75-7.75a1 1 0 1 1 1.4 1.42l-8.45 8.44a1 1 0 0 1-1.7 0z'
  ],
  undo: [
    'M8.7 5.3a1 1 0 0 1 0 1.4L6.41 9H14a6 6 0 0 1 0 12h-3a1 1 0 1 1 0-2h3a4 4 0 0 0 0-8H6.41l2.3 2.3a1 1 0 1 1-1.42 1.4l-4-4a1 1 0 0 1 0-1.4l4-4a1 1 0 0 1 1.42 0z'
  ],
  upload: [
    'M12 21a1 1 0 0 1-1-1v-8.59l-2.3 2.3a1 1 0 1 1-1.4-1.42l4-4a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1-1.4 1.42L13 11.41V20a1 1 0 0 1-1 1z',
    'M5 4a1 1 0 0 1 0-2h14a1 1 0 1 1 0 2H5z'
  ],
  pin: [
    'M14.5 3.5 20.5 9.5l-1.4 1.4-.7-.7-4.2 4.2.5 3.6-1.4 1.4-3.6-3.6-4.7 4.7-1.4-1.4 4.7-4.7-3.6-3.6 1.4-1.4 3.6.5 4.2-4.2-.7-.7z'
  ],
  database: [
    'M12 3c4.42 0 8 1.34 8 3s-3.58 3-8 3-8-1.34-8-3 3.58-3 8-3z',
    'M4 9.5c0 1.66 3.58 3 8 3s8-1.34 8-3V12c0 1.66-3.58 3-8 3s-8-1.34-8-3V9.5z',
    'M4 15c0 1.66 3.58 3 8 3s8-1.34 8-3v2.5c0 1.66-3.58 3-8 3s-8-1.34-8-3V15z'
  ],
  boards: [
    'M4 3h6.5a1.5 1.5 0 0 1 1.5 1.5V11H3V4.5A1.5 1.5 0 0 1 4.5 3H4z',
    'M3 13h9v7H4.5A1.5 1.5 0 0 1 3 18.5V13z',
    'M13 3h6.5A1.5 1.5 0 0 1 21 4.5V13h-8V3z',
    'M13 15h8v3.5a1.5 1.5 0 0 1-1.5 1.5H13v-5z'
  ],
  notes: [
    'M6 3h7.5a1.5 1.5 0 0 1 1.06.44l3 3A1.5 1.5 0 0 1 18 7.5V20a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    'M14 4.56V7h2.44z',
    'M8 11a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H8z',
    'M8 15a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2H8z'
  ],
  canvas: [
    'M5 4h9a1 1 0 0 1 1 1v3h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    'M12.84 6.3 7.1 16.11a1 1 0 0 0 .38 1.38 1 1 0 0 0 1.38-.37l5.27-9.1a1 1 0 1 0-1.29-1.43z',
    'M15 18a1 1 0 1 0 2 0v-2h2a1 1 0 1 0 0-2h-4a1 1 0 0 0-1 1v3z'
  ],
  menu: [
    'M4 6a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z',
    'M4 12a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z',
    'M4 18a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z'
  ],
  download: [
    'M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.42L11 12.59V4a1 1 0 0 1 1-1z',
    'M5 18a1 1 0 0 0 0 2h14a1 1 0 1 0 0-2H5z'
  ],
  sparkle: [
    'M12 3l1.9 4.06L18 8l-4.1 1.06L12 13l-1.9-3.94L6 8l4.1-0.94L12 3z',
    'M6 17l.95 2.03L9 20l-2.05.52L6 23l-.95-2.48L3 20l2.05-.97L6 17z',
    'M18 15l1.3 2.6L22 18l-2.69.4L18 21l-.61-2.6L14.7 18l2.69-.4L18 15z'
  ],
  alert: [
    'M12.94 3.34a1 1 0 0 0-1.88 0l-7.5 15.5A1 1 0 0 0 4.44 20h15.12a1 1 0 0 0 .88-1.16l-7.5-15.5zM12 9a1 1 0 0 1 1 1v3.5a1 1 0 1 1-2 0V10a1 1 0 0 1 1-1zm0 8a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 12 17z'
  ],
  arrowLeft: [
    'M14.7 5.3a1 1 0 0 1 0 1.4L10.41 11H18a1 1 0 1 1 0 2h-7.59l4.3 4.3a1 1 0 0 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.42 0z'
  ],
  refresh: [
    'M19 4.5a1 1 0 0 0-2 0v1.26a7 7 0 0 0-11.64 5.08 1 1 0 0 0 2 0 5 5 0 0 1 8.17-3.8l-1.46 1.46a1 1 0 1 0 1.42 1.42l3.17-3.18a1 1 0 0 0 .29-.7V4.5zM5 19.5a1 1 0 0 0 2 0v-1.26a7 7 0 0 0 11.64-5.08 1 1 0 0 0-2 0 5 5 0 0 1-8.17 3.8l1.46-1.46a1 1 0 0 0-1.42-1.42l-3.17 3.18a1 1 0 0 0-.29.7v1.54z'
  ],
  palette: [
    'M12 3a9 9 0 1 0 0 18h1.35a2.15 2.15 0 0 0 2.05-2.9l-.33-.96a1 1 0 0 1 .95-1.34H17a3 3 0 0 0 1.73-5.46A9.5 9.5 0 0 0 12 3z',
    'M8 9.5a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 8 9.5z',
    'M12 7a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 12 7z',
    'M15.5 9.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0z',
    'M13.5 13.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0z'
  ]
};

const THEMES = [
  {
    id:'midnight',
    name:'Midnight Dark',
    description:'The original neon midnight glow.',
    accent:'#9f7aea',
    swatch:['#0b1b3a','#121d34','#9f7aea']
  },
  {
    id:'graphite',
    name:'Graphite Grey',
    description:'Smoky charcoal with soft edges.',
    accent:'#22d3ee',
    swatch:['#0f121a','#1d232f','#22d3ee']
  },
  {
    id:'noir',
    name:'Noir Black',
    description:'Pure blacks with crisp cyan highlights.',
    accent:'#38bdf8',
    swatch:['#050505','#0f0f0f','#38bdf8']
  },
  {
    id:'light',
    name:'Lumen Light',
    description:'Bright, low-glare surfaces with clean contrast.',
    accent:'#6366f1',
    swatch:['#ffffff','#eef2ff','#6366f1']
  }
];

export { ICONS, THEMES };

export function SvgIcon({ name, className }) {
  const paths = ICONS[name];
  if (!paths) return null;
  const data = Array.isArray(paths) ? paths : [paths];
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {data.map((d, idx) => (
        <path key={idx} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}
