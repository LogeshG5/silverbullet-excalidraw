import {
  asset,
  editor,
  space,
  clientStore,
} from "@silverbulletmd/silverbullet/syscalls";
import { SlashCompletions } from "@silverbulletmd/silverbullet/types";

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

export async function openFullScreenEditor(diagramPath: string): Promise<void> {
  const exhtml = await asset.readAsset("excalidraw", "assets/index.html");
  const exjs = await asset.readAsset("excalidraw", "assets/editor.js");
  const utilsjs = await asset.readAsset("excalidraw", "assets/utils.js");
  const spaceTheme = (await clientStore.get("darkMode")) ? "dark" : "light";
  const js = `
     ${exjs};
     window.diagramPath = "${diagramPath}";
     window.excalidrawTheme = "${spaceTheme}";
     ${utilsjs};
    `;
  await editor.showPanel(
    "modal",
    1,
    exhtml,
    js
  );
}

/* "Excalidraw: Edit diagram" 

looks for attached diagrams 
Prompts the user to select one attachment 
Opens the editor

*/
export async function editDiagram(): Promise<void> {
  const pageName = await editor.getCurrentPage();
  const directory = pageName.substring(0, pageName.lastIndexOf("/"));
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

export async function createDiagram(): Promise<void | false> {
  const text = await editor.getText();
  const selection = await editor.getSelection();
  const from = selection.from;
  const selectedText = text.slice(from, selection.to);

  let diagramName = selectedText;
  if (diagramName.length === 0) {
    // nothing was selected, prompt user
    diagramName = await editor.prompt("Enter a diagram name: ", "");
  }

  const ext = getFileExtension(diagramName);
  if (ext !== "svg" && ext !== "png" && ext !== "excalidraw") {
    // extension not provided
    await editor.flashNotification(
      "Extensions must be one of .svg, .png or .excalidraw",
      "error"
    );
    return;
  }

  const pageName = await editor.getCurrentPage();
  const directory = pageName.substring(0, pageName.lastIndexOf("/"));
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

  if (ext === "svg" || ext === "png") {
    const link = `![${diagramName}](${diagramName})`;
    await editor.replaceRange(from, selection.to, link);

    // open file in editor
    await openFullScreenEditor(filePath);
  } else if (ext === "excalidraw") {
    // insert code block
    const fileContent = new TextEncoder().encode(
      `{"type":"excalidraw","version":2,"elements":[],"appState":{},"files":{}}`
    );
    await space.writeFile(filePath, fileContent);

    const codeBlock = `\`\`\`excalidraw
url:${filePath}
height: 500
\`\`\``;
    await editor.replaceRange(from, selection.to, codeBlock);
  }
}

// Previewer iframe for the code widget
export async function showWidget(
  widgetContents: string
): Promise<{ html: string; script: string }> {
  const exjs = await asset.readAsset("excalidraw", "assets/editor.js");
  const utilsjs = await asset.readAsset("excalidraw", "assets/utils.js");

  const urlMatch = widgetContents.match(/url:\s*(.+)/i);
  const heightMatch = widgetContents.match(/height:\s*(\d+)/i);
  const themeMatch = widgetContents.match(/theme:\s*(.+)/i);

  const url = urlMatch ? urlMatch[1].trim() : null;
  const height = (heightMatch ? heightMatch[1].trim() : "500") + "px";

  // use theme specified in code widget, if not use theme of current space
  const spaceTheme = (await clientStore.get("darkMode")) ? "dark" : "light";
  const theme = themeMatch ? themeMatch[1].trim() : spaceTheme;

  if (!url || !(await space.fileExists(url))) {
    return { html: `<pre>File does not exist</pre>`, script: "" };
  }

  const html = `<head>
                <style>
                  body {
                    padding: 0;
                    margin: 0;
                    height: ${height};
                  }
                  .excalidraw-wrapper {
                    width: 100vw;
                    height: 100vh;
                  }
                </style>
              </head>
              <body>
                <div id="root"></div>
              </body>
              </html>`;
  
  const js = ` ${exjs};
              window.diagramPath = "${url}";
              window.diagramMode = "embed";
              window.excalidrawTheme = "${theme}";
              ${utilsjs};`;
  return {
    html: html,
    script: js,
  };
}

export function snippetSlashComplete(): SlashCompletions {
  return {
    options: [
      {
        label: "excalidraw",
        detail: "Create new Excalidraw diagram",
        invoke: "excalidraw.createDiagram",
      },
    ],
  };
}