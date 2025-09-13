
import type { RestoredDataState } from "@excalidraw/excalidraw/dist/types/excalidraw/data/restore";
import {
    Excalidraw,
    exportToBlob,
    exportToSvg,
    loadFromBlob,
    serializeAsJSON,
    MainMenu,
} from "@excalidraw/excalidraw";
import type { RefObject, ReactElement } from "react";
import { debounce, getExtension } from "./helpers";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const syscaller = (typeof silverbullet !== "undefined" ? silverbullet.syscall : syscall);


export class ExcalidrawApiBridge {
    private readonly excalidrawRef: RefObject<ExcalidrawImperativeAPI | null>;

    debouncedSave: () => void;
    constructor(excalidrawRef: RefObject<ExcalidrawImperativeAPI | null>) {
        this.excalidrawRef = excalidrawRef;
        this.debouncedSave = debounce(
            this.save,
            500
        );
    }

    private excalidraw(): ExcalidrawImperativeAPI {
        return this.excalidrawRef.current!;
    }

    private updateApp = ({ elements, appState }: { elements: any[]; appState: object }): void => {
        this.excalidraw().updateScene({ elements, appState });
        this.excalidraw().scrollToContent();
    };

    getJson = (): string => {
        const binaryFiles: Record<string, any> = {};
        return serializeAsJSON(
            this.excalidraw().getSceneElements(),
            this.excalidraw().getAppState(),
            binaryFiles,
            "local"
        );
    };

    private getSvg = (exportParams: object): Promise<SVGSVGElement> => {
        const sceneElements = this.excalidraw().getSceneElements();
        const appState = this.excalidraw().getAppState();
        return exportToSvg({
            elements: sceneElements,
            appState: { ...appState, ...exportParams, exportEmbedScene: true },
            files: {},
        });
    };

    private getPng = (exportParams: object, mimeType: string): Promise<Blob> => {
        const sceneElements = this.excalidraw().getSceneElements();
        const appState = this.excalidraw().getAppState();
        const binaryFiles: Record<string, any> = {};
        return exportToBlob({
            elements: sceneElements,
            appState: { ...appState, ...exportParams, exportEmbedScene: true },
            files: binaryFiles,
            mimeType,
        });
    };


    write = () => {
        const fileExtension = getExtension(window.diagramPath);
        const exportConfig = {};
        switch (fileExtension) {
            case "svg":
                this.getSvg(exportConfig).then((svg) => {
                    syscaller("space.writeFile", window.diagramPath, svg.outerHTML);
                });
                break;
            case "png":
                const mimeType = "image/png";
                this.getPng(exportConfig, mimeType).then((blob: Blob) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        syscaller("space.writeFile", window.diagramPath, blob);
                    };
                });
                break;
            case "excalidraw":
                syscaller("space.writeFile", window.diagramPath, this.getJson());
                break;
            default:
                break;
        }
    }

    private save = async (): Promise<void> => {
        this.write();
    };

    public async load(message: { blob: Blob }): Promise<void> {
        loadFromBlob(message.blob, null, null)
            .then((restoredState: RestoredDataState | undefined) => {
                if (!restoredState) return;
                this.updateApp({ elements: restoredState.elements || [], appState: {} });
            })
            .catch((error: unknown) => {
                const errorStr = error instanceof Error ? error.toString() : JSON.stringify(error);
                console.error(errorStr);

                syscaller("editor.flashNotification", errorStr, "error");
            });
    };

}
