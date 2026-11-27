import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Flame, Shield, Sparkles, Trophy, Volume2, X, Zap } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { QuestTask } from '../types/game';

export type InteractiveChallengeMode =
  | 'DJ_BEAT_DROP'
  | 'NEON_MIXOLOGY'
  | 'VELVET_ROPE_BOUNCER'
  | 'NEON_DANCE_GRID'
  | 'WHALE_CHAMPAGNE_TOWER'
  | 'CELEB_PAPARAZZI_BLITZ';

interface InteractiveQuestChallengeModalProps {
  quest: QuestTask | null;
  clubBpm: number;
  vibePercent: number;
  streakMultiplier: number;
  onClose: () => void;
  onCompleteChallenge: (quest: QuestTask, bonusCash: number, accuracyLabel: string) => void;
}

interface MixologyIngredient {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

const MIXOLOGY_BOTTLES: MixologyIngredient[] = [
  {
    id: 'ing_cyan',
    name: 'Electric Cyan Curacao',
    shortName: 'Cyan Volt',
    emoji: '🧪',
    bgClass: 'bg-cyan-500/30 hover:bg-cyan-400/45',
    borderClass: 'border-cyan-300',
    textClass: 'text-cyan-200',
  },
  {
    id: 'ing_pink',
    name: 'Neon Magenta Berry',
    shortName: 'Pink Nova',
    emoji: '🍓',
    bgClass: 'bg-pink-500/30 hover:bg-pink-400/45',
    borderClass: 'border-pink-300',
    textClass: 'text-pink-200',
  },
  {
    id: 'ing_gold',
    name: '24K Supernova Gold',
    shortName: '24K Gold',
    emoji: '✨',
    bgClass: 'bg-amber-400/30 hover:bg-amber-300/45',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-200',
  },
  {
    id: 'ing_lime',
    name: 'Laser Lime Midori',
    shortName: 'Laser Lime',
    emoji: '🍋',
    bgClass: 'bg-emerald-500/30 hover:bg-emerald-400/45',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-200',
  },
  {
    id: 'ing_violet',
    name: 'Ultraviolet Gin Fizz',
    shortName: 'UV Fizz',
    emoji: '🔮',
    bgClass: 'bg-purple-500/30 hover:bg-purple-400/45',
    borderClass: 'border-purple-300',
    textClass: 'text-purple-200',
  },
];

interface BouncerCandidate {
  id: string;
  name: string;
  avatarEmoji: string;
  birthYear: number;
  dressStyle: string;
  dressValid: boolean;
  sealLabel: string;
  sealValid: boolean;
  quote: string;
  coverTip: number;
  shouldAdmit: boolean;
  reasonIfInvalid: string;
}

const BOUNCER_CANDIDATE_POOL: BouncerCandidate[] = [
  {
    id: 'bc_1',
    name: 'Sienna Luxe ★ VIP',
    avatarEmoji: '🕶️',
    birthYear: 1999,
    dressStyle: 'Cyber Sequined Couture',
    dressValid: true,
    sealLabel: 'VERIFIED HOLOGRAM ★',
    sealValid: true,
    quote: 'My entourage reserved the velvet VIP pod—let’s pop sparklers!',
    coverTip: 180,
    shouldAdmit: true,
    reasonIfInvalid: 'Valid 21+ VIP Guest',
  },
  {
    id: 'bc_2',
    name: 'Lil Sketchy',
    avatarEmoji: '🧢',
    birthYear: 2009,
    dressStyle: 'Neon Hoodie & Sneakers',
    dressValid: true,
    sealLabel: 'VERIFIED HOLOGRAM ★',
    sealValid: true,
    quote: 'Totally born in 1995 bro, don’t look at the 2009 birth year!',
    coverTip: 40,
    shouldAdmit: false,
    reasonIfInvalid: 'Underage ID (Born 2009 — Must be 2005 or earlier)',
  },
  {
    id: 'bc_3',
    name: 'Chad Flip-Flop',
    avatarEmoji: '🩴',
    birthYear: 1997,
    dressStyle: 'Beach Flip-Flops & Bathrobe',
    dressValid: false,
    sealLabel: 'CRAYON DRAWN STAMP ✗',
    sealValid: false,
    quote: 'What do you mean flip-flops & a crayon VIP pass aren’t allowed?!',
    coverTip: 25,
    shouldAdmit: false,
    reasonIfInvalid: 'Dress Code Violation & Fake Crayon VIP Seal',
  },
  {
    id: 'bc_4',
    name: 'DJ Kora Pulse',
    avatarEmoji: '🎧',
    birthYear: 2001,
    dressStyle: ' Chrome Streetwear Jacket',
    dressValid: true,
    sealLabel: 'VERIFIED HOLOGRAM ★',
    sealValid: true,
    quote: 'Here to check out the bass system and drop big tips at the bar!',
    coverTip: 160,
    shouldAdmit: true,
    reasonIfInvalid: 'Valid 21+ Guest',
  },
  {
    id: 'bc_5',
    name: 'Counterfeit Carl',
    avatarEmoji: '🕵️',
    birthYear: 2000,
    dressStyle: 'Velvet Blazer',
    dressValid: true,
    sealLabel: 'EXPIRED PHOTOCOPY ✗',
    sealValid: false,
    quote: 'I printed this VIP pass on my office printer 10 minutes ago.',
    coverTip: 50,
    shouldAdmit: false,
    reasonIfInvalid: 'Forged / Expired Photocopy VIP Seal',
  },
  {
    id: 'bc_6',
    name: 'Valentina Gold',
    avatarEmoji: '👑',
    birthYear: 1998,
    dressStyle: '24K Gold Cocktail Dress',
    dressValid: true,
    sealLabel: 'VERIFIED HOLOGRAM ★',
    sealValid: true,
    quote: 'Ordering the 24K Supernova bottle tray as soon as I step inside!',
    coverTip: 220,
    shouldAdmit: true,
    reasonIfInvalid: 'Valid 21+ High-Roller',
  },
];

const DANCE_PAD_LABELS = [
  { idx: 0, name: 'CYAN NW', colorClass: 'from-cyan-400 to-sky-600', ringClass: 'ring-cyan-300', midiChannel: 'arp' as const },
  { idx: 1, name: 'PINK N', colorClass: 'from-pink-400 to-rose-600', ringClass: 'ring-pink-300', midiChannel: 'snare' as const },
  { idx: 2, name: 'GOLD NE', colorClass: 'from-amber-300 to-orange-500', ringClass: 'ring-amber-200', midiChannel: 'hihat' as const },
  { idx: 3, name: 'VIOLET W', colorClass: 'from-purple-400 to-indigo-700', ringClass: 'ring-purple-300', midiChannel: 'bass' as const },
  { idx: 4, name: 'LASER CENTER', colorClass: 'from-emerald-400 to-teal-600', ringClass: 'ring-emerald-200', midiChannel: 'kick' as const },
  { idx: 5, name: 'MAGENTA E', colorClass: 'from-fuchsia-400 to-purple-700', ringClass: 'ring-fuchsia-300', midiChannel: 'openHat' as const },
  { idx: 6, name: 'LIME SW', colorClass: 'from-lime-400 to-emerald-700', ringClass: 'ring-lime-300', midiChannel: 'arp' as const },
  { idx: 7, name: 'AQUA S', colorClass: 'from-sky-400 to-blue-700', ringClass: 'ring-sky-300', midiChannel: 'bass' as const },
  { idx: 8, name: 'FLAME SE', colorClass: 'from-rose-400 to-red-700', ringClass: 'ring-rose-300', midiChannel: 'kick' as const },
];

export function getChallengeModeForQuest(quest: QuestTask): InteractiveChallengeMode {
  switch (quest.track) {
    case 'DJ_HYPE_DROP':
    case 'PARTY_FEVER':
    case 'LASER_OVERDRIVE':
      return 'DJ_BEAT_DROP';
    case 'MIXOLOGY_CRAFT':
    case 'BOTTLE_SERVICE':
      return 'NEON_MIXOLOGY';
    case 'WHALE_HUNT':
      return 'WHALE_CHAMPAGNE_TOWER';
    case 'CELEB_PAPARAZZI':
    case 'GOSSIP_VIRAL':
      return 'CELEB_PAPARAZZI_BLITZ';
    case 'STAFF_TEAM':
    case 'CLUB_REVENUE':
      return 'VELVET_ROPE_BOUNCER';
    case 'DANCE_FLOOR':
    case 'MOOD_BOOST':
    default:
      return 'NEON_DANCE_GRID';
  }
}

export const InteractiveQuestChallengeModal: React.FC<InteractiveQuestChallengeModalProps> = ({
  quest,
  clubBpm,
  vibePercent,
  streakMultiplier,
  onClose,
  onCompleteChallenge,
}) => {
  const mode = useMemo<InteractiveChallengeMode>(
    () => (quest ? getChallengeModeForQuest(quest) : 'DJ_BEAT_DROP'),
    [quest]
  );

  const [activeMode, setActiveMode] = useState<InteractiveChallengeMode>(mode);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    text: string;
    tone: 'SUCCESS' | 'WARN' | 'INFO';
  }>({
    text: 'Complete the live interactive challenge below to advance & finish your quest!',
    tone: 'INFO',
  });

