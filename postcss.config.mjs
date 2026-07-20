// Tailwind CSS v4 uses a dedicated PostCSS plugin. No tailwind.config.js needed —
// design tokens live in app/globals.css under the @theme block.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
