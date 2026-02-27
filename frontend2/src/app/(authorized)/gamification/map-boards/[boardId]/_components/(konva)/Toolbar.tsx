'use client';

import React from 'react';
import { useCanvas } from './CanvasContext';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Undo, Redo, Save, Loader2, Download } from "lucide-react";

export const Toolbar = () => {
    const {
        undo, redo, canUndo, canRedo,
        save, isSaving,
        exportCanvas, isExporting,
        stageRef
    } = useCanvas();

    const handleExport = (type: 'png' | 'svg') => {
        exportCanvas(type, stageRef);
    };

    return (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-background/80 backdrop-blur p-2 rounded-md border shadow-sm">
            <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} title="Undo">
                <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} title="Redo">
                <Redo className="h-4 w-4" />
            </Button>

            <div className="w-px h-4 bg-border mx-1" />

            <Button onClick={save} disabled={isSaving} size="sm" className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
            </Button>

            {/* Export Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="Export" disabled={isExporting}>
                        {isExporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('png')}>
                        Export as PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('svg')}>
                        Export as SVG
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
