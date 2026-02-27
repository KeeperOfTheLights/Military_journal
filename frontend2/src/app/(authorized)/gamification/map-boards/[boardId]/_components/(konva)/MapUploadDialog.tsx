'use client';

import * as React from 'react';
import { useState, useRef, useMemo } from 'react';
import {
    Loader2,
    Upload,
    X,
    Maximize2,
    FileImage,
    LayoutGrid,
    ZoomIn,
    ZoomOut,
    Hand
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Stage, Layer, Image as KonvaImage, Line, Text as KonvaText } from 'react-konva';
import useImage from 'use-image';
import { useUploadAttachmentApiAttachmentsUploadPost } from '@/api/orval/client/attachments/attachments';

interface MapUploadDialogProps {
    onUpload?: (data: { url: string, scale: number, type: string }) => void;
    entityId?: number;
}

const MAP_SCALES = [
    { label: 'Tactical (1:25,000)', value: '25000' },
    { label: 'Tactical (1:50,000)', value: '50000' },
    { label: 'Operational (1:100,000)', value: '100000' },
    { label: 'Strategic (1:250,000)', value: '250000' },
    { label: 'Strategic (1:500,000)', value: '500000' },
    { label: 'Regional (1:1,000,000)', value: '1000000' },
];

const MAP_TYPES = [
    { label: 'Topographic Map', value: 'topographic' },
    { label: 'Satellite Imagery', value: 'satellite' },
    { label: 'Tactical Overlay', value: 'tactical' },
    { label: 'Nautical Chart', value: 'nautical' },
    { label: 'Aeronautical Chart', value: 'aeronautical' },
];

