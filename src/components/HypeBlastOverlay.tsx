import React, { useEffect, useState } from 'react';

export interface HypeBlastEvent {
  id: number;
  screenX: number;
  screenY: number;
  hypeDelta: number;
  newTotalHype: number;
  multiplierText: string;
}

interface SvgParticleSpec {
  id: number;
  kind: 'SPARKLE' | 'BOLT' | 'NOTE' | 'DIAMOND' | 'RING_DOT';
  angleRad: number;
  distance: number;
  size: number;
  color: string;
  delayMs: number;
  durationMs: number;
  spinDeg: number;
}

interface HypeBlastOverlayProps {
  blastEvent: HypeBlastEvent | null;
}

const PARTICLE_COLORS = [
  '#22d3ee', // Neon Cyan
  '#f472b6', // Neon Magenta
  '#facc15', // Electric Gold
  '#4ade80', // Lime Glow
  '#c084fc', // Ultraviolet
  '#fb7185', // Hot Coral
];

function createParticlesForBlast(seed: number): SvgParticleSpec[] {
  const count = 28;
  const specs: SvgParticleSpec[] = [];
  const kinds: SvgParticleSpec['kind'][] = ['SPARKLE', 'BOLT', 'NOTE', 'DIAMOND', 'RING_DOT'];

  for (let i = 0; i < count; i++) {
    const baseAngle = (i / count) * Math.PI * 2;
    const jitter = ((seed * (i + 3) * 17) % 100) / 100 - 0.5;
    const angleRad = baseAngle + jitter * 0.25;
    const ringLayer = i % 3; // 0 = inner fast, 1 = mid, 2 = outer wide
    const distance = 95 + ringLayer * 68 + ((i * 29) % 45);
    const size = 16 + ((i * 7) % 16);
    const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
    const delayMs = (i % 5) * 22;
    const durationMs = 780 + (i % 4) * 90;
    const spinDeg = (i % 2 === 0 ? 1 : -1) * (90 + (i * 23) % 180);

    specs.push({
      id: i,
      kind: kinds[i % kinds.length],
      angleRad,
      distance,
      size,
      color,
      delayMs,
      durationMs,
      spinDeg,
    });
  }
  return specs;
}

