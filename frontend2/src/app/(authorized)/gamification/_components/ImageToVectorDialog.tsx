'use client';

import * as React from 'react';
import { useState } from 'react';
import { Loader2, ArrowRight, Upload, X, Image as ImageIcon } from 'lucide-react';
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

// @ts-ignore
import ImageTracer from 'imagetracerjs';

interface ImageToVectorDialogProps {
    onConverted: (file: File) => void;
}

export default function ImageToVectorDialog({ onConverted }: ImageToVectorDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setSvgContent(null); // Reset previous conversion
        }
    };

    const handleConvert = () => {
        if (!previewUrl) return;
        setIsProcessing(true);

        // ImageTracer options
        const options = {
            ltres: 1,
            qtres: 1,
            pathomit: 8,
            rightangleenhance: true,
            colorsampling: 2,
            numberofcolors: 16,
            mincolorratio: 0.02,
            colorquantcycles: 3,
            blurradius: 0,
            blurdelta: 20,
            strokewidth: 0,
            linefilter: false,
            scale: 1,
            roundcoords: 1,
            viewbox: true,
            desc: false,
            lcpr: 0,
            qcpr: 0,
            corsenabled: false
        };

        try {
            ImageTracer.imageToSVG(
                previewUrl,
                (svgstr: string) => {
                    setSvgContent(svgstr);
                    setIsProcessing(false);
                },
                options
            );
        } catch (e) {
            console.error("Conversion failed", e);
            setIsProcessing(false);
        }
    };

    const handleApply = () => {
        if (svgContent && selectedFile) {
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            const fileName = selectedFile.name.replace(/\.[^/.]+$/, "") + ".svg";
            const file = new File([blob], fileName, { type: 'image/svg+xml' });

            onConverted(file);
            handleClose();
        }
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setSvgContent(null);
        setIsProcessing(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Convert from Image
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Convert Image to Vector (SVG)</DialogTitle>
                    <DialogDescription>
                        Upload a raster image (JPG, PNG) to convert it into a scalable vector graphic.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Source */}
                    <div className="space-y-4">
                        <Label>Source Image</Label>
                        <div className="border-2 border-dashed rounded-lg p-4 h-64 flex flex-col items-center justify-center bg-muted/20 relative overflow-hidden">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Click to upload</p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            Supports PNG, JPG, JPEG
                        </p>
                    </div>

                    {/* Result */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Vector Preview</Label>
                            {svgContent && <span className="text-xs text-green-600 font-medium">Converted!</span>}
                        </div>
                        <div className="border rounded-lg p-4 h-64 flex items-center justify-center bg-white/50 relative overflow-hidden">
                            {isProcessing ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
                                    <p className="text-sm text-muted-foreground">Tracing paths...</p>
                                </div>
                            ) : svgContent ? (
                                <div
                                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                                    dangerouslySetInnerHTML={{ __html: svgContent }}
                                />
                            ) : (
                                <div className="text-center text-muted-foreground text-sm">
                                    <ArrowRight className="h-6 w-6 mx-auto mb-2 opacity-30" />
                                    Preview will appear here
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between w-full">
                    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={handleConvert}
                            disabled={!selectedFile || isProcessing}
                        >
                            {isProcessing ? 'Converting...' : 'Convert to SVG'}
                        </Button>
                        <Button
                            onClick={handleApply}
                            disabled={!svgContent}
                        >
                            Use this Symbol
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
