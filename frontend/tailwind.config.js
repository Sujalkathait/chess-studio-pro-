/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chess: {
          light: '#f0d9b5',
          dark: '#b58863',
          selected: '#f6e58d',
          selectedDark: '#eccc68',
          lastMoveLight: '#ced6b2',
          lastMoveDark: '#aaa23a',
          check: '#ff7675',
          safeMove: '#2ed573'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'board': '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 0 12px #2d3436',
        'card': '0 10px 30px -5px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}
