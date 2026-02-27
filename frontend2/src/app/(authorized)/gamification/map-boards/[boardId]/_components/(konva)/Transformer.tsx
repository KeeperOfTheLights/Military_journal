'use client';

import React, { useEffect, useRef } from 'react';
import { Transformer as KonvaTransformer } from 'react-konva';

interface TransformerProps {
    selectedIds: string[];
}

export const Transformer = ({ selectedIds }: TransformerProps) => {
    const trRef = useRef<any>(null);

    useEffect(() => {
        if (selectedIds.length > 0 && trRef.current) {
            const stage = trRef.current.getStage();
            const nodes = selectedIds
                .map(id => stage.findOne('#' + id))
                .filter(node => !!node);

            if (nodes.length > 0) {
                trRef.current.nodes(nodes);
                trRef.current.getLayer().batchDraw();
            } else {
                trRef.current.nodes([]);
            }
        } else if (trRef.current) {
            trRef.current.nodes([]);
        }
    }, [selectedIds]);

    return (
        <KonvaTransformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
                if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                    return oldBox;
                }
                return newBox;
            }}
            anchorSize={8}
            rotateEnabled={true}
            keepRatio={false}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        />
    );
};
