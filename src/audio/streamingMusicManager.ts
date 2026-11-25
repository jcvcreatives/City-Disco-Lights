// Unified External Streaming Hub (YouTube IFrame API, Spotify Web Playback SDK + PKCE + Embed, Apple MusicKit JS v3 + Embed)
// & Unified ClubAudioController wrapping Synth, Uploaded MP3/WAV, YouTube, Spotify, and Apple Music

import { ClubSongTrack, soundEngine } from './soundEngine';

export type StreamingServiceType = 'YOUTUBE' | 'SPOTIFY' | 'APPLE';

export interface ExternalStreamingTrack {
  id: string;
  service: StreamingServiceType;
  externalId: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  thumbnailUrl: string;
  embedUrl?: string;
  isPlaylist?: boolean;
}

export interface StreamingStateSnapshot {
  activeService: 'SYNTH' | 'UPLOAD' | StreamingServiceType;
  activeExternalTrack: ExternalStreamingTrack | null;
  isPlaying: boolean;
  volume: number;
  toastMessage: string | null;
  // YouTube state
  ytReady: boolean;
  ytMinimized: boolean;
  // Spotify state
  spotifyConnected: boolean;
  spotifyIsPremium: boolean;
  spotifyUserName: string | null;
  spotifyDeviceId: string | null;
  spotifyPlaylists: ExternalStreamingTrack[];
  spotifySearchResults: ExternalStreamingTrack[];
  // Apple Music state
  appleConnected: boolean;
  appleConfigured: boolean;
  applePlaylists: ExternalStreamingTrack[];
  appleSearchResults: ExternalStreamingTrack[];
}

// 6 Curated Embeddable 24/7 Club & Electronic YouTube Mixes (Playable with 1 Click, No API Key Needed)
export const CURATED_YOUTUBE_MIXES: ExternalStreamingTrack[] = [
  {
    id: 'yt_synthwave_radio',
    service: 'YOUTUBE',
    externalId: '4xDzrJKXOOY',
    title: 'Synthwave Radio — ChillSynth / Retro Electro Mix',
    artist: 'Lofi Girl Synthwave',
    genre: 'Electro',
    bpm: 124,
    thumbnailUrl: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
  },
  {
    id: 'yt_lofi_girl',
    service: 'YOUTUBE',
    externalId: 'jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio — Late Night Lounge Beats',
    artist: 'Lofi Girl 24/7 Live',
    genre: 'Hip Hop',
    bpm: 94,
    thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
  },
  {
    id: 'yt_chillhop_radio',
    service: 'YOUTUBE',
    externalId: '5yx6BWlEVcY',
    title: 'Chillhop Radio — Jazzy & Funky Rooftop Groove',
    artist: 'Chillhop Music',
    genre: 'Hip Hop',
    bpm: 98,
    thumbnailUrl: 'https://i.ytimg.com/vi/5yx6BWlEVcY/hqdefault.jpg',
  },
  {
    id: 'yt_ncs_arcade',
    service: 'YOUTUBE',
    externalId: '2tPg2M_a72w',
    title: 'NCS 24/7 Electronic Dance & Bass Club Stream',
    artist: 'NoCopyrightSounds',
    genre: 'Dance',
    bpm: 128,
    thumbnailUrl: 'https://i.ytimg.com/vi/2tPg2M_a72w/hqdefault.jpg',
  },
  {
    id: 'yt_house_sunset',
    service: 'YOUTUBE',
    externalId: '36YnV9STBqc',
    title: 'The Good Life Radio — Deep House & Ibiza Club Mix',
    artist: 'Sensual Musique',
    genre: 'Dance',
    bpm: 124,
    thumbnailUrl: 'https://i.ytimg.com/vi/36YnV9STBqc/hqdefault.jpg',
  },
  {
    id: 'yt_nightride_fm',
    service: 'YOUTUBE',
    externalId: 'UedTcufyrHc',
    title: 'Nightride FM — Cyberpunk & Darksynth Club Stream',
    artist: 'Nightride FM',
    genre: 'Electro',
    bpm: 130,
    thumbnailUrl: 'https://i.ytimg.com/vi/UedTcufyrHc/hqdefault.jpg',
  },
];

