import React, { useState, useRef, useCallback } from "react";
import {
    Excalidraw,
    exportToBlob,
    exportToSvg,
    getSceneVersion,
    loadFromBlob,
    serializeAsJSON,
} from "@excalidraw/excalidraw";
import AwesomeDebouncePromise from "awesome-debounce-promise";
import { RestoredDataState } from "@excalidraw/excalidraw/types/data/restore";
import { Theme } from "@excalidraw/excalidraw/types/element/types";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";

declare global {
    const syscall: (name: string, ...args: any[]) => Promise<any>;
    var silverbullet: {
        syscall: (name: string, ...args: any[]) => Promise<any>;
    };
    var initialData: {
        readOnly: boolean;
        gridMode: boolean;
        zenMode: boolean;
        theme: Theme;
        debounceAutoSaveInMs: number;
    };
    var diagramMode: string;
}

interface SceneModes {
    gridMode?: boolean;
    zenMode?: boolean;
}

const defaultInitialData = {
    readOnly: false,
    gridMode: false,
    zenMode: false,
    theme: "light" as Theme,
    debounceAutoSaveInMs: 300,
};

const initialData = window.initialData ?? defaultInitialData;

class ExcalidrawApiBridge {
    private readonly excalidrawRef: React.MutableRefObject<ExcalidrawImperativeAPI | null>;
    private continuousSavingEnabled = true;
    private _setTheme: React.Dispatch<Theme> | null = null;
    private _setViewModeEnabled: React.Dispatch<boolean> | null = null;
    private _setGridModeEnabled: React.Dispatch<boolean> | null = null;
    private _setZenModeEnabled: React.Dispatch<boolean> | null = null;
    private currentSceneVersion = getSceneVersion([]);
    debouncedContinuousSaving: (elements: any[], appState: object) => Promise<void>;

    constructor(excalidrawRef: React.MutableRefObject<ExcalidrawImperativeAPI | null>) {
        this.excalidrawRef = excalidrawRef;
        window.addEventListener("message", this.pluginMessageHandler.bind(this));
        this.debouncedContinuousSaving = AwesomeDebouncePromise(
            this._continuousSaving,
            initialData.debounceAutoSaveInMs
        );
    }

    set setTheme(value: React.Dispatch<Theme>) {
        this._setTheme = value;
    }

    set setViewModeEnabled(value: React.Dispatch<boolean>) {
        this._setViewModeEnabled = value;
    }

    set setGridModeEnabled(value: React.Dispatch<boolean>) {
        this._setGridModeEnabled = value;
    }

    set setZenModeEnabled(value: React.Dispatch<boolean>) {
        this._setZenModeEnabled = value;
    }

    private excalidraw(): ExcalidrawImperativeAPI {
        return this.excalidrawRef.current!;
    }

    private updateApp = ({ elements, appState }: { elements: any[]; appState: object }): void => {
        this.excalidraw().updateScene({ elements, appState });
        this.excalidraw().scrollToContent();
    };

    private updateAppState = (appState: object): void => {
        this.excalidraw().updateScene({
            elements: this.excalidraw().getSceneElements(),
            appState: { ...this.excalidraw().getAppState(), ...appState },
        });
    };

    private saveAsJson = (): string => {
        const binaryFiles: Record<string, any> = {};
        return serializeAsJSON(
            this.excalidraw().getSceneElements(),
            this.excalidraw().getAppState(),
            binaryFiles,
            "local"
        );
    };

    private saveAsSvg = (exportParams: object): Promise<SVGSVGElement> => {
        console.debug("saveAsSvg export config", exportParams);
        const sceneElements = this.excalidraw().getSceneElements();
        const appState = this.excalidraw().getAppState();
        return exportToSvg({
            elements: sceneElements,
            appState: { ...appState, ...exportParams, exportEmbedScene: true },
            files: {},
        });
    };

