import React, { useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { AppState, BinaryFiles, ExcalidrawInitialDataState } from "@excalidraw/excalidraw/dist/types/excalidraw/types";
import { OrderedExcalidrawElement } from "@excalidraw/excalidraw/dist/types/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { ExcalidrawApiBridge } from "./ExcalidrawAPI";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Excalidraw, THEME } from "@excalidraw/excalidraw";
import { getBlob, getExtension } from "./helpers";

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


function App() {

    const [isEditing, setIsEditing] = React.useState(false);

    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const apiBridge = new ExcalidrawApiBridge(excalidrawApiRef);


    function onChange(elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) {
        apiBridge!.debouncedSave();
    }

    function startEditing() {
        setIsEditing(true);
    }

    function stopEditing() {
        setIsEditing(false);
        apiBridge!.debouncedSave();
    }

    function openFullScreen() {
        syscall("editor.navigate", window.diagramPath)
    }

    const excalidrawRef = useCallback((excalidrawApi: ExcalidrawImperativeAPI) => {
        excalidrawApiRef.current = excalidrawApi;
        syscaller("space.readFile", window.diagramPath).then((data: BlobPart) => {
            const fileExtension = getExtension(window.diagramPath);
            const blob = getBlob(data, fileExtension);
            apiBridge!.handleLoadFromFile({ blob: blob, theme: window.excalidrawTheme === "light" ? THEME.LIGHT : THEME.DARK });
        });
    }, []);

    return <div className={isEditing ? "excalidraw-editor" : "excalidraw-viewer"}>
        <Excalidraw
            excalidrawAPI={excalidrawRef}
            isCollaborating={false}
            // initialData={doc}
            initialData={{ appState: { exportEmbedScene: true } }}
            onChange={onChange}
            viewModeEnabled={!isEditing}
            // theme={darkMode ? "dark" : "light"}
            UIOptions={{
                canvasActions: {
                    loadScene: false,
                    saveAsImage: false,
                    saveToActiveFile: false,
                }
            }}
            renderTopRightUI={isEditing
                ? () => <button className="button" id="exit-button" onClick={stopEditing}>Exit</button>
                : () => null}
        >
            {!isEditing && <button className="button" id="edit-button" onClick={startEditing}>Edit</button>}
            {isEditing && <button className="button" id="edit-fullscreen" onClick={openFullScreen}>Fullscreen</button>}
        </Excalidraw>
    </div>
}

export function renderWidget(rootElement: HTMLElement) {
    const root = ReactDOM.createRoot(rootElement);
    const fileName = rootElement.dataset.filename!;
    const darkMode = rootElement.dataset.darkmode === "true";
    root.render(<App />);
}
