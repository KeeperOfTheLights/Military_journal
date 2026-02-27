'use client';

import * as React from "react";
import { use } from "react";
import { KonvaEditor } from "./_components/(konva)/KonvaEditor";
import { FabricEditor } from "./_components/(fabric)/FabricEditor";
import { Loader2 } from "lucide-react";
import { useGetMapBoardApiGamificationMapBoardsMapBoardIdGet } from "@/api/orval/client/gamification/gamification";
import { useGetCanvasApiCanvasesCanvasIdGet } from "@/api/orval/client/canvases/canvases";
import { CanvasEngineType } from "@/api/orval/client/model";

interface EditorPageProps {
    params: Promise<{ boardId: string }>;
}

export default function EditorPage(props: EditorPageProps) {
    const params = use(props.params);
    const boardId = parseInt(params.boardId);

    // 1. Fetch Board Data
    const {
        data: boardDataResponse,
        isLoading: isBoardLoading,
        isError: isBoardError
    } = useGetMapBoardApiGamificationMapBoardsMapBoardIdGet(boardId, {
        query: {
            enabled: !isNaN(boardId),
            retry: 1,
            staleTime: 0
        }
    });

    const board = boardDataResponse?.status === 200 ? boardDataResponse.data : undefined;
    const canvasId = board?.canvas_id;

    // 2. Fetch Canvas Data (only if we have a canvas ID)
    const {
        data: canvasDataResponse,
        isLoading: isCanvasLoading,
        isError: isCanvasError
    } = useGetCanvasApiCanvasesCanvasIdGet(canvasId!, {
        query: {
            enabled: !!canvasId,
            retry: 1,
            staleTime: 0
        }
    });

    const canvas = canvasDataResponse?.status === 200 ? canvasDataResponse.data : undefined;
    const engineType = canvas?.engine_type;

    // Loading State
    if (isBoardLoading || (canvasId && isCanvasLoading)) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)] w-full">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Loading board...</p>
                </div>
            </div>
        );
    }

    // Error State
    if (isBoardError || isCanvasError || !board || (canvasId && !canvas)) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)] w-full">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">Board Not Found</h1>
                    <p className="text-muted-foreground">
                        The requested board could not be found or you don't have permission to access it.
                    </p>
                    <a
                        href="/gamification/map-boards"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                        Back to Boards
                    </a>
                </div>
            </div>
        );
    }

    // Render based on Engine Type
    if (engineType === CanvasEngineType.konva && canvas && board) {
        return (
            <KonvaEditor
                boardId={boardId}
                canvasId={canvas.id}
                boardName={board.name}
            />
        );
    } else if (engineType === CanvasEngineType.fabric && canvas && board) {
        return (
            <FabricEditor
                boardId={boardId}
                canvasId={canvas.id}
                boardName={board.name}
            />
        );
    }

    // Fallback for unknown engine type (or if engine_type wasn't fetched correctly)
    return (
        <div className="flex items-center justify-center h-[calc(100vh-64px)] w-full">
            <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold">Unknown Canvas Engine</h1>
                <p className="text-muted-foreground">
                    Engine type: {engineType}
                </p>
            </div>
        </div>
    );
}