    private saveAsBlob = (exportParams: object, mimeType: string): Promise<Blob> => {
        console.debug("saveAsPng export config", exportParams);
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

    private _continuousSaving = async (elements: any[], appState: object): Promise<void> => {
        if (!this.continuousSavingEnabled) return;
        console.debug("debounced scene changed");
        const newSceneVersion = getSceneVersion(elements);
        if (this.currentSceneVersion !== newSceneVersion) {
            this.currentSceneVersion = newSceneVersion;
            const jsonContent = this.saveAsJson();
            this.dispatchToPlugin({ type: "continuous-update", content: jsonContent });
        }
    };

    dispatchToPlugin = (message: object): void => {
        console.debug("dispatchToPlugin: ", message);
        const ev = new MessageEvent("message", { data: message });
        window.dispatchEvent(ev);
    };

    private pluginMessageHandler = (e: MessageEvent): void => {
        const message = e.data;
        console.debug(`got event: ${message.type}, message: `, message);
        e.stopPropagation();
        switch (message.type) {
            case "update":
                this.handleUpdate(message);
                break;
            case "load-from-file":
                this.handleLoadFromFile(message);
                break;
            case "toggle-read-only":
                this.handleToggleReadOnly(message);
                break;
            case "toggle-scene-modes":
                this.handleToggleSceneModes(message);
                break;
            case "theme-change":
                this.handleThemeChange(message);
                break;
            case "save-as-json":
                this.handleSaveAsJson(message);
                break;
            case "save-as-svg":
                this.handleSaveAsSvg(message);
                break;
            case "save-as-binary-image":
                this.handleSaveAsBinaryImage(message);
                break;
        }
    };

    private handleUpdate = (message: { elements: any[] }): void => {
        const updateSceneVersion = getSceneVersion(message.elements);
        if (this.currentSceneVersion !== updateSceneVersion) {
            this.currentSceneVersion = updateSceneVersion;
            this.updateApp({ elements: message.elements || [], appState: {} });
        }
    };

    private handleLoadFromFile = (message: { blob: Blob; theme: Theme }): void => {
        this.continuousSavingEnabled = true;
        this._setTheme!(message.theme);
        loadFromBlob(message.blob, null, null)
            .then((restoredState: RestoredDataState | undefined) => {
                if (!restoredState) return;
                const updateSceneVersion = getSceneVersion(restoredState.elements);
                if (this.currentSceneVersion !== updateSceneVersion) {
                    this.currentSceneVersion = updateSceneVersion;
                    console.debug("Call updateApp and scene");
                    this.updateApp({ elements: restoredState.elements || [], appState: {} });
                }
            })
            .catch((error: unknown) => {
                const errorStr = error instanceof Error ? error.toString() : JSON.stringify(error);
                console.error(errorStr);
                this.dispatchToPlugin({ type: "excalidraw-error", errorMessage: "cannot load image" });
            });
    };

    private handleToggleReadOnly = (message: { readOnly: boolean }): void => {
        this._setViewModeEnabled!(message.readOnly);
    };

    private handleToggleSceneModes = (message: { sceneModes: SceneModes }): void => {
        const modes = message.sceneModes ?? {};
        if ("gridMode" in modes) this._setGridModeEnabled!(modes.gridMode!);
        if ("zenMode" in modes) this._setZenModeEnabled!(modes.zenMode!);
    };

    private handleThemeChange = (message: { theme: Theme }): void => {
        this._setTheme!(message.theme);
    };

    private handleSaveAsJson = (message: { correlationId?: string }): void => {
        this.dispatchToPlugin({ type: "json-content", json: this.saveAsJson(), correlationId: message.correlationId ?? null });
    };

    private handleSaveAsSvg = (message: { exportConfig?: object; correlationId?: string }): void => {
        const exportConfig = message.exportConfig ?? {};
        this.saveAsSvg(exportConfig).then((svg) => {
            this.dispatchToPlugin({ type: "svg-content", svg: svg.outerHTML, correlationId: message.correlationId ?? null });
        });
    };

    private handleSaveAsBinaryImage = (message: { exportConfig?: object; mimeType?: string; correlationId?: string }): void => {
        const exportConfig = message.exportConfig ?? {};
        const mimeType = message.mimeType ?? "image/png";
        this.saveAsBlob(exportConfig, mimeType).then((blob: Blob) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                this.dispatchToPlugin({ type: "binary-image-base64-content", blob, correlationId: message.correlationId ?? null });
            };
        });
    };
}

let apiBridge: ExcalidrawApiBridge | null = null;

export const MaxOrCloseButton = (): JSX.Element => {
    const close = (
        <button
            onClick={() => apiBridge!.dispatchToPlugin({ type: "exit" })}
            style={{
                zIndex: 1000,
                background: "transparent",
                color: "#777",
                border: "none",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: "pointer",
            }}
        >
            ✖
        </button>
    );

    const fullscreen = (
        <button
            onClick={() => apiBridge!.dispatchToPlugin({ type: "fullscreen" })}
            style={{
                zIndex: 1000,
                background: "transparent",
                color: "#777",
                border: "none",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: "pointer",
            }}
        >
            ⛶
        </button>
    );

    return window.diagramMode === "embed" ? fullscreen : close;
};

export const App = (): JSX.Element => {
    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
    apiBridge = new ExcalidrawApiBridge(excalidrawApiRef);

    const excalidrawRef = useCallback((excalidrawApi: ExcalidrawImperativeAPI) => {
        excalidrawApiRef.current = excalidrawApi;
        apiBridge!.dispatchToPlugin({ type: "ready" });
    }, []);

    const [theme, setTheme] = useState<Theme>(initialData.theme);
    apiBridge.setTheme = setTheme;
    const [viewModeEnabled, setViewModeEnabled] = useState<boolean>(initialData.readOnly);
    apiBridge.setViewModeEnabled = setViewModeEnabled;
    const [gridModeEnabled, setGridModeEnabled] = useState<boolean>(initialData.gridMode);
    apiBridge.setGridModeEnabled = setGridModeEnabled;
    const [zenModeEnabled, setZenModeEnabled] = useState<boolean>(initialData.zenMode);
    apiBridge.setZenModeEnabled = setZenModeEnabled;

    const onDrawingChange = async (elements: any, state: object): Promise<void> => {
        await apiBridge!.debouncedContinuousSaving(elements, state);
    };

    return (
        <div className="excalidraw-wrapper">
            <Excalidraw
                excalidrawAPI={excalidrawRef}
                initialData={{ appState: { exportEmbedScene: true } }}
                onChange={(elements, state) => {
                    console.debug("scene changed");
                    onDrawingChange(elements, state);
                }}
                viewModeEnabled={viewModeEnabled}
                zenModeEnabled={zenModeEnabled}
                gridModeEnabled={gridModeEnabled}
                theme={theme}
                UIOptions={{
                    canvasActions: { loadScene: false, saveAsImage: false, saveToActiveFile: false },
                }}
                renderTopRightUI={() => <MaxOrCloseButton />}
            />
        </div>
    );
};