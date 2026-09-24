/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCFA',
          100: '#FAF9F5',
          200: '#F5F4ED',
          300: '#EFECE3',
          400: '#E5E1D5',
        },
        molecule: {
          dark: '#0F172A',
          muted: '#64748B',
          lavender: '#8B5CF6',
          blue: '#3B82F6',
          cyan: '#06B6D4',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
        'glass-hover': '0 12px 40px 0 rgba(31, 38, 135, 0.09)',
        'crystal': '0 0 25px rgba(139, 92, 246, 0.12)',
      },
      backdropBlur: {
        'glass': '16px',
      }
    },
  },
  plugins: [],
}
