import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import ToolHeader from './ui/ToolHeader';
import FieldInput from './ui/FieldInput';

const EMPTY_PASSWORD_ANALYSIS = {
  score: 0,
  label: 'None',
  color: '#9ca3af',
  entropyBits: 0,
  crackTimeEstimate: 'Instant',
  feedback: ['Enter a password to analyze its strength.'],
};

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
function getUnbiasedRandomInt(max) {
  if (max <= 1) return 0;
  const limit = 256 - (256 % max);
  const buffer = new Uint8Array(1);
  const cryptoSrc = typeof window !== 'undefined'
    ? window.crypto
    : (typeof globalThis !== 'undefined' ? globalThis.crypto : null);

  if (!cryptoSrc || !cryptoSrc.getRandomValues) {
    throw new Error('CSPRNG is not supported in this environment.');
  }

  while (true) {
    cryptoSrc.getRandomValues(buffer);
    const val = buffer[0];
    if (val < limit) {
      return val % max;
    }
  }
}

function fisherYatesShuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = getUnbiasedRandomInt(i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

function generateSecurePassword(options = {}) {
  const { 
    length = 16, 
    includeCommonSpecial = true, 
    includeRareSpecial = true, 
    debug = false 
  } = options;

  if (!Number.isInteger(length) || length < 8 || length > 128) {
    throw new Error('Password length must be an integer between 8 and 128.');
  }

  let useCommon = includeCommonSpecial;
  let useRare = includeRareSpecial;
  if (options.includeSpecialChars !== undefined) {
    useCommon = options.includeSpecialChars;
    useRare = options.includeSpecialChars;
  }

  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const commonSpecialChars = '!@#$%^&*()-_=+';
  const rareSpecialChars = '[]{}|;:\',.<>?/~';

  const selectedPools = [lowercase, uppercase, digits];
  if (useCommon) selectedPools.push(commonSpecialChars);
  if (useRare) selectedPools.push(rareSpecialChars);

  if (length < selectedPools.length) {
    throw new Error(`Password length (${length}) is less than selected character categories (${selectedPools.length}).`);
  }

  const fullAlphabet = selectedPools.join('');
  const chars = [];

  // Guarantee at least 1 character from each selected class
  for (const pool of selectedPools) {
    const idx = getUnbiasedRandomInt(pool.length);
    chars.push(pool.charAt(idx));
  }

  // Fill remaining slots from full alphabet
  const remaining = length - selectedPools.length;
  for (let i = 0; i < remaining; i++) {
    const idx = getUnbiasedRandomInt(fullAlphabet.length);
    chars.push(fullAlphabet.charAt(idx));
  }

  // Perform unbiased Fisher-Yates shuffle
  const password = fisherYatesShuffle(chars).join('');

  if (debug) {
    return {
      password,
      logs: [],
      stats: {
        totalBytesDrawn: length,
        discardedBytes: 0,
        alphabetSize: fullAlphabet.length,
        theoreticalDiscardRate: 0,
        actualDiscardRate: 0
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
  const [checkAnalysis, setCheckAnalysis] = useState(EMPTY_PASSWORD_ANALYSIS);

  useEffect(() => {
    let active = true;
    if (!checkPassword) {
      setCheckAnalysis(EMPTY_PASSWORD_ANALYSIS);
      return () => { active = false; };
    }
    import('../lib/passwordStrength').then(({ evaluatePasswordStrength }) => {
      if (active) setCheckAnalysis(evaluatePasswordStrength(checkPassword));
    });
    return () => { active = false; };
  }, [checkPassword]);

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
      if (typeof data === 'object') {
        setPasswordData(data);
      }
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

  // Get qualitative strength details (H-07)
  const getStrengthDetails = (ent) => {
    if (ent <= 0) return { label: 'None', percentage: 0, color: '#9ca3af', desc: 'No password provided.' };
    if (ent < 28) return { label: 'Very Weak', percentage: 20, color: '#ef4444', desc: 'Vulnerable to basic automated guessing.' };
    if (ent < 40) return { label: 'Weak', percentage: 40, color: '#f97316', desc: 'Susceptible to targeted dictionary attacks.' };
    if (ent < 60) return { label: 'Moderate', percentage: 60, color: '#eab308', desc: 'Decent protection against standard offline attacks.' };
    if (ent < 80) return { label: 'Strong', percentage: 80, color: '#10b981', desc: 'High protection for standard user credentials.' };
    return { label: 'Very Strong', percentage: 100, color: '#059669', desc: 'Estimated resistant to offline brute-force attacks.' };
  };

  const strength = getStrengthDetails(entropy);

  // Estimates crack time assuming high-performance offline brute force
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
    return 'Billions of years (Extremely High Complexity)';
  };

  // Color codes individual character classes for nice premium look
  const renderColorCodedPassword = (pwd) => {
    return pwd.split('').map((char, index) => {
      let colorClass = 'text-text-main';
      if (/[0-9]/.test(char)) {
        colorClass = 'text-amber-500';
      } else if (/[!@#$%^&*()\-_\=+\[\]{}|;:',.<>?/~]/.test(char)) {
        colorClass = 'text-fuchsia-500 font-bold';
      } else if (/[A-Z]/.test(char)) {
        colorClass = 'text-blue-500';
      }
      return (
        <span key={index} className={`inline-block transition-transform duration-100 hover:-translate-y-0.5 ${colorClass}`}>
          {showPassword ? char : '•'}
        </span>
      );
    });
  };

  const checkStats = {
    length: checkPassword.length,
    hasLower: /[a-z]/.test(checkPassword),
    hasUpper: /[A-Z]/.test(checkPassword),
    hasDigit: /[0-9]/.test(checkPassword),
    hasCommonSpecial: /[!@#$%^&*()\-_=+]/.test(checkPassword),
    hasRareSpecial: /[\[\]{}|;:',.<>?/~]/.test(checkPassword),
  };
  const checkStrength = {
    label: checkAnalysis.label,
    color: checkAnalysis.color,
    percentage: checkAnalysis.score * 20,
    desc: checkAnalysis.feedback.join(' '),
  };
  return (
    <Card id="tool-password" variant="tool" size="wide">
      <ToolHeader 
        title="Secure Password Utility" 
      />
      
      {/* Primary Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === 'generate' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveTab('generate')}
          className="flex items-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Password Generator</span>
        </Button>
        <Button
          variant={activeTab === 'check' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveTab('check')}
          className="flex items-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Strength Checker</span>
        </Button>
      </div>

      {activeTab === 'generate' ? (
        <div className="flex flex-col gap-3">
          {/* Password Output Panel */}
          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-inner sm:flex-row">
            <div className="w-full overflow-x-auto py-1 text-center sm:text-left select-all scrollbar-none">
              <code className="text-lg font-mono tracking-wider break-all whitespace-pre-wrap select-all">
                {renderColorCodedPassword(passwordData.password)}
              </code>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                className="flex items-center gap-1.5"
              >
                {showPassword ? (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span>Show</span>
                  </>
                )}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                title="Copy to clipboard"
                className="flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 shrink-0">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span className="text-green-500 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleGenerate()}
                title="Generate new password"
                className="flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {/* Configuration and Strength Columns */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Left Column: Configuration */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border pb-2.5">Configuration</h3>
              
              <div className="flex flex-col gap-2 w-full">
                <label htmlFor="password-length-slider" className="flex justify-between items-center text-sm font-semibold text-text-main">
                  <span>Password Length</span>
                  <span className="text-accent font-mono font-bold text-base">{length}</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    id="password-length-slider"
                    type="range"
                    min="8"
                    max="128"
                    value={length}
                    onChange={handleLengthSliderChange}
                    className="flex-1 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="include-common-special" className="flex items-center gap-2 text-sm font-semibold text-text-main cursor-pointer">
                    <input
                      id="include-common-special"
                      type="checkbox"
                      className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                      checked={includeCommonSpecial}
                      onChange={(e) => setIncludeCommonSpecial(e.target.checked)}
                    />
                    Common Special Characters
                  </label>
                  <div className="text-xs text-text-muted pl-6">
                    Allows: <code className="bg-app border border-border/50 rounded px-1 text-text-main font-mono text-[10px] font-bold">!@#$%^&*()-_=+</code>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="include-rare-special" className="flex items-center gap-2 text-sm font-semibold text-text-main cursor-pointer">
                    <input
                      id="include-rare-special"
                      type="checkbox"
                      className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                      checked={includeRareSpecial}
                      onChange={(e) => setIncludeRareSpecial(e.target.checked)}
                    />
                    Rare Special Characters
                  </label>
                  <div className="text-xs text-text-muted pl-6">
                    Allows: <code className="bg-app border border-border/50 rounded px-1 text-text-main font-mono text-[10px] font-bold">[]&#123;&#125;|;:',.&lt;&gt;?/~</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Strength Analytics */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border pb-2.5">Security & Strength</h3>
              
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-text-main">
                  Strength: <strong style={{ color: strength.color }} className="font-bold text-base">{strength.label}</strong>
                </span>
                <div className="w-full bg-border rounded-full h-2 overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${strength.percentage}%`, backgroundColor: strength.color }}
                  ></div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-semibold text-text-muted border-b border-dashed border-border pb-2">
                  <span>Theoretical random entropy:</span>
                  <span className="text-text-main font-mono text-sm">{entropy.toFixed(1)} bits</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-text-muted border-b border-dashed border-border pb-2">
                  <span>Estimated offline crack time:</span>
                  <strong className="font-bold text-sm" style={{ color: strength.color }}>{getCrackTime(entropy)}</strong>
                </div>
                <div className="flex justify-between items-start text-xs font-semibold text-text-muted pb-1">
                  <span>Security Level:</span>
                  <span className="text-text-main font-medium text-right max-w-[200px] leading-relaxed">{strength.desc}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Password Checker Input Panel */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-inner">
            <div className="flex-1 flex items-center min-w-0">
              <input
                type={showCheckPassword ? "text" : "password"}
                placeholder="Type a password to test its strength..."
                value={checkPassword}
                onChange={(e) => setCheckPassword(e.target.value)}
                className="w-full bg-transparent border-none text-lg text-text-main outline-none placeholder-text-muted/50 font-mono tracking-wider"
                style={{
                  fontFamily: checkPassword ? '"JetBrains Mono", monospace' : 'inherit'
                }}
              />
            </div>
            
            <div className="shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCheckPassword(!showCheckPassword)}
                title={showCheckPassword ? "Hide password" : "Show password"}
                className="flex items-center gap-1.5"
              >
                {showCheckPassword ? (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span>Show</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Checker Requirements and Strength Columns */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Left Column: Requirements Checklist */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border pb-2.5">Password Analysis</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-app/50 p-2 transition-colors">
                  <span className={`shrink-0 flex items-center justify-center ${checkStats.length >= 8 ? 'text-green-500' : 'text-red-500'}`}>
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
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-text-main">Minimum Length (8+ chars)</span>
                    <span className="text-[10px] text-text-muted">Current length: {checkStats.length} characters</span>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-app/50 p-2 transition-colors">
                  <span className={`shrink-0 flex items-center justify-center ${checkStats.hasLower ? 'text-green-500' : 'text-text-muted/40'}`}>
                    {checkStats.hasLower ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                    )}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-text-main">Lowercase Letters (a-z)</span>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-app/50 p-2 transition-colors">
                  <span className={`shrink-0 flex items-center justify-center ${checkStats.hasUpper ? 'text-green-500' : 'text-text-muted/40'}`}>
                    {checkStats.hasUpper ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                    )}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-text-main">Uppercase Letters (A-Z)</span>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-app/50 p-2 transition-colors">
                  <span className={`shrink-0 flex items-center justify-center ${checkStats.hasDigit ? 'text-green-500' : 'text-text-muted/40'}`}>
                    {checkStats.hasDigit ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                    )}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-text-main">Numbers (0-9)</span>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-app/50 p-2 transition-colors">
                  <span className={`shrink-0 flex items-center justify-center ${checkStats.hasCommonSpecial ? 'text-green-500' : 'text-text-muted/40'}`}>
                    {checkStats.hasCommonSpecial ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                    )}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-text-main">Common Symbols (!@#$%^&*()-_=+)</span>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-app/50 p-2 transition-colors">
                  <span className={`shrink-0 flex items-center justify-center ${checkStats.hasRareSpecial ? 'text-green-500' : 'text-text-muted/40'}`}>
                    {checkStats.hasRareSpecial ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                    )}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-text-main">Rare Symbols ([]&#123;&#125;|;:',.&lt;&gt;?/~)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Strength Analytics */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border pb-2.5">Security & Strength</h3>
              
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-text-main">
                  Strength: <strong style={{ color: checkStrength.color }} className="font-bold text-base">{checkStrength.label}</strong>
                </span>
                <div className="w-full bg-border rounded-full h-2 overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${checkStrength.percentage}%`, backgroundColor: checkStrength.color }}
                  ></div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-semibold text-text-muted border-b border-dashed border-border pb-2">
                  <span>Estimated fast offline attack:</span>
                  <strong className="font-bold text-sm" style={{ color: checkStrength.color }}>{checkAnalysis.crackTimeEstimate}</strong>
                </div>
                <div className="flex justify-between items-start text-xs font-semibold text-text-muted pb-1">
                  <span>Security Level:</span>
                  <span className="text-text-main font-medium text-right max-w-[200px] leading-relaxed">{checkStrength.desc}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
