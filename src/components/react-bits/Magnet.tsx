import React, { useRef, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

interface MagnetProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
}

export const Magnet: React.FC<MagnetProps> = ({
  children,
  className = '',
  strength = 30,
  onClick
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const springConfig = { stiffness: 200, damping: 15, mass: 0.1 };
  const dx = useSpring(position.x, springConfig);
  const dy = useSpring(position.y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const distanceX = (e.clientX - centerX) / (width / 2);
    const distanceY = (e.clientY - centerY) / (height / 2);

    setPosition({ x: distanceX * strength, y: distanceY * strength });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ x: dx, y: dy }}
      className={`inline-block cursor-pointer ${className}`}
    >
      {children}
    </motion.div>
  );
};
