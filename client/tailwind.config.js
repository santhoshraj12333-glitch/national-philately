/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        postal: {
          red: '#C41E3A',
          blue: '#1B3A5C',
          cream: '#F5F0E8',
          paper: '#FDFBF7',
          gold: '#D4A843',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
