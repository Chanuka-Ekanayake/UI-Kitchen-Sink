import React from 'react';
import { ValidationResult } from '../../shared/types';

interface GlobalSummaryProps {
  results: ValidationResult[];
}

export function GlobalSummary({ results }: GlobalSummaryProps) {
  if (results.length === 0) {
    return (
      <div className="w-full bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-6 text-center">
        <p className="text-gray-500 text-sm font-medium">No components found during scan.</p>
      </div>
    );
  }

  // Data Aggregation Logic
  const totalComponents = results.length;
  let passedCount = 0;
  let issuesCount = 0;
  let scoreSum = 0;

  for (const result of results) {
    scoreSum += result.score;
    if (result.score === 100) {
      passedCount++;
    } else {
      issuesCount++;
    }
  }

  const averageScore = Math.round(scoreSum / totalComponents);

  // Color-coding thresholds
  let scoreColor = 'text-red-600';
  if (averageScore >= 90) {
    scoreColor = 'text-[#008000]'; // Brand Green
  } else if (averageScore >= 70) {
    scoreColor = 'text-amber-500'; // Warning Yellow/Amber
  }

  const dateString = new Date().toLocaleString();

  return (
    <div className="w-full bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-col items-center">
      <div className="flex w-full justify-between items-center mb-5 border-b border-gray-50 pb-2">
        <h2 className="text-sm font-semibold text-gray-700 tracking-wide">Global Health Summary</h2>
        <span className="text-[10px] text-gray-400 font-mono" title={dateString}>
          {dateString}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center mb-6">
        <div className={`text-6xl font-extrabold tracking-tight ${scoreColor}`}>
          {averageScore}<span className="text-3xl ml-1 opacity-80">%</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-2 uppercase tracking-widest font-semibold">Total Page Health</p>
      </div>

      <div className="grid grid-cols-3 w-full gap-2 border-t border-gray-50 pt-4 px-2">
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-gray-700">{totalComponents}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Scanned</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-[#008000]">{passedCount}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Passed</span>
        </div>
        <div className="flex flex-col items-center">
          <span className={`text-lg font-bold ${issuesCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {issuesCount}
          </span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Issues</span>
        </div>
      </div>
    </div>
  );
}
