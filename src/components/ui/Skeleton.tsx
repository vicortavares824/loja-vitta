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
    <div aria-hidden className="flex flex-col motion-safe:animate-pulse">
      {/* Mesmo formato do ProductCardModern: foto 3:4 + linha nome/preço + cores */}
      <div className="aspect-[3/4] w-full bg-ink-2" />
      <div className="flex items-start justify-between gap-3 pt-3">
        <div className="h-3.5 w-3/5 bg-ink-3" />
        <div className="h-3.5 w-14 bg-ink-3" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-3 w-3 rounded-full bg-ink-3" />
        <div className="h-3 w-3 rounded-full bg-ink-3" />
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
