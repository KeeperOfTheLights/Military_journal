import CreateMapBoardDialog from "../_components/CreateMapBoardDialog";
import MapBoardList from "../_components/MapBoardList";

export default async function Page() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Map Boards</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your tactical map boards and gamification scenarios.
                    </p>
                </div>
                <CreateMapBoardDialog />
            </div>

            <MapBoardList />
        </div>
    );
}
