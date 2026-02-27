'use client';

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Card,
    CardContent,
} from "@/components/ui/card";

import {
    useListSymbolsApiGamificationSymbolsGet,
    useDeleteSymbolApiGamificationSymbolsSymbolIdDelete,
} from "@/api/orval/client/gamification/gamification";
import LinkSymbolDialog from "../_components/LinkSymbolDialog";

export default function SymbolLibraryPage() {
    const queryClient = useQueryClient();
    const { data: symbolsData, isLoading } = useListSymbolsApiGamificationSymbolsGet();
    const { mutateAsync: deleteSymbol } = useDeleteSymbolApiGamificationSymbolsSymbolIdDelete();

    const handleDelete = React.useCallback(async (symbolId: number, name: string) => {
        if (!confirm(`Delete symbol "${name}"?`)) return;
        try {
            await deleteSymbol({ symbolId });
            toast.success(`Symbol "${name}" deleted`);
            queryClient.invalidateQueries({ queryKey: ["/api/gamification/symbols"] });
        } catch {
            toast.error("Failed to delete symbol");
        }
    }, [deleteSymbol, queryClient]);

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Link href="/gamification/map-boards">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Symbol Library</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage your topographic symbols
                        </p>
                    </div>
                </div>
                <LinkSymbolDialog />
            </div>

            {/* Symbol Grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                </div>
            ) : !symbolsData || symbolsData.status !== 200 || symbolsData.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mb-4 opacity-30" />
                    <p className="text-lg font-medium">No symbols yet</p>
                    <p className="text-sm mt-1">Upload your first symbol to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {symbolsData.data.map((symbol) => {
                        const imageUrl = symbol.thumbnail_attachment?.url || symbol.attachment?.url || '';
                        return (
                            <Card key={symbol.id} className="group relative overflow-hidden hover:shadow-md transition-shadow">
                                <CardContent className="p-3 flex flex-col items-center gap-2">
                                    <div className="aspect-square w-full flex items-center justify-center bg-muted/30 rounded-md overflow-hidden">
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={symbol.name}
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        ) : (
                                            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                                        )}
                                    </div>
                                    <span className="text-xs font-medium truncate w-full text-center">
                                        {symbol.name}
                                    </span>

                                    {/* Hover delete button */}
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDelete(symbol.id, symbol.name)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
