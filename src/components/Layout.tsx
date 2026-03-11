import React from 'react';
import { Menu } from 'lucide-react';

interface LayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  onOpenSidebar?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, children, onOpenSidebar }) => {
  return (
    <div className="flex h-dvh w-full bg-[#0f111a] text-slate-200 font-sans overflow-hidden">
      {sidebar}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden bg-gradient-to-br from-[#0f111a] to-[#12141f]">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-[#2f334d] bg-[#151724]">
          <div className="flex items-center gap-3">
            <button 
              onClick={onOpenSidebar}
              className="p-1 -ml-1 rounded-md text-slate-400 hover:text-white hover:bg-[#202336]"
            >
              <Menu className="w-6 h-6" />
            </button>
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="font-bold text-lg tracking-tight">오빗 에이전트</h1>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
};

export default Layout;
