import React, { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  // Use scrollbar-gutter stable to prevent layout shifts when scrollbars appear
  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 font-sans tracking-wide overflow-hidden text-slate-800">
      <Header title={title} />
      
      {/* Fixed content area constrained to exact viewport leftovers allowing inner nodes to manage scroll */}
      <main className="flex-1 w-full flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 w-full h-full px-4 py-6 mx-auto transition-all duration-300">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
