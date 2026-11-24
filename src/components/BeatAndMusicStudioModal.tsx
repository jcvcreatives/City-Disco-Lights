import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Disc,
  Flame,
  Music,
  Play,
  Plus,
  Shuffle,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import {
  BeatPattern,
  CLUB_GENRES,
  ClubSongTrack,
  PRESET_BEAT_PATTERNS,
  soundEngine,
  SynthWaveType,
} from '../audio/soundEngine';

interface BeatAndMusicStudioModalProps {
  isOpen: boolean;
  initialTab?: 'MUSIC' | 'BEAT_MAKER';
  songs: ClubSongTrack[];
  activeSongId: string;
  activePattern: BeatPattern;
  selectedBpm: number;
  playerLevel: number;
  onClose: () => void;
  onSelectSong: (song: ClubSongTrack) => void;
  onUpdatePattern: (pattern: BeatPattern) => void;
  onSaveCustomBeatSong: (newSong: ClubSongTrack, pattern: BeatPattern) => void;
  onUploadCustomAudioSong: (newSong: ClubSongTrack) => void;
  onTriggerBassDrop: () => void;
}

const CHANNEL_ROWS: Array<{
  key: 'kick' | 'snare' | 'hihat' | 'openHat' | 'bass' | 'arp';
  label: string;
  shortLabel: string;
  color: string;
  activeBg: string;
  border: string;
}> = [
  {
    key: 'kick',
    label: 'KICK DRUM',
    shortLabel: 'KICK',
    color: '#f43f5e',
    activeBg: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]',
    border: 'border-rose-300',
  },
  {
    key: 'snare',
    label: 'SNARE / CLAP',
    shortLabel: 'CLAP',
    color: '#facc15',
    activeBg: 'bg-amber-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]',
    border: 'border-yellow-200',
  },
  {
    key: 'hihat',
    label: 'CLOSED HAT',
    shortLabel: 'C-HAT',
    color: '#22d3ee',
    activeBg: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]',
    border: 'border-cyan-200',
  },
  {
    key: 'openHat',
    label: 'OPEN HI-HAT',
    shortLabel: 'O-HAT',
    color: '#38bdf8',
    activeBg: 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]',
    border: 'border-sky-200',
  },
  {
    key: 'bass',
    label: 'BASSLINE SYNTH',
    shortLabel: 'BASS',
    color: '#a855f7',
    activeBg: 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.85)]',
    border: 'border-purple-300',
  },
  {
    key: 'arp',
    label: 'MELODY / ARP',
    shortLabel: 'SYNTH',
    color: '#4ade80',
    activeBg: 'bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.85)]',
    border: 'border-emerald-200',
  },
];

const ROOT_KEYS: Array<{ label: string; midi: number }> = [
  { label: 'E (Deep Sub)', midi: 40 },
  { label: 'F (808 Bounce)', midi: 41 },
  { label: 'G (Cyber Electro)', midi: 43 },
  { label: 'A (Club Minor)', midi: 45 },
  { label: 'B (Rave Peak)', midi: 47 },
  { label: 'C (Pop Anthem)', midi: 48 },
  { label: 'D (Latin Fiesta)', midi: 50 },
];

