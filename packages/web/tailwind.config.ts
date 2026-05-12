import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EBF3FE',
          100: '#D6E7FD',
          200: '#ADCFFB',
          300: '#85B7F9',
          400: '#5C9FF7',
          500: '#1878EC',   // Main brand blue
          600: '#1360BD',
          700: '#0E488E',
          800: '#0A305E',
          900: '#05182F',
        },
        // Travel-themed accent colors
        sky: {
          light: '#E0F2FE',
          DEFAULT: '#38BDF8',
          dark: '#0369A1',
        },
        sunset: {
          light: '#FEF3C7',
          DEFAULT: '#F59E0B',
          dark: '#B45309',
        },
        prediction: {
          buy: '#22C55E',    // Green — buy now
          wait: '#F59E0B',   // Yellow — wait
          nodata: '#9CA3AF', // Gray — no data
        },
        price: {
          cheap: '#22C55E',
          medium: '#F59E0B',
          expensive: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
