'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus } from "lucide-react";
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
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useCreateMapBoardApiGamificationMapBoardsPost } from "@/api/orval/client/gamification/gamification";
import { useCreateCanvasApiCanvasesPost } from "@/api/orval/client/canvases/canvases";
import { CanvasEngineType } from "@/api/orval/client/model";

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    engine_type: z.enum(CanvasEngineType),
});

export default function CreateMapBoardDialog() {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            engine_type: CanvasEngineType.konva,
        },
    });

    // 1. Create Canvas first
    const { mutateAsync: createCanvas, isPending: isCanvasPending } =
        useCreateCanvasApiCanvasesPost();

    // 2. Create Map Board linked to Canvas
    const { mutateAsync: createMapBoard, isPending: isMapBoardPending } =
        useCreateMapBoardApiGamificationMapBoardsPost();

    const isPending = isCanvasPending || isMapBoardPending;

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            // 1. Create a backing canvas
            const canvas = await createCanvas({
                data: {
                    title: `${values.name} Canvas`,
                    engine_type: values.engine_type,
                },
            });

            if (canvas.status !== 201) {
                throw new Error("Failed to create canvas");
            }

            // 2. Create the map board
            await createMapBoard({
                data: {
                    name: values.name,
                    canvas_id: canvas.data.id,
                },
            });

            toast.success("Map board created successfully.");

            setOpen(false);
            reset();

            // Invalidate queries to refresh the list
            queryClient.invalidateQueries({ queryKey: ['/api/gamification/map-boards'] });

        } catch (error) {
            console.error("Failed to create map board:", error);
            toast.error("Failed to create map board. Please try again.");
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Board
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Map Board</DialogTitle>
                    <DialogDescription>
                        Create a new map board for tactical planning.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Field>
                        <FieldLabel className="required-indicator">Name</FieldLabel>
                        <Input placeholder="Operation Alpha" {...register("name")} />
                        <FieldError errors={[errors.name]} />
                    </Field>

                    <Field>
                        <FieldLabel className="required-indicator">Canvas Engine</FieldLabel>
                        <div className="flex gap-6 pt-2">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    id="konva"
                                    value={CanvasEngineType.konva}
                                    {...register("engine_type")}
                                    className="h-4 w-4 cursor-pointer"
                                />
                                <Label htmlFor="konva" className="cursor-pointer font-normal">
                                    Konva (React Canvas)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    id="fabric"
                                    value={CanvasEngineType.fabric}
                                    {...register("engine_type")}
                                    className="h-4 w-4 cursor-pointer"
                                />
                                <Label htmlFor="fabric" className="cursor-pointer font-normal">
                                    Fabric.js (Alternative)
                                </Label>
                            </div>
                        </div>
                        <FieldError errors={[errors.engine_type]} />
                    </Field>

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
