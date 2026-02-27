'use client';

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { getCorsSafeDataURL } from './export-utils';
import { toast } from 'sonner';
import {
    useLoadCanvasContentApiCanvasesCanvasIdLoadContentGet,
    useSaveCanvasContentApiCanvasesCanvasIdSaveContentPost
} from "@/api/orval/client/canvases/canvases";
import type {
    CanvasTextObject,
    CanvasImageObject,
    CanvasShapeObjectOutput,
    CanvasSymbolObject,
    CanvasContentInput,
} from "@/api/orval/client/model";
import { useQueryClient } from "@tanstack/react-query";

export type CanvasElement =
    | CanvasTextObject
    | CanvasImageObject
    | CanvasShapeObjectOutput
    | CanvasSymbolObject;

interface CanvasContextType {
    elements: CanvasElement[];
    setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
    selectedIds: string[];
    setSelectedIds: (ids: string[]) => void;
    stageScale: number;
    setStageScale: (scale: number) => void;
    stagePosition: { x: number, y: number };
    setStagePosition: (pos: { x: number, y: number }) => void;
    boardType: 'page' | 'paper' | 'map';
    setBoardType: (type: 'page' | 'paper' | 'map') => void;
    backgroundImageUrl: string | null;
    setBackgroundImageUrl: (url: string | null) => void;
    mapScale: number;
    setMapScale: (scale: number) => void;

    addElement: (element: CanvasElement) => void;
    updateElements: (ids: string[], updates: Partial<CanvasElement> | ((prev: CanvasElement) => Partial<CanvasElement>)) => void;
    deleteElements: (ids: string[]) => void;
    duplicateElements: (ids: string[]) => void;
    moveElements: (ids: string[], to: 'front' | 'back' | 'forward' | 'backward') => void;
    copy: () => void;
    paste: () => void;

    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;

    isLoading: boolean;
    isSaving: boolean;
    isExporting: boolean;
    save: () => void;
    exportCanvas: (type: 'png' | 'svg', stageRef: React.RefObject<any>) => void;

    stageRef: React.RefObject<any>;
    boardId: number;

