import React from 'react';

export function Footer() {
  return (
    <footer className="h-10 w-full shrink-0 border-t border-slate-200 bg-white flex items-center justify-between px-4 z-50">
      <span className="text-[10px] text-gray-500 font-mono tracking-tighter">Version 1.0.0</span>
      <a href="#" className="text-[10px] text-gray-400 hover:text-[#008000] hover:underline transition-colors font-medium">
        Help & Documentation
      </a>
    </footer>
  );
}
