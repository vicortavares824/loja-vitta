import React from 'react';
import { motion } from 'framer-motion';
import type { Easing } from 'framer-motion';

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
}

const customEase: Easing = [0.16, 1, 0.3, 1];

export const BlurText: React.FC<BlurTextProps> = ({
  text,
  className = '',
  delay = 100,
  animateBy = 'words',
  direction = 'top'
}) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delay / 1000
      }
    }
  };

  const itemVariants = {
    hidden: {
      filter: 'blur(12px)',
      opacity: 0,
      y: direction === 'top' ? -20 : 20
    },
    visible: {
      filter: 'blur(0px)',
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: customEase
      }
    }
  };

  return (
    <motion.div
      className={`inline-flex flex-wrap ${className}`}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
    >
      {elements.map((el, i) => (
        <motion.span
          key={i}
          variants={itemVariants}
          className="inline-block"
          style={{ marginRight: animateBy === 'words' ? '0.28em' : '0.05em' }}
        >
          {el === ' ' ? '\u00A0' : el}
        </motion.span>
      ))}
    </motion.div>
  );
};
