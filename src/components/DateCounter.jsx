import React, { useState } from 'react';
import Card from './ui/Card';
import FieldInput from './ui/FieldInput';
import ToolHeader from './ui/ToolHeader';
import ToggleSwitch from './ui/ToggleSwitch';
import { calculateTimeDifference, formatTimeDifference } from './DateCounter/lib/timeDomain';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateToUTC(dateString) {
  if (!dateString) return null;

  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return null;

  return Date.UTC(year, month - 1, day);
}

export default function DateCounter() {
  const [mode, setMode] = useState('date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [endNextDay, setEndNextDay] = useState(false);

  const calculateDateDiff = () => {
    const startMs = parseDateToUTC(startDate);
    const endMs = parseDateToUTC(endDate);

    if (startMs === null || endMs === null) return 'Select both dates.';

    const diffDays = Math.round((endMs - startMs) / MS_PER_DAY);
    return `${diffDays} day(s) (end - start)`;
  };

  const calculateTimeDiff = () => {
    const difference = calculateTimeDifference(startTime, endTime, endNextDay);
    if (difference === null) return 'Select both times.';
    return formatTimeDifference(difference, endNextDay);
  };

  return (
    <Card id="tool-date" variant="tool" size="compact">
      <ToolHeader title="Date & Time Counter" />

      <div className="flex w-full rounded-md border border-border bg-app p-1" role="tablist" aria-label="Counter mode">
        {[
          { id: 'date', label: 'Date Counter' },
          { id: 'time', label: 'Time Counter' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={mode === option.id}
            onClick={() => setMode(option.id)}
            className={`flex-1 rounded px-3 py-2 text-sm font-semibold transition-colors ${
              mode === option.id
                ? 'bg-card text-accent shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === 'date' ? (
        <div role="tabpanel" className="flex w-full flex-col gap-4 sm:flex-row">
          <FieldInput
            id="date-start"
            label="Start date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="flex-1"
          />
          <FieldInput
            id="date-end"
            label="End date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="flex-1"
          />
        </div>
      ) : (
        <div role="tabpanel" className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-4 sm:flex-row">
            <FieldInput
              id="time-start"
              label="Start time"
              type="time"
              step="1"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="flex-1"
            />
            <FieldInput
              id="time-end"
              label="End time"
              type="time"
              step="1"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="flex-1"
            />
          </div>
          <ToggleSwitch
            id="time-end-next-day"
            checked={endNextDay}
            onChange={(event) => setEndNextDay(event.target.checked)}
            label="End time is on the next day"
          />
        </div>
      )}

      <div
        id={mode === 'date' ? 'date-output' : 'time-output'}
        role="status"
        aria-live="polite"
        className="flex min-h-[52px] items-center gap-2 rounded-[4px_12px_12px_4px] border-l-4 border-accent bg-accent-light px-5 py-4 text-[1.05rem] font-semibold text-text-main transition-all duration-300"
      >
        {mode === 'date' ? calculateDateDiff() : calculateTimeDiff()}
      </div>
    </Card>
  );
}
