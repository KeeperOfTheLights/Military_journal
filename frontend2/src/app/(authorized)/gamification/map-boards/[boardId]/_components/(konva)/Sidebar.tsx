'use client';

import React, { useMemo } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Square, Circle as CircleIcon, Type, Image as ImageIcon } from "lucide-react";
import { useListSymbolsApiGamificationSymbolsGet } from "@/api/orval/client/gamification/gamification";
import Link from 'next/link';
import LinkSymbolDialog from '../../../../_components/LinkSymbolDialog';
import { Skeleton } from "@/components/ui/skeleton";

export const Sidebar = () => {
    const { data: symbolsData, isLoading: isSymbolsLoading } = useListSymbolsApiGamificationSymbolsGet();

    const handleDragStart = (e: React.DragEvent, type: string, extra?: any) => {
        e.dataTransfer.setData("type", type);
        if (extra) {
            Object.entries(extra).forEach(([key, value]) => {
                e.dataTransfer.setData(key, String(value));
            });
        }
    };

    const renderedSymbols = useMemo(() => {
        if (isSymbolsLoading) {
            return (
                <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            );
        }
        return (
            <div className="grid grid-cols-2 gap-2">
                {symbolsData?.status === 200 && symbolsData.data.map((symbol) => {
                    const imageUrl = symbol.thumbnail_attachment?.url || symbol.attachment?.url || '';
                    return (
                        <div
                            key={symbol.id}
                            className="border rounded p-2 hover:bg-accent hover:text-accent-foreground cursor-grab active:cursor-grabbing flex flex-col items-center gap-1 transition-colors"
                            title={symbol.name}
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'symbol', { symbolId: symbol.id, symbolUrl: imageUrl })}
                        >
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={symbol.name}
                                    className="h-10 w-10 object-contain pointer-events-none"
                                />
                            ) : (
                                <ImageIcon className="h-8 w-8 text-muted-foreground pointer-events-none" />
                            )}
                            <span className="text-xs truncate w-full text-center text-muted-foreground pointer-events-none">{symbol.name}</span>
                        </div>
                    );
                })}
                {(!symbolsData || symbolsData.status !== 200 || symbolsData.data.length === 0) && (
                    <div className="col-span-2 text-xs text-muted-foreground text-center py-4">No symbols found</div>
                )}
            </div>
        );
    }, [isSymbolsLoading, symbolsData]);

    return (
        <div className="w-64 border-r flex flex-col bg-card z-10 shadow-sm h-full">
            <div className="p-4 border-b">
                <h2 className="font-semibold text-lg">Tools</h2>
            </div>
            <ScrollArea className="flex-1">
                <Accordion type="multiple" defaultValue={["elements", "symbols"]} className="w-full">
                    <AccordionItem value="elements">
                        <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/50">Elements</AccordionTrigger>
                        <AccordionContent className="px-4 py-2">
                            <div className="grid grid-cols-2 gap-2">
                                <ToolButton icon={Square} label="Rectangle" onDragStart={(e) => handleDragStart(e, 'rect')} />
                                <ToolButton icon={CircleIcon} label="Circle" onDragStart={(e) => handleDragStart(e, 'circle')} />
                                <ToolButton icon={Type} label="Text" onDragStart={(e) => handleDragStart(e, 'text')} />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="symbols">
                        <div className="flex items-center pr-2 group hover:bg-muted/50 transition-colors">
                            <AccordionTrigger className="flex-1 px-4 py-2 hover:no-underline hover:bg-transparent">Symbols</AccordionTrigger>
                            <Link href="/gamification/symbols" className="text-xs text-muted-foreground hover:text-foreground transition-colors mr-1">
                                View All
                            </Link>
                            <LinkSymbolDialog />
                        </div>
                        <AccordionContent className="px-4 py-2">
                            {renderedSymbols}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </ScrollArea>
        </div>
    );
};

function ToolButton({ icon: Icon, label, onDragStart }: { icon: any, label: string, onDragStart: (e: React.DragEvent) => void }) {
    return (
        <div
            className="flex flex-col items-center justify-center p-3 border rounded-md hover:bg-accent hover:text-accent-foreground cursor-grab active:cursor-grabbing transition-all hover:shadow-sm bg-background"
            draggable
            onDragStart={onDragStart}
        >
            <Icon className="h-5 w-5 mb-1.5 pointer-events-none" />
            <span className="text-xs font-medium pointer-events-none">{label}</span>
        </div>
    )
}
