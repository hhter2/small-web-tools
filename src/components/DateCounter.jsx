import React, { useState } from 'react';
import Card from './ui/Card';
import FieldInput from './ui/FieldInput';
import ToolHeader from './ui/ToolHeader';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateToUTC(dateString) {
  if (!dateString) {
    return null;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return Date.UTC(year, month - 1, day);
}

export default function DateCounter() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const calculateDiff = () => {
    const startMs = parseDateToUTC(startDate);
    const endMs = parseDateToUTC(endDate);

    if (startMs === null || endMs === null) {
      return "Select both dates.";
    }

    const diffDays = Math.round((endMs - startMs) / MS_PER_DAY);
    return `${diffDays} day(s) (end - start)`;
  };

  return (
    <Card id="tool-date" variant="tool" size="compact">
      <ToolHeader title="Date Counter" />
      <div className="flex gap-4 w-full">
        <FieldInput
          id="date-start"
          label="Start date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="flex-1"
        />
        <FieldInput
          id="date-end"
          label="End date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="flex-1"
        />
      </div>
      <div
        id="date-output"
        className="bg-accent-light border-l-4 border-accent rounded-[4px_12px_12px_4px] px-5 py-4 font-semibold text-text-main text-[1.05rem] min-h-[52px] flex items-center gap-2 transition-all duration-300"
      >
        {calculateDiff()}
      </div>
    </Card>
  );
}
