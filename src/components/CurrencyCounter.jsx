import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';
import ResultDisplay from './ui/ResultDisplay';

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
    <Card id="tool-currency" variant="tool">
      <ToolHeader title="Currency Converter & Counter" />

      {/* Tabs */}
      <div className="tool-tabs flex gap-2">
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-md border text-[0.85rem] font-semibold cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] font-sans ${
            activeTab === 'single'
              ? 'bg-accent text-white border-accent shadow-[0_4px_14px_rgba(16,185,129,0.3)]'
              : 'border-border bg-card text-text-muted hover:border-accent hover:text-accent hover:bg-nav-hover-bg'
          }`}
          onClick={() => setActiveTab('single')}
        >
          Quick Convert
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-md border text-[0.85rem] font-semibold cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] font-sans ${
            activeTab === 'bulk'
              ? 'bg-accent text-white border-accent shadow-[0_4px_14px_rgba(16,185,129,0.3)]'
              : 'border-border bg-card text-text-muted hover:border-accent hover:text-accent hover:bg-nav-hover-bg'
          }`}
          onClick={() => setActiveTab('bulk')}
        >
          Bulk Convert &amp; Count
        </button>
      </div>

      {/* API Banner / Status Info */}
      <div className="text-xs min-h-[18px] text-text-muted font-medium px-3 py-1.5 rounded bg-app border border-border flex justify-between flex-wrap gap-2">
        <span>
          <strong>Rate Source:</strong> {isManualRate ? "Custom Manual Rate" : (apiError ? "Offline Fallback" : "Live API")}
        </span>
        <span>
          <strong>Last Updated:</strong> {isManualRate ? "N/A" : lastUpdated}
        </span>
      </div>

      {apiError && !isManualRate && (
        <p className="text-xs text-text-muted m-0 p-1 px-2 rounded bg-red-500/5 border border-red-500/15">
          ⚠️ {apiError}
        </p>
      )}

      {/* Manual Rate Override Accordion/Input */}
      <div className="flex items-center gap-3 rounded border border-dashed border-border bg-app px-3 py-2 max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-2">
        <input
          type="checkbox"
          id="toggle-manual-rate"
          className="w-auto cursor-pointer"
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
        <label htmlFor="toggle-manual-rate" className="cursor-pointer select-none text-sm text-text-main font-semibold">Enable Manual Rate Override</label>
        
        {isManualRate && (
          <div className="flex items-center gap-2 ml-auto max-[480px]:ml-0 max-[480px]:mt-1">
            <span className="text-xs text-text-muted">
              1 {activeTab === 'single' ? fromCurrency : bulkFromCurrency} =
            </span>
            <input
              type="number"
              step="any"
              className="max-w-[120px] px-2.5 py-1.5 text-sm rounded border border-border bg-card text-text-main outline-none focus:border-accent focus:ring-2 focus:ring-focus"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
              placeholder="Rate"
            />
            <span className="text-xs text-text-muted">
              {activeTab === 'single' ? toCurrency : bulkToCurrency}
            </span>
          </div>
        )}
      </div>

      {/* Tab Content: Quick Convert */}
      {activeTab === 'single' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 w-full">
            <div className="flex flex-col gap-2 w-full flex-1">
              <label className="text-sm font-semibold text-text-main" htmlFor="currency-amount">Amount</label>
              <input
                type="number"
                id="currency-amount"
                className="w-full px-3.5 py-2.5 text-[0.92rem] rounded border border-border bg-app text-text-main outline-none transition-all duration-200 hover:border-border-hover focus:border-accent focus:ring-2 focus:ring-focus focus:bg-card"
                value={singleAmount}
                onChange={(e) => setSingleAmount(e.target.value)}
                placeholder="100"
              />
            </div>
          </div>

          <div className="flex gap-4 w-full items-end max-md:flex-col max-md:items-stretch">
            <div className="flex flex-col gap-2 w-full flex-[2]">
              <label className="text-sm font-semibold text-text-main" htmlFor="from-currency">From</label>
              <select
                id="from-currency"
                className="w-full px-3.5 py-2.5 text-[0.92rem] rounded border border-border bg-app text-text-main outline-none transition-all duration-200 hover:border-border-hover focus:border-accent focus:ring-2 focus:ring-focus focus:bg-card"
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
              className="inline-flex items-center justify-center w-[42px] h-[42px] min-w-[42px] rounded-full border border-border bg-card text-text-muted cursor-pointer self-end mb-0.5 transition-all duration-200 hover:border-accent hover:text-accent hover:rotate-180 max-md:self-center max-md:my-1"
              onClick={handleSwap}
              title="Swap Currencies"
            >
              ⇄
            </button>

            <div className="flex flex-col gap-2 w-full flex-[2]">
              <label className="text-sm font-semibold text-text-main" htmlFor="to-currency">To</label>
              <select
                id="to-currency"
                className="w-full px-3.5 py-2.5 text-[0.92rem] rounded border border-border bg-app text-text-main outline-none transition-all duration-200 hover:border-border-hover focus:border-accent focus:ring-2 focus:ring-focus focus:bg-card"
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

          <div className="rounded-lg border border-border bg-app p-3 text-center">
            <div className="text-[1.3rem] min-[480px]:text-2xl md:text-[2rem] font-bold text-accent mb-2 break-all font-display">
              {formatCurrency(convertedAmount, toCurrency)}
            </div>
            <div className="text-sm text-text-muted">
              {formatCurrency(1, fromCurrency)} = {formatCurrency(currentRate, toCurrency)}
              <br />
              <span className="text-xs opacity-85">
                {formatCurrency(1, toCurrency)} = {formatCurrency(1 / currentRate, fromCurrency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Bulk Convert & Count */}
      {activeTab === 'bulk' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 w-full items-end max-md:flex-col max-md:items-stretch">
            <div className="flex flex-col gap-2 w-full flex-[2]">
              <label className="text-sm font-semibold text-text-main" htmlFor="bulk-from-currency">Source Currency</label>
              <select
                id="bulk-from-currency"
                className="w-full px-3.5 py-2.5 text-[0.92rem] rounded border border-border bg-app text-text-main outline-none transition-all duration-200 hover:border-border-hover focus:border-accent focus:ring-2 focus:ring-focus focus:bg-card"
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
              className="inline-flex items-center justify-center w-[42px] h-[42px] min-w-[42px] rounded-full border border-border bg-card text-text-muted cursor-pointer self-end mb-0.5 transition-all duration-200 hover:border-accent hover:text-accent hover:rotate-180 max-md:self-center max-md:my-1"
              onClick={handleBulkSwap}
              title="Swap Currencies"
            >
              ⇄
            </button>

            <div className="flex flex-col gap-2 w-full flex-[2]">
              <label className="text-sm font-semibold text-text-main" htmlFor="bulk-to-currency">Target Currency</label>
              <select
                id="bulk-to-currency"
                className="w-full px-3.5 py-2.5 text-[0.92rem] rounded border border-border bg-app text-text-main outline-none transition-all duration-200 hover:border-border-hover focus:border-accent focus:ring-2 focus:ring-focus focus:bg-card"
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

          <div className="flex flex-col gap-2 w-full">
            <label className="text-sm font-semibold text-text-main" htmlFor="currency-bulk-input">Amounts (one per line, e.g. $100, 250.50, 3,000)</label>
            <textarea
              id="currency-bulk-input"
              className="w-full px-3.5 py-2.5 text-[0.92rem] rounded border border-border bg-app text-text-main outline-none transition-all duration-200 hover:border-border-hover focus:border-accent focus:ring-2 focus:ring-focus focus:bg-card resize-none"
              rows="3"
              placeholder={"100\n250.50\n3000"}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full mt-2">
            <ResultDisplay
              label={`Total (${bulkFromCurrency})`}
              value={formatCurrency(sourceTotal, bulkFromCurrency)}
              className="flex-1"
              id="currency-source-total"
            />
            <ResultDisplay
              label={`Total (${bulkToCurrency})`}
              value={formatCurrency(convertedTotal, bulkToCurrency)}
              className="flex-1"
              id="currency-target-total"
            />
            <ResultDisplay
              label="Lines Counted"
              value={lineCount}
              className="flex-1"
              id="currency-line-count"
            />
          </div>

          {parsedAmounts.length > 0 && (
            <div className="mt-2">
              <label className="text-xs font-semibold text-text-main mb-1 block">Line Breakdown</label>
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto mt-3 p-3 bg-app border border-border rounded-md font-mono text-sm">
                {parsedAmounts.map((amt, idx) => (
                  <div key={idx} className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                    <span>Line {idx + 1}: {formatCurrency(amt, bulkFromCurrency)}</span>
                    <span className="text-accent">⇄ {formatCurrency(amt * bulkRate, bulkToCurrency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
