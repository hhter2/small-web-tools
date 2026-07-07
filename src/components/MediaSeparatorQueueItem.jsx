import React, { useMemo } from 'react';
import MediaSeparatorFormatSelect from './MediaSeparatorFormatSelect';
import MediaSeparatorWaveform from './MediaSeparatorWaveform';
import { AUDIO_FORMATS, VIDEO_FORMATS } from './mediaSeparatorEngine';

export default function MediaSeparatorQueueItem({ item, onAudioFormatChange, onVideoFormatChange, onRemove, onRetry }) {
  // 用於原始檔的預覽播放（不影響 ffmpeg 處理，純粹是瀏覽器原生解碼播放）
  const sourcePreviewURL = useMemo(() => URL.createObjectURL(item.file), [item.file]);

  const isBusy = item.status === 'processing';
  const canEdit = item.status === 'pending' || item.status === 'error';

  return (
    <li className="media-separator-queue-item">
      <div className="media-separator-queue-item__header">
        <video src={sourcePreviewURL} controls muted className="media-separator-queue-item__preview" />
        <div className="media-separator-queue-item__meta">
          <p className="media-separator-queue-item__filename">{item.file.name}</p>
          <p className="media-separator-queue-item__size">{formatBytes(item.file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={isBusy}
          className="media-separator-btn media-separator-btn--danger"
        >
          移除
        </button>
      </div>

      <div className="media-separator-queue-item__formats">
        <MediaSeparatorFormatSelect
          label="音軌輸出格式"
          value={item.audioFormat}
          options={AUDIO_FORMATS}
          onChange={(v) => onAudioFormatChange(item.id, v)}
          disabled={!canEdit}
        />
        <MediaSeparatorFormatSelect
          label="視訊輸出格式"
          value={item.videoFormat}
          options={VIDEO_FORMATS}
          onChange={(v) => onVideoFormatChange(item.id, v)}
          disabled={!canEdit}
        />
      </div>

      <div className="media-separator-queue-item__status">
        {item.status === 'pending' && <span>等待處理</span>}
        {isBusy && (
          <div className="media-separator-queue-item__progress">
            <progress value={item.progress} max={100} />
            <span>處理中 {item.progress}%</span>
          </div>
        )}
        {item.status === 'error' && (
          <div className="media-separator-queue-item__error">
            <span>發生錯誤：{item.error}</span>
            <button
              type="button"
              onClick={() => onRetry(item.id)}
              className="media-separator-btn media-separator-btn--retry"
            >
              重試
            </button>
          </div>
        )}
      </div>

      {item.status === 'done' && (
        <div className="media-separator-queue-item__results">
          <div className="media-separator-queue-item__result">
            <p className="media-separator-queue-item__result-title">音軌</p>
            <MediaSeparatorWaveform audioURL={item.audioURL} className="media-separator-waveform-container" />
            <a href={item.audioURL} download={buildDownloadName(item, 'audio')} className="media-separator-download-link">
              下載音軌
            </a>
          </div>
          <div className="media-separator-queue-item__result">
            <p className="media-separator-queue-item__result-title">無聲視訊</p>
            <video src={item.videoURL} controls className="media-separator-queue-item__preview" />
            <a href={item.videoURL} download={buildDownloadName(item, 'video')} className="media-separator-download-link">
              下載視訊
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
