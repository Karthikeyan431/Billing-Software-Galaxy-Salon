import { cn } from '../../utils/helpers';

export default function Select({ label, error, children, className, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select
        className={cn(
          'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all',
          error && 'border-red-500',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
