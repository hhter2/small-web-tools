import React, { useState } from 'react';

const currencyLocales = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  JPY: "ja-JP",
  CNY: "zh-CN",
};

function parseAmountLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/,/g, "").match(/-?\d+(\.\d+)?/))
    .filter(Boolean)
    .map((match) => Number(match[0]));
}

export default function CurrencyCounter() {
  const [currency, setCurrency] = useState('USD');
  const [input, setInput] = useState('');

  const amounts = parseAmountLines(input);
  const count = amounts.length;

  let totalText = "—";
  let statusText = "";

  if (count === 0) {
    statusText = "Enter one amount per line.";
  } else {
    const sum = amounts.reduce((total, value) => total + value, 0);
    const locale = currencyLocales[currency] || "en-US";
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    });
    totalText = formatter.format(sum);
  }

  return (
    <article id="tool-currency" className="tool-card active">
      <h2>Currency Counter</h2>
      <div className="row">
        <div className="form-group flex-1">
          <label htmlFor="currency-code">Currency</label>
          <select
            id="currency-code"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="CNY">CNY (¥)</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="currency-input">Amounts (one per line)</label>
        <textarea
          id="currency-input"
          rows="4"
          placeholder={"12.50\n8.90\n3"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>
      <div className="row count-results">
        <div className="result-box">
          <span className="result-label">Total Amount</span>
          <span className="result-val" id="currency-total">{totalText}</span>
        </div>
        <div className="result-box">
          <span className="result-label">Line Count</span>
          <span className="result-val" id="currency-count">{count}</span>
        </div>
      </div>
      <p className="small status-msg" id="currency-status">{statusText}</p>
    </article>
  );
}
