/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Outfit', 'Inter', 'sans-serif'],
            },
            colors: {
                navy: {
                    900: '#0a0e1a',
                    800: '#0f1629',
                    700: '#141d38',
                    600: '#1a2547',
                },
                beige: {
                    50: '#faf8f4',
                    100: '#f5f0e8',
                    200: '#ede8df',
                    300: '#e0d8cc',
                    400: '#c8bfb0',
                    500: '#a8a29e',
                },
            },
            boxShadow: {
                'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3), 0 0 60px rgba(59, 130, 246, 0.1)',
                'glow-blue-sm': '0 0 10px rgba(59, 130, 246, 0.2)',
                'glow-green': '0 0 20px rgba(34, 197, 94, 0.3)',
                'glow-indigo': '0 0 20px rgba(99, 102, 241, 0.3)',
                'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
                'glass-light': '0 8px 32px rgba(0, 0, 0, 0.08)',
                'lift': '0 20px 40px rgba(0, 0, 0, 0.4)',
                'lift-light': '0 10px 30px rgba(0, 0, 0, 0.1)',
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.5s ease-out',
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-in-left': 'slideInLeft 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'glow-pulse': 'glowPulse 2s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                glowPulse: {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
                },
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-6px)' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
}
