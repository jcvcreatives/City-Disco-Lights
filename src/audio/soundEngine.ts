// Procedural Web Audio API 16-Step Club Synthesizer, Custom Beat Sequencer & Audio Track Player

export type SynthWaveType = 'sawtooth' | 'square' | 'triangle' | 'sine';

export interface BeatPattern {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  // 16-step boolean arrays for the 6 sequencer channels
  kick: boolean[];
  snare: boolean[];
  hihat: boolean[];
  openHat: boolean[];
  bass: boolean[];
  arp: boolean[];
  useClap: boolean;
  rootMidi: number; // e.g., 45 = A2, 48 = C3
  bassWave: SynthWaveType;
  filterCutoff: number; // Hz (250 - 3500)
  bassBoost: number; // 0.5 - 2.0
  progression: number[][]; // 4 bars of chord intervals
  melodyOffsets?: number[]; // 16-step melodic hook semitone offsets
}

export interface ClubSongTrack {
  id: string;
  title: string;
  artist: string;
  vibeDesc: string;
  genre: string;
  bpm: number;
  durationSec: number;
  bonus: string;
  accentColor: string;
  secondaryColor: string;
  unlockLevel: number;
  patternId: string;
  isCustomBeat?: boolean;
  customAudioUrl?: string;
  streamingSource?: 'SYNTH' | 'UPLOAD' | 'YOUTUBE' | 'SPOTIFY' | 'APPLE';
  externalId?: string;
  thumbnailUrl?: string;
  externalUrl?: string;
}

export interface GenreDefinition {
  id: string;
  name: string;
  bpm: number;
  unlockLevel: number;
  color: string;
  color2: string;
  icon: string;
  crowdBonusDesc: string;
}

export const CLUB_GENRES: GenreDefinition[] = [
  {
    id: 'Pop',
    name: 'Pop',
    bpm: 122,
    unlockLevel: 1,
    color: '#ff4fa0',
    color2: '#9b2cff',
    icon: '💖',
    crowdBonusDesc: '+20% Crowd Arrival & Sing-Along Tips',
  },
  {
    id: 'Dance',
    name: 'Dance',
    bpm: 128,
    unlockLevel: 1,
    color: '#19b8ff',
    color2: '#1a4fff',
    icon: '🪩',
    crowdBonusDesc: '+30% Dance Floor Hype & Strobe Sync',
  },
  {
    id: 'Hip Hop',
    name: 'Hip Hop',
    bpm: 94,
    unlockLevel: 1,
    color: '#f2b600',
    color2: '#a35a00',
    icon: '👑',
    crowdBonusDesc: '+35% VIP Booth Booking & Bottle Tips',
  },
  {
    id: 'Latin',
    name: 'Latin',
    bpm: 98,
    unlockLevel: 1,
    color: '#ff7b2a',
    color2: '#c21d3a',
    icon: '🔥',
    crowdBonusDesc: '+25% Bar Cocktail Speed & Fiesta Vibe',
  },
  {
    id: 'Electro',
    name: 'Electro',
    bpm: 130,
    unlockLevel: 1,
    color: '#2fcf76',
    color2: '#0b6e5a',
    icon: '⚡',
    crowdBonusDesc: '+40% Laser & Neon Overdrive Multiplier',
  },
  {
    id: 'Rock',
    name: 'Rock',
    bpm: 138,
    unlockLevel: 1,
    color: '#ff3b3b',
    color2: '#4a0b16',
    icon: '🎸',
    crowdBonusDesc: '+35% High-Energy Drink Orders',
  },
  {
    id: 'Custom',
    name: 'Custom Beat',
    bpm: 126,
    unlockLevel: 1,
    color: '#22d3ee',
    color2: '#a855f7',
    icon: '🎛️',
    crowdBonusDesc: '+50% Resident DJ Signature Beat Bonus',
  },
];

function strToSteps(pattern: string): boolean[] {
  const arr: boolean[] = [];
  for (let i = 0; i < 16; i++) {
    arr.push(pattern[i] === 'x');
  }
  return arr;
}