export const BeatAndMusicStudioModal: React.FC<BeatAndMusicStudioModalProps> = ({
  isOpen,
  initialTab = 'MUSIC',
  songs,
  activeSongId,
  activePattern,
  selectedBpm,
  onClose,
  onSelectSong,
  onUpdatePattern,
  onSaveCustomBeatSong,
  onUploadCustomAudioSong,
  onTriggerBassDrop,
}) => {
  const [activeTab, setActiveTab] = useState<'MUSIC' | 'BEAT_MAKER'>(initialTab);
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('ALL');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [customBeatTitle, setCustomBeatTitle] = useState<string>('Neon Custom Groove');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const tapTimesRef = useRef<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    return soundEngine.subscribeStep((step) => {
      setCurrentStep(step);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSongs =
    selectedGenreFilter === 'ALL'
      ? songs
      : songs.filter((s) => s.genre.toLowerCase() === selectedGenreFilter.toLowerCase());

  const handleToggleStep = (
    channel: 'kick' | 'snare' | 'hihat' | 'openHat' | 'bass' | 'arp',
    stepIndex: number
  ) => {
    const updatedChannel = [...activePattern[channel]];
    updatedChannel[stepIndex] = !updatedChannel[stepIndex];
    const nextPattern: BeatPattern = {
      ...activePattern,
      [channel]: updatedChannel,
    };
    onUpdatePattern(nextPattern);
    if (updatedChannel[stepIndex]) {
      soundEngine.previewChannelHit(channel);
    } else {
      soundEngine.playClick();
    }
  };

  const handleRandomizeBeat = () => {
    soundEngine.playUpgradeFanfare();
    const randSteps = (prob: number, forceDownbeats = false) =>
      Array.from({ length: 16 }, (_, idx) =>
        forceDownbeats && idx % 4 === 0 ? true : Math.random() < prob
      );

    const nextPattern: BeatPattern = {
      ...activePattern,
      kick: randSteps(0.22, true),
      snare: Array.from({ length: 16 }, (_, idx) => idx === 4 || idx === 12 || Math.random() < 0.08),
      hihat: Array.from({ length: 16 }, (_, idx) => idx % 2 === 0 || Math.random() < 0.35),
      openHat: Array.from({ length: 16 }, (_, idx) => idx % 4 === 2 && Math.random() < 0.75),
      bass: randSteps(0.45, true),
      arp: randSteps(0.4, false),
    };
    onUpdatePattern(nextPattern);
  };

  const handleClearBeat = () => {
    soundEngine.playClick();
    const empty = Array(16).fill(false);
    const nextPattern: BeatPattern = {
      ...activePattern,
      kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      snare: [...empty],
      hihat: [...empty],
      openHat: [...empty],
      bass: [...empty],
      arp: [...empty],
    };
    onUpdatePattern(nextPattern);
  };

  const handleTapTempo = () => {
    const now = performance.now();
    const taps = tapTimesRef.current.filter((t) => now - t < 3000);
    taps.push(now);
    tapTimesRef.current = taps;
    soundEngine.previewChannelHit('kick');
    if (taps.length >= 2) {
      let sum = 0;
      for (let i = 1; i < taps.length; i++) {
        sum += taps[i] - taps[i - 1];
      }
      const avgMs = sum / (taps.length - 1);
      const tappedBpm = Math.max(80, Math.min(160, Math.round(60000 / avgMs)));
      onUpdatePattern({ ...activePattern, bpm: tappedBpm });
    }
  };

  const handleSaveCustomBeat = () => {
    const cleanTitle = customBeatTitle.trim() || 'Resident DJ Custom Beat';
    const customId = `custom_beat_${Date.now()}`;
    const patternCopy: BeatPattern = {
      ...activePattern,
      id: `pat_${customId}`,
      name: cleanTitle,
      genre: 'Custom',
      bpm: selectedBpm,
    };
    const newSong: ClubSongTrack = {
      id: customId,
      title: cleanTitle,
      artist: 'DJ Nova (Custom Beat)',
      vibeDesc: `16-Step Custom ${selectedBpm} BPM Beat`,
      genre: 'Custom',
      bpm: selectedBpm,
      durationSec: 240,
      bonus: '+50% Custom DJ Beat Hype',
      accentColor: '#22d3ee',
      secondaryColor: '#a855f7',
      unlockLevel: 1,
      patternId: patternCopy.id,
      isCustomBeat: true,
    };
    onSaveCustomBeatSong(newSong, patternCopy);
    soundEngine.playUpgradeFanfare();
    setSavedNotice(`Saved "${cleanTitle}" & Spinning Live!`);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const cleanName =
      file.name
        .replace(/\.[a-z0-9]{2,5}$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim()
        .slice(0, 36) || 'My Club Track';

    const newSong: ClubSongTrack = {
      id: `my_audio_${Date.now()}`,
      title: cleanName,
      artist: 'My Music Upload',
      vibeDesc: 'Custom Uploaded Audio Track',
      genre: 'Custom',
      bpm: selectedBpm,
      durationSec: 210,
      bonus: '+45% My Music Crowd Vibe',
      accentColor: '#ec4899',
      secondaryColor: '#7e22ce',
      unlockLevel: 1,
      patternId: activePattern.id,
      isCustomBeat: true,
      customAudioUrl: objectUrl,
    };
    onUploadCustomAudioSong(newSong);
    soundEngine.playUpgradeFanfare();
    setSavedNotice(`Uploaded "${cleanName}" & Spinning Now!`);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-sm pointer-events-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-gradient-to-b from-[#1e1438] via-[#130c26] to-[#0c071a] border-[3px] border-[#111116] shadow-[0_10px_0_#111116,0_0_40px_rgba(168,85,247,0.45)] text-white overflow-hidden">
        {/* TOP MODAL HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-[#2e1a5e] via-[#3b1d7a] to-[#1e1438] border-b-[2.5px] border-[#111116]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-purple-600 border-2 border-[#111116] shadow-[0_2px_0_#111116] flex items-center justify-center">
              <Disc className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '5s' }} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_2px_0_#111116]">
                DJ Turntable · Music &amp; Custom Beat Studio
              </h2>
              <p className="text-[11px] font-bold text-cyan-300">
                Spin club genres, upload your own tracks, or program a live 16-step drum &amp; synth beat!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher Pills */}
            <div className="flex items-center bg-[#0d081d] p-1 rounded-xl border-2 border-[#111116]">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('MUSIC');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'MUSIC'
                    ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Choose Music ({songs.length})</span>
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('BEAT_MAKER');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'BEAT_MAKER'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Customize Beat (16-Step)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-rose-600 hover:bg-rose-500 border-2 border-[#111116] shadow-[0_2px_0_#111116] flex items-center justify-center text-white cursor-pointer"
              aria-label="Close Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {savedNotice && (
          <div className="px-4 py-2 bg-emerald-500/20 border-b border-emerald-400/40 text-emerald-300 text-xs font-black flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'MUSIC' ? (
            <>
              {/* GENRE CARDS (Inspired by Neon Nights Club What'll You Spin?) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                    1. Pick a Club Genre or Upload Your Own Music
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 border-2 border-[#111116] shadow-[0_2px_0_#111116] text-xs font-black text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>+ Upload My Song (MP3/WAV)</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedGenreFilter('ALL');
                    }}
                    className={`p-2.5 rounded-2xl border-2 text-left flex flex-col justify-between min-h-[76px] cursor-pointer transition-all ${
                      selectedGenreFilter === 'ALL'
                        ? 'border-white ring-2 ring-cyan-400 bg-gradient-to-br from-purple-600 to-indigo-900'
                        : 'border-[#111116] bg-[#1a1133] hover:border-purple-400'
                    }`}
                  >
                    <span className="text-base">🎧</span>
                    <div>
                      <div className="text-xs font-black text-white leading-tight">All Tracks</div>
                      <div className="text-[10px] font-bold text-cyan-300">{songs.length} Songs</div>
                    </div>
                  </button>

                  {CLUB_GENRES.map((g) => {
                    const isSelected = selectedGenreFilter.toLowerCase() === g.id.toLowerCase();
                    const genreCount = songs.filter(
                      (s) => s.genre.toLowerCase() === g.id.toLowerCase()
                    ).length;
                    return (
                      <button
                        key={g.id}
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedGenreFilter(g.id);
                        }}
                        style={{
                          background: `linear-gradient(155deg, ${g.color}, ${g.color2})`,
                        }}
                        className={`p-2.5 rounded-2xl border-2 text-left flex flex-col justify-between min-h-[76px] cursor-pointer transition-all ${
                          isSelected
                            ? 'border-white ring-2 ring-yellow-300 scale-[1.02]'
                            : 'border-[#111116] opacity-90 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">{g.icon}</span>
                          <span className="px-1.5 py-0.5 rounded bg-black/35 text-[9px] font-mono font-black text-white">
                            {g.bpm} BPM
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-black text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.6)] leading-tight">
                            {g.name}
                          </div>
                          <div className="text-[10px] font-bold text-white/90">
                            {genreCount} {genreCount === 1 ? 'Track' : 'Tracks'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SONG LIST */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    2. Select Track to Spin at the Turntable
                  </span>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setActiveTab('BEAT_MAKER');
                    }}
                    className="text-xs font-black text-amber-300 hover:text-amber-200 underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Want to craft your own drum &amp; bass beat? Open Beat Maker →</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredSongs.map((song, idx) => {
                    const isPlaying = song.id === activeSongId;
                    const mins = Math.floor(song.durationSec / 60);
                    const secs = String(song.durationSec % 60).padStart(2, '0');
                    return (
                      <div
                        key={song.id}
                        style={{
                          background: isPlaying
                            ? `linear-gradient(135deg, ${song.accentColor}44, ${song.secondaryColor}66)`
                            : 'rgba(22, 14, 44, 0.9)',
                        }}
                        className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all ${
                          isPlaying
                            ? 'border-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.35)]'
                            : 'border-[#111116] hover:border-purple-400/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            style={{
                              background: `linear-gradient(135deg, ${song.accentColor}, ${song.secondaryColor})`,
                            }}
                            className="w-10 h-10 rounded-xl border-2 border-[#111116] flex items-center justify-center font-black text-sm text-white shrink-0 shadow"
                          >
                            {isPlaying ? '♫' : idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black text-white truncate">
                                {song.title}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-purple-950/90 border border-purple-400/40 text-[9px] font-black uppercase text-cyan-300 shrink-0">
                                {song.genre}
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-purple-200 truncate">
                              {song.artist} · {song.vibeDesc}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-amber-300">
                              <span>{song.bpm} BPM</span>
                              <span>·</span>
                              <span>
                                {mins}:{secs}
                              </span>
                              <span>·</span>
                              <span className="text-emerald-300 font-bold">{song.bonus}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isPlaying ? (
                            <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500 border-2 border-[#111116] text-[10px] font-black uppercase text-[#111116] shadow">
                              SPINNING
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                soundEngine.playClick();
                                onSelectSong(song);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 border-2 border-[#111116] shadow-[0_2px_0_#111116] text-xs font-black uppercase text-white flex items-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>SPIN</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* =================================================================
               TAB 2: INTERACTIVE 16-STEP CUSTOM BEAT MAKER & SYNTH SEQUENCER
               ================================================================= */
            <div className="space-y-4">
              {/* Top Beat Controls Bar: Preset Loader, BPM Slider, Tap Tempo, Bass Drop */}
              <div className="p-3 rounded-2xl bg-[#140d29] border-2 border-[#111116] flex flex-wrap items-center justify-between gap-3">
                {/* 1-Click Beat Style Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 mr-1">
                    PRESET GROOVE:
                  </span>
                  {[
                    { id: 'pat_pop_1', label: 'Pop Anthem' },
                    { id: 'pat_dance_1', label: '4x4 House' },
                    { id: 'pat_hiphop_1', label: '808 Hip-Hop' },
                    { id: 'pat_latin_1', label: 'Dembow Latin' },
                    { id: 'pat_electro_1', label: 'Cyber Acid' },
                    { id: 'pat_rock_1', label: 'Stadium Rock' },
                  ].map((pr) => (
                    <button
                      key={pr.id}
                      onClick={() => {
                        soundEngine.playClick();
                        const preset = PRESET_BEAT_PATTERNS[pr.id];
                        if (preset) {
                          onUpdatePattern({ ...preset });
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-black cursor-pointer transition-all ${
                        activePattern.id === pr.id
                          ? 'bg-cyan-500 border-white text-[#111116]'
                          : 'bg-[#211540] border-purple-500/40 text-purple-200 hover:bg-purple-800'
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>

                {/* Randomize / Clear / Bass Drop Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRandomizeBeat}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 border-2 border-[#111116] text-xs font-black text-white flex items-center gap-1 cursor-pointer"
                    title="Generate a fresh random club beat"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Randomize</span>
                  </button>
                  <button
                    onClick={handleClearBeat}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-[#111116] text-xs font-black text-slate-200 flex items-center gap-1 cursor-pointer"
                    title="Reset pattern to 4-on-the-floor kick"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                  <button
                    onClick={() => {
                      onTriggerBassDrop();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 border-2 border-[#111116] shadow-[0_2px_0_#111116] text-xs font-black text-[#111116] flex items-center gap-1 cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>DROP BASS!</span>
                  </button>
                </div>
              </div>

              {/* 16-STEP DRUM & SYNTH SEQUENCER MATRIX */}
              <div className="p-3.5 rounded-2xl bg-[#0e091d] border-[2.5px] border-[#111116] shadow-inner space-y-2 overflow-x-auto">
                {/* Step Numbers Header 1..16 */}
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-[110px_repeat(16,minmax(0,1fr))] gap-1 mb-1.5 items-center">
                    <div className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                      CHANNEL / STEP
                    </div>
                    {Array.from({ length: 16 }, (_, sIdx) => {
                      const isCurrent = currentStep === sIdx;
                      const isDownbeat = sIdx % 4 === 0;
                      return (
                        <div
                          key={sIdx}
                          className={`h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-black border ${
                            isCurrent
                              ? 'bg-cyan-400 text-[#111116] border-white scale-105 shadow-[0_0_8px_#22d3ee]'
                              : isDownbeat
                              ? 'bg-purple-900/70 text-white border-purple-400/40'
                              : 'bg-[#1a1133] text-purple-300/70 border-transparent'
                          }`}
                        >
                          {sIdx + 1}
                        </div>
                      );
                    })}
                  </div>

                  {/* 6 Instrument Sequencer Rows */}
                  <div className="space-y-1.5">
                    {CHANNEL_ROWS.map((row) => {
                      const steps = activePattern[row.key];
                      return (
                        <div
                          key={row.key}
                          className="grid grid-cols-[110px_repeat(16,minmax(0,1fr))] gap-1 items-center"
                        >
                          <button
                            onClick={() => soundEngine.previewChannelHit(row.key)}
                            className="px-2 py-1.5 rounded-lg bg-[#1c1336] hover:bg-[#291b4d] border border-purple-500/30 text-left flex items-center justify-between cursor-pointer"
                            title={`Tap to preview ${row.label}`}
                          >
                            <span
                              className="text-[10px] font-black tracking-wider truncate"
                              style={{ color: row.color }}
                            >
                              {row.shortLabel}
                            </span>
                            <Volume2 className="w-3 h-3 text-purple-300 shrink-0" />
                          </button>

                          {steps.map((isOn, sIdx) => {
                            const isCurrent = currentStep === sIdx;
                            const isQuarterBeat = sIdx % 4 === 0;
                            return (
                              <button
                                key={sIdx}
                                onClick={() => handleToggleStep(row.key, sIdx)}
                                className={`h-8 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center ${
                                  isOn
                                    ? `${row.activeBg} ${row.border} scale-[1.02]`
                                    : isQuarterBeat
                                    ? 'bg-[#21163f] border-purple-500/40 hover:border-purple-300'
                                    : 'bg-[#160e2c] border-[#111116] hover:border-purple-400/50'
                                } ${isCurrent ? 'ring-2 ring-white' : ''}`}
                                aria-label={`${row.label} Step ${sIdx + 1}`}
                              >
                                {isOn && (
                                  <span className="w-2 h-2 rounded-full bg-white shadow" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SYNTH & TEMPO CUSTOMIZATION KNOBS / SLIDERS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Tempo BPM & Tap Tempo */}
                <div className="p-3 rounded-2xl bg-[#170f2e] border-2 border-[#111116] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-cyan-300">
                      Tempo · {selectedBpm} BPM
                    </span>
                    <button
                      onClick={handleTapTempo}
                      className="px-2 py-0.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 border border-[#111116] text-[10px] font-black text-[#111116] cursor-pointer"
                    >
                      TAP TEMPO
                    </button>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={160}
                    value={selectedBpm}
                    onChange={(e) => {
                      const nextBpm = Number(e.target.value);
                      onUpdatePattern({ ...activePattern, bpm: nextBpm });
                    }}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-purple-300">
                    <span>80 (Chill)</span>
                    <span>124 (House)</span>
                    <span>160 (Rave)</span>
                  </div>
                </div>

                {/* 2. Bass Synth Waveform & Musical Key */}
                <div className="p-3 rounded-2xl bg-[#170f2e] border-2 border-[#111116] space-y-2">
                  <div className="text-xs font-black uppercase text-purple-300">
                    Bass Synth &amp; Key
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(['sawtooth', 'square', 'triangle', 'sine'] as SynthWaveType[]).map((w) => (
                      <button
                        key={w}
                        onClick={() => {
                          onUpdatePattern({ ...activePattern, bassWave: w });
                          soundEngine.previewChannelHit('bass');
                        }}
                        className={`py-1 rounded-lg border text-[10px] font-black uppercase cursor-pointer ${
                          activePattern.bassWave === w
                            ? 'bg-purple-500 border-white text-white'
                            : 'bg-[#231742] border-purple-500/30 text-purple-200'
                        }`}
                      >
                        {w === 'sawtooth' ? 'SAW' : w === 'square' ? 'SQR' : w === 'triangle' ? 'TRI' : '808'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold text-purple-200 shrink-0">Root Key:</span>
                    <select
                      value={activePattern.rootMidi}
                      onChange={(e) => {
                        onUpdatePattern({ ...activePattern, rootMidi: Number(e.target.value) });
                        soundEngine.previewChannelHit('arp');
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-[#0d081d] border border-purple-400/50 text-xs font-bold text-white"
                    >
                      {ROOT_KEYS.map((rk) => (
                        <option key={rk.midi} value={rk.midi}>
                          {rk.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Filter Cutoff, Bass Boost & Clap Toggle */}
                <div className="p-3 rounded-2xl bg-[#170f2e] border-2 border-[#111116] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-300">
                      Filter &amp; Sub Punch
                    </span>
                    <button
                      onClick={() => {
                        onUpdatePattern({ ...activePattern, useClap: !activePattern.useClap });
                        soundEngine.previewChannelHit('snare');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-amber-400/20 border border-amber-300/50 text-[10px] font-black text-amber-300 cursor-pointer"
                    >
                      {activePattern.useClap ? 'Mode: Club Clap' : 'Mode: Acoustic Snare'}
                    </button>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-purple-200">
                      <span>Synth Filter Cutoff</span>
                      <span>{activePattern.filterCutoff} Hz</span>
                    </div>
                    <input
                      type="range"
                      min={450}
                      max={3200}
                      step={50}
                      value={activePattern.filterCutoff}
                      onChange={(e) =>
                        onUpdatePattern({ ...activePattern, filterCutoff: Number(e.target.value) })
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-purple-200">
                      <span>Sub Bass Boost</span>
                      <span>{Math.round(activePattern.bassBoost * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={70}
                      max={180}
                      step={5}
                      value={Math.round(activePattern.bassBoost * 100)}
                      onChange={(e) =>
                        onUpdatePattern({
                          ...activePattern,
                          bassBoost: Number(e.target.value) / 100,
                        })
                      }
                      className="w-full accent-fuchsia-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* SAVE CUSTOM BEAT TO CLUB PLAYLIST */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-[#25174a] via-[#1e143b] to-[#25174a] border-2 border-cyan-400/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300 shrink-0" />
                  <input
                    type="text"
                    maxLength={32}
                    value={customBeatTitle}
                    onChange={(e) => setCustomBeatTitle(e.target.value)}
                    placeholder="Name your custom club beat..."
                    className="w-full px-3 py-1.5 rounded-xl bg-[#0e091d] border-2 border-[#111116] text-xs font-black text-white focus:outline-none focus:border-cyan-300"
                  />
                </div>
                <button
                  onClick={handleSaveCustomBeat}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 border-2 border-[#111116] shadow-[0_3px_0_#111116] text-xs font-black uppercase text-[#111116] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Save &amp; Spin Custom Beat in Club</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