export const HypeBlastOverlay: React.FC<HypeBlastOverlayProps> = ({ blastEvent }) => {
  const [activeBlasts, setActiveBlasts] = useState<
    Array<{
      event: HypeBlastEvent;
      particles: SvgParticleSpec[];
      triggered: boolean;
    }>
  >([]);

  useEffect(() => {
    if (!blastEvent) return;

    const newEntry = {
      event: blastEvent,
      particles: createParticlesForBlast(blastEvent.id),
      triggered: false,
    };

    setActiveBlasts((prev) => [...prev.slice(-2), newEntry]);

    // Trigger compositor-only CSS transitions on the next animation frame for 60fps smoothness
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setActiveBlasts((prev) =>
          prev.map((b) => (b.event.id === blastEvent.id ? { ...b, triggered: true } : b))
        );
      });
    });

    const timer = setTimeout(() => {
      setActiveBlasts((prev) => prev.filter((b) => b.event.id !== blastEvent.id));
    }, 1150);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [blastEvent]);

  if (activeBlasts.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {activeBlasts.map(({ event, particles, triggered }) => (
        <div
          key={event.id}
          className="absolute"
          style={{
            left: `${event.screenX}px`,
            top: `${event.screenY}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* 1. ISOMETRIC DANCE FLOOR SHOCKWAVE RINGS (2:1 Perspective Ellipses) */}
          <svg
            viewBox="-240 -140 480 280"
            className="w-[380px] h-[220px] sm:w-[520px] sm:h-[300px] overflow-visible"
          >
            <defs>
              <radialGradient id={`hypeFloorGlow_${event.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.65" />
                <stop offset="45%" stopColor="#f472b6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Radial Neon Floor Flash */}
            <ellipse
              cx="0"
              cy="0"
              rx="185"
              ry="92"
              fill={`url(#hypeFloorGlow_${event.id})`}
              style={{
                transform: triggered ? 'scale(1.28)' : 'scale(0.18)',
                opacity: triggered ? 0 : 0.95,
                transition:
                  'transform 780ms cubic-bezier(0.16, 1, 0.3, 1), opacity 780ms ease-out',
              }}
            />

            {/* Outer Isometric Diamond Wave */}
            <polygon
              points="0,-95 190,0 0,95 -190,0"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="4"
              style={{
                transform: triggered ? 'scale(1.35)' : 'scale(0.2)',
                opacity: triggered ? 0 : 1,
                transition:
                  'transform 820ms cubic-bezier(0.16, 1, 0.3, 1), opacity 820ms ease-out',
              }}
            />

            {/* Secondary Magenta Isometric Ring */}
            <ellipse
              cx="0"
              cy="0"
              rx="150"
              ry="75"
              fill="none"
              stroke="#f472b6"
              strokeWidth="3.5"
              strokeDasharray="16 10"
              style={{
                transform: triggered ? 'scale(1.45) rotate(12deg)' : 'scale(0.25) rotate(0deg)',
                opacity: triggered ? 0 : 0.95,
                transition:
                  'transform 880ms cubic-bezier(0.16, 1, 0.3, 1), opacity 880ms ease-out',
              }}
            />

            {/* Inner Gold Pulse Diamond */}
            <polygon
              points="0,-65 130,0 0,65 -130,0"
              fill="none"
              stroke="#facc15"
              strokeWidth="3"
              style={{
                transform: triggered ? 'scale(1.5)' : 'scale(0.15)',
                opacity: triggered ? 0 : 1,
                transition:
                  'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 700ms ease-out',
              }}
            />
          </svg>

          {/* 2. SVG PARTICLE FOUNTAIN BURST (Sparkles, Lightning Bolts, Music Notes, Diamonds) */}
          <div className="absolute left-1/2 top-1/2 w-0 h-0">
            {particles.map((p) => {
              // Project outward in an isometric-biased fountain arc (wider X, upward Y lift)
              const tx = Math.cos(p.angleRad) * p.distance;
              const ty = Math.sin(p.angleRad) * (p.distance * 0.56) - 42;

              return (
                <svg
                  key={p.id}
                  viewBox="0 0 32 32"
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    position: 'absolute',
                    left: `${-p.size / 2}px`,
                    top: `${-p.size / 2}px`,
                    transform: triggered
                      ? `translate3d(${tx}px, ${ty}px, 0) scale(0.35) rotate(${p.spinDeg}deg)`
                      : 'translate3d(0px, 0px, 0) scale(1.15) rotate(0deg)',
                    opacity: triggered ? 0 : 1,
                    transitionProperty: 'transform, opacity',
                    transitionDuration: `${p.durationMs}ms`,
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    transitionDelay: `${p.delayMs}ms`,
                    willChange: 'transform, opacity',
                  }}
                >
                  {p.kind === 'SPARKLE' && (
                    <path
                      d="M16 2 Q16 16 30 16 Q16 16 16 30 Q16 16 2 16 Q16 16 16 2 Z"
                      fill={p.color}
                      stroke="#150d2a"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  )}
                  {p.kind === 'BOLT' && (
                    <polygon
                      points="18,2 6,17 15,17 12,30 26,13 17,13"
                      fill={p.color}
                      stroke="#150d2a"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  )}
                  {p.kind === 'DIAMOND' && (
                    <polygon
                      points="16,3 28,16 16,29 4,16"
                      fill={p.color}
                      stroke="#150d2a"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  )}
                  {p.kind === 'NOTE' && (
                    <g fill={p.color} stroke="#150d2a" strokeWidth="1.8">
                      <circle cx="10" cy="24" r="5" />
                      <circle cx="24" cy="21" r="5" />
                      <path
                        d="M14 24 V8 L28 5 V21"
                        fill="none"
                        stroke={p.color}
                        strokeWidth="3.2"
                        strokeLinecap="round"
                      />
                    </g>
                  )}
                  {p.kind === 'RING_DOT' && (
                    <circle
                      cx="16"
                      cy="16"
                      r="8"
                      fill={p.color}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />
                  )}
                </svg>
              );
            })}
          </div>

          {/* 3. FLOATING "HYPE BLAST!" COMIC BANNER BADGE */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center"
            style={{
              transform: triggered
                ? 'translate3d(-50%, -96px, 0) scale(1.05)'
                : 'translate3d(-50%, -18px, 0) scale(0.55)',
              opacity: triggered ? 0 : 1,
              transition:
                'transform 920ms cubic-bezier(0.16, 1, 0.3, 1), opacity 920ms ease-in',
              willChange: 'transform, opacity',
            }}
          >
            <div className="inline-flex flex-col items-center px-3.5 py-1.5 rounded-2xl bg-[#150d2a]/90 border-2 border-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.7)]">
              <div className="text-xs sm:text-sm font-black tracking-wider uppercase text-amber-300 drop-shadow">
                ⚡ HYPE BLAST! +{event.hypeDelta} HYPE ⚡
              </div>
              <div className="text-[11px] sm:text-xs font-mono font-extrabold text-cyan-300">
                VIBE MULTIPLIER {event.multiplierText}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
