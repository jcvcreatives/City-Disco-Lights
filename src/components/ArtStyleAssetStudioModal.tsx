import React, { useState } from 'react';
import {
  Check,
  Copy,
  Layers,
  Monitor,
  Palette,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';

interface ArtStyleAssetStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  classicHudMode: boolean;
  onToggleClassicHudMode: (enabled: boolean) => void;
}

type StudioTab = 'STYLE_COLOR' | 'CHIBI_PATRONS' | 'ENVIRONMENT_PROPS' | 'HUD_TEMPLATES';

const COLOR_SWATCHES = [
  { name: 'Midnight Abyss Base', hex: '#090518', role: 'Outdoor Sky & Void Background' },
  { name: 'Asphalt Charcoal', hex: '#1F1A36', role: 'Isometric Road, Parking Lot & Crosswalk Base' },
  { name: 'Dark Brick Wall', hex: '#463652', role: 'Interior Cutaway Walls & Masonry' },
  { name: 'Hand-Drawn Ink Outline', hex: '#150D2A', role: 'Universal 2.2px–3px Cel-Shaded Stroke' },
  { name: 'Cyber Magenta Neon', hex: '#F43F5E', role: 'Neon Stripe Signs, Dance Tiles & VIP Dividers' },
  { name: 'Electric Cyan Glow', hex: '#22D3EE', role: 'UI Framing Borders, Lasers & XP Fill Bar' },
  { name: 'Acid Disco Lime', hex: '#84CC16', role: 'Checkerboard Dance Tile, OPEN Status Badge' },
  { name: 'Taxi Cab / Edison Gold', hex: '#FACC15', role: 'Boxy Yellow Taxi, String Bulbs & Coin Icons' },
];

const CSS_HUD_TEMPLATE_CODE = `/* Classic 2.5D Social Nightclub HUD Styling Guidelines */
:root {
  --ink-outline: #150d2a;
  --panel-slate: rgba(20, 14, 38, 0.94);
  --panel-gloss: linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 48%);
  --neon-cyan-border: #22d3ee;
  --neon-pink-border: #f472b6;
  --xp-blue-fill: linear-gradient(90deg, #0284c7 0%, #38bdf8 100%);
}

.nightclub-hud-panel {
  background-color: var(--panel-slate);
  background-image: var(--panel-gloss);
  border: 2px solid var(--neon-cyan-border);
  border-radius: 16px;
  box-shadow: 0 4px 0 var(--ink-outline), 0 0 14px rgba(34, 211, 238, 0.28);
  color: #ffffff;
  text-shadow: 0 2px 0 var(--ink-outline);
}`;

const CANVAS_SPRITE_GUIDELINE_CODE = `// Chibi 1:1 Head-to-Torso Ratio & Thick Cel-Shaded Outlines (Canvas 2D)
function drawChibiCharacter(ctx: CanvasRenderingContext2D, px: number, py: number, s: number) {
  const INK = '#150d2a'; // Solid dark hand-drawn outline
  // 1. Torso (14x13px) with casual streetwear hoodie/vest
  fillStrokeRoundedRect(ctx, px - 7 * s, py - 24 * s, 14 * s, 13 * s, 4 * s, '#6366f1', INK, 2 * s);
  // 2. Stylized Blocky Hands (3.5x3.5px)
  fillStrokeRoundedRect(ctx, px - 11.5 * s, py - 17 * s, 3.8 * s, 3.8 * s, 1.2 * s, '#f5cba7', INK, 1.6 * s);
  fillStrokeRoundedRect(ctx, px + 7.7 * s, py - 17 * s, 3.8 * s, 3.8 * s, 1.2 * s, '#f5cba7', INK, 1.6 * s);
  // 3. Oversized Expressive Chibi Head (Radius 9px ≈ Torso Height, Omitted Nose, Round Black Eyes)
  ctx.fillStyle = '#f5cba7';
  ctx.beginPath();
  ctx.arc(px, py - 34 * s, 9 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.2 * s;
  ctx.strokeStyle = INK;
  ctx.stroke();
}`;

