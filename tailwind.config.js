/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff0f7',
          100: '#ffd6e9',
          200: '#ffadd3',
          300: '#ff70b5',
          400: 'var(--tenant-accent, #ff3d9a)',
          500: 'var(--tenant-primary, #ff0a78)',
          600: 'var(--tenant-secondary, #f00068)',
          700: 'var(--tenant-secondary, #d9005d)',
          800: '#b80050',
          900: '#980442',
          950: '#570025',
        },
      },
      boxShadow: {
        'neon': '0 0 20px rgba(255, 10, 120, 0.38)',
        'neon-sm': '0 0 10px rgba(255, 10, 120, 0.3)',
        'neon-lg': '0 0 40px rgba(255, 10, 120, 0.34)',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
