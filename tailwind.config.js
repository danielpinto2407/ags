/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--tenant-body-font, sans-serif)'],
        display: ['var(--tenant-display-font, var(--tenant-body-font, sans-serif))'],
      },
      colors: {
        brand: {
          50: 'color-mix(in srgb, var(--tenant-primary, #71717a) 5%, white)',
          100: 'color-mix(in srgb, var(--tenant-primary, #71717a) 10%, white)',
          200: 'color-mix(in srgb, var(--tenant-primary, #71717a) 22%, white)',
          300: 'color-mix(in srgb, var(--tenant-accent, #a1a1aa) 72%, white)',
          400: 'var(--tenant-accent, #a1a1aa)',
          500: 'var(--tenant-primary, #71717a)',
          'action-hover': 'color-mix(in srgb, var(--tenant-primary, #71717a) 85%, black)',
          600: 'var(--tenant-secondary, #52525b)',
          700: 'color-mix(in srgb, var(--tenant-secondary, #52525b) 86%, black)',
          800: 'color-mix(in srgb, var(--tenant-primary, #71717a) 66%, black)',
          900: 'color-mix(in srgb, var(--tenant-primary, #71717a) 78%, black)',
          950: 'color-mix(in srgb, var(--tenant-primary, #71717a) 88%, black)',
        },
      },
      boxShadow: {
        'neon': '0 0 16px color-mix(in srgb, var(--tenant-primary, #71717a) 22%, transparent)',
        'neon-sm': '0 0 8px color-mix(in srgb, var(--tenant-primary, #71717a) 18%, transparent)',
        'neon-lg': '0 0 28px color-mix(in srgb, var(--tenant-primary, #71717a) 20%, transparent)',
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
