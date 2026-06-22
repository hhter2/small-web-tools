import React, { useState, useEffect } from 'react';
import { generateSecurePassword } from '../utils/passwordGenerator.js';

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [includeSpecialChars, setIncludeSpecialChars] = useState(true);
  const [passwordData, setPasswordData] = useState({ password: '', logs: [], stats: {} });
  const [showDebug, setShowDebug] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  // Generate password with debug info
  const handleGenerate = (currentLength = length, currentSpecial = includeSpecialChars) => {
    try {
      const data = generateSecurePassword({
        length: currentLength,
        includeSpecialChars: currentSpecial,
        debug: true
      });
      setPasswordData(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Generate on mount and when options change
  useEffect(() => {
    handleGenerate(length, includeSpecialChars);
  }, [length, includeSpecialChars]);

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
  const alphabetSize = includeSpecialChars ? 91 : 62; // 62 base + 29 special chars
  const entropy = length * Math.log2(alphabetSize);

  // Determine strength level details
  const getStrengthDetails = (ent) => {
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

  return (
    <article id="tool-password" className="tool-card tool-card--wide active">
      <h2>Secure Password Generator</h2>
      
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
                <input
                  id="password-length-number"
                  type="number"
                  min="8"
                  max="128"
                  value={length}
                  onChange={handleLengthNumberChange}
                  className="length-number-input"
                />
              </div>
            </div>
            
            <div className="form-group checkbox-group-container" style={{ marginTop: '20px' }}>
              <div className="checkbox-wrapper">
                <label htmlFor="include-special" className="checkbox-label">
                  <input
                    id="include-special"
                    type="checkbox"
                    checked={includeSpecialChars}
                    onChange={(e) => setIncludeSpecialChars(e.target.checked)}
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">Special Characters</span>
                </label>
                <div className="checkbox-subtext">
                  Allows: <code>!@#$%^&*()-_=+[]{}|;:',.&lt;&gt;?/~</code>
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
              <span className="strength-entropy">{entropy.toFixed(1)} bits</span>
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

      {/* Rejection Sampling Log / Visualizer */}
      <div className="debug-section">
        <button
          type="button"
          className="debug-toggle-btn"
          onClick={() => setShowDebug(!showDebug)}
        >
          <span className="debug-toggle-icon">{showDebug ? '▼' : '▶'}</span>
          <span>Security Math & CSPRNG Rejection Sampling Log</span>
        </button>

        {showDebug && (
          <div className="debug-content-wrapper fade-in">
            <div className="debug-explanation-card">
              <p>
                <strong>Why Rejection Sampling?</strong> Simple modulo division (e.g. <code>randomByte % alphabetSize</code>) 
                causes <em>modulo bias</em> when 256 is not a multiple of the alphabet size (which is {alphabetSize}). 
                This bias makes characters at the beginning of the alphabet slightly more likely to be chosen. 
                To prevent this, we calculate a secure threshold limit: <code>K = 256 - (256 % {alphabetSize}) = {256 - (256 % alphabetSize)}</code>. 
                Any byte value greater than or equal to <code>{256 - (256 % alphabetSize)}</code> is rejected, ensuring perfect mathematical uniformity.
              </p>
              <p className="debug-note-txt">
                <em>Prefetch Optimization:</em> To optimize performance, we prefetch 64 bytes at a time in a single <code>crypto.getRandomValues()</code> CSPRNG buffer, refilling it only when exhausted.
              </p>
            </div>

            <div className="debug-console">
              <div className="console-header">
                <span className="console-title">CSPRNG Byte Stream Log</span>
                <span className="console-indicator">Active Connection</span>
              </div>
              <div className="console-body">
                {passwordData.logs && passwordData.logs.length > 0 ? (
                  passwordData.logs.map((log, index) => (
                    <div
                      key={index}
                      className={`console-line ${log.status === 'rejected' ? 'line-rejected' : 'line-accepted'}`}
                    >
                      <span className="line-num">[{index + 1}]</span>
                      {log.status === 'rejected' ? (
                        <>
                          <span className="badge badge-rejected">REJECTED</span>
                          <span className="log-msg">
                            Byte: <code className="console-code">{log.byte}</code> &ge; limit <code className="console-code">{256 - (256 % alphabetSize)}</code>. Discarded to avoid modulo bias.
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="badge badge-accepted">ACCEPTED</span>
                          <span className="log-msg">
                            Byte: <code className="console-code">{log.byte}</code> &lt; limit <code className="console-code">{256 - (256 % alphabetSize)}</code>. Map: <code>{log.math}</code> &rarr; character <strong className="char-highlight">"{log.char}"</strong>
                          </span>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="console-empty">No logs available.</div>
                )}
              </div>
              
              <div className="console-summary">
                <div className="summary-col">
                  <span className="summary-lbl">Alphabet Size:</span>
                  <strong className="summary-val">{alphabetSize} chars</strong>
                </div>
                <div className="summary-col">
                  <span className="summary-lbl">Total Bytes Drawn:</span>
                  <strong className="summary-val">{passwordData.stats.totalBytesDrawn}</strong>
                </div>
                <div className="summary-col">
                  <span className="summary-lbl">Bytes Discarded:</span>
                  <strong className="summary-val text-rejected">{passwordData.stats.discardedBytes}</strong>
                </div>
                <div className="summary-col">
                  <span className="summary-lbl">Theoretical Discard Rate:</span>
                  <strong className="summary-val">
                    {passwordData.stats.theoreticalDiscardRate ? passwordData.stats.theoreticalDiscardRate.toFixed(2) : 0}%
                  </strong>
                </div>
                <div className="summary-col">
                  <span className="summary-lbl">Actual Discard Rate:</span>
                  <strong className="summary-val text-accent">
                    {passwordData.stats.actualDiscardRate ? passwordData.stats.actualDiscardRate.toFixed(2) : 0}%
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
