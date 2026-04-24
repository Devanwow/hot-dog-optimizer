/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'safety-yellow': '#FFE600',
        'safety-yellow-dark': '#CDB800',
        'hc-black': '#0A0A0A',
        'hc-white': '#F5F5F5',
      },
    },
  },
  plugins: [],
}
