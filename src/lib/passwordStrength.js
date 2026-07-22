// Password Strength and Entropy Estimator (H-07)
// Provides pattern-based entropy evaluation, dictionary checking, and realistic crack time estimates.

const COMMON_PATTERNS = [
  'password', '123456', '12345678', '123456789', 'qwerty', 'abc123',
  'admin', 'welcome', 'monkey', 'dragon', 'football', 'letmein',
  'master', 'sunshine', 'princess', 'charlie', 'shadow', 'solopassword'
];

const KEYBOARD_SEQUENCES = ['qwerty', 'asdfgh', 'zxcvbn', '12345', '54321'];

export function calculateTheoreticalEntropy(password, poolSize) {
  if (!password || poolSize <= 0) return 0;
  return Math.round(password.length * Math.log2(poolSize));
}

export function evaluatePasswordStrength(password, isRandomlyGenerated = false, poolSize = 0) {
  if (!password) {
    return {
      score: 0,
      label: 'None',
      color: '#9ca3af',
      entropyBits: 0,
      crackTimeEstimate: 'Instant',
      feedback: ['Enter a password to analyze its strength.']
    };
  }

  const len = password.length;
  const lower = password.toLowerCase();

  // Pattern Penalties
  let penalties = 0;
  const feedback = [];

  // Check dictionary
  for (const word of COMMON_PATTERNS) {
    if (lower.includes(word)) {
      penalties += 25;
      feedback.push(`Contains common pattern "${word}".`);
      break;
    }
  }

  // Check keyboard sequence
  for (const seq of KEYBOARD_SEQUENCES) {
    if (lower.includes(seq)) {
      penalties += 20;
      feedback.push(`Contains keyboard sequence "${seq}".`);
      break;
    }
  }

  // Check character repetition
  if (/(.)\1{2,}/.test(password)) {
    penalties += 15;
    feedback.push('Contains repeating character sequences.');
  }

  // Calculate Base Entropy
  let characterSetSize = 0;
  if (/[a-z]/.test(password)) characterSetSize += 26;
  if (/[A-Z]/.test(password)) characterSetSize += 26;
  if (/[0-9]/.test(password)) characterSetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) characterSetSize += 32;

  const rawEntropy = characterSetSize > 0 ? Math.round(len * Math.log2(characterSetSize)) : 0;
  const effectiveEntropy = Math.max(0, (isRandomlyGenerated && poolSize > 0 ? calculateTheoreticalEntropy(password, poolSize) : rawEntropy) - penalties);

  let score = 0;
  let label = 'Very Weak';
  let color = '#ef4444'; // Red
  let crackTimeEstimate = '< 1 millisecond';

  if (effectiveEntropy < 28) {
    score = 1;
    label = 'Very Weak';
    color = '#ef4444';
    crackTimeEstimate = 'Instant to a few seconds';
  } else if (effectiveEntropy < 40) {
    score = 2;
    label = 'Weak';
    color = '#f97316'; // Orange
    crackTimeEstimate = 'A few minutes to hours';
  } else if (effectiveEntropy < 60) {
    score = 3;
    label = 'Moderate';
    color = '#eab308'; // Yellow
    crackTimeEstimate = 'A few days to months';
  } else if (effectiveEntropy < 80) {
    score = 4;
    label = 'Strong';
    color = '#10b981'; // Green
    crackTimeEstimate = 'Several years to decades';
  } else {
    score = 5;
    label = 'Very Strong';
    color = '#059669'; // Emerald
    crackTimeEstimate = 'Centuries (off-line brute-force resistant)';
  }

  if (feedback.length === 0) {
    if (score < 3) {
      feedback.push('Increase length and mix uppercase, lowercase, numbers, and symbols.');
    } else {
      feedback.push('Good length and character diversity.');
    }
  }

  return {
    score,
    label,
    color,
    entropyBits: effectiveEntropy,
    crackTimeEstimate,
    feedback
  };
}
