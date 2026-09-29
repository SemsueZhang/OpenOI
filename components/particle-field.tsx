'use client';

import { useEffect, useRef } from 'react';

type GalaxyStar = {
  radius: number;
  angle: number;
  height: number;
  speed: number;
  size: number;
  tone: number;
  phase: number;
  streak: boolean;
};

type FieldStar = { x: number; y: number; size: number; phase: number; tone: number };
type Point = { x: number; y: number; depth: number; scale: number };

const colors = ['#6bd8ff', '#91aaff', '#ba91ff', '#f1f7ff', '#f68dcf'];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function makeGlow(color: string) {
  const sprite = document.createElement('canvas');
  sprite.width = 64;
  sprite.height = 64;
  const context = sprite.getContext('2d');
  if (!context) return sprite;
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, `${color}ee`);
  glow.addColorStop(0.14, `${color}99`);
  glow.addColorStop(0.42, `${color}30`);
  glow.addColorStop(1, `${color}00`);
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  return sprite;
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const field = canvas?.parentElement;
    const hero = field?.parentElement;
    const anchor = hero?.querySelector<HTMLElement>('.home-galaxy-anchor');
    const context = canvas?.getContext('2d');
    if (!canvas || !field || !hero || !anchor || !context) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const glows = colors.map(makeGlow);
    const pointer = { x: 0, y: 0, active: false };
    let stars: GalaxyStar[] = [];
    let fieldStars: FieldStar[] = [];
    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let radius = 0;
    let parallaxX = 0;
    let parallaxY = 0;
    let elapsed = 0;
    let frame = 0;
    let lastTime = 0;
    let visible = true;
    let reduced = motionQuery.matches;

    const project = (star: GalaxyStar, angle: number): Point => {
      const diskX = Math.cos(angle) * star.radius;
      const diskY = Math.sin(angle) * star.radius;
      const tiltedY = diskY * 0.66 + star.height;
      const scale = 1 / (1 + diskY * 0.17);
      return {
        x: centerX + parallaxX + (diskX * 0.96 + tiltedY * 0.28) * radius * scale,
        y: centerY + parallaxY + (tiltedY * 0.96 - diskX * 0.28) * radius * scale,
        depth: diskY,
        scale,
      };
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      if (!width || !height) return;

      context.save();
      context.translate(centerX + parallaxX, centerY + parallaxY);
      context.rotate(-0.28);
      context.scale(1, 0.68);
      const nebula = context.createRadialGradient(0, 0, radius * 0.05, 0, 0, radius * 1.3);
      nebula.addColorStop(0, 'rgba(100, 136, 255, 0.3)');
      nebula.addColorStop(0.42, 'rgba(68, 91, 205, 0.16)');
      nebula.addColorStop(0.75, 'rgba(101, 58, 172, 0.075)');
      nebula.addColorStop(1, 'rgba(76, 49, 159, 0)');
      context.fillStyle = nebula;
      context.beginPath();
      context.arc(0, 0, radius * 1.3, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.globalCompositeOperation = 'lighter';
      for (const star of fieldStars) {
        const x = width * (0.36 + star.x * 0.64) + parallaxX * 0.2;
        const y = height * star.y + parallaxY * 0.2;
        const alpha = 0.14 + 0.1 * Math.sin(elapsed * 0.9 + star.phase);
        context.globalAlpha = alpha;
        context.drawImage(glows[star.tone], x - star.size * 5, y - star.size * 5, star.size * 10, star.size * 10);
      }

      const projected = stars.map(star => ({ star, point: project(star, star.angle) }));
      projected.sort((a, b) => b.point.depth - a.point.depth);
      for (const { star, point } of projected) {
        const front = clamp((1 - point.depth) / 2, 0, 1);
        const twinkle = 0.78 + 0.22 * Math.sin(elapsed * (1.1 + star.speed) + star.phase);
        const alpha = (0.22 + front * 0.67) * twinkle;
        const size = star.size * point.scale * (0.75 + front * 0.4);

        if (star.streak) {
          const trail = project(star, star.angle - star.speed * 0.38);
          context.globalAlpha = alpha * 0.5;
          context.strokeStyle = colors[star.tone];
          context.lineWidth = Math.max(0.6, size * 0.8);
          context.beginPath();
          context.moveTo(trail.x, trail.y);
          context.lineTo(point.x, point.y);
          context.stroke();
        }

        context.globalAlpha = alpha * 0.9;
        const glowSize = size * (star.streak ? 13 : 10);
        context.drawImage(glows[star.tone], point.x - glowSize / 2, point.y - glowSize / 2, glowSize, glowSize);
        context.globalAlpha = alpha;
        context.fillStyle = colors[star.tone];
        context.beginPath();
        context.arc(point.x, point.y, size, 0, Math.PI * 2);
        context.fill();
      }

      const core = context.createRadialGradient(centerX + parallaxX, centerY + parallaxY, 0, centerX + parallaxX, centerY + parallaxY, radius * 0.34);
      core.addColorStop(0, 'rgba(240, 250, 255, 0.94)');
      core.addColorStop(0.045, 'rgba(170, 225, 255, 0.86)');
      core.addColorStop(0.18, 'rgba(102, 153, 255, 0.32)');
      core.addColorStop(0.55, 'rgba(116, 75, 240, 0.09)');
      core.addColorStop(1, 'rgba(116, 75, 240, 0)');
      context.globalAlpha = 1;
      context.fillStyle = core;
      context.beginPath();
      context.arc(centerX + parallaxX, centerY + parallaxY, radius * 0.34, 0, Math.PI * 2);
      context.fill();
      context.globalCompositeOperation = 'source-over';
    };

    const animate = (time: number) => {
      frame = 0;
      if (reduced || !visible || document.hidden) return;
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      elapsed += delta;
      for (const star of stars) star.angle += star.speed * delta;
      const targetX = pointer.active ? clamp((pointer.x - centerX) * 0.035, -22, 22) : 0;
      const targetY = pointer.active ? clamp((pointer.y - centerY) * 0.025, -16, 16) : 0;
      parallaxX += (targetX - parallaxX) * Math.min(1, delta * 4);
      parallaxY += (targetY - parallaxY) * Math.min(1, delta * 4);
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
      const anchorRect = anchor.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;
      centerX = anchorRect.left - rect.left + anchorRect.width / 2;
      centerY = anchorRect.top - rect.top + anchorRect.height / 2;
      radius = Math.min(anchorRect.width * 0.54, height * 0.43);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const mobile = width < 680;
      const count = mobile ? 220 : Math.min(660, Math.max(430, Math.round(width * height / 1600)));
      stars = Array.from({ length: count }, (_, index) => {
        const radius = 0.055 + Math.pow(Math.random(), 0.8) * 1.08;
        const inArm = index < count * 0.87;
        const arm = index % 4;
        const spread = (Math.random() + Math.random() + Math.random() - 1.5) * (0.18 + radius * 0.44);
        return {
          radius,
          angle: inArm ? arm * Math.PI / 2 + radius * 4.7 + spread : Math.random() * Math.PI * 2,
          height: (Math.random() - 0.5) * (0.035 + radius * 0.12),
          speed: 0.11 + (1 - Math.min(radius, 1)) * 0.05,
          size: 0.36 + Math.random() * (index % 29 === 0 ? 2.2 : 1.2),
          tone: radius < 0.22 && index % 3 === 0 ? 3 : index % colors.length,
          phase: Math.random() * Math.PI * 2,
          streak: index % 23 === 0,
        };
      });
      fieldStars = Array.from({ length: mobile ? 22 : 82 }, (_, index) => ({
        x: Math.random(), y: Math.random(),
        size: 0.4 + Math.random() * 1.15,
        phase: Math.random() * Math.PI * 2,
        tone: index % colors.length,
      }));
      syncMotion();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = field.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };
    const onPointerLeave = () => { pointer.active = false; };
    const onMotionChange = () => { reduced = motionQuery.matches; parallaxX = 0; parallaxY = 0; syncMotion(); };
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
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      hero.removeEventListener('pointermove', onPointerMove);
      hero.removeEventListener('pointerleave', onPointerLeave);
      motionQuery.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return <div className="home-particle-field" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}
