'use client';

import * as React from 'react';
import { useFabric } from './FabricContext';
import * as fabric from 'fabric';
import { Group, Ungroup, Download } from 'lucide-react';

export function FabricCanvas() {
    const { initCanvas, addObject, activeObject, groupSelection, ungroupSelection, canvas } = useFabric();
    const containerRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number } | null>(null);

    React.useEffect(() => {
        if (canvasRef.current && containerRef.current) {
            initCanvas(canvasRef.current, containerRef.current);
        }
    }, [initCanvas]);

    // Close context menu on click anywhere
    React.useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();

        // Get drop coordinates relative to the canvas
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const absolutePointer = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };

        const type = e.dataTransfer.getData('fabric-type');

        if (type === 'rect') {
            const rectObj = new fabric.Rect({
                left: absolutePointer.x,
                top: absolutePointer.y,
                fill: 'red',
                width: 100,
                height: 100,
            });
            addObject(rectObj);
        } else if (type === 'circle') {
            const circle = new fabric.Circle({
                left: absolutePointer.x,
                top: absolutePointer.y,
                fill: 'green',
                radius: 50,
            });
            addObject(circle);
        } else if (type === 'text') {
            const text = new fabric.IText('New Text', {
                left: absolutePointer.x,
                top: absolutePointer.y,
                fontFamily: 'Arial',
                fill: '#333',
                fontSize: 20,
            });
            addObject(text);
        } else if (type === 'triangle') {
            const triangle = new fabric.Triangle({
                left: absolutePointer.x,
                top: absolutePointer.y,
                fill: 'blue',
                width: 100,
                height: 100,
            });
            addObject(triangle);
        } else if (type === 'polygon') {
            const polygon = new fabric.Polygon([
                { x: 0, y: 0 },
                { x: 50, y: 0 },
                { x: 50, y: 50 },
                { x: 0, y: 50 }
            ], {
                left: absolutePointer.x,
                top: absolutePointer.y,
                fill: 'yellow',
            });
            addObject(polygon);
        } else if (type === 'symbol') {
            const url = e.dataTransfer.getData('symbol-url');
            if (url) {
                try {
                    const img = await fabric.Image.fromURL(url);
                    img.set({
                        left: absolutePointer.x,
                        top: absolutePointer.y,
                    });
                    if (img.width && img.width > 200) {
                        img.scaleToWidth(200);
                    }
                    addObject(img);
                } catch (err) {
                    console.error('Failed to load symbol image', err);
                }
            }
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();

        if (!canvas) return;

        // Find object under cursor
        const target = canvas.findTarget(e.nativeEvent);

        if (target) {
            // Select the target if it's not already part of active selection
            const activeObj = canvas.getActiveObject();

            // If right clicked object is not selected, select it
            if (activeObj !== target) {
                // Check if it's within a multi-selection
                if (activeObj?.type === 'activeSelection') {
                    const selection = activeObj as fabric.ActiveSelection;
                    if (!selection.getObjects().includes(target as any)) {
                        canvas.setActiveObject(target);
                    }
                } else {
                    canvas.setActiveObject(target);
                }
                canvas.requestRenderAll();
            }

            setContextMenu({ x: e.clientX, y: e.clientY });
        } else {
            // Right clicked on empty space - could show canvas-wide menu here if needed
            setContextMenu(null);
        }
    };

    const handleExportSymbol = () => {
        console.log('Export as symbol', activeObject);
        // Implement logic here later
    };

    const isGroup = activeObject?.type === 'group';
    const isActiveSelection = activeObject?.type === 'activeSelection';

    return (
        <div
            ref={containerRef}
            className="flex-1 h-full w-full bg-slate-50 relative overflow-hidden"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onContextMenu={handleContextMenu}
        >
            <canvas ref={canvasRef} />

            {/* Context Menu */}
            {contextMenu && activeObject && (isActiveSelection || isGroup) && (
                <div
                    className="fixed z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    {isActiveSelection && (
                        <div
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 gap-2 cursor-pointer"
                            onClick={() => { groupSelection(); setContextMenu(null); }}
                        >
                            <Group className="h-4 w-4" />
                            <span>Group</span>
                        </div>
                    )}

                    {isGroup && (
                        <>
                            <div
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 gap-2 cursor-pointer"
                                onClick={() => { ungroupSelection(); setContextMenu(null); }}
                            >
                                <Ungroup className="h-4 w-4" />
                                <span>Ungroup</span>
                            </div>
                            <div
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 gap-2 cursor-pointer"
                                onClick={() => { handleExportSymbol(); setContextMenu(null); }}
                            >
                                <Download className="h-4 w-4" />
                                <span>Export as Symbol</span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
