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
          50: 'color-mix(in srgb, var(--tenant-primary, #ff0a78) 5%, white)',
          100: 'color-mix(in srgb, var(--tenant-primary, #ff0a78) 10%, white)',
          200: 'color-mix(in srgb, var(--tenant-primary, #ff0a78) 22%, white)',
          300: 'color-mix(in srgb, var(--tenant-accent, #ff70b5) 72%, white)',
          400: 'var(--tenant-accent, #ff3d9a)',
          500: 'var(--tenant-primary, #ff0a78)',
          600: 'var(--tenant-secondary, #f00068)',
          700: 'color-mix(in srgb, var(--tenant-secondary, #d9005d) 86%, black)',
          800: 'color-mix(in srgb, var(--tenant-primary, #ff0a78) 66%, black)',
          900: 'color-mix(in srgb, var(--tenant-primary, #ff0a78) 78%, black)',
          950: 'color-mix(in srgb, var(--tenant-primary, #ff0a78) 88%, black)',
        },
      },
      boxShadow: {
        'neon': '0 0 16px color-mix(in srgb, var(--tenant-primary, #ff0a78) 22%, transparent)',
        'neon-sm': '0 0 8px color-mix(in srgb, var(--tenant-primary, #ff0a78) 18%, transparent)',
        'neon-lg': '0 0 28px color-mix(in srgb, var(--tenant-primary, #ff0a78) 20%, transparent)',
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
