import React, { useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { AppState, BinaryFiles, ExcalidrawInitialDataState } from "@excalidraw/excalidraw/dist/types/excalidraw/types";
import { OrderedExcalidrawElement } from "@excalidraw/excalidraw/dist/types/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { ExcalidrawApiBridge } from "./ExcalidrawAPI";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Excalidraw, THEME } from "@excalidraw/excalidraw";
import { getBlob, getExtension } from "./helpers";
import type { Theme } from "@excalidraw/excalidraw/dist/types/excalidraw/element/types";

declare global {
    var silverbullet: {
        syscall: (name: string, ...args: any[]) => Promise<any>;
        sendMessage: (name: string, ...args: any[]) => Promise<any>;
        addEventListener: (name: string, callback: (args: any) => void) => void;
    };

    var diagramMode: string;
    var diagramPath: string;
    var excalidrawTheme: string;
}

const syscaller = (typeof silverbullet !== "undefined" ? silverbullet.syscall : syscall);

function TopRightUI() {
    return <button
        className="button" />
}

let fileName: string = "";


function App({ doc, theme, viewMode }: { doc: ExcalidrawInitialDataState, theme: Theme, viewMode: boolean }) {

    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const apiBridge = new ExcalidrawApiBridge(excalidrawApiRef, fileName, "editor");


    function onChange(elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) {
        silverbullet.sendMessage("file-changed", {});
    }

    function save() {
        // const data =
        apiBridge!.save();
        // globalThis.silverbullet.sendMessage("file-saved", { data: data });
    }

    const excalidrawRef = useCallback(async (excalidrawApi: ExcalidrawImperativeAPI) => {
        excalidrawApiRef.current = excalidrawApi;

        let data = await syscaller("space.readFile", fileName);
        const blob = getBlob(data, getExtension(fileName));
        apiBridge!.load({ blob: blob });

        silverbullet.addEventListener("request-save", () => save());
    }, []);

    return (<div className={viewMode ? "excalidraw-viewer" : "excalidraw-editor"} >
        <Excalidraw
            excalidrawAPI={excalidrawRef}
            isCollaborating={false}
            initialData={doc}
            onChange={onChange}
            viewModeEnabled={viewMode}
            zenModeEnabled={viewMode}
            theme={theme}

            UIOptions={{
                canvasActions: {
                    loadScene: false,
                    saveAsImage: false,
                    saveToActiveFile: false,
                }
            }}
            renderTopRightUI={TopRightUI}
        >
        </Excalidraw>
    </div>);
}

async function open(root: ReactDOM.Root, data: string) {
    const darkMode = await silverbullet.syscall("clientStore.get", "darkMode");
    const theme: Theme = darkMode ? THEME.DARK : THEME.LIGHT;
    fileName = await silverbullet.syscall("editor.getCurrentPage");
    let params = new URLSearchParams(document.location.search);
    const viewMode = params.get("viewer") === "true";
    const doc = JSON.parse(data);
    root.render(<App doc={doc} theme={theme} viewMode={viewMode} />);
}

export function renderEditor(rootElement: HTMLElement) {
    const root = ReactDOM.createRoot(rootElement);
    silverbullet.addEventListener("file-open", (event) => open(root, event.detail.data));
    silverbullet.addEventListener("file-update", (event) => open(root, event.detail.data));
}
