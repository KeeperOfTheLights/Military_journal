'use client';

import * as React from 'react';
import { useFabric } from './FabricContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Trash2, Group, Ungroup } from 'lucide-react';

export function PropertiesPanel() {
    const { activeObject, updateProperty, removeObject, groupSelection, ungroupSelection } = useFabric();

    if (!activeObject) {
        return (
            <div className="w-64 border-l bg-background p-4 flex flex-col gap-4">
                <div className="text-sm text-muted-foreground text-center mt-10">
                    Select an object to view properties
                </div>
            </div>
        );
    }

    const handleChange = (key: string, value: any) => {
        updateProperty(key, value);
    };

    // Fabric objects have types like 'rect', 'circle', 'i-text', etc.
    const type = activeObject.type;

    // Get current values safely
    // Note: fabric.Object properties can be accessed directly or via get()
    // For React updates, we depend on activeObject state update from context
    const fill = activeObject.fill as string || '#000000';
    const opacity = activeObject.opacity || 1;
    const stroke = activeObject.stroke as string || '#000000';
    const strokeWidth = activeObject.strokeWidth || 0;

    // Text specific
    const text = (activeObject as any).text || '';
    const fontSize = (activeObject as any).fontSize || 16;

    const isActiveSelection = type === 'activeSelection';
    const isGroup = type === 'group';

    return (
        <div className="w-64 border-l bg-background p-4 flex flex-col gap-6 overflow-y-auto h-full">
            <div>
                <h3 className="font-semibold mb-1 capitalize">{type === 'activeSelection' ? 'Selection' : type} Properties</h3>
                <p className="text-xs text-muted-foreground">ID: {(activeObject as any).id || 'N/A'}</p>
            </div>

            {/* Grouping Actions */}
            {(isActiveSelection || isGroup) && (
                <div className="flex gap-2 pb-4 border-b">
                    {isActiveSelection && (
                        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={groupSelection}>
                            <Group className="h-4 w-4" />
                            Group
                        </Button>
                    )}
                    {isGroup && (
                        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={ungroupSelection}>
                            <Ungroup className="h-4 w-4" />
                            Ungroup
                        </Button>
                    )}
                </div>
            )}

            {/* Common Properties */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="opacity">Opacity</Label>
                    <div className="flex items-center gap-2">
                        <Slider
                            id="opacity"
                            min={0}
                            max={1}
                            step={0.1}
                            value={[opacity]}
                            onValueChange={(vals) => handleChange('opacity', vals[0])}
                            className="flex-1"
                        />
                        <span className="text-xs w-8 text-right">{Math.round(opacity * 100)}%</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="fill">Fill Color</Label>
                    <DebouncedColorInput
                        id="fill"
                        value={fill}
                        onChange={(val: string) => handleChange('fill', val)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="stroke">Stroke Color</Label>
                    <DebouncedColorInput
                        id="stroke"
                        value={stroke}
                        onChange={(val: string) => handleChange('stroke', val)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="strokeWidth">Stroke Width</Label>
                    <Input
                        id="strokeWidth"
                        type="number"
                        min={0}
                        value={strokeWidth}
                        onChange={(e) => handleChange('strokeWidth', parseInt(e.target.value))}
                    />
                </div>
            </div>

            {/* Text Specific Properties */}
            {(type === 'i-text' || type === 'text') && (
                <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium text-sm">Text Options</h4>
                    <div className="space-y-2">
                        <Label htmlFor="text-content">Content</Label>
                        <Input
                            id="text-content"
                            value={text}
                            onChange={(e) => handleChange('text', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fontSize">Font Size</Label>
                        <Input
                            id="fontSize"
                            type="number"
                            min={1}
                            value={fontSize}
                            onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                        />
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="mt-auto pt-6 border-t">
                <Button
                    variant="destructive"
                    className="w-full justify-start gap-2"
                    onClick={() => removeObject(activeObject)}
                >
                    <Trash2 className="h-4 w-4" />
                    Delete {isActiveSelection ? 'Selection' : 'Object'}
                </Button>
            </div>
        </div>
    );
}

function DebouncedColorInput({ value, onChange, id }: { value: string, onChange: (val: string) => void, id: string }) {
    const [localValue, setLocalValue] = React.useState(value);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    React.useEffect(() => {
        // Prevent update if identical
        if (localValue === value) return;

        const timer = setTimeout(() => {
            onChange(localValue);
        }, 200); // 200ms debounce
        return () => clearTimeout(timer);
    }, [localValue, onChange, value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);
    };

    return (
        <div className="flex gap-2">
            <Input
                id={id}
                type="color"
                value={localValue}
                onChange={handleChange}
                className="w-10 h-10 p-1 cursor-pointer"
            />
            <Input
                type="text"
                value={localValue}
                onChange={handleChange}
                className="flex-1"
            />
        </div>
    );
}
