export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f0f4ff', 100: '#e0e9ff', 200: '#c7d8ff',
          300: '#a4befd', 400: '#7d9bfa', 500: '#5b7bf5',
          600: '#3d5ce8', 700: '#3049d0', 900: '#1e2d7d',
        },
        surface: {
          900: '#0a0e1a', 800: '#111827', 700: '#1a2236',
          600: '#1e293b', 500: '#253047', 400: '#374151',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(91,123,245,0.3)',
        'glow-sm': '0 0 10px rgba(91,123,245,0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.3)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
      }
    }
  },
  plugins: [],
  darkMode: 'class'
}
