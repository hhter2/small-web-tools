import React, { useState, useEffect } from 'react';

const currencyDetails = {
  USD: { name: "US Dollar", locale: "en-US", symbol: "$", flag: "🇺🇸" },
  EUR: { name: "Euro", locale: "de-DE", symbol: "€", flag: "🇪🇺" },
  GBP: { name: "British Pound", locale: "en-GB", symbol: "£", flag: "🇬🇧" },
  JPY: { name: "Japanese Yen", locale: "ja-JP", symbol: "¥", flag: "🇯🇵" },
  CNY: { name: "Chinese Yuan", locale: "zh-CN", symbol: "¥", flag: "🇨🇳" },
  TWD: { name: "New Taiwan Dollar", locale: "zh-TW", symbol: "NT$", flag: "🇹🇼" },
  HKD: { name: "Hong Kong Dollar", locale: "zh-HK", symbol: "HK$", flag: "🇭🇰" },
  SGD: { name: "Singapore Dollar", locale: "en-SG", symbol: "S$", flag: "🇸🇬" },
  CAD: { name: "Canadian Dollar", locale: "en-CA", symbol: "C$", flag: "🇨🇦" },
  AUD: { name: "Australian Dollar", locale: "en-AU", symbol: "A$", flag: "🇦🇺" },
  KRW: { name: "South Korean Won", locale: "ko-KR", symbol: "₩", flag: "🇰🇷" },
  INR: { name: "Indian Rupee", locale: "en-IN", symbol: "₹", flag: "🇮🇳" },
  PHP: { name: "Philippine Peso", locale: "en-PH", symbol: "₱", flag: "🇵🇭" },
  MYR: { name: "Malaysian Ringgit", locale: "en-MY", symbol: "RM", flag: "🇲🇾" },
  THB: { name: "Thai Baht", locale: "th-TH", symbol: "฿", flag: "🇹🇭" },
  VND: { name: "Vietnamese Dong", locale: "vi-VN", symbol: "₫", flag: "🇻🇳" },
  NZD: { name: "New Zealand Dollar", locale: "en-NZ", symbol: "NZ$", flag: "🇳🇿" },
  CHF: { name: "Swiss Franc", locale: "de-CH", symbol: "CHF", flag: "🇨🇭" },
  ZAR: { name: "South African Rand", locale: "en-ZA", symbol: "R", flag: "🇿🇦" },
  BRL: { name: "Brazilian Real", locale: "pt-BR", symbol: "R$", flag: "🇧🇷" },
  MXN: { name: "Mexican Peso", locale: "es-MX", symbol: "$", flag: "🇲🇽" },
};

// Fallback rates as of mid-2026 (relative to USD = 1.0)
const fallbackRates = {
  USD: 1.0,
  EUR: 0.93,
  GBP: 0.79,
  JPY: 157.5,
  CNY: 7.25,
  TWD: 32.4,
  HKD: 7.8,
  SGD: 1.35,
  CAD: 1.37,
  AUD: 1.51,
  KRW: 1380.0,
  INR: 83.5,
  PHP: 58.7,
  MYR: 4.71,
  THB: 36.8,
  VND: 25400.0,
  NZD: 1.63,
  CHF: 0.89,
  ZAR: 18.2,
  BRL: 5.4,
  MXN: 18.5,
};

function parseAmountLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      // Strip currency symbols and commas, extract first valid number
      const cleaned = trimmed.replace(/[$,€,£,¥,N,T,R,P,S,A,C,W,d,₫,₹,₩,฿,\s]/g, "");
      const match = cleaned.match(/-?\d+(\.\d+)?/);
      return match ? Number(match[0]) : null;
    })
    .filter((val) => val !== null);
}

