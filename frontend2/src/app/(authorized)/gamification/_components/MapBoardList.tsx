'use client';

import { Loader2, Map as MapIcon, MoreVertical, Trash, Edit } from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

import {
    useListMapBoardsApiGamificationMapBoardsGet,
    useDeleteMapBoardApiGamificationMapBoardsMapBoardIdDelete,
} from "@/api/orval/client/gamification/gamification";
import { MapBoardRead } from "@/api/orval/client/model";

export default function MapBoardList() {
    const { data, isLoading, isError } = useListMapBoardsApiGamificationMapBoardsGet();
    const mapBoards = Array.isArray(data?.data) ? data.data : [];

    const queryClient = useQueryClient();

    const { mutateAsync: deleteBoard } = useDeleteMapBoardApiGamificationMapBoardsMapBoardIdDelete();

    const handleDelete = async (id: number) => {
        // Ideally use a Dialog for confirmation, but native confirm is fine for now
        if (!confirm("Are you sure you want to delete this map board?")) return;

        try {
            await deleteBoard({ mapBoardId: id });
            toast.success("Map board deleted successfully.");
            queryClient.invalidateQueries({ queryKey: ['/api/gamification/map-boards'] });
        } catch (error) {
            toast.error("Failed to delete map board.");
        }
    };


    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden">
                        <div className="h-48 bg-muted animate-pulse" />
                        <CardHeader className="p-4">
                            <Skeleton className="h-4 w-2/3" />
                        </CardHeader>
                    </Card>
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center p-8 text-destructive">
                Failed to load map boards. Please try again.
            </div>
        );
    }

    if (mapBoards.length === 0) {
        return (
            <div className="text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
                <MapIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-1">No map boards created</h3>
                <p>Create your first map board to get started.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mapBoards.map((board) => (
                <MapBoardCard key={board.id} board={board} onDelete={handleDelete} />
            ))}
        </div>
    );
}

function MapBoardCard({ board, onDelete }: { board: MapBoardRead; onDelete: (id: number) => void }) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-48 bg-muted flex items-center justify-center relative group">
                {/* Placeholder for thumbnail */}
                <MapIcon className="h-16 w-16 text-muted-foreground/30" />

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Link href={`/gamification/map-boards/${board.id}`}>
                        <Button variant="secondary">Open Board</Button>
                    </Link>
                </div>
            </div>

            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base truncate" title={board.name}>
                    <Link href={`/gamification/map-boards/${board.id}`} className="hover:underline">
                        {board.name}
                    </Link>
                </CardTitle>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <Link href={`/gamification/map-boards/${board.id}`}>
                            <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(board.id)}
                        >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <CardDescription>
                    {board.symbols?.length || 0} symbols
                </CardDescription>
            </CardContent>
        </Card>
    );
}
