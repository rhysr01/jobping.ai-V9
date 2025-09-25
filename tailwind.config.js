/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './public/*.html',
  ],
  safelist: [
    // Dynamic classes that might get purged
    'bg-gradient-radial',
    'shadow-3xl',
    'shadow-4xl',
    'shadow-5xl',
    'backdrop-blur-4xl',
    'from-purple-400',
    'to-purple-600',
    'from-purple-500',
    'to-purple-700',
    'from-purple-600',
    'to-purple-800',
    'bg-purple-600',
    'hover:bg-purple-700',
    'border-purple-600/30',
    'text-purple-400',
    'bg-purple-500/10',
    'border-purple-500/20',
    'text-purple-300',
    // Animation classes
    'animate-pulse',
    'animate-pulse-slow',
    'animate-glow',
    'animate-float',
    'animate-shimmer',
    // Glass morphism effects
    'backdrop-blur-xl',
    'backdrop-blur-2xl',
    'backdrop-blur-3xl',
    // Gradient text
    'bg-clip-text',
    'text-transparent',
    'bg-gradient-to-r',
    'bg-gradient-to-b',
    'bg-gradient-to-br',
    'from-white',
    'via-zinc-100',
    'to-zinc-300',
    // Hover states
    'hover:scale-105',
    'hover:shadow-3xl',
    'hover:shadow-4xl',
    'group-hover:opacity-100',
    'group-hover:scale-110',
  ],
  theme: {
    extend: {
      // Custom background gradients
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      
      // Enhanced shadows for premium effects
      boxShadow: {
        '3xl': '0 35px 60px -12px rgba(0, 0, 0, 0.25)',
        '4xl': '0 45px 80px -15px rgba(0, 0, 0, 0.3)',
        '5xl': '0 60px 100px -20px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 20px rgba(255, 255, 255, 0.1)',
        'glow-lg': '0 0 40px rgba(255, 255, 255, 0.15)',
        'glow-xl': '0 0 60px rgba(255, 255, 255, 0.2)',
        'inner-glow': 'inset 0 0 20px rgba(255, 255, 255, 0.05)',
      },
      
      // Enhanced blur effects
      backdropBlur: {
        '4xl': '72px',
      },
      
      // Custom animations for premium effects
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)' },
          '100%': { boxShadow: '0 0 40px rgba(255, 255, 255, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      
      // Enhanced spacing for premium layouts
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // Premium color palette extensions
      colors: {
        zinc: {
          950: '#09090b',
        },
      },
      
      // Enhanced border radius for glass morphism
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      
      // Premium typography
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      
      // Enhanced backdrop filters
      backdropBlur: {
        '4xl': '72px',
      },
    },
  },
  plugins: [],
}
