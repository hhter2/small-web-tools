import React, { useCallback, useRef } from 'react';
import { useMediaSeparator } from './useMediaSeparator';
import MediaSeparatorQueueItem from './MediaSeparatorQueueItem';

/**
 * 影片音軌 / 視訊拆分工具主元件。
 * 純結構化 className，不含品牌配色，方便套用既有設計系統。
 */
export default function MediaSeparator() {
  const {
    items,
    engineLoading,
    addFiles,
    removeItem,
    clearDone,
    setAudioFormat,
    setVideoFormat,
    runQueue,
    retryItem,
  } = useMediaSeparator();

  const inputRef = useRef(null);

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
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const hasPending = items.some((it) => it.status === 'pending');
  const hasDone = items.some((it) => it.status === 'done');

  return (
    <section className="media-separator">
      <div
        className="media-separator__dropzone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <p>拖曳影片到這裡，或點擊選擇檔案（可多選、批次處理）</p>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="media-separator__actions">
        <button
          type="button"
          onClick={runQueue}
          disabled={!hasPending && !engineLoading}
          className="media-separator-btn media-separator-btn--primary"
        >
          {engineLoading ? '載入處理引擎中…' : '開始處理佇列'}
        </button>
        {hasDone && (
          <button
            type="button"
            onClick={clearDone}
            className="media-separator-btn media-separator-btn--secondary"
          >
            清除已完成項目
          </button>
        )}
        <span className="media-separator__count">共 {items.length} 個檔案</span>
      </div>

      {items.length === 0 ? (
        <p className="media-separator__empty">尚未加入任何檔案。</p>
      ) : (
        <ul className="media-separator__queue">
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
      )}
    </section>
  );
}
