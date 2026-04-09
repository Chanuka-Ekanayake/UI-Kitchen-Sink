import React, { useState } from 'react';
import { ValidationResult } from '../../shared/types';
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface ResultCardProps {
  result: ValidationResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Determine badge and bar styling based on score
  const isPerfect = result.score === 100;

  let barColor = 'bg-red-500';
  if (result.score >= 90) {
    barColor = 'bg-[#008000]';
  } else if (result.score >= 70) {
    barColor = 'bg-amber-400';
  }

  const badgeClasses = isPerfect
    ? 'bg-green-100 text-[#008000] border-green-200'
    : 'bg-red-50 text-red-600 border-red-200';

  const StatusIcon = isPerfect ? CheckCircle2 : AlertCircle;

  return (
    <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm mb-3 overflow-hidden transition-all duration-200 hover:border-[#008000] hover:shadow-md flex flex-col">
      {/* Header Section (Always Visible) */}
      <div 
        className="p-4 flex flex-col gap-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-start w-full">
          <div className="flex flex-col gap-1 w-full shrink mr-2 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-800 tracking-wide truncate">
              {result.componentName}
            </h3>
            <span className="text-[10px] font-mono text-gray-400 truncate opacity-80" title={result.elementSelector}>
              {result.elementSelector}
            </span>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badgeClasses}`}>
              <StatusIcon size={12} className="mr-1" />
              {isPerfect ? 'Pass' : 'Fail'}
            </div>
            {isOpen ? <ChevronUp size={16} className="text-gray-400 hover:text-gray-600 transition-colors" /> : <ChevronDown size={16} className="text-gray-400 hover:text-gray-600 transition-colors" />}
          </div>
        </div>

        {/* Health Bar System */}
        <div className="w-full mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Score</span>
            <span className="text-[10px] font-bold text-gray-700">{result.score}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full ${barColor} transition-all duration-500 ease-out`} 
              style={{ width: `${result.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expandable Properties Section Placeholder */}
      {isOpen && (
        <div className="bg-gray-50 border-t border-gray-100 p-4 w-full">
          <p className="text-xs text-gray-500 italic text-center py-2">Property breakdown view pending configuration...</p>
        </div>
      )}
    </div>
  );
}
