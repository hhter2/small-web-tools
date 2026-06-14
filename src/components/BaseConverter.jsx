import React, { useState } from 'react';

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function parseBigIntFromBase(value, base) {
  let text = value.trim().toUpperCase();
  if (!text) {
    return null;
  }

  let sign = 1n;
  if (text.startsWith("-")) {
    sign = -1n;
    text = text.slice(1);
  }

  if (!text) {
    return null;
  }

  let cleaned = text;
  if (base === 16 && cleaned.startsWith("0X")) {
    cleaned = cleaned.slice(2);
  }
  if (base === 8 && cleaned.startsWith("0O")) {
    cleaned = cleaned.slice(2);
  }
  if (base === 2 && cleaned.startsWith("0B")) {
    cleaned = cleaned.slice(2);
  }

  let result = 0n;
  for (const ch of cleaned) {
    const digit = DIGITS.indexOf(ch);
    if (digit < 0 || digit >= base) {
      return null;
    }
    result = result * BigInt(base) + BigInt(digit);
  }

  return result * sign;
}

function parseBase60(value) {
  let text = value.trim();
  if (!text) {
    return null;
  }

  let sign = 1n;
  if (text.startsWith("-")) {
    sign = -1n;
    text = text.slice(1);
  }

  const parts = text.split(":");
  if (parts.some((part) => part.trim() === "")) {
    return null;
  }

  let result = 0n;
  for (const part of parts) {
    const digit = Number.parseInt(part, 10);
    if (Number.isNaN(digit) || digit < 0 || digit > 59) {
      return null;
    }
    result = result * 60n + BigInt(digit);
  }

  return result * sign;
}

function formatBase60(value) {
  if (value === 0n) {
    return "0";
  }

  const sign = value < 0n ? "-" : "";
  let current = value < 0n ? -value : value;
  const parts = [];

  while (current > 0n) {
    const remainder = current % 60n;
    parts.push(remainder.toString());
    current /= 60n;
  }

  return sign + parts.reverse().join(":");
}

export default function BaseConverter() {
  const [input, setInput] = useState('');
  const [baseFrom, setBaseFrom] = useState(10);

  const trimmed = input.trim();

  let binVal = "";
  let octVal = "";
  let decVal = "";
  let hexVal = "";
  let sexagesimalVal = "";
  let statusText = "Enter a value to convert.";

  if (trimmed) {
    const parsed =
      baseFrom === 60 ? parseBase60(trimmed) : parseBigIntFromBase(trimmed, baseFrom);

    if (parsed !== null) {
      binVal = parsed.toString(2);
      octVal = parsed.toString(8);
      decVal = parsed.toString(10);
      hexVal = parsed.toString(16).toUpperCase();
      sexagesimalVal = formatBase60(parsed);
      statusText = "";
    } else {
      statusText = "Invalid input for the selected base.";
    }
  }

  return (
    <article id="tool-base" className="tool-card active">
      <h2>Base Converter</h2>
      <div className="row">
        <div className="form-group flex-1">
          <label htmlFor="base-input">Number</label>
          <input
            id="base-input"
            type="text"
            placeholder="FF or 255 or 3:25:15"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <div className="form-group flex-1">
          <label htmlFor="base-from">Input base</label>
          <select
            id="base-from"
            value={baseFrom}
            onChange={(e) => setBaseFrom(Number(e.target.value))}
          >
            <option value="2">Binary (2)</option>
            <option value="8">Octal (8)</option>
            <option value="10">Decimal (10)</option>
            <option value="16">Hexadecimal (16)</option>
            <option value="60">Sexagesimal (60)</option>
          </select>
        </div>
      </div>
      <div className="grid-outputs">
        <div className="form-group">
          <label htmlFor="base-bin">Binary</label>
          <input id="base-bin" type="text" readOnly value={binVal} />
        </div>
        <div className="form-group">
          <label htmlFor="base-oct">Octal</label>
          <input id="base-oct" type="text" readOnly value={octVal} />
        </div>
        <div className="form-group">
          <label htmlFor="base-dec">Decimal</label>
          <input id="base-dec" type="text" readOnly value={decVal} />
        </div>
        <div className="form-group">
          <label htmlFor="base-hex">Hexadecimal</label>
          <input id="base-hex" type="text" readOnly value={hexVal} />
        </div>
        <div className="form-group full-width">
          <label htmlFor="base-60">Sexagesimal (colon-separated)</label>
          <input id="base-60" type="text" readOnly value={sexagesimalVal} />
        </div>
      </div>
      <p className="small status-msg" id="base-status">{statusText}</p>
    </article>
  );
}
