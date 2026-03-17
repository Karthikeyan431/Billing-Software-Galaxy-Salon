import { cn } from '../../utils/helpers';

export function StatCard({ title, value, icon, trend, trendValue, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
    blue: 'bg-blue-50 text-blue-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trendValue && (
            <p className={cn('text-xs mt-1 font-medium', trend === 'up' ? 'text-green-600' : 'text-red-600')}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </p>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-xl', colors[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
