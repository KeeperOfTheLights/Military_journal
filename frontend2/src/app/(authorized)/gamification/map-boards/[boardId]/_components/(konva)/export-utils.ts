import Konva from "konva";

async function loadCorsSafeImage(url: string): Promise<HTMLImageElement> {
    return new Promise(async (resolve, reject) => {
        try {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);

            if (!response.ok) throw new Error(`Proxy failed: ${response.statusText}`);

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            const img = new Image();
            img.onload = () => {
                (img as any)._objectUrl = objectUrl;
                resolve(img);
            };
            img.onerror = (e) => reject(e);
            img.src = objectUrl;

        } catch (error) {
            console.error(`[Export] Error loading safe image:`, error);
            reject(error);
        }
    });
}

export async function getCorsSafeDataURL(
    stageRef: any,
    pixelRatio: number = 2,
    config?: { x: number, y: number, width: number, height: number }
): Promise<string> {
    if (!stageRef || !stageRef.current) throw new Error("Stage reference is invalid");

    const originalStage = stageRef.current as Konva.Stage;

    // 1. Capture sources from ORIGINAL stage
    const imageSources = new Map<string, string>();
    const originalImages = originalStage.find('Image') as Konva.Image[];

    originalImages.forEach(node => {
        const img = node.image();
        const id = node.id();
        const src = (img instanceof Image) ? img.src : null;
        if (src && id) imageSources.set(id, src);
    });

    // 2. Clone stage
    const json = originalStage.toJSON();
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);

    let ghostStage: Konva.Stage | null = null;

    try {
        ghostStage = Konva.Node.create(json, container) as Konva.Stage;

        // Reset transform to ensure (0,0) matches paper origin
        ghostStage.position({ x: 0, y: 0 });
        ghostStage.scale({ x: 1, y: 1 });

        // Remove transformers
        ghostStage.find('Transformer').forEach(tr => tr.destroy());

        // 3. Swap images
        const promises = Array.from(imageSources.entries()).map(async ([id, src]) => {
            if (!src.startsWith('http')) return;

            const ghostNode = ghostStage?.findOne('#' + id) as Konva.Image;
            if (ghostNode) {
                try {
                    const safeImage = await loadCorsSafeImage(src);
                    ghostNode.image(safeImage);
                } catch (err) {
                    console.warn(`[Export] Failed to swap image ${id}`, err);
                }
            }
        });

        await Promise.all(promises);

        // 4. Generate Data URL
        const exportConfig: any = { pixelRatio };
        if (config) Object.assign(exportConfig, config);

        const dataURL = ghostStage.toDataURL(exportConfig);

        // Cleanup object URLs
        ghostStage.find('Image').forEach((node: any) => {
            const img = node.image();
            if (img && img._objectUrl) URL.revokeObjectURL(img._objectUrl);
        });

        return dataURL;

    } finally {
        if (ghostStage) ghostStage.destroy();
        document.body.removeChild(container);
    }
}