export const PRESET_BEAT_PATTERNS: Record<string, BeatPattern> = {
  pat_pop_1: {
    id: 'pat_pop_1',
    name: 'Neon Heartbeat',
    genre: 'Pop',
    bpm: 124,
    kick: strToSteps('x...x...x...x...'),
    snare: strToSteps('....x.......x...'),
    hihat: strToSteps('..x...x...x...x.'),
    openHat: strToSteps('......x.......x.'),
    bass: strToSteps('x..x..x.x..x..x.'),
    arp: strToSteps('x.x.x.xxx.x.x.xx'),
    useClap: true,
    rootMidi: 48, // C3
    bassWave: 'sawtooth',
    filterCutoff: 1950,
    bassBoost: 1.25,
    progression: [
      [0, 4, 7],
      [7, 11, 14],
      [9, 12, 16],
      [5, 9, 12],
    ],
    melodyOffsets: [12, 16, 19, 16, 24, 19, 16, 12, 14, 17, 21, 17, 19, 16, 14, 12],
  },
  pat_pop_2: {
    id: 'pat_pop_2',
    name: 'Glitter Rush',
    genre: 'Pop',
    bpm: 120,
    kick: strToSteps('x...x..xx...x...'),
    snare: strToSteps('....x.......x..x'),
    hihat: strToSteps('x.x.x.x.x.x.x.x.'),
    openHat: strToSteps('..x.......x.....'),
    bass: strToSteps('x.x.x..xx.x.x...'),
    arp: strToSteps('x..x..x.x..x..x.'),
    useClap: true,
    rootMidi: 50, // D3
    bassWave: 'sawtooth',
    filterCutoff: 2100,
    bassBoost: 1.25,
    progression: [
      [0, 4, 7],
      [5, 9, 12],
      [9, 12, 16],
      [7, 11, 14],
    ],
    melodyOffsets: [12, 14, 16, 19, 16, 14, 12, 9, 12, 14, 16, 21, 19, 16, 14, 12],
  },
  pat_dance_1: {
    id: 'pat_dance_1',
    name: 'Laser Floor',
    genre: 'Dance',
    bpm: 128,
    kick: strToSteps('x...x...x...x...'),
    snare: strToSteps('....x.......x...'),
    hihat: strToSteps('x.x.x.x.x.x.x.x.'),
    openHat: strToSteps('..x...x...x...x.'),
    bass: strToSteps('..x...x...x...x.'),
    arp: strToSteps('x.x.xx.xx.x.xx.x'),
    useClap: true,
    rootMidi: 45, // A2
    bassWave: 'sawtooth',
    filterCutoff: 2300,
    bassBoost: 1.35,
    progression: [
      [0, 3, 7],
      [8, 12, 15],
      [3, 7, 10],
      [10, 14, 17],
    ],
    melodyOffsets: [12, 15, 19, 24, 19, 15, 22, 19, 12, 15, 19, 24, 22, 19, 15, 14],
  },
  pat_dance_2: {
    id: 'pat_dance_2',
    name: 'Sunrise Rave',
    genre: 'Dance',
    bpm: 132,
    kick: strToSteps('x...x...x...x.x.'),
    snare: strToSteps('....x.......x...'),
    hihat: strToSteps('xxxxxxxxxxxxxxxx'),
    openHat: strToSteps('..x...x...x...x.'),
    bass: strToSteps('x.xx..x.x.xx..x.'),
    arp: strToSteps('x..x.xx.x..x.xx.'),
    useClap: true,
    rootMidi: 47, // B2
    bassWave: 'sawtooth',
    filterCutoff: 2450,
    bassBoost: 1.4,
    progression: [
      [0, 3, 7],
      [5, 8, 12],
      [8, 12, 15],
      [7, 11, 14],
    ],
    melodyOffsets: [12, 19, 15, 24, 22, 19, 15, 12, 17, 20, 24, 19, 17, 15, 14, 12],
  },
  pat_hiphop_1: {
    id: 'pat_hiphop_1',
    name: 'Velvet Rope 808',
    genre: 'Hip Hop',
    bpm: 94,
    kick: strToSteps('x......x..x.....'),
    snare: strToSteps('....x.......x...'),
    hihat: strToSteps('x.x.x.x.x.x.xxx.'),
    openHat: strToSteps('..x.........x...'),
    bass: strToSteps('x......x..x...x.'),
    arp: strToSteps('x..x..x.x...x.x.'),
    useClap: false,
    rootMidi: 43, // G2
    bassWave: 'triangle',
    filterCutoff: 1650,
    bassBoost: 1.55,
    progression: [
      [0, 3, 7, 10],
      [0, 3, 7, 10],
      [5, 8, 12, 15],
      [3, 7, 10, 14],
    ],
    melodyOffsets: [12, 15, 19, 17, 15, 12, 10, 12, 12, 15, 22, 19, 17, 15, 14, 12],
  },
  pat_latin_1: {
    id: 'pat_latin_1',
    name: 'Fuego Dembow',
    genre: 'Latin',
    bpm: 98,
    kick: strToSteps('x...x...x...x...'),
    snare: strToSteps('...x..x....x..x.'),
    hihat: strToSteps('x.x.x.x.x.x.x.x.'),
    openHat: strToSteps('......x.......x.'),
    bass: strToSteps('x..x..x.x..x..x.'),
    arp: strToSteps('x..x..x.x.x..x..'),
    useClap: false,
    rootMidi: 50, // D3
    bassWave: 'square',
    filterCutoff: 1850,
    bassBoost: 1.3,
    progression: [
      [0, 3, 7],
      [8, 12, 15],
      [10, 14, 17],
      [7, 11, 14],
    ],
    melodyOffsets: [12, 15, 19, 15, 17, 14, 10, 14, 12, 15, 22, 19, 17, 15, 13, 12],
  },
  pat_electro_1: {
    id: 'pat_electro_1',
    name: 'Cyber Acid Bass',
    genre: 'Electro',
    bpm: 130,
    kick: strToSteps('x...x...x...x...'),
    snare: strToSteps('....x.......x...'),
    hihat: strToSteps('xxxxxxxxxxxxxxxx'),
    openHat: strToSteps('..x...x...x...x.'),
    bass: strToSteps('xxxxxxxxxxxxxxxx'),
    arp: strToSteps('x.xxx.xxx.xxx.xx'),
    useClap: true,
    rootMidi: 45, // A2
    bassWave: 'sawtooth',
    filterCutoff: 2650,
    bassBoost: 1.5,
    progression: [
      [0, 3, 7],
      [0, 3, 7],
      [5, 8, 12],
      [3, 7, 10],
    ],
    melodyOffsets: [12, 12, 24, 12, 15, 12, 22, 19, 12, 12, 24, 15, 17, 19, 22, 24],
  },
  pat_rock_1: {
    id: 'pat_rock_1',
    name: 'Electric Rebel',
    genre: 'Rock',
    bpm: 138,
    kick: strToSteps('x...x.x.x...x...'),
    snare: strToSteps('....x.......x...'),
    hihat: strToSteps('x.x.x.x.x.x.x.x.'),
    openHat: strToSteps('............x...'),
    bass: strToSteps('x.x.x.x.x.x.x.x.'),
    arp: strToSteps('x.x.x.x.x.x.x.x.'),
    useClap: false,
    rootMidi: 45, // A2
    bassWave: 'square',
    filterCutoff: 2350,
    bassBoost: 1.35,
    progression: [
      [0, 7, 12],
      [5, 12, 17],
      [3, 10, 15],
      [7, 14, 19],
    ],
    melodyOffsets: [12, 12, 15, 17, 19, 19, 17, 15, 12, 12, 15, 17, 22, 19, 17, 15],
  },
};

