'use client';

import * as React from 'react';
import * as fabric from 'fabric';

interface FabricContextType {
    canvas: fabric.Canvas | null;
    initCanvas: (canvasElement: HTMLCanvasElement, containerElement: HTMLDivElement) => void;
    activeObject: fabric.Object | null;
    addObject: (obj: fabric.Object) => void;
    removeObject: (obj: fabric.Object) => void;
    updateProperty: (key: string, value: any) => void;
    clearSelection: () => void;
    groupSelection: () => void;
    ungroupSelection: () => void;
}

const FabricContext = React.createContext<FabricContextType | undefined>(undefined);

export function FabricProvider({ children }: { children: React.ReactNode }) {
    const [canvas, setCanvas] = React.useState<fabric.Canvas | null>(null);
    const [activeObject, setActiveObject] = React.useState<fabric.Object | null>(null);
    const canvasRef = React.useRef<fabric.Canvas | null>(null);

    const initCanvas = React.useCallback((canvasElement: HTMLCanvasElement, containerElement: HTMLDivElement) => {
        if (canvasRef.current) {
            canvasRef.current.dispose();
        }

        const newCanvas = new fabric.Canvas(canvasElement, {
            width: containerElement.clientWidth,
            height: containerElement.clientHeight,
            backgroundColor: '#f3f4f6', // subtle gray
            selection: true,
            preserveObjectStacking: true,
            fireRightClick: true,
            stopContextMenu: true,
        });

        const updateActiveObject = () => {
            const active = newCanvas.getActiveObject();
            setActiveObject(active || null);
        };

        // Event Listeners
        newCanvas.on('selection:created', updateActiveObject);
        newCanvas.on('selection:updated', updateActiveObject);
        newCanvas.on('selection:cleared', () => {
            setActiveObject(null);
        });

        // Handle resizing
        const resizeObserver = new ResizeObserver(() => {
            if (containerElement && newCanvas) {
                newCanvas.setDimensions({
                    width: containerElement.clientWidth,
                    height: containerElement.clientHeight,
                });
                newCanvas.renderAll();
            }
        });
        resizeObserver.observe(containerElement);

        canvasRef.current = newCanvas;
        setCanvas(newCanvas);
    }, []);

    const addObject = React.useCallback((obj: fabric.Object) => {
        if (canvasRef.current) {
            canvasRef.current.add(obj);
            canvasRef.current.setActiveObject(obj);
            canvasRef.current.renderAll();
        }
    }, []);

    const removeObject = React.useCallback((obj: fabric.Object) => {
        if (canvasRef.current) {
            // If active selection, remove all objects in it
            if (obj.type === 'activeSelection' && (obj as any).getObjects) {
                (obj as any).getObjects().forEach((o: any) => canvasRef.current?.remove(o));
                canvasRef.current.discardActiveObject();
            } else {
                canvasRef.current.remove(obj);
            }
            canvasRef.current.renderAll();
            setActiveObject(null);
        }
    }, []);

    const updateProperty = React.useCallback((key: string, value: any) => {
        if (canvasRef.current) {
            const active = canvasRef.current.getActiveObject();
            if (active) {
                active.set(key as any, value);

                // If it's a group, we might need to update dirty flag or propagate
                if (active.type === 'group' || active.type === 'activeSelection') {
                    active.setCoords();
                }

                canvasRef.current.requestRenderAll();
                // trigger update
                setActiveObject({ ...active } as fabric.Object);
            }
        }
    }, []);

    const groupSelection = React.useCallback(() => {
        if (!canvasRef.current) return;
        const activeObj = canvasRef.current.getActiveObject();
        if (!activeObj) return;

        // Check if it's an active selection (multiple items selected)
        if (activeObj.type === 'activeSelection') {
            // Cast to any to avoid TS mismatch in Fabric 7 if needed, 
            // but normally it's toGroup()
            if (typeof (activeObj as any).toGroup === 'function') {
                (activeObj as any).toGroup();
            } else if (typeof (activeObj as any).group === 'function') {
                (activeObj as any).group();
            }
            canvasRef.current.requestRenderAll();
            setActiveObject(canvasRef.current.getActiveObject() || null);
        }
    }, []);

    const ungroupSelection = React.useCallback(() => {
        if (!canvasRef.current) return;
        const activeObj = canvasRef.current.getActiveObject();
        if (!activeObj) return;

        // Check if it's a group
        if (activeObj.type === 'group') {
            if (typeof (activeObj as any).toActiveSelection === 'function') {
                (activeObj as any).toActiveSelection();
            } else if (typeof (activeObj as any).ungroup === 'function') {
                (activeObj as any).ungroup();
            }
            canvasRef.current.requestRenderAll();
            setActiveObject(canvasRef.current.getActiveObject() || null);
        }
    }, []);

    const clearSelection = React.useCallback(() => {
        if (canvasRef.current) {
            canvasRef.current.discardActiveObject();
            canvasRef.current.renderAll();
        }
    }, []);

    return (
        <FabricContext.Provider
            value={{
                canvas,
                initCanvas,
                activeObject,
                addObject,
                removeObject,
                updateProperty,
                clearSelection,
                groupSelection,
                ungroupSelection,
            }}
        >
            {children}
        </FabricContext.Provider>
    );
}

export function useFabric() {
    const context = React.useContext(FabricContext);
    if (context === undefined) {
        throw new Error('useFabric must be used within a FabricProvider');
    }
    return context;
}
