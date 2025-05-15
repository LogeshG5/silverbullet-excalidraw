import React, { useState, useRef, useCallback } from "react";
import {
    Excalidraw,
    exportToBlob,
    exportToSvg,
    getSceneVersion,
    loadFromBlob,
    serializeAsJSON,
    MainMenu,
    THEME
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
    var diagramPath: string;
    var excalidrawTheme: string;
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


    private handleContinuousUpdate = () => {
        const fileExtension = getExtension(window.diagramPath);
        const exportConfig = {};
        switch (fileExtension) {
            case "svg":
                this.saveAsSvg(exportConfig).then((svg) => {
                    syscall("space.writeFile", window.diagramPath, svg.outerHTML);
                });
                break;
            case "png":
                const mimeType = "image/png";
                this.saveAsBlob(exportConfig, mimeType).then((blob: Blob) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        syscall("space.writeFile", window.diagramPath, blob);
                    };
                });
                break;
            case "excalidraw":
                syscall("space.writeFile", window.diagramPath, this.saveAsJson());
                break;
            default:
                break;
        }
    }

    private _continuousSaving = async (elements: any[], appState: object): Promise<void> => {
        if (!this.continuousSavingEnabled) return;
        console.debug("debounced scene changed");
        const newSceneVersion = getSceneVersion(elements);
        if (this.currentSceneVersion !== newSceneVersion) {
            this.currentSceneVersion = newSceneVersion;
            const jsonContent = this.saveAsJson();
            this.handleContinuousUpdate();
        }
    };

    handleLoadFromFile = (message: { blob: Blob; theme: Theme }): void => {
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

                syscall("editor.flashNotification", errorStr, "error");
            });
    };

    exit = () => {
        this.handleContinuousUpdate();
        syscall("sync.scheduleSpaceSync").then(x => {
            syscall("editor.reloadUI");
            syscall("editor.hidePanel", "modal");
        })
    }

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
}

let apiBridge: ExcalidrawApiBridge | null = null;

export const MaxOrCloseButton = (): JSX.Element => {
    const close = (
        <button
            onClick={() => apiBridge!.exit()}
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
            onClick={
                () => {
                    syscall("system.invokeFunction", "excalidraw.openFullScreenEditor", window.diagramPath);
                }
            }
            title="Fullscreen"
            style={{
                zIndex: 1000,
                background: "transparent",
                color: "#777",
                border: "none",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "110%",

            }}
        >
            ❖
        </button>
    );

    return window.diagramMode === "embed" ? fullscreen : close;
};


function getBlob(fileData: BlobPart, fileExtension: String) {
    const blob = new Blob([fileData], { type: getMimeType(fileExtension) });
    const file = new File([blob], `image.${fileExtension}`, { type: getMimeType(fileExtension) });
    return file;
}

function getMimeType(fileExtension: String) {
    switch (fileExtension) {
        case "svg":
            return "image/svg+xml";
        case "png":
            return "image/png";
        case "excalidraw":
            return "application/json";
        default:
            return "";
    }
}
function getExtension(filename: string): string {
    const base = filename.split("/").pop();
    if (!base) return ""; // safeguard for undefined or empty

    const parts = base.split(".");
    return parts.length > 1 ? parts.pop()! : "";
}

export const App = (): JSX.Element => {
    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
    apiBridge = new ExcalidrawApiBridge(excalidrawApiRef);

    const excalidrawRef = useCallback((excalidrawApi: ExcalidrawImperativeAPI) => {
        excalidrawApiRef.current = excalidrawApi;
        syscall("space.readFile", window.diagramPath).then(data => {
            const fileExtension = getExtension(window.diagramPath);
            const blob = getBlob(data, fileExtension);
            apiBridge!.handleLoadFromFile({ blob: blob, theme: window.excalidrawTheme == "light" ? THEME.LIGHT : THEME.DARK });
        });
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
                    canvasActions: {},
                }}
                renderTopRightUI={() => <MaxOrCloseButton />}
            >
                <MainMenu>
                    <MainMenu.DefaultItems.LoadScene />
                    <MainMenu.DefaultItems.Export />
                    <MainMenu.DefaultItems.SaveAsImage />
                    <MainMenu.Separator />
                    <MainMenu.DefaultItems.Help />
                    <MainMenu.DefaultItems.ClearCanvas />
                    <MainMenu.DefaultItems.ToggleTheme />
                    <MainMenu.DefaultItems.ChangeCanvasBackground />
                </MainMenu>
            </Excalidraw>
        </div>
    );
};
