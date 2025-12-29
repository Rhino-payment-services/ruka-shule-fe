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

  // Extract text color from className if present, otherwise use default
  const textColorMatch = className?.match(/text-\[#[0-9a-fA-F]{6}\]|text-white|text-\[#08163d\]/);
  const textColor = textColorMatch ? textColorMatch[0] : 'text-[#08163d]';
  const containerClassName = className?.replace(/text-\[#[0-9a-fA-F]{6}\]|text-white|text-\[#08163d\]/g, '').trim();
  
  return (
    <div className={cn('flex items-center gap-3', containerClassName || '')}>
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
        <span className={cn('font-bold', textColor, textSizeClasses[size])}>
          Rukapay
        </span>
      )}
    </div>
  );
}