  useEffect(() => {
    if (quest) {
      setActiveMode(getChallengeModeForQuest(quest));
    }
  }, [quest]);

  // ============================================================================
  // MODE 1: DJ BEAT-MATCH & DROP TIMING CHALLENGE STATE
  // ============================================================================
  const targetBpm = Math.max(96, Math.min(148, clubBpm || 124));
  const [deckBBpm, setDeckBBpm] = useState<number>(() =>
    targetBpm >= 120 ? targetBpm - 14 : targetBpm + 14
  );
  const [liveBeatStep, setLiveBeatStep] = useState<number>(0);
  const [djDropHits, setDjDropHits] = useState<number>(0);
  const djDropTargetHits = 3;

  useEffect(() => {
    setDeckBBpm(targetBpm >= 120 ? targetBpm - 14 : targetBpm + 14);
    setDjDropHits(0);
  }, [targetBpm, quest?.id]);

  useEffect(() => {
    if (!quest || activeMode !== 'DJ_BEAT_DROP') return;
    return soundEngine.subscribeStep((step) => {
      setLiveBeatStep(step);
    });
  }, [quest, activeMode]);

  const isBpmPitchSynced = Math.abs(deckBBpm - targetBpm) <= 2;
  // Downbeat drop zones: steps 0, 4, 8, 12 (with ±1 step forgiveness window so it feels responsive at high BPM)
  const isStepInDropWindow =
    liveBeatStep % 4 === 0 || liveBeatStep % 4 === 3;

  const handleDjBeatDropAttempt = () => {
    if (!quest) return;
    if (!isBpmPitchSynced) {
      soundEngine.playError();
      setFeedbackBanner({
        text: `Pitch Mismatch! Slide Deck B to match ${targetBpm} BPM (±2 BPM) before dropping the bass!`,
        tone: 'WARN',
      });
      return;
    }

    if (isStepInDropWindow) {
      const nextHits = djDropHits + 1;
      setDjDropHits(nextHits);
      soundEngine.triggerBassDrop();
      if (nextHits >= djDropTargetHits) {
        soundEngine.playUpgradeFanfare();
        setFeedbackBanner({
          text: '🔥 PERFECT 3/3 BPM BASS DROPS! Crowd Hype Exploding!',
          tone: 'SUCCESS',
        });
        setTimeout(() => {
          onCompleteChallenge(quest, 350, 'PERFECT BPM SYNC');
        }, 450);
      } else {
        setFeedbackBanner({
          text: `⚡ ON-BEAT BASS DROP (${nextHits}/${djDropTargetHits})! Hit the next glowing golden downbeat!`,
          tone: 'SUCCESS',
        });
      }
    } else {
      soundEngine.playError();
      setFeedbackBanner({
        text: `Off-Beat Timing (Step ${liveBeatStep + 1})! Wait for the cursor to hit a golden DROP PAD (1, 5, 9, 13)!`,
        tone: 'WARN',
      });
    }
  };

  // ============================================================================
  // MODE 2: NEON MIXOLOGY RECIPE & SHAKER PRESSURE GAUGE STATE
  // ============================================================================
  const [recipeOrder, setRecipeOrder] = useState<MixologyIngredient[]>(() => [
    MIXOLOGY_BOTTLES[0],
    MIXOLOGY_BOTTLES[1],
    MIXOLOGY_BOTTLES[2],
  ]);
  const [pouredLayers, setPouredLayers] = useState<MixologyIngredient[]>([]);
  const [shakerGauge, setShakerGauge] = useState<number>(20);
  const shakerDirRef = useRef<number>(1);
  const [drinksCraftedCount, setDrinksCraftedCount] = useState<number>(0);
  const drinksTargetCount = 2;

  const rollNewMixologyRecipe = useCallback(() => {
    const shuffled = [...MIXOLOGY_BOTTLES].sort(() => Math.random() - 0.5);
    setRecipeOrder([shuffled[0], shuffled[1], shuffled[2]]);
    setPouredLayers([]);
  }, []);

  useEffect(() => {
    rollNewMixologyRecipe();
    setDrinksCraftedCount(0);
  }, [quest?.id, rollNewMixologyRecipe]);

  // Oscillate the shaker pressure gauge when 3 layers are poured
  useEffect(() => {
    if (!quest || activeMode !== 'NEON_MIXOLOGY' || pouredLayers.length < 3) return;
    const interval = setInterval(() => {
      setShakerGauge((prev) => {
        let next = prev + shakerDirRef.current * 6.5;
        if (next >= 100) {
          next = 100;
          shakerDirRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          shakerDirRef.current = 1;
        }
        return next;
      });
    }, 45);
    return () => clearInterval(interval);
  }, [quest, activeMode, pouredLayers.length]);

