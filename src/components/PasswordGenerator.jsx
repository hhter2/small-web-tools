import React, { useState, useEffect } from 'react';

/**
 * Generates a cryptographically secure random password.
 * 
 * @param {Object} [options] Configuration options
 * @param {number} [options.length=16] Length of the password (8 to 128)
 * @param {boolean} [options.includeCommonSpecial=true] Whether to include common special characters
 * @param {boolean} [options.includeRareSpecial=true] Whether to include rare special characters
 * @param {boolean} [options.debug=false] If true, returns detailed sampling logs and statistics
 * @returns {string|Object} Generated password string, or object with logs/stats if debug is true
 * @throws {Error} If length is out of range (8 to 128)
 */
function generateSecurePassword(options = {}) {
  const { 
    length = 16, 
    includeCommonSpecial = true, 
    includeRareSpecial = true, 
    debug = false 
  } = options;

  // Validation: Throw a clear error if length is out of the allowed range
  if (!Number.isInteger(length) || length < 8 || length > 128) {
    throw new Error('Password length must be an integer between 8 and 128.');
  }

  // Backward compatibility check for includeSpecialChars
  let useCommon = includeCommonSpecial;
  let useRare = includeRareSpecial;
  if (options.includeSpecialChars !== undefined) {
    useCommon = options.includeSpecialChars;
    useRare = options.includeSpecialChars;
  }

  // Character set definitions
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const commonSpecialChars = '!@#$%^&*()-_=+';
  const rareSpecialChars = '[]{}|;:\',.<>?/~';

  // Always include uppercase, lowercase, and digits. Optionally include special characters.
  let alphabet = lowercase + uppercase + digits;
  if (useCommon) {
    alphabet += commonSpecialChars;
  }
  if (useRare) {
    alphabet += rareSpecialChars;
  }

  const alphabetLength = alphabet.length;

  // Rejection sampling math to eliminate modulo bias:
  // Since 256 is not a multiple of alphabetLength, simply doing `randomByte % alphabetLength`
  // would cause some characters to appear more frequently than others (modulo bias).
  // The biased remainder range starts at the highest multiple of alphabetLength that is <= 256.
  // We calculate this threshold (limit). Any byte >= limit is in the biased range and is discarded.
  const limit = 256 - (256 % alphabetLength);

  let password = '';
  const debugLogs = [];
  let totalBytesDrawn = 0;
  let discardedBytes = 0;

  // Batch prefetch buffer configuration
  const bufferSize = 64;
  const buffer = new Uint8Array(bufferSize);
  let bufferIndex = bufferSize; // Set to bufferSize to trigger initial fill

  // Helper to fetch the next random byte from the prefetched buffer
  const getNextRandomByte = () => {
    if (bufferIndex >= bufferSize) {
      // Refill the buffer using CSPRNG
      const cryptoSrc = typeof window !== 'undefined' 
        ? (window.crypto || window.msCrypto) 
        : (typeof globalThis !== 'undefined' ? globalThis.crypto : null);

      if (!cryptoSrc || !cryptoSrc.getRandomValues) {
        throw new Error('Cryptographically Secure Pseudo-Random Number Generator (CSPRNG) is not supported in this environment.');
      }
      cryptoSrc.getRandomValues(buffer);
      bufferIndex = 0;
    }
    const byte = buffer[bufferIndex];
    bufferIndex++;
    return byte;
  };

  while (password.length < length) {
    const randomVal = getNextRandomByte();
    totalBytesDrawn++;

    // Rejection sampling: Discard any random value that falls in the biased remainder range,
    // and redraw until an unbiased value is obtained.
    if (randomVal >= limit) {
      discardedBytes++;
      if (debug) {
        debugLogs.push({
          byte: randomVal,
          status: 'rejected',
          reason: `Exceeds unbiased limit K = ${limit} (range [${limit}, 255] is biased)`
        });
      }
      continue;
    }

    // Since randomVal is strictly less than limit, mapping is perfectly uniform
    const charIndex = randomVal % alphabetLength;
    const char = alphabet.charAt(charIndex);
    password += char;

    if (debug) {
      debugLogs.push({
        byte: randomVal,
        status: 'accepted',
        charIndex,
        char,
        math: `${randomVal} % ${alphabetLength} = ${charIndex}`
      });
    }
  }

  if (debug) {
    return {
      password,
      logs: debugLogs,
      stats: {
        totalBytesDrawn,
        discardedBytes,
        alphabetSize: alphabetLength,
        theoreticalDiscardRate: ((256 % alphabetLength) / 256) * 100,
        actualDiscardRate: totalBytesDrawn > 0 ? (discardedBytes / totalBytesDrawn) * 100 : 0
      }
    };
  }

  return password;
}

