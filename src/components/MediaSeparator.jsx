import React, { useCallback, useRef, useState } from 'react';
import { useMediaSeparator } from './useMediaSeparator';
import MediaSeparatorQueueItem from './MediaSeparatorQueueItem';

/**
 * Local Media Splitter Tool Component.
 * Runs client-side using ffmpeg.wasm to separate audio & silent video tracks.
 */
export default function MediaSeparator() {
  const {
    items,
    engineLoading,
    isProcessing,
    globalProgress,
    addFiles,
    removeItem,
    clearDone,
    setAudioFormat,
    setVideoFormat,
    runQueue,
    stopQueue,
    retryItem,
  } = useMediaSeparator();

  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (fileList) => {
      if (!fileList || !fileList.length) return;
      addFiles(fileList);
    },
    [addFiles],
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setDragOver(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const hasPending = items.some((it) => it.status === 'pending');
  const hasDone = items.some((it) => it.status === 'done');

  return (
    <div
      className="mediasplit-container"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {dragOver && items.length > 0 && (
        <div className="mediasplit-drag-overlay">
          <div className="overlay-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <p>Drop video files to add to queue</p>
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div
          className={`mediasplit-dropzone${dragOver ? ' dragover' : ''}`}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          aria-label="Upload video files"
        >
          <div className="dropzone-content">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <p className="dropzone-title">Drag & drop video files here</p>
            <p className="dropzone-or">or</p>
            <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>Browse Files</button>
            <p className="dropzone-note">Supports MP4, MOV, WebM, MKV, AVI, and other common video formats</p>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="mediasplit-workspace">
          <div className="mediasplit-actions">
            {isProcessing ? (
              <button
                type="button"
                onClick={stopQueue}
                className="mediasplit-btn-secondary mediasplit-btn-stop"
                style={{ color: '#ef4444', borderColor: '#ef4444' }}
              >
                Stop Processing
              </button>
            ) : (
              <button
                type="button"
                onClick={runQueue}
                disabled={!hasPending && !engineLoading}
                className="mediasplit-btn-primary"
              >
                {engineLoading ? 'Loading Engine...' : 'Start Processing Queue'}
              </button>
            )}
            {hasDone && !isProcessing && (
              <button
                type="button"
                onClick={clearDone}
                className="mediasplit-btn-secondary"
              >
                Clear Completed
              </button>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isProcessing}
              className="mediasplit-btn-secondary"
            >
              Add Files
            </button>
            <span className="mediasplit-count">{items.length} file{items.length !== 1 ? 's' : ''}</span>
          </div>

          {isProcessing && (
            <div className="mediasplit-global-progress">
              <progress value={globalProgress} max={100} />
              <span>Overall Queue Progress: {globalProgress}%</span>
            </div>
          )}

          <ul className="mediasplit-queue">
            {items.map((item) => (
              <MediaSeparatorQueueItem
                key={item.id}
                item={item}
                onAudioFormatChange={setAudioFormat}
                onVideoFormatChange={setVideoFormat}
                onRemove={removeItem}
                onRetry={retryItem}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
