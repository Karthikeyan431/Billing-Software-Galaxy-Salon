import { cn } from '../../utils/helpers';

export default function Button({ children, variant = 'primary', size = 'md', className, disabled, ...props }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none';

  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    gold: 'bg-salon-gold text-white hover:opacity-90',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
