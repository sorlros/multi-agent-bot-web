import React from 'react';

interface LayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, children }) => {
  return (
    <div className="flex h-screen w-full bg-[#0f111a] text-slate-200 font-sans overflow-hidden">
      {sidebar}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden bg-gradient-to-br from-[#0f111a] to-[#12141f]">
        {children}
      </main>
    </div>
  );
};

export default Layout;
