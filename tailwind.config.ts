import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#0a0c10',
        bg2:     '#0f1117',
        bg3:     '#161b24',
        border:  '#1e2535',
        border2: '#2a3347',
        accent:  '#3b82f6',
        accent2: '#6366f1',
        success: '#10b981',
        warn:    '#f59e0b',
        danger:  '#ef4444',
        purple:  '#8b5cf6',
        cyan:    '#06b6d4',
        muted:   '#94a3b8',
        faint:   '#475569',
        ngreen:  '#8eff71',
        ncyan:   '#00eefc',
        npink:   '#ff59e3',
      },
      fontFamily: {
        mono: ['SF Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        grotesk: ['Space Grotesk', 'DM Mono', 'monospace'],
      },
      keyframes: {
        spotlight: {
          '0%': { opacity: '0', transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -40%) scale(1)' },
        },
      },
      animation: {
        pulse2: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        spotlight: 'spotlight 2s ease 0.75s 1 forwards',
      },
    },
  },
  plugins: [],
}
export default config