// Curated Spotify Club Tracks & Playlists (Works via Web Playback SDK or Official Spotify Embed Player)
export const CURATED_SPOTIFY_TRACKS: ExternalStreamingTrack[] = [
  {
    id: 'sp_one_more_time',
    service: 'SPOTIFY',
    externalId: '0DiWol3AO6WpXZgp0goxAV',
    title: 'One More Time',
    artist: 'Daft Punk',
    genre: 'Dance',
    bpm: 123,
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160&auto=format&fit=crop&q=80',
    embedUrl: 'https://open.spotify.com/embed/track/0DiWol3AO6WpXZgp0goxAV?utm_source=generator&theme=0',
  },
  {
    id: 'sp_blinding_lights',
    service: 'SPOTIFY',
    externalId: '0VjIjW4GlUZAMYd2vXMi3b',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    genre: 'Pop',
    bpm: 171,
    thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=160&auto=format&fit=crop&q=80',
    embedUrl: 'https://open.spotify.com/embed/track/0VjIjW4GlUZAMYd2vXMi3b?utm_source=generator&theme=0',
  },
  {
    id: 'sp_titanium',
    service: 'SPOTIFY',
    externalId: '0lHAMNU8RGiIObScrsRgmP',
    title: 'Titanium (feat. Sia)',
    artist: 'David Guetta, Sia',
    genre: 'Dance',
    bpm: 126,
    thumbnailUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=160&auto=format&fit=crop&q=80',
    embedUrl: 'https://open.spotify.com/embed/track/0lHAMNU8RGiIObScrsRgmP?utm_source=generator&theme=0',
  },
  {
    id: 'sp_levels',
    service: 'SPOTIFY',
    externalId: '5UqCQaDshqbIk3pkhy4Pjg',
    title: 'Levels — Radio Edit',
    artist: 'Avicii',
    genre: 'Dance',
    bpm: 126,
    thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=160&auto=format&fit=crop&q=80',
    embedUrl: 'https://open.spotify.com/embed/track/5UqCQaDshqbIk3pkhy4Pjg?utm_source=generator&theme=0',
  },
  {
    id: 'sp_mint_playlist',
    service: 'SPOTIFY',
    externalId: '37i9dQZF1DX4dyzvuaRJ0n',
    title: 'mint — Electronic & Club Hits Playlist',
    artist: 'Spotify Club Editorial',
    genre: 'Electro',
    bpm: 128,
    isPlaylist: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=160&auto=format&fit=crop&q=80',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4dyzvuaRJ0n?utm_source=generator&theme=0',
  },
  {
    id: 'sp_baila_reggaeton',
    service: 'SPOTIFY',
    externalId: '37i9dQZF1DWY7IeIP1cdjF',
    title: 'Baila Reggaeton — Latin Club Fever',
    artist: 'Spotify Latin Club',
    genre: 'Latin',
    bpm: 98,
    isPlaylist: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=160&auto=format&fit=crop&q=80',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWY7IeIP1cdjF?utm_source=generator&theme=0',
  },
];

// Curated Apple Music Club Tracks & Playlists (Works via MusicKit JS v3 or Official Apple Music Embed)
export const CURATED_APPLE_MUSIC_TRACKS: ExternalStreamingTrack[] = [
  {
    id: 'am_around_the_world',
    service: 'APPLE',
    externalId: '697195787',
    title: 'Around the World',
    artist: 'Daft Punk',
    genre: 'Dance',
    bpm: 121,
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160&auto=format&fit=crop&q=80',
    embedUrl: 'https://embed.music.apple.com/us/album/around-the-world/697194953?i=697195787&theme=dark',
  },
  {
    id: 'am_strobe_deadmau5',
    service: 'APPLE',
    externalId: '714842149',
    title: 'Strobe (Club Edit)',
    artist: 'deadmau5',
    genre: 'Electro',
    bpm: 128,
    thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=160&auto=format&fit=crop&q=80',
    embedUrl: 'https://embed.music.apple.com/us/album/strobe/714841990?i=714842149&theme=dark',
  },
  {
    id: 'am_dont_start_now',
    service: 'APPLE',
    externalId: '1537464279',
    title: "Don't Start Now",
    artist: 'Dua Lipa',
    genre: 'Pop',
    bpm: 124,
    thumbnailUrl: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=160&auto=format&fit=crop&q=80',
    embedUrl: 'https://embed.music.apple.com/us/album/dont-start-now/1537464277?i=1537464279&theme=dark',
  },
  {
    id: 'am_dance_xl_playlist',
    service: 'APPLE',
    externalId: 'pl.5ee8333dbe944d9f9151e97d92d1ead9',
    title: 'danceXL — Mainstage Club Anthems',
    artist: 'Apple Music Dance',
    genre: 'Dance',
    bpm: 128,
    isPlaylist: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=160&auto=format&fit=crop&q=80',
    embedUrl: 'https://embed.music.apple.com/us/playlist/dancexl/pl.5ee8333dbe944d9f9151e97d92d1ead9?theme=dark',
  },
];

