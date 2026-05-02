/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lisa: '#7c9ec3',
        vicky: '#c37c9e',
        jackie: '#c39e7c',
        alexa: '#7cc39e',
      },
    },
  },
  plugins: [],
};
