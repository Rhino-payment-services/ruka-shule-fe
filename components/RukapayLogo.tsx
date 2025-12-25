import Image from 'next/image';
import { cn } from '@/lib/utils';

interface RukapayLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function RukapayLogo({ className, size = 'md', showText = true }: RukapayLogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        <Image
          src="/images/logoRukapay2.png"
          alt="Rukapay Logo"
          width={64}
          height={64}
          className="h-full w-full object-contain"
          priority
        />
      </div>
      {showText && (
        <span className={cn('font-bold bg-gradient-to-r from-primary to-[#0052A3] bg-clip-text text-transparent', textSizeClasses[size])}>
          Rukapay
        </span>
      )}
    </div>
  );
}
