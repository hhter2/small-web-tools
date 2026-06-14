import React, { useState } from 'react';

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
    <article id="tool-date" className="tool-card active">
      <h2>Date Counter</h2>
      <div className="row inputs">
        <div className="form-group">
          <label htmlFor="date-start">Start date</label>
          <input
            id="date-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="date-end">End date</label>
          <input
            id="date-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <div className="result-banner" id="date-output">
        {calculateDiff()}
      </div>
    </article>
  );
}