  const handlePourBottle = (bottle: MixologyIngredient) => {
    if (pouredLayers.length >= 3) return;
    const expected = recipeOrder[pouredLayers.length];
    if (bottle.id === expected.id) {
      const nextLayers = [...pouredLayers, bottle];
      setPouredLayers(nextLayers);
      soundEngine.previewChannelHit('arp');
      if (nextLayers.length === 3) {
        setFeedbackBanner({
          text: '🍸 All 3 layers poured! Now lock the Neon Shaker when the gauge hits the GREEN SWEET SPOT (65%–88%)!',
          tone: 'INFO',
        });
      } else {
        setFeedbackBanner({
          text: `✓ Poured ${bottle.shortName}! Next layer: ${recipeOrder[nextLayers.length].shortName}`,
          tone: 'SUCCESS',
        });
      }
    } else {
      soundEngine.playError();
      setPouredLayers([]);
      setFeedbackBanner({
        text: `✗ Wrong bottle! Order needed ${expected.shortName}, not ${bottle.shortName}. Glass rinsed—start Layer 1!`,
        tone: 'WARN',
      });
    }
  };

  const handleLockShaker = () => {
    if (!quest || pouredLayers.length < 3) return;
    const isSweetSpot = shakerGauge >= 64 && shakerGauge <= 89;
    if (isSweetSpot) {
      const nextDone = drinksCraftedCount + 1;
      setDrinksCraftedCount(nextDone);
      soundEngine.playCashRegister();
      if (nextDone >= drinksTargetCount) {
        soundEngine.playUpgradeFanfare();
        setFeedbackBanner({
          text: '🍾 MASTER MIXOLOGIST! Both VIP trays shaken & served with sparklers!',
          tone: 'SUCCESS',
        });
        setTimeout(() => {
          onCompleteChallenge(quest, 380, 'MASTER FLAIR POUR');
        }, 450);
      } else {
        rollNewMixologyRecipe();
        setFeedbackBanner({
          text: `🔥 PERFECT SHAKE (${Math.round(shakerGauge)}%)! Cocktail 1/${drinksTargetCount} served—now mix Order #2!`,
          tone: 'SUCCESS',
        });
      }
    } else {
      soundEngine.playError();
      setFeedbackBanner({
        text: `Missed the Sweet Spot (${Math.round(shakerGauge)}%)! Time your release inside the 65%–88% green zone!`,
        tone: 'WARN',
      });
    }
  };

  // ============================================================================
  // MODE 3: VELVET ROPE BOUNCER ID & DRESS-CODE SCANNER STATE
  // ============================================================================
  const [bouncerQueue, setBouncerQueue] = useState<BouncerCandidate[]>(() =>
    [...BOUNCER_CANDIDATE_POOL].sort(() => Math.random() - 0.5).slice(0, 4)
  );
  const [bouncerIdx, setBouncerIdx] = useState<number>(0);
  const [bouncerScore, setBouncerScore] = useState<number>(0);
  const bouncerTargetScore = 3;

  useEffect(() => {
    setBouncerQueue([...BOUNCER_CANDIDATE_POOL].sort(() => Math.random() - 0.5));
    setBouncerIdx(0);
    setBouncerScore(0);
  }, [quest?.id]);

  const currentCandidate = bouncerQueue[bouncerIdx % bouncerQueue.length] || BOUNCER_CANDIDATE_POOL[0];

  const handleBouncerDecision = (admit: boolean) => {
    if (!quest) return;
    const isCorrect = admit === currentCandidate.shouldAdmit;
    if (isCorrect) {
      const nextScore = bouncerScore + 1;
      setBouncerScore(nextScore);
      setBouncerIdx((i) => i + 1);
      soundEngine.playCashRegister();
      if (nextScore >= bouncerTargetScore) {
        soundEngine.playUpgradeFanfare();
        setFeedbackBanner({
          text: '🛡️ FLAWLESS SECURITY SHIFT! Red carpet line moving at VIP speed!',
          tone: 'SUCCESS',
        });
        setTimeout(() => {
          onCompleteChallenge(quest, 340, 'ELITE VIP SECURITY');
        }, 450);
      } else {
        setFeedbackBanner({
          text: admit
            ? `✓ Correct! Admitted ${currentCandidate.name} (+$${currentCandidate.coverTip} Cover)! (${nextScore}/${bouncerTargetScore})`
            : `✓ Good catch! Bounced ${currentCandidate.name} (${currentCandidate.reasonIfInvalid})! (${nextScore}/${bouncerTargetScore})`,
          tone: 'SUCCESS',
        });
      }
    } else {
      soundEngine.playError();
      setBouncerIdx((i) => i + 1);
      setFeedbackBanner({
        text: admit
          ? `✗ Security Breach! You let in ${currentCandidate.name} (${currentCandidate.reasonIfInvalid})!`
          : `✗ Oops! ${currentCandidate.name} was a legitimate 21+ VIP guest with a valid hologram seal!`,
        tone: 'WARN',
      });
    }
  };

