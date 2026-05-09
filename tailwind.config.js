/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'vice-bg':       '#1c1713',
        'vice-card':     '#252118',
        'vice-surface':  '#2e2922',
        'vice-fg':       '#f5ebdc',
        'vice-accent':   '#8a1c1c',
        'vice-gold':     '#d9b370',
        'vice-muted':    'rgba(245,235,220,0.40)',
        'vice-muted-35': 'rgba(245,235,220,0.35)',
        'vice-muted-32': 'rgba(245,235,220,0.32)',
        'vice-muted-20': 'rgba(245,235,220,0.20)',
        'vice-muted-18': 'rgba(245,235,220,0.18)',
        'vice-border':   'rgba(255,255,255,0.06)',
      },
      fontFamily: {
        sans:     ['Inter_400Regular', 'system-ui'],
        medium:   ['Inter_500Medium', 'system-ui'],
        semibold: ['Inter_600SemiBold', 'system-ui'],
        bold:     ['Inter_700Bold', 'system-ui'],
      },
    },
  },
  plugins: [],
};
