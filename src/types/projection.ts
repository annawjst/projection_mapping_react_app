export interface Point {
    x: number;
    y: number;
  }
  
  export interface MediaTransform {
    offsetX: number;
    offsetY: number;
    scale: number;
    rotation: number; // degrees
  }
  
  export interface Surface {
    id: string;
    name: string;
    corners: Point[]; // Can be 4+ points for free-form surfaces
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    mediaTransform: MediaTransform;
    visible: boolean;
    locked: boolean;
    opacity: number;
    isFreeform: boolean; // true for spline-based surfaces
    transformMode: 'perspective' | 'resize'; // perspective stretches grid, resize just moves/scales
  }
  
  export interface Project {
    id: string;
    name: string;
    surfaces: Surface[];
    canvasWidth: number;
    canvasHeight: number;
    createdAt: number;
    updatedAt: number;
  }
  
  export type Tool = 'select' | 'create' | 'pan' | 'freeform';
  
  export interface EditorState {
    tool: Tool;
    selectedSurfaceId: string | null;
    selectedCorner: number | null;
    isDragging: boolean;
    isPanning: boolean;
    panOffset: Point;
    zoom: number;
  }
  
  export const defaultMediaTransform: MediaTransform = {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    rotation: 0,
  };
  