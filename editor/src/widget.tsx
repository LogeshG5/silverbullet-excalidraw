import React, { useRef, useCallback, useState } from "react";
import ReactDOM from "react-dom/client";
import {
    AppState,
    BinaryFiles,
    ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import { OrderedExcalidrawElement } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { ExcalidrawApiBridge } from "./ExcalidrawAPI";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Excalidraw, THEME } from "@excalidraw/excalidraw";
import { getBlob, getExtension } from "./helpers";
import type { Theme } from "@excalidraw/excalidraw/types";

declare global {
    var silverbullet: {
        syscall: (name: string, ...args: any[]) => Promise<any>;
        sendMessage: (name: string, ...args: any[]) => Promise<any>;
        addEventListener: (name: string, callback: (args: any) => void) => void;
    };
}

const syscaller =
    typeof silverbullet !== "undefined" ? silverbullet.syscall : syscall;

interface AppProps {
    fileName: string;
    theme: Theme;
    viewMode: boolean;
}


function App({ fileName, theme, viewMode }: AppProps) {

    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const apiBridge = useRef(
        new ExcalidrawApiBridge(excalidrawApiRef, fileName, "widget")
    ).current;

    const onChange = useCallback(() => {
        apiBridge.debouncedSave();
    },
        [apiBridge]
    );

    const startEditing = useCallback(async () => {
        await syscaller("editor.navigate", fileName);
    }, [fileName]);


    const excalidrawRef = useCallback(
        async (excalidrawApi: ExcalidrawImperativeAPI) => {
            excalidrawApiRef.current = excalidrawApi;

            const data = await syscaller("space.readFile", fileName);
            const blob = getBlob(data, getExtension(fileName));
            apiBridge.load({ blob });
        },
        [fileName, apiBridge]
    );


    const EditButton = () => (
        <button
            className="button"
            id="edit-button"
            onClick={startEditing}
            title="Edit"
        >
            ✎
        </button>
    );

    return (
        <div className={"excalidraw-viewer"}>
            <Excalidraw
                excalidrawAPI={excalidrawRef}
                isCollaborating={false}
                initialData={
                    { appState: { exportEmbedScene: true }, } as ExcalidrawInitialDataState
                }
                onChange={onChange}
                viewModeEnabled={true}
                zenModeEnabled={true}
                theme={theme}
                UIOptions={{
                    canvasActions: {
                        loadScene: false,
                        saveAsImage: false,
                        saveToActiveFile: false,
                    },
                }}
                renderTopRightUI={(isMobile, appState) =>
                    null
                }
            >
                {!viewMode && <EditButton />}
            </Excalidraw>
        </div>
    );
}

export function renderWidget(rootElement: HTMLElement) {
    const fileName = rootElement.dataset.filename!;
    const theme = rootElement.dataset.darkmode === "true" ? THEME.DARK : THEME.LIGHT;

    let viewMode = false;
    syscaller("system.getMode").then((result: string) => {
        viewMode = result === "ro";
    });
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App fileName={fileName} theme={theme} viewMode={viewMode} />);
}

