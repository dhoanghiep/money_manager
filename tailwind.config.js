/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        income: '#22C55E',
        expense: '#EF4444',
      },
    },
  },
  plugins: [],
}
