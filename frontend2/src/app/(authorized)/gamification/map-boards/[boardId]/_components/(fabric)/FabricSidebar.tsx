'use client';

import * as React from 'react';
import { Square, Circle, Type, Triangle, Hexagon, Image } from 'lucide-react';
import { useListSymbolsApiGamificationSymbolsGet } from '@/api/orval/client/gamification/gamification';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export function FabricSidebar() {
    const { data: symbolsResponse, isLoading: isSymbolsLoading } = useListSymbolsApiGamificationSymbolsGet({
        skip: 0,
        limit: 50,
    });

    // Type guard checking status
    const symbols = symbolsResponse?.status === 200 ? symbolsResponse.data : [];

    return (
        <div className="w-64 h-full border-r bg-background flex flex-col p-4 gap-6">
            <h3 className="font-semibold text-sm">Tools & Shapes</h3>

            {/* Basic Shapes */}
            <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase font-medium">Basic</span>
                <div className="grid grid-cols-3 gap-2">
                    <DraggableItem
                        type="rect"
                        icon={<Square className="h-5 w-5" />}
                        label="Rect"
                    />
                    <DraggableItem
                        type="circle"
                        icon={<Circle className="h-5 w-5" />}
                        label="Circle"
                    />
                    <DraggableItem
                        type="text"
                        icon={<Type className="h-5 w-5" />}
                        label="Text"
                    />
                    <DraggableItem
                        type="triangle"
                        icon={<Triangle className="h-5 w-5" />}
                        label="Tri"
                    />
                    <DraggableItem
                        type="polygon"
                        icon={<Hexagon className="h-5 w-5" />}
                        label="Poly"
                    />
                </div>
            </div>

            {/* Symbols */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                <span className="text-xs text-muted-foreground uppercase font-medium mb-2">Symbols</span>
                <ScrollArea className="flex-1 -mx-2 px-2">
                    {isSymbolsLoading ? (
                        <div className="grid grid-cols-2 gap-2">
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full rounded-md" />
                            ))}
                        </div>
                    ) : symbols.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-4">
                            No symbols available.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 pb-4">
                            {symbols.map((symbol) => (
                                <DraggableSymbol
                                    key={symbol.id}
                                    symbol={symbol}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}

function DraggableItem({ type, icon, label }: { type: string, icon: React.ReactNode, label: string }) {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('fabric-type', type);
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="flex flex-col items-center justify-center p-2 rounded-md border bg-card hover:bg-accent hover:text-accent-foreground transition-colors cursor-grab active:cursor-grabbing h-20 shadow-sm"
            title={label}
        >
            <div className="mb-1 text-primary/80">
                {icon}
            </div>
            <span className="text-[10px] font-medium text-center truncate w-full">{label}</span>
        </div>
    );
}

function DraggableSymbol({ symbol }: { symbol: any }) {
    const imageUrl = symbol.attachment?.url;

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (!imageUrl) return;

        e.dataTransfer.setData('fabric-type', 'symbol');
        e.dataTransfer.setData('symbol-url', imageUrl);
        e.dataTransfer.setData('symbol-name', symbol.name);
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div
            draggable={!!imageUrl}
            onDragStart={handleDragStart}
            className="group relative flex flex-col items-center p-2 rounded-md border bg-card hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing hover:shadow-md h-24 overflow-hidden"
            title={symbol.name}
        >
            <div className="flex-1 w-full flex items-center justify-center mb-1 relative overflow-hidden">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={symbol.name}
                        className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-110 transition-transform"
                    />
                ) : (
                    <Image className="h-6 w-6 text-muted-foreground" />
                )}
            </div>
            <span className="text-[10px] font-medium text-center truncate w-full px-1 bg-background/80 backdrop-blur-sm rounded-b-md">
                {symbol.name}
            </span>
        </div>
    );
}
