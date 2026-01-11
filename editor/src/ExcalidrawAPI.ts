
import type { RestoredDataState } from "@excalidraw/excalidraw/data/restore";
// import type { RestoredDataState } from "@excalidraw/excalidraw/dist/types/excalidraw/data/restore";
import {
  Excalidraw,
  exportToBlob,
  exportToSvg,
  loadFromBlob,
  serializeAsJSON,
  THEME,
} from "@excalidraw/excalidraw";
import type { RefObject, ReactElement } from "react";
import { debounce, getExtension } from "./helpers";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import { getMaximumGroups } from "@excalidraw/element";

const syscaller = (typeof silverbullet !== "undefined" ? silverbullet.syscall : syscall);


export class ExcalidrawApiBridge {
  private readonly excalidrawRef: RefObject<ExcalidrawImperativeAPI | null>;
  private readonly fileName: string;
  private readonly type: string;

  debouncedSave: () => void;
  constructor(excalidrawRef: RefObject<ExcalidrawImperativeAPI | null>, fileName: string, type: string) {
    this.excalidrawRef = excalidrawRef;
    this.debouncedSave = debounce(
      this.save,
      500
    );
    this.fileName = fileName;
    this.type = type;
  }

  private excalidraw(): ExcalidrawImperativeAPI {
    return this.excalidrawRef.current!;
  }

  private updateApp = (restoredData: RestoredDataState): void => {
    this.excalidraw().updateScene(restoredData);
    this.excalidraw().scrollToContent(undefined, { fitToContent: true });
    // Restore files(embedded images) specifically as updateScene wasn't enough
    this.excalidrawRef.current!.addFiles(restoredData.files);
  };

  getJson = (): string => {
    return serializeAsJSON(
      this.excalidraw().getSceneElements(),
      this.excalidraw().getAppState(),
      this.excalidraw().getFiles(),
      "local"
    );
  };

  private getSvg = (exportParams: object): Promise<SVGSVGElement> => {
    const sceneElements = this.excalidraw().getSceneElements();
    const appState = this.excalidraw().getAppState();
    return exportToSvg({
      elements: sceneElements,
      appState: { ...appState, ...exportParams, exportEmbedScene: true },
      files: this.excalidraw().getFiles(),
    });
  };

  private getPng = (exportParams: object, mimeType: string): Promise<Blob> => {
    const sceneElements = this.excalidraw().getSceneElements();
    const appState = this.excalidraw().getAppState();
    return exportToBlob({
      elements: sceneElements,
      appState: { ...appState, ...exportParams, exportEmbedScene: true },
      files: this.excalidraw().getFiles(),
      mimeType,
    });
  };


