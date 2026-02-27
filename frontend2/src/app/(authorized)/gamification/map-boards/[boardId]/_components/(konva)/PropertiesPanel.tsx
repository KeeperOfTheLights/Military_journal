'use client';

import React from 'react';
import { useCanvas, CanvasElement } from './CanvasContext';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, ArrowUp, ArrowDown } from "lucide-react";
import MapUploadDialog from "./MapUploadDialog";

export const PropertiesPanel = () => {
    const {
        selectedIds,
        elements,
        updateElements,
        deleteElements,
        duplicateElements,
        moveElements,
        boardType,
        setBoardType,
        mapScale,
        setMapScale,
        setBackgroundImageUrl
    } = useCanvas();

    if (selectedIds.length === 0) {
        return (
            <div className="space-y-6 p-4">
                <div>
                    <h3 className="text-sm font-medium mb-4">Board Settings</h3>
                    <div className="grid w-full items-center gap-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="board-type">Board Type</Label>
                            <select
                                id="board-type"
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                value={boardType}
                                onChange={(e) => setBoardType(e.target.value as 'page' | 'paper' | 'map')}
                            >
                                <option value="page">Page (Standard)</option>
                                <option value="paper">Paper (Standard)</option>
                                <option value="map">Map (Large)</option>
                            </select>
                        </div>

                        {boardType === 'map' && (
                            <div className="space-y-2">
                                <Label>Map Scale (1:x)</Label>
                                <Input
                                    type="number"
                                    value={mapScale}
                                    onChange={(e) => setMapScale(parseInt(e.target.value))}
                                />
                                <div className="pt-2">
                                    <MapUploadDialog
                                        onUpload={(data: { url: string, scale: number }) => {
                                            setBackgroundImageUrl(data.url);
                                            setMapScale(data.scale);
                                        }}
                                        entityId={0}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (selectedIds.length > 1) {
        return (
            <div className="p-4 space-y-4">
                <h3 className="text-sm font-medium">Multiple Elements ({selectedIds.length})</h3>
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => moveElements(selectedIds, 'front')}>
                        <ArrowUp className="h-3 w-3 mr-1" /> Front
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => moveElements(selectedIds, 'back')}>
                        <ArrowDown className="h-3 w-3 mr-1" /> Back
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => duplicateElements(selectedIds)}>
                        <Copy className="h-4 w-4 mr-2" /> Duplicate
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => deleteElements(selectedIds)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-4">Grouping is available via right-click context menu.</p>
            </div>
        );
    }

    const selectedId = selectedIds[0];
    const selectedEl = elements.find(el => el.id === selectedId);
    if (!selectedEl) return null;

    const updateTransform = (key: string, value: number) => {
        updateElements([selectedId], (prev) => ({
            ...prev,
            transform: {
                ...prev.transform,
                [key]: value
            }
        }));
    };

    const updateField = (key: string, value: any) => {
        updateElements([selectedId], (prev) => {
            if (prev.type === 'text') {
                return {
                    ...prev,
                    fields: {
                        ...prev.fields,
                        [key]: value
                    }
                };
            }
            return prev;
        });
    };

    const updateStyle = (key: string, value: any) => {
        updateElements([selectedId], (prev) => ({
            ...prev,
            style: {
                ...(prev.style || {}),
                [key]: value
            }
        }));
    };

    return (
        <div className="space-y-6 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Element Properties</h3>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => duplicateElements([selectedId])} title="Duplicate">
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteElements([selectedId])} title="Delete" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid w-full items-center gap-3">
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => moveElements([selectedId], 'front')}>
                        <ArrowUp className="h-3 w-3 mr-1" /> Front
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => moveElements([selectedId], 'back')}>
                        <ArrowDown className="h-3 w-3 mr-1" /> Back
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="grid w-full items-center gap-1.5">
                        <Label>X</Label>
                        <Input
                            type="number"
                            value={Math.round(selectedEl.transform.x)}
                            onChange={(e) => updateTransform('x', parseInt(e.target.value))}
                            className="h-8"
                        />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label>Y</Label>
                        <Input
                            type="number"
                            value={Math.round(selectedEl.transform.y)}
                            onChange={(e) => updateTransform('y', parseInt(e.target.value))}
                            className="h-8"
                        />
                    </div>
                </div>

                {selectedEl.type === 'text' && (
                    <>
                        <div className="grid w-full items-center gap-1.5">
                            <Label>Text</Label>
                            <Input
                                value={selectedEl.fields.text}
                                onChange={(e) => updateField('text', e.target.value)}
                                className="h-8"
                            />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label>Font Size</Label>
                            <Input
                                type="number"
                                value={selectedEl.fields.fontSize}
                                onChange={(e) => updateField('fontSize', parseInt(e.target.value))}
                                className="h-8"
                            />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label>Color</Label>
                            <DebouncedColorInput
                                value={selectedEl.fields.color || '#000000'}
                                onChange={(val: string) => updateField('color', val)}
                                className="h-8 w-full p-1"
                            />
                        </div>
                    </>
                )}

                {(selectedEl.type === 'shape' || selectedEl.type === 'symbol') && (
                    <>
                        <div className="grid w-full items-center gap-1.5">
                            <Label>Opacity</Label>
                            <Input
                                type="number"
                                min="0" max="1" step="0.1"
                                value={selectedEl.style?.opacity ?? 1}
                                onChange={(e) => updateStyle('opacity', parseFloat(e.target.value))}
                                className="h-8"
                            />
                        </div>
                    </>
                )}

                {selectedEl.type === 'shape' && (
                    <div className="grid w-full items-center gap-1.5">
                        <Label>Fill Color</Label>
                        <DebouncedColorInput
                            value={selectedEl.style?.fill || '#000000'}
                            onChange={(val: string) => updateStyle('fill', val)}
                            className="h-8 w-full p-1"
                        />
                    </div>
                )}

                {selectedEl.type === 'symbol' && (
                    <div className="grid w-full items-center gap-1.5">
                        <Label>Symbol Color</Label>
                        <div className="flex gap-2 mb-2">
                            {['#000000', '#FF0000', '#0000FF', '#008000'].map(color => (
                                <div
                                    key={color}
                                    className={`w-6 h-6 rounded-full cursor-pointer border ${selectedEl.style?.fill === color ? 'border-2 border-primary' : 'border-gray-300'}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => updateStyle('fill', color)}
                                />
                            ))}
                        </div>
                        <DebouncedColorInput
                            value={selectedEl.style?.fill || '#000000'}
                            onChange={(val: string) => updateStyle('fill', val)}
                            className="h-8 w-full p-1"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// Local component for debounced color input
function DebouncedColorInput({ value, onChange, className }: { value: string, onChange: (val: string) => void, className?: string }) {
    const [localValue, setLocalValue] = React.useState(value);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    React.useEffect(() => {
        if (localValue === value) return;
        const timer = setTimeout(() => {
            onChange(localValue);
        }, 200);
        return () => clearTimeout(timer);
    }, [localValue, onChange, value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);
    };

    return (
        <Input
            type="color"
            value={localValue}
            onChange={handleChange}
            className={className}
        />
    );
}