// Helper: Extract YouTube 11-character Video ID from URL or raw string
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) return match[1];
  }
  return null;
}

// Helper: Extract Spotify track or playlist ID from URL or URI
export function extractSpotifyEntity(input: string): { type: 'track' | 'playlist'; id: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/open\.spotify\.com\/(track|playlist)\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return { type: urlMatch[1] as 'track' | 'playlist', id: urlMatch[2] };
  }
  const uriMatch = trimmed.match(/spotify:(track|playlist):([a-zA-Z0-9]+)/);
  if (uriMatch) {
    return { type: uriMatch[1] as 'track' | 'playlist', id: uriMatch[2] };
  }
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
    return { type: 'track', id: trimmed };
  }
  return null;
}

// Helper: Convert any Apple Music URL into an Apple Music Embed URL
export function extractAppleMusicEmbedUrl(input: string): { embedUrl: string; id: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes('music.apple.com')) {
    const embedUrl = trimmed
      .replace('https://music.apple.com', 'https://embed.music.apple.com')
      .replace('http://music.apple.com', 'https://embed.music.apple.com');
    const idMatch = trimmed.match(/[?&]i=(\d+)/) || trimmed.match(/\/(\d+|pl\.[a-zA-Z0-9]+)(?:\?|$)/);
    return {
      embedUrl: embedUrl.includes('theme=') ? embedUrl : `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}theme=dark`,
      id: idMatch ? idMatch[1] : `am_${Date.now()}`,
    };
  }
  if (/^\d+$/.test(trimmed)) {
    return {
      embedUrl: `https://embed.music.apple.com/us/song/${trimmed}?theme=dark`,
      id: trimmed,
    };
  }
  return null;
}

// PKCE Code Verifier & Challenge Helpers for Browser Spotify OAuth 2.0
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join('');
}

async function sha256Base64Url(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
    MusicKit?: {
      configure: (config: {
        developerToken: string;
        app: { name: string; build: string };
      }) => Promise<MusicKitInstance>;
      getInstance: () => MusicKitInstance;
    };
  }
}

interface YTPlayerInstance {
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  setVolume: (volume: number) => void;
  destroy?: () => void;
}

interface SpotifyPlayerInstance {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (payload: Record<string, unknown>) => void) => void;
  togglePlay: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  nextTrack: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
}

interface MusicKitInstance {
  authorize: () => Promise<string>;
  unauthorize: () => Promise<void>;
  isAuthorized: boolean;
  setQueue: (options: Record<string, unknown>) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  skipToNextItem: () => Promise<void>;
  volume: number;
  api?: {
    music: (path: string, params?: Record<string, unknown>) => Promise<{ data?: Record<string, unknown> }>;
  };
}

class StreamingMusicManager {
  private state: StreamingStateSnapshot = {
    activeService: 'SYNTH',
    activeExternalTrack: null,
    isPlaying: true,
    volume: 0.88,
    toastMessage: null,
    ytReady: false,
    ytMinimized: false,
    spotifyConnected: false,
    spotifyIsPremium: false,
    spotifyUserName: null,
    spotifyDeviceId: null,
    spotifyPlaylists: CURATED_SPOTIFY_TRACKS,
    spotifySearchResults: [],
    appleConnected: false,
    appleConfigured: false,
    applePlaylists: CURATED_APPLE_MUSIC_TRACKS,
    appleSearchResults: [],
  };

  private listeners: Set<(snap: StreamingStateSnapshot) => void> = new Set();
  private ytPlayer: YTPlayerInstance | null = null;
  private ytScriptLoaded: boolean = false;
  private ytPendingVideoId: string | null = null;

  private spotifyAccessToken: string | null = null;
  private spotifyPlayer: SpotifyPlayerInstance | null = null;
  private spotifyScriptLoaded: boolean = false;

