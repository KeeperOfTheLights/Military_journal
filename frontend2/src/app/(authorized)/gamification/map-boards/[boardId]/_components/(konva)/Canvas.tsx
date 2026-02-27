'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Group, Text } from 'react-konva';
import useImage from 'use-image';
import { useCanvas, CanvasElement } from './CanvasContext';
import { CanvasText, CanvasShape, CanvasSymbol, CanvasImage } from './CanvasObjects';
import { Transformer } from './Transformer';
import Konva from 'konva';
import { CanvasShapeObjectOutput, CanvasTextObject, CanvasSymbolObject } from '@/api/orval/client/model';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { CanvasContextMenu } from './CanvasContextMenu';
import SymbolCreateDialog from './SymbolCreateDialog';

export const Canvas = () => {
    const {
        elements,
        selectedIds, setSelectedIds,
        updateElements,
        addElement,
        stageScale, setStageScale,
        stagePosition, setStagePosition,
        backgroundImageUrl,
        stageRef,
        boardType,
        mapScale
    } = useCanvas();

    useKeyboardShortcuts();

    const proxyBackgroundUrl = backgroundImageUrl && backgroundImageUrl.startsWith('http')
        ? `/api/proxy-image?url=${encodeURIComponent(backgroundImageUrl)}`
        : backgroundImageUrl || '';

    const [bgImage] = useImage(proxyBackgroundUrl);
    const containerRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Text Editing State (keeping for manual trigger via context menu if needed, but removing dblclick)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [editPosition, setEditPosition] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
        fontSize: number;
        rotation: number;
    } | null>(null);

    const paperWidth = 800;
    const paperHeight = 1100;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!stageRef.current) return;

        stageRef.current.setPointersPositions(e);
        const stage = stageRef.current.getStage();
        const pointerPosition = stage.getRelativePointerPosition();

        if (!pointerPosition) return;

        const type = e.dataTransfer.getData("type");

        if (!type) return;

        const id = crypto.randomUUID();
        const commonTransform = {
            x: pointerPosition.x,
            y: pointerPosition.y,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
        };

        const commonProps = {
            id,
            transform: commonTransform,
            style: { opacity: 1 },
            properties: {
                name: 'New Object',
                locked: false,
                visible: true
            }
        };

        if (type === 'rect') {
            const rect: CanvasShapeObjectOutput = {
                ...commonProps,
                type: 'shape',
                fields: { shapeType: 'rectangle' },
                style: { ...commonProps.style, fill: 'red', strokeWidth: 1 }
            };
            addElement(rect);
        } else if (type === 'circle') {
            const circle: CanvasShapeObjectOutput = {
                ...commonProps,
                type: 'shape',
                fields: { shapeType: 'circle' },
                style: { ...commonProps.style, fill: 'blue', strokeWidth: 1 }
            };
            addElement(circle);
        } else if (type === 'text') {
            const text: CanvasTextObject = {
                ...commonProps,
                type: 'text',
                fields: {
                    text: 'Right click to edit',
                    fontSize: 20,
                    fontFamily: 'Arial',
                    color: 'black',
                    textAlign: 'left',
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    textDecoration: 'none'
                }
            };
            addElement(text);
        } else if (type === 'symbol') {
            const symbolIdStr = e.dataTransfer.getData("symbolId");
            const symbolUrlRaw = e.dataTransfer.getData("symbolUrl");
            if (symbolIdStr && symbolUrlRaw) {
                const img = new Image();
                img.onload = () => {
                    const aspectRatio = img.width / img.height;
                    const baseSize = 60;
                    let width, height;

                    if (aspectRatio > 1) {
                        width = baseSize;
                        height = baseSize / aspectRatio;
                    } else {
                        height = baseSize;
                        width = baseSize * aspectRatio;
                    }

                    const symbol: CanvasSymbolObject = {
                        ...commonProps,
                        type: 'symbol',
                        fields: { symbol_id: parseInt(symbolIdStr) },
                        transform: {
                            ...commonTransform,
                            width,
                            height
                        }
                    };
                    addElement(symbol);
                };
                img.onerror = () => {
                    const symbol: CanvasSymbolObject = {
                        ...commonProps,
                        type: 'symbol',
                        fields: { symbol_id: parseInt(symbolIdStr) },
                        transform: {
                            ...commonTransform,
                            width: 60,
                            height: 60
                        }
                    };
                    addElement(symbol);
                };

                const symbolUrl = symbolUrlRaw.startsWith('http')
                    ? `/api/proxy-image?url=${encodeURIComponent(symbolUrlRaw)}`
                    : symbolUrlRaw;
                img.src = symbolUrl;
            }
        }
    };

    // Context Menu State
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

    const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
        e.evt.preventDefault();

        // If clicked on empty stage
        if (e.target === e.target.getStage()) {
            setMenuPosition(null);
            return;
        }

        const nodeId = e.target.id();

        if (nodeId) {
            const pointer = e.target.getStage()?.getPointerPosition();
            if (pointer) {
                setMenuPosition({
                    x: e.evt.clientX,
                    y: e.evt.clientY
                });

                if (!selectedIds.includes(nodeId)) {
                    setSelectedIds([nodeId]);
                }
            }
        }
    };

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        if (e.target === stage) {
            setSelectedIds([]);
            setMenuPosition(null);
            return;
        }

        const id = e.target.id();
        if (!id) return;

        const isShiftPressed = e.evt.shiftKey || e.evt.metaKey;
        const isSelected = selectedIds.includes(id);

        if (isShiftPressed) {
            if (isSelected) {
                setSelectedIds(selectedIds.filter(v => v !== id));
            } else {
                setSelectedIds([...selectedIds, id]);
            }
        } else {
            if (!isSelected) {
                setSelectedIds([id]);
            }

            // If already selected and part of a group, maybe trigger menu on click?
            // "use simple context menu on group clicked"
            if (isSelected && selectedIds.length > 1) {
                setMenuPosition({
                    x: (e.evt as any).clientX || (e.evt as any).touches?.[0]?.clientX,
                    y: (e.evt as any).clientY || (e.evt as any).touches?.[0]?.clientY
                });
            }
        }
    };

    const handleOnWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;
        const stage = e.target.getStage();
        if (!stage) return;

        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();

        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

        setStageScale(newScale);

        const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };
        setStagePosition(newPos);
    };

    const getDragBoundFunc = React.useCallback((stage: Konva.Stage | null) => {
        if (!stage || (boardType !== 'page' && boardType !== 'paper')) return undefined;
        return function (this: Konva.Node, pos: { x: number; y: number }) {
            return pos;
        };
    }, [boardType]);

    const handleTextEditStart = (id: string) => {
        const el = elements.find(e => e.id === id);
        if (el?.type !== 'text') return;

        const stage = stageRef.current?.getStage();
        if (!stage) return;

        const textNode = stage.findOne("#" + id) as Konva.Text;
        if (!textNode) return;

        textNode.hide();
        const tr = stage.findOne('Transformer');
        if (tr) tr.hide();

        const layer = textNode.getLayer();
        if (layer) layer.batchDraw();

        const textPosition = textNode.absolutePosition();

        const areaPosition = {
            x: textPosition.x,
            y: textPosition.y,
            width: textNode.width() * textNode.scaleX(),
            height: textNode.height() * textNode.scaleY(),
            fontSize: textNode.fontSize() * stage.scaleX(),
            rotation: textNode.rotation(),
        };

        setEditingId(id);
        setEditText(el.fields.text);
        setEditPosition(areaPosition);

        setTimeout(() => {
            if (textAreaRef.current) {
                textAreaRef.current.focus();
                textAreaRef.current.style.height = "auto";
                textAreaRef.current.style.height = textAreaRef.current.scrollHeight + "px";
            }
        }, 50);
    };

    const handleTextEditComplete = () => {
        if (!editingId) return;

        const el = elements.find(e => e.id === editingId);
        if (el && el.type === 'text') {
            updateElements([editingId], (prev) => {
                if (prev.type !== 'text') return prev;
                return {
                    ...prev,
                    fields: { ...prev.fields, text: editText }
                };
            });
        }

        const stage = stageRef.current?.getStage();
        if (stage) {
            const textNode = stage.findOne("#" + editingId);
            if (textNode) {
                textNode.show();
                const tr = stage.findOne("Transformer");
                if (tr) tr.show();
                stage.batchDraw();
            }
        }

        setEditingId(null);
        setEditPosition(null);
    };


    const BoardBackground = React.memo(({ type, width, height, image }: { type: string, width: number, height: number, image?: any }) => {
        const infiniteFill = (type === 'page' || type === 'paper') ? "#e5e7eb" : "#cbd5e1";
        const contentFill = (type === 'page' || type === 'paper') ? "#ffffff" : "#f8fafc";
        const shadowProps = (type === 'page' || type === 'paper') ? {
            shadowColor: "black",
            shadowBlur: 20,
            shadowOpacity: 0.1,
            shadowOffset: { x: 0, y: 10 }
        } : {};

        return (
            <>
                <Rect x={-50000} y={-50000} width={100000} height={100000} fill={infiniteFill} listening={true} />
                <Rect x={0} y={0} width={width} height={height} fill={contentFill} stroke="#94a3b8" strokeWidth={1} {...shadowProps} />
                {type === 'map' && (
                    image ? (
                        <KonvaImage image={image} x={0} y={0} width={width} height={height} opacity={1} listening={false} />
                    ) : (
                        <Text x={0} y={height / 2 - 20} width={width} text="No Map Background Selected" fontSize={24} fontFamily="Arial" fill="#94a3b8" align="center" listening={false} />
                    )
                )}
            </>
        );
    });
    BoardBackground.displayName = 'BoardBackground';

    return (
        <div className="flex-1 bg-muted/20 relative overflow-hidden h-full w-full" onDrop={handleDrop} onDragOver={handleDragOver} ref={containerRef}>
            {editingId && editPosition && (
                <textarea
                    ref={textAreaRef}
                    value={editText}
                    onChange={(e) => {
                        setEditText(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    onBlur={handleTextEditComplete}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            handleTextEditComplete();
                        }
                    }}
                    style={{
                        position: "absolute",
                        top: editPosition.y,
                        left: editPosition.x,
                        width: Math.max(100, editPosition.width),
                        fontSize: editPosition.fontSize,
                        border: "none",
                        padding: 0,
                        margin: 0,
                        background: "none",
                        outline: "2px solid #0096fd",
                        resize: "none",
                        overflow: "hidden",
                        zIndex: 100,
                        transform: `rotate(${editPosition.rotation}deg)`,
                        transformOrigin: "top left",
                        color: "black",
                        lineHeight: 1.2,
                        fontFamily: 'Arial'
                    }}
                />
            )}

            <Stage
                width={window.innerWidth - 300}
                height={window.innerHeight}
                ref={stageRef}
                className="bg-[#f0f0f0] cursor-grab active:cursor-grabbing"
                onClick={handleStageClick}
                onWheel={handleOnWheel}
                onContextMenu={handleContextMenu}
                draggable
                scaleX={stageScale}
                scaleY={stageScale}
                x={stagePosition.x}
                y={stagePosition.y}
                onDragEnd={(e) => {
                    if (e.target === e.target.getStage()) {
                        setStagePosition({ x: e.target.x(), y: e.target.y() });
                    }
                }}
            >
                <Layer>
                    <BoardBackground type={boardType} width={paperWidth} height={paperHeight} image={bgImage} />

                    {elements.map((el) => {
                        const isSelected = selectedIds.includes(el.id);
                        const onChange = (attrs: Partial<CanvasElement>) => {
                            updateElements([el.id], attrs);
                        };

                        const key = el.id;
                        const dragBoundFunc = getDragBoundFunc(stageRef.current);

                        switch (el.type) {
                            case 'text':
                                return (
                                    <CanvasText
                                        key={key}
                                        element={el}
                                        isSelected={isSelected}
                                        onSelect={() => { }}
                                        onChange={onChange}
                                        draggable
                                        dragBoundFunc={dragBoundFunc}
                                    />
                                );
                            case 'shape':
                                return <CanvasShape key={key} element={el} isSelected={isSelected} onSelect={() => { }} onChange={onChange} draggable dragBoundFunc={dragBoundFunc} />;
                            case 'symbol':
                                return <CanvasSymbol key={key} element={el} isSelected={isSelected} onSelect={() => { }} onChange={onChange} draggable dragBoundFunc={dragBoundFunc} />;
                            case 'image':
                                return <CanvasImage key={key} element={el} isSelected={isSelected} onSelect={() => { }} onChange={onChange} draggable dragBoundFunc={dragBoundFunc} />;
                            default:
                                return null;
                        }
                    })}
                    <Transformer selectedIds={selectedIds} />
                </Layer>
            </Stage>

            <CanvasContextMenu
                position={menuPosition}
                onClose={() => setMenuPosition(null)}
                onEditText={() => selectedIds.length === 1 && handleTextEditStart(selectedIds[0])}
            />

            <SymbolCreateDialog />
        </div>
    );
};
