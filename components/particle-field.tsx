'use client';

import { useEffect, useRef } from 'react';

type Particle = { x: number; y: number; vx: number; vy: number; radius: number; violet: boolean };

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const field = canvas?.parentElement;
    const hero = field?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !field || !hero || !context) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = { x: -1000, y: -1000 };
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let reduced = motionQuery.matches;
    let lastTime = 0;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > 112) continue;
          context.strokeStyle = `rgba(${a.violet || b.violet ? '148, 107, 255' : '57, 154, 255'}, ${((1 - distance / 112) * 0.17).toFixed(3)})`;
          context.lineWidth = 0.7;
          context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
        }
        const nearPointer = Math.max(0, 1 - Math.hypot(a.x - pointer.x, a.y - pointer.y) / 125);
        context.fillStyle = a.violet ? `rgba(174, 130, 255, ${0.38 + nearPointer * 0.42})` : `rgba(97, 186, 255, ${0.39 + nearPointer * 0.45})`;
        context.beginPath(); context.arc(a.x, a.y, a.radius + nearPointer * 0.7, 0, Math.PI * 2); context.fill();
      }
    };

    const animate = (time: number) => {
      frame = 0;
      if (reduced || !visible || document.hidden) return;
      const delta = Math.min((time - lastTime) / 16.67 || 1, 2);
      lastTime = time;
      for (const particle of particles) {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        if (particle.x < -5) particle.x = width + 5;
        if (particle.x > width + 5) particle.x = -5;
        if (particle.y < -5) particle.y = height + 5;
        if (particle.y > height + 5) particle.y = -5;
      }
      draw();
      frame = window.requestAnimationFrame(animate);
    };

    const syncMotion = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      draw();
      if (!reduced && visible && !document.hidden) frame = window.requestAnimationFrame(animate);
    };

    const resize = () => {
      const rect = field.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const maxParticles = width < 640 ? 28 : 74;
      const count = Math.min(maxParticles, Math.max(14, Math.round(width * height / (width < 640 ? 10000 : 12500))));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.24, vy: (Math.random() - 0.5) * 0.24,
        radius: Math.random() * 1.2 + 0.45, violet: index % 4 === 0,
      }));
      syncMotion();
    };
    const onPointerMove = (event: PointerEvent) => {
      const rect = field.getBoundingClientRect();
      pointer.x = event.clientX - rect.left; pointer.y = event.clientY - rect.top;
    };
    const onPointerLeave = () => { pointer.x = -1000; pointer.y = -1000; };
    const onMotionChange = () => { reduced = motionQuery.matches; syncMotion(); };
    const onVisibilityChange = () => syncMotion();
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncMotion(); }, { threshold: 0 });

    resizeObserver.observe(field);
    intersectionObserver.observe(hero);
    hero.addEventListener('pointermove', onPointerMove, { passive: true });
    hero.addEventListener('pointerleave', onPointerLeave);
    motionQuery.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    resize();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect(); intersectionObserver.disconnect();
      hero.removeEventListener('pointermove', onPointerMove);
      hero.removeEventListener('pointerleave', onPointerLeave);
      motionQuery.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return <div className="home-particle-field" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}