    groupSelection: () => void;
    isSymbolDialogOpen: boolean;
    setIsSymbolDialogOpen: (open: boolean) => void;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

export const useCanvas = () => {
    const context = useContext(CanvasContext);
    if (!context) throw new Error("useCanvas must be used within CanvasProvider");
    return context;
};

interface HistoryState {
    elements: CanvasElement[];
    boardType: 'page' | 'paper' | 'map';
    backgroundImageUrl: string | null;
    mapScale: number;
}

export const CanvasProvider = ({
    children,
    canvasId,
    boardId
}: {
    children: React.ReactNode;
    canvasId: number;
    boardId: number;
}) => {
    const queryClient = useQueryClient();
    const stageRef = useRef<any>(null);

    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [stageScale, setStageScale] = useState(0.6);
    const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
    const [boardType, setBoardType] = useState<'page' | 'paper' | 'map'>('page');
    const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
    const [mapScale, setMapScale] = useState<number>(50000);

    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyStep, setHistoryStep] = useState(-1);
    const [clipboard, setClipboard] = useState<CanvasElement[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [isSymbolDialogOpen, setIsSymbolDialogOpen] = useState(false);

    const { data: canvasData, isLoading } = useLoadCanvasContentApiCanvasesCanvasIdLoadContentGet(canvasId, {
        query: {
            enabled: !!canvasId,
            staleTime: 0,
            refetchOnWindowFocus: false
        }
    });

    const { mutate: saveContent, isPending: isSaving } = useSaveCanvasContentApiCanvasesCanvasIdSaveContentPost({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: [`/api/canvases/${canvasId}/load-content`] });
                toast.success("Canvas saved");
            },
            onError: (err) => {
                console.error("Failed to save canvas", err);
                toast.error("Failed to save canvas");
            }
        }
    });

    useEffect(() => {
        if (canvasData?.status === 200 && canvasData.data) {
            const content = canvasData.data;
            if (content.objects) {
                setElements(content.objects);
            }
            if (content.metadata) {
                if (content.metadata.boardType) setBoardType(content.metadata.boardType as any);
                if (content.metadata.backgroundImageUrl) setBackgroundImageUrl(content.metadata.backgroundImageUrl as string);
                if (content.metadata.mapScale) setMapScale(Number(content.metadata.mapScale));
            }
            setHistory([{
                elements: content.objects || [],
                boardType: (content.metadata?.boardType as any) || 'page',
                backgroundImageUrl: (content.metadata?.backgroundImageUrl as string) || null,
                mapScale: Number(content.metadata?.mapScale) || 50000
            }]);
            setHistoryStep(0);
        }
    }, [canvasData]);

    const save = useCallback(() => {
        if (!canvasId) return;

        const payload: CanvasContentInput = {
            version: "1.0.0",
            objects: elements,
            metadata: {
                boardType,
                backgroundImageUrl,
                mapScale
            }
        };

        saveContent({ canvasId, data: payload });
    }, [canvasId, elements, boardType, backgroundImageUrl, mapScale, saveContent]);

    const addToHistory = useCallback((
        newElements: CanvasElement[],
        newBoardType: 'page' | 'paper' | 'map',
        newBg: string | null,
        newScale: number
    ) => {
        const newStep = historyStep + 1;
        const newHistory = history.slice(0, newStep);
        newHistory.push({
            elements: newElements,
            boardType: newBoardType,
            backgroundImageUrl: newBg,
            mapScale: newScale
        });
        setHistory(newHistory);
        setHistoryStep(newStep);
    }, [history, historyStep]);

    const addElement = useCallback((element: CanvasElement) => {
        const newElements = [...elements, element];
        setElements(newElements);
        addToHistory(newElements, boardType, backgroundImageUrl, mapScale);
        setSelectedIds([element.id]);
    }, [elements, boardType, backgroundImageUrl, mapScale, addToHistory]);

    const updateElements = useCallback((ids: string[], updates: Partial<CanvasElement> | ((prev: CanvasElement) => Partial<CanvasElement>)) => {
        setElements(prev => {
            const next = prev.map(el => {
                if (!ids.includes(el.id)) return el;
                const newValues = typeof updates === 'function' ? updates(el) : updates;
                return { ...el, ...newValues } as CanvasElement;
            });
            addToHistory(next, boardType, backgroundImageUrl, mapScale);
            return next;
        });
    }, [boardType, backgroundImageUrl, mapScale, addToHistory]);

    const deleteElements = useCallback((ids: string[]) => {
        const newElements = elements.filter(el => !ids.includes(el.id));
        setElements(newElements);
        addToHistory(newElements, boardType, backgroundImageUrl, mapScale);
        setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    }, [elements, boardType, backgroundImageUrl, mapScale, addToHistory]);

    const duplicateElements = useCallback((ids: string[]) => {
        const toDup = elements.filter(e => ids.includes(e.id));
        if (toDup.length === 0) return;

        const newElementsToAdd = toDup.map(el => ({
            ...el,
            id: crypto.randomUUID(),
            transform: {
                ...el.transform,
                x: el.transform.x + 20,
                y: el.transform.y + 20
            }
        }));

        const nextElements = [...elements, ...newElementsToAdd];
        setElements(nextElements);
        addToHistory(nextElements, boardType, backgroundImageUrl, mapScale);
        setSelectedIds(newElementsToAdd.map(el => el.id));
    }, [elements, boardType, backgroundImageUrl, mapScale, addToHistory]);

    const moveElements = useCallback((ids: string[], to: 'front' | 'back' | 'forward' | 'backward') => {
        setElements(prev => {
            const newArr = [...prev];
            // Sort ids by their current index to preserve relative order during move
            const sortedIds = ids.slice().sort((a, b) => {
                return prev.findIndex(el => el.id === a) - prev.findIndex(el => el.id === b);
            });

            if (to === 'front') {
                const moving = newArr.filter(el => ids.includes(el.id));
                const remaining = newArr.filter(el => !ids.includes(el.id));
                const res = [...remaining, ...moving];
                addToHistory(res, boardType, backgroundImageUrl, mapScale);
                return res;
            } else if (to === 'back') {
                const moving = newArr.filter(el => ids.includes(el.id));
                const remaining = newArr.filter(el => !ids.includes(el.id));
                const res = [...moving, ...remaining];
                addToHistory(res, boardType, backgroundImageUrl, mapScale);
                return res;
            } else if (to === 'forward') {
                // Simplified move forward
                const res = [...newArr];
                // we iterate from end to front to avoid index shift issues
                for (let i = res.length - 2; i >= 0; i--) {
                    if (ids.includes(res[i].id) && !ids.includes(res[i + 1].id)) {
                        [res[i], res[i + 1]] = [res[i + 1], res[i]];
                    }
                }
                addToHistory(res, boardType, backgroundImageUrl, mapScale);
                return res;
            } else if (to === 'backward') {
                const res = [...newArr];
                for (let i = 1; i < res.length; i++) {
                    if (ids.includes(res[i].id) && !ids.includes(res[i - 1].id)) {
                        [res[i], res[i - 1]] = [res[i - 1], res[i]];
                    }
                }
                addToHistory(res, boardType, backgroundImageUrl, mapScale);
                return res;
            }

            return prev;
        });
    }, [boardType, backgroundImageUrl, mapScale, addToHistory]);

    const groupSelection = useCallback(() => {
        console.log("Grouping selection:", selectedIds);
        toast.info("Grouping is not yet persistently supported by backend, but items are logically grouped in UI selection.");
    }, [selectedIds]);

    const copy = useCallback(() => {
        const selected = elements.filter(el => selectedIds.includes(el.id));
        if (selected.length > 0) {
            setClipboard(selected);
            toast.success(`${selected.length} items copied`);
        }
    }, [selectedIds, elements]);

    const paste = useCallback(() => {
        if (clipboard.length === 0) return;

        const newElementsToAdd = clipboard.map(el => ({
            ...el,
            id: crypto.randomUUID(),
            transform: {
                ...el.transform,
                x: el.transform.x + 20,
                y: el.transform.y + 20
            }
        }));

        const nextElements = [...elements, ...newElementsToAdd];
        setElements(nextElements);
        addToHistory(nextElements, boardType, backgroundImageUrl, mapScale);
        setSelectedIds(newElementsToAdd.map(el => el.id));
        toast.success("Pasted");
    }, [clipboard, elements, boardType, backgroundImageUrl, mapScale, addToHistory]);

    const undo = useCallback(() => {
        if (historyStep > 0) {
            const prev = history[historyStep - 1];
            setElements(prev.elements);
            setBoardType(prev.boardType);
            setBackgroundImageUrl(prev.backgroundImageUrl);
            setMapScale(prev.mapScale);
            setHistoryStep(historyStep - 1);
        }
    }, [history, historyStep]);

    const redo = useCallback(() => {
        if (historyStep < history.length - 1) {
            const next = history[historyStep + 1];
            setElements(next.elements);
            setBoardType(next.boardType);
            setBackgroundImageUrl(next.backgroundImageUrl);
            setMapScale(next.mapScale);
            setHistoryStep(historyStep + 1);
        }
    }, [history, historyStep]);

    const exportCanvas = useCallback(async (type: 'png' | 'svg', stageRef: React.RefObject<any>) => {
        if (!stageRef.current) {
            toast.error('Canvas not ready for export');
            return;
        }

        setIsExporting(true);
        try {
            if (type === 'png') {
                const dataURL = await getCorsSafeDataURL(stageRef, 2);
                const link = document.createElement('a');
                link.download = `canvas-${boardId}-${Date.now()}.png`;
                link.href = dataURL;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Exported as PNG');
            } else if (type === 'svg') {
                const stage = stageRef.current;
                const dataURL = stage.toDataURL({ pixelRatio: 2 });
                const link = document.createElement('a');
                link.download = `canvas-${boardId}-${Date.now()}.svg`;
                link.href = dataURL;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Exported as SVG');
            }
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export canvas');
        } finally {
            setIsExporting(false);
        }
    }, [boardId]);

    return (
        <CanvasContext.Provider value={{
            elements, setElements,
            selectedIds, setSelectedIds,
            stageScale, setStageScale,
            stagePosition, setStagePosition,
            boardType, setBoardType,
            backgroundImageUrl, setBackgroundImageUrl,
            mapScale, setMapScale,

            addElement,
            updateElements,
            deleteElements,
            duplicateElements,
            moveElements,
            copy,
            paste,

            undo,
            redo,
            canUndo: historyStep > 0,
            canRedo: historyStep < history.length - 1,

            isLoading,
            isSaving,
            isExporting,
            save,
            exportCanvas,

            stageRef,
            boardId,
            groupSelection,
            isSymbolDialogOpen,
            setIsSymbolDialogOpen
        }}>
            {children}
        </CanvasContext.Provider>
    );
};
