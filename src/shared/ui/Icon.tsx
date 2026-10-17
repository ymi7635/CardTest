const P = {
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  heart: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z',
  gift: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-3 0-4-4-1.5-4S12 7 12 7zm0 0c3 0 4-4 1.5-4S12 7 12 7z',
  cake: 'M5 20h14v-6H5zM8 14v-3h8v3M12 11V7M12 5v1',
  pin: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  whisk: 'M12 14v7M12 14c-3 0-5-4-5-7a5 5 0 0 1 10 0c0 3-2 7-5 7zM10 4.5c-1 2-1 5 2 9.5M14 4.5c1 2 1 5-2 9.5',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z',
  bag: 'M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3M12 15v2',
  unlock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 7.6-1.8M12 15v2',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff:
    'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  chevron: 'M6 9l6 6 6-6',
  right: 'M9 6l6 6-6 6',
  home: 'M4 11l8-7 8 7v9H4zM10 20v-6h4v6',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  card: 'M3 6h18v12H3zM3 10h18M6 15h4',
  x: 'M6 6l12 12M18 6L6 18',
  flip: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  pen: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
  plus: 'M12 5v14M5 12h14',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  wifiOff:
    'M3 3l18 18M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 3.4-2.1M19 12.9a10 10 0 0 0-4.6-2.6M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 12 5M12 20h.01',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-3v3M16 13.5h.01',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
} as const

export type IconName = keyof typeof P

interface Props {
  name: IconName
  className?: string
}

export default function Icon({ name, className = '' }: Props) {
  return (
    <svg className={`i ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  )
}
