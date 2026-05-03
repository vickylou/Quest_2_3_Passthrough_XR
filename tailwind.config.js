/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lisa: { primary: '#16a34a', accent: '#2563eb' },
        vicky: { primary: '#eab308', accent: '#f97316' },
        jackie: { primary: '#dc2626', accent: '#ec4899' },
        alexa: { primary: '#9333ea', accent: '#7c3aed' },
      },
    },
  },
  plugins: [],
};
