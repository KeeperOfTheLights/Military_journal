'use client';

import * as React from "react";
import { CanvasProvider } from "./CanvasContext";
import { Canvas } from "./Canvas";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";
import { PropertiesPanel } from "./PropertiesPanel";

interface KonvaEditorProps {
    boardId: number;
    canvasId: number;
    boardName: string;
}

export function KonvaEditor({ boardId, canvasId, boardName }: KonvaEditorProps) {
    return (
        <CanvasProvider canvasId={canvasId} boardId={boardId}>
            <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
                {/* LEFT SIDEBAR: TOOLS */}
                <Sidebar />

                {/* CENTER: CANVAS */}
                <div className="flex-1 relative flex flex-col min-w-0">
                    <Toolbar />
                    <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-3">
                        <h1 className="text-sm font-medium flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            {boardName}
                        </h1>
                    </div>
                    <Canvas />
                </div>

                {/* RIGHT SIDEBAR: PROPERTIES */}
                <div className="w-64 border-l flex flex-col bg-card shadow-sm z-10 h-full overflow-hidden">
                    <div className="p-4 border-b">
                        <h2 className="font-semibold text-lg">Properties</h2>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <PropertiesPanel />
                    </div>
                </div>
            </div>
        </CanvasProvider>
    );
}
