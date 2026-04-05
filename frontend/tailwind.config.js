/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#faf9f6',
        border: '#e8e4dd',
        text: '#1a1a1a',
        muted: '#6b6860',
        score: {
          green: '#22c55e',
          amber: '#f59e0b',
          red: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['DM Sans', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
