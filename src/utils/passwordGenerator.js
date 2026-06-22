/**
 * Generates a cryptographically secure random password.
 * 
 * @param {Object} [options] Configuration options
 * @param {number} [options.length=16] Length of the password (8 to 128)
 * @param {boolean} [options.includeSpecialChars=true] Whether to include special characters
 * @param {boolean} [options.debug=false] If true, returns detailed sampling logs and statistics
 * @returns {string|Object} Generated password string, or object with logs/stats if debug is true
 * @throws {Error} If length is out of range (8 to 128)
 */
export function generateSecurePassword(options = {}) {
  const { length = 16, includeSpecialChars = true, debug = false } = options;

  // Validation: Throw a clear error if length is out of the allowed range
  if (!Number.isInteger(length) || length < 8 || length > 128) {
    throw new Error('Password length must be an integer between 8 and 128.');
  }

  // Character set definitions
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const specialChars = '!@#$%^&*()-_=+[]{}|;:\',.<>?/~';

  // Always include uppercase, lowercase, and digits. Optionally include special characters.
  let alphabet = lowercase + uppercase + digits;
  if (includeSpecialChars) {
    alphabet += specialChars;
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
