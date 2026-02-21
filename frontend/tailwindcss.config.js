/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  // ĐƯA NÓ VÀO ĐÂY NÈ ÔNG GIÁO
  plugins: [
    require('@tailwindcss/typography'),
  ],
}