import React, { useState } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-gray-100 dark:bg-[#15151a] ${containerClassName}`}>
      {/* Shimmer Placeholder */}
      {!isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-white/10 animate-pulse"
          style={{
            backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 100%)',
            backgroundSize: '200% 100%'
          }}
        />
      )}

      {/* Actual Image */}
      <img
        src={hasError ? 'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=800&q=80' : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isLoaded ? 'opacity-100 scale-100 filter-none' : 'opacity-0 scale-105 blur-sm'
        } ${className}`}
        {...props}
      />
    </div>
  );
};
