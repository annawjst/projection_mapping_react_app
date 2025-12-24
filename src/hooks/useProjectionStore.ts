import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Surface, Project, EditorState, Tool, Point, MediaTransform, defaultMediaTransform } from '@/types/projection';
import { generateId } from '@/utils/perspective';

interface ProjectionStore {
  project: Project;
  editorState: EditorState;
  outputWindow: Window | null;
  
  // Project actions
  setProjectName: (name: string) => void;
  setCanvasResolution: (width: number, height: number) => void;
  createSurface: (startPoint: Point) => void;
  createFreeformSurface: (startPoint: Point) => void;
  updateSurface: (id: string, updates: Partial<Surface>) => void;
  deleteSurface: (id: string) => void;
  duplicateSurface: (id: string) => void;
  
  // Corner manipulation
  updateCorner: (surfaceId: string, cornerIndex: number, point: Point) => void;
  addCorner: (surfaceId: string, afterIndex: number, point: Point) => void;
  removeCorner: (surfaceId: string, cornerIndex: number) => void;
  
  // Media
  setMediaToSurface: (surfaceId: string, mediaUrl: string, mediaType: 'image' | 'video') => void;
  removeMediaFromSurface: (surfaceId: string) => void;
  updateMediaTransform: (surfaceId: string, transform: Partial<MediaTransform>) => void;
  
  // Editor state
  setTool: (tool: Tool) => void;
  selectSurface: (id: string | null) => void;
  setSelectedCorner: (index: number | null) => void;
  setDragging: (isDragging: boolean) => void;
  setPanOffset: (offset: Point) => void;
  setZoom: (zoom: number) => void;
  
  // Output window
  setOutputWindow: (window: Window | null) => void;
  
  // Project persistence
  saveProject: () => void;
  loadProject: (project: Project) => void;
  newProject: () => void;
  exportAsImage: () => Promise<string | null>;
}

