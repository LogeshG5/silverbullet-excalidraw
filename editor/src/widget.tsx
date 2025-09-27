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
    doc: ExcalidrawInitialDataState;
    fileName: string;
    theme: string;
    viewMode: boolean;
}


function App({ doc, fileName, theme, viewMode }: AppProps) {

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
            apiBridge.load({ blob: blob, viewMode: true, theme: theme });
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
                initialData={doc}
                onChange={onChange}
                viewModeEnabled={true}
                zenModeEnabled={true}
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

export async function renderWidget(rootElement: HTMLElement) {
    const fileName = rootElement.dataset.filename!;
    const theme = rootElement.dataset.theme || "light";

    let data = await syscaller("space.readFile", fileName);
    let json: string;
    try {
        json = new TextDecoder("utf-8").decode(data); // latest edge docker build (:v2 tag)
    } catch {
        json = data;
    }
    const doc: ExcalidrawInitialDataState = JSON.parse(json);
    const isRoMode = (await syscaller("system.getMode")) === "ro";
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App doc={doc} theme={theme} viewMode={isRoMode} fileName={fileName} />);
}

