import {
  asset,
  editor,
  space,
  clientStore,
} from "@silverbulletmd/silverbullet/syscalls";
import { SlashCompletions } from "@silverbulletmd/silverbullet/types";

type DiagramType = "Widget" | "Attachment";

async function getHtmlJs(path: string, type: string = 'fullscreen'): Promise<{
  html: string;
  script: string;
}> {
  const spaceTheme = (await clientStore.get("darkMode")) ? "dark" : "light";

  const exjs = await asset.readAsset("excalidraw", "assets/editor.js");
  const css = await asset.readAsset("excalidraw", "assets/editor.css");
  let html = "";
  let js = "";
  if (type === "widget") {
    html = `<style>${css}</style> <div id="root" class="excalidraw-widget"></div>`;
    js = ` ${exjs};
      window.diagramPath = "${path}";
      window.excalidrawTheme = "${spaceTheme}";
      window.diagramMode = "embed";
  `;
  } else {
    html = `<style>${css}</style> <div id="root"></div>`;
    js = ` ${exjs};
      window.diagramPath = "${path}";
      window.excalidrawTheme = "${spaceTheme}";
  `;
  }
  return {
    html: html,
    script: js,
  };
}

export async function openExcalidrawEditor(): Promise<{
  html: string;
  script: string;
}> {
  const path = await editor.getCurrentPage();
  return getHtmlJs(path);
}

export async function openFullScreenEditor(diagramPath: string): Promise<void> {
  const assets = await getHtmlJs(diagramPath);
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
  const lastSlash = pageName.lastIndexOf("/");
  const directory = lastSlash !== -1 ? pageName.substring(0, lastSlash) : pageName;
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
    diagramPath = `${matches[0]}`;
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
    diagramPath = `${selectedDiagram.name}`;
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
  const from = selection.from;
  const selectedText = text.slice(from, selection.to);

  let diagramName = selectedText;
  if (diagramName.length === 0) {
    // no text was selected in editor, prompt user
    diagramName = await editor.prompt("Enter a diagram name: ", "");
  } else {
    diagramName = await editor.prompt("Enter a diagram name: ", diagramName);
  }

  const ext = getFileExtension(diagramName);

  if (diagramType === "Widget") {
    if (ext !== "excalidraw") {
      diagramName = `${diagramName}.excalidraw`;
    }
  }
  else if (diagramType === "Attachment") {
    if (ext !== "svg" && ext !== "png") {
      diagramName = `${diagramName}.svg`;
      await editor.flashNotification(
        "No extenstion provided, svg chosen",
        "info"
      );
    }
  }

  const pageName = await editor.getCurrentPage();
  const lastSlash = pageName.lastIndexOf("/");
  const directory = lastSlash !== -1 ? pageName.substring(0, lastSlash) : pageName;
  const filePath = `${directory}/${diagramName}`;
  // Ask before overwriting
  const fileExists = await space.fileExists(filePath);
  if (fileExists) {
    const overwrite = await editor.confirm(
      "File already exist! Do you want to overwrite?"
    );
    if (!overwrite) {
      return false;
    }
  }

  const fileContent = new TextEncoder().encode(
    `{"type":"excalidraw","version":2,"elements":[],"appState":{},"files":{}}`
  );
  await space.writeFile(filePath, fileContent);

  if (diagramType === "Widget") {
    // insert code block

    const codeBlock = `\`\`\`excalidraw
url:${filePath}
height: 500
\`\`\``;
    await editor.replaceRange(from, selection.to, codeBlock);
  }
  else if (diagramType === "Attachment") {
    const link = `![${diagramName}](${filePath})`;
    await editor.replaceRange(from, selection.to, link);

    // open file in editor
    await openFullScreenEditor(filePath);
  }
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
