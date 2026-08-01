const CJK_PATTERN = /[\u4e00-\u9fa5\u3040-\u30ff\u31f0-\u31ff]/g;

function countCorrectCharacters(typedText, templateText) {
  let correct = 0;
  const limit = Math.min(typedText.length, templateText.length);
  for (let index = 0; index < limit; index += 1) {
    if (typedText[index] === templateText[index]) correct += 1;
  }
  return correct;
}

export function calculateTypingMetrics({
  typedText,
  templateText,
  mode,
  activeLang,
  elapsedSeconds,
  correctKeystrokes,
  totalKeystrokes,
  backspacesPressed,
}) {
  const minutes = Math.max(1, elapsedSeconds) / 60;
  let wpm;
  if (mode === 'free') {
    if (activeLang === 'chinese') {
      const cjkCount = (typedText.match(CJK_PATTERN) || []).length;
      const englishWords = typedText
        .replace(CJK_PATTERN, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .length;
      wpm = Math.round((cjkCount + englishWords) / minutes);
    } else {
      wpm = Math.round((typedText.length / 5) / minutes);
    }
  } else {
    const correctCharacters = countCorrectCharacters(typedText, templateText);
    const normalizedWords = activeLang === 'chinese'
      ? correctCharacters
      : correctCharacters / 5;
    wpm = Math.round(normalizedWords / minutes);
  }

  const cpm = activeLang === 'chinese'
    ? null
    : Math.round(typedText.length / minutes);
  const accuracy = mode === 'free'
    ? null
    : totalKeystrokes === 0
      ? 100
      : Math.round((correctKeystrokes / totalKeystrokes) * 100);
  const totalInputActions = totalKeystrokes + backspacesPressed;
  const correctionRate = totalInputActions === 0
    ? 0
    : Math.round((backspacesPressed / totalInputActions) * 100);

  return { wpm, cpm, accuracy, correctionRate };
}
