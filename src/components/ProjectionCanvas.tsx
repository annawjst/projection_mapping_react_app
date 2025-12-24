import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useProjectionStore } from '@/hooks/useProjectionStore';
import { Point, Surface, defaultMediaTransform } from '@/types/projection';
import { distance } from '@/utils/perspective';
import { drawPerspectiveQuad, drawSurfaceGrid, isPointInPolygon, getPolygonCentroid, getEdgeMidpoint } from '@/utils/rendering';

interface Props {
  onExportReady?: (exportFn: () => Promise<string>) => void;
}

export const ProjectionCanvas: React.FC<Props> = ({ onExportReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRefs = useRef<Map<string, HTMLImageElement | HTMLVideoElement>>(new Map());
  
  const {
    project,
    editorState,
    createSurface,
    createFreeformSurface,
    updateCorner,
    updateSurface,
    selectSurface,
    setSelectedCorner,
    setDragging,
    addCorner,
  } = useProjectionStore();

  const [containerSize, setContainerSize] = useState({ width: 1280, height: 720 });
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [initialCorner, setInitialCorner] = useState<Point | null>(null);
  const [initialCorners, setInitialCorners] = useState<Point[] | null>(null);
  const [dragMode, setDragMode] = useState<'corner' | 'surface' | null>(null);
  const [isManipulatingCorner, setIsManipulatingCorner] = useState(false);

  const canvasWidth = project.canvasWidth;
  const canvasHeight = project.canvasHeight;

  const scale = Math.min(
    containerSize.width / canvasWidth,
    containerSize.height / canvasHeight
  );

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    project.surfaces.forEach((surface) => {
      if (surface.mediaUrl && !mediaRefs.current.has(surface.id)) {
        if (surface.mediaType === 'image') {
          const img = new Image();
          img.src = surface.mediaUrl;
          img.onload = () => {
            mediaRefs.current.set(surface.id, img);
          };
        } else if (surface.mediaType === 'video') {
          const video = document.createElement('video');
          video.src = surface.mediaUrl;
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          video.play();
          mediaRefs.current.set(surface.id, video);
        }
      }
    });
    
    const surfaceIds = new Set(project.surfaces.map(s => s.id));
    mediaRefs.current.forEach((_, id) => {
      if (!surfaceIds.has(id)) {
        const media = mediaRefs.current.get(id);
        if (media instanceof HTMLVideoElement) {
          media.pause();
        }
        mediaRefs.current.delete(id);
      }
    });
  }, [project.surfaces]);

  const getMousePos = useCallback(
    (e: React.MouseEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const findCornerAtPoint = useCallback(
    (point: Point): { surfaceId: string; cornerIndex: number } | null => {
      const threshold = 15;
      for (const surface of [...project.surfaces].reverse()) {
        if (surface.locked) continue;
        for (let i = 0; i < surface.corners.length; i++) {
          if (distance(point, surface.corners[i]) < threshold) {
            return { surfaceId: surface.id, cornerIndex: i };
          }
        }
      }
      return null;
    },
    [project.surfaces]
  );

  const findEdgeAtPoint = useCallback(
    (point: Point): { surfaceId: string; afterIndex: number; midpoint: Point } | null => {
      const threshold = 12;
      for (const surface of [...project.surfaces].reverse()) {
        if (surface.locked || !surface.isFreeform) continue;
        for (let i = 0; i < surface.corners.length; i++) {
          const j = (i + 1) % surface.corners.length;
          const mid = getEdgeMidpoint(surface.corners[i], surface.corners[j]);
          if (distance(point, mid) < threshold) {
            return { surfaceId: surface.id, afterIndex: i, midpoint: mid };
          }
        }
      }
      return null;
    },
    [project.surfaces]
  );

  const findSurfaceAtPoint = useCallback(
    (point: Point): Surface | null => {
      for (const surface of [...project.surfaces].reverse()) {
        if (isPointInPolygon(point, surface.corners)) {
          return surface;
        }
      }
      return null;
    },
    [project.surfaces]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePos(e);
      
      if (editorState.tool === 'create') {
        createSurface(pos);
        return;
      }

      if (editorState.tool === 'freeform') {
        createFreeformSurface(pos);
        return;
      }

      // Check for corner drag first
      const corner = findCornerAtPoint(pos);
      if (corner) {
        selectSurface(corner.surfaceId);
        setSelectedCorner(corner.cornerIndex);
        setDragging(true);
        setDragStart(pos);
        setDragMode('corner');
        setIsManipulatingCorner(true);
        const surface = project.surfaces.find((s) => s.id === corner.surfaceId);
        if (surface) {
          setInitialCorner(surface.corners[corner.cornerIndex]);
        }
        return;
      }

      // Check for edge click (to add corner on freeform)
      if (e.detail === 2) { // Double click
        const edge = findEdgeAtPoint(pos);
        if (edge) {
          addCorner(edge.surfaceId, edge.afterIndex, pos);
          return;
        }
      }

      // Check for surface drag
      const surface = findSurfaceAtPoint(pos);
      if (surface) {
        if (surface.locked) {
          selectSurface(surface.id);
          return;
        }
        selectSurface(surface.id);
        setSelectedCorner(null);
        setDragging(true);
        setDragStart(pos);
        setDragMode('surface');
        setInitialCorners([...surface.corners]);
        return;
      }

      selectSurface(null);
      setSelectedCorner(null);
    },
    [editorState.tool, createSurface, createFreeformSurface, findCornerAtPoint, findEdgeAtPoint, findSurfaceAtPoint, selectSurface, setSelectedCorner, setDragging, getMousePos, project.surfaces, addCorner]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!editorState.isDragging || !dragStart) return;
      
      const pos = getMousePos(e);
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      if (dragMode === 'corner' && editorState.selectedCorner !== null && initialCorner && editorState.selectedSurfaceId) {
        updateCorner(editorState.selectedSurfaceId, editorState.selectedCorner, {
          x: initialCorner.x + dx,
          y: initialCorner.y + dy,
        });
      } else if (dragMode === 'surface' && initialCorners && editorState.selectedSurfaceId) {
        const newCorners = initialCorners.map(c => ({
          x: c.x + dx,
          y: c.y + dy,
        }));
        
        updateSurface(editorState.selectedSurfaceId, { corners: newCorners });
      }
    },
    [editorState.isDragging, editorState.selectedCorner, editorState.selectedSurfaceId, dragStart, dragMode, initialCorner, initialCorners, getMousePos, updateCorner, updateSurface]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    setDragStart(null);
    setInitialCorner(null);
    setInitialCorners(null);
    setDragMode(null);
    setIsManipulatingCorner(false);
  }, [setDragging]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0f18';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvasWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    // Draw surfaces
    project.surfaces.forEach((surface) => {
      if (!surface.visible) return;

      const isSelected = editorState.selectedSurfaceId === surface.id;
      const corners = surface.corners;
      const hasMedia = surface.mediaUrl && mediaRefs.current.has(surface.id);

      // Draw media if present
      const media = mediaRefs.current.get(surface.id);
      if (media && surface.mediaUrl) {
        drawPerspectiveQuad(
          ctx, 
          media, 
          corners, 
          surface.opacity, 
          surface.mediaTransform || defaultMediaTransform,
          surface.transformMode || 'perspective',
          12
        );
      } else {
        // Draw surface fill when no media
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        corners.forEach((corner, i) => {
          if (i > 0) ctx.lineTo(corner.x, corner.y);
        });
        ctx.closePath();
        ctx.fillStyle = isSelected 
          ? 'rgba(0, 200, 200, 0.15)' 
          : 'rgba(100, 100, 150, 0.1)';
        ctx.fill();
      }

      // Draw grid: only when empty OR when manipulating corners
      const shouldShowGrid = !hasMedia || (isSelected && isManipulatingCorner);
      if (shouldShowGrid && corners.length === 4) {
        const gridColor = isSelected 
          ? 'rgba(0, 200, 200, 0.4)' 
          : 'rgba(100, 150, 200, 0.3)';
        drawSurfaceGrid(ctx, corners, 4, gridColor, surface.transformMode || 'perspective');
      }

      // Draw outline
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      corners.forEach((corner, i) => {
        if (i > 0) ctx.lineTo(corner.x, corner.y);
      });
      ctx.closePath();
      ctx.strokeStyle = isSelected 
        ? 'hsl(185, 80%, 50%)' 
        : surface.locked 
          ? 'rgba(200, 100, 100, 0.5)'
          : surface.isFreeform
            ? 'rgba(180, 100, 200, 0.5)'
            : 'rgba(100, 150, 200, 0.5)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Draw edge midpoints for freeform surfaces (add corner hint)
      if (isSelected && surface.isFreeform) {
        for (let i = 0; i < corners.length; i++) {
          const j = (i + 1) % corners.length;
          const mid = getEdgeMidpoint(corners[i], corners[j]);
          ctx.beginPath();
          ctx.arc(mid.x, mid.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(180, 100, 200, 0.5)';
          ctx.fill();
        }
      }

      // Draw corner handles
      corners.forEach((corner, i) => {
        const isCornerSelected = isSelected && editorState.selectedCorner === i;
        
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, isCornerSelected ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = isCornerSelected 
          ? 'hsl(320, 70%, 55%)' 
          : isSelected 
            ? 'hsl(185, 80%, 50%)' 
            : surface.locked
              ? 'rgba(200, 100, 100, 0.8)'
              : surface.isFreeform
                ? 'rgba(180, 100, 200, 0.8)'
                : 'rgba(150, 150, 200, 0.8)';
        ctx.fill();
        ctx.strokeStyle = '#0a0f18';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw surface name
      if (isSelected) {
        const center = getPolygonCentroid(corners);
        ctx.fillStyle = 'hsl(185, 80%, 50%)';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(surface.name, center.x, center.y);
      }
    });
  }, [project.surfaces, editorState.selectedSurfaceId, editorState.selectedCorner, canvasWidth, canvasHeight, isManipulatingCorner]);

  useEffect(() => {
    let animationId: number;
    const animate = () => {
      renderCanvas();
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [renderCanvas]);

  const exportAsImage = useCallback(async (): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    project.surfaces.forEach((surface) => {
      if (!surface.visible) return;

      const media = mediaRefs.current.get(surface.id);
      if (media && surface.mediaUrl) {
        drawPerspectiveQuad(
          ctx, 
          media, 
          surface.corners, 
          surface.opacity, 
          surface.mediaTransform || defaultMediaTransform,
          surface.transformMode || 'perspective',
          12
        );
      }
    });

    return exportCanvas.toDataURL('image/png');
  }, [project.surfaces, canvasWidth, canvasHeight]);

  useEffect(() => {
    if (onExportReady) {
      onExportReady(exportAsImage);
    }
  }, [onExportReady, exportAsImage]);

  const scaledWidth = canvasWidth * scale;
  const scaledHeight = canvasHeight * scale;

  return (
    <div 
      ref={containerRef} 
      className="flex-1 bg-background overflow-hidden relative flex items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{ width: scaledWidth, height: scaledHeight }}
        className={editorState.tool === 'create' || editorState.tool === 'freeform' ? 'cursor-crosshair' : 'cursor-default'}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="absolute bottom-4 left-4 text-xs font-mono text-muted-foreground bg-card/80 px-2 py-1 rounded">
        {canvasWidth} × {canvasHeight} ({Math.round(scale * 100)}%)
      </div>
    </div>
  );
};
