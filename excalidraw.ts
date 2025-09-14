import {
  asset,
  editor,
  space,
  clientStore,
} from "@silverbulletmd/silverbullet/syscalls";
import { SlashCompletions } from "@silverbulletmd/silverbullet/types";

type DiagramType = "Widget" | "Attachment";

async function getHtmlJs(
  path: string,
  type: "editor" | "widget" | "fullscreen"
): Promise<{ html: string; script: string }> {
  const spaceTheme = (await clientStore.get("darkMode")) ? "dark" : "light";
  const darkMode = await clientStore.get("darkMode");
  const js = await asset.readAsset("excalidraw", "assets/editor.js");
  const css = await asset.readAsset("excalidraw", "assets/editor.css");
  const data = `data-filename="${path}" data-theme="${darkMode}" data-type="${type}"`;

  let html = "";
  switch (type) {
    case "editor": {
      html = `<style>${css}</style><div id="editor" ${data}></div>`;
      break;
    }
    case "widget": {
      html = `<style>${css}</style><div id="widget" class="excalidraw-widget" ${data}></div>`;
      break;
    }
    case "fullscreen": {
      html = `<style>${css}</style><div id="svgeditor" class="excalidraw-fullscreen" ${data}></div>`;
      break;
    }
  }

  const script = `
    ${js};
  `;

  return { html: html, script: script };
}

export async function openExcalidrawEditor(): Promise<{
  html: string;
  script: string;
}> {
  const path = await editor.getCurrentPage();
  return getHtmlJs(path, "editor");
}

export async function openFullScreenEditor(diagramPath: string): Promise<void> {
  const assets = await getHtmlJs(diagramPath, "fullscreen");
  await editor.showPanel(
    "modal",
    1,
    assets.html,
    assets.script
  );
}

function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index !== -1 ? filename.slice(index + 1) : "";
}

function getDiagrams(text: string): string[] {
  const regex = /\((.*?)\)/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const ext = getFileExtension(match[1]);
    if (ext === "svg" || ext === "png" || ext === "excalidraw") {
      matches.push(match[1]);
    }
  }
  return matches;
}

/* "Excalidraw: Edit diagram" 
 
looks for attached diagrams 
Prompts the user to select one attachment 
Opens the editor
 
*/
export async function editDiagram(): Promise<void> {
  const pageName = await editor.getCurrentPage();
  const directory = getCurrentDirectory(pageName);
  const text = await editor.getText();
  const matches = getDiagrams(text);

  let diagramPath = "";
  if (matches.length === 0) {
    await editor.flashNotification(
      "No png, svg or excalidraw diagrams attached to this page!",
      "error"
    );
    return;
  }
  if (matches.length === 1) {
    diagramPath = `${directory}/${matches[0]}`;
  } else {
    const options = matches.map((model) => ({
      name: model,
      description: "",
    }));
    const selectedDiagram = await editor.filterBox("Edit", options, "", "");
    if (!selectedDiagram) {
      await editor.flashNotification("No diagram selected!", "error");
      return;
    }
    diagramPath = `${directory}/${selectedDiagram.name}`;
  }
  await openFullScreenEditor(diagramPath);
}

/* "Excalidraw: Create diagram" 
 
Prompts for a filename
Creates a diagram file
Updates the code editor by adding a
  code block -> if the file is .excalidraw
  attachment to the image -> if the file is .png / .svg
 
*/

async function createDiagram(diagramType: DiagramType): Promise<void | false> {
  const text = await editor.getText();
  const selection = await editor.getSelection();
  const { from, to } = selection;
  const selectedText = text.slice(from, to);

  // Ask for diagram name (default: selected text or empty)
  let diagramName = await editor.prompt(
    "Enter a diagram name:",
    selectedText || ""
  );
  if (!diagramName) return false; // user cancelled

  diagramName = ensureExtension(diagramName, diagramType);

  const directory = getCurrentDirectory(await editor.getCurrentPage());
  const filePath = `${directory}/${diagramName}`;

  if (await fileAlreadyExists(filePath)) {
    return false;
  }

  await writeEmptyExcalidrawFile(filePath);

  if (diagramType === "Widget") {
    await insertExcalidrawBlock(from, to, filePath);
  } else {
    await insertAttachment(from, to, diagramName, filePath);
  }
}


function ensureExtension(name: string, type: DiagramType): string {
  const ext = getFileExtension(name);

  if (type === "Widget") {
    return ext === "excalidraw" ? name : `${name}.excalidraw`;
  }

  if (type === "Attachment") {
    if (ext === "svg" || ext === "png") return name;
    editor.flashNotification("No extension provided, svg chosen", "info");
    return `${name}.svg`;
  }

  return name;
}

function getCurrentDirectory(pageName: string): string {
  const lastSlash = pageName.lastIndexOf("/");
  return lastSlash !== -1 ? pageName.substring(0, lastSlash) : pageName;
}

async function fileAlreadyExists(filePath: string): Promise<boolean> {
  if (await space.fileExists(filePath)) {
    const overwrite = await editor.confirm(
      "File already exists! Do you want to overwrite?"
    );
    return !overwrite;
  }
  return false;
}

async function writeEmptyExcalidrawFile(filePath: string): Promise<void> {
  const content = new TextEncoder().encode(
    `{"type":"excalidraw","version":2,"elements":[],"appState":{},"files":{}}`
  );
  await space.writeFile(filePath, content);
}

async function insertExcalidrawBlock(from: number, to: number, filePath: string): Promise<void> {
  const block = `\`\`\`excalidraw
url:${filePath}
\`\`\``;
  await editor.replaceRange(from, to, block);
}

async function insertAttachment(from: number, to: number, name: string, filePath: string): Promise<void> {
  const link = `![${name}](${name})`;
  await editor.replaceRange(from, to, link);
  await openFullScreenEditor(filePath);
}

export async function createDiagramAsWidget(): Promise<void | false> {
  createDiagram("Widget");
}


export async function createDiagramAsAttachment(): Promise<void | false> {
  createDiagram("Attachment");
}


// Previewer iframe for the code widget
export async function showWidget(
  widgetContents: string
): Promise<{ html: string; script: string }> {
  const urlMatch = widgetContents.match(/url:\s*(.+)/i);
  const path = urlMatch ? urlMatch[1].trim() : null;

  if (!path || !(await space.fileExists(path))) {
    return { html: `<pre>File does not exist</pre>`, script: "" };
  }

  return getHtmlJs(path, 'widget');
}

export function snippetSlashComplete(): SlashCompletions {
  return {
    options: [
      {
        label: "excalidraw",
        detail: "Create new Excalidraw diagram",
        invoke: "excalidraw.createDiagramAsWidget",
      },
    ],
  };
}
