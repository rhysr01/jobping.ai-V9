import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
	theme: {
    	fontFamily: {
    		display: [
    			'Clash Display',
    			'Inter',
    			'system-ui',
    			'sans-serif'
    		],
    		sans: [
    			'Inter',
    			'system-ui',
    			'sans-serif'
    		]
    	},
    	extend: {
    		colors: {
    			brand: {
    				'50': '#F0FDFA',
    				'100': '#CCFBF1',
    				'200': '#99F6E4',
    				'300': '#5EEAD4',
    				'400': '#2DD4BF',
    				'500': '#14B8A6', // Primary teal
    				'600': '#0D9488',
    				'700': '#0F766E',
    				'800': '#115E59',
    				'900': '#134E4A',
    				'950': '#042F2E'
    			},
    			success: {
    				'50': '#f0fdf4',
    				'100': '#dcfce7',
    				'500': '#22c55e',
    				'600': '#16a34a'
    			},
    			warning: {
    				'50': '#fffbeb',
    				'100': '#fef3c7',
    				'500': '#f59e0b',
    				'600': '#d97706'
    			},
    			error: {
    				'50': '#fef2f2',
    				'100': '#fee2e2',
    				'500': '#ef4444',
    				'600': '#dc2626'
    			},
    			info: {
    				'50': '#eff6ff',
    				'100': '#dbeafe',
    				'500': '#3b82f6',
    				'600': '#2563eb'
    			},
    			neutral: {
    				'50': '#fafafa',
    				'100': '#f5f5f5',
    				'200': '#e5e5e5',
    				'300': '#d4d4d4',
    				'400': '#a3a3a3',
    				'500': '#737373',
    				'600': '#525252',
    				'700': '#404040',
    				'800': '#262626',
    				'900': '#171717',
    				'950': '#0a0a0a'
    			},
    			content: {
    				primary: '#ffffff',
    				secondary: '#d4d4d8',
    				muted: '#a1a1aa',
    				disabled: '#71717a',
    				heading: '#f4f4f5',
    				accent: '#5EEAD4' // Teal accent for text
    			},
    			surface: {
    				base: '#09090b',
    				elevated: '#18181b',
    				card: 'rgba(255, 255, 255, 0.05)',
    				hover: 'rgba(255, 255, 255, 0.08)'
    			},
    			glass: {
    				subtle: 'rgba(255, 255, 255, 0.03)',
    				default: 'rgba(255, 255, 255, 0.05)',
    				elevated: 'rgba(255, 255, 255, 0.10)'
    			},
    			border: 'hsl(var(--border))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			}
    		},
    		borderRadius: {
    			frame: '28px',
    			card: '1rem',
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		keyframes: {
    			float: {
    				'0%,100%': {
    					transform: 'translateY(0)'
    				},
    				'50%': {
    					transform: 'translateY(-6px)'
    				}
    			},
    			shimmer: {
    				from: {
    					backgroundPosition: '0 0'
    				},
    				to: {
    					backgroundPosition: '-200% 0'
    				}
    			},
    			pulseRing: {
    				'0%': {
    					boxShadow: '0 0 0 0 rgba(99,102,241,0.35)'
    				},
    				'70%': {
    					boxShadow: '0 0 0 24px rgba(99,102,241,0)'
    				},
    				'100%': {
    					boxShadow: '0 0 0 0 rgba(99,102,241,0)'
    				}
    			}
    		},
    		animation: {
    			float: 'float 5s ease-in-out infinite',
    			shimmer: 'shimmer 2s linear infinite',
    			pulseRing: 'pulseRing 2.4s ease-out infinite'
    		},
    		scale: {
    			'102': '1.02',
    			'98': '0.98'
    		},
    		fontSize: {
    			xs: [
    				'0.75rem',
    				{
    					lineHeight: '1.5',
    					letterSpacing: '0'
    				}
    			],
    			sm: [
    				'0.875rem',
    				{
    					lineHeight: '1.5',
    					letterSpacing: '0'
    				}
    			],
    			base: [
    				'1rem',
    				{
    					lineHeight: '1.6',
    					letterSpacing: '0'
    				}
    			],
    			xl: [
    				'1.5rem',
    				{
    					lineHeight: '1.4',
    					letterSpacing: '-0.01em'
    				}
    			],
    			'3xl': [
    				'2rem',
    				{
    					lineHeight: '1.3',
    					letterSpacing: '-0.01em'
    				}
    			],
    			'5xl': [
    				'3.5rem',
    				{
    					lineHeight: '1.1',
    					letterSpacing: '-0.02em'
    				}
    			],
    			'6xl': [
    				'3.75rem',
    				{
    					lineHeight: '1.05',
    					letterSpacing: '-0.025em'
    				}
    			]
    		},
    		boxShadow: {
    			base: '0 1px 2px 0 rgb(255 255 255 / 0.05)',
    			raised: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    			overlay: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    			'elev-1': '0 10px 30px -10px rgba(20,184,166,0.2)', // Teal elevation
    			'elev-2': '0 20px 60px -18px rgba(20,184,166,0.25)', // Teal elevation
    			'glow-subtle': '0 0 12px rgba(20,184,166,0.15)', // Teal glow
    			'glow-strong': '0 0 24px rgba(20,184,166,0.2)', // Teal glow
    			'glow-gold': '0 0 16px rgba(245,158,11,0.3)' // Gold glow for premium elements
    		},
    		transitionDuration: {
    			'150': '150ms',
    			'200': '200ms',
    			'300': '300ms'
    		},
    		backgroundImage: {
    			'glass-subtle': 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
    			'glass-default': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
    			'glass-elevated': 'linear-gradient(135deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0.06) 100%)',
    			'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
    			'gradient-brand': 'linear-gradient(to right, rgba(20,184,166,0.9) 0%, rgba(244,244,245,1) 50%, rgba(20,184,166,0.9) 100%)', // Teal gradient
    			'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
    			'gradient-accent': 'linear-gradient(to right, rgba(20,184,166,0.7), rgba(245,158,11,0.7))', // Teal to gold
    			'gradient-hero': 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,1) 100%)' // Charcoal gradient
    		},
    		spacing: {
    			section: '5rem',
    			container: '1.5rem'
    		}
    	}
    },
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
