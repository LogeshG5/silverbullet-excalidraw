import {
  asset,
  editor,
  space,
} from "@silverbulletmd/silverbullet/syscalls";

function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index !== -1 ? filename.slice(index + 1) : "";
}

function getDiagrams(text: string) {
  const regex = /\((.*?)\)/g;
  let matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const ext = getFileExtension(match[1]);
    if (ext == "svg" || ext == "png" || ext == "excalidraw") {
      matches.push(match[1]);
    }
  }
  return matches;
}

async function excalidrawEdit(diagramPath: string) {
  const exhtml = await asset.readAsset("excalidraw", "assets/index.html");
  const exjs = await asset.readAsset("excalidraw", "assets/main.js");
  const utilsjs = await asset.readAsset("excalidraw", "assets/utils.js");
  await editor.showPanel(
    "modal",
    1,
    `${exhtml} `,
    `
     ${exjs};
     window.diagramPath = "${diagramPath}";
     ${utilsjs};
    `
  );
}

export async function editExcalidrawDiagram() {
  const pageName = await editor.getCurrentPage();
  const directory = pageName.substring(0, pageName.lastIndexOf("/"));
  const text = await editor.getText();
  let matches = getDiagrams(text);

  let diagramPath = "";
  if (matches.length == 0) {
    editor.flashNotification(
      "No png or svg diagrams attached to this page!",
      "error"
    );
    return;
  }
  if (matches.length == 1) {
    diagramPath = directory + "/" + matches[0];
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
    diagramPath = directory + "/" + selectedDiagram.name;
  }

  await excalidrawEdit(diagramPath);
}

export async function createExcalidrawDiagram() {
  // extract selected text from editor
  const text = await editor.getText();
  const selection = await editor.getSelection();
  const from = selection.from;
  let selectedText = text.slice(from, selection.to);

  let diagramName = selectedText;
  if (diagramName.length == 0) {
    // nothing was selected, prompt user
    diagramName = await editor.prompt("Enter a diagram name: ", "sample.svg");
  }

  let ext = getFileExtension(diagramName);
  if (ext != "svg" && ext != "png" && ext != "excalidraw") {
    // extension not provided, choose svg as default for better quality
    ext = "svg";
    diagramName = diagramName + "." + ext;
  }

  const pageName = await editor.getCurrentPage();
  const directory = pageName.substring(0, pageName.lastIndexOf("/"));
  const filePath = directory + "/" + diagramName;

  // insert link or overwrite link text in editor
  const link = `![${diagramName}](${diagramName})`;
  await editor.replaceRange(from, selection.to, link);
  
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

  // open file in editor
  await excalidrawEdit(filePath);
}
