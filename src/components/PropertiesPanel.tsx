import React, { useRef } from 'react';
import { useProjectionStore } from '@/hooks/useProjectionStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Image, Video, X, RotateCw, Move, ZoomIn, Minus, Grid3X3, Maximize } from 'lucide-react';
import { toast } from 'sonner';

export const PropertiesPanel: React.FC = () => {
  const {
    project,
    editorState,
    updateSurface,
    updateCorner,
    setMediaToSurface,
    removeMediaFromSurface,
    updateMediaTransform,
    removeCorner,
  } = useProjectionStore();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const selectedSurface = project.surfaces.find(
    (s) => s.id === editorState.selectedSurfaceId
  );

  const handleMediaUpload = (type: 'image' | 'video') => {
    const input = type === 'image' ? imageInputRef.current : videoInputRef.current;
    input?.click();
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'video'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSurface) return;

    const url = URL.createObjectURL(file);
    setMediaToSurface(selectedSurface.id, url, type);
    toast.success(`${type === 'image' ? 'Image' : 'Video'} added to surface`);
  };

  if (!selectedSurface) {
    return (
      <div className="w-72 bg-sidebar border-l border-sidebar-border p-4">
        <h2 className="font-semibold text-sidebar-foreground text-sm uppercase tracking-wider mb-4">
          Properties
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a surface to view its properties
        </p>
      </div>
    );
  }

  const mediaTransform = selectedSurface.mediaTransform || {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    rotation: 0,
  };

  return (
    <div className="w-72 bg-sidebar border-l border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="font-semibold text-sidebar-foreground text-sm uppercase tracking-wider">
          Properties
        </h2>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        {/* Surface name */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Name
          </Label>
          <Input
            value={selectedSurface.name}
            onChange={(e) =>
              updateSurface(selectedSurface.id, { name: e.target.value })
            }
            className="bg-muted border-border"
          />
        </div>

        {/* Transform Mode Toggle */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Boundary Mode
          </Label>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <Button
              variant={selectedSurface.transformMode === 'perspective' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-8"
              onClick={() => updateSurface(selectedSurface.id, { transformMode: 'perspective' })}
            >
              <Grid3X3 className="h-3 w-3 mr-1" />
              Perspective
            </Button>
            <Button
              variant={selectedSurface.transformMode === 'resize' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-8"
              onClick={() => updateSurface(selectedSurface.id, { transformMode: 'resize' })}
            >
              <Maximize className="h-3 w-3 mr-1" />
              Resize
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedSurface.transformMode === 'perspective' 
              ? 'Grid stretches with corners' 
              : 'Grid maintains shape'}
          </p>
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Opacity: {Math.round(selectedSurface.opacity * 100)}%
          </Label>
          <Slider
            value={[selectedSurface.opacity * 100]}
            onValueChange={([value]) =>
              updateSurface(selectedSurface.id, { opacity: value / 100 })
            }
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Corner positions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Corners ({selectedSurface.corners.length})
            </Label>
            {selectedSurface.isFreeform && (
              <span className="text-xs text-muted-foreground">
                Double-click edge to add
              </span>
            )}
          </div>
          {selectedSurface.corners.map((corner, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-8">#{i + 1}</span>
                <div className="flex-1 flex gap-2">
                  <Input
                    type="number"
                    value={Math.round(corner.x)}
                    onChange={(e) =>
                      updateCorner(selectedSurface.id, i, {
                        x: Number(e.target.value),
                        y: corner.y,
                      })
                    }
                    className="bg-muted border-border text-sm h-8"
                  />
                  <Input
                    type="number"
                    value={Math.round(corner.y)}
                    onChange={(e) =>
                      updateCorner(selectedSurface.id, i, {
                        x: corner.x,
                        y: Number(e.target.value),
                      })
                    }
                    className="bg-muted border-border text-sm h-8"
                  />
                </div>
                {selectedSurface.isFreeform && selectedSurface.corners.length > 3 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeCorner(selectedSurface.id, i)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Media */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Media
          </Label>

          {selectedSurface.mediaUrl ? (
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {selectedSurface.mediaType === 'image' ? (
                  <img
                    src={selectedSurface.mediaUrl}
                    alt="Surface media"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={selectedSurface.mediaUrl}
                    className="w-full h-full object-contain"
                    autoPlay
                    loop
                    muted
                  />
                )}
              </div>

              {/* Media Transform Controls */}
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Move className="h-3 w-3" />
                  Position
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">X</Label>
                    <Input
                      type="number"
                      value={Math.round(mediaTransform.offsetX)}
                      onChange={(e) =>
                        updateMediaTransform(selectedSurface.id, {
                          offsetX: Number(e.target.value),
                        })
                      }
                      className="bg-muted border-border text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Y</Label>
                    <Input
                      type="number"
                      value={Math.round(mediaTransform.offsetY)}
                      onChange={(e) =>
                        updateMediaTransform(selectedSurface.id, {
                          offsetY: Number(e.target.value),
                        })
                      }
                      className="bg-muted border-border text-sm h-8"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ZoomIn className="h-3 w-3" />
                  Scale: {Math.round(mediaTransform.scale * 100)}%
                </Label>
                <Slider
                  value={[mediaTransform.scale * 100]}
                  onValueChange={([value]) =>
                    updateMediaTransform(selectedSurface.id, {
                      scale: value / 100,
                    })
                  }
                  min={10}
                  max={500}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <RotateCw className="h-3 w-3" />
                  Rotation: {Math.round(mediaTransform.rotation)}°
                </Label>
                <Slider
                  value={[mediaTransform.rotation]}
                  onValueChange={([value]) =>
                    updateMediaTransform(selectedSurface.id, {
                      rotation: value,
                    })
                  }
                  min={-180}
                  max={180}
                  step={1}
                  className="w-full"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateMediaTransform(selectedSurface.id, {
                    offsetX: 0,
                    offsetY: 0,
                    scale: 1,
                    rotation: 0,
                  })
                }
                className="w-full"
              >
                Reset Transform
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeMediaFromSurface(selectedSurface.id)}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Remove Media
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handleMediaUpload('image')}
                className="flex-col h-auto py-4"
              >
                <Image className="h-5 w-5 mb-1" />
                <span className="text-xs">Add Image</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleMediaUpload('video')}
                className="flex-col h-auto py-4"
              >
                <Video className="h-5 w-5 mb-1" />
                <span className="text-xs">Add Video</span>
              </Button>
            </div>
          )}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, 'image')}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, 'video')}
          />
        </div>
      </div>
    </div>
  );
};