  // ============================================================================
  // MODE 4: SYNCHRONIZED NEON DANCE FLOOR MEMORY PATTERN STATE
  // ============================================================================
  const [danceSequence, setDanceSequence] = useState<number[]>([0, 4, 8]);
  const [playerStepIdx, setPlayerStepIdx] = useState<number>(0);
  const [highlightedPad, setHighlightedPad] = useState<number | null>(null);
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);
  const [danceRound, setDanceRound] = useState<number>(1);
  const totalDanceRounds = 2;

  const triggerDancePatternPlayback = useCallback((seq: number[]) => {
    setIsPlayingDemo(true);
    setPlayerStepIdx(0);
    setHighlightedPad(null);

    seq.forEach((padIdx, i) => {
      setTimeout(() => {
        setHighlightedPad(padIdx);
        const padInfo = DANCE_PAD_LABELS[padIdx];
        if (padInfo) {
          soundEngine.previewChannelHit(padInfo.midiChannel);
        }
      }, i * 480 + 250);

      setTimeout(() => {
        setHighlightedPad(null);
        if (i === seq.length - 1) {
          setIsPlayingDemo(false);
        }
      }, i * 480 + 580);
    });
  }, []);

  const startNewDanceRound = useCallback(
    (roundNum: number) => {
      const length = roundNum === 1 ? 3 : 4;
      const nextSeq = Array.from({ length }, () => Math.floor(Math.random() * 9));
      setDanceSequence(nextSeq);
      setDanceRound(roundNum);
      triggerDancePatternPlayback(nextSeq);
    },
    [triggerDancePatternPlayback]
  );

  useEffect(() => {
    if (!quest || activeMode !== 'NEON_DANCE_GRID') return;
    startNewDanceRound(1);
  }, [quest, activeMode, startNewDanceRound]);

  const handleTapDancePad = (padIdx: number) => {
    if (!quest || isPlayingDemo) return;
    setHighlightedPad(padIdx);
    setTimeout(() => setHighlightedPad((curr) => (curr === padIdx ? null : curr)), 220);

    const padInfo = DANCE_PAD_LABELS[padIdx];
    if (padInfo) {
      soundEngine.previewChannelHit(padInfo.midiChannel);
    }

    const expectedPad = danceSequence[playerStepIdx];
    if (padIdx === expectedPad) {
      const nextStep = playerStepIdx + 1;
      setPlayerStepIdx(nextStep);
      if (nextStep >= danceSequence.length) {
        if (danceRound >= totalDanceRounds) {
          soundEngine.playUpgradeFanfare();
          setFeedbackBanner({
            text: '🪩 DANCE FLOOR SYNCHRONIZED! All clubbers locked into a group dance wave!',
            tone: 'SUCCESS',
          });
          setTimeout(() => {
            onCompleteChallenge(quest, 360, 'SYNCHRONIZED GROOVE');
          }, 450);
        } else {
          setFeedbackBanner({
            text: '🔥 Round 1 Groove Locked! Watch the 4-tile Finale Sequence...',
            tone: 'SUCCESS',
          });
          setTimeout(() => {
            startNewDanceRound(2);
          }, 600);
        }
      } else {
        setFeedbackBanner({
          text: `✓ Step ${nextStep}/${danceSequence.length} matched! Tap the next tile in the groove!`,
          tone: 'INFO',
        });
      }
    } else {
      soundEngine.playError();
      setFeedbackBanner({
        text: '✗ Missed the tile step! Watch the glowing neon sequence again...',
        tone: 'WARN',
      });
      setTimeout(() => {
        triggerDancePatternPlayback(danceSequence);
      }, 500);
    }
  };

  if (!quest) return null;

  const boostedCash = Math.round(quest.rewardCash * streakMultiplier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-[#130c26] border-[3px] border-[#111116] ring-2 ring-cyan-400/70 shadow-[0_16px_50px_rgba(0,0,0,0.9)] overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#26154d] via-[#1c103b] to-[#26154d] border-b-2 border-[#111116] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 border-2 border-[#111116] shadow-[0_3px_0_#111116] flex items-center justify-center text-xl shrink-0">
              {quest.badgeEmoji}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-cyan-400 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                  LIVE SKILL QUEST
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/50 text-amber-300 font-mono font-bold text-[9px]">
                  🔥 {streakMultiplier}x Streak Bonus
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                {quest.title} — Interactive Club Challenge
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-purple-900/80 hover:bg-rose-600 border-2 border-[#111116] flex items-center justify-center text-purple-200 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CHALLENGE MODE SWITCHER (Player can play the recommended challenge or pick their favorite mini-game!) */}
        <div className="px-4 py-2 bg-[#0e081c] border-b border-purple-500/25 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: 'DJ_BEAT_DROP', label: '🎧 DJ Beat-Match', desc: 'BPM Pitch & Drop' },
                { id: 'NEON_MIXOLOGY', label: '🍸 Flair Mixology', desc: 'Recipe & Shaker' },
                { id: 'WHALE_CHAMPAGNE_TOWER', label: '🥂 Whale Pyramid', desc: '4x Double-or-Nothing' },
                { id: 'CELEB_PAPARAZZI_BLITZ', label: '📸 Paparazzi Blitz', desc: 'VIP Reflex Combo' },
                { id: 'VELVET_ROPE_BOUNCER', label: '🛡️ VIP Bouncer', desc: 'ID & Dress Scanner' },
                { id: 'NEON_DANCE_GRID', label: '🪩 Dance Grid Sync', desc: 'Neon Tile Memory' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  soundEngine.playClick();
                  setActiveMode(tab.id);
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer border transition-all shrink-0 ${
                  activeMode === tab.id
                    ? 'bg-gradient-to-r from-cyan-400 to-fuchsia-400 text-slate-950 border-white shadow'
                    : 'bg-[#1b1136] text-purple-200 border-purple-600/40 hover:border-cyan-400/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-[10px] font-mono font-bold text-emerald-300">
            Reward: +${boostedCash} · +{quest.rewardGems}💎 · +{quest.rewardXp} XP
          </div>
        </div>

        {/* LIVE FEEDBACK BANNER */}
        <div
          className={`mx-4 mt-3 px-3 py-2 rounded-xl border text-xs font-black flex items-center gap-2 ${
            feedbackBanner.tone === 'SUCCESS'
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
              : feedbackBanner.tone === 'WARN'
              ? 'bg-rose-500/25 border-rose-400 text-rose-200'
              : 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{feedbackBanner.text}</span>
        </div>

        {/* CHALLENGE BODY */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* ==================================================================
              1. DJ BEAT-MATCH & BASS DROP TIMING CHALLENGE
             ================================================================== */}
          {activeMode === 'DJ_BEAT_DROP' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Deck A: Master Club Tempo */}
                <div className="p-3 rounded-2xl bg-[#1a1133] border-2 border-[#111116] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-cyan-300 font-bold">
                      DECK A · MASTER FLOOR
                    </div>
                    <div className="text-xl font-black text-white mt-0.5">{targetBpm} BPM</div>
                    <div className="text-[10px] text-purple-300">Vibe Pulse: {vibePercent}%</div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-700 border-2 border-[#111116] flex items-center justify-center text-lg font-black animate-spin">
                    💿
                  </div>
                </div>

                {/* Deck B: Player Pitch Slider */}
                <div
                  className={`p-3 rounded-2xl border-2 transition-all ${
                    isBpmPitchSynced
                      ? 'bg-emerald-950/50 border-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]'
                      : 'bg-[#1a1133] border-rose-400/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold text-fuchsia-300">
                      DECK B · STEP 1: MATCH BPM
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        isBpmPitchSynced
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {isBpmPitchSynced ? '✓ SYNC LOCKED' : 'ADJUST PITCH'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between my-1.5">
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setDeckBBpm((b) => Math.max(85, b - 1));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-900 hover:bg-purple-800 text-xs font-black cursor-pointer"
                    >
                      -1 BPM
                    </button>
                    <span className="text-xl font-black font-mono text-amber-300">
                      {deckBBpm} BPM
                    </span>
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setDeckBBpm((b) => Math.min(165, b + 1));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-900 hover:bg-purple-800 text-xs font-black cursor-pointer"
                    >
                      +1 BPM
                    </button>
                  </div>

                  <input
                    type="range"
                    min={85}
                    max={165}
                    value={deckBBpm}
                    onChange={(e) => setDeckBBpm(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Step 2: Live 16-Step Beat Sequencer Drop Window */}
              <div className="p-3.5 rounded-2xl bg-[#180f30] border-2 border-[#111116] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-300">
                    STEP 2: HIT [DROP THE SUB-BASS] WHEN THE CURSOR HITS A GOLDEN DOWNBEAT (1, 5, 9, 13)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-900 border border-cyan-400/50 text-xs font-mono font-black text-cyan-300">
                    Drops: {djDropHits}/{djDropTargetHits}
                  </span>
                </div>

                {/* 16-Step Visual Beat Bar */}
                <div className="grid grid-cols-8 sm:grid-cols-16 gap-1">
                  {Array.from({ length: 16 }, (_, idx) => {
                    const isDownbeatPad = idx % 4 === 0;
                    const isCurrentCursor = liveBeatStep === idx;
                    return (
                      <div
                        key={idx}
                        className={`h-10 rounded-lg border flex flex-col items-center justify-center text-[9px] font-mono font-black transition-all duration-75 ${
                          isCurrentCursor && isDownbeatPad
                            ? 'bg-amber-300 text-slate-950 border-white scale-110 shadow-[0_0_16px_#facc15]'
                            : isCurrentCursor
                            ? 'bg-cyan-400 text-slate-950 border-white scale-105 shadow-[0_0_12px_#22d3ee]'
                            : isDownbeatPad
                            ? 'bg-amber-500/25 border-amber-400/80 text-amber-200'
                            : 'bg-[#0e081d] border-purple-800/50 text-purple-400'
                        }`}
                      >
                        <span>{idx + 1}</span>
                        {isDownbeatPad && <span className="text-[8px]">⚡</span>}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleDjBeatDropAttempt}
                  className={`w-full py-3 rounded-2xl border-2 border-[#111116] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5 ${
                    isBpmPitchSynced && isStepInDropWindow
                      ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(250,204,21,0.8)] scale-[1.01]'
                      : isBpmPitchSynced
                      ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-slate-950 shadow-[0_4px_0_#111116]'
                      : 'bg-purple-900/60 text-purple-300'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>
                    {!isBpmPitchSynced
                      ? `Match Deck B to ${targetBpm} BPM First!`
                      : isStepInDropWindow
                      ? '🔥 DROP THE SUB-BASS NOW!!'
                      : 'WAIT FOR GOLDEN BEAT PAD...'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================
              2. NEON MIXOLOGY RECIPE & SHAKER PRESSURE GAUGE CHALLENGE
             ================================================================== */}
          {activeMode === 'NEON_MIXOLOGY' && (
            <div className="space-y-3.5">
              {/* Recipe Order Card */}
              <div className="p-3 rounded-2xl bg-[#1a1133] border-2 border-[#111116] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase text-cyan-300 font-bold">
                    VIP ORDER #{drinksCraftedCount + 1} OF {drinksTargetCount} · POUR IN EXACT ORDER:
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {recipeOrder.map((ing, idx) => {
                      const isPoured = idx < pouredLayers.length;
                      const isNext = idx === pouredLayers.length;
                      return (
                        <div
                          key={`${ing.id}_${idx}`}
                          className={`px-2.5 py-1 rounded-xl border-2 flex items-center gap-1.5 text-xs font-black ${
                            isPoured
                              ? 'bg-emerald-500/30 border-emerald-300 text-emerald-200'
                              : isNext
                              ? 'bg-amber-400/25 border-amber-300 text-white animate-pulse'
                              : 'bg-[#100a20] border-purple-700/40 text-purple-300'
                          }`}
                        >
                          <span>{isPoured ? '✓' : `${idx + 1}.`}</span>
                          <span>{ing.emoji}</span>
                          <span>{ing.shortName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-purple-950 border border-pink-400/40 text-xs font-mono font-black text-pink-300">
                  Served: {drinksCraftedCount}/{drinksTargetCount} 🍸
                </div>
              </div>

              {/* 5 Neon Liquor Bottles on the Back-Bar Rack */}
              <div>
                <div className="text-[10px] font-mono uppercase text-purple-300 font-bold mb-1.5">
                  STEP 1: TAP BOTTLES ON THE NEON BAR RACK TO POUR LAYERS 1 → 2 → 3
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {MIXOLOGY_BOTTLES.map((bottle) => (
                    <button
                      key={bottle.id}
                      onClick={() => handlePourBottle(bottle)}
                      disabled={pouredLayers.length >= 3}
                      className={`p-2.5 rounded-2xl border-2 ${bottle.bgClass} ${bottle.borderClass} flex flex-col items-center justify-center gap-1 cursor-pointer transition-transform active:scale-95 disabled:opacity-45`}
                    >
                      <span className="text-2xl">{bottle.emoji}</span>
                      <span className={`text-[11px] font-black ${bottle.textClass} text-center`}>
                        {bottle.shortName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Oscillating Shaker Sweet-Spot Gauge */}
              <div className="p-3.5 rounded-2xl bg-[#180f30] border-2 border-[#111116] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-emerald-300">
                    STEP 2: LOCK SHAKER IN THE GREEN SWEET SPOT (65% – 88%)
                  </span>
                  <span className="text-xs font-mono font-black text-cyan-300">
                    Pressure: {Math.round(shakerGauge)}%
                  </span>
                </div>

                {/* Pressure Bar with Sweet Spot Zone */}
                <div className="relative h-7 rounded-xl bg-[#0c0718] border-2 border-[#111116] overflow-hidden">
                  <svg
                    viewBox="0 0 100 28"
                    preserveAspectRatio="none"
                    className="w-full h-full block"
                  >
                    <rect
                      x={0}
                      y={0}
                      width={shakerGauge}
                      height={28}
                      fill={shakerGauge >= 64 && shakerGauge <= 89 ? '#34d399' : '#d946ef'}
                    />
                  </svg>
                  {/* Sweet Spot Target Zone (65% to 88%) */}
                  <div className="absolute top-0 bottom-0 left-[65%] w-[23%] bg-emerald-400/35 border-x-2 border-emerald-300 flex items-center justify-center pointer-events-none">
                    <span className="text-[8px] font-black uppercase text-emerald-100 tracking-wider drop-shadow">
                      SWEET SPOT
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLockShaker}
                  disabled={pouredLayers.length < 3}
                  className={`w-full py-3 rounded-2xl border-2 border-[#111116] font-black text-sm uppercase tracking-wider cursor-pointer transition-all ${
                    pouredLayers.length < 3
                      ? 'bg-purple-950/60 text-purple-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-300 text-slate-950 shadow-[0_4px_0_#111116] hover:brightness-110'
                  }`}
                >
                  {pouredLayers.length < 3
                    ? `Pour All 3 Ingredients First (${pouredLayers.length}/3)`
                    : '🍸 SHAKE & SERVE COCKTAIL NOW!'}
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================
              3. VELVET ROPE BOUNCER ID & DRESS-CODE SCANNER CHALLENGE
             ================================================================== */}
          {activeMode === 'VELVET_ROPE_BOUNCER' && (
            <div className="space-y-3.5">
              {/* Tonight's Velvet Rope Security Rules */}
              <div className="p-3 rounded-2xl bg-[#1a1133] border-2 border-amber-400/60 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-mono uppercase text-amber-300 font-bold">
                    🛡️ TONIGHT&apos;S VELVET ROPE SECURITY RULES:
                  </div>
                  <div className="text-xs font-bold text-purple-100">
                    1. Must be <span className="text-cyan-300 font-black">21+ (Born 2005 or earlier)</span> · 2. Must have <span className="text-emerald-300 font-black">VERIFIED HOLOGRAM ★</span> · 3. <span className="text-pink-300 font-black">No Beach Flip-Flops</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-purple-950 border border-amber-300/40 text-xs font-mono font-black text-amber-300">
                  Checked: {bouncerScore}/{bouncerTargetScore}
                </span>
              </div>

              {/* Guest ID Card Inspection */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#231542] to-[#140b29] border-2 border-cyan-400/70 shadow-lg space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#120a24] border-2 border-purple-400 flex items-center justify-center text-3xl">
                      {currentCandidate.avatarEmoji}
                    </div>
                    <div>
                      <div className="text-base font-black text-white">{currentCandidate.name}</div>
                      <div className="text-xs italic text-purple-200">&ldquo;{currentCandidate.quote}&rdquo;</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-xs font-mono font-black text-emerald-300 shrink-0">
                    Cover Tip: +${currentCandidate.coverTip}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-purple-500/30 text-xs">
                  <div className="p-2 rounded-xl bg-[#100920] border border-purple-600/40">
                    <div className="text-[9px] font-mono uppercase text-purple-300">ID BIRTH YEAR</div>
                    <div className="font-mono font-black text-sm text-white mt-0.5">
                      Born {currentCandidate.birthYear} ({2026 - currentCandidate.birthYear} yrs)
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#100920] border border-purple-600/40">
                    <div className="text-[9px] font-mono uppercase text-purple-300">ATTIRE / DRESS CODE</div>
                    <div className="font-black text-xs text-cyan-200 mt-0.5">
                      {currentCandidate.dressStyle}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#100920] border border-purple-600/40">
                    <div className="text-[9px] font-mono uppercase text-purple-300">VIP PASS SEAL</div>
                    <div className="font-mono font-black text-xs text-amber-300 mt-0.5">
                      {currentCandidate.sealLabel}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => handleBouncerDecision(false)}
                    className="py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:brightness-110 border-2 border-[#111116] shadow-[0_4px_0_#111116] font-black text-xs sm:text-sm uppercase text-white cursor-pointer"
                  >
                    🚫 BOUNCE FROM LINE
                  </button>
                  <button
                    onClick={() => handleBouncerDecision(true)}
                    className="py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 border-2 border-[#111116] shadow-[0_4px_0_#111116] font-black text-xs sm:text-sm uppercase text-slate-950 cursor-pointer"
                  >
                    ✅ ADMIT TO CLUB
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================
              4. SYNCHRONIZED NEON DANCE FLOOR MEMORY PATTERN CHALLENGE
             ================================================================== */}
          {activeMode === 'NEON_DANCE_GRID' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-[#1a1133] border-2 border-[#111116] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase text-cyan-300 font-bold">
                    ROUND {danceRound} OF {totalDanceRounds} · REPEAT THE GLOWING NEON TILE SEQUENCE
                  </div>
                  <div className="text-xs font-bold text-purple-200 mt-0.5">
                    {isPlayingDemo
                      ? '👀 Watch the neon dance floor tiles flash...'
                      : `🕺 Your Turn! Tap ${danceSequence.length} tiles in order (${playerStepIdx}/${danceSequence.length})`}
                  </div>
                </div>

                <button
                  onClick={() => triggerDancePatternPlayback(danceSequence)}
                  disabled={isPlayingDemo}
                  className="px-3 py-1.5 rounded-xl bg-purple-800 hover:bg-purple-700 border border-cyan-400/50 text-xs font-black text-cyan-200 cursor-pointer disabled:opacity-50"
                >
                  ↻ Replay Pattern
                </button>
              </div>

              {/* 3x3 Glowing Isometric-Styled Neon Dance Floor Pads */}
              <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto">
                {DANCE_PAD_LABELS.map((pad) => {
                  const isLit = highlightedPad === pad.idx;
                  return (
                    <button
                      key={pad.idx}
                      onClick={() => handleTapDancePad(pad.idx)}
                      disabled={isPlayingDemo}
                      className={`h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isLit
                          ? `bg-gradient-to-br ${pad.colorClass} border-white ring-4 ${pad.ringClass} scale-105 shadow-[0_0_25px_rgba(255,255,255,0.85)] text-slate-950`
                          : 'bg-[#170f2e] hover:bg-[#221642] border-[#111116] text-purple-200 shadow-[0_3px_0_#111116]'
                      }`}
                    >
                      <span className="text-lg">🪩</span>
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {pad.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================================================================
              5. VIP WHALE CHAMPAGNE PYRAMID POUR (DOUBLE-OR-NOTHING 4x TOWER)
             ================================================================== */}
          {activeMode === 'WHALE_CHAMPAGNE_TOWER' && (
            <WhaleChampagnePyramidChallenge
              quest={quest}
              setFeedbackBanner={setFeedbackBanner}
              onCompleteChallenge={onCompleteChallenge}
            />
          )}

          {/* ==================================================================
              6. CELEB PAPARAZZI SHIELD & VIP WHISPERER BLITZ
             ================================================================== */}
          {activeMode === 'CELEB_PAPARAZZI_BLITZ' && (
            <CelebPaparazziBlitzChallenge
              quest={quest}
              setFeedbackBanner={setFeedbackBanner}
              onCompleteChallenge={onCompleteChallenge}
            />
          )}
        </div>
      </div>
    </div>
  );
};

interface SubChallengeProps {
  quest: QuestTask;
  setFeedbackBanner: React.Dispatch<
    React.SetStateAction<{ text: string; tone: 'SUCCESS' | 'WARN' | 'INFO' }>
  >;
  onCompleteChallenge: (quest: QuestTask, bonusCash: number, accuracyLabel: string) => void;
}

const PYRAMID_TIERS = [
  { tier: 1, label: 'Base Row (4 Flutes)', minZone: 24, maxZone: 82, multiplier: 1.3, speed: 4.8 },
  { tier: 2, label: 'Mid Row (3 Flutes)', minZone: 32, maxZone: 76, multiplier: 2.0, speed: 6.2 },
  { tier: 3, label: 'Crown Row (2 Flutes)', minZone: 40, maxZone: 70, multiplier: 3.1, speed: 7.6 },
  { tier: 4, label: 'Apex Sovereign Flute (1 Flute)', minZone: 46, maxZone: 66, multiplier: 4.5, speed: 9.2 },
];

const WhaleChampagnePyramidChallenge: React.FC<SubChallengeProps> = ({
  quest,
  setFeedbackBanner,
  onCompleteChallenge,
}) => {
  const [currentTierIdx, setCurrentTierIdx] = useState<number>(0);
  const [cursorPos, setCursorPos] = useState<number>(15);
  const dirRef = useRef<number>(1);
  const [filledTiers, setFilledTiers] = useState<number[]>([]);

  const activeTier = PYRAMID_TIERS[Math.min(currentTierIdx, PYRAMID_TIERS.length - 1)];

  useEffect(() => {
    const timer = setInterval(() => {
      setCursorPos((prev) => {
        let next = prev + dirRef.current * activeTier.speed;
        if (next >= 100) {
          next = 100;
          dirRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          dirRef.current = 1;
        }
        return next;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [activeTier.speed]);

  const handlePourTier = () => {
    const inZone = cursorPos >= activeTier.minZone && cursorPos <= activeTier.maxZone;
    if (inZone) {
      const nextFilled = [...filledTiers, activeTier.tier];
      setFilledTiers(nextFilled);
      soundEngine.previewChannelHit('arp');

      if (nextFilled.length >= PYRAMID_TIERS.length) {
        soundEngine.playUpgradeFanfare();
        const jackpotBonus = Math.round(450 * activeTier.multiplier);
        setFeedbackBanner({
          text: `👑 4.5x GOLDEN PYRAMID JACKPOT! All 4 Champagne Tiers Poured Perfectly! +$${jackpotBonus} Tip!`,
          tone: 'SUCCESS',
        });
        setTimeout(() => {
          onCompleteChallenge(quest, jackpotBonus, '4.5x WHALE PYRAMID JACKPOT');
        }, 420);
      } else {
        setCurrentTierIdx(nextFilled.length);
        setFeedbackBanner({
          text: `🥂 Tier ${activeTier.tier} Filled (${activeTier.multiplier}x)! Lock in your payout or risk Double-or-Nothing for Tier ${activeTier.tier + 1}!`,
          tone: 'SUCCESS',
        });
      }
    } else {
      soundEngine.playError();
      if (filledTiers.length > 0) {
        setFilledTiers([]);
        setCurrentTierIdx(0);
        setFeedbackBanner({
          text: `💦 Champagne Overflowed at ${Math.round(cursorPos)}%! Tower reset to Tier 1 — hit the Golden Foam Zone!`,
          tone: 'WARN',
        });
      } else {
        setFeedbackBanner({
          text: `💦 Missed the Golden Pour Zone (${activeTier.minZone}%–${activeTier.maxZone}%)! Wait for the stream to align!`,
          tone: 'WARN',
        });
      }
    }
  };

  const handleCashOutEarly = () => {
    if (filledTiers.length < 2) return;
    const achievedTier = PYRAMID_TIERS[filledTiers.length - 1];
    const bonus = Math.round(320 * achievedTier.multiplier);
    soundEngine.playUpgradeFanfare();
    setFeedbackBanner({
      text: `💰 Locked in ${achievedTier.multiplier}x Whale Champagne Tip (+$${bonus})!`,
      tone: 'SUCCESS',
    });
    setTimeout(() => {
      onCompleteChallenge(quest, bonus, `${achievedTier.multiplier}x CHAMPAGNE TOWER`);
    }, 350);
  };

  return (
    <div className="space-y-3.5">
      <div className="p-3 rounded-2xl bg-[#1a1133] border-2 border-[#111116] flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-mono uppercase text-amber-300 font-bold">
            🐋 VIP WHALE DOUBLE-OR-NOTHING CHAMPAGNE PYRAMID
          </div>
          <div className="text-xs font-bold text-purple-200 mt-0.5">
            Pour inside the Golden Champagne Sweet-Spot! Cash out safely after Tier 2+ or risk it for the 4.5x Apex Jackpot!
          </div>
        </div>
        <div className="px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-300 text-amber-200 font-mono font-black text-xs">
          Current Tier: {activeTier.tier}/4 ({activeTier.multiplier}x)
        </div>
      </div>

      {/* Visual 4-Tier Champagne Glass Pyramid */}
      <div className="p-3.5 rounded-2xl bg-[#110a24] border-2 border-amber-400/40 flex flex-col items-center gap-2">
        {[...PYRAMID_TIERS].reverse().map((t) => {
          const isFilled = filledTiers.includes(t.tier);
          const isCurrent = activeTier.tier === t.tier;
          const glassCount = 5 - t.tier;
          return (
            <div
              key={t.tier}
              className={`w-full max-w-md px-3 py-1.5 rounded-xl border transition-all flex items-center justify-between ${
                isFilled
                  ? 'bg-gradient-to-r from-amber-500/35 via-yellow-400/35 to-amber-500/35 border-amber-300 shadow-[0_0_15px_rgba(250,204,21,0.35)]'
                  : isCurrent
                  ? 'bg-purple-900/60 border-cyan-400 ring-2 ring-cyan-400/40'
                  : 'bg-[#180f30] border-purple-800/40 opacity-65'
              }`}
            >
              <span className="text-[10px] font-mono font-black text-amber-200">
                TIER {t.tier} · {t.multiplier}x
              </span>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: glassCount }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`text-base transition-transform ${
                      isFilled ? 'scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]' : ''
                    }`}
                  >
                    {isFilled ? '🥂' : '🍷'}
                  </span>
                ))}
              </div>
              <span className="text-[10px] font-black uppercase text-cyan-200">
                {isFilled ? '✓ FILLED' : isCurrent ? 'POURING NOW' : 'LOCKED'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Oscillating Champagne Stream Gauge */}
      <div className="p-3 rounded-2xl bg-[#1a1133] border-2 border-[#111116] space-y-2.5">
        <div className="flex items-center justify-between text-xs font-black">
          <span className="text-amber-300">
            🍾 POUR STREAM: {activeTier.label}
          </span>
          <span className="font-mono text-cyan-300">
            Sweet Spot: {activeTier.minZone}%–{activeTier.maxZone}%
          </span>
        </div>

        <div className="relative h-7 rounded-xl bg-[#0d071c] border-2 border-[#111116] overflow-hidden">
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-400/45 via-emerald-400/65 to-amber-400/45 border-x-2 border-amber-300"
            style={{
              left: `${activeTier.minZone}%`,
              width: `${activeTier.maxZone - activeTier.minZone}%`,
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-2.5 -ml-1.25 rounded-full bg-white shadow-[0_0_12px_#fff] border border-slate-950 transition-none"
            style={{ left: `${cursorPos}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handlePourTier}
            className="py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 hover:brightness-110 border-2 border-[#111116] shadow-[0_4px_0_#111116] font-black text-xs sm:text-sm uppercase text-slate-950 cursor-pointer"
          >
            🍾 POUR TIER {activeTier.tier} ({activeTier.multiplier}x)
          </button>

          <button
            onClick={handleCashOutEarly}
            disabled={filledTiers.length < 2}
            className="py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 disabled:opacity-40 border-2 border-[#111116] shadow-[0_4px_0_#111116] font-black text-xs sm:text-sm uppercase text-slate-950 cursor-pointer"
          >
            {filledTiers.length >= 2
              ? `💰 LOCK IN ${PYRAMID_TIERS[filledTiers.length - 1].multiplier}x PAYOUT NOW`
              : '🔒 Fill 2 Tiers to Lock Payout'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface BoothTarget {
  boothIdx: number;
  kind: 'PAPARAZZI' | 'WHALE_ORDER' | 'CELEB_TOAST';
  title: string;
  subtitle: string;
  emoji: string;
  points: number;
}

const BOOTH_TARGETS: Array<Omit<BoothTarget, 'boothIdx'>> = [
  {
    kind: 'PAPARAZZI',
    title: 'BLOCK PAPARAZZI!',
    subtitle: 'Sneaky Tabloid Camera Flash',
    emoji: '📸',
    points: 160,
  },
  {
    kind: 'WHALE_ORDER',
    title: 'SERVE ★ VIP WHALE',
    subtitle: 'Wants 24K Gold Magnum',
    emoji: '🐋',
    points: 200,
  },
  {
    kind: 'CELEB_TOAST',
    title: 'A-LIST CELEB TOAST',
    subtitle: 'Sparkler Selfie Moment',
    emoji: '🌟',
    points: 180,
  },
];

const CelebPaparazziBlitzChallenge: React.FC<SubChallengeProps> = ({
  quest,
  setFeedbackBanner,
  onCompleteChallenge,
}) => {
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(1);
  const [activeTargets, setActiveTargets] = useState<BoothTarget[]>([]);
  const targetScore = 700;

  // Spawn dynamic VIP booth events every 750ms
  useEffect(() => {
    const spawnInitial = (): BoothTarget[] => {
      const b1 = Math.floor(Math.random() * 3);
      const b2 = 3 + Math.floor(Math.random() * 3);
      const t1 = BOOTH_TARGETS[Math.floor(Math.random() * BOOTH_TARGETS.length)];
      const t2 = BOOTH_TARGETS[Math.floor(Math.random() * BOOTH_TARGETS.length)];
      return [
        { ...t1, boothIdx: b1 },
        { ...t2, boothIdx: b2 },
      ];
    };
    setActiveTargets(spawnInitial());

    const interval = setInterval(() => {
      setActiveTargets((prev) => {
        const occupied = new Set(prev.map((p) => p.boothIdx));
        const freeBooths = [0, 1, 2, 3, 4, 5].filter((i) => !occupied.has(i));
        if (freeBooths.length === 0) {
          return prev.slice(1);
        }
        const randomBooth = freeBooths[Math.floor(Math.random() * freeBooths.length)];
        const template = BOOTH_TARGETS[Math.floor(Math.random() * BOOTH_TARGETS.length)];
        const nextList = [...prev.slice(-2), { ...template, boothIdx: randomBooth }];
        return nextList;
      });
    }, 850);

    return () => clearInterval(interval);
  }, []);

  const handleBoothTap = (boothIdx: number) => {
    const hit = activeTargets.find((t) => t.boothIdx === boothIdx);
    if (!hit) {
      soundEngine.playError();
      setCombo(1);
      setFeedbackBanner({
        text: '⚠️ Empty VIP Booth tapped! Combo reset to 1x — tap booths with active Paparazzi or VIP Whales!',
        tone: 'WARN',
      });
      return;
    }

    const nextCombo = Math.min(5, combo + 1);
    const earned = Math.round(hit.points * (1 + (nextCombo - 1) * 0.25));
    const nextScore = score + earned;
    setScore(nextScore);
    setCombo(nextCombo);
    setActiveTargets((prev) => prev.filter((t) => t.boothIdx !== boothIdx));

    if (hit.kind === 'PAPARAZZI') {
      soundEngine.previewChannelHit('snare');
    } else {
      soundEngine.previewChannelHit('arp');
    }

    if (nextScore >= targetScore) {
      soundEngine.playUpgradeFanfare();
      const bonusCash = 420 + nextCombo * 65;
      setFeedbackBanner({
        text: `📸 PAPARAZZI BLITZ CLEARED (${nextScore} PTS · ${nextCombo}x COMBO)! VIPs Protected & Hyped!`,
        tone: 'SUCCESS',
      });
      setTimeout(() => {
        onCompleteChallenge(quest, bonusCash, `${nextCombo}x VIP SHIELD COMBO`);
      }, 380);
    } else {
      setFeedbackBanner({
        text: `🔥 +${earned} PTS (${nextCombo}x COMBO)! ${
          hit.kind === 'PAPARAZZI' ? 'Blocked Paparazzi Flash!' : 'VIP Whale Ecstatic!'
        } (${nextScore}/${targetScore} PTS)`,
        tone: 'SUCCESS',
      });
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="p-3 rounded-2xl bg-[#1a1133] border-2 border-[#111116] flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-mono uppercase text-fuchsia-300 font-bold">
            📸 PAPARAZZI SHIELD & ★ VIP WHALE WHISPERER
          </div>
          <div className="text-xs font-bold text-purple-200 mt-0.5">
            Tap active VIP pods to block sneaky paparazzi flashes & serve ★ VIP Whales before they vanish!
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-amber-400/20 border border-amber-300 text-amber-300 font-mono font-black text-xs">
            🔥 {combo}x COMBO
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-cyan-400/20 border border-cyan-300 text-cyan-200 font-mono font-black text-xs">
            {score} / {targetScore} PTS
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-3 rounded-full bg-[#0d071c] border border-purple-500/40 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-400 transition-all duration-200"
          style={{ width: `${Math.min(100, Math.round((score / targetScore) * 100))}%` }}
        />
      </div>

      {/* 6-Booth Interactive Reflex Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {[0, 1, 2, 3, 4, 5].map((boothIdx) => {
          const target = activeTargets.find((t) => t.boothIdx === boothIdx);
          const isPaparazzi = target?.kind === 'PAPARAZZI';
          const isWhale = target?.kind === 'WHALE_ORDER';
          return (
            <button
              key={boothIdx}
              onClick={() => handleBoothTap(boothIdx)}
              className={`h-28 rounded-2xl border-2 p-2.5 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                target
                  ? isPaparazzi
                    ? 'bg-gradient-to-br from-rose-600/80 to-red-900/90 border-rose-300 ring-2 ring-rose-400/60 scale-[1.02] shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                    : isWhale
                    ? 'bg-gradient-to-br from-amber-500/80 to-yellow-700/90 border-amber-200 ring-2 ring-amber-300/60 scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.5)]'
                    : 'bg-gradient-to-br from-cyan-500/80 to-purple-800/90 border-cyan-200 ring-2 ring-cyan-300/60 scale-[1.02] shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                  : 'bg-[#150d2a] hover:bg-[#1e133b] border-[#111116] text-purple-400/70'
              }`}
            >
              {target ? (
                <>
                  <span className="text-2xl animate-bounce">{target.emoji}</span>
                  <span className="text-[11px] font-black uppercase text-white mt-1 leading-tight">
                    {target.title}
                  </span>
                  <span className="text-[9px] font-bold text-amber-200 mt-0.5">
                    {target.subtitle} (+{target.points})
                  </span>
                </>
              ) : (
                <>
                  <span className="text-lg opacity-40">🛋️</span>
                  <span className="text-[10px] font-mono uppercase mt-1">
                    VIP Booth #{boothIdx + 1}
                  </span>
                  <span className="text-[9px] opacity-60">Secure & Chill</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