  public save = async (): Promise<void> => {
    const fileExtension = getExtension(this.fileName);
    const exportConfig = {};
    const isRoMode = (await syscaller("system.getMode")) === "ro";
    if (isRoMode) {
      console.log("Excalidraw: Not saving as system in ro mode");
      return;
    }
    switch (fileExtension) {
      case "svg":
        this.getSvg(exportConfig).then((svg) => {
          syscaller("space.writeFile", this.fileName, svg.outerHTML);
        });
        break;
      case "png":
        const mimeType = "image/png";
        this.getPng(exportConfig, mimeType).then((blob: Blob) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            syscaller("space.writeFile", this.fileName, blob);
          };
        });
        break;
      case "excalidraw":
        const data = this.getJson();
        if (this.type === "widget") {
          // no need to save as widget is made read-only
          // syscaller("space.writeFile", this.fileName, data);
        } else {
          globalThis.silverbullet.sendMessage("file-saved", { data: data });
        }
        break;
      default:
        break;
    }
  }


  public async load(message: { blob: Blob, viewMode: boolean, theme: string }): Promise<void> {
    loadFromBlob(message.blob, null, null)
      .then((restoredState: RestoredDataState | undefined) => {
        if (!restoredState) return;
        this.updateApp({
          elements: restoredState.elements || [],
          appState: {
            ...restoredState.appState,
            viewModeEnabled: message.viewMode,
            zenModeEnabled: message.viewMode,
            theme: message.theme === "dark" ? THEME.DARK : THEME.LIGHT,
            // openDialog: { name: 'commandPalette' }
          },
          // appState: {},
          files: restoredState.files || {},
        });
      })
      .catch((error: unknown) => {
        const errorStr = error instanceof Error ? error.toString() : JSON.stringify(error);
        console.error(errorStr);

        syscaller("editor.flashNotification", errorStr, "error");
      });
  };

 /**
   * 
   * @param deepSelect: if set to true, child elements of the selected frame will also be selected
   * @returns 
   */
  public getViewSelectedElements(includFrameChildren: boolean = true): ExcalidrawElement[] {
    const api = this.excalidraw();
    if (!api) {
      return [];
    }
    const selectedElements = api.getAppState()?.selectedElementIds;
    if (!selectedElements) {
      return [];
    }
    const selectedElementsKeys = Object.keys(selectedElements);
    if (!selectedElementsKeys) {
      return [];
    }

    const elementIDs = new Set<string>();

    const elements: ExcalidrawElement[] = api
      .getSceneElements()
      .filter((e: any) => selectedElementsKeys.includes(e.id));

    const containerBoundTextElmenetsReferencedInElements = elements
      .filter(
        (el) =>
          el.boundElements &&
          el.boundElements.filter((be) => be.type === "text").length > 0,
      )
      .map(
        (el) =>
          el.boundElements
            .filter((be) => be.type === "text")
            .map((be) => be.id)[0],
      );

    if(includFrameChildren && elements.some(el=>el.type === "frame")) {
      elements.filter(el=>el.type === "frame").forEach(frameEl => {
        api.getSceneElements()
          .filter(el=>el.frameId === frameEl.id)
          .forEach(el=>elementIDs.add(el.id))
      })
    }

    elements.forEach(el=>elementIDs.add(el.id));
    containerBoundTextElmenetsReferencedInElements.forEach(id=>elementIDs.add(id));

    return api
      .getSceneElements()
      .filter((el: ExcalidrawElement) => elementIDs.has(el.id));
  }
/**
 * Transforms array of objects containing `id` attribute,
 * or array of ids (strings), into a Map, keyd by `id`.
 */
public arrayToMap <T extends { id: string } | string>(
  items: readonly T[] | Map<string, T>,
) {
  if (items instanceof Map) {
    return items;
  }
  return items.reduce((acc: Map<string, T>, element) => {
    acc.set(typeof element === "string" ? element : element.id, element);
    return acc;
  }, new Map());
}
  /**
   * Gets elements grouped by the highest level groups.
   * @param {ExcalidrawElement[]} elements - Array of elements to group.
   * @returns {ExcalidrawElement[][]} Array of arrays of grouped elements.
   */
  getMaximumGroups(elements: ExcalidrawElement[]): ExcalidrawElement[][] {
    return getMaximumGroups(elements, this.arrayToMap(elements));
  }

  public async gridSize(): Promise<void> {

    // let appState = this.excalidraw().getAppState();
    const grid = 5;
    this.excalidraw().updateScene({
      appState: { gridSize: 50, gridStep: 1 },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  }

  public async fixedSpacing(): Promise<void> {

    // let appState = this.excalidraw().getAppState();

    const elements = this.getViewSelectedElements();
const topGroups = this.getMaximumGroups(elements)
    .filter(els => !(els.length === 1 && els[0].type ==="arrow")) // ignore individual arrows
    .filter(els => !(els.length === 1 && (els[0].containerId))); // ignore text in stickynote
const groups = topGroups.sort((lha,rha) => lha[0].x - rha[0].x); 
for(var i=0; i<groups.length; i++) {
    if(i > 0) {
        const preGroup = groups[i-1];
        const curGroup = groups[i];

        const preRight = Math.max(...preGroup.map(el => el.x + el.width));
        const curLeft = Math.min(...curGroup.map(el => el.x));
        // const distance = curLeft -  preRight - spacing;
        const distance = curLeft -  preRight - 50;

        for(const curEl of curGroup) {
            curEl.x = curEl.x - distance;
        }
    }
}
    console.log("------------- elements", elements);
  }
}
