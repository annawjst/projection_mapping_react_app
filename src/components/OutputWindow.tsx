import React, { useEffect, useCallback, useRef } from 'react';
import { useProjectionStore } from '@/hooks/useProjectionStore';
import { defaultMediaTransform } from '@/types/projection';
import { drawPerspectiveQuad } from '@/utils/rendering';

interface OutputWindowProps {
  windowRef: Window | null;
}

export const OutputRenderer: React.FC<OutputWindowProps> = ({ windowRef }) => {
  const mediaRefs = useRef<Map<string, HTMLImageElement | HTMLVideoElement>>(new Map());
  const { project } = useProjectionStore();
  const animationRef = useRef<number>();

  // Load media
  useEffect(() => {
    project.surfaces.forEach((surface) => {
      if (surface.mediaUrl && !mediaRefs.current.has(surface.id)) {
        if (surface.mediaType === 'image') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = surface.mediaUrl;
          img.onload = () => mediaRefs.current.set(surface.id, img);
        } else if (surface.mediaType === 'video') {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.src = surface.mediaUrl;
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          video.play();
          mediaRefs.current.set(surface.id, video);
        }
      }
    });
  }, [project.surfaces]);

  const render = useCallback(() => {
    if (!windowRef || windowRef.closed) return;

    const canvas = windowRef.document.getElementById('output-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scale factor based on window size vs project canvas resolution
    const scaleX = canvas.width / project.canvasWidth;
    const scaleY = canvas.height / project.canvasHeight;

    // Draw surfaces
    project.surfaces.forEach((surface) => {
      if (!surface.visible) return;

      const corners = surface.corners.map((c) => ({
        x: c.x * scaleX,
        y: c.y * scaleY,
      }));

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
        // Draw empty surface outline
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        corners.forEach((corner, i) => {
          if (i > 0) ctx.lineTo(corner.x, corner.y);
        });
        ctx.closePath();
        ctx.fillStyle = `rgba(100, 100, 150, ${surface.opacity * 0.3})`;
        ctx.fill();
      }
    });

    animationRef.current = requestAnimationFrame(render);
  }, [project.surfaces, project.canvasWidth, project.canvasHeight, windowRef]);

  useEffect(() => {
    if (!windowRef || windowRef.closed) return;
    const animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [render, windowRef]);

  return null;
};

export const createOutputWindow = (): Window | null => {
  // Open as a regular tab (no window features = new tab)
  const outputWindow = window.open('', '_blank');

  if (!outputWindow) {
    return null;
  }

  outputWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Projection Output</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: #000; 
            overflow: hidden; 
            cursor: none;
          }
          canvas { 
            display: block; 
            width: 100vw; 
            height: 100vh; 
          }
          .fullscreen-hint {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255,255,255,0.5);
            font-family: system-ui, sans-serif;
            font-size: 12px;
            pointer-events: none;
            transition: opacity 0.3s;
          }
          body:fullscreen .fullscreen-hint,
          body:-webkit-full-screen .fullscreen-hint {
            opacity: 0;
          }
        </style>
      </head>
      <body>
        <canvas id="output-canvas" width="1920" height="1080"></canvas>
        <div class="fullscreen-hint">Press F11 or double-click for fullscreen</div>
        <script>
          const canvas = document.getElementById('output-canvas');
          
          function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
          }
          
          window.addEventListener('resize', resize);
          resize();
          
          document.body.addEventListener('dblclick', () => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen();
            } else {
              document.exitFullscreen();
            }
          });
          
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.fullscreenElement) {
              document.exitFullscreen();
            }
          });
        </script>
      </body>
    </html>
  `);

  outputWindow.document.close();

  return outputWindow;
};
