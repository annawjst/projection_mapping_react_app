import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { SurfaceList } from '@/components/SurfaceList';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { ProjectionCanvas } from '@/components/ProjectionCanvas';
import { OutputRenderer, createOutputWindow } from '@/components/OutputWindow';
import { useProjectionStore } from '@/hooks/useProjectionStore';
import { toast } from 'sonner';

const Index: React.FC = () => {
  const [outputWindow, setOutputWindow] = useState<Window | null>(null);
  const exportFnRef = useRef<(() => Promise<string>) | null>(null);
  const { project } = useProjectionStore();

  const handleOpenOutput = useCallback(() => {
    if (outputWindow && !outputWindow.closed) {
      outputWindow.focus();
      return;
    }

    const newWindow = createOutputWindow();
    if (newWindow) {
      setOutputWindow(newWindow);
      toast.success('Output window opened - move it to your projector');
    } else {
      toast.error('Could not open output window. Check popup blocker settings.');
    }
  }, [outputWindow]);

  const handleExport = useCallback(async () => {
    if (exportFnRef.current) {
      const dataUrl = await exportFnRef.current();
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `${project.name.replace(/\s+/g, '_')}_export.png`;
        link.href = dataUrl;
        link.click();
        toast.success('Image exported successfully');
      }
    }
  }, [project.name]);

  const handleExportReady = useCallback((fn: () => Promise<string>) => {
    exportFnRef.current = fn;
  }, []);

  // Cleanup output window on unmount
  useEffect(() => {
    return () => {
      if (outputWindow && !outputWindow.closed) {
        outputWindow.close();
      }
    };
  }, [outputWindow]);

  // Check if output window is closed
  useEffect(() => {
    const checkWindow = setInterval(() => {
      if (outputWindow && outputWindow.closed) {
        setOutputWindow(null);
      }
    }, 1000);
    return () => clearInterval(checkWindow);
  }, [outputWindow]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Toolbar onOpenOutput={handleOpenOutput} onExport={handleExport} />
      
      <div className="flex-1 flex overflow-hidden">
        <SurfaceList />
        
        <div className="flex-1 flex flex-col relative">
          <ProjectionCanvas onExportReady={handleExportReady} />
        </div>
        
        <PropertiesPanel />
      </div>

      {outputWindow && !outputWindow.closed && (
        <OutputRenderer windowRef={outputWindow} />
      )}

      {/* Status bar */}
      <div className="h-8 bg-card border-t border-border flex items-center px-4 text-xs text-muted-foreground">
        <span className="font-mono">
          {project.surfaces.length} surface{project.surfaces.length !== 1 ? 's' : ''}
        </span>
        <span className="mx-2">•</span>
        <span className={outputWindow && !outputWindow.closed ? 'text-primary' : ''}>
          {outputWindow && !outputWindow.closed ? '● Output Active' : '○ Output Inactive'}
        </span>
        <div className="flex-1" />
        <span className="font-mono">R: quad • F: freeform • V: select • Del: remove</span>
      </div>
    </div>
  );
};

export default Index;
