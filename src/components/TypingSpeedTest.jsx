import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import Button from './ui/Button';
import ToolHeader from './ui/ToolHeader';
import FieldInput from './ui/FieldInput';
import {
  detectCodeLanguage,
  detectLanguage,
  parseTemplate,
  repeatToTarget,
} from './TypingSpeedTest/lib/templateDomain';
import { calculateTypingMetrics } from './TypingSpeedTest/lib/metricsDomain';

// Preset templates
const PRESETS = {
  english: [
    'The quick brown fox jumps over the lazy dog. A journey of a thousand miles begins with a single step. To be or not to be, that is the question. The only thing we have to fear is fear itself. All that glitters is not gold.',
    'Success is not final, failure is not fatal: it is the courage to continue that counts. In the end, we will remember not the words of our enemies, but the silence of our friends. Believe you can and you are halfway there.',
    'Life is what happens when you are busy making other plans. The future belongs to those who believe in the beauty of their dreams. Do not go where the path may lead, go instead where there is no path and leave a trail.',
    'To live is the rarest thing in the world. Most people exist, that is all. You only live once, but if you do it right, once is enough. In three words I can sum up everything I have learned about life: it goes on.'
  ]
};

// Programming language code presets
const CODE_PRESETS = {
  javascript: [
    `const calculateWpm = (chars, time) => {
  const minutes = time / 60;
  return Math.round((chars / 5) / minutes);
};

console.log("WPM Speed:", calculateWpm(250, 60));`,
    `function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}`,
    `const fibonacci = (n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};

console.log("Fibonacci of 10 is:", fibonacci(10));`
  ],
  python: [
    `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

print(quicksort([3, 6, 8, 10, 1, 2, 1]))`,
    `class FileReader:
    def __init__(self, filename):
        self.filename = filename

    def __enter__(self):
        self.file = open(self.filename, 'r')
        return self.file

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.file.close()`,
    `def fibonacci_gen(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci_gen(10)))`
  ],
  cpp: [
    `#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> nums = {1, 2, 3, 4, 5};
    int total = std::accumulate(nums.begin(), nums.end(), 0);
    std::cout << "Sum: " << total << std::endl;
    return 0;
}`,
    `template <typename T>
int binarySearch(const std::vector<T>& arr, T target) {
    int left = 0, right = arr.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
    `#include <string>

class Rectangle {
private:
    double width, height;
public:
    Rectangle(double w, double h) : width(w), height(h) {}
    double getArea() const { return width * height; }
};`
  ],
  java: [
    `public class Singleton {
    private static Singleton instance;
    private Singleton() {}
    public static synchronized Singleton getInstance() {
        if (instance == null) {
            instance = new Singleton();
        }
        return instance;
    }
}`,
    `public class ArrayUtils {
    public static void reverse(int[] arr) {
        int left = 0, right = arr.length - 1;
        while (left < right) {
            int temp = arr[left];
            arr[left] = arr[right];
            arr[right] = temp;
            left++; right--;
        }
    }
}`,
    `public class Sort {
    public static void bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j+1]) {
                    int temp = arr[j];
                    arr[j] = arr[j+1];
                    arr[j+1] = temp;
                }
            }
        }
    }
}`
  ],
  r: [
    `# Calculate vector mean in R
calculate_mean <- function(numbers) {
  total <- sum(numbers)
  count <- length(numbers)
  return(total / count)
}

x <- c(10, 20, 30, 40, 50)
print(paste("Mean:", calculate_mean(x)))`,
    `library(ggplot2)

# Simple scatter plot function
plot_scatter <- function(data, x_var, y_var) {
  ggplot(data, aes_string(x = x_var, y = y_var)) +
    geom_point(color = "blue", size = 3) +
    theme_minimal()
}`,
    `# Fit linear regression model
fit_model <- function(x, y) {
  model <- lm(y ~ x)
  summary_info <- summary(model)
  return(summary_info)
}`
  ],
  html: [
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vite Web App</title>
</head>
<body>
  <div id="app">
    <h1>Hello, World!</h1>
  </div>
</body>
</html>`,
    `<form class="login-form">
  <h2>Login</h2>
  <div class="input-group">
    <label for="username">Username</label>
    <input type="text" id="username" required />
  </div>
  <button type="submit">Submit</button>
</form>`,
    `<div class="product-card">
  <img src="product.jpg" alt="Product Image" />
  <div class="product-info">
    <h3>Wireless Headphones</h3>
    <span class="price">$99.99</span>
  </div>
</div>`
  ],
  css: [
    `.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 24px;
}`,
    `.center-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
}`,
    `@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.caret-blink {
  animation: blink 1s step-end infinite;
}`
  ]
};

