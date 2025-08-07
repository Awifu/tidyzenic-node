const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './*.html',
    './public/**/*.html',
    './src/**/*.{js,ts}',
    './views/**/*.ejs',
  ],
  darkMode: 'class', // 🌙 Enable class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: '#1A73E8',
        secondary: '#F1F5F9',
        accent: '#10B981',
        dark: '#111827',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
