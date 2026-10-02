/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 品牌色阶：与「做网站时定的全局 CSS」(holang-admin/css/style.css) 的
        // --color-primary #1a56db 对齐。600=主色, 700=hover。沿用网站体系，不另造。
        brand: { 50: '#eef3fe', 100: '#dbe4fd', 200: '#bccfff', 300: '#93b2fb', 400: '#5e88f4', 500: '#3a72e8', 600: '#1a56db', 700: '#1e40af', 800: '#1a3a93', 900: '#172e6e' },
      },
    },
  },
  plugins: [],
}
