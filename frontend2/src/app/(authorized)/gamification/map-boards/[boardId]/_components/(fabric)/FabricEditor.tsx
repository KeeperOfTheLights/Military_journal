'use client';

import * as React from 'react';
import { FabricProvider } from './FabricContext';
import { FabricCanvas } from './FabricCanvas';
import { FabricSidebar } from './FabricSidebar';
import { PropertiesPanel } from './PropertiesPanel';

interface FabricEditorProps {
    boardId: number;
    canvasId: number;
    boardName: string;
}

export function FabricEditor({ boardId, canvasId, boardName }: FabricEditorProps) {
    return (
        <FabricProvider>
            <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
                {/* Left Sidebar for draggable tools */}
                <FabricSidebar />

                {/* Center Canvas Area */}
                <FabricCanvas />

                {/* Right Properties Panel */}
                <PropertiesPanel />
            </div>

            {/* Status bar */}
            <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex justify-between">
                <div className="bg-background/80 backdrop-blur px-2 py-1 rounded text-xs border shadow-sm pointer-events-auto">
                    {boardName} (Fabric.js)
                </div>
            </div>
        </FabricProvider>
    );
}