export default function PasswordGenerator({ initialTab = 'generate' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'generate' | 'check'
  const [length, setLength] = useState(16);
  const [includeCommonSpecial, setIncludeCommonSpecial] = useState(true);
  const [includeRareSpecial, setIncludeRareSpecial] = useState(true);
  const [passwordData, setPasswordData] = useState({ password: '', logs: [], stats: {} });
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // States for Strength Checker
  const [checkPassword, setCheckPassword] = useState('');
  const [showCheckPassword, setShowCheckPassword] = useState(false);

  // Generate password with debug info
  const handleGenerate = (
    currentLength = length,
    currentCommon = includeCommonSpecial,
    currentRare = includeRareSpecial
  ) => {
    try {
      const data = generateSecurePassword({
        length: currentLength,
        includeCommonSpecial: currentCommon,
        includeRareSpecial: currentRare,
        debug: true
      });
      setPasswordData(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Generate on mount and when options change
  useEffect(() => {
    handleGenerate(length, includeCommonSpecial, includeRareSpecial);
  }, [length, includeCommonSpecial, includeRareSpecial]);

  const handleLengthSliderChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setLength(val);
    }
  };

  const handleLengthNumberChange = (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) return;
    if (val < 8) val = 8;
    if (val > 128) val = 128;
    setLength(val);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(passwordData.password)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };

  // Calculate password entropy: E = L * log2(N)
  let alphabetSize = 62; // A-Z, a-z, 0-9
  if (includeCommonSpecial) alphabetSize += 14;
  if (includeRareSpecial) alphabetSize += 15;
  const entropy = length * Math.log2(alphabetSize);

  // Determine strength level details
  const getStrengthDetails = (ent) => {
    if (ent <= 0) {
      return { label: 'Empty', class: 'strength-empty', percentage: 0, color: '#6b7280', desc: 'Enter a password to test.' };
    }
    if (ent < 60) {
      return { label: 'Weak', class: 'strength-weak', percentage: 25, color: '#ef4444', desc: 'Could be brute-forced quickly.' };
    } else if (ent < 80) {
      return { label: 'Medium', class: 'strength-medium', percentage: 50, color: '#f97316', desc: 'Reasonably secure against basic attacks.' };
    } else if (ent < 100) {
      return { label: 'Strong', class: 'strength-strong', percentage: 75, color: '#eab308', desc: 'Highly secure for normal personal accounts.' };
    } else if (ent < 120) {
      return { label: 'Very Strong', class: 'strength-very-strong', percentage: 90, color: '#22c55e', desc: 'Excellent protection for sensitive keys.' };
    } else {
      return { label: 'Cryptographically Secure', class: 'strength-unbreakable', percentage: 100, color: '#10b981', desc: 'Mathematically unbreakable with current technology.' };
    }
  };

  const strength = getStrengthDetails(entropy);

  // Estimates crack time assuming 100 trillion guesses per second (highly sophisticated offline attacker)
  const getCrackTime = (ent) => {
    if (ent <= 0) return 'N/A';
    const guessesPerSec = 1e14;
    const totalGuesses = Math.pow(2, ent);
    const seconds = totalGuesses / guessesPerSec;

    if (seconds < 1) return 'Instantly';
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
    
    const years = seconds / 31536000;
    if (years < 1000) return `${Math.round(years)} years`;
    if (years < 1e6) return `${Math.round(years / 1000)} millennia`;
    if (years < 1e9) return `${Math.round(years / 1e6)} million years`;
    if (years < 1e12) return `${Math.round(years / 1e9)} billion years`;
    return 'Trillions of years (Unbreakable)';
  };

  // Color codes individual character classes for nice premium look
  const renderColorCodedPassword = (pwd) => {
    return pwd.split('').map((char, index) => {
      let type = 'letter';
      if (/[0-9]/.test(char)) {
        type = 'digit';
      } else if (/[!@#$%^&*()\-_\=+\[\]{}|;:',.<>?/~]/.test(char)) {
        type = 'special';
      } else if (/[A-Z]/.test(char)) {
        type = 'uppercase';
      }
      return (
        <span key={index} className={`pw-char pw-char--${type}`}>
          {showPassword ? char : '•'}
        </span>
      );
    });
  };

  // Analyze strength of user checked password
  const checkPasswordStrength = (pwd) => {
    if (!pwd) {
      return {
        entropy: 0,
        length: 0,
        hasLower: false,
        hasUpper: false,
        hasDigit: false,
        hasCommonSpecial: false,
        hasRareSpecial: false
      };
    }
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasDigit = /[0-9]/.test(pwd);
    const hasCommonSpecial = /[!@#$%^&*()\-_\=+]/.test(pwd);
    const hasRareSpecial = /[\[\]{}|;:',.<>?/~]/.test(pwd);

    let alphabetSize = 0;
    if (hasLower) alphabetSize += 26;
    if (hasUpper) alphabetSize += 26;
    if (hasDigit) alphabetSize += 10;
    if (hasCommonSpecial) alphabetSize += 14;
    if (hasRareSpecial) alphabetSize += 15;

    const otherChars = pwd.replace(/[a-zA-Z0-9!@#$%^&*()\-_\=+\[\]{}|;:',.<>?/~]/g, '');
    if (otherChars.length > 0) {
      const uniqueOthers = new Set(otherChars).size;
      alphabetSize += uniqueOthers;
    }

    if (alphabetSize === 0) alphabetSize = 1;
    const entropy = pwd.length * Math.log2(alphabetSize);

    return {
      entropy,
      length: pwd.length,
      hasLower,
      hasUpper,
      hasDigit,
      hasCommonSpecial,
      hasRareSpecial
    };
  };

  const checkStats = checkPasswordStrength(checkPassword);
  const checkStrength = getStrengthDetails(checkStats.entropy);

  return (
    <article id="tool-password" className="tool-card tool-card--wide active">
      <h2>Secure Password Utility</h2>
      
      {/* Primary Tabs */}
      <div className="generator-tabs">
        <button
          type="button"
          className={`gen-tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Password Generator</span>
        </button>
        <button
          type="button"
          className={`gen-tab-btn ${activeTab === 'check' ? 'active' : ''}`}
          onClick={() => setActiveTab('check')}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Strength Checker</span>
        </button>
      </div>

      {activeTab === 'generate' ? (
        <>
          {/* Password Output Panel */}
          <div className="password-display-wrapper">
            <div className="password-output-container">
              <div className="password-output-scroll">
                <code className="password-output-text">
                  {renderColorCodedPassword(passwordData.password)}
                </code>
              </div>
              
              <div className="password-output-actions">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="action-btn visibility-btn"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <span>Show</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className={`action-btn copy-btn ${copied ? 'copied' : ''}`}
                  title="Copy to clipboard"
                  aria-label="Copy password"
                >
                  {copied ? (
                    <>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="copied-icon">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  className="action-btn regenerate-btn"
                  title="Generate new password"
                  aria-label="Regenerate password"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Configuration and Strength Columns */}
          <div className="password-main-grid">
            {/* Left Column: Configuration */}
            <div className="password-card-col">
              <div className="password-options-panel">
                <h3 className="section-title-compact">Configuration</h3>
                
                <div className="form-group">
                  <label htmlFor="password-length-slider" className="slider-label">
                    <span>Password Length</span>
                    <span className="length-val">{length}</span>
                  </label>
                  <div className="slider-container">
                    <input
                      id="password-length-slider"
                      type="range"
                      min="8"
                      max="128"
                      value={length}
                      onChange={handleLengthSliderChange}
                      className="custom-range"
                    />
                  </div>
                </div>
                
                <div className="form-group checkbox-group-container" style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="checkbox-wrapper">
                      <label htmlFor="include-common-special" className="checkbox-label">
                        <input
                          id="include-common-special"
                          type="checkbox"
                          checked={includeCommonSpecial}
                          onChange={(e) => setIncludeCommonSpecial(e.target.checked)}
                        />
                        Common Special Characters
                      </label>
                      <div className="checkbox-subtext">
                        Allows: <code>!@#$%^&*()-_=+</code>
                      </div>
                    </div>

                    <div className="checkbox-wrapper">
                      <label htmlFor="include-rare-special" className="checkbox-label">
                        <input
                          id="include-rare-special"
                          type="checkbox"
                          checked={includeRareSpecial}
                          onChange={(e) => setIncludeRareSpecial(e.target.checked)}
                        />
                        Rare Special Characters
                      </label>
                      <div className="checkbox-subtext">
                        Allows: <code>[]&#123;&#125;|;:',.&lt;&gt;?/~</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Strength Analytics */}
            <div className="password-card-col">
              <div className="strength-container">
                <h3 className="section-title-compact">Security & Strength</h3>
                
                <div className="strength-header">
                  <span className="strength-label">
                    Strength: <strong style={{ color: strength.color }}>{strength.label}</strong>
                  </span>
                </div>
                <div className="strength-bar-track">
                  <div
                    className={`strength-bar-fill ${strength.class}`}
                    style={{ width: `${strength.percentage}%`, backgroundColor: strength.color }}
                  ></div>
                </div>
                
                <div className="strength-details-list">
                  <div className="strength-detail-item">
                    <span className="detail-lbl">Entropy:</span>
                    <span className="detail-val">{entropy.toFixed(1)} bits</span>
                  </div>
                  <div className="strength-detail-item">
                    <span className="detail-lbl">Crack Time:</span>
                    <strong className="detail-val" style={{ color: strength.color }}>{getCrackTime(entropy)}</strong>
                  </div>
                  <div className="strength-detail-item">
                    <span className="detail-lbl">Security Level:</span>
                    <span className="detail-val" style={{ fontSize: '0.82rem', textAlign: 'right' }}>{strength.desc}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Password Checker Input Panel */}
          <div className="password-display-wrapper">
            <div className="password-output-container">
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <input
                  type={showCheckPassword ? "text" : "password"}
                  placeholder="Type a password to test its strength..."
                  value={checkPassword}
                  onChange={(e) => setCheckPassword(e.target.value)}
                  className="password-check-input"
                  style={{
                    fontFamily: checkPassword ? '"JetBrains Mono", monospace' : 'inherit'
                  }}
                />
              </div>
              
              <div className="password-output-actions">
                <button
                  type="button"
                  onClick={() => setShowCheckPassword(!showCheckPassword)}
                  className="action-btn visibility-btn"
                  title={showCheckPassword ? "Hide password" : "Show password"}
                  aria-label="Toggle password visibility"
                >
                  {showCheckPassword ? (
                    <>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Checker Requirements and Strength Columns */}
          <div className="password-main-grid">
            {/* Left Column: Requirements Checklist */}
            <div className="password-card-col">
              <div className="password-options-panel">
                <h3 className="section-title-compact">Password Analysis</h3>
                
                <div className="checker-checklist">
                  <div className="checklist-item">
                    <span className={`checklist-icon ${checkStats.length >= 8 ? 'pass' : 'fail'}`}>
                      {checkStats.length >= 8 ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      )}
                    </span>
                    <div className="checklist-content">
                      <span className="checklist-title">Minimum Length (8+ chars)</span>
                      <span className="checklist-desc">Current length: {checkStats.length} characters</span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <span className={`checklist-icon ${checkStats.hasLower ? 'pass' : 'muted'}`}>
                      {checkStats.hasLower ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      )}
                    </span>
                    <div className="checklist-content">
                      <span className="checklist-title">Lowercase Letters (a-z)</span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <span className={`checklist-icon ${checkStats.hasUpper ? 'pass' : 'muted'}`}>
                      {checkStats.hasUpper ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      )}
                    </span>
                    <div className="checklist-content">
                      <span className="checklist-title">Uppercase Letters (A-Z)</span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <span className={`checklist-icon ${checkStats.hasDigit ? 'pass' : 'muted'}`}>
                      {checkStats.hasDigit ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      )}
                    </span>
                    <div className="checklist-content">
                      <span className="checklist-title">Numbers (0-9)</span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <span className={`checklist-icon ${checkStats.hasCommonSpecial ? 'pass' : 'muted'}`}>
                      {checkStats.hasCommonSpecial ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      )}
                    </span>
                    <div className="checklist-content">
                      <span className="checklist-title">Common Symbols (!@#$%^&*()-_=+)</span>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <span className={`checklist-icon ${checkStats.hasRareSpecial ? 'pass' : 'muted'}`}>
                      {checkStats.hasRareSpecial ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      )}
                    </span>
                    <div className="checklist-content">
                      <span className="checklist-title">Rare Symbols ([]&#123;&#125;|;:',.&lt;&gt;?/~)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Strength Analytics */}
            <div className="password-card-col">
              <div className="strength-container">
                <h3 className="section-title-compact">Security & Strength</h3>
                
                <div className="strength-header">
                  <span className="strength-label">
                    Strength: <strong style={{ color: checkStrength.color }}>{checkStrength.label}</strong>
                  </span>
                </div>
                <div className="strength-bar-track">
                  <div
                    className={`strength-bar-fill ${checkStrength.class}`}
                    style={{ width: `${checkStrength.percentage}%`, backgroundColor: checkStrength.color }}
                  ></div>
                </div>
                
                <div className="strength-details-list">
                  <div className="strength-detail-item">
                    <span className="detail-lbl">Entropy:</span>
                    <span className="detail-val">{checkStats.entropy.toFixed(1)} bits</span>
                  </div>
                  <div className="strength-detail-item">
                    <span className="detail-lbl">Crack Time:</span>
                    <strong className="detail-val" style={{ color: checkStrength.color }}>{getCrackTime(checkStats.entropy)}</strong>
                  </div>
                  <div className="strength-detail-item">
                    <span className="detail-lbl">Security Level:</span>
                    <span className="detail-val" style={{ fontSize: '0.82rem', textAlign: 'right' }}>{checkStrength.desc}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </article>
  );
}
