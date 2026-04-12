import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        // Generic
        default: 'bg-[#0a1175] text-white',
        secondary: 'bg-gray-100 text-gray-800',
        destructive: 'bg-red-100 text-red-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        orange: 'bg-orange-100 text-orange-800',
        outline: 'border border-[#D3D3D3] text-[#7B7B7B] bg-white',

        // Status variants matching original PHP system
        aberto: 'text-white font-bold',
        divulgada: 'text-white font-bold',
        fechado: 'text-white font-bold',
        encerrada: 'text-white font-bold',
        publicado: 'text-[#262E3A] font-bold',
        publicada: 'text-[#262E3A] font-bold',
        suspensa: 'text-white font-bold',
        cancelada: 'bg-gray-400 text-white font-bold',

        // Priority variants (tarefas)
        baixa: 'text-[#262E3A] font-bold',
        media: 'text-[#262E3A] font-bold',
        alta: 'text-white font-bold',
        urgente: 'text-white font-bold',
        concluida: 'text-white font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Inline style map for variants that need specific bg colors
const variantStyleMap: Record<string, React.CSSProperties> = {
  aberto: { backgroundColor: '#259F46' },
  divulgada: { backgroundColor: '#259F46' },
  fechado: { backgroundColor: '#FF4500' },
  encerrada: { backgroundColor: '#FF4500' },
  publicado: { backgroundColor: '#FFD700' },
  publicada: { backgroundColor: '#FFD700' },
  suspensa: { backgroundColor: '#FFA500' },
  baixa: { backgroundColor: '#D3D3D3' },
  media: { backgroundColor: '#FFD700' },
  alta: { backgroundColor: '#FFA500' },
  urgente: { backgroundColor: '#FF4500' },
  concluida: { backgroundColor: '#32CD32' },
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, style, ...props }: BadgeProps) {
  const inlineStyle = variant && variantStyleMap[variant]
    ? { ...variantStyleMap[variant], ...style }
    : style;

  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={inlineStyle}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
