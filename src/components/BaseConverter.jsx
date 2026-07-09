import React, { useState } from 'react';
import Card from './ui/Card';
import FieldInput from './ui/FieldInput';
import ToolHeader from './ui/ToolHeader';

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
    <Card id="tool-base" variant="tool">
      <ToolHeader title="Base Converter" />
      <div className="flex gap-4 w-full">
        <FieldInput
          id="base-input"
          label="Number"
          type="text"
          placeholder="FF or 255 or 3:25:15"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1"
        />
        <div className="flex flex-col gap-2 flex-1">
          <label htmlFor="base-from" className="text-sm font-semibold text-text-main">Input base</label>
          <select
            id="base-from"
            value={baseFrom}
            onChange={(e) => setBaseFrom(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 text-[0.92rem] rounded border border-border bg-app text-text-main outline-none transition-all duration-200 hover:border-border-hover focus:border-accent focus:ring-2 focus:ring-focus focus:bg-card cursor-pointer"
          >
            <option value="2">Binary (2)</option>
            <option value="8">Octal (8)</option>
            <option value="10">Decimal (10)</option>
            <option value="16">Hexadecimal (16)</option>
            <option value="60">Sexagesimal (60)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        <FieldInput id="base-bin" label="Binary (2)" type="text" readOnly value={binVal} />
        <FieldInput id="base-oct" label="Octal (8)" type="text" readOnly value={octVal} />
        <FieldInput id="base-dec" label="Decimal (10)" type="text" readOnly value={decVal} />
        <FieldInput id="base-hex" label="Hexadecimal (16)" type="text" readOnly value={hexVal} />
        <div className="col-span-2">
          <FieldInput id="base-60" label="Sexagesimal (60) (colon-separated)" type="text" readOnly value={sexagesimalVal} />
        </div>
      </div>
      <p className="min-h-[18px] text-red-500 font-medium text-sm" id="base-status">{statusText}</p>
    </Card>
  );
}
