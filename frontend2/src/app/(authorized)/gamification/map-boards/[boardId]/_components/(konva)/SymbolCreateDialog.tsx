'use client';

import * as React from 'react';
import { useState, useRef, useMemo, useEffect } from 'react';
import {
    Loader2,
    Save,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Stage, Layer } from 'react-konva';
import { useCanvas, CanvasElement } from './CanvasContext';
import { CanvasText, CanvasShape, CanvasSymbol, CanvasImage } from './CanvasObjects';
import { useUploadSymbolApiGamificationSymbolsUploadPost } from '@/api/orval/client/gamification/gamification';
import { useQueryClient } from '@tanstack/react-query';

export default function SymbolCreateDialog() {
    const {
        elements,
        selectedIds,
        isSymbolDialogOpen,
        setIsSymbolDialogOpen
    } = useCanvas();

    const queryClient = useQueryClient();
    const [symbolName, setSymbolName] = useState('New Symbol');
    const [description, setDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const stageRef = useRef<any>(null);

    const { mutateAsync: uploadSymbol } = useUploadSymbolApiGamificationSymbolsUploadPost();

    // Get selected elements
    const selectedElements = useMemo(() => {
        return elements.filter(el => selectedIds.includes(el.id));
    }, [elements, selectedIds]);

    // Calculate bounding box and center elements
    const { previewElements, previewWidth, previewHeight } = useMemo(() => {
        if (selectedElements.length === 0) return { previewElements: [], previewWidth: 300, previewHeight: 300 };

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        // Roughly calculate bounds
        selectedElements.forEach(el => {
            const { x, y } = el.transform;
            // Since we don't have exact widths for all, we estimate or use transform width
            const w = el.transform.width || 100;
            const h = el.transform.height || 100;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w);
            maxY = Math.max(maxY, y + h);
        });

        const width = maxX - minX;
        const height = maxY - minY;
        const padding = 20;

        // Shift elements to 0,0 for preview
        const shifted = selectedElements.map(el => ({
            ...el,
            transform: {
                ...el.transform,
                x: el.transform.x - minX + padding,
                y: el.transform.y - minY + padding
            }
        }));

        return {
            previewElements: shifted,
            previewWidth: width + padding * 2,
            previewHeight: height + padding * 2
        };
    }, [selectedElements]);

    const handleSave = async () => {
        if (!stageRef.current) return;

        setIsUploading(true);
        try {
            // 1. Capture stage as image
            const dataURL = stageRef.current.toDataURL({ pixelRatio: 3 });
            const blob = await (await fetch(dataURL)).blob();
            const file = new File([blob], `${symbolName}.png`, { type: 'image/png' });

            // 2. Upload to symbols
            const response = await uploadSymbol({
                data: { file: file as any },
                params: {
                    name: symbolName,
                    description: description
                }
            });

            if (response.status === 201) {
                toast.success("Symbol created and uploaded successfully");
                setIsSymbolDialogOpen(false);
                // Invalidate symbols query to show in sidebar
                queryClient.invalidateQueries({ queryKey: ['/api/gamification/symbols'] });
            } else {
                throw new Error("Failed to upload symbol");
            }
        } catch (error) {
            console.error("Failed to create symbol:", error);
            toast.error("Failed to create symbol");
        } finally {
            setIsUploading(false);
        }
    };

    if (selectedElements.length === 0) return null;

    return (
        <Dialog open={isSymbolDialogOpen} onOpenChange={setIsSymbolDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Symbol</DialogTitle>
                    <DialogDescription>
                        Create a reusable symbol from the selected elements.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid items-center gap-2">
                        <Label htmlFor="name">Symbol Name</Label>
                        <Input
                            id="name"
                            value={symbolName}
                            onChange={(e) => setSymbolName(e.target.value)}
                            placeholder="Enter symbol name..."
                        />
                    </div>

                    <div className="grid items-center gap-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter symbol description..."
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Preview</Label>
                        <div className="border rounded-lg bg-white overflow-hidden flex items-center justify-center p-4 min-h-[200px] max-h-[300px]">
                            <div className="scale-75 origin-center">
                                <Stage
                                    width={previewWidth}
                                    height={previewHeight}
                                    ref={stageRef}
                                >
                                    <Layer>
                                        {previewElements.map((el) => {
                                            const key = `preview-${el.id}`;
                                            switch (el.type) {
                                                case 'text':
                                                    return <CanvasText key={key} element={el as any} isSelected={false} onSelect={() => { }} onChange={() => { }} />;
                                                case 'shape':
                                                    return <CanvasShape key={key} element={el as any} isSelected={false} onSelect={() => { }} onChange={() => { }} />;
                                                case 'symbol':
                                                    return <CanvasSymbol key={key} element={el as any} isSelected={false} onSelect={() => { }} onChange={() => { }} />;
                                                case 'image':
                                                    return <CanvasImage key={key} element={el as any} isSelected={false} onSelect={() => { }} onChange={() => { }} />;
                                                default:
                                                    return null;
                                            }
                                        })}
                                    </Layer>
                                </Stage>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsSymbolDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isUploading || !symbolName}>
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Create Symbol
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
