'use client';

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Upload, Type, FileUp, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ImageToVectorDialog from "./ImageToVectorDialog";

import { useUploadSymbolApiGamificationSymbolsUploadPost } from "@/api/orval/client/gamification/gamification";

// Schema for form validation
const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    file: z
        .any()
        .refine((file) => file instanceof File || (file instanceof FileList && file.length > 0), "SVG File is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function LinkSymbolDialog() {
    const [open, setOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    const fileValue = watch("file");

    const { mutateAsync: uploadSymbol, isPending: isUploadPending } = useUploadSymbolApiGamificationSymbolsUploadPost();

    const handleUploadSubmit = React.useCallback(async (values: FormValues) => {
        try {
            let fileToUpload: File;
            if (values.file instanceof FileList) {
                fileToUpload = values.file[0];
            } else if (values.file instanceof File) {
                fileToUpload = values.file;
            } else {
                throw new Error("Invalid file format");
            }

            await uploadSymbol({
                data: {
                    file: fileToUpload,
                },
                params: {
                    name: values.name,
                    description: values.description
                }
            });

            toast.success("Symbol uploaded successfully");
            setOpen(false);
            reset();
            setSelectedFile(null);
            queryClient.invalidateQueries({ queryKey: ["/api/gamification/symbols"] });
        } catch (error) {
            console.error("Failed to upload symbol:", error);
            toast.error("Failed to upload symbol");
        }
    }, [uploadSymbol, queryClient, reset]);

    const handleConverted = (file: File) => {
        setValue("file", file, { shouldValidate: true });
        setSelectedFile(file);
        toast.info(`Image converted to ${file.name}. Ready for upload.`);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                reset();
                setSelectedFile(null);
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Symbol</DialogTitle>
                    <DialogDescription>
                        Add a new symbol to your library. Symbols MUST be in SVG format for best rendering.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload">Upload SVG</TabsTrigger>
                        <TabsTrigger value="editor">Editor</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="mt-4 space-y-4">
                        <div className="flex justify-end">
                            <ImageToVectorDialog onConverted={handleConverted} />
                        </div>

                        <form onSubmit={handleSubmit(handleUploadSubmit)} className="space-y-4">
                            <Field>
                                <FieldLabel className="required-indicator">Name</FieldLabel>
                                <Input placeholder="Tank Icon" {...register("name")} />
                                <FieldError errors={[errors.name]} />
                            </Field>

                            <Field>
                                <FieldLabel>Description (Optional)</FieldLabel>
                                <Textarea
                                    placeholder="Enter symbol description..."
                                    {...register("description")}
                                    rows={3}
                                />
                                <FieldError errors={[errors.description]} />
                            </Field>

                            <Field>
                                <FieldLabel className="required-indicator">SVG File</FieldLabel>
                                {selectedFile ? (
                                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                        <FileUp className="h-4 w-4 text-primary" />
                                        <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setValue("file", undefined);
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Input
                                        type="file"
                                        accept=".svg, image/svg+xml"
                                        {...register("file")}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setSelectedFile(file);
                                            register("file").onChange(e);
                                        }}
                                    />
                                )}
                                <FieldError errors={[errors.file]} />
                            </Field>

                            <DialogFooter>
                                <Button type="submit" disabled={isUploadPending || !selectedFile} className="w-full">
                                    {isUploadPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Upload Symbol
                                </Button>
                            </DialogFooter>
                        </form>
                    </TabsContent>

                    <TabsContent value="editor" className="mt-4">
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/30">
                            <Type className="h-10 w-10 mb-2 opacity-50" />
                            <p className="text-sm font-medium">Symbol Editor</p>
                            <p className="text-xs mt-1">Advanced editor capabilities coming soon.</p>
                        </div>
                        <DialogFooter className="mt-4">
                            <Button disabled variant="secondary" className="w-full">Create from Editor (Coming Soon)</Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