export const ArtStyleAssetStudioModal: React.FC<ArtStyleAssetStudioModalProps> = ({
  isOpen,
  onClose,
  classicHudMode,
  onToggleClassicHudMode,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('STYLE_COLOR');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-[#070312]/90">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-[#130d26] border-[3px] border-cyan-400 shadow-[0_10px_0_#090518,0_0_40px_rgba(34,211,238,0.3)] overflow-hidden text-white">
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#1d1338] via-[#2a174e] to-[#160f2b] border-b-2 border-cyan-400/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-400 border-2 border-[#150d2a] flex items-center justify-center shadow">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black tracking-wide text-white drop-shadow-[0_2px_0_#150d2a]">
                  2.5D SOCIAL SIM ART DIRECTION &amp; ASSET STUDIO
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-lime-500 border-2 border-[#150d2a] text-[10px] font-black text-slate-950 uppercase">
                  LIVE IN ENGINE
                </span>
              </div>
              <p className="text-xs text-cyan-300 font-mono">
                Retro-Digital Cel-Shaded Isometric Spec · Chibi 1:1 Proportions · Cyber-Neon Palette · Classic HUD Templates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleClassicHudMode(!classicHudMode)}
              className={`px-3 py-1.5 rounded-xl border-2 border-[#150d2a] text-xs font-black cursor-pointer transition-all shadow-[0_3px_0_#150d2a] ${
                classicHudMode
                  ? 'bg-gradient-to-b from-lime-400 to-emerald-600 text-slate-950'
                  : 'bg-gradient-to-b from-cyan-400 to-blue-600 text-white'
              }`}
            >
              {classicHudMode ? '★ Classic Sim HUD: ACTIVE' : 'Switch to Classic Sim HUD'}
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-rose-600 hover:bg-rose-500 border-2 border-[#150d2a] text-white flex items-center justify-center cursor-pointer shadow-[0_3px_0_#150d2a]"
              aria-label="Close Art Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 sm:px-6 py-2.5 bg-[#0e091d] border-b border-purple-500/30">
          {[
            { id: 'STYLE_COLOR', label: '1. Art Style & Color Theory', icon: Palette },
            { id: 'CHIBI_PATRONS', label: '2. Chibi Characters & Patrons', icon: UserCheck },
            { id: 'ENVIRONMENT_PROPS', label: '3. Indoor & Outdoor Assets', icon: Layers },
            { id: 'HUD_TEMPLATES', label: '4. UI / HUD Design Templates', icon: Monitor },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as StudioTab)}
                className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer border-2 transition-all ${
                  active
                    ? 'bg-gradient-to-b from-fuchsia-500 to-purple-700 border-cyan-300 text-white shadow-[0_3px_0_#150d2a]'
                    : 'bg-[#1a1230] border-purple-500/40 text-purple-200 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {/* TAB 1: UNIFIED ART STYLE & COLOR THEORY */}
          {activeTab === 'STYLE_COLOR' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#1b1333] border-2 border-cyan-400/60 shadow-[0_4px_0_#150d2a]">
                  <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300 mb-1.5">
                    Isometric 2.5D Projection &amp; Line Weight
                  </h3>
                  <p className="text-xs text-purple-100/90 leading-relaxed">
                    2:1 dimetric diamond tile ratio (<code className="text-amber-300">56px × 28px</code> base grid). Every character, furniture prop, and vehicle uses solid dark hand-drawn ink outlines (<code className="text-cyan-300">#150D2A</code> at <code className="text-cyan-300">2.2px–3px</code>) to pop crisply against dark brick and asphalt.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#1b1333] border-2 border-fuchsia-400/60 shadow-[0_4px_0_#150d2a]">
                  <h3 className="text-xs font-black uppercase tracking-wider text-fuchsia-300 mb-1.5">
                    Flat Cel-Shading + Hard Speculars
                  </h3>
                  <p className="text-xs text-purple-100/90 leading-relaxed">
                    Sprite surfaces avoid muddy multi-stop gradients. Volumes use 3 flat cel-shaded faces (Top Light, Left Medium, Right Shadow) with crisp 1-pixel or pill-shaped white specular highlights on bottles, tables, and car windshields.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#1b1333] border-2 border-amber-400/60 shadow-[0_4px_0_#150d2a]">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 mb-1.5">
                    Additive Neon Emissive Halos
                  </h3>
                  <p className="text-xs text-purple-100/90 leading-relaxed">
                    Neon wall stripes, dance tiles, and stage lights project localized color-tinted ambient glow pools using <code className="text-amber-300">globalCompositeOperation = &apos;lighter&apos;</code> against the midnight base.
                  </p>
                </div>
              </div>

              {/* Cyber-Neon Swatch Grid */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 mb-2.5">
                  Master Cyber-Neon Nightlife Color Palette (Click to Copy Hex)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {COLOR_SWATCHES.map((sw) => (
                    <button
                      key={sw.hex}
                      onClick={() => handleCopy(sw.hex, sw.hex)}
                      className="p-3 rounded-2xl bg-[#19122e] border-2 border-[#150d2a] hover:border-cyan-400 text-left transition-all cursor-pointer shadow-[0_4px_0_#150d2a]"
                    >
                      <div
                        className="w-full h-11 rounded-xl border-2 border-[#150d2a] mb-2 flex items-center justify-end px-2"
                        style={{ backgroundColor: sw.hex }}
                      >
                        <span className="px-1.5 py-0.5 rounded bg-black/65 text-[10px] font-mono font-bold text-white">
                          {copiedId === sw.hex ? 'COPIED!' : sw.hex}
                        </span>
                      </div>
                      <div className="font-black text-xs text-white">{sw.name}</div>
                      <div className="text-[11px] text-purple-300 leading-tight mt-0.5">{sw.role}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHIBI CHARACTERS & PATRONS ASSET GUIDELINES */}
          {activeTab === 'CHIBI_PATRONS' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Live SVG Sheet of Chibi Archetypes */}
                <div className="p-4 rounded-2xl bg-[#1b1333] border-2 border-cyan-400/60 shadow-[0_4px_0_#150d2a]">
                  <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300 mb-2">
                    Chibi Patron Sprite Sheet (1:1 Head-to-Torso Ratio)
                  </h3>
                  <svg viewBox="0 0 420 190" className="w-full h-48 rounded-xl bg-[#0c071a] border-2 border-[#150d2a]">
                    {/* Grid lines */}
                    <line x1="0" y1="150" x2="420" y2="150" stroke="#2e2352" strokeWidth="2" />

                    {/* 1. Baseball Cap & Hoodie Streetwear Guy */}
                    <g transform="translate(65, 145)">
                      {/* Activity Bubble: Musical Note */}
                      <circle cx="0" cy="-108" r="15" fill="#ffffff" stroke="#150d2a" strokeWidth="3" />
                      <polygon points="-4,-94 0,-87 4,-94" fill="#ffffff" stroke="#150d2a" strokeWidth="2" />
                      <text x="0" y="-103" textAnchor="middle" fill="#7e22ce" fontWeight="900" fontSize="15">♫</text>

                      <ellipse cx="0" cy="0" rx="16" ry="7" fill="rgba(0,0,0,0.45)" />
                      {/* Jeans */}
                      <rect x="-8" y="-22" width="6" height="18" rx="3" fill="#1d4ed8" stroke="#150d2a" strokeWidth="2.8" />
                      <rect x="2" y="-22" width="6" height="18" rx="3" fill="#1d4ed8" stroke="#150d2a" strokeWidth="2.8" />
                      {/* Hoodie Torso */}
                      <rect x="-13" y="-48" width="26" height="27" rx="8" fill="#ef4444" stroke="#150d2a" strokeWidth="3" />
                      {/* Blocky Hands */}
                      <rect x="-20" y="-36" width="7" height="7" rx="2" fill="#f5cba7" stroke="#150d2a" strokeWidth="2.5" />
                      <rect x="13" y="-36" width="7" height="7" rx="2" fill="#f5cba7" stroke="#150d2a" strokeWidth="2.5" />
                      {/* Oversized Chibi Head (equal to torso height) */}
                      <circle cx="0" cy="-68" r="17" fill="#f5cba7" stroke="#150d2a" strokeWidth="3.2" />
                      {/* Round Black Eyes (No nose) */}
                      <circle cx="-5.5" cy="-67" r="2.6" fill="#150d2a" />
                      <circle cx="5.5" cy="-67" r="2.6" fill="#150d2a" />
                      {/* Streetwear Red/Cyan Baseball Cap + Visor */}
                      <path d="M-17,-72 C-17,-88 17,-88 17,-72 Z" fill="#22d3ee" stroke="#150d2a" strokeWidth="3" />
                      <path d="M2,-73 L24,-70 L20,-66 L-4,-69 Z" fill="#0284c7" stroke="#150d2a" strokeWidth="2.8" />
                      <text x="0" y="18" textAnchor="middle" fill="#67e8f9" fontSize="10" fontWeight="800">Baseball Cap</text>
                    </g>

                    {/* 2. Hair Bow & Neon Dress Clubber Girl */}
                    <g transform="translate(165, 145)">
                      {/* Activity Bubble: Cocktail Glass */}
                      <circle cx="0" cy="-108" r="15" fill="#ffffff" stroke="#150d2a" strokeWidth="3" />
                      <polygon points="-4,-94 0,-87 4,-94" fill="#ffffff" stroke="#150d2a" strokeWidth="2" />
                      <polygon points="-6,-113 6,-113 0,-105" fill="#ec4899" stroke="#150d2a" strokeWidth="1.8" />
                      <line x1="0" y1="-105" x2="0" y2="-99" stroke="#150d2a" strokeWidth="2" />

                      <ellipse cx="0" cy="0" rx="16" ry="7" fill="rgba(0,0,0,0.45)" />
                      <rect x="-7" y="-22" width="5.5" height="18" rx="2.5" fill="#1e1b4b" stroke="#150d2a" strokeWidth="2.8" />
                      <rect x="1.5" y="-22" width="5.5" height="18" rx="2.5" fill="#1e1b4b" stroke="#150d2a" strokeWidth="2.8" />
                      {/* Patterned Vest over T-Shirt */}
                      <rect x="-12" y="-48" width="24" height="27" rx="7" fill="#ec4899" stroke="#150d2a" strokeWidth="3" />
                      <rect x="-5" y="-48" width="10" height="27" fill="#fdf2f8" stroke="#150d2a" strokeWidth="2" />
                      {/* Blocky Hands */}
                      <rect x="-19" y="-38" width="7" height="7" rx="2" fill="#f5cba7" stroke="#150d2a" strokeWidth="2.5" />
                      <rect x="12" y="-42" width="7" height="7" rx="2" fill="#f5cba7" stroke="#150d2a" strokeWidth="2.5" />
                      {/* Oversized Chibi Head */}
                      <circle cx="0" cy="-68" r="17" fill="#f5cba7" stroke="#150d2a" strokeWidth="3.2" />
                      {/* Bold Outline-Rich Hair */}
                      <path d="M-18,-68 C-18,-89 18,-89 18,-68 C18,-74 -18,-74 -18,-68 Z" fill="#451a03" stroke="#150d2a" strokeWidth="3" />
                      {/* Pink Hair Bow */}
                      <polygon points="4,-84 14,-89 13,-78" fill="#f43f5e" stroke="#150d2a" strokeWidth="2.4" />
                      <polygon points="4,-84 -6,-89 -5,-78" fill="#f43f5e" stroke="#150d2a" strokeWidth="2.4" />
                      <circle cx="4" cy="-84" r="3" fill="#fde047" stroke="#150d2a" strokeWidth="2" />
                      {/* Round Black Eyes */}
                      <circle cx="-5.5" cy="-67" r="2.6" fill="#150d2a" />
                      <circle cx="5.5" cy="-67" r="2.6" fill="#150d2a" />
                      <text x="0" y="18" textAnchor="middle" fill="#f472b6" fontSize="10" fontWeight="800">Hair Bow + Vest</text>
                    </g>

                    {/* 3. Patterned Vest & Fedora/Beanie Hype Dancer */}
                    <g transform="translate(265, 145)">
                      {/* Activity Bubble: Chat */}
                      <circle cx="0" cy="-108" r="15" fill="#ffffff" stroke="#150d2a" strokeWidth="3" />
                      <circle cx="-5" cy="-108" r="2" fill="#0284c7" />
                      <circle cx="0" cy="-108" r="2" fill="#0284c7" />
                      <circle cx="5" cy="-108" r="2" fill="#0284c7" />

                      <ellipse cx="0" cy="0" rx="16" ry="7" fill="rgba(0,0,0,0.45)" />
                      <rect x="-8" y="-22" width="6" height="18" rx="3" fill="#334155" stroke="#150d2a" strokeWidth="2.8" />
                      <rect x="2" y="-22" width="6" height="18" rx="3" fill="#334155" stroke="#150d2a" strokeWidth="2.8" />
                      {/* Lime Hoodie + Diamond Vest */}
                      <rect x="-13" y="-48" width="26" height="27" rx="8" fill="#84cc16" stroke="#150d2a" strokeWidth="3" />
                      <polygon points="0,-43 6,-35 0,-27 -6,-35" fill="#facc15" stroke="#150d2a" strokeWidth="2" />
                      {/* Blocky Hands */}
                      <rect x="-20" y="-44" width="7" height="7" rx="2" fill="#d97706" stroke="#150d2a" strokeWidth="2.5" />
                      <rect x="13" y="-44" width="7" height="7" rx="2" fill="#d97706" stroke="#150d2a" strokeWidth="2.5" />
                      {/* Oversized Chibi Head */}
                      <circle cx="0" cy="-68" r="17" fill="#d97706" stroke="#150d2a" strokeWidth="3.2" />
                      <circle cx="-5.5" cy="-67" r="2.6" fill="#150d2a" />
                      <circle cx="5.5" cy="-67" r="2.6" fill="#150d2a" />
                      {/* Purple Street Beanie */}
                      <path d="M-17,-73 C-16,-91 16,-91 17,-73 Z" fill="#a855f7" stroke="#150d2a" strokeWidth="3" />
                      <rect x="-18" y="-76" width="36" height="6" rx="3" fill="#7e22ce" stroke="#150d2a" strokeWidth="2.5" />
                      <text x="0" y="18" textAnchor="middle" fill="#a3e635" fontSize="10" fontWeight="800">Beanie + Hoodie</text>
                    </g>

                    {/* 4. Bouncer / Staff with Blocky Hands & Shades */}
                    <g transform="translate(360, 145)">
                      <ellipse cx="0" cy="0" rx="17" ry="7" fill="rgba(0,0,0,0.45)" />
                      <rect x="-8" y="-22" width="6" height="18" rx="3" fill="#0f172a" stroke="#150d2a" strokeWidth="2.8" />
                      <rect x="2" y="-22" width="6" height="18" rx="3" fill="#0f172a" stroke="#150d2a" strokeWidth="2.8" />
                      <rect x="-14" y="-49" width="28" height="28" rx="8" fill="#312e81" stroke="#150d2a" strokeWidth="3" />
                      <circle cx="6" cy="-40" r="3" fill="#facc15" stroke="#150d2a" strokeWidth="1.5" />
                      <rect x="-21" y="-36" width="7" height="7" rx="2" fill="#f5cba7" stroke="#150d2a" strokeWidth="2.5" />
                      <rect x="14" y="-36" width="7" height="7" rx="2" fill="#f5cba7" stroke="#150d2a" strokeWidth="2.5" />
                      <circle cx="0" cy="-69" r="17" fill="#f5cba7" stroke="#150d2a" strokeWidth="3.2" />
                      <rect x="-11" y="-73" width="22" height="7" rx="2" fill="#090518" stroke="#22d3ee" strokeWidth="2" />
                      <text x="0" y="18" textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="800">VIP Staff</text>
                    </g>
                  </svg>
                </div>

                {/* Anatomical & Code Spec */}
                <div className="p-4 rounded-2xl bg-[#1b1333] border-2 border-purple-400/50 shadow-[0_4px_0_#150d2a] flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Chibi Anatomical Rules (Applied to Live Canvas)
                    </h3>
                    <ul className="text-xs text-purple-100/90 space-y-1.5 list-disc list-inside">
                      <li>
                        <strong>1:1 Head-to-Torso Ratio:</strong> Head radius (<code className="text-cyan-300">9px * scale</code>) matches torso height (<code className="text-cyan-300">14px * scale</code>).
                      </li>
                      <li>
                        <strong>Expressive Minimal Face:</strong> Solid round black eyes (<code className="text-cyan-300">1.7px</code>), omitted nose, and diagonal 3/4 isometric orientation.
                      </li>
                      <li>
                        <strong>Stylized Blocky Hands:</strong> Rounded square hands (<code className="text-cyan-300">3.8px × 3.8px</code>) with bold ink borders that pump during dance animations.
                      </li>
                      <li>
                        <strong>Streetwear Variety:</strong> Baseball caps with visors, hair bows, patterned vests, hoodies, and circular overhead thought bubbles.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono text-cyan-300">Canvas 2D Chibi Generator Snippet</span>
                      <button
                        onClick={() => handleCopy('chibi_code', CANVAS_SPRITE_GUIDELINE_CODE)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === 'chibi_code' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === 'chibi_code' ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <pre className="p-2.5 rounded-xl bg-[#0c071a] border border-purple-500/30 text-[10px] font-mono text-cyan-200 overflow-x-auto">
                      {CANVAS_SPRITE_GUIDELINE_CODE}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INDOOR & OUTDOOR ENVIRONMENT ASSETS */}
          {activeTab === 'ENVIRONMENT_PROPS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#1b1333] border-2 border-lime-400/60 shadow-[0_4px_0_#150d2a] space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-lime-300">
                  Indoor Nightclub Materials &amp; Props (Live on Grid)
                </h3>
                <ul className="text-xs text-purple-100/90 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Multicolored Checkerboard Dance Grid:</strong> High-contrast 4-color neon checkerboard tiles (Lime Green <code className="text-lime-300">#4ADE80</code>, Electric Blue <code className="text-cyan-300">#38BDF8</code>, Cyber Pink <code className="text-pink-300">#F472B6</code>, Rich Yellow <code className="text-amber-300">#FACC15</code>) with inner white specular frames.
                  </li>
                  <li>
                    <strong>Dark Brick &amp; Neon Stripe Walls:</strong> Cutaway masonry walls with horizontal glowing magenta/cyan neon tube stripes and an equalizer digital graphic backdrop behind the DJ stage.
                  </li>
                  <li>
                    <strong>Bar Counter, High-Backed Stools &amp; Potted Plants:</strong> Long mahogany/neon bar topped with colorful bottles, chrome draft taps, high-backed bar stools, and isometric potted club plants flanking the entrance and stage.
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-[#1b1333] border-2 border-amber-400/60 shadow-[0_4px_0_#150d2a] space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Outdoor Street, Boxy Yellow Taxi &amp; Chain-Link Fence
                </h3>
                <ul className="text-xs text-purple-100/90 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Asphalt Road &amp; Pedestrian Crosswalk:</strong> Dark slate-charcoal asphalt (<code className="text-cyan-300">#1F1A36</code>) with crisp white zebra crosswalk stripes leading straight to the VIP red carpet entrance.
                  </li>
                  <li>
                    <strong>Chain-Link Perimeter Fence:</strong> Isometric diamond-mesh metallic fencing separating the back parking lot edge from the sidewalk queue.
                  </li>
                  <li>
                    <strong>Boxy Yellow Taxi Cab &amp; Sedans:</strong> Stylized rectangular/boxy vehicles featuring a roof-mounted <code className="text-amber-300">TAXI</code> light sign, black-and-yellow checkered side stripe, cel-shaded windows, and warm headlights.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: UI / HUD DESIGN PATTERN TEMPLATES */}
          {activeTab === 'HUD_TEMPLATES' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#1b1333] border-2 border-cyan-400/60 shadow-[0_4px_0_#150d2a] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                      Classic Social Sim HUD Architecture (image_5.png Spec)
                    </h3>
                    <p className="text-xs text-purple-200">
                      Translucent dark-slate base, thin neon cyan/pink borders, top &quot;OPEN&quot; status badge, left Genre/Bass/Dedicate circular trackers, and bottom docked square buttons (Dressing, Staff, Decorate) + Friend Portraits.
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleClassicHudMode(!classicHudMode)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-b from-lime-400 to-emerald-600 border-2 border-[#150d2a] text-slate-950 font-black text-xs cursor-pointer shadow-[0_3px_0_#150d2a]"
                  >
                    {classicHudMode ? 'Classic Sim HUD Enabled ✓' : 'Activate Classic Sim HUD'}
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono text-fuchsia-300">CSS Interface Template</span>
                    <button
                      onClick={() => handleCopy('css_hud', CSS_HUD_TEMPLATE_CODE)}
                      className="px-2.5 py-1 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === 'css_hud' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === 'css_hud' ? 'Copied' : 'Copy CSS'}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-[#0c071a] border border-purple-500/30 text-xs font-mono text-cyan-200 overflow-x-auto">
                    {CSS_HUD_TEMPLATE_CODE}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#0e091d] border-t border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-cyan-300 font-mono">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>All Chibi Patron Proportions, Boxy Taxis, Crosswalks &amp; Classic HUD are active in the live 60fps canvas!</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-b from-cyan-400 to-blue-600 border-2 border-[#150d2a] text-slate-950 font-black text-xs cursor-pointer shadow-[0_3px_0_#150d2a]"
          >
            Inspect Live Club
          </button>
        </div>
      </div>
    </div>
  );
};
