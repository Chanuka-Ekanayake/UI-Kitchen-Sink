import React, { useState, useEffect } from 'react';
import { ValidationResult, PropertyResult } from '../../shared/types';
import {
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  AlertTriangle, XCircle, Check, ArrowRight,
  Minus, MousePointer2, Zap, Keyboard, Eye,
} from 'lucide-react';

// ─── State Metadata ───────────────────────────────────────────────────────────

type PseudoState = PropertyResult['state'];

const STATE_META: Record<PseudoState, { label: string; icon: React.ElementType; emoji: string; tint: string; border: string }> = {
  default:  { label: 'Default State',  icon: Minus,         emoji: '—',  tint: 'bg-slate-50',  border: 'border-slate-200' },
  hover:    { label: 'Hover State',    icon: MousePointer2, emoji: '🖱️', tint: 'bg-blue-50/60', border: 'border-blue-200' },
  active:   { label: 'Active State',   icon: Zap,           emoji: '⚡', tint: 'bg-purple-50/60', border: 'border-purple-200' },
  focus:    { label: 'Focus State',    icon: Keyboard,      emoji: '⌨️', tint: 'bg-sky-50/60',  border: 'border-sky-200' },
  visited:  { label: 'Visited State',  icon: Eye,           emoji: '👁', tint: 'bg-violet-50/60', border: 'border-violet-200' },
};

const STATE_ORDER: PseudoState[] = ['default', 'hover', 'active', 'focus', 'visited'];

// ─── Grouping Utility ─────────────────────────────────────────────────────────

function groupByState(results: PropertyResult[]): Partial<Record<PseudoState, PropertyResult[]>> {
  return results.reduce<Partial<Record<PseudoState, PropertyResult[]>>>((acc, r) => {
    const st = r.state || 'default';
    if (!acc[st]) acc[st] = [];
    acc[st]!.push(r);
    return acc;
  }, {});
}

// ─── State Badge (inline) ─────────────────────────────────────────────────────

function StateBadge({ state }: { state: PseudoState }) {
  if (state === 'default') return null;
  const meta = STATE_META[state];
  return (
    <span className={`text-[8px] uppercase font-bold tracking-wider px-1 py-[1px] rounded-[3px] ${meta.tint} ${meta.border} border ml-1.5 shrink-0`}>
      {`:${state}`}
    </span>
  );
}

// ─── Property Row ─────────────────────────────────────────────────────────────

