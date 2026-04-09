import React, { useState, useRef, useEffect } from 'react';
import { ComponentBlock, StyleRule } from '../../shared/types';
import { Trash2, Search, Info, Plus } from 'lucide-react';
import { StyleRuleField } from './StyleRuleField';

const COMMON_TAGS = ['div', 'button', 'input', 'h1', 'h2', 'span', 'section', 'a', 'p', 'img'];

// Helper explicitly defining computed string concatenation across component layers natively
export const getComputedSelector = (block: ComponentBlock): string => {
  if (!block.htmlTag) return '';
  let selector = block.htmlTag;
  if (block.cssClass) selector += `.${block.cssClass}`;
  if (block.cssId) selector += `#${block.cssId}`;
  return selector;
};

interface StandardBlockProps {
  block: ComponentBlock;
  onUpdate: (id: string, updates: Partial<ComponentBlock>) => void;
  onRemove: (id: string) => void;
}

export function StandardBlock({ block, onUpdate, onRemove }: StandardBlockProps) {
  const [tagSearch, setTagSearch] = useState(block.htmlTag);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown boundary escaping click logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTagSelect = (tag: string) => {
    setTagSearch(tag);
    onUpdate(block.id, { htmlTag: tag });
    setDropdownOpen(false);
  };

  const handleTagBlur = () => {
    if (tagSearch.trim() && tagSearch !== block.htmlTag) {
      onUpdate(block.id, { htmlTag: tagSearch.toLowerCase().trim() });
    }
    // Timeout permitting local click executions overriding external DOM blurs
    setTimeout(() => setDropdownOpen(false), 200);
  };

  const handleClassChange = (val: string) => {
    // Defensively enforce prefix removal mapping clean boundaries
    const cleanVal = val.replace(/^\.+/, '');
    onUpdate(block.id, { cssClass: cleanVal });
  };

  const handleIdChange = (val: string) => {
    // Defensively enforce prefix removal mapping clean boundaries
    const cleanVal = val.replace(/^#+/, '');
    onUpdate(block.id, { cssId: cleanVal });
  };

  const filteredTags = COMMON_TAGS.filter(tag => tag.includes(tagSearch.toLowerCase()));
  const isCustomTag = tagSearch.trim() && !COMMON_TAGS.includes(tagSearch.toLowerCase());

  const isValid = block.name.trim() !== '' && block.htmlTag.trim() !== '';

  const handleAddRule = () => {
    const newRule: StyleRule = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      property: '',
      value: '',
      severity: 'error'
    };
    onUpdate(block.id, { styleRules: [...block.styleRules, newRule] });
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<StyleRule>) => {
    const updatedRules = block.styleRules.map(r => r.id === ruleId ? { ...r, ...updates } : r);
    onUpdate(block.id, { styleRules: updatedRules });
  };

  const handleRemoveRule = (ruleId: string) => {
    const updatedRules = block.styleRules.filter(r => r.id !== ruleId);
    onUpdate(block.id, { styleRules: updatedRules });
  };

  return (
    <div className={`p-4 bg-slate-50 border rounded-xl flex items-start gap-3 transition-colors duration-200 group ${isValid ? 'border-gray-200 hover:border-[#008000]/40 shadow-sm' : 'border-red-300 bg-red-50/50'}`}>
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        
        {/* ROW 1: Component Name */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">
            Component Name <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            placeholder="e.g., Main Header" 
            value={block.name}
            onChange={(e) => onUpdate(block.id, { name: e.target.value })}
            className="w-full text-sm font-medium text-gray-800 bg-white border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-[#008000] focus:ring-1 focus:ring-[#008000] transition-shadow placeholder:text-gray-300 placeholder:font-normal"
          />
        </div>

        {/* ROW 2: Triple Bounding Grid */}
        <div className="grid grid-cols-3 gap-3">
          
          {/* Column A: Tag Combobox */}
          <div className="relative" ref={dropdownRef}>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">
              HTML Tag <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Search..."
                value={tagSearch}
                onChange={(e) => {
                  setTagSearch(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={handleTagBlur}
                className={`w-full text-sm font-mono bg-white border rounded-md pl-8 pr-3 py-2 outline-none transition-shadow placeholder:font-sans placeholder:text-gray-300 ${!block.htmlTag ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-gray-200 focus:border-[#008000] focus:ring-1 focus:ring-[#008000]'}`}
              />
            </div>
            
            {dropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-20 max-h-40 overflow-y-auto scrollbar-thin">
                {filteredTags.map(tag => (
                  <div 
                    key={tag} 
                    onClick={() => handleTagSelect(tag)}
                    className="px-3 py-2 text-sm font-mono hover:bg-gray-50 cursor-pointer text-gray-700"
                  >
                    {tag}
                  </div>
                ))}
                {isCustomTag && (
                  <div 
                    onClick={() => handleTagSelect(tagSearch.toLowerCase().trim())}
                    className="px-3 py-2 text-sm font-mono hover:bg-green-50 cursor-pointer text-[#008000] font-medium border-t border-gray-100"
                  >
                    Create "{tagSearch.toLowerCase()}"
                  </div>
                )}
                {filteredTags.length === 0 && !isCustomTag && (
                  <div className="px-3 py-2 text-sm text-gray-400 italic">No tags matching...</div>
                )}
              </div>
            )}
          </div>

          {/* Column B: Class Mapping */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 relative">
              <span>Class</span>
              <div className="group/tooltip bg-transparent relative cursor-help -mt-0.5">
                <Info size={12} className="text-gray-400 hover:text-gray-600 transition-colors" />
                <div className="absolute bottom-full mb-1 sm:left-1/2 sm:-translate-x-1/2 hidden group-hover/tooltip:block w-[140px] bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded-md shadow-lg z-30 font-normal normal-case leading-snug">
                  Leave empty to target all instances of this tag across the page.
                </div>
              </div>
            </label>
            <input 
              type="text" 
              placeholder=".class-name" 
              value={block.cssClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full text-sm font-mono bg-white border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-[#008000] focus:ring-1 focus:ring-[#008000] transition-shadow placeholder:font-sans placeholder:text-gray-300"
            />
          </div>

          {/* Column C: ID Mapping */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 relative">
              <span>ID</span>
              <div className="group/tooltip bg-transparent relative cursor-help -mt-0.5">
                <Info size={12} className="text-gray-400 hover:text-gray-600 transition-colors" />
                <div className="absolute bottom-full mb-1 right-0 sm:left-1/2 sm:-translate-x-1/2 hidden group-hover/tooltip:block w-[140px] bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded-md shadow-lg z-30 font-normal normal-case leading-snug">
                  Leave empty to target all instances of this tag across the page.
                </div>
              </div>
            </label>
            <input 
              type="text" 
              placeholder="#element-id" 
              value={block.cssId}
              onChange={(e) => handleIdChange(e.target.value)}
              className="w-full text-sm font-mono bg-white border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-[#008000] focus:ring-1 focus:ring-[#008000] transition-shadow placeholder:font-sans placeholder:text-gray-300"
            />
          </div>

        </div>

        {/* ROW 3: Style Rules Matrix */}
        <div className="mt-2 pt-3 border-t border-gray-100 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Style Rules</span>
            <span className="text-[10px] font-mono text-gray-400 bg-white px-2 py-0.5 rounded-full border">{block.styleRules.length}</span>
          </div>

          <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm flex flex-col gap-3 min-h-[60px]">
            {block.styleRules.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[40px] text-xs text-gray-400 italic">
                No style rules defined.
              </div>
            ) : (
              block.styleRules.map((rule) => (
                <StyleRuleField 
                  key={rule.id}
                  rule={rule}
                  onUpdate={handleUpdateRule}
                  onRemove={handleRemoveRule}
                />
              ))
            )}
            
            <button
              onClick={handleAddRule}
              className="flex items-center justify-center gap-1 w-full py-2 border border-dashed border-gray-200 hover:border-[#008000]/50 hover:bg-[#008000]/5 text-gray-500 hover:text-[#008000] font-medium rounded-md transition-all text-xs mt-1"
            >
              <Plus size={14} />
              <span>Add Rule</span>
            </button>
          </div>
        </div>

      </div>

      {/* Global Row Deletion Node */}
      <button 
        onClick={() => onRemove(block.id)}
        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors shrink-0 mt-[1.35rem]"
        title="Remove Component"
      >
        <Trash2 size={16} />
      </button>

    </div>
  );
}
