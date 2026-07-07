import { useCallback, useRef, useState } from 'react';
import { ensureFFmpegLoaded, AUDIO_FORMATS, VIDEO_FORMATS, getExt, guessMime } from './mediaSeparatorEngine';

export const STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error',
};

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `item-${idCounter}-${Date.now()}`;
}

/**
 * 管理多檔案的音軌/視訊拆分佇列。
 * 檔案會依序（非平行）送進同一個 ffmpeg.wasm 實例處理，避免記憶體爆量與 worker 衝突。
 */
export function useMediaSeparator() {
  const [items, setItems] = useState([]);
  const [engineLoading, setEngineLoading] = useState(false);
  const processingRef = useRef(false);

  const updateItem = useCallback((id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const addFiles = useCallback((fileList) => {
    const newItems = Array.from(fileList).map((file) => ({
      id: nextId(),
      file,
      status: STATUS.PENDING,
      progress: 0,
      audioFormat: 'source',
      videoFormat: 'source',
      audioBlob: null,
      videoBlob: null,
      audioURL: null,
      videoURL: null,
      error: null,
    }));
    setItems((prev) => [...prev, ...newItems]);
    return newItems.map((it) => it.id);
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.audioURL) URL.revokeObjectURL(target.audioURL);
      if (target?.videoURL) URL.revokeObjectURL(target.videoURL);
      return prev.filter((it) => it.id !== id);
    });
  }, []);

  const clearDone = useCallback(() => {
    setItems((prev) => {
      prev.forEach((it) => {
        if (it.status === STATUS.DONE) {
          if (it.audioURL) URL.revokeObjectURL(it.audioURL);
          if (it.videoURL) URL.revokeObjectURL(it.videoURL);
        }
      });
      return prev.filter((it) => it.status !== STATUS.DONE);
    });
  }, []);

  const setAudioFormat = useCallback(
    (id, value) => updateItem(id, { audioFormat: value }),
    [updateItem],
  );
  const setVideoFormat = useCallback(
    (id, value) => updateItem(id, { videoFormat: value }),
    [updateItem],
  );

  const processOne = useCallback(
    async (item) => {
      const ffmpeg = await ensureFFmpegLoaded();

      const sourceExt = getExt(item.file.name) || 'mp4';
      const inputName = `input-${item.id}.${sourceExt}`;
      const fileBuffer = new Uint8Array(await item.file.arrayBuffer());
      await ffmpeg.writeFile(inputName, fileBuffer);

      const audioFormat = AUDIO_FORMATS.find((f) => f.value === item.audioFormat);
      const videoFormat = VIDEO_FORMATS.find((f) => f.value === item.videoFormat);

      const audioExt = audioFormat.outputExt || sourceExt;
      const videoExt = videoFormat.outputExt || sourceExt;

      const audioOutName = `audio-${item.id}.${audioExt}`;
      const videoOutName = `video-${item.id}.${videoExt}`;

      // ffmpeg 的整體 progress 事件會在多次 exec 呼叫間持續觸發，
      // 這裡簡化為：音軌處理佔 0-50%，視訊處理佔 50-100%。
      let stage = 0;
      const onProgress = ({ progress }) => {
        const clamped = Math.min(1, Math.max(0, progress || 0));
        const overall = stage === 0 ? clamped * 50 : 50 + clamped * 50;
        updateItem(item.id, { progress: Math.min(99, Math.round(overall)) });
      };
      ffmpeg.on('progress', onProgress);

      try {
        stage = 0;
        await ffmpeg.exec(['-i', inputName, ...audioFormat.buildArgs(), audioOutName]);
        stage = 1;
        await ffmpeg.exec(['-i', inputName, ...videoFormat.buildArgs(), videoOutName]);

        const audioData = await ffmpeg.readFile(audioOutName);
        const videoData = await ffmpeg.readFile(videoOutName);

        const audioBlob = new Blob([audioData.buffer], { type: guessMime(audioExt, 'audio') });
        const videoBlob = new Blob([videoData.buffer], { type: guessMime(videoExt, 'video') });

        updateItem(item.id, {
          status: STATUS.DONE,
          progress: 100,
          audioBlob,
          videoBlob,
          audioURL: URL.createObjectURL(audioBlob),
          videoURL: URL.createObjectURL(videoBlob),
        });
      } finally {
        ffmpeg.off('progress', onProgress);
        await safeDelete(ffmpeg, inputName);
        await safeDelete(ffmpeg, audioOutName);
        await safeDelete(ffmpeg, videoOutName);
      }
    },
    [updateItem],
  );

  const runQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      setEngineLoading(true);
      await ensureFFmpegLoaded();
    } catch (err) {
      processingRef.current = false;
      setEngineLoading(false);
      throw err;
    }
    setEngineLoading(false);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let next;
      setItems((prev) => {
        next = prev.find((it) => it.status === STATUS.PENDING);
        if (next) {
          return prev.map((it) =>
            it.id === next.id ? { ...it, status: STATUS.PROCESSING, progress: 0, error: null } : it,
          );
        }
        return prev;
      });

      // 等待 state 真正更新後再讀取（避免拿到過期的 next 參照）
      if (!next) break;

      try {
        await processOne(next);
      } catch (err) {
        updateItem(next.id, { status: STATUS.ERROR, error: err?.message || '處理失敗，請重試' });
      }
    }

    processingRef.current = false;
  }, [processOne, updateItem]);

  const retryItem = useCallback(
    (id) => {
      updateItem(id, { status: STATUS.PENDING, error: null, progress: 0 });
      runQueue();
    },
    [updateItem, runQueue],
  );

  return {
    items,
    engineLoading,
    addFiles,
    removeItem,
    clearDone,
    setAudioFormat,
    setVideoFormat,
    runQueue,
    retryItem,
  };
}

async function safeDelete(ffmpeg, name) {
  try {
    await ffmpeg.deleteFile(name);
  } catch (e) {
    // 檔案本來就不存在時 ffmpeg 會丟錯，這裡可以安全忽略
  }
}
