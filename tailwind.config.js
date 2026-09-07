/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}", "./src/**/*.{html,cjs}"],
  // Keep navigation usable on an older cached HTML page during deployment.
  safelist: ['md:flex', 'md:hidden'],
  theme: {
    extend: {
      colors: {
        brand: 'oklch(0.378 0.077 168.94)',
        'brand-hover': 'oklch(0.448 0.119 151.328)',
        'brand-active': 'oklch(0.418 0.119 151.328)',
        'brand-divider': 'oklch(0.527 0.154 150.069)',
      },
    },
  },
  plugins: [],
}
