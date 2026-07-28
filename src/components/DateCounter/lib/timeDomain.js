const SECONDS_PER_DAY = 24 * 60 * 60;

export function parseTimeToSeconds(value) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;

  return hours * 3600 + minutes * 60 + seconds;
}

export function calculateTimeDifference(startTime, endTime, endNextDay = false) {
  const startSeconds = parseTimeToSeconds(startTime);
  const endSeconds = parseTimeToSeconds(endTime);
  if (startSeconds === null || endSeconds === null) return null;

  return endSeconds - startSeconds + (endNextDay ? SECONDS_PER_DAY : 0);
}

export function formatTimeDifference(totalSeconds, endNextDay = false) {
  const sign = totalSeconds < 0 ? '-' : '';
  let remaining = Math.abs(totalSeconds);
  const hours = Math.floor(remaining / 3600);
  remaining %= 3600;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const nextDayLabel = endNextDay ? ', next day' : '';

  return `${sign}${hours}h ${minutes}m ${seconds}s (end - start${nextDayLabel})`;
}