export default function MapUploadDialog({ onUpload, entityId }: MapUploadDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');

    // Form State
    const [mapType, setMapType] = useState('topographic');
    const [scale, setScale] = useState(50000);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Preview State
    const [zoom, setZoom] = useState(1);
    const [image] = useImage(previewUrl || '');
    const stageRef = useRef<any>(null);
    const [isUploading, setIsUploading] = useState(false);

    const { mutateAsync: uploadAttachment } = useUploadAttachmentApiAttachmentsUploadPost();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleNext = () => {
        if (selectedFile) {
            setStep('preview');
        }
    };

    const handleReset = () => {
        setStep('upload');
        setSelectedFile(null);
        setPreviewUrl(null);
        setZoom(1);
    };

    const handleOnWheel = (e: any) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;
        const stage = e.target.getStage();
        const oldScale = stage.scaleX();
        const mousePointTo = {
            x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
            y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
        };

        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

        stage.scale({ x: newScale, y: newScale });
        setZoom(newScale);

        const newPos = {
            x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
            y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
        };
        stage.position(newPos);
        stage.batchDraw();
    };

    // Matrix/Grid lines
    const gridLines = useMemo(() => {
        if (!image) return [];
        const lines = [];
        const gridSize = 100; // pixels per grid
        const cols = Math.ceil(image.width / gridSize);
        const rows = Math.ceil(image.height / gridSize);

        for (let i = 0; i <= cols; i++) {
            lines.push(
                <Line
                    key={`v-${i}`}
                    points={[i * gridSize, 0, i * gridSize, image.height]}
                    stroke="#FF0000"
                    strokeWidth={1 / zoom}
                    opacity={0.3}
                />
            );
            if (i < cols) {
                lines.push(
                    <KonvaText
                        key={`vt-${i}`}
                        x={i * gridSize + 5}
                        y={5}
                        text={String.fromCharCode(65 + i)} // A, B, C...
                        fontSize={12 / zoom}
                        fill="#FF0000"
                    />
                );
            }
        }
        for (let j = 0; j <= rows; j++) {
            lines.push(
                <Line
                    key={`h-${j}`}
                    points={[0, j * gridSize, image.width, j * gridSize]}
                    stroke="#FF0000"
                    strokeWidth={1 / zoom}
                    opacity={0.3}
                />
            );
            if (j < rows) {
                lines.push(
                    <KonvaText
                        key={`ht-${j}`}
                        x={5}
                        y={j * gridSize + 5}
                        text={String(j + 1)} // 1, 2, 3...
                        fontSize={12 / zoom}
                        fill="#FF0000"
                    />
                );
            }
        }
        return lines;
    }, [image, zoom]);

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) handleReset();
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                    <Maximize2 className="h-4 w-4" />
                    Upload Map
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Upload & Partition Map</DialogTitle>
                    <DialogDescription>
                        Import a topographic map, define scale, and preview its grid partitions.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {step === 'upload' ? (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="map-type">Map Content / Type</Label>
                                    <Select value={mapType} onValueChange={setMapType}>
                                        <SelectTrigger id="map-type" className="w-full">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MAP_TYPES.map(type => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="scale">Map Scale (1:N)</Label>
                                    <Select value={String(scale)} onValueChange={(val) => setScale(parseInt(val))}>
                                        <SelectTrigger id="scale" className="w-full">
                                            <SelectValue placeholder="Select scale" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MAP_SCALES.map(s => (
                                                <SelectItem key={s.value} value={s.value}>
                                                    {s.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center bg-muted/20 relative cursor-pointer hover:bg-muted/30 transition-colors">
                                {selectedFile ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <FileImage className="h-12 w-12 text-primary" />
                                        <p className="font-medium">{selectedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                                        <p className="text-sm font-medium">Click or drag image to upload</p>
                                        <p className="text-xs text-muted-foreground mt-1">Supports High-Resolution JPG, PNG, TIFF</p>
                                    </>
                                )}
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4 py-4 min-h-0">
                            <div className="flex items-center justify-between bg-muted/40 p-2 rounded-md">
                                <div className="flex items-center gap-4 text-xs font-medium px-2">
                                    <div className="flex items-center gap-1">
                                        <LayoutGrid className="h-3.5 w-3.5" />
                                        Matrix Partitioning Active
                                    </div>
                                    <div className="text-muted-foreground capitalize">Type: {mapType}</div>
                                    <div className="text-muted-foreground">Scale: 1:{scale.toLocaleString()}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                        const stage = stageRef.current;
                                        stage.scale({ x: zoom + 0.2, y: zoom + 0.2 });
                                        setZoom(zoom + 0.2);
                                    }}>
                                        <ZoomIn className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                        const stage = stageRef.current;
                                        stage.scale({ x: zoom - 0.2, y: zoom - 0.2 });
                                        setZoom(zoom - 0.2);
                                    }}>
                                        <ZoomOut className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 border rounded-lg bg-black relative overflow-hidden flex items-center justify-center">
                                <Stage
                                    width={800} // This will be constrained by the container
                                    height={500}
                                    draggable
                                    ref={stageRef}
                                    onWheel={handleOnWheel}
                                    className="cursor-move"
                                >
                                    <Layer>
                                        {image && (
                                            <>
                                                <KonvaImage image={image} />
                                                {gridLines}
                                            </>
                                        )}
                                    </Layer>
                                </Stage>

                                <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur border px-2 py-1 rounded text-[10px] font-mono shadow-sm">
                                    Pinch/Scroll to Zoom • Drag to Pan
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 border-t">
                    {step === 'upload' ? (
                        <>
                            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={handleNext} disabled={!selectedFile}>
                                Generate Partition Preview
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setStep('upload')}>Back to Edit</Button>
                            <Button
                                disabled={isUploading || !selectedFile}
                                onClick={async () => {
                                    if (selectedFile && onUpload) {
                                        setIsUploading(true);
                                        try {
                                            // Upload to backend
                                            const response = await uploadAttachment({
                                                data: {
                                                    file: selectedFile,
                                                    entity_type: 'symbol' as any, // fallback to symbol if map_board not exists
                                                    entity_id: entityId || 0,
                                                    title: `Map Background: ${selectedFile.name}`,
                                                    description: `Topographic map scale 1:${scale}`
                                                }
                                            });

                                            if (response.status === 201 && response.data.attachment.url) {
                                                onUpload({
                                                    url: response.data.attachment.url,
                                                    scale,
                                                    type: mapType
                                                });
                                                setOpen(false);
                                                toast.success("Map background uploaded and applied");
                                            } else {
                                                throw new Error("Upload failed");
                                            }
                                        } catch (error) {
                                            console.error("Upload error:", error);
                                            toast.error("Failed to upload map to server. Using local preview.");
                                            // Fallback to local URL for demo-ability if requested
                                            onUpload({
                                                url: previewUrl || '',
                                                scale,
                                                type: mapType
                                            });
                                            setOpen(false);
                                        } finally {
                                            setIsUploading(false);
                                        }
                                    }
                                }}>
                                {isUploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    "Confirm & Apply Background"
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
