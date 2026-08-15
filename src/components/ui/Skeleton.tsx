import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div 
      className={`relative overflow-hidden bg-white/10 rounded-2xl animate-pulse ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.03) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite ease-in-out'
      }}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white/5 rounded-[28px] p-4 sm:p-5 border border-white/10 flex flex-col justify-between h-[520px] space-y-4 animate-pulse">
      {/* Image placeholder */}
      <div className="w-full h-64 sm:h-72 rounded-[22px] bg-white/10 relative overflow-hidden">
        <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/15" />
      </div>

      {/* Content */}
      <div className="space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-5 bg-white/15 rounded-lg w-3/4" />
          <div className="h-6 bg-white/20 rounded-lg w-1/3" />
          <div className="h-3 bg-white/10 rounded w-full mt-2" />
          <div className="h-3 bg-white/10 rounded w-4/5" />
        </div>

        {/* Colors and sizes */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/15" />
            <div className="w-5 h-5 rounded-full bg-white/15" />
            <div className="w-5 h-5 rounded-full bg-white/15" />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="w-20 h-7 rounded-full bg-white/10" />
            <div className="w-24 h-9 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 animate-pulse gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-14 rounded-xl bg-white/10" />
            <div className="space-y-2">
              <div className="w-40 h-4 bg-white/15 rounded" />
              <div className="w-24 h-3 bg-white/10 rounded" />
            </div>
          </div>
          <div className="w-20 h-4 bg-white/10 rounded hidden sm:block" />
          <div className="w-16 h-5 bg-white/15 rounded-full" />
          <div className="w-16 h-8 bg-white/10 rounded-xl" />
        </div>
      ))}
    </div>
  );
};
