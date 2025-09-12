import { OrderedExcalidrawElement } from "@excalidraw/excalidraw/dist/types/excalidraw/element/types";
import {
	AppState,
	BinaryFiles,
} from "@excalidraw/excalidraw/dist/types/excalidraw/types";

declare global {
	const syscall: (name: string, ...args: any[]) => Promise<any>;
	var silverbullet: {
		syscall: (name: string, ...args: any[]) => Promise<any>;
		sendMessage: (name: string, ...args: any[]) => Promise<any>;
		addEventListener: (name: string, callback: (args: any) => void) => void;
	};
}

export type SaveState = {
	elements: readonly OrderedExcalidrawElement[];
	appState: AppState;
	files: BinaryFiles;
};
