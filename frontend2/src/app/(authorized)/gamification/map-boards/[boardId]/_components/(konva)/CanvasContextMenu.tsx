'use client';

import { Button } from "@/components/ui/button";
import {
    BringToFront,
    Copy,
    SendToBack,
    Trash2,
    Boxes,
    Edit3
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useCanvas } from "./CanvasContext";

interface CanvasContextMenuProps {
    position: { x: number; y: number } | null;
    onClose: () => void;
    onEditText?: () => void;
}

export function CanvasContextMenu({
    position,
    onClose,
    onEditText
}: CanvasContextMenuProps) {
    const {
        deleteElements,
        duplicateElements,
        moveElements,
        selectedIds,
        groupSelection,
        elements,
        setIsSymbolDialogOpen
    } = useCanvas();

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [onClose]);

    if (!position || selectedIds.length === 0) return null;

    const isSingleText = selectedIds.length === 1 && elements.find(el => el.id === selectedIds[0])?.type === 'text';
    const isMultiSelection = selectedIds.length > 1;

    return (
        <div
            ref={ref}
            className="fixed z-50 w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95"
            style={{ top: position.y, left: position.x }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="flex flex-col gap-1">
                {isSingleText && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start h-8 px-2 text-xs"
                        onClick={() => { onEditText?.(); onClose(); }}
                    >
                        <Edit3 className="mr-2 h-3.5 w-3.5" />
                        Edit Text
                    </Button>
                )}

                {isMultiSelection && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start h-8 px-2 text-xs"
                        onClick={() => { setIsSymbolDialogOpen(true); onClose(); }}
                    >
                        <Boxes className="mr-2 h-3.5 w-3.5" />
                        Create Symbol
                    </Button>
                )}

                {(isSingleText || isMultiSelection) && <div className="h-px bg-muted my-1" />}

                <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8 px-2 text-xs"
                    onClick={() => { duplicateElements(selectedIds); onClose(); }}
                >
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    Duplicate
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8 px-2 text-xs"
                    onClick={() => { moveElements(selectedIds, 'front'); onClose(); }}
                >
                    <BringToFront className="mr-2 h-3.5 w-3.5" />
                    Bring to Front
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8 px-2 text-xs"
                    onClick={() => { moveElements(selectedIds, 'back'); onClose(); }}
                >
                    <SendToBack className="mr-2 h-3.5 w-3.5" />
                    Send to Back
                </Button>

                <div className="h-px bg-muted my-1" />

                <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => { deleteElements(selectedIds); onClose(); }}
                >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                </Button>
            </div>
        </div>
    );
}
