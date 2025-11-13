/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Original dark color palette
        primary: {
          50: '#0f172a',
          100: '#1e293b',
          200: '#334155',
          300: '#475569',
          400: '#64748b',
          500: '#94a3b8',
          600: '#cbd5e1',
          700: '#e2e8f0',
          800: '#f1f5f9',
          900: '#f8fafc',
          950: '#ffffff',
        },
        accent: {
          50: '#1e1b4b',
          100: '#312e81',
          200: '#3730a3',
          300: '#4338ca',
          400: '#4f46e5',
          500: '#6366f1',
          600: '#7c3aed',
          700: '#8b5cf6',
          800: '#a855f7',
          900: '#c084fc',
          950: '#e9d5ff',
        },
        gradient: {
          start: '#1e293b',
          middle: '#4338ca',
          end: '#7c3aed',
        },
        // Dark neumorphic background
        neuro: {
          bg: '#1e293b',
          light: '#334155',
          dark: '#0f172a',
          text: '#cbd5e1',
          textDark: '#f8fafc',
        },
      },
      fontFamily: {
        'sans': ['Plus Jakarta Sans', 'Nunito', 'system-ui', 'sans-serif'],
        'display': ['Quicksand', 'Poppins', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        // Bouncy entrance animations
        'bounce-in': 'bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-in-up': 'bounceInUp 0.9s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-in-down': 'bounceInDown 0.9s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-in-left': 'bounceInLeft 0.9s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-in-right': 'bounceInRight 0.9s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'elastic-in': 'elasticIn 1s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'spring-up': 'springUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spring-scale': 'springScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        // Continuous bouncy animations
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'float-bounce': 'floatBounce 3s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'jello': 'jello 2s ease-in-out infinite',
        'rubber-band': 'rubberBand 1.5s ease-in-out infinite',
        // Subtle animations
        'fade-in': 'fadeIn 0.6s ease-out',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        // Bouncy entrance animations
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        bounceInUp: {
          '0%': { opacity: '0', transform: 'translateY(50px)' },
          '60%': { opacity: '1', transform: 'translateY(-10px)' },
          '80%': { transform: 'translateY(5px)' },
          '100%': { transform: 'translateY(0)' },
        },
        bounceInDown: {
          '0%': { opacity: '0', transform: 'translateY(-50px)' },
          '60%': { opacity: '1', transform: 'translateY(10px)' },
          '80%': { transform: 'translateY(-5px)' },
          '100%': { transform: 'translateY(0)' },
        },
        bounceInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-50px)' },
          '60%': { opacity: '1', transform: 'translateX(10px)' },
          '80%': { transform: 'translateX(-5px)' },
          '100%': { transform: 'translateX(0)' },
        },
        bounceInRight: {
          '0%': { opacity: '0', transform: 'translateX(50px)' },
          '60%': { opacity: '1', transform: 'translateX(-10px)' },
          '80%': { transform: 'translateX(5px)' },
          '100%': { transform: 'translateX(0)' },
        },
        elasticIn: {
          '0%': { opacity: '0', transform: 'scale(0)' },
          '55%': { opacity: '1', transform: 'scale(1.15)' },
          '65%': { transform: 'scale(0.95)' },
          '75%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        springUp: {
          '0%': { transform: 'translateY(0)' },
          '20%': { transform: 'translateY(-20px)' },
          '40%': { transform: 'translateY(-10px)' },
          '60%': { transform: 'translateY(-15px)' },
          '80%': { transform: 'translateY(-5px)' },
          '100%': { transform: 'translateY(0)' },
        },
        springScale: {
          '0%': { transform: 'scale(1)' },
          '20%': { transform: 'scale(1.2)' },
          '40%': { transform: 'scale(1.1)' },
          '60%': { transform: 'scale(1.15)' },
          '80%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1.1)' },
        },
        // Continuous bouncy animations
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        floatBounce: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '25%': { transform: 'translateY(-15px) scale(1.02)' },
          '50%': { transform: 'translateY(-8px) scale(0.98)' },
          '75%': { transform: 'translateY(-12px) scale(1.01)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        jello: {
          '0%, 100%': { transform: 'skewX(0deg) skewY(0deg)' },
          '30%': { transform: 'skewX(12.5deg) skewY(12.5deg)' },
          '40%': { transform: 'skewX(-6deg) skewY(-6deg)' },
          '50%': { transform: 'skewX(3deg) skewY(3deg)' },
          '65%': { transform: 'skewX(-1.5deg) skewY(-1.5deg)' },
          '75%': { transform: 'skewX(0.5deg) skewY(0.5deg)' },
        },
        rubberBand: {
          '0%, 100%': { transform: 'scale(1)' },
          '30%': { transform: 'scaleX(1.25) scaleY(0.75)' },
          '40%': { transform: 'scaleX(0.75) scaleY(1.25)' },
          '50%': { transform: 'scaleX(1.15) scaleY(0.85)' },
          '65%': { transform: 'scaleX(0.95) scaleY(1.05)' },
          '75%': { transform: 'scaleX(1.05) scaleY(0.95)' },
        },
        // Subtle animations
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(0.98)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, #1e293b 0%, #4338ca 50%, #7c3aed 100%)',
        'gradient-mesh-2': 'linear-gradient(135deg, #0f172a 0%, #312e81 50%, #4338ca 100%)',
      },
      boxShadow: {
        // Dark neumorphic shadows (dual light/dark shadows)
        'neuro': '8px 8px 16px #0f172a, -8px -8px 16px #334155',
        'neuro-sm': '4px 4px 8px #0f172a, -4px -4px 8px #334155',
        'neuro-lg': '12px 12px 24px #0f172a, -12px -12px 24px #334155',
        'neuro-xl': '16px 16px 32px #0f172a, -16px -16px 32px #334155',
        // Inset neumorphic (for pressed state)
        'neuro-inset': 'inset 6px 6px 12px #0f172a, inset -6px -6px 12px #334155',
        'neuro-inset-sm': 'inset 3px 3px 6px #0f172a, inset -3px -3px 6px #334155',
        // Soft floating shadow for cards
        'soft': '0 4px 16px rgba(0, 0, 0, 0.3)',
        'soft-lg': '0 8px 24px rgba(0, 0, 0, 0.4)',
      },
      blur: {
        'xs': '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}