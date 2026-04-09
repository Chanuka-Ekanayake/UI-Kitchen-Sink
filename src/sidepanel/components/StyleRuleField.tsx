import React, { useState, useRef, useEffect } from 'react';
import { StyleRule } from '../../shared/types';
import { X, Search, AlertCircle, AlertTriangle } from 'lucide-react';

const COMMON_PROPERTIES = [
  'background-color', 'border-radius', 'color', 'font-family', 
  'font-size', 'font-weight', 'height', 'margin', 'padding', 'width'
];

interface StyleRuleFieldProps {
  rule: StyleRule;
  onUpdate: (id: string, updates: Partial<StyleRule>) => void;
  onRemove: (id: string) => void;
}

export function StyleRuleField({ rule, onUpdate, onRemove }: StyleRuleFieldProps) {
  const [propSearch, setPropSearch] = useState(rule.property);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePropSelect = (prop: string) => {
    setPropSearch(prop);
    onUpdate(rule.id, { property: prop });
    setDropdownOpen(false);
  };

  const handlePropBlur = () => {
    if (propSearch.trim() && propSearch !== rule.property) {
      onUpdate(rule.id, { property: propSearch.toLowerCase().trim() });
    }
    setTimeout(() => setDropdownOpen(false), 200);
  };

  const toggleSeverity = () => {
    onUpdate(rule.id, { severity: rule.severity === 'error' ? 'warning' : 'error' });
  };

  const filteredProps = COMMON_PROPERTIES.filter(p => p.includes(propSearch.toLowerCase()));
  const isCustomProp = propSearch.trim() && !COMMON_PROPERTIES.includes(propSearch.toLowerCase());

  return (
    <div className="flex items-start gap-2 w-full animate-in fade-in slide-in-from-right-2 duration-200">
      
      {/* Searchable CSS Property Node */}
      <div className="relative flex-1 min-w-0" ref={dropdownRef}>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Property"
            value={propSearch}
            onChange={(e) => {
              setPropSearch(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={handlePropBlur}
            className={`w-full text-xs font-mono bg-slate-50 border rounded-md pl-7 pr-2 py-1.5 outline-none transition-shadow placeholder:font-sans placeholder:text-gray-300 ${!rule.property ? 'border-red-200 focus:border-red-400' : 'border-gray-200 focus:border-[#008000]'}`}
          />
        </div>
        
        {dropdownOpen && (
          <div className="absolute top-full left-0 w-[200px] mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-30 max-h-40 overflow-y-auto scrollbar-thin">
            {filteredProps.map(prop => (
              <div 
                key={prop} 
                onClick={() => handlePropSelect(prop)}
                className="px-3 py-1.5 text-xs font-mono hover:bg-gray-50 cursor-pointer text-gray-700 truncate"
              >
                {prop}
              </div>
            ))}
            {isCustomProp && (
              <div 
                onClick={() => handlePropSelect(propSearch.toLowerCase().trim())}
                className="px-3 py-1.5 text-xs font-mono hover:bg-[#008000]/10 cursor-pointer text-[#008000] font-medium border-t border-gray-100 truncate"
              >
                Use "{propSearch.toLowerCase()}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expected Evaluation Node */}
      <div className="flex-[1.5] min-w-0">
        <input 
          type="text"
          placeholder="Value (e.g. 16px)"
          value={rule.value}
          onChange={(e) => onUpdate(rule.id, { value: e.target.value })}
          className={`w-full text-xs font-mono bg-slate-50 border rounded-md px-2 py-1.5 outline-none transition-shadow placeholder:font-sans placeholder:text-gray-300 ${!rule.value ? 'border-red-200 focus:border-red-400' : 'border-gray-200 focus:border-[#008000]'}`}
        />
      </div>

      {/* Severity Gate */}
      <button
        onClick={toggleSeverity}
        aria-label={`Toggle Severity: Currently ${rule.severity}`}
        className={`flex items-center justify-center h-8 w-8 rounded-md shrink-0 transition-colors border ${
          rule.severity === 'error' 
            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
            : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
        }`}
        title={`Target Severity: ${rule.severity}`}
      >
        {rule.severity === 'error' ? <AlertCircle size={14} /> : <AlertTriangle size={14} />}
      </button>

      {/* Extraction Hook */}
      <button
        onClick={() => onRemove(rule.id)}
        className="flex items-center justify-center h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md shrink-0 transition-colors"
        title="Delete Rule"
      >
        <X size={14} />
      </button>

    </div>
  );
}