  private musicKit: MusicKitInstance | null = null;
  private appleScriptLoaded: boolean = false;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  private onTrackSelectedCallback: ((song: ClubSongTrack) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Restore Spotify token if present from PKCE session
      const savedToken = sessionStorage.getItem('neon_nights_spotify_access_token');
      if (savedToken) {
        this.spotifyAccessToken = savedToken;
        this.state.spotifyConnected = true;
        void this.initSpotifyFromToken(savedToken);
      }
      void this.handleSpotifyPKCECallbackIfPresent();
    }
  }

  public setOnTrackSelectedCallback(cb: (song: ClubSongTrack) => void) {
    this.onTrackSelectedCallback = cb;
  }

  public getState(): StreamingStateSnapshot {
    return this.state;
  }

  public subscribe(listener: (snap: StreamingStateSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const snap = { ...this.state };
    this.listeners.forEach((cb) => cb(snap));
  }

  public showToast(msg: string) {
    this.state.toastMessage = msg;
    this.emit();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.state.toastMessage = null;
      this.emit();
    }, 4500);
  }

  public setYtMinimized(minimized: boolean) {
    this.state.ytMinimized = minimized;
    this.emit();
  }

  // ===========================================================================
  // 1. YOUTUBE IFRAME PLAYER API (Works Immediately Without API Keys)
  // ===========================================================================
  public ensureYouTubeApiLoaded(containerId: string = 'neon-nights-yt-player') {
    if (typeof window === 'undefined') return;

    const initPlayer = () => {
      if (this.ytPlayer || !window.YT || !window.YT.Player) return;
      const el = document.getElementById(containerId);
      if (!el) return;

      const initialVid =
        this.ytPendingVideoId ||
        this.state.activeExternalTrack?.externalId ||
        CURATED_YOUTUBE_MIXES[0].externalId;

      this.ytPlayer = new window.YT.Player(containerId, {
        height: '100%',
        width: '100%',
        videoId: initialVid,
        playerVars: {
          autoplay: this.ytPendingVideoId ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (evt) => {
            this.state.ytReady = true;
            evt.target.setVolume(Math.round(this.state.volume * 100));
            if (this.ytPendingVideoId) {
              evt.target.loadVideoById(this.ytPendingVideoId);
              evt.target.playVideo();
              this.ytPendingVideoId = null;
            }
            this.emit();
          },
          onStateChange: (evt) => {
            const PS = window.YT?.PlayerState;
            if (!PS) return;
            if (evt.data === PS.PLAYING) {
              this.state.activeService = 'YOUTUBE';
              this.state.isPlaying = true;
              soundEngine.setExternalStreamActive(true);
              this.emit();
            } else if (evt.data === PS.PAUSED) {
              if (this.state.activeService === 'YOUTUBE') {
                this.state.isPlaying = false;
                this.emit();
              }
            } else if (evt.data === PS.ENDED) {
              // Auto-advance to the next curated YouTube mix
              this.next();
            }
          },
          onError: (evt) => {
            // Codes 100 (not found), 101 / 150 (owner disabled embed playback)
            const code = evt.data;
            this.showToast(
              `YouTube video restricted for embedding (Error ${code}). Skipping to next club mix!`
            );
            this.skipToNextYouTubeMix();
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      initPlayer();
    };

    if (!this.ytScriptLoaded) {
      this.ytScriptLoaded = true;
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  }

  private skipToNextYouTubeMix() {
    const currId = this.state.activeExternalTrack?.externalId;
    const idx = CURATED_YOUTUBE_MIXES.findIndex((m) => m.externalId === currId);
    const nextMix = CURATED_YOUTUBE_MIXES[(idx + 1) % CURATED_YOUTUBE_MIXES.length];
    this.spinExternalTrack(nextMix);
  }

  // ===========================================================================
  // 2. SPOTIFY INTEGRATION (Web Playback SDK + PKCE OAuth + Official Embed Fallback)
  // ===========================================================================
  public getSpotifyClientId(): string {
    const envKey = (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_SPOTIFY_CLIENT_ID;
    const storedKey =
      typeof window !== 'undefined'
        ? localStorage.getItem('neon_nights_spotify_client_id')
        : null;
    return (envKey || storedKey || '').trim();
  }

  public async connectSpotifyPKCE() {
    const clientId = this.getSpotifyClientId();
    if (!clientId) {
      this.showToast(
        'Spotify Embed Turntable Active! Pick any track below or paste a Spotify link to spin immediately.'
      );
      return;
    }

    const verifier = generateRandomString(64);
    const challenge = await sha256Base64Url(verifier);
    sessionStorage.setItem('neon_nights_spotify_pkce_verifier', verifier);

    const redirectUri = window.location.origin + window.location.pathname;
    const scopes = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
      'user-modify-playback-state',
      'playlist-read-private',
      'user-library-read',
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: scopes,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      redirect_uri: redirectUri,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  private async handleSpotifyPKCECallbackIfPresent() {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const verifier = sessionStorage.getItem('neon_nights_spotify_pkce_verifier');
    const clientId = this.getSpotifyClientId();

    if (!code || !verifier || !clientId) return;

    // Clean code from address bar
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, document.title, url.toString());

    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: verifier,
        }),
      });
      if (!res.ok) throw new Error('Token exchange failed');
      const data = (await res.json()) as { access_token?: string };
      if (data.access_token) {
        this.spotifyAccessToken = data.access_token;
        sessionStorage.setItem('neon_nights_spotify_access_token', data.access_token);
        await this.initSpotifyFromToken(data.access_token);
      }
    } catch {
      this.showToast('Spotify PKCE handshake fell back to Official Spotify Embed Player.');
    }
  }

  private async initSpotifyFromToken(token: string) {
    try {
      const profileRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profile = (await profileRes.json()) as {
          display_name?: string;
          product?: string;
        };
        this.state.spotifyConnected = true;
        this.state.spotifyUserName = profile.display_name || 'Spotify DJ';
        this.state.spotifyIsPremium = profile.product === 'premium';
        this.emit();
      }

      // Fetch user's playlists
      const plRes = await fetch('https://api.spotify.com/v1/me/playlists?limit=8', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (plRes.ok) {
        const plData = (await plRes.json()) as {
          items?: Array<{
            id: string;
            name: string;
            owner?: { display_name?: string };
            images?: Array<{ url: string }>;
          }>;
        };
        if (plData.items && plData.items.length > 0) {
          const userPlaylists: ExternalStreamingTrack[] = plData.items.map((item) => ({
            id: `sp_pl_${item.id}`,
            service: 'SPOTIFY',
            externalId: item.id,
            title: item.name,
            artist: item.owner?.display_name || 'My Spotify Playlist',
            genre: 'Dance',
            bpm: 124,
            isPlaylist: true,
            thumbnailUrl:
              item.images?.[0]?.url ||
              'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160&auto=format&fit=crop&q=80',
            embedUrl: `https://open.spotify.com/embed/playlist/${item.id}?utm_source=generator&theme=0`,
          }));
          this.state.spotifyPlaylists = [...userPlaylists, ...CURATED_SPOTIFY_TRACKS];
          this.emit();
        }
      }

      this.loadSpotifyWebPlaybackSDK(token);
    } catch {
      // Fallback to embed mode
    }
  }

  private loadSpotifyWebPlaybackSDK(token: string) {
    if (typeof window === 'undefined') return;

    const setupPlayer = () => {
      if (!window.Spotify || this.spotifyPlayer) return;
      const player = new window.Spotify.Player({
        name: 'Neon Nights Club Turntable',
        getOAuthToken: (cb) => cb(token),
        volume: this.state.volume,
      });

      player.addListener('ready', (payload) => {
        const devId = payload.device_id as string;
        this.state.spotifyDeviceId = devId;
        this.state.spotifyIsPremium = true;
        this.emit();
      });

      player.addListener('account_error', () => {
        // Non-Premium Spotify fallback: use official Spotify Embed IFrame
        this.state.spotifyIsPremium = false;
        this.showToast(
          'Spotify Free account detected — using Official Spotify Embed Player for club playback!'
        );
        this.emit();
      });

      void player.connect();
      this.spotifyPlayer = player;
    };

    if (window.Spotify) {
      setupPlayer();
      return;
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      setupPlayer();
    };

    if (!this.spotifyScriptLoaded) {
      this.spotifyScriptLoaded = true;
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }

  public async searchSpotifyCatalog(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;

    // First check if user pasted a Spotify Track/Playlist link
    const entity = extractSpotifyEntity(trimmed);
    if (entity) {
      const customTrack: ExternalStreamingTrack = {
        id: `sp_${entity.type}_${entity.id}`,
        service: 'SPOTIFY',
        externalId: entity.id,
        title: `Spotify ${entity.type === 'playlist' ? 'Club Playlist' : 'Club Track'} (${entity.id.slice(0, 6)})`,
        artist: 'Spotify Direct Stream',
        genre: 'Dance',
        bpm: 124,
        isPlaylist: entity.type === 'playlist',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160&auto=format&fit=crop&q=80',
        embedUrl: `https://open.spotify.com/embed/${entity.type}/${entity.id}?utm_source=generator&theme=0`,
      };
      this.spinExternalTrack(customTrack);
      return;
    }

    if (this.spotifyAccessToken) {
      try {
        const res = await fetch(
          `https://api.spotify.com/v1/search?type=track&limit=8&q=${encodeURIComponent(trimmed)}`,
          {
            headers: { Authorization: `Bearer ${this.spotifyAccessToken}` },
          }
        );
        if (res.ok) {
          const data = (await res.json()) as {
            tracks?: {
              items?: Array<{
                id: string;
                name: string;
                artists?: Array<{ name: string }>;
                album?: { images?: Array<{ url: string }> };
              }>;
            };
          };
          const items = data.tracks?.items || [];
          this.state.spotifySearchResults = items.map((tr) => ({
            id: `sp_tr_${tr.id}`,
            service: 'SPOTIFY',
            externalId: tr.id,
            title: tr.name,
            artist: tr.artists?.map((a) => a.name).join(', ') || 'Spotify Artist',
            genre: 'Dance',
            bpm: 124,
            thumbnailUrl:
              tr.album?.images?.[0]?.url ||
              'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160&auto=format&fit=crop&q=80',
            embedUrl: `https://open.spotify.com/embed/track/${tr.id}?utm_source=generator&theme=0`,
          }));
          this.emit();
          return;
        }
      } catch {
        // Fallback to local filter below
      }
    }

    // Filter curated catalog by query
    const lower = trimmed.toLowerCase();
    const matches = CURATED_SPOTIFY_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.artist.toLowerCase().includes(lower) ||
        t.genre.toLowerCase().includes(lower)
    );
    this.state.spotifySearchResults = matches.length > 0 ? matches : CURATED_SPOTIFY_TRACKS;
    this.emit();
  }

  // ===========================================================================
  // 3. APPLE MUSIC INTEGRATION (MusicKit JS v3 + Official Apple Music Embed)
  // ===========================================================================
  public getAppleDeveloperToken(): string {
    const envToken = (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_APPLE_MUSIC_DEV_TOKEN;
    const storedToken =
      typeof window !== 'undefined'
        ? localStorage.getItem('neon_nights_apple_dev_token')
        : null;
    return (envToken || storedToken || '').trim();
  }

  public ensureMusicKitLoaded(): Promise<MusicKitInstance | null> {
    if (typeof window === 'undefined') return Promise.resolve(null);
    const devToken = this.getAppleDeveloperToken();
    if (!devToken) {
      return Promise.resolve(null);
    }

    const configureInstance = async (): Promise<MusicKitInstance | null> => {
      if (!window.MusicKit) return null;
      try {
        const mk = await window.MusicKit.configure({
          developerToken: devToken,
          app: { name: 'Neon Nights', build: '1.0.0' },
        });
        this.musicKit = mk;
        this.state.appleConfigured = true;
        this.state.appleConnected = Boolean(mk.isAuthorized);
        this.emit();
        return mk;
      } catch {
        return null;
      }
    };

    if (window.MusicKit) {
      return configureInstance();
    }

    return new Promise((resolve) => {
      document.addEventListener(
        'musickitloaded',
        () => {
          void configureInstance().then(resolve);
        },
        { once: true }
      );

      if (!this.appleScriptLoaded) {
        this.appleScriptLoaded = true;
        const script = document.createElement('script');
        script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
        script.async = true;
        document.head.appendChild(script);
      }
    });
  }

  public async connectAppleMusic() {
    const mk = await this.ensureMusicKitLoaded();
    if (!mk) {
      this.showToast(
        'Apple Music Embed Turntable Active! Pick any track below or paste an Apple Music link to spin.'
      );
      return;
    }
    try {
      await mk.authorize();
      this.state.appleConnected = true;
      this.showToast('Connected to Apple MusicKit v3!');
      // Load user library playlists
      if (mk.api) {
        const res = await mk.api.music('/v1/me/library/playlists');
        const items = (res.data?.data as Array<{
          id: string;
          attributes?: { name?: string };
        }>) || [];
        if (items.length > 0) {
          const libPlaylists: ExternalStreamingTrack[] = items.map((pl) => ({
            id: `am_pl_${pl.id}`,
            service: 'APPLE',
            externalId: pl.id,
            title: pl.attributes?.name || 'My Apple Music Playlist',
            artist: 'Apple Music Library',
            genre: 'Dance',
            bpm: 124,
            isPlaylist: true,
            thumbnailUrl:
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160&auto=format&fit=crop&q=80',
          }));
          this.state.applePlaylists = [...libPlaylists, ...CURATED_APPLE_MUSIC_TRACKS];
        }
      }
      this.emit();
    } catch {
      this.showToast('Apple Music authorization cancelled — using Apple Music Embed Player.');
    }
  }

  public async searchAppleMusicCatalog(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;

    const extracted = extractAppleMusicEmbedUrl(trimmed);
    if (extracted) {
      const customAmTrack: ExternalStreamingTrack = {
        id: `am_custom_${extracted.id}`,
        service: 'APPLE',
        externalId: extracted.id,
        title: `Apple Music Club Track (${extracted.id})`,
        artist: 'Apple Music Stream',
        genre: 'Dance',
        bpm: 124,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160&auto=format&fit=crop&q=80',
        embedUrl: extracted.embedUrl,
      };
      this.spinExternalTrack(customAmTrack);
      return;
    }

    if (this.musicKit && this.musicKit.api) {
      try {
        const res = await this.musicKit.api.music('/v1/catalog/us/search', {
          term: trimmed,
          types: ['songs'],
          limit: 8,
        });
        const songsData = (
          res.data?.results as {
            songs?: {
              data?: Array<{
                id: string;
                attributes?: {
                  name?: string;
                  artistName?: string;
                  url?: string;
                };
              }>;
            };
          }
        )?.songs?.data;
        if (songsData && songsData.length > 0) {
          this.state.appleSearchResults = songsData.map((s) => {
            const rawUrl = s.attributes?.url || '';
            const embed = rawUrl
              ? rawUrl.replace('https://music.apple.com', 'https://embed.music.apple.com') +
                '&theme=dark'
              : undefined;
            return {
              id: `am_song_${s.id}`,
              service: 'APPLE',
              externalId: s.id,
              title: s.attributes?.name || 'Apple Music Track',
              artist: s.attributes?.artistName || 'Apple Music Artist',
              genre: 'Dance',
              bpm: 124,
              thumbnailUrl:
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160&auto=format&fit=crop&q=80',
              embedUrl: embed,
            };
          });
          this.emit();
          return;
        }
      } catch {
        // Fallback to curated filter
      }
    }

    const lower = trimmed.toLowerCase();
    const matches = CURATED_APPLE_MUSIC_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.artist.toLowerCase().includes(lower) ||
        t.genre.toLowerCase().includes(lower)
    );
    this.state.appleSearchResults =
      matches.length > 0 ? matches : CURATED_APPLE_MUSIC_TRACKS;
    this.emit();
  }

  // ===========================================================================
  // 4. UNIFIED PLAYBACK CONTROLLER (ClubAudioController)
  // ===========================================================================
  public spinExternalTrack(track: ExternalStreamingTrack) {
    // 1. Automatically pause built-in Web Audio synth oscillators & uploaded MP3s so audio never overlaps
    soundEngine.setExternalStreamActive(true);
    soundEngine.setBpm(track.bpm || 124);

    // Pause previous external service if switching services
    if (this.state.activeService === 'YOUTUBE' && track.service !== 'YOUTUBE') {
      try {
        this.ytPlayer?.pauseVideo();
      } catch {
        // ignore
      }
    }
    if (this.state.activeService === 'SPOTIFY' && track.service !== 'SPOTIFY') {
      void this.spotifyPlayer?.pause();
    }
    if (this.state.activeService === 'APPLE' && track.service !== 'APPLE') {
      void this.musicKit?.pause();
    }

    this.state.activeService = track.service;
    this.state.activeExternalTrack = track;
    this.state.isPlaying = true;
    this.emit();

    // 2. Start playback on the selected external service
    if (track.service === 'YOUTUBE') {
      if (this.ytPlayer && this.state.ytReady) {
        this.ytPlayer.loadVideoById(track.externalId);
        this.ytPlayer.playVideo();
      } else {
        this.ytPendingVideoId = track.externalId;
        this.ensureYouTubeApiLoaded();
      }
    } else if (track.service === 'SPOTIFY') {
      if (
        this.state.spotifyIsPremium &&
        this.state.spotifyDeviceId &&
        this.spotifyAccessToken
      ) {
        const body = track.isPlaylist
          ? { context_uri: `spotify:playlist:${track.externalId}` }
          : { uris: [`spotify:track:${track.externalId}`] };
        void fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${this.state.spotifyDeviceId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${this.spotifyAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          }
        );
      }
    } else if (track.service === 'APPLE') {
      if (this.musicKit && this.state.appleConnected) {
        void this.musicKit
          .setQueue(
            track.isPlaylist
              ? { playlist: track.externalId }
              : { song: track.externalId }
          )
          .then(() => this.musicKit?.play());
      }
    }

    // 3. Sync with the main game HUD "Now Playing" card & genre mood lighting
    if (this.onTrackSelectedCallback) {
      const clubTrack: ClubSongTrack = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        vibeDesc: `${track.service} Live Stream`,
        genre: track.genre || 'Dance',
        bpm: track.bpm || 124,
        durationSec: 240,
        bonus:
          track.service === 'YOUTUBE'
            ? '+45% YouTube Club Stream Hype'
            : track.service === 'SPOTIFY'
            ? '+50% Spotify Turntable Hype'
            : '+50% Apple Music Club Hype',
        accentColor:
          track.service === 'YOUTUBE'
            ? '#FF0000'
            : track.service === 'SPOTIFY'
            ? '#1DB954'
            : '#FA243C',
        secondaryColor: '#a855f7',
        unlockLevel: 1,
        patternId: 'pat_dance_1',
        streamingSource: track.service,
        externalId: track.externalId,
        thumbnailUrl: track.thumbnailUrl,
        externalUrl: track.embedUrl,
      };
      this.onTrackSelectedCallback(clubTrack);
    }
  }

  public switchToBuiltInSynthOrUpload(isUpload: boolean = false) {
    try {
      this.ytPlayer?.pauseVideo();
    } catch {
      // ignore
    }
    void this.spotifyPlayer?.pause();
    void this.musicKit?.pause();

    soundEngine.setExternalStreamActive(false);
    this.state.activeService = isUpload ? 'UPLOAD' : 'SYNTH';
    this.state.activeExternalTrack = null;
    this.state.isPlaying = true;
    this.emit();
  }

  public play() {
    this.state.isPlaying = true;
    if (this.state.activeService === 'YOUTUBE') {
      this.ytPlayer?.playVideo();
    } else if (this.state.activeService === 'SPOTIFY') {
      void this.spotifyPlayer?.resume();
    } else if (this.state.activeService === 'APPLE') {
      void this.musicKit?.play();
    } else {
      soundEngine.setPaused(false);
      soundEngine.unlockAudio();
    }
    this.emit();
  }

  public pause() {
    this.state.isPlaying = false;
    if (this.state.activeService === 'YOUTUBE') {
      this.ytPlayer?.pauseVideo();
    } else if (this.state.activeService === 'SPOTIFY') {
      void this.spotifyPlayer?.pause();
    } else if (this.state.activeService === 'APPLE') {
      void this.musicKit?.pause();
    } else {
      soundEngine.setPaused(true);
    }
    this.emit();
  }

  public next() {
    if (this.state.activeService === 'YOUTUBE') {
      this.skipToNextYouTubeMix();
    } else if (this.state.activeService === 'SPOTIFY') {
      const list = this.state.spotifyPlaylists;
      const idx = list.findIndex((t) => t.id === this.state.activeExternalTrack?.id);
      const nextTrack = list[(idx + 1) % list.length];
      if (nextTrack) this.spinExternalTrack(nextTrack);
    } else if (this.state.activeService === 'APPLE') {
      const list = this.state.applePlaylists;
      const idx = list.findIndex((t) => t.id === this.state.activeExternalTrack?.id);
      const nextTrack = list[(idx + 1) % list.length];
      if (nextTrack) this.spinExternalTrack(nextTrack);
    }
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.state.volume = clamped;
    soundEngine.setVolume(clamped);
    try {
      this.ytPlayer?.setVolume(Math.round(clamped * 100));
    } catch {
      // ignore
    }
    void this.spotifyPlayer?.setVolume(clamped);
    if (this.musicKit) {
      this.musicKit.volume = clamped;
    }
    this.emit();
  }
}

export const streamingMusicManager = new StreamingMusicManager();
