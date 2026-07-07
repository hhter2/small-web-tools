import React, { useMemo } from 'react';
import MediaSeparatorFormatSelect from './MediaSeparatorFormatSelect';
import MediaSeparatorWaveform from './MediaSeparatorWaveform';
import { AUDIO_FORMATS, VIDEO_FORMATS } from './mediaSeparatorEngine';

export default function MediaSeparatorQueueItem({ item, onAudioFormatChange, onVideoFormatChange, onRemove, onRetry }) {
  // For raw video preview playback (native browser decoding, unrelated to ffmpeg processing)
  const sourcePreviewURL = useMemo(() => URL.createObjectURL(item.file), [item.file]);

  const isBusy = item.status === 'processing';
  const canEdit = item.status === 'ready' || item.status === 'error';

  return (
    <li className="mediasplit-queue-item">
      <div className="mediasplit-queue-item-header">
        <video src={sourcePreviewURL} controls muted className="mediasplit-queue-item-preview" />
        <div className="mediasplit-queue-item-meta">
          <p className="mediasplit-queue-item-filename">{item.file.name}</p>
          <p className="mediasplit-queue-item-size">{formatBytes(item.file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={isBusy}
          className="mediasplit-btn-danger"
        >
          Remove
        </button>
      </div>

      <div className="mediasplit-queue-item-formats">
        <MediaSeparatorFormatSelect
          label="Audio Output Format"
          value={item.audioFormat}
          options={AUDIO_FORMATS}
          onChange={(v) => onAudioFormatChange(item.id, v)}
          disabled={!canEdit}
        />
        <MediaSeparatorFormatSelect
          label="Video Output Format"
          value={item.videoFormat}
          options={VIDEO_FORMATS}
          onChange={(v) => onVideoFormatChange(item.id, v)}
          disabled={!canEdit}
        />
      </div>

      <div className="mediasplit-queue-item-status">
        {item.status === 'ready' && <span>Ready</span>}
        {isBusy && (
          <div className="mediasplit-queue-item-progress">
            <progress value={item.progress} max={100} />
            <span>Processing {item.progress}%</span>
          </div>
        )}
        {item.status === 'error' && (
          <div className="mediasplit-queue-item-error">
            <span>Error: {item.error}</span>
            <button
              type="button"
              onClick={() => onRetry(item.id)}
              className="mediasplit-btn-secondary"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {item.status === 'done' && (
        <div className="mediasplit-queue-item-results">
          <div className="mediasplit-queue-item-result">
            <p className="mediasplit-queue-item-result-title">Audio Track</p>
            <MediaSeparatorWaveform audioURL={item.audioURL} className="mediasplit-waveform-container" />
            <a href={item.audioURL} download={buildDownloadName(item, 'audio')} className="mediasplit-download-link">
              Download Audio
            </a>
          </div>
          <div className="mediasplit-queue-item-result">
            <p className="mediasplit-queue-item-result-title">Silent Video</p>
            <video src={item.videoURL} controls className="mediasplit-queue-item-preview" />
            <a href={item.videoURL} download={buildDownloadName(item, 'video')} className="mediasplit-download-link">
              Download Video
            </a>
          </div>
        </div>
      )}
    </li>
  );
}

function buildDownloadName(item, kind) {
  const base = item.file.name.replace(/\.[^.]+$/, '');
  const format =
    kind === 'audio'
      ? AUDIO_FORMATS.find((f) => f.value === item.audioFormat)
      : VIDEO_FORMATS.find((f) => f.value === item.videoFormat);
  const ext = format?.outputExt || item.file.name.split('.').pop();
  return `${base}-${kind}.${ext}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
