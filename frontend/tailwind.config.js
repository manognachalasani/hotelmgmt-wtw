/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#137fec',
        'background-light': '#f6f7f8',
        'background-dark': '#101922',
        'surface-light': '#ffffff',
        'surface-dark': '#1a2734',
        accent: '#D4AF37',
        'neutral-light': '#F8F9FA',
        'neutral-dark': '#343A40',
        'text-light': '#101922',
        'text-dark': '#e3e9f0',
        'text-muted-light': '#6b7f99',
        'text-muted-dark': '#8c9fb6',
        'text-secondary-light': '#6C757D',
        'text-secondary-dark': '#adb5bd',
        'border-light': '#e3e9f0',
        'border-dark': '#314357',
        'card-light': '#ffffff',
        'card-dark': '#1a242f',
        'info-bg-light': '#fff3cd',
        'info-text-light': '#856404',
        'info-border-light': '#ffeeba',
        'info-bg-dark': '#4d3b0b',
        'info-text-dark': '#ffc107',
        'info-border-dark': '#ffc107',
      },
      fontFamily: {
        display: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      boxShadow: {
        'soft-card': '0 25px 65px -35px rgba(15, 23, 42, 0.45)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/container-queries')],
};

