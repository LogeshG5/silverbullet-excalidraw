import React, { useRef, useCallback } from "react";
import ReactDOM from "react-dom/client";
import {
    AppState,
    BinaryFiles,
    ExcalidrawInitialDataState,
    OrderedExcalidrawElement,
    ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { ExcalidrawApiBridge } from "./ExcalidrawAPI";
import { Excalidraw, THEME } from "@excalidraw/excalidraw";
import { getBlob, getExtension } from "./helpers";

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
    theme: string;
    viewMode: boolean;
    fileName: string;
}

function App({ doc, theme, viewMode, fileName }: AppProps) {
    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const apiBridgeRef = useRef(
        new ExcalidrawApiBridge(excalidrawApiRef, fileName, "editor")
    );

    const onChange = useCallback(() => {
        silverbullet.sendMessage("file-changed", {});
    },
        []
    );

    const save = useCallback(() => {
        apiBridgeRef.current.save();
    }, []);

    const excalidrawRef = useCallback(
        async (excalidrawApi: ExcalidrawImperativeAPI) => {
            excalidrawApiRef.current = excalidrawApi;

            const data = await syscaller("space.readFile", fileName);
            const blob = getBlob(data, getExtension(fileName));
            apiBridgeRef.current.load({ blob: blob, viewMode: viewMode, theme: theme });

            silverbullet.addEventListener("request-save", () => save());
        },
        [fileName, save]
    );

    return (
        <div className={viewMode ? "excalidraw-viewer" : "excalidraw-editor"}>
            <Excalidraw
                excalidrawAPI={excalidrawRef}
                isCollaborating={false}
                initialData={doc}
                key={fileName}
                onChange={onChange}
                viewModeEnabled={viewMode}
                zenModeEnabled={viewMode}
                UIOptions={{
                    canvasActions: {
                        loadScene: true,
                        saveAsImage: true,
                        saveToActiveFile: false,
                        toggleTheme: true,
                    },
                }}
            />
        </div>
    );
}

async function open(root: ReactDOM.Root, data: any) {
    const darkMode = await silverbullet.syscall("clientStore.get", "darkMode");
    const theme: string = darkMode ? "dark" : "light";

    const fileName: string = await silverbullet.syscall("editor.getCurrentPage");

    let json: string;
    try {
        json = new TextDecoder("utf-8").decode(data); // latest edge docker build (:v2 tag)
    } catch {
        json = data;
    }
    const doc: ExcalidrawInitialDataState = JSON.parse(json);
    const isRoMode = (await syscaller("system.getMode")) === "ro";
    root.render(<App doc={doc} theme={theme} viewMode={isRoMode} fileName={fileName} />);
}

export function renderEditor(rootElement: HTMLElement) {
    const root = ReactDOM.createRoot(rootElement);
    silverbullet.addEventListener("file-open", (event) =>
        open(root, event.detail.data)
    );
    silverbullet.addEventListener("file-update", (event) =>
        open(root, event.detail.data)
    );
}

