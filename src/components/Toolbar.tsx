import React, { useState } from 'react';
import { 
  MousePointer2, 
  Square, 
  Hand, 
  Save, 
  FolderOpen, 
  FileDown, 
  Plus,
  Monitor,
  Trash2,
  Settings2,
  Hexagon
} from 'lucide-react';
import { useProjectionStore } from '@/hooks/useProjectionStore';
import { Tool } from '@/types/projection';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  onOpenOutput: () => void;
  onExport: () => void;
}

export const Toolbar: React.FC<Props> = ({ onOpenOutput, onExport }) => {
  const { 
    editorState, 
    setTool, 
    saveProject, 
    newProject,
    project,
    deleteSurface,
    setCanvasResolution
  } = useProjectionStore();

  const [customWidth, setCustomWidth] = useState(project.canvasWidth.toString());
  const [customHeight, setCustomHeight] = useState(project.canvasHeight.toString());

  const presets = [
    { label: '1920×1080 (Full HD)', width: 1920, height: 1080 },
    { label: '1280×720 (HD)', width: 1280, height: 720 },
    { label: '3840×2160 (4K)', width: 3840, height: 2160 },
    { label: '1024×768 (XGA)', width: 1024, height: 768 },
    { label: '1280×1024 (SXGA)', width: 1280, height: 1024 },
    { label: '800×600 (SVGA)', width: 800, height: 600 },
  ];

  const handleResolutionChange = (width: number, height: number) => {
    setCanvasResolution(width, height);
    setCustomWidth(width.toString());
    setCustomHeight(height.toString());
    toast.success(`Resolution set to ${width}×${height}`);
  };

  const handleCustomResolution = () => {
    const w = parseInt(customWidth);
    const h = parseInt(customHeight);
    if (w > 0 && h > 0 && w <= 7680 && h <= 4320) {
      setCanvasResolution(w, h);
      toast.success(`Resolution set to ${w}×${h}`);
    } else {
      toast.error('Invalid resolution (max 7680×4320)');
    }
  };

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select (V)' },
    { id: 'create', icon: <Square className="h-4 w-4" />, label: 'Create Quad Surface (R)' },
    { id: 'freeform', icon: <Hexagon className="h-4 w-4" />, label: 'Create Freeform Surface (F)' },
    { id: 'pan', icon: <Hand className="h-4 w-4" />, label: 'Pan (Space)' },
  ];

  const handleFileLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.proj.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const projectData = JSON.parse(text);
        useProjectionStore.getState().loadProject(projectData);
        toast.success('Project loaded successfully');
      } catch {
        toast.error('Failed to load project');
      }
    };
    input.click();
  };

  const handleDelete = () => {
    if (editorState.selectedSurfaceId) {
      deleteSurface(editorState.selectedSurfaceId);
      toast.success('Surface deleted');
    }
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'v':
          setTool('select');
          break;
        case 'r':
          setTool('create');
          break;
        case 'f':
          setTool('freeform');
          break;
        case 'delete':
        case 'backspace':
          if (editorState.selectedSurfaceId) {
            deleteSurface(editorState.selectedSurfaceId);
            toast.success('Surface deleted');
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, editorState.selectedSurfaceId, deleteSurface]);

  return (
    <div className="h-12 bg-card border-b border-border flex items-center px-4 gap-2">
      {/* Tools */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            title={tool.label}
            className={cn(
              'p-2 rounded-md transition-colors',
              editorState.tool === tool.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* File actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          newProject();
          toast.success('New project created');
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4 mr-1" />
        New
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleFileLoad}
        className="text-muted-foreground hover:text-foreground"
      >
        <FolderOpen className="h-4 w-4 mr-1" />
        Load
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          saveProject();
          toast.success('Project saved');
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        <Save className="h-4 w-4 mr-1" />
        Save
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Resolution settings */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground font-mono"
          >
            <Settings2 className="h-4 w-4 mr-1" />
            {project.canvasWidth}×{project.canvasHeight}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Canvas Resolution</h4>
            
            <div className="space-y-1">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleResolutionChange(preset.width, preset.height)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors',
                    project.canvasWidth === preset.width && project.canvasHeight === preset.height
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Custom Resolution</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Width"
                />
                <span className="text-muted-foreground">×</span>
                <Input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Height"
                />
              </div>
              <Button size="sm" className="w-full" onClick={handleCustomResolution}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6" />

      {/* Export */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onExport}
        className="text-muted-foreground hover:text-foreground"
      >
        <FileDown className="h-4 w-4 mr-1" />
        Export
      </Button>

      {/* Delete selected */}
      {editorState.selectedSurfaceId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      )}

      <div className="flex-1" />

      {/* Output window */}
      <Button
        onClick={onOpenOutput}
        className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
      >
        <Monitor className="h-4 w-4 mr-2" />
        Open Output
      </Button>

      {/* Project name */}
      <div className="text-sm font-mono text-muted-foreground">
        {project.name}
      </div>
    </div>
  );
};
