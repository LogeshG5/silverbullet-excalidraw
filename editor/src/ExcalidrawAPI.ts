
import type { RestoredDataState } from "@excalidraw/excalidraw/dist/types/excalidraw/data/restore";
import {
    Excalidraw,
    exportToBlob,
    exportToSvg,
    loadFromBlob,
    serializeAsJSON,
} from "@excalidraw/excalidraw";
import type { RefObject, ReactElement } from "react";
import { debounce, getExtension } from "./helpers";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const syscaller = (typeof silverbullet !== "undefined" ? silverbullet.syscall : syscall);


export class ExcalidrawApiBridge {
    private readonly excalidrawRef: RefObject<ExcalidrawImperativeAPI | null>;
    private readonly fileName: string;
    private readonly type: string;

    debouncedSave: () => void;
    constructor(excalidrawRef: RefObject<ExcalidrawImperativeAPI | null>, fileName: string, type: string) {
        this.excalidrawRef = excalidrawRef;
        this.debouncedSave = debounce(
            this.save,
            500
        );
        this.fileName = fileName;
        this.type = type;
    }

    private excalidraw(): ExcalidrawImperativeAPI {
        return this.excalidrawRef.current!;
    }

    private updateApp = ({ elements, appState }: { elements: any[]; appState: object }): void => {
        this.excalidraw().updateScene({ elements, appState });
        this.excalidraw().scrollToContent(undefined, { fitToContent: true });
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


    public save = async (): Promise<void> => {
        const fileExtension = getExtension(this.fileName);
        const exportConfig = {};
        const isRoMode = (await syscaller("system.getMode")) === "ro";
        if (isRoMode) {
            console.log("Excalidraw: Not saving as system in ro mode");
            return;
        }
        switch (fileExtension) {
            case "svg":
                this.getSvg(exportConfig).then((svg) => {
                    syscaller("space.writeFile", this.fileName, svg.outerHTML);
                });
                break;
            case "png":
                const mimeType = "image/png";
                this.getPng(exportConfig, mimeType).then((blob: Blob) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        syscaller("space.writeFile", this.fileName, blob);
                    };
                });
                break;
            case "excalidraw":
                const data = this.getJson();
                if (this.type === "widget") {
                    syscaller("space.writeFile", this.fileName, data);
                } else {
                    globalThis.silverbullet.sendMessage("file-saved", { data: data });
                }
                break;
            default:
                break;
        }
    }


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
