const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
 content: [
  './*.html',                  // ← add this if login.html is in root
  './public/**/*.html',
  './public/js/**/*.js',
  './routes/**/*.js',
  './views/**/*.ejs'
],

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
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
