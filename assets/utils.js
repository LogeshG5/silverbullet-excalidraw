async function pluginEventHandler(event) {
    try {
        const message = event.data;
        console.debug(`got event in plugin: ${message}`);
        event.stopPropagation();
        switch (message.type) {
            case "ready":
                await handleReady(message);
                break;
            case "continuous-update":
                handleContinuousUpdate();
                break;
            case "svg-content":
                await saveFile(message.svg);
                break;
            case "binary-image-base64-content":
                await saveFile(message.blob);
                break;
            case "json-content":
                await saveFile(message.json);
                break;
            case "exit":
                await handleExit();
                break;
            case "fullscreen":
                await syscall("system.invokeFunction", "excalidraw.editExcalidrawFull", window.diagramPath);
                break;
        }
    } catch (error) {
        console.error("Error in pluginEventHandler:", error);
    }
}

async function saveFile(data) {
    await syscall("space.writeFile", window.diagramPath, data);
}

async function handleReady(message) {
    const fileData = await syscall("space.readFile", window.diagramPath);
    const fileExtension = getExtension(window.diagramPath);
    const blob = getBlob(fileData, fileExtension);

    const loadEvent = new MessageEvent("message", {
        data: { type: "load-from-file", blob: blob, theme: window.excalidrawTheme },
    });
    window.dispatchEvent(loadEvent);
}

function handleContinuousUpdate() {
    const fileExtension = getExtension(window.diagramPath);
    const saveEventType = getSaveEventType(fileExtension);
    if (saveEventType) {
        const saveEvent = new MessageEvent("message", { data: { type: saveEventType } });
        window.dispatchEvent(saveEvent);
    } else {
        console.error("Unknown format");
    }
}

async function handleExit() {
    handleContinuousUpdate();
    window.removeEventListener("message", pluginEventHandler);
    const page = await syscall("editor.getCurrentPage");
    console.log("Current Page", page);
    await syscall("editor.navigate", page, true, true);
    await syscall("editor.hidePanel", "modal");
}

function getExtension(filename) {
    const base = filename.split("/").pop();
    const parts = base.split(".");
    return parts.length > 1 ? parts.pop() : "";
}

function getBlob(fileData, fileExtension) {
    const blob = new Blob([fileData], { type: getMimeType(fileExtension) });
    const file = new File([blob], `image.${fileExtension}`, { type: getMimeType(fileExtension) });
    return file;
}

function getMimeType(fileExtension) {
    switch (fileExtension) {
        case "svg":
            return "image/svg+xml";
        case "png":
            return "image/png";
        case "excalidraw":
            return "application/json";
        default:
            return "";
    }
}

function getSaveEventType(fileExtension) {
    switch (fileExtension) {
        case "svg":
            return "save-as-svg";
        case "png":
            return "save-as-binary-image";
        case "excalidraw":
            return "save-as-json";
        default:
            return null;
    }
}

window.addEventListener("message", pluginEventHandler);