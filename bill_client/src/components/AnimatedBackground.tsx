"use client";
import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  type: 'dot' | 'line';
  angle?: number;
  length?: number;
  rotationSpeed?: number;
  pulsePhase?: number;
}

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to full viewport
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    // Create particles with only dots and lines
    const particles: Particle[] = [];
    const particleCount = 80;

    // Initialize particles
    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        // 70% dots, 30% lines for cleaner look
        const randomType = Math.random() < 0.7 ? 'dot' : 'line';
        
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          size: randomType === 'dot' ? Math.random() * 2 + 1 : Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.3 + 0.2,
          type: randomType,
          angle: Math.random() * Math.PI * 2,
          length: Math.random() * 25 + 10,
          rotationSpeed: (Math.random() - 0.5) * 0.015,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    initParticles();

    // Draw mesh connections between particles
    const drawMeshConnections = () => {
      const maxDistance = 100;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.15;
            
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[j].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(156, 163, 175, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    };

    // Draw individual particles (dots and lines only)
    const drawParticle = (particle: Particle, time: number) => {
      const pulseFactor = 1 + Math.sin(time + particle.pulsePhase!) * 0.1;
      const currentSize = particle.size * pulseFactor;
      
      ctx.save();
      ctx.translate(particle.x, particle.y);
      
      // Clear any previous shadow effects
      ctx.shadowBlur = 0;
      
      if (particle.type === 'dot') {
        // Simple dots
        ctx.beginPath();
        ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(156, 163, 175, ${particle.opacity})`;
        ctx.fill();
        
      } else if (particle.type === 'line') {
        // Simple rotating lines
        ctx.rotate(particle.angle!);
        
        const halfLength = (particle.length! * pulseFactor) / 2;
        ctx.beginPath();
        ctx.moveTo(-halfLength, 0);
        ctx.lineTo(halfLength, 0);
        ctx.strokeStyle = `rgba(156, 163, 175, ${particle.opacity})`;
        ctx.lineWidth = currentSize;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      
      ctx.restore();
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const time = Date.now() * 0.001;

      // Draw mesh connections first (behind particles)
      drawMeshConnections();

      // Update and draw particles
      particles.forEach((particle, index) => {
        // Smooth movement
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Boundary wrapping
        if (particle.x < -20) particle.x = canvas.width + 20;
        if (particle.x > canvas.width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = canvas.height + 20;
        if (particle.y > canvas.height + 20) particle.y = -20;

        // Update rotation for lines
        if (particle.type === 'line' && particle.rotationSpeed) {
          particle.angle! += particle.rotationSpeed;
        }

        // Draw particle
        drawParticle(particle, time);
      });

      requestAnimationFrame(animate);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      resizeCanvas();
      initParticles();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 w-full h-full"
      style={{ background: 'transparent' }}
    />
  );
};

export default AnimatedBackground;