/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0A0F1D',
          900: '#0F1729', // Primary institutional canvas
          850: '#141E34', // Primary card/panel surface
          800: '#1A2742', // Elevated container
          700: '#263B5D', // Hairline borders
          600: '#344E77',
        },
        paper: {
          DEFAULT: '#F7F5F0', // Warm paper register white
          muted: '#EFECE4',
          dark: '#E2DDD2',
          light: '#FCFBF9',
        },
        steel: {
          DEFAULT: '#1E3A5F', // Muted steel blue primary accent
          light: '#284C7A',
          dark: '#13243B',
          border: '#243750',
        },
        statutory: {
          amber: '#B45309', // Warning: 0-7 days left to breach
          red: '#7F1D1D',   // Critical: Breached statutory deadline
          green: '#15803D', // Compliant: On-track payment
        },
        msme: {
          micro: '#15803D',
          small: '#1E3A5F',
          medium: '#475569',
          unregistered: '#64748b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Lora', 'Source Serif 4', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
