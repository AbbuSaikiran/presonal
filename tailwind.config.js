/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        cyber: {
          bg:       '#080c14',
          surface:  '#0d1520',
          card:     '#111d2e',
          border:   '#1a2d45',
          muted:    '#1e3554',
          accent:   '#00d4ff',
          'accent-dim': '#0099bb',
          green:    '#00ff88',
          'green-dim': '#00b360',
          red:      '#ff3366',
          'red-dim': '#cc2952',
          orange:   '#ff8c42',
          yellow:   '#ffd700',
          text:     '#e2eaf5',
          'text-muted': '#7a94b5',
          'text-dim':   '#4a6480',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow':  'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'glow':       'glow 2s ease-in-out infinite alternate',
        'scan':       'scan 4s linear infinite',
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.35s ease-out',
      },
      keyframes: {
        glow: {
          '0%':   { boxShadow: '0 0 5px rgba(0, 212, 255, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.7), 0 0 40px rgba(0, 212, 255, 0.3)' },
        },
        scan: {
          '0%':   { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(32px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
        `,
        'scanline': 'linear-gradient(transparent 50%, rgba(0,212,255,0.02) 50%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
        'scanline': '100% 4px',
      },
      boxShadow: {
        'cyber':      '0 0 30px rgba(0, 212, 255, 0.1), inset 0 1px 0 rgba(0,212,255,0.1)',
        'cyber-sm':   '0 0 10px rgba(0, 212, 255, 0.15)',
        'cyber-lg':   '0 0 60px rgba(0, 212, 255, 0.15), 0 0 120px rgba(0, 212, 255, 0.05)',
        'red-glow':   '0 0 20px rgba(255, 51, 102, 0.3)',
        'green-glow': '0 0 20px rgba(0, 255, 136, 0.3)',
        'orange-glow':'0 0 20px rgba(255, 140, 66, 0.3)',
      },
    },
  },
  plugins: [],
}
