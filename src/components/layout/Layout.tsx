import { createContext, useContext, useState } from 'react';
import { Sidebar } from './Sidebar';

interface SidebarContextType {
  openSidebar: () => void;
}

export const SidebarContext = createContext<SidebarContextType>({ openSidebar: () => {} });
export const useSidebar = () => useContext(SidebarContext);

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ openSidebar: () => setSidebarOpen(true) }}>
      <div className="min-h-screen bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64">
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
};
