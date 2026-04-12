'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        // Primary/padrao: charcoal background
        default:
          'bg-[#262E3A] text-white hover:bg-[#1a2029] focus-visible:ring-[#262E3A]',
        padrao:
          'bg-[#262E3A] text-white hover:bg-[#1a2029] focus-visible:ring-[#262E3A]',
        // Orange filled
        orange:
          'bg-[#FF6600] text-white hover:bg-[#e05a00] focus-visible:ring-[#FF6600]',
        // Orange outline
        'orange-outline':
          'border border-[#FF6600] text-[#FF6600] bg-white hover:bg-[#FF6600] hover:text-white focus-visible:ring-[#FF6600]',
        // Charcoal outline
        outline:
          'border border-[#262E3A] text-[#262E3A] bg-white hover:bg-[#262E3A] hover:text-white focus-visible:ring-[#262E3A]',
        // Ghost
        ghost:
          'text-[#262E3A] hover:bg-gray-100 hover:text-[#262E3A]',
        // Danger/destructive
        danger:
          'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        // Secondary / link
        secondary:
          'bg-gray-100 text-gray-900 hover:bg-gray-200',
        link:
          'text-[#0a1175] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[50px] px-6 py-2',
        sm: 'h-[38px] rounded-md px-4 text-xs',
        lg: 'h-[56px] rounded-md px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