function PropertyRow({ propResult }: { propResult: PropertyResult }) {
  const isColorValue = propResult.property.toLowerCase().includes('color');
  const isInteractive = propResult.state !== 'default';

  return (
    <div className="flex flex-col gap-1 border border-gray-100 rounded-md bg-white p-3 shadow-sm w-full">
      {/* Property Name & Severity Header */}
      <div className="flex justify-between items-center w-full mb-1">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {propResult.severity === 'error' ? (
            <XCircle size={14} className="text-red-500 shrink-0" />
          ) : (
            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          )}
          <span className="font-mono text-[11px] font-semibold text-gray-700 truncate" title={propResult.property}>
            {propResult.property}
          </span>
          <StateBadge state={propResult.state} />
        </div>
        {/* Severity Badge */}
        {!propResult.passed && (
          <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 rounded-sm shrink-0 ml-2 ${propResult.severity === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
            {propResult.severity}
          </span>
        )}
      </div>

      {/* Expected vs Actual Viewer */}
      <div className="flex w-full items-center text-xs mt-1">
        {propResult.passed ? (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-2 py-1.5 rounded-md w-full overflow-hidden">
            <Check size={14} className="shrink-0 text-green-600" />
            {isColorValue && (
              <div className="w-3.5 h-3.5 rounded-[3px] border border-black/10 shrink-0 shadow-sm" style={{ backgroundColor: propResult.actual }} />
            )}
            <span className="truncate flex-1 font-mono text-[10px] tracking-tight">{propResult.actual}</span>
          </div>
        ) : propResult.actual === 'CORS Blocked' ? (
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1.5 rounded-md w-full overflow-hidden">
            <AlertTriangle size={14} className="shrink-0 text-amber-500" />
            <span className="truncate flex-1 font-mono text-[10px] tracking-tight">Cannot verify — external CDN stylesheet blocked by CORS</span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 gap-2 overflow-hidden">
            {/* Expected Node */}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5 px-0.5">Expected</span>
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-1.5 py-1 rounded-sm w-full overflow-hidden shadow-sm">
                {isColorValue && (
                  <div className="w-3 h-3 rounded-[3px] border border-black/10 shrink-0 shadow-sm" style={{ backgroundColor: propResult.expected }} />
                )}
                <span className="truncate flex-1 font-mono text-[10px] text-gray-600">{propResult.expected}</span>
              </div>
            </div>

            {/* Separator Node */}
            <ArrowRight size={14} className="text-slate-400 shrink-0 mt-3" />

            {/* Actual Node */}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[9px] text-red-500 uppercase font-bold tracking-wider mb-0.5 px-0.5">Actual</span>
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-1.5 py-1 rounded-sm w-full text-red-700 overflow-hidden shadow-sm">
                {isColorValue && (
                  <div className="w-3 h-3 rounded-[3px] border border-black/10 shrink-0 shadow-sm" style={{ backgroundColor: propResult.actual }} />
                )}
                <span className="truncate flex-1 font-mono text-[10px]">{propResult.actual || 'none'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSSOM info note for interactive states */}
      {isInteractive && !propResult.passed && propResult.actual !== 'CORS Blocked' && propResult.actual !== 'Not Defined' && (
        <p className="text-[9px] text-slate-400 italic mt-1 leading-snug px-0.5">
          Note: This value was extracted from the CSSOM and may not reflect the current live state of the element.
        </p>
      )}
    </div>
  );
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

interface ResultCardProps {
  result: ValidationResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isPerfect = result.score === 100;

  let barColor = 'bg-red-500';
  if (result.score >= 90) barColor = 'bg-[#008000]';
  else if (result.score >= 70) barColor = 'bg-amber-400';

  const badgeClasses = isPerfect
    ? 'bg-green-100 text-[#008000] border-green-200'
    : 'bg-red-50 text-red-600 border-red-200';

  const StatusIcon = isPerfect ? CheckCircle2 : AlertCircle;

  // ─── Highlight messaging ────────────────────────────────────────────

  const handleMouseEnter = () => {
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({
        action: 'RELAY_HIGHLIGHT',
        payload: {
          selector: result.elementSelector,
          isPassed: isPerfect,
          state: hasInteractiveFailures() ? 'interactive' : 'default',
        }
      }).catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ action: 'RELAY_CLEAR' }).catch(() => {});
    }
  };

  useEffect(() => {
    return () => {
      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({ action: 'RELAY_CLEAR' }).catch(() => {});
      }
    };
  }, []);

  function hasInteractiveFailures(): boolean {
    return result.results.some(r => !r.passed && r.state !== 'default');
  }

  // ─── Grouping ───────────────────────────────────────────────────────

  const grouped = groupByState(result.results);
  const activeStates = STATE_ORDER.filter(s => grouped[s] && grouped[s]!.length > 0);

  return (
    <div
      className="w-full bg-white rounded-xl border border-gray-100 shadow-sm mb-3 overflow-hidden transition-all duration-200 hover:border-[#008000] hover:bg-slate-50 hover:shadow-md flex flex-col"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
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
            {isOpen
              ? <ChevronUp size={16} className="text-gray-400 hover:text-gray-600 transition-colors" />
              : <ChevronDown size={16} className="text-gray-400 hover:text-gray-600 transition-colors" />
            }
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

      {/* Expandable: Grouped by State ─────────────────────────────────── */}
      {isOpen && (
        <div className="bg-slate-50/50 border-t border-gray-100 p-4 w-full animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col gap-4 w-full">
            {activeStates.map(state => {
              const meta = STATE_META[state];
              const StateIcon = meta.icon;
              const items = grouped[state]!;

              return (
                <div key={state}>
                  {/* State Section Header */}
                  <div className={`flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md ${meta.tint} ${meta.border} border`}>
                    <StateIcon size={13} className="shrink-0 text-gray-500" />
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                      {meta.label}
                    </span>
                    <span className="text-[9px] font-mono text-gray-400 ml-auto">
                      {items.filter(i => i.passed).length}/{items.length} pass
                    </span>
                  </div>

                  {/* Property Rows */}
                  <div className="flex flex-col gap-2 w-full">
                    {items.map((propResult, idx) => (
                      <PropertyRow key={`${state}-${propResult.property}-${idx}`} propResult={propResult} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
