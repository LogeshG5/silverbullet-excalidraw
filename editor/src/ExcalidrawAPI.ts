
import type { RestoredDataState } from "@excalidraw/excalidraw/dist/types/excalidraw/data/restore";
import {
	Excalidraw,
	exportToBlob,
	exportToSvg,
	loadFromBlob,
	serializeAsJSON,
	MainMenu,
	THEME
} from "@excalidraw/excalidraw";
import type { RefObject, ReactElement } from "react";
import { debounce, getExtension } from "./helpers";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { Theme } from "@excalidraw/excalidraw/dist/types/excalidraw/element/types";

const syscaller = (typeof silverbullet !== "undefined" ? silverbullet.syscall : syscall);


export class ExcalidrawApiBridge {
	private readonly excalidrawRef: RefObject<ExcalidrawImperativeAPI | null>;
	// private _setTheme: React.Dispatch<Theme> | null = null;

	debouncedSave: () => void;
	constructor(excalidrawRef: RefObject<ExcalidrawImperativeAPI | null>) {
		this.excalidrawRef = excalidrawRef;
		this.debouncedSave = debounce(
			this.continuousSaving,
			500
		);
	}

	// set setTheme(value: React.Dispatch<Theme>) {
	//     this._setTheme = value;
	// }

	private excalidraw(): ExcalidrawImperativeAPI {
		return this.excalidrawRef.current!;
	}

	private updateApp = ({ elements, appState }: { elements: any[]; appState: object }): void => {
		this.excalidraw().updateScene({ elements, appState });
		this.excalidraw().scrollToContent();
	};

	saveAsJson = (): string => {
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


	handleContinuousUpdate = () => {
		const fileExtension = getExtension(window.diagramPath);
		const exportConfig = {};
		switch (fileExtension) {
			case "svg":
				this.saveAsSvg(exportConfig).then((svg) => {
					syscaller("space.writeFile", window.diagramPath, svg.outerHTML);
				});
				break;
			case "png":
				const mimeType = "image/png";
				this.saveAsBlob(exportConfig, mimeType).then((blob: Blob) => {
					const reader = new FileReader();
					reader.readAsDataURL(blob);
					reader.onloadend = () => {
						syscaller("space.writeFile", window.diagramPath, blob);
					};
				});
				break;
			case "excalidraw":
				syscaller("space.writeFile", window.diagramPath, this.saveAsJson());
				break;
			default:
				break;
		}
	}

	private continuousSaving = async (): Promise<void> => {
		console.debug("debounced scene changed 2");
		this.saveAsJson();
		this.handleContinuousUpdate();
	};

	handleLoadFromFile = (message: { blob: Blob; theme: Theme }): void => {
		// this._setTheme!(message.theme);
		loadFromBlob(message.blob, null, null)
			.then((restoredState: RestoredDataState | undefined) => {
				if (!restoredState) return;
				console.debug("Call updateApp and scene");
				this.updateApp({ elements: restoredState.elements || [], appState: {} });
			})
			.catch((error: unknown) => {
				const errorStr = error instanceof Error ? error.toString() : JSON.stringify(error);
				console.error(errorStr);

				syscaller("editor.flashNotification", errorStr, "error");
			});
	};

	exit = () => {
		this.handleContinuousUpdate();
		syscaller("sync.performSpaceSync").then(() => {
			syscaller("editor.reloadUI");
			syscaller("editor.hidePanel", "modal");
		})
	}

}
