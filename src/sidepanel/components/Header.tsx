import React from 'react';
import { Target, ChevronRight } from 'lucide-react'; // Placeholder icon for precision scanning

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-14 w-full flex items-center px-4 border-b border-slate-200 bg-white/80 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="bg-[#008000]/10 p-1.5 rounded-md">
          <Target size={18} className="text-[#008000]" />
        </div>
        <h1 className="font-bold text-gray-800 text-[13px] tracking-wide flex items-center">
          Universal  <span className="text-[#008000] font-bold ml-1">UI Validator</span>
          {title && (
            <>
              <ChevronRight size={14} className="text-slate-400 mx-1.5 shrink-0" />
              <span className="text-slate-600 font-medium">{title}</span>
            </>
          )}
        </h1>
      </div>
    </header>
  );
}
