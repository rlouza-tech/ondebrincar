import { MapPin } from 'lucide-react'

type LogoVariant = 'light' | 'dark' | 'brand'

interface LogoProps {
  variant?: LogoVariant
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const sizes = {
  sm: { icon: 28, pin: 12, onde: 'text-[9px]',  brincar: 'text-[17px]' },
  md: { icon: 36, pin: 16, onde: 'text-[10px]', brincar: 'text-[22px]' },
  lg: { icon: 44, pin: 20, onde: 'text-[12px]', brincar: 'text-[28px]' },
}

const variants = {
  light: {
    pin:     'bg-brand-primary',
    onde:    'text-ink-mid',
    brincar: 'text-ink',
    dot:     'text-brand-primary',
  },
  dark: {
    pin:     'bg-brand-primary',
    onde:    'text-white/40',
    brincar: 'text-white',
    dot:     'text-brand-primary',
  },
  brand: {
    pin:     'bg-black/20',
    onde:    'text-white/70',
    brincar: 'text-white',
    dot:     'text-white/50',
  },
}

export function Logo({
  variant = 'light',
  size = 'md',
  showIcon = true,
  className = '',
}: LogoProps) {
  const s = sizes[size]
  const v = variants[variant]

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {showIcon && (
        <div
          className={`${v.pin} rounded-[10px] flex items-center justify-center flex-shrink-0`}
          style={{ width: s.icon, height: s.icon }}
        >
          <MapPin size={s.pin} strokeWidth={2.4} className="text-white" />
        </div>
      )}
      <div className="flex flex-col leading-none">
        <span
          className={`font-sans font-extrabold uppercase tracking-widest ${s.onde} ${v.onde}`}
        >
          onde
        </span>
        <span
          className={`font-display font-bold tracking-tight ${s.brincar} ${v.brincar}`}
        >
          brincar<span className={v.dot}>.</span>
        </span>
      </div>
    </div>
  )
}