export const INITIAL_CLUB_SONGS: ClubSongTrack[] = [
  // Pop
  {
    id: 'pop_1',
    title: 'Neon Heartbeat',
    artist: 'Stella Vox',
    vibeDesc: 'Upbeat club anthem',
    genre: 'Pop',
    bpm: 124,
    durationSec: 207,
    bonus: '+20% Drink Speed',
    accentColor: '#ff4fa0',
    secondaryColor: '#9b2cff',
    unlockLevel: 1,
    patternId: 'pat_pop_1',
  },
  {
    id: 'pop_2',
    title: 'Glitter Rush',
    artist: 'Lady Glitter',
    vibeDesc: 'Bouncy electro-pop',
    genre: 'Pop',
    bpm: 120,
    durationSec: 160,
    bonus: '+25% Dancer Hype',
    accentColor: '#ff4fa0',
    secondaryColor: '#9b2cff',
    unlockLevel: 1,
    patternId: 'pat_pop_2',
  },
  // Dance
  {
    id: 'dance_1',
    title: 'Laser Floor',
    artist: 'DJ Komet',
    vibeDesc: 'Peak-time EDM banger',
    genre: 'Dance',
    bpm: 128,
    durationSec: 237,
    bonus: '+30% Dance Hype',
    accentColor: '#19b8ff',
    secondaryColor: '#1a4fff',
    unlockLevel: 1,
    patternId: 'pat_dance_1',
  },
  {
    id: 'dance_2',
    title: 'Sunrise Rave',
    artist: 'Nova Starling',
    vibeDesc: 'Euphoric progressive house',
    genre: 'Dance',
    bpm: 132,
    durationSec: 208,
    bonus: '+35% Party Vibe',
    accentColor: '#19b8ff',
    secondaryColor: '#1a4fff',
    unlockLevel: 1,
    patternId: 'pat_dance_2',
  },
  // Hip Hop
  {
    id: 'hiphop_1',
    title: 'Velvet Rope',
    artist: 'MC Thunderbolt',
    vibeDesc: 'Hard club 808 bounce',
    genre: 'Hip Hop',
    bpm: 94,
    durationSec: 172,
    bonus: '+35% VIP Tips',
    accentColor: '#f2b600',
    secondaryColor: '#a35a00',
    unlockLevel: 1,
    patternId: 'pat_hiphop_1',
  },
  // Latin
  {
    id: 'latin_1',
    title: 'Fuego Nights',
    artist: 'Rico Suave Jr.',
    vibeDesc: 'Reggaeton dembow party',
    genre: 'Latin',
    bpm: 98,
    durationSec: 178,
    bonus: '+25% Bar Tips',
    accentColor: '#ff7b2a',
    secondaryColor: '#c21d3a',
    unlockLevel: 1,
    patternId: 'pat_latin_1',
  },
  // Electro
  {
    id: 'electro_1',
    title: 'Neon Bass Odyssey',
    artist: 'DJ Daft Nova',
    vibeDesc: 'Cyber electro acid bass',
    genre: 'Electro',
    bpm: 130,
    durationSec: 215,
    bonus: '+40% Laser Hype',
    accentColor: '#2fcf76',
    secondaryColor: '#0b6e5a',
    unlockLevel: 1,
    patternId: 'pat_electro_1',
  },
  // Rock
  {
    id: 'rock_1',
    title: 'Electric Rebel',
    artist: 'Aurora Blaze',
    vibeDesc: 'High-voltage stadium synth-rock',
    genre: 'Rock',
    bpm: 138,
    durationSec: 194,
    bonus: '+35% Crowd Energy',
    accentColor: '#ff3b3b',
    secondaryColor: '#4a0b16',
    unlockLevel: 1,
    patternId: 'pat_rock_1',
  },
];