export default function TypingSpeedTest() {
  const { t, i18n } = useTranslation('tools');
  // Configuration states
  const [mode, setMode] = useState('template'); // 'free' or 'template'
  const [testType, setTestType] = useState('time'); // 'time' | 'words'
  const [wordTarget, setWordTarget] = useState('25'); // '10' | '25' | '50' | '100'
  const [selectedCodeLanguage, setSelectedCodeLanguage] = useState('javascript'); // 'javascript' | 'python' | 'cpp' | 'java' | 'r' | 'html' | 'css'
  const [duration, setDuration] = useState('30'); // '15', '30', '60'
  const [freeStopMode, setFreeStopMode] = useState('manual'); // 'manual' | 'time' | 'words'
  const [freeWordTarget, setFreeWordTarget] = useState('100'); // word limit for free mode
  const [selectedPreset, setSelectedPreset] = useState('english'); // 'english', 'code', 'custom'
  const [customText, setCustomText] = useState('');
  
  const [showPunctuation, setShowPunctuation] = useState(true);
  const [showNumbers, setShowNumbers] = useState(true);
  
  const [uploadedFileName, setUploadedFileName] = useState('');
  
  // Base raw template text
  const [rawTemplateText, setRawTemplateText] = useState(PRESETS.english[0]);

  // Determine if code mode is active
  const isCodeMode = useMemo(() => {
    return mode === 'template' && (selectedPreset === 'code' || rawTemplateText.includes('\n'));
  }, [mode, selectedPreset, rawTemplateText]);

  // Typing state
  const [typedText, setTypedText] = useState('');
  const [compositionText, setCompositionText] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [testFinished, setTestFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Statistics counters
  const [backspacesPressed, setBackspacesPressed] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0);

  // History state
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('typing_test_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [resultsSaved, setResultsSaved] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Refs to avoid stale closures in interval
  const typedTextRef = useRef('');
  const startTimeRef = useRef(0);
  const isComposingRef = useRef(false);
  const inputRef = useRef(null);

  // Sync ref with states
  useEffect(() => {
    typedTextRef.current = typedText;
  }, [typedText]);

  // Handle Preset and Code Language changes
  useEffect(() => {
    if (selectedPreset === 'custom') {
      setRawTemplateText(customText.trim() || 'Please enter or upload some custom text first...');
    } else if (selectedPreset === 'code') {
      const list = CODE_PRESETS[selectedCodeLanguage];
      if (list && list.length > 0) {
        setRawTemplateText(list[0]);
      }
      setUploadedFileName('');
    } else if (PRESETS[selectedPreset]) {
      setRawTemplateText(PRESETS[selectedPreset][0]);
      setUploadedFileName('');
    }
    resetTest();
  }, [selectedPreset, selectedCodeLanguage, customText]);

  // Refresh/Get new random template text for the current preset (also forces template mode)
  const refreshTemplate = () => {
    setMode('template');
    if (selectedPreset === 'custom') {
      resetTest();
      return;
    }
    
    let list;
    if (selectedPreset === 'code') {
      list = CODE_PRESETS[selectedCodeLanguage];
    } else {
      list = PRESETS[selectedPreset];
    }
    
    if (list && list.length > 0) {
      let nextText = list[Math.floor(Math.random() * list.length)];
      if (list.length > 1) {
        while (nextText === rawTemplateText) {
          nextText = list[Math.floor(Math.random() * list.length)];
        }
      }
      setRawTemplateText(nextText);
    }
    resetTest();
  };

  // Determine active language (automatically preset-based or content-detected)
  const activeLang = useMemo(() => {
    if (selectedPreset === 'english' || selectedPreset === 'code') return 'english';
    return detectLanguage(mode === 'free' ? typedText : rawTemplateText);
  }, [mode, typedText, rawTemplateText, selectedPreset]);

  // Sliced template text based on mode and settings, applying punctuation and number filters
  const templateText = useMemo(() => {
    if (mode === 'free') return '';
    
    let baseText = rawTemplateText.replace(/\r\n/g, '\n');
    
    if (selectedPreset === 'custom') {
      if (isCodeMode) {
        baseText = baseText.split('\n').map(line => line.trimEnd()).join('\n').trim();
      } else {
        baseText = baseText.replace(/\s+/g, ' ').trim();
      }
      return baseText;
    }
    
    if (isCodeMode) {
      // For code mode, trim trailing whitespaces, preserve indentations and newlines
      baseText = baseText.split('\n').map(line => line.trimEnd()).join('\n').trim();
    } else {
      // Apply punctuation stripping if unchecked
      if (!showPunctuation) {
        baseText = baseText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'，。？！（）“”‘’：；《》「」『』、]/g, '');
      }
      
      // Apply numbers stripping if unchecked
      if (!showNumbers) {
        baseText = baseText.replace(/[0-9０１２３４５６７８９]/g, '');
      }
      
      // Normalize extra spaces
      baseText = baseText.replace(/\s+/g, ' ').trim();
    }

    const isChinese = activeLang === 'chinese';

    // Repeat template if too short for the target or time mode
    if (testType === 'words') {
      baseText = repeatToTarget(baseText, Number(wordTarget), isChinese, isCodeMode);
    } else if (testType === 'time') {
      baseText = repeatToTarget(baseText, 350, isChinese, isCodeMode);
    }

    if (testType !== 'words') return baseText;

    if (isChinese) {
      return baseText.slice(0, Number(wordTarget));
    } else {
      if (isCodeMode) {
        // Words limit in code mode
        const limit = Number(wordTarget);
        let wordCount = 0;
        let charLimitIdx = 0;
        let inWord = false;
        for (let i = 0; i < baseText.length; i++) {
          const char = baseText[i];
          const isSpace = /[\s\n]/.test(char);
          if (!isSpace) {
            if (!inWord) {
              inWord = true;
              wordCount++;
              if (wordCount > limit) {
                charLimitIdx = i;
                break;
              }
            }
          } else {
            inWord = false;
          }
          charLimitIdx = i + 1;
        }
        return baseText.slice(0, charLimitIdx).trimEnd();
      } else {
        const words = baseText.split(/\s+/).filter(Boolean);
        return words.slice(0, Number(wordTarget)).join(' ');
      }
    }
  }, [rawTemplateText, testType, wordTarget, activeLang, mode, showPunctuation, showNumbers, isCodeMode, selectedPreset]);

  // Auto detect code language in code mode
  const codeLanguage = useMemo(() => {
    if (!isCodeMode) return '';
    return detectCodeLanguage(templateText);
  }, [templateText, isCodeMode]);

  // Reset test when configuration changes
  useEffect(() => {
    resetTest();
  }, [mode, testType, wordTarget, duration, showPunctuation, showNumbers, freeStopMode, freeWordTarget]);

  // Parse template into line structures for IDE code rendering
  const codeLines = useMemo(() => {
    if (!isCodeMode) return [];

    const lines = [];
    let globalIdx = 0;
    const rawLines = templateText.split('\n');

    for (let i = 0; i < rawLines.length; i++) {
      const lineText = rawLines[i];
      const chars = [];

      for (let j = 0; j < lineText.length; j++) {
        chars.push({
          char: lineText[j],
          globalIdx: globalIdx,
          isNewline: false
        });
        globalIdx++;
      }

      let hasNewline = false;
      if (i < rawLines.length - 1) {
        chars.push({
          char: '\n',
          globalIdx: globalIdx,
          isNewline: true
        });
        globalIdx++;
        hasNewline = true;
      }

      lines.push({
        lineIndex: i,
        text: lineText,
        chars: chars,
        hasNewline: hasNewline
      });
    }

    return lines;
  }, [templateText, isCodeMode]);

  // Parse template into word spans for UI rendering
  const wordsList = useMemo(() => {
    return parseTemplate(templateText, activeLang === 'chinese');
  }, [templateText, activeLang]);

  // Find active word and indices
  const currentIndex = typedText.length;
  const activeWordIdx = useMemo(() => {
    if (wordsList.length === 0) return 0;
    let idx = wordsList.findIndex(w => currentIndex >= w.start && currentIndex <= w.end);
    if (idx === -1) {
      idx = wordsList.findIndex(w => w.start > currentIndex);
      if (idx === -1) {
        idx = wordsList.length - 1;
      }
    }
    return idx;
  }, [wordsList, currentIndex]);

  // Reset test state
  const resetTest = () => {
    setIsTesting(false);
    setPaused(false);
    setTestFinished(false);
    setTypedText('');
    setCompositionText('');
    setBackspacesPressed(0);
    setTotalKeystrokes(0);
    setCorrectKeystrokes(0);
    setResultsSaved(false);
    setElapsedTime(0);
    setTimeLeft(testType === 'time' && selectedPreset !== 'custom' ? Number(duration) : 0);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // Start & Interval Timer logic
  useEffect(() => {
    let timerId;
    if (isTesting && !paused && !testFinished) {
      timerId = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.round((now - startTimeRef.current) / 1000);
        setElapsedTime(elapsed);

        if (testType === 'time' && selectedPreset !== 'custom') {
          const remaining = Number(duration) - elapsed;
          if (remaining <= 0) {
            setTimeLeft(0);
            finishTest(typedTextRef.current, Number(duration));
          } else {
            setTimeLeft(remaining);
          }
        } else if (mode === 'free' && freeStopMode === 'time') {
          // Free mode time-based auto-stop
          const remaining = Number(duration) - elapsed;
          if (remaining <= 0) {
            setTimeLeft(0);
            finishTest(typedTextRef.current, Number(duration));
          } else {
            setTimeLeft(remaining);
          }
        } else {
          setTimeLeft(elapsed);
        }
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [isTesting, paused, testFinished, testType, duration, mode, freeStopMode, selectedPreset]);

  // Finish test and calculate stats
  const finishTest = (finalText, finalSeconds) => {
    setIsTesting(false);
    setTestFinished(true);
    if (finalSeconds <= 0) finalSeconds = 1;
    setElapsedTime(finalSeconds);
  };

  // Keyboard handlers
  const handleKeyDown = (e) => {
    if (testFinished || paused) return;

    if (e.key === 'Backspace') {
      setBackspacesPressed(prev => prev + 1);

      if (isCodeMode) {
        const typedLength = typedText.length;
        if (typedLength > 0) {
          let charsToDelete = 1;
          const lastChar = typedText[typedLength - 1];
          if (lastChar === ' ') {
            let i = typedLength - 1;
            while (i >= 0 && typedText[i] === ' ') {
              i--;
            }
            if (i >= 0 && typedText[i] === '\n') {
              charsToDelete = typedLength - i;
            }
          } else if (lastChar === '\n') {
            charsToDelete = 1;
          }

          if (charsToDelete > 1) {
            e.preventDefault();
            const newVal = typedText.slice(0, -charsToDelete);
            handleValueChange(newVal);
            if (inputRef.current) {
              inputRef.current.value = newVal;
            }
          }
        }
      }
    } else if (e.key === 'Enter') {
      // Ctrl+Enter: pause/resume in free typing mode
      if (e.ctrlKey && mode === 'free') {
        e.preventDefault();
        if (isTesting) {
          setPaused(prev => !prev);
        }
        return;
      }

      if (isCodeMode) {
        e.preventDefault();

        const currentIdx = typedText.length;
        const expectedChar = templateText[currentIdx];

        if (expectedChar === '\n') {
          let spacesCount = 0;
          let nextIdx = currentIdx + 1;
          while (nextIdx < templateText.length && templateText[nextIdx] === ' ') {
            spacesCount++;
            nextIdx++;
          }
          const toAppend = '\n' + ' '.repeat(spacesCount);
          const newVal = typedText + toAppend;
          handleValueChange(newVal);
          if (inputRef.current) {
            inputRef.current.value = newVal;
          }
        } else {
          const newVal = typedText + '\n';
          handleValueChange(newVal);
          if (inputRef.current) {
            inputRef.current.value = newVal;
          }
        }
      }
    }
  };

  // Input composition listeners (Chinese IME Pinyin)
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionUpdate = (e) => {
    if (isComposingRef.current) {
      // Store the active Pinyin composition to display inline
      setCompositionText(e.data || '');
    }
  };

  const handleCompositionEnd = (e) => {
    isComposingRef.current = false;
    setCompositionText('');
    
    // Commit composition text
    handleValueChange(e.target.value);
  };

  const handleInputChange = (e) => {
    if (!isComposingRef.current) {
      handleValueChange(e.target.value);
    }
  };

  const handleValueChange = (newVal) => {
    if (testFinished || paused) return;

    // First character starts the timer
    if (!isTesting && newVal.length > 0) {
      setIsTesting(true);
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      setTestFinished(false);
      setResultsSaved(false);
    }

    if (mode === 'template') {
      // Limit typing text to length of template
      if (newVal.length > templateText.length) {
        newVal = newVal.slice(0, templateText.length);
      }

      // Check keypress details for accuracy
      const diff = newVal.length - typedText.length;
      if (diff > 0) {
        let newTotal = totalKeystrokes;
        let newCorrect = correctKeystrokes;
        
        for (let i = 0; i < diff; i++) {
          const addedIdx = typedText.length + i;
          const typedChar = newVal[addedIdx];
          const expectedChar = templateText[addedIdx];

          newTotal += 1;
          if (typedChar === expectedChar) {
            newCorrect += 1;
          }
        }
        setTotalKeystrokes(newTotal);
        setCorrectKeystrokes(newCorrect);
      }
    } else {
      // Free Typing Mode: raw count
      const diff = newVal.length - typedText.length;
      if (diff > 0) {
        setTotalKeystrokes(prev => prev + diff);
      }
    }

    setTypedText(newVal);

    // Auto complete in template mode if all characters typed
    if (mode === 'template' && newVal.length >= templateText.length) {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000) || 1;
      finishTest(newVal, elapsed);
    }

    // Auto complete in free mode when word count target is hit
    if (mode === 'free' && freeStopMode === 'words') {
      const cjkCount = (newVal.match(/[\u4e00-\u9fa5\u3040-\u30ff\u31f0-\u31ff]/g) || []).length;
      const engWords = newVal.replace(/[\u4e00-\u9fa5\u3040-\u30ff\u31f0-\u31ff]/g, ' ').split(/\s+/).filter(Boolean).length;
      const totalWords = cjkCount + engWords;
      if (totalWords >= Number(freeWordTarget)) {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000) || 1;
        finishTest(newVal, elapsed);
      }
    }
  };

  // Metrics calculators
  const metricSeconds = elapsedTime
    || (isTesting ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0)
    || 1;
  const {
    wpm,
    cpm,
    accuracy,
    correctionRate,
  } = useMemo(() => calculateTypingMetrics({
    typedText,
    templateText,
    mode,
    activeLang,
    elapsedSeconds: metricSeconds,
    correctKeystrokes,
    totalKeystrokes,
    backspacesPressed,
  }), [
    typedText,
    templateText,
    mode,
    activeLang,
    metricSeconds,
    correctKeystrokes,
    totalKeystrokes,
    backspacesPressed,
  ]);

  // Save Results to history list
  const saveResult = () => {
    if (resultsSaved) return;

    const newResult = {
      id: Date.now(),
      date: new Date().toISOString(),
      mode,
      language: activeLang === 'chinese' ? 'chinese' : 'englishCode',
      wpm,
      cpm: activeLang === 'chinese' ? '-' : cpm,
      accuracy: mode === 'free' ? '-' : accuracy,
      corrections: backspacesPressed,
      correctionRate,
      duration: elapsedTime,
    };

    const updated = [newResult, ...history];
    setHistory(updated);
    try {
      localStorage.setItem('typing_test_history', JSON.stringify(updated));
    } catch (e) {
      // Storage may be unavailable; the result remains visible in this session.
    }
    setResultsSaved(true);
  };

  // Export history to JSON
  const exportHistory = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `typing_speed_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Clear history
  const clearHistory = () => {
    if (window.confirm(t('tool-typing.ui.clearHistoryConfirm'))) {
      setHistory([]);
      try {
        localStorage.removeItem('typing_test_history');
      } catch (e) {
        // Storage may be unavailable; clearing in-memory history is sufficient.
      }
    }
  };

  // Handle template file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = String(event.target?.result || '');
        setCustomText(text);
        setSelectedPreset('custom');
      };
      reader.readAsText(file);
    }
  };

  // Focus the input element
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const customTemplateMissing = mode === 'template'
    && selectedPreset === 'custom'
    && !customText.trim();
  const formatHistoryDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString(i18n.language);
  };
  const formatHistoryPercent = (value) => value === '-'
    ? value
    : `${String(value).replace(/%$/, '')}%`;
  const formatHistoryDuration = (value) => `${String(value).replace(/s$/, '')}s`;

  return (
    <Card id="tool-typing" variant="tool" size="wide">
      <div className="flex flex-col justify-between gap-3 border-b border-border pb-3 md:flex-row md:items-center">
        <ToolHeader 
          title={t('tool-typing.title')}
          className="!border-b-0 !pb-0"
        />
        <div className="flex gap-2 shrink-0">
          <Button
            variant={mode === 'template' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('template')}
          >
            {t('tool-typing.ui.templateMode')}
          </Button>
          <Button
            variant={mode === 'free' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('free')}
          >
            {t('tool-typing.ui.freeTyping')}
          </Button>
        </div>
      </div>

      {/* Settings Panel styled like Monkeytype */}
      {!isTesting && !testFinished && (
        <div className="flex select-none flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          {/* Preset Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
            <div className="flex items-center gap-1.5 bg-app border border-border rounded-lg p-1 shrink-0">
              {['english', 'code', 'custom'].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    selectedPreset === preset
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-muted hover:text-text-main hover:bg-nav-hover-bg'
                  }`}
                  onClick={() => setSelectedPreset(preset)}
                >
                  {preset === 'custom' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 inline-block mr-1">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                    </svg>
                  )}
                  <span>{t(`tool-typing.ui.preset.${preset}`)}</span>
                </button>
              ))}
            </div>

            {/* Test Targets (Time/Words selection) */}
            <div className="flex items-center gap-3">
              {mode === 'template' && selectedPreset !== 'code' && (
                <div className="flex items-center gap-1.5 bg-app border border-border rounded-lg p-1">
                  <button
                    type="button"
                    className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      testType === 'time'
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-text-muted hover:text-text-main hover:bg-nav-hover-bg'
                    }`}
                    onClick={() => setTestType('time')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>{t('tool-typing.ui.time')}</span>
                  </button>
                  <button
                    type="button"
                    className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      testType === 'words'
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-text-muted hover:text-text-main hover:bg-nav-hover-bg'
                    }`}
                    onClick={() => setTestType('words')}
                  >
                    <span className="font-extrabold">A</span>
                    <span>{t('tool-typing.ui.words')}</span>
                  </button>
                </div>
              )}

              {mode === 'free' && (
                <div className="flex items-center gap-1.5 bg-app border border-border rounded-lg p-1">
                  {['manual', 'time', 'words'].map((sm) => (
                    <button
                      type="button"
                      key={sm}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        freeStopMode === sm
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-text-muted hover:text-text-main hover:bg-nav-hover-bg'
                      }`}
                      onClick={() => setFreeStopMode(sm)}
                    >
                      {sm === 'time' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      )}
                      {sm === 'words' && <span className="font-extrabold">A</span>}
                      <span>{t(`tool-typing.ui.stopMode.${sm}`)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sub config bar */}
          {!(selectedPreset === 'custom' && mode === 'template') && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {selectedPreset === 'code' && (
                  <div className="flex flex-wrap items-center gap-1.5 bg-app border border-border rounded-lg p-1">
                    {['javascript', 'python', 'cpp', 'java', 'r', 'html', 'css'].map((lang) => (
                      <button
                        type="button"
                        key={lang}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          selectedCodeLanguage === lang
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-text-muted hover:text-text-main hover:bg-nav-hover-bg'
                        }`}
                        onClick={() => setSelectedCodeLanguage(lang)}
                      >
                        {lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JS' : lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}

                {mode === 'template' && selectedPreset !== 'code' && (
                  <div className="flex items-center gap-1.5 bg-app border border-border rounded-lg p-1">
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        showPunctuation ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text-muted hover:text-text-main hover:bg-nav-hover-bg border border-transparent'
                      }`}
                      onClick={() => setShowPunctuation(!showPunctuation)}
                    >
                      <span>@</span>
                      <span>{t('tool-typing.ui.punctuation')}</span>
                    </button>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        showNumbers ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text-muted hover:text-text-main hover:bg-nav-hover-bg border border-transparent'
                      }`}
                      onClick={() => setShowNumbers(!showNumbers)}
                    >
                      <span>#</span>
                      <span>{t('tool-typing.ui.numbers')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Targets */}
              <div className="flex items-center gap-1 bg-app border border-border rounded-lg p-1">
                {((mode === 'template' && testType === 'time') || (mode === 'free' && freeStopMode === 'time')) &&
                  ['15', '30', '60'].map((t) => (
                    <button
                      type="button"
                      key={t}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        duration === t
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-text-muted hover:text-text-main hover:bg-nav-hover-bg'
                      }`}
                      onClick={() => setDuration(t)}
                    >
                      {t}s
                    </button>
                  ))}

                {mode === 'template' && testType === 'words' &&
                  ['10', '25', '50', '100', '250', '500'].map((w) => (
                    <button
                      type="button"
                      key={w}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        wordTarget === w
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-text-muted hover:text-text-main hover:bg-nav-hover-bg'
                      }`}
                      onClick={() => setWordTarget(w)}
                    >
                      {w}
                    </button>
                  ))}

                {mode === 'free' && freeStopMode === 'words' &&
                  ['50', '100', '200', '500'].map((w) => (
                    <button
                      type="button"
                      key={w}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        freeWordTarget === w
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-text-muted hover:text-text-main hover:bg-nav-hover-bg'
                      }`}
                      onClick={() => setFreeWordTarget(w)}
                    >
                      {w}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isTesting && !testFinished && mode === 'template' && selectedPreset === 'custom' && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          <FieldInput
            as="textarea"
            id="custom-paste-text"
            label={t('tool-typing.ui.customTemplateLabel')}
            placeholder={t('tool-typing.ui.customTemplatePlaceholder')}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
          />
          <div className="flex items-center gap-3 text-xs md:text-sm font-semibold text-text-muted">
            <span>{t('tool-typing.ui.uploadPrompt')}</span>
            <label htmlFor="template-file-picker">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-nav-hover-bg cursor-pointer text-text-main transition-colors text-xs font-bold shadow-sm">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                {t('tool-typing.ui.browseFile')}
              </span>
            </label>
            <input
              type="file"
              id="template-file-picker"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            {uploadedFileName && (
              <span className="bg-app border border-border text-text-muted px-2.5 py-1 rounded-md text-xs font-mono">
                {uploadedFileName}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Test Interface */}
      {!testFinished ? (
        <div className="flex flex-col gap-3">
          {!isTesting && (
            <section
              className="flex flex-col items-start justify-between gap-3 rounded-xl border-2 border-accent/35 bg-accent-light p-4 sm:flex-row sm:items-center"
              aria-labelledby="typing-ready-title"
            >
              <div>
                <h3 id="typing-ready-title" className="text-base font-extrabold text-text-main">
                  {t('tool-typing.ui.readyTitle')}
                </h3>
                <p className="mt-1 text-sm text-text-muted">
                  {t('tool-typing.ui.readyDescription')}
                </p>
                {customTemplateMissing && (
                  <p className="mt-1 text-xs font-semibold text-amber-600">
                    {t('tool-typing.ui.customMissing')}
                  </p>
                )}
              </div>
              <Button
                variant="primary"
                onClick={focusInput}
                disabled={customTemplateMissing}
                className="w-full shrink-0 sm:w-auto"
              >
                {t('tool-typing.ui.startTest')}
              </Button>
            </section>
          )}

          {/* Active stats display */}
          {isTesting && (
            <div className="flex justify-between items-center bg-card border border-border rounded-xl px-5 py-3 shadow-sm select-none gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xl md:text-2xl font-bold text-accent font-mono">
                  {/* Template time mode */}
                  {mode === 'template' && testType === 'time' && selectedPreset !== 'custom' && `${timeLeft}`}
                  {/* Template custom preset mode (progress & time) */}
                  {mode === 'template' && selectedPreset === 'custom' && (
                    <span className="flex items-center gap-2">
                      <span className="text-sm text-text-muted font-sans font-medium">
                        {activeLang === 'chinese' ? `${currentIndex}/${templateText.length}` : `${activeWordIdx}/${wordsList.length}`}
                      </span>
                      <span>{`${elapsedTime}s`}</span>
                    </span>
                  )}
                  {/* Template words mode */}
                  {mode === 'template' && testType === 'words' && selectedPreset !== 'custom' && (activeLang === 'chinese' ? `${currentIndex}/${templateText.length}` : `${activeWordIdx}/${wordsList.length}`)}
                  {/* Free mode - timer countdown */}
                  {mode === 'free' && freeStopMode === 'time' && `${timeLeft}`}
                  {/* Free mode - word count progress */}
                  {mode === 'free' && freeStopMode === 'words' && (() => {
                    const cjkCount = (typedText.match(/[\u4e00-\u9fa5\u3040-\u30ff\u31f0-\u31ff]/g) || []).length;
                    const engWords = typedText.replace(/[\u4e00-\u9fa5\u3040-\u30ff\u31f0-\u31ff]/g, ' ').split(/\s+/).filter(Boolean).length;
                    return `${cjkCount + engWords}/${freeWordTarget}`;
                  })()}
                  {/* Free mode - manual (elapsed time) */}
                  {mode === 'free' && freeStopMode === 'manual' && `${elapsedTime}s`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 md:gap-3 text-[10px] md:text-xs font-bold uppercase tracking-wider text-text-muted">
                <div className="bg-app border border-border px-2.5 py-1 rounded-md">
                  {t('tool-typing.ui.wpm')}: <span className="text-text-main font-mono text-sm">{wpm}</span>
                </div>
                {activeLang !== 'chinese' && cpm !== null && (
                  <div className="bg-app border border-border px-2.5 py-1 rounded-md">
                    {t('tool-typing.ui.cpm')}: <span className="text-text-main font-mono text-sm">{cpm}</span>
                  </div>
                )}
                {mode === 'template' && (
                  <div className="bg-app border border-border px-2.5 py-1 rounded-md">
                    {t('tool-typing.ui.accuracy')}: <span className="text-text-main font-mono text-sm">{accuracy}%</span>
                  </div>
                )}
                <div className="bg-app border border-border px-2.5 py-1 rounded-md">
                  {t('tool-typing.ui.corrections')}: <span className="text-text-main font-mono text-sm">{backspacesPressed}</span>
                </div>
                {testType !== 'time' && (
                  <div className="bg-app border border-border px-2.5 py-1 rounded-md">
                    {t('tool-typing.ui.time')}: <span className="text-text-main font-mono text-sm">{elapsedTime}s</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hidden input catcher */}
          <textarea
            ref={inputRef}
            className="absolute -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
            value={typedText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionUpdate={handleCompositionUpdate}
            onCompositionEnd={handleCompositionEnd}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            aria-label={t('tool-typing.ui.typingInputAria')}
            placeholder={mode === 'free' ? t('tool-typing.ui.clickToStart') : ''}
          />

          {mode === 'template' ? (
            /* Template typing container */
            <div 
              className={`relative flex h-[240px] cursor-text flex-col justify-center overflow-y-auto rounded-2xl border border-border bg-card p-5 transition-all duration-300 md:h-[220px] md:p-6 ${
                isInputFocused ? 'ring-2 ring-accent/30 border-accent' : ''
              } ${isCodeMode ? 'bg-[#0f141c] dark:bg-[#0f141c] border-indigo-500/20' : ''}`}
              onClick={focusInput}
            >
              {!isInputFocused && !isTesting && (
                <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center z-20 cursor-pointer select-none transition-all duration-300">
                  <div className="flex flex-col items-center gap-2 text-white font-semibold text-center px-4">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" className="animate-bounce">
                      <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"></path>
                    </svg>
                    <span>{t('tool-typing.ui.startHint')}</span>
                  </div>
                </div>
              )}

              {isCodeMode ? (
                /* IDE Code Mode Layout */
                <div className="font-mono text-left w-full relative">
                  <div className="absolute top-[-12px] right-[-12px] md:top-[-20px] md:right-[-20px] text-[10px] font-bold text-slate-400 bg-white/10 dark:bg-black/20 px-2 py-0.5 rounded border border-border uppercase tracking-wider z-10 select-none">
                    {codeLanguage}
                  </div>
                  <div className="flex flex-col gap-0.5 font-mono text-sm leading-relaxed">
                    {codeLines.map((line) => (
                      <div key={line.lineIndex} className="flex items-start w-full">
                        <span className="w-9 text-right mr-5 text-slate-500 font-mono text-xs select-none opacity-60 shrink-0">{line.lineIndex + 1}</span>
                        <span className="flex-1 whitespace-pre-wrap break-all">
                          {line.chars.map((charObj) => {
                            const { char, globalIdx, isNewline } = charObj;

                            let charStyle = 'text-slate-500';
                            if (globalIdx < typedText.length) {
                              charStyle = typedText[globalIdx] === char ? 'text-slate-100' : 'text-red-500 bg-red-500/15 rounded-sm';
                            }

                            const isCursorHere = globalIdx === typedText.length;

                            if (isNewline) {
                              return (
                                <span 
                                  key={globalIdx} 
                                  className={`relative inline-block font-bold ml-0.5 text-xs text-slate-500 select-none opacity-40 ${charStyle}`}
                                >
                                  {isCursorHere && isInputFocused && (
                                    <span className="absolute left-0 top-[10%] h-[80%] w-[2.5px] bg-accent animate-pulse">
                                      {compositionText && (
                                        <span className="absolute left-0 top-full bg-slate-900 border-b-2 border-dashed border-accent text-xs leading-none p-1 rounded text-accent whitespace-nowrap z-10">{compositionText}</span>
                                      )}
                                    </span>
                                  )}
                                  ↵
                                </span>
                              );
                            }

                            if (char === ' ') {
                              return (
                                <span 
                                  key={globalIdx} 
                                  className={`relative inline-block ${charStyle}`}
                                >
                                  {isCursorHere && isInputFocused && (
                                    <span className="absolute left-0 top-[10%] h-[80%] w-[2.5px] bg-accent animate-pulse">
                                      {compositionText && (
                                        <span className="absolute left-0 top-full bg-slate-900 border-b-2 border-dashed border-accent text-xs leading-none p-1 rounded text-accent whitespace-nowrap z-10">{compositionText}</span>
                                      )}
                                    </span>
                                  )}
                                  &nbsp;
                                </span>
                              );
                            }

                            return (
                              <span 
                                key={globalIdx} 
                                className={`relative inline-block ${charStyle}`}
                              >
                                {isCursorHere && isInputFocused && (
                                  <span className="absolute left-0 top-[10%] h-[80%] w-[2.5px] bg-accent animate-pulse">
                                    {compositionText && (
                                      <span className="absolute left-0 top-full bg-slate-900 border-b-2 border-dashed border-accent text-xs leading-none p-1 rounded text-accent whitespace-nowrap z-10">{compositionText}</span>
                                    )}
                                  </span>
                                )}
                                {char}
                              </span>
                            );
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Standard Word-wrapping Layout */
                <div className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-lg md:text-xl leading-relaxed select-none break-words text-left relative">
                  {wordsList.map((word) => {
                    const isActive = activeWordIdx === word.id;
                    
                    // Extract typed prefix for this specific word
                    const typedWordPrefix = typedText.slice(word.start, currentIndex);
                    const expectedWord = word.text;

                    // Check if this word has errors so far
                    let hasError = false;
                    const wordTypedLength = Math.min(currentIndex - word.start, word.text.length);
                    if (wordTypedLength > 0) {
                      for (let cIdx = 0; cIdx < wordTypedLength; cIdx++) {
                        if (typedText[word.start + cIdx] !== word.text[cIdx]) {
                          hasError = true;
                          break;
                        }
                      }
                    }

                    return (
                      <span
                        key={word.id}
                        className={`relative rounded px-0.5 transition-all ${
                          isActive ? 'bg-accent/5' : ''
                        } ${hasError ? 'border-b-2 border-red-500/50' : ''}`}
                      >
                        {/* Typo floating tooltip popup */}
                        {isActive && typedWordPrefix.length > 0 && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 dark:bg-slate-950 text-white border border-border/20 text-[10px] md:text-xs rounded px-2.5 py-1 shadow-lg flex items-center gap-1.5 z-35 animate-fade-in pointer-events-none whitespace-nowrap">
                            <span className="text-red-400 line-through">{typedWordPrefix}</span>
                            <span className="text-text-muted opacity-50">🏰</span>
                            <span className="text-green-400 font-bold">{expectedWord}</span>
                          </div>
                        )}

                        {/* Word characters */}
                        {word.chars.map((char, charIdx) => {
                          const globalIdx = word.start + charIdx;
                          let charStyle = 'text-slate-400 dark:text-slate-600';
                          if (globalIdx < typedText.length) {
                            charStyle = typedText[globalIdx] === char ? 'text-text-main' : 'text-red-500 bg-red-500/10 rounded-sm';
                          }
                          
                          const isCursorHere = globalIdx === typedText.length;

                          return (
                            <span key={charIdx} className={`relative inline-block transition-colors ${charStyle}`}>
                              {isCursorHere && isInputFocused && (
                                <span className="absolute left-0 top-[10%] h-[80%] w-[2.5px] bg-accent animate-pulse">
                                  {compositionText && (
                                    <span className="absolute left-0 top-full bg-sidebar border-b-2 border-dashed border-accent text-xs leading-none p-1 rounded text-accent whitespace-nowrap z-10">{compositionText}</span>
                                  )}
                                </span>
                              )}
                              {char}
                            </span>
                          );
                        })}

                        {/* Spacer space rendering */}
                        {word.hasSpaceAfter && (() => {
                          const spaceIdx = word.end;
                          let spaceStyle = 'text-slate-400 dark:text-slate-600';
                          if (spaceIdx < typedText.length) {
                            spaceStyle = typedText[spaceIdx] === ' ' ? 'text-text-main' : 'text-red-500 bg-red-500/25 rounded-sm';
                          }
                          const isCursorHere = spaceIdx === typedText.length;

                          return (
                            <span className={`relative inline-block ${spaceStyle}`}>
                              {isCursorHere && isInputFocused && (
                                <span className="absolute left-0 top-[10%] h-[80%] w-[2.5px] bg-accent animate-pulse">
                                  {compositionText && (
                                    <span className="absolute left-0 top-full bg-sidebar border-b-2 border-dashed border-accent text-xs leading-none p-1 rounded text-accent whitespace-nowrap z-10">{compositionText}</span>
                                  )}
                                </span>
                              )}
                              &nbsp;
                            </span>
                          );
                        })()}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Free typing container */
            <div className={`relative border border-border rounded-2xl p-1 bg-card overflow-hidden ${paused ? 'pointer-events-none' : ''}`}>
              {paused && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-white select-none gap-2">
                  <span className="text-xl font-bold">⏸ {t('tool-typing.ui.paused')}</span>
                  <span className="text-xs text-slate-300">{t('tool-typing.ui.resumeHint')}</span>
                </div>
              )}
              <textarea
                ref={inputRef}
                className="w-full bg-transparent border-none text-text-main outline-none resize-none p-5 font-mono text-base placeholder-text-muted/40 min-h-[140px]"
                rows={6}
                placeholder={t('tool-typing.ui.freePlaceholder')}
                aria-label={t('tool-typing.ui.typingInputAria')}
                value={typedText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionUpdate={handleCompositionUpdate}
                onCompositionEnd={handleCompositionEnd}
                disabled={paused}
              />
            </div>
          )}

          {/* New Text Refresh Button */}
          {!testFinished && !isTesting && (
            <div className="flex justify-center">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={refreshTemplate} 
                title={t('tool-typing.ui.refreshTitle')}
                className="flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
                <span>{t('tool-typing.ui.newText')}</span>
              </Button>
            </div>
          )}

          {/* Test controls */}
          {(isTesting || typedText.length > 0) && (
            <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
              {isTesting && (
                <Button variant="secondary" onClick={() => setPaused(!paused)} title={mode === 'free' ? t('tool-typing.ui.pauseTitle') : ''}>
                  <span>{t(paused ? 'tool-typing.ui.resume' : 'tool-typing.ui.pause')}</span>
                  {mode === 'free' && !paused && <span className="opacity-50 text-[10px] ml-1.5 font-mono bg-white/10 px-1 rounded">Ctrl+↵</span>}
                </Button>
              )}
              {(isTesting || typedText.length > 0) && (
                <Button variant="primary" onClick={() => {
                  const currentElapsed = Math.round((Date.now() - startTimeRef.current) / 1000) || 1;
                  finishTest(typedText, currentElapsed);
                }}>
                  {t('tool-typing.ui.stopComplete')}
                </Button>
              )}
              <Button variant="secondary" onClick={resetTest}>
                {t('tool-typing.ui.restart')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Results screen */
        <div className="flex flex-col gap-6 items-center">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl flex flex-col gap-6 shadow-sm">
            <h3 className="text-lg font-bold text-text-main text-center border-b border-border pb-3">{t('tool-typing.ui.completed')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-app border border-border/60 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{t('tool-typing.ui.wpmNet')}</span>
                <span className="text-3xl font-extrabold text-accent font-mono">{wpm}</span>
              </div>
              {activeLang !== 'chinese' && cpm !== null && (
                <div className="bg-app border border-border/60 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{t('tool-typing.ui.cpmSpeed')}</span>
                  <span className="text-2xl font-extrabold text-text-main font-mono">{cpm}</span>
                </div>
              )}
              {mode === 'template' && (
                <div className="bg-app border border-border/60 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{t('tool-typing.ui.accuracy')}</span>
                  <span className="text-2xl font-extrabold text-text-main font-mono">{accuracy}%</span>
                </div>
              )}
              <div className="bg-app border border-border/60 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{t('tool-typing.ui.timeSpent')}</span>
                <span className="text-2xl font-extrabold text-text-main font-mono">{elapsedTime}s</span>
              </div>
              <div className="bg-app border border-border/60 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{t('tool-typing.ui.corrections')}</span>
                <span className="text-2xl font-extrabold text-text-main font-mono">{backspacesPressed}</span>
              </div>
              <div className="bg-app border border-border/60 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{t('tool-typing.ui.correctionRate')}</span>
                <span className="text-2xl font-extrabold text-text-main font-mono">{correctionRate}%</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 border-t border-border pt-4">
              <Button
                variant="primary"
                onClick={saveResult}
                disabled={resultsSaved}
              >
                {t(resultsSaved ? 'tool-typing.ui.resultSaved' : 'tool-typing.ui.saveResult')}
              </Button>
              <Button variant="secondary" onClick={resetTest}>
                {t('tool-typing.ui.tryAgain')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* History Dashboard */}
      <div className={`${history.length === 0 ? 'hidden' : 'mt-2 flex' } flex-col gap-2 border-t border-border pt-3`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-sm font-bold text-text-main">{t('tool-typing.ui.recentResults')}</h3>
          {history.length > 0 && (
            <div className="flex items-center gap-3">
              <button className="text-xs font-bold text-accent hover:text-accent-hover cursor-pointer bg-transparent border-none" onClick={exportHistory}>
                {t('tool-typing.ui.exportHistory')}
              </button>
              <button className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer bg-transparent border-none" onClick={clearHistory}>
                {t('tool-typing.ui.clearAll')}
              </button>
            </div>
          )}
        </div>

        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card py-3 text-center text-xs text-text-muted">{t('tool-typing.ui.noResults')}</p>
        ) : (
          <div className="w-full overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full border-collapse text-left text-xs text-text-main">
              <thead>
                <tr className="border-b border-border bg-app/50 text-[10px] font-bold uppercase tracking-wider text-text-muted select-none">
                  <th className="p-3.5 pl-4">{t('tool-typing.ui.date')}</th>
                  <th className="p-3.5">{t('tool-typing.ui.mode')}</th>
                  <th className="p-3.5">{t('tool-typing.ui.language')}</th>
                  <th className="p-3.5">WPM</th>
                  <th className="p-3.5">CPM</th>
                  <th className="p-3.5">{t('tool-typing.ui.accuracy')}</th>
                  <th className="p-3.5">{t('tool-typing.ui.backspaces')}</th>
                  <th className="p-3.5">{t('tool-typing.ui.correctionRate')}</th>
                  <th className="p-3.5 pr-4">{t('tool-typing.ui.time')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-app/20 transition-colors">
                    <td className="p-3.5 pl-4 text-text-muted whitespace-nowrap">{formatHistoryDate(h.date)}</td>
                    <td className="p-3.5 capitalize">{h.mode === 'free'
                      ? t('tool-typing.ui.freeTyping')
                      : h.mode === 'template'
                        ? t('tool-typing.ui.template')
                        : h.mode}</td>
                    <td className="p-3.5 capitalize">{h.language === 'chinese'
                      ? t('tool-typing.ui.chinese')
                      : h.language === 'englishCode'
                        ? t('tool-typing.ui.englishCode')
                        : h.language}</td>
                    <td className="p-3.5 font-bold font-mono text-accent text-sm">{h.wpm}</td>
                    <td className="p-3.5 font-mono">{h.cpm}</td>
                    <td className="p-3.5 font-mono">{formatHistoryPercent(h.accuracy)}</td>
                    <td className="p-3.5 font-mono text-text-muted">{h.corrections}</td>
                    <td className="p-3.5 font-mono text-text-muted">{formatHistoryPercent(h.correctionRate)}</td>
                    <td className="p-3.5 font-mono pr-4">{formatHistoryDuration(h.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
