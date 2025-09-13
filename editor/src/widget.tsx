import React, { useRef, useCallback } from "react";
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

function App({ fileName, theme }: { fileName: string, theme: Theme }) {

    const [isEditing, setIsEditing] = React.useState(false);

    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const apiBridge = new ExcalidrawApiBridge(excalidrawApiRef, fileName, "widget");


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

    async function openFullScreen() {
        await syscall("editor.navigate", fileName)
    }

    const excalidrawRef = useCallback(async (excalidrawApi: ExcalidrawImperativeAPI) => {
        excalidrawApiRef.current = excalidrawApi;
        let data = await syscaller("space.readFile", fileName);
        const blob = getBlob(data, getExtension(fileName));
        apiBridge!.load({ blob: blob });
    }, []);

    return (<div className={isEditing ? "excalidraw-editor" : "excalidraw-viewer"} >
        <Excalidraw
            excalidrawAPI={excalidrawRef}
            isCollaborating={false}
            initialData={{ appState: { exportEmbedScene: true } }
            }
            onChange={onChange}
            viewModeEnabled={!isEditing}
            theme={theme}

            UIOptions={{
                canvasActions: {
                    loadScene: false,
                    saveAsImage: false,
                    saveToActiveFile: false,
                }
            }}
            renderTopRightUI={
                isEditing
                    ? () => <div style={{ display: "flex", gap: "5px" }}><button className="button" id="edit-fullscreen" onClick={openFullScreen} >🗖</button><button className="button" id="exit-button" onClick={stopEditing} >✘ </button></div>
                    : () => null}
        >
            {!isEditing && <button className="button" id="edit-button" onClick={startEditing} >✎ᝰ</button>}
        </Excalidraw>
    </div>);
}

export function renderWidget(rootElement: HTMLElement) {
    const fileName = rootElement.dataset.filename!;
    const type = rootElement.dataset.type!;
    const theme = rootElement.dataset.darkmode === "true" ? THEME.DARK : THEME.LIGHT;
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App fileName={fileName} theme={theme} />);
}

