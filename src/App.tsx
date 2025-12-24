import React from 'react';
import { ThemeProvider } from 'next-themes';
import Index from './pages/Index';
import { Toaster } from './components/ui/sonner';

const App: React.FC = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="h-screen w-screen bg-background text-foreground flex flex-col">
        <div className="flex-1 overflow-hidden">
          <Index />
        </div>
        <Toaster />
      </div>
    </ThemeProvider>
  );
};

export default App;
