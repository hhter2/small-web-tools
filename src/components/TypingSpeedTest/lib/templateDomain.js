export function repeatToTarget(text, target, isChinese, isCode) {
  if (target <= 0 || !text) return text;
  if (isChinese) {
    if (text.length >= target) return text;
    let repeated = text;
    while (repeated.length < target) repeated += text;
    return repeated;
  }
  const countWords = (value) => value.split(/[\s\n]+/).filter(Boolean).length;
  if (countWords(text) >= target) return text;
  let repeated = text;
  const separator = isCode ? '\n\n' : ' ';
  while (countWords(repeated) < target) repeated += separator + text;
  return repeated;
}

export function detectCodeLanguage(text) {
  const code = text.trim();
  if (/<[a-z]+[^>]*>/i.test(code) && /<\/?[a-z]+>/i.test(code)) return 'HTML';
  if (/^([{}]|.*{.*}|[.#a-zA-Z0-9_-]+\s*\{)/s.test(code) && /color:|margin:|padding:|display:|flex/i.test(code)) return 'CSS';
  if (/def\s+[a-zA-Z_]\w*\(|import\s+[a-zA-Z_]\w*|print\s*\(|if\s+__name__\s*==/i.test(code)) return 'Python';
  if (/public\s+class\s+|System\.out\.print|public\s+static\s+void\s+main/i.test(code)) return 'Java';
  if (/#include\s+<|std::cout|int\s+main\s*\(/i.test(code)) return 'C++';
  if (/<-|library\s*\(\s*[a-zA-Z_]\w*\s*\)|ggplot\s*\(|install\.packages\s*\(/i.test(code)) return 'R';
  if (/const\s+|let\s+|var\s+|console\.log|function\s+|=>/i.test(code)) return 'JavaScript';
  return 'Code';
}

export function parseTemplate(text, isChinese) {
  if (isChinese) {
    return [...text].map((character, index) => ({
      id: index, text: character, start: index, end: index + 1,
      chars: [character], hasSpaceAfter: false,
    }));
  }
  const words = [];
  for (const match of text.matchAll(/\S+/g)) {
    const start = match.index;
    const value = match[0];
    words.push({
      id: words.length,
      text: value,
      start,
      end: start + value.length,
      chars: [...value],
      hasSpaceAfter: text[start + value.length] === ' ',
    });
  }
  return words;
}

export function detectLanguage(text) {
  return /[\u4e00-\u9fa5\u3040-\u30ff\u31f0-\u31ff]/.test(text)
    ? 'chinese'
    : 'english';
}
