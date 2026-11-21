import React, { useState } from 'react';
import { Check, Code2, Copy, Layers, Sparkles, Terminal, X } from 'lucide-react';
import { ANDROID_BLUEPRINT_SECTIONS } from '../data/androidBlueprint';

interface TechnicalBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechnicalBlueprintModal: React.FC<TechnicalBlueprintModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeId, setActiveId] = useState<string>(ANDROID_BLUEPRINT_SECTIONS[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeSection =
    ANDROID_BLUEPRINT_SECTIONS.find((s) => s.id === activeId) || ANDROID_BLUEPRINT_SECTIONS[0];

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 pointer-events-auto">
      <div className="w-full max-w-5xl h-[82vh] bg-[#120b24] border-2 border-purple-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1a1133] border-b border-purple-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                Android Game Systems Architecture (Kotlin Compose &amp; Unity C#)
              </h2>
              <p className="text-xs text-purple-200/70">
                Production Blueprint for Multi-Floor Rendering, Data Schemas, A* Pathfinding &amp; Upgrade UI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-200 hover:text-white hover:bg-purple-800/60 transition-colors cursor-pointer"
            aria-label="Close Blueprint"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation List */}
          <div className="w-72 bg-[#150d2a] border-r border-purple-500/25 p-4 flex flex-col gap-2 overflow-y-auto">
            {ANDROID_BLUEPRINT_SECTIONS.map((sec) => {
              const isSelected = sec.id === activeSection.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveId(sec.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600/25 border-cyan-400/70 text-white shadow-lg'
                      : 'bg-purple-950/30 border-purple-500/20 text-purple-200/80 hover:bg-purple-900/40 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-mono text-cyan-300 mb-1">{sec.language}</div>
                  <div className="text-sm font-bold leading-snug">{sec.title}</div>
                </button>
              );
            })}

            <div className="mt-auto p-3.5 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/30 text-xs text-fuchsia-200/90 space-y-1.5">
              <div className="font-bold text-fuchsia-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live Interactive Engine
              </div>
              <p className="leading-relaxed text-purple-200/75">
                Every system documented here is also running live at 60fps in the Neon Nights isometric simulator behind this modal.
              </p>
            </div>
          </div>

          {/* Right Code & Architecture Breakdown */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0c071a]">
            <div className="p-5 border-b border-purple-500/20 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{activeSection.language}</span>
                </div>
                <h3 className="text-xl font-bold text-white">{activeSection.title}</h3>
                <p className="text-sm text-purple-200/80 mt-1">{activeSection.summary}</p>
              </div>
              <button
                onClick={() => handleCopy(activeSection.code, activeSection.id)}
                className="px-3.5 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                {copiedId === activeSection.id ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <pre className="text-xs font-mono leading-relaxed text-cyan-100/95 bg-[#080512] p-4 rounded-xl border border-purple-500/25 overflow-x-auto">
                <code>{activeSection.code}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
