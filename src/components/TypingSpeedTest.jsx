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
    text: 'const calculateWpm = (chars, time) => { const minutes = time / 60; return Math.round((chars / 5) / minutes); }; console.log("WPM Speed:", calculateWpm(250, 60));'
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
  const [language, setLanguage] = useState('auto'); // 'auto', 'english', 'chinese'
  const [duration, setDuration] = useState('30'); // '15', '30', '60', 'unlimited'
  const [selectedPreset, setSelectedPreset] = useState('english'); // 'english', 'chinese', 'code', 'custom'
  const [customText, setCustomText] = useState('');
  
  // Active template state
  const [templateText, setTemplateText] = useState(PRESETS.english.text);

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
      setTemplateText(customText.trim() || 'Please enter or upload some custom text first...');
    } else if (PRESETS[selectedPreset]) {
      setTemplateText(PRESETS[selectedPreset].text);
    }
    resetTest();
  }, [selectedPreset, customText]);

  // Determine active language (either explicit or auto-detected)
  const activeLang = useMemo(() => {
    if (language !== 'auto') return language;
    return detectLanguage(mode === 'free' ? typedText : templateText);
  }, [language, mode, typedText, templateText]);

  // Set default duration when template/free mode changes
  useEffect(() => {
    if (mode === 'free') {
      if (duration === 'unlimited') {
        setDuration('30');
      }
    }
    resetTest();
  }, [mode]);

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
    setTimeLeft(duration === 'unlimited' ? 0 : Number(duration));
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

        if (duration !== 'unlimited') {
          const remaining = Number(duration) - elapsed;
          if (remaining <= 0) {
            setTimeLeft(0);
            finishTest(typedTextRef.current, Number(duration));
          } else {
            setTimeLeft(remaining);
          }
        } else {
          setTimeLeft(elapsed); // count up in unlimited mode
        }
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [isTesting, paused, testFinished, duration]);

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

      {/* Settings Panel */}
      {!isTesting && !testFinished && (
        <div className="typing-settings-panel">
          <div className="settings-grid">
            <div className="setting-control">
              <label>Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="auto">Auto Detect</option>
                <option value="english">English / Code</option>
                <option value="chinese">Chinese</option>
              </select>
            </div>

            <div className="setting-control">
              <label>Timer Duration</label>
              <select value={duration} onChange={(e) => { setDuration(e.target.value); setTimeLeft(e.target.value === 'unlimited' ? 0 : Number(e.target.value)); }}>
                <option value="15">15 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
                {mode === 'template' && <option value="unlimited">Finish Template</option>}
              </select>
            </div>

            {mode === 'template' && (
              <div className="setting-control">
                <label>Template Preset</label>
                <select value={selectedPreset} onChange={(e) => setSelectedPreset(e.target.value)}>
                  <option value="english">English Paragraph</option>
                  <option value="chinese">Chinese Classic</option>
                  <option value="code">Javascript Code</option>
                  <option value="custom">Custom Text / Uploaded File</option>
                </select>
              </div>
            )}
          </div>

          {mode === 'template' && selectedPreset === 'custom' && (
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
                  {duration === 'unlimited' ? `${timeLeft}s` : timeLeft}
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
              className={`typing-template-container ${isInputFocused ? 'focused' : ''}`}
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
                <button className="secondary-btn" onClick={() => setPaused(!paused)}>
                  {paused ? 'Resume' : 'Pause'}
                </button>
              )}
              <button className="primary-btn accent" onClick={resetTest}>
                Restart Test
              </button>
              {!isTesting && typedText.length > 0 && (
                <button className="primary-btn" onClick={() => finishTest(typedText, elapsedTime || 1)}>
                  Complete Test
                </button>
              )}
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
                className="primary-btn accent"
                onClick={saveResult}
                disabled={resultsSaved}
              >
                {resultsSaved ? 'Result Saved!' : 'Save Result'}
              </button>
              <button className="secondary-btn" onClick={resetTest}>
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