export default function CurrencyCounter() {
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'bulk'
  const [rates, setRates] = useState(fallbackRates);
  const [lastUpdated, setLastUpdated] = useState("Fallback (Offline)");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Quick Convert state
  const [singleAmount, setSingleAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('TWD');
  const [toCurrency, setToCurrency] = useState('USD');

  // Bulk Convert state
  const [bulkInput, setBulkInput] = useState('');
  const [bulkFromCurrency, setBulkFromCurrency] = useState('TWD');
  const [bulkToCurrency, setBulkToCurrency] = useState('USD');

  // Manual Rate state
  const [isManualRate, setIsManualRate] = useState(false);
  const [manualRate, setManualRate] = useState('0.03086'); // Example TWD to USD initial custom rate

  // Fetch latest rates on mount
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        if (active && data && data.rates) {
          setRates(data.rates);
          setLastUpdated(new Date(data.time_last_update_unix * 1000).toLocaleString());
          setApiError(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch current currency rates:", err);
        if (active) {
          setApiError("Could not retrieve live exchange rates. Using local fallback database.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Determine active rate based on options
  const getRate = (from, to) => {
    if (isManualRate) {
      const parsed = Number(manualRate);
      return isNaN(parsed) || parsed <= 0 ? 1 : parsed;
    }
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;
    return toRate / fromRate;
  };

  // Quick Convert calculations
  const currentRate = getRate(fromCurrency, toCurrency);
  const numericAmount = Number(singleAmount) || 0;
  const convertedAmount = numericAmount * currentRate;

  // Bulk Convert calculations
  const bulkRate = getRate(bulkFromCurrency, bulkToCurrency);
  const parsedAmounts = parseAmountLines(bulkInput);
  const lineCount = parsedAmounts.length;
  const sourceTotal = parsedAmounts.reduce((sum, val) => sum + val, 0);
  const convertedTotal = sourceTotal * bulkRate;

  // Swap function
  const handleSwap = () => {
    const tempFrom = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(tempFrom);

    if (isManualRate) {
      const val = Number(manualRate);
      if (val > 0) {
        setManualRate((1 / val).toFixed(6));
      }
    }
  };

  const handleBulkSwap = () => {
    const tempFrom = bulkFromCurrency;
    setBulkFromCurrency(bulkToCurrency);
    setBulkToCurrency(tempFrom);
  };

  // Formatting helpers
  const formatCurrency = (value, code) => {
    const details = currencyDetails[code] || { locale: 'en-US' };
    return new Intl.NumberFormat(details.locale, {
      style: "currency",
      currency: code,
    }).format(value);
  };

  return (
    <article id="tool-currency" className="tool-card active">
      <h2>Currency Converter &amp; Counter</h2>

      {/* Tabs */}
      <div className="tool-tabs" style={{ marginBottom: '12px' }}>
        <button
          className={`tab-btn ${activeTab === 'single' ? 'active' : ''}`}
          onClick={() => setActiveTab('single')}
        >
          Quick Convert
        </button>
        <button
          className={`tab-btn ${activeTab === 'bulk' ? 'active' : ''}`}
          onClick={() => setActiveTab('bulk')}
        >
          Bulk Convert &amp; Count
        </button>
      </div>

      {/* API Banner / Status Info */}
      <div className="status-msg" style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span>
          <strong>Rate Source:</strong> {isManualRate ? "Custom Manual Rate" : (apiError ? "Offline Fallback" : "Live API")}
        </span>
        <span>
          <strong>Last Updated:</strong> {isManualRate ? "N/A" : lastUpdated}
        </span>
      </div>

      {apiError && !isManualRate && (
        <p className="small status-msg" style={{ color: 'var(--text-muted)', margin: 0, padding: '4px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
          ⚠️ {apiError}
        </p>
      )}

      {/* Manual Rate Override Accordion/Input */}
      <div className="currency-manual-rate-container">
        <input
          type="checkbox"
          id="toggle-manual-rate"
          checked={isManualRate}
          onChange={(e) => {
            setIsManualRate(e.target.checked);
            // Pre-fill manual rate with current rate when enabling
            if (e.target.checked) {
              const currentNormalRate = getRate(
                activeTab === 'single' ? fromCurrency : bulkFromCurrency,
                activeTab === 'single' ? toCurrency : bulkToCurrency
              );
              setManualRate(currentNormalRate.toFixed(6));
            }
          }}
        />
        <label htmlFor="toggle-manual-rate">Enable Manual Rate Override</label>
        
        {isManualRate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              1 {activeTab === 'single' ? fromCurrency : bulkFromCurrency} =
            </span>
            <input
              type="number"
              step="any"
              className="currency-manual-rate-input"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
              placeholder="Rate"
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {activeTab === 'single' ? toCurrency : bulkToCurrency}
            </span>
          </div>
        )}
      </div>

      {/* Tab Content: Quick Convert */}
      {activeTab === 'single' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="row">
            <div className="form-group flex-1">
              <label htmlFor="currency-amount">Amount</label>
              <input
                type="number"
                id="currency-amount"
                value={singleAmount}
                onChange={(e) => setSingleAmount(e.target.value)}
                placeholder="100"
              />
            </div>
          </div>

          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="from-currency">From</label>
              <select
                id="from-currency"
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
              >
                {Object.entries(currencyDetails).map(([code, details]) => (
                  <option key={code} value={code}>
                    {details.flag} {code} - {details.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="currency-swap-btn"
              onClick={handleSwap}
              title="Swap Currencies"
            >
              ⇄
            </button>

            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="to-currency">To</label>
              <select
                id="to-currency"
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
              >
                {Object.entries(currencyDetails).map(([code, details]) => (
                  <option key={code} value={code}>
                    {details.flag} {code} - {details.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="currency-result-display">
            <div className="currency-result-value">
              {formatCurrency(convertedAmount, toCurrency)}
            </div>
            <div className="currency-result-rate">
              {formatCurrency(1, fromCurrency)} = {formatCurrency(currentRate, toCurrency)}
              <br />
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                {formatCurrency(1, toCurrency)} = {formatCurrency(1 / currentRate, fromCurrency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Bulk Convert & Count */}
      {activeTab === 'bulk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="bulk-from-currency">Source Currency</label>
              <select
                id="bulk-from-currency"
                value={bulkFromCurrency}
                onChange={(e) => setBulkFromCurrency(e.target.value)}
              >
                {Object.entries(currencyDetails).map(([code, details]) => (
                  <option key={code} value={code}>
                    {details.flag} {code} - {details.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="currency-swap-btn"
              onClick={handleBulkSwap}
              title="Swap Currencies"
            >
              ⇄
            </button>

            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="bulk-to-currency">Target Currency</label>
              <select
                id="bulk-to-currency"
                value={bulkToCurrency}
                onChange={(e) => setBulkToCurrency(e.target.value)}
              >
                {Object.entries(currencyDetails).map(([code, details]) => (
                  <option key={code} value={code}>
                    {details.flag} {code} - {details.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="currency-bulk-input">Amounts (one per line, e.g. $100, 250.50, 3,000)</label>
            <textarea
              id="currency-bulk-input"
              rows="5"
              placeholder={"100\n250.50\n3000"}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
            />
          </div>

          <div className="row count-results">
            <div className="result-box">
              <span className="result-label">Total ({bulkFromCurrency})</span>
              <span className="result-val" id="currency-source-total">{formatCurrency(sourceTotal, bulkFromCurrency)}</span>
            </div>
            <div className="result-box">
              <span className="result-label">Total ({bulkToCurrency})</span>
              <span className="result-val" id="currency-target-total" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{formatCurrency(convertedTotal, bulkToCurrency)}</span>
            </div>
            <div className="result-box">
              <span className="result-label">Lines Counted</span>
              <span className="result-val" id="currency-line-count">{lineCount}</span>
            </div>
          </div>

          {parsedAmounts.length > 0 && (
            <div>
              <label style={{ fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>Line Breakdown</label>
              <div className="currency-bulk-list">
                {parsedAmounts.map((amt, idx) => (
                  <div key={idx} className="currency-bulk-item">
                    <span>Line {idx + 1}: {formatCurrency(amt, bulkFromCurrency)}</span>
                    <span style={{ color: 'var(--accent)' }}>⇄ {formatCurrency(amt * bulkRate, bulkToCurrency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
