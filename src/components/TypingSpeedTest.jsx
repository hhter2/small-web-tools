import React, { useState, useEffect, useRef, useMemo } from 'react';

// Preset templates
const PRESETS = {
  english: {
    name: 'English Paragraph',
    text: 'The quick brown fox jumps over the lazy dog. A journey of a thousand miles begins with a single step. To be or not to be, that is the question. The only thing we have to fear is fear itself. All that glitters is not gold. Ask not what your country can do for you, ask what you can do for your country. Life is what happens when you are busy making other plans.'
  },
  chinese: {
    name: 'Chinese Classic',
    text: '天將降大任於是人也，必先苦其心志，勞其筋骨，餓其體膚，空乏其身，行拂亂其所為，所以動心忍性，曾益其所不能。學而時習之，不亦說乎？有朋自遠方來，不亦樂乎？人不知而不慍，不亦君子乎？'
  },
  code: {
    name: 'Javascript Code',
    text: `const calculateWpm = (chars, time) => {
  const minutes = time / 60;
  return Math.round((chars / 5) / minutes);
};

console.log("WPM Speed:", calculateWpm(250, 60));`
  }
};

// Parse template into words with positions
const parseTemplate = (text, isChinese) => {
  const words = [];
  if (isChinese) {
    // Chinese characters: each CJK character is treated as a separate "word" for tooltip positioning
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      words.push({
        id: i,
        text: char,
        start: i,
        end: i + 1,
        chars: [char],
        hasSpaceAfter: false
      });
    }
  } else {
    // English/Code space-separated words
    let wordStart = 0;
    let currentWord = [];
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (/\s/.test(char)) {
        if (currentWord.length > 0) {
          words.push({
            id: words.length,
            text: currentWord.join(''),
            start: wordStart,
            end: i,
            chars: [...currentWord],
            hasSpaceAfter: char === ' '
          });
          currentWord = [];
        }
        wordStart = i + 1;
      } else {
        if (currentWord.length === 0) {
          wordStart = i;
        }
        currentWord.push(char);
      }
    }
    if (currentWord.length > 0) {
      words.push({
        id: words.length,
        text: currentWord.join(''),
        start: wordStart,
        end: text.length,
        chars: [...currentWord],
        hasSpaceAfter: false
      });
    }
  }
  return words;
};

// Check if a text has CJK characters
const detectLanguage = (text) => {
  const cjkRegex = /[\u4e00-\u9fa5\u3040-\u30ff\u31f0-\u31ff]/;
  return cjkRegex.test(text) ? 'chinese' : 'english';
};

