import React, { useRef, useState } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';

interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  maxRotateX?: number;
  maxRotateY?: number;
  scaleOnHover?: number;
}

export const TiltedCard: React.FC<TiltedCardProps> = ({
  children,
  className = '',
  maxRotateX = 14,
  maxRotateY = 14,
  scaleOnHover = 1.03
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(y, [0, 1], [maxRotateX, -maxRotateX]), {
    stiffness: 300,
    damping: 25
  });

  const rotateY = useSpring(useTransform(x, [0, 1], [-maxRotateY, maxRotateY]), {
    stiffness: 300,
    damping: 25
  });

  const scale = useSpring(isHovered ? scaleOnHover : 1, {
    stiffness: 300,
    damping: 25
  });

  // Glare position
  const glareX = useTransform(x, [0, 1], [0, 100]);
  const glareY = useTransform(y, [0, 1], [0, 100]);
  const glareOpacity = useSpring(isHovered ? 0.25 : 0, { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <div style={{ perspective: 1000 }} className="w-full">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: 'preserve-3d'
        }}
        className={`relative overflow-hidden rounded-2xl transition-shadow duration-500 ${className}`}
      >
        {children}

        {/* Glare Sheen Overlay */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 70%)`,
            opacity: glareOpacity
          }}
        />
      </motion.div>
    </div>
  );
};
