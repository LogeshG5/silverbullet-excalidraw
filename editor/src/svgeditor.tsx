import React, { useRef, useCallback, useState } from "react";
import ReactDOM from "react-dom/client";
import { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
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
    theme: Theme;
}


function App({ doc, fileName, theme }: AppProps) {

    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const apiBridge = useRef(
        new ExcalidrawApiBridge(excalidrawApiRef, fileName, "widget")
    ).current;

    const onChange = useCallback(() => {
        apiBridge.debouncedSave();
    },
        [apiBridge]
    );

    const saveAndExit = useCallback(async () => {
        apiBridge.debouncedSave();
        await syscaller("editor.reloadUI");
        await syscaller("editor.hidePanel", "modal");
    },
        [apiBridge]
    );

    const excalidrawRef = useCallback(
        async (excalidrawApi: ExcalidrawImperativeAPI) => {
            excalidrawApiRef.current = excalidrawApi;
            const data = await syscaller("space.readFile", fileName);
            const blob = getBlob(data, getExtension(fileName));
            apiBridge.load({ blob: blob, viewMode: false });
        },
        [fileName, apiBridge]
    );

    const UiControls = () => (
        <div style={{ display: "flex", gap: "5px" }}>
            <button
                className="button"
                id="edit-fullscreen"
                onClick={saveAndExit}
                title="Save & Exit"
            >
                ✔️
            </button>

        </div>
    );

    return (
        <div className={"excalidraw-editor"}>
            <Excalidraw
                excalidrawAPI={excalidrawRef}
                isCollaborating={false}
                // initialData={doc}
                onChange={onChange}
                viewModeEnabled={false}
                theme={theme}
                UIOptions={{
                    canvasActions: {
                        loadScene: false,
                        saveAsImage: false,
                        saveToActiveFile: false,
                    },
                }}
                renderTopRightUI={(isMobile, appState) =>
                    <UiControls />
                }
            >
            </Excalidraw>
        </div>
    );
}

export async function renderSvgEditorElement(rootElement: HTMLElement) {
    const fileName = rootElement.dataset.filename!;
    const theme =
        rootElement.dataset.darkmode === "true" ? THEME.DARK : THEME.LIGHT;

    let data = await syscaller("space.readFile", fileName);
    let svg: string;
    try {
        svg = new TextDecoder("utf-8").decode(data); // latest edge docker build (:v2 tag)
    } catch {
        svg = data;
    }
    const doc: ExcalidrawInitialDataState = svg;
    const isRoMode = (await syscaller("system.getMode")) === "ro";
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App doc={doc} theme={theme} fileName={fileName} />);
}

