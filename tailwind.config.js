/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'tesla-blue': '#00e5ff',
                'tesla-red': '#ff3d00',
                'glass-bg': 'rgba(14, 14, 14, 0.85)',
                'glass-border': 'rgba(255, 255, 255, 0.1)',
            },
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
                outfit: ['Outfit', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
