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
}


function App({ fileName, theme }: AppProps) {
    const [isEditing, setIsEditing] = useState(false);

    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const apiBridge = useRef(
        new ExcalidrawApiBridge(excalidrawApiRef, fileName, "widget")
    ).current;

    const onChange = useCallback(() => {
        apiBridge.debouncedSave();
    },
        [apiBridge]
    );

    const startEditing = useCallback(() => setIsEditing(true), []);
    const stopEditing = useCallback(() => {
        setIsEditing(false);
        apiBridge.debouncedSave();
    }, [apiBridge]);

    const openFullScreen = useCallback(async () => {
        await syscall("editor.navigate", fileName);
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

    const UiControls = () => (
        <div style={{ display: "flex", gap: "5px" }}>
            <button
                className="button"
                id="edit-fullscreen"
                onClick={openFullScreen}
                title="Open fullscreen"
            >
                ⛶
            </button>

        </div>
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

    const LockButton = () => (
        <button
            className="button"
            id="edit-button"
            onClick={stopEditing}
            title="Stop editing"
        >
            🔒
        </button>
    );

    return (
        <div className={isEditing ? "excalidraw-editor" : "excalidraw-viewer"}>
            <Excalidraw
                excalidrawAPI={excalidrawRef}
                isCollaborating={false}
                initialData={
                    { appState: { exportEmbedScene: true }, } as ExcalidrawInitialDataState
                }
                onChange={onChange}
                viewModeEnabled={!isEditing}
                theme={theme}
                UIOptions={{
                    canvasActions: {
                        loadScene: false,
                        saveAsImage: false,
                        saveToActiveFile: false,
                    },
                }}
                renderTopRightUI={(isMobile, appState) =>
                    isEditing ? <UiControls /> : null
                }
            >
                {!isEditing && <EditButton />}
                {isEditing && <LockButton />}
            </Excalidraw>
        </div>
    );
}

export function renderWidget(rootElement: HTMLElement) {
    const fileName = rootElement.dataset.filename!;
    const theme =
        rootElement.dataset.darkmode === "true" ? THEME.DARK : THEME.LIGHT;

    const root = ReactDOM.createRoot(rootElement);
    root.render(<App fileName={fileName} theme={theme} />);
}

