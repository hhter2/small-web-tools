import React, { useCallback, useEffect, useRef, useState } from 'react';

const BAR_COUNT = 160;

/**
 * 顯示音訊波形，並提供播放/暫停與點擊拖曳的時間軸。
 * 顏色使用 currentColor / rgba(128,128,128,x)，方便沿用外部設計系統的文字顏色。
 */
export default function MediaSeparatorWaveform({ audioURL, className }) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const [peaks, setPeaks] = useState(null); // null = 解析中, [] = 無法解碼
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPeaks(null);
    setProgress(0);
    setIsPlaying(false);

    async function decode() {
      try {
        const res = await fetch(audioURL);
        const arrayBuffer = await res.arrayBuffer();
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        try {
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
          if (cancelled) return;
          setDuration(audioBuffer.duration);
          setPeaks(computePeaks(audioBuffer, BAR_COUNT));
        } finally {
          ctx.close();
        }
      } catch (e) {
        if (!cancelled) setPeaks([]);
      }
    }
    decode();
    return () => {
      cancelled = true;
    };
  }, [audioURL]);

  useEffect(() => {
    if (peaks && peaks.length) {
      draw(canvasRef.current, peaks, progress);
    }
  }, [peaks, progress]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (audio && duration > 0) {
      setProgress(audio.currentTime / duration);
    }
    if (audio && !audio.paused && !audio.ended) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setIsPlaying(false);
    }
  }, [duration]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [tick]);

  const seekTo = useCallback(
    (event) => {
      const canvas = canvasRef.current;
      const audio = audioRef.current;
      if (!canvas || !audio || !duration) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * duration;
      setProgress(ratio);
    },
    [duration],
  );

  return (
    <div className={className}>
      <audio ref={audioRef} src={audioURL} onEnded={() => setIsPlaying(false)} />
      <div className="media-separator-waveform-row">
        <button type="button" onClick={togglePlay} disabled={!peaks || !peaks.length}>
          {isPlaying ? '暫停' : '播放'}
        </button>
        <canvas
          ref={canvasRef}
          width={640}
          height={64}
          onClick={seekTo}
          className="media-separator-waveform-canvas"
          style={{ cursor: peaks && peaks.length ? 'pointer' : 'default' }}
        />
        <span className="media-separator-waveform-time">
          {formatTime(duration * progress)} / {formatTime(duration)}
        </span>
      </div>
      {peaks === null && <p className="media-separator-waveform-status">正在解析音訊波形…</p>}
      {peaks && peaks.length === 0 && (
        <p className="media-separator-waveform-status">此瀏覽器無法解碼此格式以顯示波形，但不影響下載檔案。</p>
      )}
    </div>
  );
}

function computePeaks(audioBuffer, bucketCount) {
  const channelData = audioBuffer.getChannelData(0);
  const bucketSize = Math.floor(channelData.length / bucketCount) || 1;
  const peaks = [];
  for (let i = 0; i < bucketCount; i += 1) {
    let min = 1.0;
    let max = -1.0;
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, channelData.length);
    for (let j = start; j < end; j += 1) {
      const v = channelData[j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (end > start) {
      peaks.push([min, max]);
    } else {
      peaks.push([0, 0]);
    }
  }
  return peaks;
}

function draw(canvas, peaks, progress) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const barWidth = width / peaks.length;
  const midY = height / 2;
  const playheadX = progress * width;

  peaks.forEach(([min, max], i) => {
    const x = i * barWidth;
    const barHeight = Math.max(1, (max - min) * midY);
    ctx.fillStyle = x <= playheadX ? 'currentColor' : 'rgba(128, 128, 128, 0.5)';
    ctx.fillRect(x, midY - barHeight / 2, Math.max(1, barWidth - 1), barHeight);
  });
}

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}
