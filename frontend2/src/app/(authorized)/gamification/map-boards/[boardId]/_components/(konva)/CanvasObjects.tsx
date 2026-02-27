'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { Text, Image as KonvaImage, Rect, Circle, RegularPolygon, Line } from 'react-konva';
import useImage from 'use-image';
import { useListSymbolsApiGamificationSymbolsGet } from "@/api/orval/client/gamification/gamification";
import type {
    CanvasTextObject,
    CanvasImageObject,
    CanvasShapeObjectOutput,
    CanvasSymbolObject
} from "@/api/orval/client/model";
import { CanvasElement } from './CanvasContext';
import Konva from 'konva';

interface BaseObjectProps {
    isSelected: boolean;
    onSelect: () => void;
    onChange: (attrs: Partial<CanvasElement>) => void;
    draggable?: boolean;
    dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number };
    onDblClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
}

export const CanvasText = React.memo(({ element, isSelected, onSelect, onChange, draggable, dragBoundFunc, onDblClick }: BaseObjectProps & { element: CanvasTextObject }) => {
    const { fields, transform, style } = element;

    return (
        <Text
            id={element.id}
            x={transform.x}
            y={transform.y}
            rotation={transform.rotation}
            scaleX={transform.scaleX}
            scaleY={transform.scaleY}
            text={fields.text}
            fontSize={fields.fontSize}
            fontFamily={fields.fontFamily}
            fill={fields.color}
            align={fields.textAlign}
            fontStyle={`${fields.fontWeight} ${fields.fontStyle}`}
            textDecoration={fields.textDecoration}
            opacity={style?.opacity ?? 1}
            draggable={draggable}
            dragBoundFunc={dragBoundFunc}
            onClick={onSelect}
            onTap={onSelect}
            onDblClick={onDblClick}
            onDragEnd={(e) => {
                onChange({
                    transform: {
                        ...transform,
                        x: e.target.x(),
                        y: e.target.y(),
                    }
                });
            }}
            onTransformEnd={(e) => {
                const node = e.target;
                onChange({
                    transform: {
                        ...transform,
                        x: node.x(),
                        y: node.y(),
                        rotation: node.rotation(),
                        scaleX: node.scaleX(),
                        scaleY: node.scaleY(),
                    }
                });
            }}
        />
    );
});
CanvasText.displayName = 'CanvasText';

export const CanvasShape = React.memo(({ element, isSelected, onSelect, onChange, draggable, dragBoundFunc, onDblClick }: BaseObjectProps & { element: CanvasShapeObjectOutput }) => {
    const { fields, transform, style } = element;
    const commonProps = {
        id: element.id,
        x: transform.x,
        y: transform.y,
        rotation: transform.rotation,
        scaleX: transform.scaleX,
        scaleY: transform.scaleY,
        fill: style?.fill || 'black',
        stroke: style?.stroke ?? undefined,
        strokeWidth: style?.strokeWidth ?? undefined,
        opacity: style?.opacity ?? 1,
        draggable,
        dragBoundFunc,
        onClick: onSelect,
        onTap: onSelect,
        onDblClick,
        perfectDrawEnabled: false, // Performance optimization
        onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
            onChange({
                transform: {
                    ...transform,
                    x: e.target.x(),
                    y: e.target.y(),
                }
            });
        },
        onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
            const node = e.target;
            onChange({
                transform: {
                    ...transform,
                    x: node.x(),
                    y: node.y(),
                    rotation: node.rotation(),
                    scaleX: node.scaleX(),
                    scaleY: node.scaleY(),
                }
            });
        }
    };

    switch (fields.shapeType) {
        case 'rectangle':
            return <Rect {...commonProps} width={100} height={100} />;
        case 'circle':
            return <Circle {...commonProps} radius={50} />;
        case 'polygon':
            return <RegularPolygon {...commonProps} sides={6} radius={50} />;
        case 'line':
            return <Line {...commonProps} points={[0, 0, 100, 0]} stroke={style?.stroke ?? "black"} strokeWidth={style?.strokeWidth ?? 2} />;
        default:
            return null;
    }
});
CanvasShape.displayName = 'CanvasShape';

export const CanvasSymbol = React.memo(({ element, isSelected, onSelect, onChange, draggable, dragBoundFunc, onDblClick }: BaseObjectProps & { element: CanvasSymbolObject }) => {
    const { fields, transform, style } = element;
    const { data: symbolsData } = useListSymbolsApiGamificationSymbolsGet();
    const imageRef = useRef<Konva.Image>(null);

    const symbolUrl = useMemo(() => {
        if (symbolsData?.status === 200) {
            const symbol = symbolsData.data.find(s => s.id === fields.symbol_id);
            const rawUrl = symbol?.thumbnail_attachment?.url || symbol?.attachment?.url || '';
            // Use proxy for external URLs to avoid CORS issues
            if (rawUrl && rawUrl.startsWith('http')) {
                return `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`;
            }
            return rawUrl;
        }
        return '';
    }, [symbolsData, fields.symbol_id]);

    const [image] = useImage(symbolUrl);

    useEffect(() => {
        if (image && imageRef.current) {
            imageRef.current.cache();
            imageRef.current.getLayer()?.batchDraw();
        }
    }, [image, element.style?.fill]);

    const rgb = useMemo(() => {
        if (!element.style?.fill) return { r: 0, g: 0, b: 0 };
        const hex = element.style.fill;
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }, [element.style?.fill]);

    // If black icon, standard RGB filter ADDS color. 
    // If we want to force color, we might need more complex filters, 
    // but assuming black icon:
    // Black (0,0,0) + Red (255,0,0) = Red (255,0,0).
    // So passing r,g,b directly works for black icons.

    return (
        <KonvaImage
            ref={imageRef}
            id={element.id}
            image={image}
            x={transform.x}
            y={transform.y}
            width={transform.width || 50}
            height={transform.height || 50}
            rotation={transform.rotation}
            scaleX={transform.scaleX}
            scaleY={transform.scaleY}
            opacity={style?.opacity ?? 1}
            draggable={draggable}
            dragBoundFunc={dragBoundFunc}
            onClick={onSelect}
            onTap={onSelect}
            onDblClick={onDblClick}
            filters={element.style?.fill ? [Konva.Filters.RGB] : []}
            red={rgb.r}
            green={rgb.g}
            blue={rgb.b}
            onDragEnd={(e) => {
                onChange({
                    transform: {
                        ...transform,
                        x: e.target.x(),
                        y: e.target.y(),
                    }
                });
            }}
            onTransformEnd={(e) => {
                const node = e.target;
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();

                onChange({
                    transform: {
                        ...transform,
                        x: node.x(),
                        y: node.y(),
                        rotation: node.rotation(),
                        scaleX: scaleX,
                        scaleY: scaleY,
                    }
                });
            }}
        />
    );
});
CanvasSymbol.displayName = 'CanvasSymbol';

export const CanvasImage = React.memo(({ element, isSelected, onSelect, onChange, draggable, dragBoundFunc, onDblClick }: BaseObjectProps & { element: CanvasImageObject }) => {
    return null;
});
CanvasImage.displayName = 'CanvasImage';
