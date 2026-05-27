import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary:   '#F97316', // tangerina — CTA, links, logo accent
          secondary: '#0EA5E9', // azul piscina — badges, ícones de categoria
          accent:    '#84CC16', // verde parque — "hoje", "novo", tags positivas
        },
        surface: {
          base:  '#FDFAF4', // fundo da página
          card:  '#F5F2EC', // fundo de cards e seções alternadas
          muted: '#E7E5E4', // bordas, separadores
        },
        ink: {
          DEFAULT: '#1C1917', // texto principal
          mid:     '#78716C', // subtítulos, metadados
          soft:    '#A8A29E', // labels, placeholders
        },
        // Aliases para classes legadas (S3.1) até migração completa dos componentes
        primary: {
          DEFAULT: '#F97316',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#0EA5E9',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#84CC16',
          foreground: '#FFFFFF',
        },
        warn: {
          DEFAULT: '#F59E0B',
          foreground: '#1C1917',
        },
        error: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Fraunces', 'serif'],
        sans:    ['var(--font-sans)', 'Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
