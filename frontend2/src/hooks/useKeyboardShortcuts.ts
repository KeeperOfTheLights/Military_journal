import { useEffect } from "react";
import { useCanvas } from "@/app/(authorized)/gamification/map-boards/[boardId]/_components/(konva)/CanvasContext";

export const useKeyboardShortcuts = () => {
    const {
        selectedId,
        deleteElement,
        copy,
        paste,
        undo,
        redo,
        canUndo,
        canRedo,
        updateElement,
        elements
    } = useCanvas();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            // Delete
            if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
                e.preventDefault();
                deleteElement(selectedId);
            }

            // Copy
            if (e.key === "c" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
                e.preventDefault();
                copy();
            }

            // Paste
            if (e.key === "v" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
                e.preventDefault();
                paste(); // Paste handles offset and ID generation
            }

            // Undo
            if (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
                e.preventDefault();
                if (canUndo) undo();
            }

            // Redo (Ctrl+Y or Ctrl+Shift+Z)
            if (
                (e.key.toLowerCase() === "y" && (e.ctrlKey || e.metaKey)) ||
                (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)
            ) {
                e.preventDefault();
                if (canRedo) redo();
            }

            // Nudge with Arrow Keys
            if (selectedId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
                const element = elements.find(el => el.id === selectedId);
                if (element && !element.properties?.locked) {
                    const step = e.shiftKey ? 10 : 1;
                    const change = { x: 0, y: 0 };

                    if (e.key === "ArrowUp") change.y = -step;
                    if (e.key === "ArrowDown") change.y = step;
                    if (e.key === "ArrowLeft") change.x = -step;
                    if (e.key === "ArrowRight") change.x = step;

                    updateElement(selectedId, {
                        transform: {
                            ...element.transform,
                            x: element.transform.x + change.x,
                            y: element.transform.y + change.y
                        }
                    });
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        selectedId,
        elements,
        deleteElement,
        copy,
        paste,
        undo,
        redo,
        canUndo,
        canRedo,
        updateElement
    ]);
};
