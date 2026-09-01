import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import type { Attachment } from '../types';
import { sfxTick } from '../audio';
import { toast } from './bits';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Maximize2,
  Repeat,
  Sparkles,
  Film,
  Music,
  Image as ImageIcon,
  FileCode,
  FileText,
  Code2,
  Copy,
  Check,
  Download,
  File as FileIcon,
  FileArchive,
  Eye,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';

function fmtTime(sec: number): string {
  if (isNaN(sec) || !isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function synthBars(seedStr: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const v = ((h >>> 0) % 1000) / 1000;
    const env = Math.sin((i / n) * Math.PI) * 0.7 + 0.3;
    out.push(Math.max(0.12, v * env));
  }
  return out;
}

/* =========================================================================
   AUDIO PLAYER PLATE (Playable voice memos, songs, audio recordings)
   ========================================================================= */

export const AudioPlate = memo(function AudioPlate({
  att,
  isGlued,
}: {
  att: Attachment;
  isGlued?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(att.duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(0.85);

  const peaks = att.peaks && att.peaks.length ? att.peaks : synthBars(att.name + att.id, 38);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMeta = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMeta);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  const handleSeek = (fraction: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const target = fraction * duration;
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleLoop = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = !isLooping;
    setIsLooping(!isLooping);
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  };

  const progressFraction = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div className="relative p-3 bg-gradient-to-b from-[#0e1626] to-[#080d17] select-none text-paper font-sans">
      <audio ref={audioRef} src={att.dataUrl} preload="metadata" />

      {/* Header Info */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-line/40 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 truncate text-slate-dim min-w-0">
          <Music size={11} className={isPlaying ? 'text-teal-ice animate-pulse' : 'text-slate-dim'} />
          <span className="truncate text-paper font-medium">{att.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 font-mono text-[9px] text-teal-ice">
          <span>{fmtTime(currentTime)}</span>
          <span className="text-slate-dim/60">/</span>
          <span className="text-slate-dim">{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Main Playback Bar & Interactive Waveform */}
      <div className="flex items-center gap-2.5 my-1">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md shrink-0 ${
            isPlaying
              ? 'bg-teal-ice text-void shadow-[0_0_14px_rgba(111,194,180,0.5)] scale-105'
              : 'bg-solar text-void hover:brightness-110 shadow-[0_0_10px_rgba(242,193,120,0.3)]'
          }`}
          title={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
        </button>

        {/* Waveform Bars */}
        <div
          className="flex-1 flex items-center gap-[2px] h-8 px-1 py-1 rounded bg-[#060a12]/80 border border-line/30 cursor-pointer relative group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            handleSeek(frac, e);
          }}
          title="Click to seek position"
        >
          {peaks.map((p, i) => {
            const barFrac = i / peaks.length;
            const isFilled = barFrac <= progressFraction;
            return (
              <div
                key={i}
                className="flex-1 flex items-center justify-center h-full relative"
              >
                <div
                  className={`w-full rounded-full transition-all duration-100 ${
                    isFilled
                      ? 'bg-gradient-to-t from-teal-ice to-[#8be0d4] shadow-[0_0_4px_rgba(111,194,180,0.6)]'
                      : 'bg-slate-dim/30 group-hover:bg-slate-dim/45'
                  }`}
                  style={{
                    height: `${Math.max(16, p * 100)}%`,
                  }}
                />
              </div>
            );
          })}

          {/* Glowing Playhead indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-paper shadow-[0_0_6px_#fff] pointer-events-none transition-all duration-75"
            style={{ left: `${progressFraction * 100}%` }}
          />
        </div>
      </div>

      {/* Secondary Controls Bar */}
      <div className="flex items-center justify-between gap-1 mt-2 pt-1 text-[9px] font-mono text-slate-dim">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`p-1 rounded hover:text-paper transition-colors ${isMuted ? 'text-red-400' : 'text-slate-dim'}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>

          <button
            onClick={toggleLoop}
            className={`p-1 rounded hover:text-paper transition-colors ${isLooping ? 'text-solar font-bold' : 'text-slate-dim'}`}
            title={isLooping ? 'Looping enabled' : 'Enable loop'}
          >
            <Repeat size={11} className={isLooping ? 'stroke-[2.5]' : ''} />
          </button>

          <button
            onClick={cycleSpeed}
            className="px-1.5 py-0.5 rounded hover:bg-void/80 hover:text-paper border border-line/40 transition-colors"
            title="Change playback speed"
          >
            {playbackRate}x
          </button>
        </div>

        <div className="flex items-center gap-1 text-[8.5px] uppercase tracking-wider text-teal-ice/70">
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-teal-ice animate-ping' : 'bg-slate-dim/40'}`} />
          <span>{isPlaying ? 'PLAYING' : 'AUDIO MEMO'}</span>
        </div>
      </div>
    </div>
  );
});

/* =========================================================================
   VIDEO PLAYER PLATE (Playable video with custom cosmic media player)
   ========================================================================= */

export const VideoPlate = memo(function VideoPlate({
  att,
  isGlued,
}: {
  att: Attachment;
  isGlued?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMeta = () => {
      if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMeta);
    video.addEventListener('ended', onEnded);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMeta);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    if (isPlaying) {
      hideTimerRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 2400);
    }
  }, [isPlaying]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
    resetHideTimer();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = frac * duration;
    setCurrentTime(frac * duration);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleLoop = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const video = videoRef.current;
    if (!video) return;
    video.loop = !isLooping;
    setIsLooping(!isLooping);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const cont = containerRef.current;
    if (!cont) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      cont.requestFullscreen().catch(() => {});
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (videoRef.current) videoRef.current.playbackRate = nextSpeed;
  };

  const progressFraction = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black overflow-hidden group select-none rounded-md"
      onMouseMove={resetHideTimer}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={att.dataUrl}
        preload="metadata"
        playsInline
        className="w-full h-auto block max-h-[360px] object-contain mx-auto bg-[#03060c]"
        onClick={togglePlay}
      />

      {/* Center Big Play Button (when paused) */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-void/80 backdrop-blur-md border border-solar/70 text-solar flex items-center justify-center shadow-[0_0_24px_rgba(242,193,120,0.4)] transition-transform hover:scale-110 active:scale-95"
          title="Play Video"
        >
          <Play size={24} className="fill-current ml-1" />
        </button>
      )}

      {/* Top Banner Tag */}
      <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded bg-void/85 backdrop-blur-md border border-line/40 text-[9px] font-mono text-slate-dim">
        <Film size={10} className="text-solar" />
        <span className="truncate max-w-[140px] text-paper">{att.name}</span>
      </div>

      {/* Overlay Video Control Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-void via-void/90 to-transparent p-2.5 pt-6 flex flex-col gap-1.5 transition-opacity duration-200 ${
          showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Scrubber */}
        <div
          className="w-full h-1.5 bg-slate-dim/30 hover:h-2.5 rounded-full cursor-pointer relative transition-all overflow-hidden"
          onClick={handleSeek}
          title="Seek video"
        >
          <div
            className="h-full bg-gradient-to-r from-solar to-teal-ice rounded-full relative"
            style={{ width: `${progressFraction * 100}%` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-paper text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-1 text-paper hover:text-solar transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
            </button>

            <button
              onClick={toggleMute}
              className={`p-1 hover:text-paper transition-colors ${isMuted ? 'text-red-400' : 'text-slate-dim'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            <span className="font-mono text-[9.5px] text-slate-dim ml-1">
              <span className="text-paper">{fmtTime(currentTime)}</span> / {fmtTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[9px]">
            <button
              onClick={toggleLoop}
              className={`p-1 rounded hover:text-paper transition-colors ${isLooping ? 'text-solar font-bold' : 'text-slate-dim'}`}
              title={isLooping ? 'Looping enabled' : 'Enable loop'}
            >
              <Repeat size={12} className={isLooping ? 'stroke-[2.5]' : ''} />
            </button>

            <button
              onClick={cycleSpeed}
              className="px-1.5 py-0.5 rounded hover:bg-void/80 hover:text-paper border border-line/40 text-slate-dim transition-colors"
              title="Playback Speed"
            >
              {playbackRate}x
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1 text-slate-dim hover:text-paper transition-colors"
              title="Fullscreen"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

/* =========================================================================
   IMAGE / ANIMATED GIF PLATE (Supports live GIFs, freeze/play toggle)
   ========================================================================= */

export const ImageOrGifPlate = memo(function ImageOrGifPlate({
  att,
  onImageLoad,
}: {
  att: Attachment;
  onImageLoad?: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGifPaused, setIsGifPaused] = useState(false);

  const isGif =
    att.isGif ||
    att.name.toLowerCase().endsWith('.gif') ||
    att.dataUrl.startsWith('data:image/gif');

  const toggleGifPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();

    if (!isGif) return;

    if (!isGifPaused) {
      // Pause GIF by freezing current frame to canvas
      const img = imgRef.current;
      const cv = canvasRef.current;
      if (img && cv) {
        cv.width = img.naturalWidth || img.width || 300;
        cv.height = img.naturalHeight || img.height || 200;
        const g = cv.getContext('2d');
        if (g) {
          g.drawImage(img, 0, 0, cv.width, cv.height);
          setIsGifPaused(true);
        }
      }
    } else {
      // Resume animated GIF
      setIsGifPaused(false);
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-md group">
      {/* Live Animated GIF or Standard Image */}
      <img
        ref={imgRef}
        src={att.dataUrl}
        alt={att.name}
        draggable={false}
        className={`w-full h-auto block select-none ${isGifPaused ? 'hidden' : 'block'}`}
        onLoad={() => {
          onImageLoad?.();
        }}
      />

      {/* Frozen Frame Canvas when GIF is paused */}
      <canvas
        ref={canvasRef}
        className={`w-full h-auto select-none ${isGifPaused ? 'block' : 'hidden'}`}
      />

      {/* GIF Controls & Status Badge */}
      {isGif && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <button
            onClick={toggleGifPlay}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-void/85 backdrop-blur-md border border-teal-ice/50 text-[8.5px] font-mono text-teal-ice shadow-md hover:bg-void transition-colors"
            title={isGifPaused ? 'Play GIF animation' : 'Pause GIF animation'}
          >
            {isGifPaused ? (
              <>
                <Play size={9} className="fill-current text-solar" />
                <span className="text-solar font-medium">GIF · PAUSED</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-ice animate-ping" />
                <span className="font-medium">GIF · PLAYING</span>
                <Pause size={9} className="fill-current ml-0.5 opacity-70" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
});

/* =========================================================================
   FILE & CODE STORAGE PLATE (Safe documentation & storage — no live execution)
   ========================================================================= */

function fmtFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeInfo(name: string, ext?: string) {
  const cleanExt = (ext || name.split('.').pop() || '').toLowerCase();
  switch (cleanExt) {
    case 'html':
    case 'htm':
      return { label: 'HTML5', color: 'text-orange-400 border-orange-500/40 bg-orange-950/40', isCode: true, icon: FileCode };
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return { label: 'CSS', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40', isCode: true, icon: FileCode };
    case 'js':
    case 'mjs':
    case 'cjs':
      return { label: 'JAVASCRIPT', color: 'text-yellow-400 border-yellow-500/40 bg-yellow-950/40', isCode: true, icon: Code2 };
    case 'ts':
    case 'tsx':
    case 'jsx':
      return { label: cleanExt.toUpperCase(), color: 'text-sky-400 border-sky-500/40 bg-sky-950/40', isCode: true, icon: Code2 };
    case 'json':
      return { label: 'JSON', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40', isCode: true, icon: FileCode };
    case 'md':
    case 'markdown':
      return { label: 'MARKDOWN', color: 'text-purple-400 border-purple-500/40 bg-purple-950/40', isCode: true, icon: FileText };
    case 'py':
      return { label: 'PYTHON', color: 'text-amber-300 border-amber-500/40 bg-amber-950/40', isCode: true, icon: Code2 };
    case 'sql':
      return { label: 'SQL', color: 'text-blue-400 border-blue-500/40 bg-blue-950/40', isCode: true, icon: FileCode };
    case 'sh':
    case 'bash':
    case 'zsh':
      return { label: 'SHELL', color: 'text-green-400 border-green-500/40 bg-green-950/40', isCode: true, icon: Code2 };
    case 'pdf':
      return { label: 'PDF DOC', color: 'text-rose-400 border-rose-500/40 bg-rose-950/40', isCode: false, icon: FileText };
    case 'zip':
    case 'tar':
    case 'gz':
    case '7z':
    case 'rar':
      return { label: 'ARCHIVE', color: 'text-amber-400 border-amber-500/40 bg-amber-950/40', isCode: false, icon: FileArchive };
    default:
      return { label: cleanExt ? cleanExt.toUpperCase() : 'DOCUMENT', color: 'text-teal-ice border-teal-ice/40 bg-teal-950/40', isCode: false, icon: FileIcon };
  }
}

export const FileOrCodePlate = memo(function FileOrCodePlate({
  att,
  isGlued,
}: {
  att: Attachment;
  isGlued?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const info = getFileTypeInfo(att.name, att.fileExt);
  const Icon = info.icon;

  const hasCode = Boolean(att.codeSnippet && att.codeSnippet.trim().length > 0);
  const lines = att.codeSnippet ? att.codeSnippet.split('\n') : [];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    const content = att.codeSnippet || att.name;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      toast('code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast('failed to copy code', 'warn');
    });
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    try {
      const a = document.createElement('a');
      a.href = att.dataUrl;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast(`downloaded ${att.name}`);
    } catch {
      toast('download failed', 'warn');
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxTick();
    setExpanded(!expanded);
  };

  return (
    <div className="relative w-full rounded-lg bg-gradient-to-b from-[#0e1628] to-[#070b14] border border-line/70 overflow-hidden shadow-lg select-none text-paper font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 p-3 bg-[#0a101d] border-b border-line/50">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`p-1.5 rounded border shrink-0 ${info.color}`}>
            <Icon size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-mono text-[11px] font-semibold text-paper" title={att.name}>
                {att.name}
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold tracking-wider uppercase border shrink-0 ${info.color}`}>
                {info.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 font-mono text-[9px] text-slate-dim">
              {att.size && <span>{fmtFileSize(att.size)}</span>}
              {att.size && (lines.length > 0 || att.lineCount) && <span>•</span>}
              {(att.lineCount || lines.length > 0) && (
                <span>{att.lineCount || lines.length} lines</span>
              )}
              <span>•</span>
              <span className="text-teal-ice/70 flex items-center gap-1">
                <ShieldCheck size={10} className="text-teal-ice" />
                stored safely (no-run)
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {hasCode && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-void/80 hover:text-paper border border-line/40 text-slate-dim transition-colors"
              title="Copy code to clipboard"
            >
              {copied ? <Check size={13} className="text-teal-ice" /> : <Copy size={13} />}
            </button>
          )}

          <button
            onClick={handleDownload}
            className="p-1.5 rounded hover:bg-void/80 hover:text-paper border border-line/40 text-slate-dim transition-colors"
            title={`Download ${att.name}`}
          >
            <Download size={13} />
          </button>

          {hasCode && (
            <button
              onClick={toggleExpand}
              className="flex items-center gap-1 px-2 py-1 rounded bg-void/60 hover:bg-void text-[9px] font-mono border border-line/50 text-slate-soft hover:text-paper transition-colors"
              title={expanded ? 'Collapse preview' : 'View code preview'}
            >
              <Eye size={11} className="text-teal-ice" />
              <span>{expanded ? 'HIDE' : 'PREVIEW'}</span>
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* Code Snippet Viewer (Safe Non-Executing Plaintext / Syntax Box) */}
      {hasCode && (
        <div
          className={`border-t border-line/40 bg-[#050811] transition-all duration-200 overflow-hidden ${
            expanded ? 'max-h-[320px] overflow-y-auto' : 'max-h-[90px] overflow-hidden'
          }`}
        >
          <pre className="p-2.5 font-mono text-[10px] leading-[1.6] text-slate-soft/90 select-text overflow-x-auto">
            {lines.slice(0, expanded ? 300 : 4).map((line, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="select-none text-slate-dim/40 text-right w-6 shrink-0 font-mono text-[9px]">
                  {idx + 1}
                </span>
                <span className="flex-1 whitespace-pre break-all font-mono text-paper/90">
                  {line || ' '}
                </span>
              </div>
            ))}
            {!expanded && lines.length > 4 && (
              <div
                onClick={toggleExpand}
                className="mt-1 pt-1 text-[9px] text-teal-ice font-mono flex items-center justify-center gap-1 cursor-pointer hover:underline border-t border-line/20"
              >
                <span>+{lines.length - 4} more lines… click PREVIEW to inspect full code</span>
              </div>
            )}
          </pre>
        </div>
      )}

      {/* Non-Code Binary Document Badge */}
      {!hasCode && (
        <div className="p-3 bg-[#060a13] flex items-center justify-between text-[9px] font-mono text-slate-dim border-t border-line/30">
          <span>Project asset file archived in document vault</span>
          <button
            onClick={handleDownload}
            className="text-teal-ice hover:underline flex items-center gap-1"
          >
            <Download size={10} />
            <span>Download file</span>
          </button>
        </div>
      )}
    </div>
  );
});