export default function TypingSpeedTest() {
  // Configuration states
  const [mode, setMode] = useState('template'); // 'free' or 'template'
  const [testType, setTestType] = useState('time'); // 'time' | 'words' | 'complete'
  const [wordTarget, setWordTarget] = useState('25'); // '10' | '25' | '50' | '100'
  const [language, setLanguage] = useState('auto'); // 'auto', 'english', 'chinese'
  const [duration, setDuration] = useState('30'); // '15', '30', '60'
  const [selectedPreset, setSelectedPreset] = useState('english'); // 'english', 'chinese', 'code', 'custom'
  const [customText, setCustomText] = useState('');
  
  const [showPunctuation, setShowPunctuation] = useState(true);
  const [showNumbers, setShowNumbers] = useState(true);
  
  // Base raw template text
  const [rawTemplateText, setRawTemplateText] = useState(PRESETS.english.text);

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

  // Handle Preset changes
  useEffect(() => {
    if (selectedPreset === 'custom') {
      setRawTemplateText(customText.trim() || 'Please enter or upload some custom text first...');
    } else if (PRESETS[selectedPreset]) {
      setRawTemplateText(PRESETS[selectedPreset].text);
    }
    resetTest();
  }, [selectedPreset, customText]);

  // Determine active language (either explicit or auto-detected)
  const activeLang = useMemo(() => {
    if (selectedPreset === 'english' || selectedPreset === 'code') return 'english';
    if (selectedPreset === 'chinese') return 'chinese';
    if (language !== 'auto') return language;
    return detectLanguage(mode === 'free' ? typedText : rawTemplateText);
  }, [language, mode, typedText, rawTemplateText, selectedPreset]);

  // Sliced template text based on mode and settings, applying punctuation and number filters
  const templateText = useMemo(() => {
    if (mode === 'free') return '';
    
    let baseText = rawTemplateText.replace(/\r\n/g, '\n');
    
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

    if (testType !== 'words') return baseText;

    const isChinese = activeLang === 'chinese';
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
  }, [rawTemplateText, testType, wordTarget, activeLang, mode, showPunctuation, showNumbers, isCodeMode]);

  // Reset test when configuration changes
  useEffect(() => {
    resetTest();
  }, [mode, testType, wordTarget, duration, language, showPunctuation, showNumbers]);

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
    setTimeLeft(testType === 'time' ? Number(duration) : 0);
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

        if (testType === 'time') {
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
  }, [isTesting, paused, testFinished, testType, duration]);

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
  };

  // Metrics calculators
  const wpm = useMemo(() => {
    const timeSec = elapsedTime || (isTesting ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0) || 1;
    const minutes = timeSec / 60;

    if (mode === 'free') {
      // Free mode mixed parser
      const cjkMatches = typedText.match(/[\u4e00-\u9fa5\u3040-\u30ff\u31f0-\u31ff]/g);
      const cjkCount = cjkMatches ? cjkMatches.length : 0;
      const cleanEnglish = typedText.replace(/[\u4e00-\u9fa5\u3040-\u30ff\u31f0-\u31ff]/g, ' ');
      const wordsEng = cleanEnglish.split(/\s+/).filter(Boolean).length;
      
      if (activeLang === 'chinese') {
        return Math.round((cjkCount + wordsEng) / minutes);
      } else {
        // Standard (chars / 5) / minutes
        return Math.round((typedText.length / 5) / minutes);
      }
    } else {
      // Template mode calculations
      let correctCharCount = 0;
      const limit = Math.min(typedText.length, templateText.length);
      for (let i = 0; i < limit; i++) {
        if (typedText[i] === templateText[i]) {
          correctCharCount += 1;
        }
      }

      if (activeLang === 'chinese') {
        // 1 CJK character = 1 Word
        return Math.round(correctCharCount / minutes);
      } else {
        // English/Code standard
        return Math.round((correctCharCount / 5) / minutes);
      }
    }
  }, [typedText, templateText, mode, activeLang, elapsedTime, isTesting]);

  const cpm = useMemo(() => {
    if (activeLang === 'chinese') return null; // Hide CPM for Chinese

    const timeSec = elapsedTime || (isTesting ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0) || 1;
    const minutes = timeSec / 60;
    return Math.round(typedText.length / minutes);
  }, [typedText, elapsedTime, isTesting, activeLang]);

  const accuracy = useMemo(() => {
    if (mode === 'free') return null;
    if (totalKeystrokes === 0) return 100;
    return Math.round((correctKeystrokes / totalKeystrokes) * 100);
  }, [mode, correctKeystrokes, totalKeystrokes]);

  const correctionRate = useMemo(() => {
    const totalInputActions = totalKeystrokes + backspacesPressed;
    if (totalInputActions === 0) return 0;
    return Math.round((backspacesPressed / totalInputActions) * 100);
  }, [totalKeystrokes, backspacesPressed]);

  // Save Results to history list
  const saveResult = () => {
    if (resultsSaved) return;

    const newResult = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      mode: mode === 'free' ? 'Free Typing' : 'Template',
      language: activeLang === 'chinese' ? 'Chinese' : 'English/Code',
      wpm,
      cpm: activeLang === 'chinese' ? '-' : cpm,
      accuracy: mode === 'free' ? '-' : `${accuracy}%`,
      corrections: backspacesPressed,
      correctionRate: `${correctionRate}%`,
      duration: `${elapsedTime}s`
    };

    const updated = [newResult, ...history];
    setHistory(updated);
    try {
      localStorage.setItem('typing_test_history', JSON.stringify(updated));
    } catch (e) {}
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
    if (window.confirm("Are you sure you want to clear your typing test history?")) {
      setHistory([]);
      try {
        localStorage.removeItem('typing_test_history');
      } catch (e) {}
    }
  };

  // Handle template file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result || '';
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

  return (
    <article id="tool-typing" className="tool-card tool-card--wide active">
      <div className="typing-header-row">
        <h2>Typing Speed Test</h2>
        <div className="typing-modes-tabs">
          <button
            className={`tab-btn ${mode === 'template' ? 'active' : ''}`}
            onClick={() => setMode('template')}
          >
            Template Mode
          </button>
          <button
            className={`tab-btn ${mode === 'free' ? 'active' : ''}`}
            onClick={() => setMode('free')}
          >
            Free Typing
          </button>
        </div>
      </div>

      {/* Settings Panel styled like Monkeytype */}
      {!isTesting && !testFinished && (
        <div className="typing-config-container">
          <div className="typing-config-bar">
            {/* Preset Selector */}
            <div className="config-group">
              {['english', 'chinese', 'code', 'custom'].map((preset) => (
                <div
                  key={preset}
                  className={`config-item ${selectedPreset === preset ? 'active' : ''}`}
                  onClick={() => setSelectedPreset(preset)}
                >
                  {preset === 'custom' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px', marginRight: '4px' }}>
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                    </svg>
                  )}
                  <span>{preset}</span>
                </div>
              ))}
            </div>

            {/* Language Selector (Only shown if custom is selected) */}
            {selectedPreset === 'custom' && (
              <>
                <div className="config-separator"></div>
                <div className="config-group">
                  {['auto', 'english', 'chinese'].map((lang) => (
                    <div
                      key={lang}
                      className={`config-item ${language === lang ? 'active' : ''}`}
                      onClick={() => setLanguage(lang)}
                    >
                      <span>{lang === 'auto' ? 'auto' : lang === 'english' ? 'en' : 'zh'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sub Configuration Bar for extra settings */}
          <div className="typing-sub-config-bar">
            {/* Punctuation & Numbers (Only in Template Mode and when not code preset) */}
            {mode === 'template' && selectedPreset !== 'code' && (
              <>
                <div className="config-group">
                  <div 
                    className={`config-item ${showPunctuation ? 'active' : ''}`}
                    onClick={() => setShowPunctuation(!showPunctuation)}
                  >
                    <span className="icon">@</span>
                    <span>punctuation</span>
                  </div>
                  <div 
                    className={`config-item ${showNumbers ? 'active' : ''}`}
                    onClick={() => setShowNumbers(!showNumbers)}
                  >
                    <span className="icon">#</span>
                    <span>numbers</span>
                  </div>
                </div>
                <div className="config-separator"></div>
              </>
            )}

            {/* Test Modes (Template Mode vs Free Mode) */}
            {mode === 'template' ? (
              <div className="config-group">
                <div 
                  className={`config-item ${testType === 'time' ? 'active' : ''}`}
                  onClick={() => setTestType('time')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '13px', height: '13px', marginRight: '4px' }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>time</span>
                </div>
                <div 
                  className={`config-item ${testType === 'words' ? 'active' : ''}`}
                  onClick={() => setTestType('words')}
                >
                  <span style={{ fontWeight: '800', fontSize: '0.85rem', marginRight: '4px' }}>A</span>
                  <span>words</span>
                </div>
                <div 
                  className={`config-item ${testType === 'complete' ? 'active' : ''}`}
                  onClick={() => setTestType('complete')}
                >
                  <span style={{ fontWeight: '800', fontSize: '0.85rem', lineHeight: 1, marginRight: '4px' }}>“</span>
                  <span>complete</span>
                </div>
              </div>
            ) : (
              <div className="config-group">
                <div className="config-item active">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '13px', height: '13px', marginRight: '4px' }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>free typing time mode</span>
                </div>
              </div>
            )}

            <div className="config-separator"></div>

            {/* Test Targets */}
            <div className="config-group">
              {((mode === 'template' && testType === 'time') || mode === 'free') && (
                <>
                  {['15', '30', '60'].map((t) => (
                    <div
                      key={t}
                      className={`config-item ${duration === t ? 'active' : ''}`}
                      onClick={() => setDuration(t)}
                    >
                      <span>{t}</span>
                    </div>
                  ))}
                </>
              )}

              {mode === 'template' && testType === 'words' && (
                <>
                  {['10', '25', '50', '100'].map((w) => (
                    <div
                      key={w}
                      className={`config-item ${wordTarget === w ? 'active' : ''}`}
                      onClick={() => setWordTarget(w)}
                    >
                      <span>{w}</span>
                    </div>
                  ))}
                </>
              )}

              {mode === 'template' && testType === 'complete' && (
                <div className="config-item active">
                  <span>full</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isTesting && !testFinished && mode === 'template' && selectedPreset === 'custom' && (
        <div className="custom-template-input-container">
          <div className="form-group">
            <label htmlFor="custom-paste-text">Paste Custom Template Text</label>
            <textarea
              id="custom-paste-text"
              rows="3"
              placeholder="Paste template text here..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
            />
          </div>
          <div className="file-upload-group">
            <span className="upload-label">Or upload a TXT file:</span>
            <input
              type="file"
              id="template-file-picker"
              accept=".txt"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      )}

      {/* Main Test Interface */}
      {!testFinished ? (
        <div className="typing-stage-area">
          {/* Active stats display */}
          {isTesting && (
            <div className="live-indicators">
              <div className="live-timer-container">
                <span className="live-timer">
                  {testType === 'time' && `${timeLeft}`}
                  {testType === 'words' && (activeLang === 'chinese' ? `${currentIndex}/${templateText.length}` : `${activeWordIdx}/${wordsList.length}`)}
                  {testType === 'complete' && `${timeLeft}s`}
                </span>
              </div>
              <div className="live-stat-badges">
                <div className="badge">
                  WPM: <span className="val">{wpm}</span>
                </div>
                {activeLang !== 'chinese' && cpm !== null && (
                  <div className="badge">
                    CPM: <span className="val">{cpm}</span>
                  </div>
                )}
                {mode === 'template' && (
                  <div className="badge">
                    Accuracy: <span className="val">{accuracy}%</span>
                  </div>
                )}
                <div className="badge">
                  Corrections: <span className="val">{backspacesPressed}</span>
                </div>
                {testType !== 'time' && (
                  <div className="badge">
                    Time: <span className="val">{elapsedTime}s</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hidden input catcher */}
          <textarea
            ref={inputRef}
            className="typing-input-catcher"
            value={typedText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionUpdate={handleCompositionUpdate}
            onCompositionEnd={handleCompositionEnd}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder={mode === 'free' ? "Click here and start typing to begin test..." : ""}
          />

          {mode === 'template' ? (
            /* Template typing container */
            <div 
              className={`typing-template-container ${isInputFocused ? 'focused' : ''} ${isCodeMode ? 'code-mode-editor' : ''}`}
              onClick={focusInput}
            >
              {!isInputFocused && !isTesting && (
                <div className="focus-overlay">
                  <div className="focus-message">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"></path>
                    </svg>
                    <span>Click here to focus and start typing</span>
                  </div>
                </div>
              )}

              {isCodeMode ? (
                /* IDE Code Mode Layout */
                <div className="typing-code-block">
                  {codeLines.map((line) => (
                    <div key={line.lineIndex} className="code-line">
                      <span className="line-number">{line.lineIndex + 1}</span>
                      <span className="line-content">
                        {line.chars.map((charObj) => {
                          const { char, globalIdx, isNewline } = charObj;

                          let charClass = 'untyped';
                          if (globalIdx < typedText.length) {
                            charClass = typedText[globalIdx] === char ? 'correct' : 'incorrect';
                          }

                          const isCursorHere = globalIdx === typedText.length;

                          if (isNewline) {
                            return (
                              <span 
                                key={globalIdx} 
                                className={`char newline-char ${charClass}`}
                              >
                                {isCursorHere && isInputFocused && (
                                  <span className="caret">
                                    {compositionText && (
                                      <span className="ime-composition">{compositionText}</span>
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
                                className={`char space-char ${charClass}`}
                              >
                                {isCursorHere && isInputFocused && (
                                  <span className="caret">
                                    {compositionText && (
                                      <span className="ime-composition">{compositionText}</span>
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
                              className={`char ${charClass}`}
                            >
                              {isCursorHere && isInputFocused && (
                                <span className="caret">
                                  {compositionText && (
                                    <span className="ime-composition">{compositionText}</span>
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
              ) : (
                /* Standard Word-wrapping Layout */
                <div className="typing-text-wrapper">
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
                        className={`typing-word ${isActive ? 'active' : ''} ${hasError ? 'error' : ''}`}
                      >
                        {/* Typo floating tooltip popup matching screenshot layout */}
                        {isActive && typedWordPrefix.length > 0 && (
                          <div className="typing-tooltip">
                            <span className="tooltip-typed">{typedWordPrefix}</span>
                            <span className="tooltip-divider">🏰</span>
                            <span className="tooltip-expected">{expectedWord}</span>
                          </div>
                        )}

                        {/* Word characters */}
                        {word.chars.map((char, charIdx) => {
                          const globalIdx = word.start + charIdx;
                          let charClass = 'untyped';
                          if (globalIdx < typedText.length) {
                            charClass = typedText[globalIdx] === char ? 'correct' : 'incorrect';
                          }
                          
                          const isCursorHere = globalIdx === typedText.length;

                          return (
                            <span key={charIdx} className={`char ${charClass}`}>
                              {isCursorHere && isInputFocused && (
                                <span className="caret">
                                  {compositionText && (
                                    <span className="ime-composition">{compositionText}</span>
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
                          let spaceClass = 'untyped';
                          if (spaceIdx < typedText.length) {
                            spaceClass = typedText[spaceIdx] === ' ' ? 'correct' : 'incorrect';
                          }
                          const isCursorHere = spaceIdx === typedText.length;

                          return (
                            <span className={`char space ${spaceClass}`}>
                              {isCursorHere && isInputFocused && (
                                <span className="caret">
                                  {compositionText && (
                                    <span className="ime-composition">{compositionText}</span>
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
            <div className="free-typing-container">
              <textarea
                className="free-typing-textarea"
                rows="6"
                placeholder="Start typing here... Timer will begin automatically on the first keystroke."
                value={typedText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionUpdate={handleCompositionUpdate}
                onCompositionEnd={handleCompositionEnd}
              />
            </div>
          )}

          {/* Test controls */}
          {(isTesting || typedText.length > 0) && (
            <div className="test-control-actions">
              {isTesting && (
                <button className="btn-secondary" onClick={() => setPaused(!paused)}>
                  {paused ? 'Resume' : 'Pause'}
                </button>
              )}
              {typedText.length > 0 && (
                <button className="btn-primary" onClick={() => {
                  const currentElapsed = Math.round((Date.now() - startTimeRef.current) / 1000) || 1;
                  finishTest(typedText, currentElapsed);
                }}>
                  Stop &amp; Complete
                </button>
              )}
              <button className="btn-secondary" onClick={resetTest}>
                Restart Test
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Results screen */
        <div className="typing-results-dashboard">
          <div className="results-card">
            <h3>Test Completed!</h3>
            <div className="metrics-grid">
              <div className="metric-box">
                <span className="label">WPM (Net Speed)</span>
                <span className="value accent-val">{wpm}</span>
              </div>
              {activeLang !== 'chinese' && cpm !== null && (
                <div className="metric-box">
                  <span className="label">CPM (Char Speed)</span>
                  <span className="value">{cpm}</span>
                </div>
              )}
              {mode === 'template' && (
                <div className="metric-box">
                  <span className="label">Accuracy</span>
                  <span className="value">{accuracy}%</span>
                </div>
              )}
              <div className="metric-box">
                <span className="label">Time Spent</span>
                <span className="value">{elapsedTime}s</span>
              </div>
              <div className="metric-box">
                <span className="label">Corrections</span>
                <span className="value">{backspacesPressed}</span>
              </div>
              <div className="metric-box">
                <span className="label">Correction Rate</span>
                <span className="value">{correctionRate}%</span>
              </div>
            </div>

            <div className="results-actions">
              <button
                className="btn-primary"
                onClick={saveResult}
                disabled={resultsSaved}
              >
                {resultsSaved ? 'Result Saved!' : 'Save Result'}
              </button>
              <button className="btn-secondary" onClick={resetTest}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Dashboard */}
      <div className="typing-history-section">
        <div className="history-header">
          <h3>Recent typing test results</h3>
          {history.length > 0 && (
            <div className="history-actions">
              <button className="text-action-btn" onClick={exportHistory}>
                Export History (JSON)
              </button>
              <button className="text-action-btn danger" onClick={clearHistory}>
                Clear All
              </button>
            </div>
          )}
        </div>

        {history.length === 0 ? (
          <p className="no-history-msg">No recent results found. Complete a test and click "Save Result" to build your log.</p>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Language</th>
                  <th>WPM</th>
                  <th>CPM</th>
                  <th>Accuracy</th>
                  <th>Backspaces</th>
                  <th>Correction Rate</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.date}</td>
                    <td>{h.mode}</td>
                    <td>{h.language}</td>
                    <td className="wpm-td">{h.wpm}</td>
                    <td>{h.cpm}</td>
                    <td>{h.accuracy}</td>
                    <td>{h.corrections}</td>
                    <td>{h.correctionRate}</td>
                    <td>{h.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </article>
  );
}