function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  public isMuted: boolean = false;
  private isPaused: boolean = false;
  private bpm: number = 124;
  private step: number = 0;
  private dropStepsRemaining: number = 0;
  private activePattern: BeatPattern = { ...PRESET_BEAT_PATTERNS.pat_pop_1 };
  private stepListeners: Set<(step: number) => void> = new Set();
  private stateListeners: Set<(running: boolean) => void> = new Set();
  private customAudioEl: HTMLAudioElement | null = null;
  private activeCustomAudioUrl: string | null = null;
  private hasUnlockedHardware: boolean = false;
  private externalStreamActive: boolean = false;
  private volumeLevel: number = 0.88;

  // Dynamic Ambient Crowd Layer (Crowd Murmur, Laughter & Glass Clinking scaled by guest count)
  private crowdGuestCount: number = 8;
  private crowdMaxGuests: number = 18;
  private crowdHypeTier: number = 2;
  private ambientMurmurBuffer: AudioBuffer | null = null;
  private ambientMurmurSource: AudioBufferSourceNode | null = null;
  private ambientMurmurGain: GainNode | null = null;
  private ambientLowFilter: BiquadFilterType | null = null;
  private ambientFormantFilterA: BiquadFilterNode | null = null;
  private ambientFormantFilterB: BiquadFilterNode | null = null;
  private ambientLfoOsc: OscillatorNode | null = null;
  private lastAmbientClinkTime: number = 0;
  private lastAmbientLaughTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const handleUserGesture = () => {
        this.unlockAudio();
      };
      const events = ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'click', 'keydown'];
      events.forEach((evt) => {
        window.addEventListener(evt, handleUserGesture, { passive: true, capture: true });
      });
    }
  }

  private initContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -12;
        comp.knee.value = 14;
        comp.ratio.value = 4;
        comp.attack.value = 0.003;
        comp.release.value = 0.18;

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 0.88;
        this.masterGain.connect(comp);
        comp.connect(this.ctx.destination);

        // Pre-build 1-second white noise buffer for crisp snares, claps & hi-hats
        const len = this.ctx.sampleRate;
        this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        // Pre-build 3-second pink-filtered warm room murmur loop buffer with natural envelope undulations
        const murmurLen = this.ctx.sampleRate * 3;
        this.ambientMurmurBuffer = this.ctx.createBuffer(1, murmurLen, this.ctx.sampleRate);
        const murmurData = this.ambientMurmurBuffer.getChannelData(0);
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        for (let i = 0; i < murmurLen; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + white * 0.099046;
          b1 = 0.963 * b1 + white * 0.2965164;
          b2 = 0.57 * b2 + white * 1.0526913;
          const pink = (b0 + b1 + b2 + white * 0.1848) * 0.14;
          // Smooth conversational syllables modulation so the loop sounds like overlapping voices
          const phase = (i / murmurLen) * Math.PI * 2;
          const envMod =
            0.72 +
            0.16 * Math.sin(phase * 5) +
            0.12 * Math.cos(phase * 11 + 0.8);
          murmurData[i] = pink * envMod;
        }

        this.ctx.onstatechange = () => {
          const running = this.ctx?.state === 'running';
          this.stateListeners.forEach((cb) => cb(Boolean(running)));
          if (running) {
            this.syncAmbientMurmurGraph();
          }
        };
      }
    }
    return this.ctx;
  }

  /**
   * Ensures the continuous dual-formant crowd murmur bed is running and blends its gain/filter
   * dynamically based on the current number of guests inside the club.
   */
  private syncAmbientMurmurGraph() {
    if (!this.ctx || !this.ambientMurmurBuffer) return;

    if (!this.ambientMurmurSource) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = this.ambientMurmurBuffer;
        src.loop = true;

        // Formant A: Warm lower vocal chest murmur (340 Hz - 520 Hz)
        const filterA = this.ctx.createBiquadFilter();
        filterA.type = 'bandpass';
        filterA.frequency.value = 420;
        filterA.Q.value = 1.6;

        // Formant B: Upper conversational chatter presence (950 Hz - 1650 Hz)
        const filterB = this.ctx.createBiquadFilter();
        filterB.type = 'bandpass';
        filterB.frequency.value = 1180;
        filterB.Q.value = 2.1;

        // Slow LFO modulating Formant B so the crowd chatter breathes organically
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.37;
        lfoGain.gain.value = 240;
        lfo.connect(lfoGain);
        lfoGain.connect(filterB.frequency);

        const murmurGain = this.ctx.createGain();
        murmurGain.gain.value = 0.0001;

        src.connect(filterA);
        src.connect(filterB);
        filterA.connect(murmurGain);
        filterB.connect(murmurGain);
        murmurGain.connect(this.getOutNode(this.ctx));

        src.start(0);
        lfo.start(0);

        this.ambientMurmurSource = src;
        this.ambientFormantFilterA = filterA;
        this.ambientFormantFilterB = filterB;
        this.ambientMurmurGain = murmurGain;
        this.ambientLfoOsc = lfo;
        this.ambientLowFilter = 'bandpass';
      } catch {
        // Ignore if context is not ready yet
      }
    }

    if (this.ambientMurmurGain && this.ctx.state === 'running') {
      const now = this.ctx.currentTime;
      if (this.isMuted || this.isPaused || this.crowdGuestCount <= 0) {
        this.ambientMurmurGain.gain.setTargetAtTime(0.0001, now, 0.25);
        return;
      }

      const density = Math.max(0, Math.min(1.25, this.crowdGuestCount / Math.max(1, this.crowdMaxGuests)));
      // Smooth non-linear curve: a few guests create a subtle lounge murmur; a packed floor creates a rich club buzz
      const hypeBoost = 1 + (this.crowdHypeTier - 1) * 0.14;
      const targetGain = Math.min(0.11, (0.012 + Math.pow(density, 0.85) * 0.068) * hypeBoost);
      this.ambientMurmurGain.gain.setTargetAtTime(targetGain, now, 0.35);

      if (this.ambientFormantFilterA && this.ambientFormantFilterB) {
        // Brighten vocal formant frequencies as the crowd grows and gets more hyped
        this.ambientFormantFilterA.frequency.setTargetAtTime(360 + density * 140, now, 0.4);
        this.ambientFormantFilterB.frequency.setTargetAtTime(1020 + density * 460, now, 0.4);
      }
    }
  }

  /**
   * Updates the live club guest count & capacity to dynamically blend ambient crowd noise,
   * laughter frequency, and glass clinking density.
   */
  public updateCrowdAmbience(guestCount: number, maxGuests: number = 18, hypeTier: number = 2) {
    this.crowdGuestCount = Math.max(0, guestCount);
    this.crowdMaxGuests = Math.max(1, maxGuests);
    this.crowdHypeTier = Math.max(1, Math.min(3, hypeTier));
    this.syncAmbientMurmurGraph();
  }

  /**
   * Synthesizes a crystal cocktail/champagne glass clink using high-Q inharmonic bell partials
   * and optional stereo panning.
   */
  public playAmbientGlassClink(intensityScale: number = 1) {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running' || this.isPaused) return;

    const now = ctx.currentTime;
    const out = this.getOutNode(ctx);

    // Optional stereo placement across the bar & VIP tables
    let destNode: AudioNode = out;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime((Math.random() - 0.5) * 1.3, now);
      panner.connect(out);
      destNode = panner;
    }

    // Two crystal glasses clinking (primary tap + subtle secondary contact 55-85ms later)
    const baseFreq = 2200 + Math.random() * 780;
    const taps = Math.random() < 0.65 ? [0, 0.055 + Math.random() * 0.035] : [0];
    const partials = [1, 1.58, 2.41];

    taps.forEach((tapOffset, tapIdx) => {
      const tapTime = now + tapOffset;
      const tapVel = (tapIdx === 0 ? 1 : 0.62) * Math.min(1.3, Math.max(0.35, intensityScale));
      partials.forEach((ratio, pIdx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = pIdx === 0 ? 'sine' : 'triangle';
        // Slight pitch shift on second tap for two distinct glasses
        const glassShift = tapIdx === 1 ? 1.045 : 1.0;
        osc.frequency.setValueAtTime(baseFreq * ratio * glassShift, tapTime);

        const peak = (0.042 / (pIdx + 1)) * tapVel;
        const decay = (0.16 / (pIdx * 0.7 + 1)) * (tapIdx === 0 ? 1 : 0.85);
        this.env(gain, tapTime, 0.0015, decay, peak);

        osc.connect(gain);
        gain.connect(destNode);
        osc.start(tapTime);
        osc.stop(tapTime + decay + 0.02);
      });
    });
  }

  /**
   * Synthesizes an organic burst of patron laughter or cheerful club chatter using rhythmic
   * pitch-inflected vocal formant syllables (F1 + F2 bandpass filters).
   */
  public playAmbientLaughter(intensityScale: number = 1) {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running' || this.isPaused || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const out = this.getOutNode(ctx);

    let destNode: AudioNode = out;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime((Math.random() - 0.5) * 1.4, now);
      panner.connect(out);
      destNode = panner;
    }

    // Choose vocal register (higher soprano/alto laugh or warm tenor chuckle)
    const isHighVoice = Math.random() < 0.58;
    const basePitch = isHighVoice ? 310 + Math.random() * 95 : 185 + Math.random() * 65;
    const syllableCount = 3 + Math.floor(Math.random() * 3); // 3 to 5 "ha-ha-ha" syllables
    const syllableGap = 0.095 + Math.random() * 0.025;

    // Formant filters for human vowel "ah / eh" laugh timbre
    const formant1 = ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(isHighVoice ? 780 : 640, now);
    formant1.Q.setValueAtTime(3.2, now);

    const formant2 = ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(isHighVoice ? 1620 : 1320, now);
    formant2.Q.setValueAtTime(3.8, now);

    formant1.connect(destNode);
    formant2.connect(destNode);

    for (let i = 0; i < syllableCount; i++) {
      const t = now + i * syllableGap;
      const sylDur = 0.072;
      // Natural descending pitch contour across laughter syllables
      const sylPitch = basePitch * Math.pow(0.95, i) * (i === 0 ? 1.06 : 1.0);
      const sylPeak =
        0.048 *
        Math.min(1.25, Math.max(0.4, intensityScale)) *
        (1 - i * 0.14);

      // Glottal vocal cord pulse
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(sylPitch * 1.08, t);
      osc.frequency.exponentialRampToValueAtTime(sylPitch * 0.86, t + sylDur);
      this.env(oscGain, t, 0.008, sylDur, sylPeak);

      osc.connect(oscGain);
      oscGain.connect(formant1);
      oscGain.connect(formant2);
      osc.start(t);
      osc.stop(t + sylDur + 0.015);

      // Breathy aspiration layer ("h-ha")
      const breathSrc = ctx.createBufferSource();
      breathSrc.buffer = this.noiseBuffer;
      const breathGain = ctx.createGain();
      this.env(breathGain, t, 0.004, sylDur * 0.75, sylPeak * 0.55);
      breathSrc.connect(breathGain);
      breathGain.connect(formant2);
      breathSrc.start(t);
      breathSrc.stop(t + sylDur);
    }
  }

  /**
   * Triggers subtle procedural glass clinks and laughter bursts on beat steps
   * with probability and volume proportional to the live number of guests in the club.
   */
  private tickAmbientCrowdEvents(stepIdx: number) {
    if (this.isMuted || this.isPaused || this.crowdGuestCount <= 0) return;
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;

    this.syncAmbientMurmurGraph();

    const now = ctx.currentTime;
    const density = Math.max(0.05, Math.min(1.25, this.crowdGuestCount / Math.max(1, this.crowdMaxGuests)));

    // 1. Glass Clinking at the Bar & VIP Tables: scales with guest count (minimum 1.1s cooldown)
    if (now - this.lastAmbientClinkTime > 1.1) {
      const clinkChance = 0.018 + density * 0.075;
      if (Math.random() < clinkChance) {
        this.lastAmbientClinkTime = now;
        this.playAmbientGlassClink(0.55 + density * 0.55);
      }
    }

    // 2. Patron Laughter & Cheer Bursts: scales with guest count & hype tier (minimum 2.0s cooldown)
    if (stepIdx % 2 === 0 && now - this.lastAmbientLaughTime > 2.0) {
      const hypeFactor = 0.85 + this.crowdHypeTier * 0.22;
      const laughChance = (0.014 + density * 0.065) * hypeFactor;
      if (Math.random() < laughChance) {
        this.lastAmbientLaughTime = now;
        this.playAmbientLaughter(0.55 + density * 0.55);
      }
    }
  }

  /**
   * Unlocks Web Audio API on user gesture (required by iOS/iPad Safari & Chrome autoplay policy)
   */
  public unlockAudio() {
    const ctx = this.initContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.stateListeners.forEach((cb) => cb(ctx.state === 'running'));
        this.syncAmbientMurmurGraph();
      }).catch(() => {});
    }

    if (!this.hasUnlockedHardware && ctx.state === 'running') {
      try {
        // Play a 1-frame silent buffer to unlock iOS/iPad hardware audio output
        const silentBuf = ctx.createBuffer(1, 1, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = silentBuf;
        src.connect(ctx.destination);
        src.start(0);
        this.hasUnlockedHardware = true;
        this.stateListeners.forEach((cb) => cb(true));
      } catch {
        // Ignore
      }
    }

    this.syncAmbientMurmurGraph();

    if (this.customAudioEl && this.activeCustomAudioUrl && !this.isPaused && !this.isMuted) {
      if (this.customAudioEl.paused) {
        this.customAudioEl.play().catch(() => {});
      }
    }
  }

  public isAudioRunning(): boolean {
    return Boolean(this.ctx && this.ctx.state === 'running');
  }

  public subscribeAudioState(listener: (running: boolean) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.isAudioRunning());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    const ctx = this.initContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  private getOutNode(ctx: AudioContext): AudioNode {
    return this.masterGain || ctx.destination;
  }

  public subscribeStep(listener: (step: number) => void): () => void {
    this.stepListeners.add(listener);
    return () => {
      this.stepListeners.delete(listener);
    };
  }

  public getCurrentStep(): number {
    return this.step % 16;
  }

  public getActivePattern(): BeatPattern {
    return this.activePattern;
  }

  public setActivePattern(pattern: BeatPattern) {
    this.activePattern = {
      ...pattern,
      kick: [...pattern.kick],
      snare: [...pattern.snare],
      hihat: [...pattern.hihat],
      openHat: [...pattern.openHat],
      bass: [...pattern.bass],
      arp: [...pattern.arp],
    };
    this.bpm = pattern.bpm;
  }

  public setCustomAudioUrl(url: string | null) {
    if (this.activeCustomAudioUrl === url) return;
    this.activeCustomAudioUrl = url;
    if (!url) {
      if (this.customAudioEl) {
        this.customAudioEl.pause();
        this.customAudioEl.src = '';
      }
      return;
    }
    if (typeof window !== 'undefined') {
      if (!this.customAudioEl) {
        this.customAudioEl = new Audio();
        this.customAudioEl.loop = true;
      }
      this.customAudioEl.src = url;
      this.customAudioEl.volume = this.isMuted ? 0 : 0.9;
      if (!this.isMuted && !this.isPaused) {
        this.customAudioEl.play().catch(() => {});
      }
    }
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    this.syncAmbientMurmurGraph();
    if (this.customAudioEl && this.activeCustomAudioUrl) {
      if (paused || this.isMuted) {
        this.customAudioEl.pause();
      } else {
        this.customAudioEl.play().catch(() => {});
      }
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volumeLevel, this.ctx.currentTime);
    }
    this.syncAmbientMurmurGraph();
    if (this.customAudioEl) {
      this.customAudioEl.volume = muted ? 0 : Math.min(1, this.volumeLevel);
    }
  }

  public setVolume(vol: number) {
    this.volumeLevel = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volumeLevel, this.ctx.currentTime);
    }
    if (this.customAudioEl && !this.isMuted) {
      this.customAudioEl.volume = this.volumeLevel;
    }
  }

  public setExternalStreamActive(active: boolean) {
    this.externalStreamActive = active;
    if (active && this.customAudioEl) {
      this.customAudioEl.pause();
    }
  }

  public isExternalStreamActive(): boolean {
    return this.externalStreamActive;
  }

  private env(gainNode: GainNode, t: number, attack: number, decay: number, peak: number) {
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(Math.max(0.001, peak), t + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private playKick(ctx: AudioContext, t: number, big: boolean, boost: number) {
    const out = this.getOutNode(ctx);

    // 1. Deep punchy sub-bass drum body
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(big ? 165 : 155, t);
    osc.frequency.exponentialRampToValueAtTime(big ? 42 : 48, t + 0.12);
    this.env(gain, t, 0.002, big ? 0.25 : 0.19, Math.min(1.0, (big ? 0.78 : 0.64) * boost));
    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + (big ? 0.28 : 0.21));

    // 2. Mid-range beater click transient (audible on all tablet/laptop/phone speakers)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(320, t);
    clickOsc.frequency.exponentialRampToValueAtTime(75, t + 0.045);
    this.env(clickGain, t, 0.001, 0.045, 0.36 * boost);
    clickOsc.connect(clickGain);
    clickGain.connect(out);
    clickOsc.start(t);
    clickOsc.stop(t + 0.05);
  }

  private playNoiseHit(
    ctx: AudioContext,
    t: number,
    dur: number,
    filterType: BiquadFilterType,
    freq: number,
    peak: number
  ) {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, t);
    const gain = ctx.createGain();
    this.env(gain, t, 0.002, dur, peak);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutNode(ctx));
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private playSnareOrClap(ctx: AudioContext, t: number, useClap: boolean) {
    if (useClap) {
      for (let i = 0; i < 3; i++) {
        this.playNoiseHit(ctx, t + i * 0.011, 0.13, 'bandpass', 1450, 0.38);
      }
    } else {
      this.playNoiseHit(ctx, t, 0.16, 'highpass', 1400, 0.42);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(210, t);
      osc.frequency.exponentialRampToValueAtTime(105, t + 0.09);
      this.env(gain, t, 0.002, 0.11, 0.34);
      osc.connect(gain);
      gain.connect(this.getOutNode(ctx));
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  private playSynthTone(
    ctx: AudioContext,
    t: number,
    freq: number,
    dur: number,
    wave: SynthWaveType,
    peak: number,
    cutoff: number,
    detuneCents: number = 0
  ) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    if (detuneCents !== 0) {
      osc.detune.setValueAtTime(detuneCents, t);
    }
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(6000, cutoff * 1.35), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(180, cutoff * 0.65), t + dur);
    filter.Q.setValueAtTime(2.8, t);
    this.env(gain, t, 0.004, dur, peak);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutNode(ctx));
    osc.start(t);
    osc.stop(t + dur + 0.025);
  }

  /**
   * Advances one 16th-note step in the club beat sequencer
   */
  public playBeatStep(hypeTier: number = 2) {
    const stepIdx = this.step % 16;
    const barIdx = Math.floor(this.step / 16);
    this.step = (this.step + 1) % 64;

    // Notify UI step sequencer LED playhead
    this.stepListeners.forEach((cb) => cb(stepIdx));

    // Dynamic Ambient Crowd Layer (murmur, laughter, and glass clinking) stays active across all music sources
    this.crowdHypeTier = Math.max(1, Math.min(3, hypeTier));
    this.tickAmbientCrowdEvents(stepIdx);

    // If an external streaming service (YouTube / Spotify / Apple Music) or uploaded song is actively playing,
    // keep the 16-step beat clock running for dance floor lights & chibi dancers while muting internal synth notes
    if (this.externalStreamActive) {
      return;
    }
    if (this.activeCustomAudioUrl && this.customAudioEl && !this.customAudioEl.paused) {
      return;
    }

    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const p = this.activePattern;
    const stepDur = 60 / Math.max(60, this.bpm) / 4;
    const chord = p.progression[barIdx % p.progression.length] || [0, 4, 7];
    const isDrop = this.dropStepsRemaining > 0;
    if (this.dropStepsRemaining > 0) {
      this.dropStepsRemaining--;
    }

    // 1. Kick Drum
    if (p.kick[stepIdx] || (isDrop && stepIdx % 4 === 0)) {
      this.playKick(ctx, now, isDrop, p.bassBoost);
    }

    // 2. Snare / Clap
    if (p.snare[stepIdx]) {
      this.playSnareOrClap(ctx, now, p.useClap);
    }

    // 3. Closed Hi-Hat
    if (p.hihat[stepIdx]) {
      this.playNoiseHit(ctx, now, 0.04, 'highpass', 7000, 0.18);
    }

    // 4. Open Hi-Hat
    if (p.openHat[stepIdx]) {
      this.playNoiseHit(ctx, now, 0.17, 'highpass', 5800, 0.18);
    }

    // 5. Punchy 2-Octave Club Bassline (audible on both subwoofers & laptop/tablet speakers)
    if (p.bass[stepIdx]) {
      const interval = chord[0] + (stepIdx % 8 === 4 ? 7 : 0);
      const midBassMidi = p.rootMidi + interval;
      const subBassMidi = midBassMidi - 12;
      const bassPeak = Math.min(0.55, 0.32 * p.bassBoost);
      const bassCutoff = isDrop ? Math.min(3800, p.filterCutoff * 1.55) : Math.max(650, p.filterCutoff * 0.9);

      // Upper-bass harmonic layer (110Hz - 220Hz range for clear speaker presence)
      this.playSynthTone(
        ctx,
        now,
        mtof(midBassMidi),
        stepDur * 1.4,
        p.bassWave === 'sine' ? 'triangle' : p.bassWave,
        bassPeak,
        bassCutoff
      );
      // Deep sub-bass layer
      this.playSynthTone(
        ctx,
        now,
        mtof(subBassMidi),
        stepDur * 1.45,
        'sine',
        Math.min(0.5, 0.28 * p.bassBoost),
        420
      );
    }

    // 6. Melodic Supersaw Lead Hook & Pulsing Club Chords
    if (p.arp[stepIdx]) {
      const melodyTable = p.melodyOffsets || [12, 15, 19, 24, 19, 15, 17, 14, 12, 15, 19, 22, 19, 15, 14, 12];
      const hookOffset = melodyTable[stepIdx % melodyTable.length];
      const barRootShift = chord[0];
      const leadMidi =
        p.rootMidi +
        barRootShift +
        hookOffset +
        (hypeTier >= 3 && stepIdx % 4 === 2 ? 12 : 0);
      const leadFreq = mtof(leadMidi);
      const leadCutoff = Math.min(4500, p.filterCutoff * 1.75);

      // Detuned dual-oscillator synth lead for rich stereo-like club presence
      this.playSynthTone(ctx, now, leadFreq, stepDur * 0.95, 'sawtooth', 0.20, leadCutoff, -10);
      this.playSynthTone(ctx, now, leadFreq, stepDur * 0.95, 'square', 0.14, leadCutoff, 10);
    }

    // 7. Rhythmic Club Chord Stabs on beats (steps 0, 4, 8, 12 or off-beat house pumping on 2, 6, 10, 14)
    if (stepIdx % 4 === 0 || stepIdx % 4 === 2) {
      const isOffbeat = stepIdx % 4 === 2;
      const chordPeak = isOffbeat ? 0.12 : 0.09;
      for (const cInt of chord) {
        this.playSynthTone(
          ctx,
          now,
          mtof(p.rootMidi + 12 + cInt),
          stepDur * (isOffbeat ? 1.35 : 1.8),
          'triangle',
          chordPeak,
          Math.max(1200, p.filterCutoff * 1.15)
        );
      }
    }
  }

  /**
   * Triggers a sweeping white-noise synth riser + heavy sub-bass drop!
   */
  public triggerBassDrop() {
    this.unlockAudio();
    this.dropStepsRemaining = 16;
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(3.5, t);
      filter.frequency.setValueAtTime(240, t);
      filter.frequency.exponentialRampToValueAtTime(3400, t + 0.65);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.exponentialRampToValueAtTime(0.45, t + 0.58);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.getOutNode(ctx));
      src.start(t);
      src.stop(t + 0.75);
    }

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t + 0.65);
    osc.frequency.exponentialRampToValueAtTime(34, t + 1.65);
    this.env(og, t + 0.65, 0.01, 1.0, 0.9);
    osc.connect(og);
    og.connect(this.getOutNode(ctx));
    osc.start(t + 0.65);
    osc.stop(t + 1.7);
  }

  /**
   * Preview a single drum/synth channel when clicked in the Custom Beat Sequencer
   */
  public previewChannelHit(channel: 'kick' | 'snare' | 'hihat' | 'openHat' | 'bass' | 'arp') {
    this.unlockAudio();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const p = this.activePattern;
    if (channel === 'kick') this.playKick(ctx, now, false, p.bassBoost);
    else if (channel === 'snare') this.playSnareOrClap(ctx, now, p.useClap);
    else if (channel === 'hihat') this.playNoiseHit(ctx, now, 0.04, 'highpass', 7000, 0.25);
    else if (channel === 'openHat') this.playNoiseHit(ctx, now, 0.17, 'highpass', 5800, 0.25);
    else if (channel === 'bass')
      this.playSynthTone(ctx, now, mtof(p.rootMidi), 0.22, p.bassWave, 0.42, p.filterCutoff * 1.2);
    else if (channel === 'arp')
      this.playSynthTone(ctx, now, mtof(p.rootMidi + 12), 0.18, 'sawtooth', 0.28, p.filterCutoff * 1.6);
  }

  public playBeatPulse(hypeTier: number = 1) {
    this.playBeatStep(hypeTier);
  }

  public playPlaceItem() {
    this.unlockAudio();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.09);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.getOutNode(ctx));
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playCashRegister() {
    this.unlockAudio();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [987.77, 1318.51]; // B5 -> E6 coin chime
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      gain.gain.setValueAtTime(0.22, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.14);
      osc.connect(gain);
      gain.connect(this.getOutNode(ctx));
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.15);
    });
  }

  public playUpgradeFanfare() {
    this.unlockAudio();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.18, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(this.getOutNode(ctx));
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.26);
    });
  }

  public playError() {
    this.unlockAudio();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(115, now + 0.15);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.getOutNode(ctx));
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playClick() {
    this.unlockAudio();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.getOutNode(ctx));
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public setBpm(newBpm: number) {
    this.bpm = newBpm;
    this.activePattern.bpm = newBpm;
  }

  public getBpm(): number {
    return this.bpm;
  }
}

export const soundEngine = new SoundEngine();
