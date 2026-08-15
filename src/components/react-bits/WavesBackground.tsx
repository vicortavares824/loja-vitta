import React, { useEffect, useRef } from 'react';

interface WavesBackgroundProps {
  lineColor?: string;
  particleColor?: string;
  waveSpeed?: number;
}

export const WavesBackground: React.FC<WavesBackgroundProps> = ({
  lineColor = 'rgba(212, 175, 55, 0.12)',
  particleColor = 'rgba(139, 92, 246, 0.3)',
  waveSpeed = 0.008
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particles array
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.2
    }));

    let step = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      step += waveSpeed;

      // Draw 4 glowing sine waves
      for (let w = 0; w < 4; w++) {
        ctx.beginPath();
        ctx.lineWidth = 1.5 - w * 0.3;
        ctx.strokeStyle = lineColor;

        const amplitude = 30 + w * 15;
        const frequency = 0.002 + w * 0.0005;
        const offsetY = height * (0.4 + w * 0.12);

        for (let x = 0; x <= width; x += 15) {
          const y = Math.sin(x * frequency + step + w) * amplitude + offsetY;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Draw floating glowing particles
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#d4af37';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [lineColor, particleColor, waveSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-70"
    />
  );
};
