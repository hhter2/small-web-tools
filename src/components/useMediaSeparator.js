import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { ensureFFmpegLoaded, terminateFFmpeg, AUDIO_FORMATS, VIDEO_FORMATS, getExt, guessMime } from './mediaSeparatorEngine';
import { getMediaSeparatorPolicy, validateResourceAddition } from '../lib/resourceLimits';
import useObjectUrlRegistry from '../hooks/useObjectUrlRegistry';
import { toPublicProcessingError } from '../lib/publicErrors';

export const STATUS = {
  PENDING: 'ready', // Renamed internal value to 'ready' to improve UX before starting
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
 * Manage multi-file audio/video splitter queue.
 * Files are processed sequentially to avoid memory overload and worker conflicts.
 */
export function useMediaSeparator() {
  const {
    createObjectUrl,
    revokeObjectUrl,
    revokeAllObjectUrls,
  } = useObjectUrlRegistry();
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  
  const [engineLoading, setEngineLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState('');
  const processingRef = useRef(false);
  const stopRef = useRef(false);

  const updateItem = useCallback((id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const addFiles = useCallback((fileList) => {
    const files = Array.from(fileList);
    const policy = getMediaSeparatorPolicy(globalThis.navigator?.deviceMemory);
    const resourceCheck = validateResourceAddition(itemsRef.current, files, policy);
    if (!resourceCheck.valid) {
      setLastError(resourceCheck.error);
      return [];
    }
    setLastError('');
    const newItems = files.map((file) => ({
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
      if (target?.audioURL) revokeObjectUrl(target.audioURL);
      if (target?.videoURL) revokeObjectUrl(target.videoURL);
      return prev.filter((it) => it.id !== id);
    });
  }, []);

  const clearDone = useCallback(() => {
    setItems((prev) => {
      prev.forEach((it) => {
        if (it.status === STATUS.DONE) {
          if (it.audioURL) revokeObjectUrl(it.audioURL);
          if (it.videoURL) revokeObjectUrl(it.videoURL);
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

      // Split overall progress between audio stage (0-50%) and video stage (50-100%).
      let stage = 0;
      const onProgress = ({ progress }) => {
        const clamped = Math.min(1, Math.max(0, progress || 0));
        const overall = stage === 0 ? clamped * 50 : 50 + clamped * 50;
        updateItem(item.id, { progress: Math.min(99, Math.round(overall)) });
      };
      ffmpeg.on('progress', onProgress);

      const audioLogs = [];
      const logCollector = ({ message }) => {
        audioLogs.push(message);
      };
      ffmpeg.on('log', logCollector);

      try {
        stage = 0;
        const audioExitCode = await ffmpeg.exec(['-i', inputName, ...audioFormat.buildArgs(), audioOutName]);
        if (audioExitCode !== 0) {
          const logSummary = audioLogs.join('\n');
          if (
            logSummary.includes("matches no streams") ||
            logSummary.includes("does not contain any stream") ||
            logSummary.includes("does not contain any audio stream")
          ) {
            throw new Error("No audio track detected in the video");
          }
          throw new Error("Audio extraction failed (check video format)");
        }
        
        stage = 1;
        const videoExitCode = await ffmpeg.exec(['-i', inputName, ...videoFormat.buildArgs(), videoOutName]);
        if (videoExitCode !== 0) {
          throw new Error("Video extraction failed");
        }

        const audioData = await ffmpeg.readFile(audioOutName);
        const videoData = await ffmpeg.readFile(videoOutName);

        const audioBlob = new Blob([audioData.buffer], { type: guessMime(audioExt, 'audio') });
        const videoBlob = new Blob([videoData.buffer], { type: guessMime(videoExt, 'video') });

        updateItem(item.id, {
          status: STATUS.DONE,
          progress: 100,
          audioBlob,
          videoBlob,
          audioURL: createObjectUrl(audioBlob),
          videoURL: createObjectUrl(videoBlob),
        });
      } finally {
        ffmpeg.off('progress', onProgress);
        ffmpeg.off('log', logCollector);
        await safeDelete(ffmpeg, inputName);
        await safeDelete(ffmpeg, audioOutName);
        await safeDelete(ffmpeg, videoOutName);
      }
    },
    [createObjectUrl, updateItem],
  );

  useEffect(() => () => {
    stopRef.current = true;
    processingRef.current = false;
    terminateFFmpeg();
    revokeAllObjectUrls();
  }, [revokeAllObjectUrls]);

  const runQueue = useCallback(async () => {
    if (processingRef.current) {
      return;
    }
    processingRef.current = true;
    setIsProcessing(true);
    stopRef.current = false;
 
    try {
      setEngineLoading(true);
      await ensureFFmpegLoaded();
    } catch (err) {
      processingRef.current = false;
      setIsProcessing(false);
      setEngineLoading(false);
 
      // Report engine load failure on the first pending item
      setItems((prev) => {
        const firstPending = prev.find((it) => it.status === STATUS.PENDING);
        if (firstPending) {
          const safeError = toPublicProcessingError(err, import.meta.env.DEV);
          return prev.map((it) =>
            it.id === firstPending.id
              ? {
                  ...it,
                  status: STATUS.ERROR,
                  error: safeError.message,
                  developmentDetail: safeError.developmentDetail,
                }
              : it
          );
        }
        return prev;
      });
      return;
    }
    setEngineLoading(false);
 
    while (true) {
      if (stopRef.current) {
        break;
      }
 
      // Read queue item synchronously from itemsRef
      const next = itemsRef.current.find((it) => it.status === STATUS.PENDING);
 
      if (!next) {
        break;
      }
 
      // Update state of the item to processing synchronously in state
      updateItem(next.id, { status: STATUS.PROCESSING, progress: 0, error: null });
 
      try {
        await processOne(next);
      } catch (err) {
        if (stopRef.current) {
          updateItem(next.id, { status: STATUS.PENDING, progress: 0 });
        } else {
          const safeError = toPublicProcessingError(err, import.meta.env.DEV);
          updateItem(next.id, {
            status: STATUS.ERROR,
            error: safeError.message,
            developmentDetail: safeError.developmentDetail,
          });
        }
      }
    }
 
    processingRef.current = false;
    setIsProcessing(false);
  }, [processOne, updateItem]);

  const stopQueue = useCallback(() => {
    stopRef.current = true;
    terminateFFmpeg();

    setItems((prev) =>
      prev.map((it) =>
        it.status === STATUS.PROCESSING
          ? { ...it, status: STATUS.PENDING, progress: 0 }
          : it
      )
    );

    processingRef.current = false;
    setIsProcessing(false);
  }, []);

  const retryItem = useCallback(
    (id) => {
      updateItem(id, { status: STATUS.PENDING, error: null, progress: 0 });
      runQueue();
    },
    [updateItem, runQueue],
  );

  const globalProgress = useMemo(() => {
    if (items.length === 0) return 0;
    const doneCount = items.filter((it) => it.status === STATUS.DONE).length;
    const processingItem = items.find((it) => it.status === STATUS.PROCESSING);
    const activeProgress = processingItem ? processingItem.progress : 0;
    return Math.round(((doneCount + activeProgress / 100) / items.length) * 100);
  }, [items]);

  return {
    items,
    engineLoading,
    isProcessing,
    globalProgress,
    lastError,
    addFiles,
    removeItem,
    clearDone,
    setAudioFormat,
    setVideoFormat,
    runQueue,
    stopQueue,
    retryItem,
  };
}

async function safeDelete(ffmpeg, name) {
  try {
    await ffmpeg.deleteFile(name);
  } catch (e) {
    // File not found, safe to ignore
  }
}