const createDefaultProject = (): Project => ({
  id: generateId(),
  name: 'Untitled Project',
  surfaces: [],
  canvasWidth: 1920,
  canvasHeight: 1080,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const defaultEditorState: EditorState = {
  tool: 'select',
  selectedSurfaceId: null,
  selectedCorner: null,
  isDragging: false,
  isPanning: false,
  panOffset: { x: 0, y: 0 },
  zoom: 1,
};

export const useProjectionStore = create<ProjectionStore>()(
  persist(
    (set, get) => ({
      project: createDefaultProject(),
      editorState: defaultEditorState,
      outputWindow: null,

      setProjectName: (name) =>
        set((state) => ({
          project: { ...state.project, name, updatedAt: Date.now() },
        })),

      setCanvasResolution: (width, height) =>
        set((state) => ({
          project: { ...state.project, canvasWidth: width, canvasHeight: height, updatedAt: Date.now() },
        })),

      createSurface: (startPoint) => {
        const size = 200;
        const newSurface: Surface = {
          id: generateId(),
          name: `Surface ${get().project.surfaces.length + 1}`,
          corners: [
            { x: startPoint.x, y: startPoint.y },
            { x: startPoint.x + size, y: startPoint.y },
            { x: startPoint.x + size, y: startPoint.y + size },
            { x: startPoint.x, y: startPoint.y + size },
          ],
          mediaTransform: { ...defaultMediaTransform },
          visible: true,
          locked: false,
          opacity: 1,
          isFreeform: false,
          transformMode: 'perspective',
        };
        set((state) => ({
          project: {
            ...state.project,
            surfaces: [...state.project.surfaces, newSurface],
            updatedAt: Date.now(),
          },
          editorState: {
            ...state.editorState,
            selectedSurfaceId: newSurface.id,
            tool: 'select',
          },
        }));
      },

      createFreeformSurface: (startPoint) => {
        const size = 150;
        // Create a hexagon-like shape for freeform
        const newSurface: Surface = {
          id: generateId(),
          name: `Freeform ${get().project.surfaces.length + 1}`,
          corners: [
            { x: startPoint.x + size * 0.5, y: startPoint.y },
            { x: startPoint.x + size, y: startPoint.y + size * 0.3 },
            { x: startPoint.x + size, y: startPoint.y + size * 0.7 },
            { x: startPoint.x + size * 0.5, y: startPoint.y + size },
            { x: startPoint.x, y: startPoint.y + size * 0.7 },
            { x: startPoint.x, y: startPoint.y + size * 0.3 },
          ],
          mediaTransform: { ...defaultMediaTransform },
          visible: true,
          locked: false,
          opacity: 1,
          isFreeform: true,
          transformMode: 'perspective',
        };
        set((state) => ({
          project: {
            ...state.project,
            surfaces: [...state.project.surfaces, newSurface],
            updatedAt: Date.now(),
          },
          editorState: {
            ...state.editorState,
            selectedSurfaceId: newSurface.id,
            tool: 'select',
          },
        }));
      },

      updateSurface: (id, updates) =>
        set((state) => ({
          project: {
            ...state.project,
            surfaces: state.project.surfaces.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
            updatedAt: Date.now(),
          },
        })),

      deleteSurface: (id) =>
        set((state) => ({
          project: {
            ...state.project,
            surfaces: state.project.surfaces.filter((s) => s.id !== id),
            updatedAt: Date.now(),
          },
          editorState: {
            ...state.editorState,
            selectedSurfaceId:
              state.editorState.selectedSurfaceId === id
                ? null
                : state.editorState.selectedSurfaceId,
          },
        })),

      duplicateSurface: (id) => {
        const surface = get().project.surfaces.find((s) => s.id === id);
        if (!surface) return;
        
        const offset = 20;
        const newSurface: Surface = {
          ...surface,
          id: generateId(),
          name: `${surface.name} Copy`,
          corners: surface.corners.map((c) => ({
            x: c.x + offset,
            y: c.y + offset,
          })),
          mediaTransform: { ...surface.mediaTransform },
        };
        
        set((state) => ({
          project: {
            ...state.project,
            surfaces: [...state.project.surfaces, newSurface],
            updatedAt: Date.now(),
          },
          editorState: {
            ...state.editorState,
            selectedSurfaceId: newSurface.id,
          },
        }));
      },

      updateCorner: (surfaceId, cornerIndex, point) =>
        set((state) => ({
          project: {
            ...state.project,
            surfaces: state.project.surfaces.map((s) => {
              if (s.id !== surfaceId) return s;
              const newCorners = [...s.corners];
              newCorners[cornerIndex] = point;
              return { ...s, corners: newCorners };
            }),
            updatedAt: Date.now(),
          },
        })),

      addCorner: (surfaceId, afterIndex, point) =>
        set((state) => ({
          project: {
            ...state.project,
            surfaces: state.project.surfaces.map((s) => {
              if (s.id !== surfaceId || !s.isFreeform) return s;
              const newCorners = [...s.corners];
              newCorners.splice(afterIndex + 1, 0, point);
              return { ...s, corners: newCorners };
            }),
            updatedAt: Date.now(),
          },
        })),

      removeCorner: (surfaceId, cornerIndex) =>
        set((state) => ({
          project: {
            ...state.project,
            surfaces: state.project.surfaces.map((s) => {
              if (s.id !== surfaceId || !s.isFreeform || s.corners.length <= 3) return s;
              const newCorners = [...s.corners];
              newCorners.splice(cornerIndex, 1);
              return { ...s, corners: newCorners };
            }),
            updatedAt: Date.now(),
          },
        })),

      setMediaToSurface: (surfaceId, mediaUrl, mediaType) =>
        set((state) => ({
          project: {
            ...state.project,
            surfaces: state.project.surfaces.map((s) =>
              s.id === surfaceId ? { ...s, mediaUrl, mediaType } : s
            ),
            updatedAt: Date.now(),
          },
        })),

      removeMediaFromSurface: (surfaceId) =>
        set((state) => ({
          project: {
            ...state.project,
            surfaces: state.project.surfaces.map((s) =>
              s.id === surfaceId
                ? { ...s, mediaUrl: undefined, mediaType: undefined, mediaTransform: { ...defaultMediaTransform } }
                : s
            ),
            updatedAt: Date.now(),
          },
        })),

      updateMediaTransform: (surfaceId, transform) =>
        set((state) => ({
          project: {
            ...state.project,
            surfaces: state.project.surfaces.map((s) =>
              s.id === surfaceId
                ? { ...s, mediaTransform: { ...s.mediaTransform, ...transform } }
                : s
            ),
            updatedAt: Date.now(),
          },
        })),

      setTool: (tool) =>
        set((state) => ({
          editorState: { ...state.editorState, tool },
        })),

      selectSurface: (id) =>
        set((state) => ({
          editorState: { ...state.editorState, selectedSurfaceId: id },
        })),

      setSelectedCorner: (index) =>
        set((state) => ({
          editorState: { ...state.editorState, selectedCorner: index },
        })),

      setDragging: (isDragging) =>
        set((state) => ({
          editorState: { ...state.editorState, isDragging },
        })),

      setPanOffset: (offset) =>
        set((state) => ({
          editorState: { ...state.editorState, panOffset: offset },
        })),

      setZoom: (zoom) =>
        set((state) => ({
          editorState: { ...state.editorState, zoom: Math.max(0.1, Math.min(3, zoom)) },
        })),

      setOutputWindow: (window) => set({ outputWindow: window }),

      saveProject: () => {
        const project = get().project;
        const blob = new Blob([JSON.stringify(project, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/\s+/g, '_')}.proj.json`;
        a.click();
        URL.revokeObjectURL(url);
      },

      loadProject: (project) =>
        set({
          project: { ...project, updatedAt: Date.now() },
          editorState: defaultEditorState,
        }),

      newProject: () =>
        set({
          project: createDefaultProject(),
          editorState: defaultEditorState,
        }),

      exportAsImage: async () => {
        return null;
      },
    }),
    {
      name: 'projection-mapping-storage',
      partialize: (state) => ({ project: state.project }),
    }
  )
);
