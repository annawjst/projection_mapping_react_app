import React from 'react';
import { useProjectionStore } from '@/hooks/useProjectionStore';
import { Eye, EyeOff, Lock, Unlock, Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export const SurfaceList: React.FC = () => {
  const {
    project,
    editorState,
    selectSurface,
    updateSurface,
    deleteSurface,
    duplicateSurface,
  } = useProjectionStore();

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="font-semibold text-sidebar-foreground text-sm uppercase tracking-wider">
          Surfaces
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {project.surfaces.length} surface{project.surfaces.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {project.surfaces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>No surfaces yet</p>
              <p className="text-xs mt-1">Press R or use the toolbar to create one</p>
            </div>
          ) : (
            project.surfaces.map((surface) => (
              <div
                key={surface.id}
                onClick={() => selectSurface(surface.id)}
                className={cn(
                  'p-3 rounded-lg cursor-pointer transition-all',
                  editorState.selectedSurfaceId === surface.id
                    ? 'bg-accent ring-1 ring-primary'
                    : 'bg-sidebar-accent hover:bg-sidebar-accent/80'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      editorState.selectedSurfaceId === surface.id
                        ? 'bg-primary'
                        : 'bg-muted-foreground'
                    )}
                  />
                  <Input
                    value={surface.name}
                    onChange={(e) =>
                      updateSurface(surface.id, { name: e.target.value })
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 text-sm bg-transparent border-none px-1 focus-visible:ring-1"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateSurface(surface.id, { visible: !surface.visible });
                    }}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      surface.visible
                        ? 'text-primary hover:bg-primary/20'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                    title={surface.visible ? 'Hide' : 'Show'}
                  >
                    {surface.visible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateSurface(surface.id, { locked: !surface.locked });
                    }}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      surface.locked
                        ? 'text-secondary hover:bg-secondary/20'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                    title={surface.locked ? 'Unlock' : 'Lock'}
                  >
                    {surface.locked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateSurface(surface.id);
                    }}
                    className="p-1.5 rounded text-muted-foreground hover:bg-muted transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSurface(surface.id);
                    }}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {surface.mediaUrl && (
                  <div className="mt-2 text-xs text-muted-foreground truncate">
                    📷 Media attached
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
