function getExtension(filename) {
    const base = filename.split('/').pop(); // remove path
    const parts = base.split('.');
    return parts.length > 1 ? parts.pop() : ''; // return '' if no extension
}

var pluginEventHandler = async function (e) {
    try {
        const message = e.data;
        console.debug("got event in plugin: " + message);
        switch (message.type) {
            case "ready": {
                const uint8arr = await syscall("space.readFile", window.diagramPath);
                let file = null;
                switch (getExtension(window.diagramPath)) {
                    case "svg": {
                        const blob = new Blob([uint8arr], { type: 'image/svg+xml' });
                        file = new File([blob], "image.svg", { type: "image/svg+xml" });
                        break;
                    }
                    case "png": {
                        const blob = new Blob([uint8arr], { type: 'image/png' });
                        file = new File([blob], "image.png", { type: "image/png" });
                        break;
                    }
                    case "excalidraw": {
                        const blob = new Blob([uint8arr], { type: 'application/json' });
                        file = new File([blob], "image.excalidraw", { type: "application/json" });
                        break;
                    }
                }

                const ev = new MessageEvent('message', { data: { type: "load-from-file", blob: file } });
                window.dispatchEvent(ev);
                break;
            }
            case "continuous-update": {
                let ev = null;
                switch (getExtension(window.diagramPath)) {
                    case "svg": {
                        ev = new MessageEvent('message', { data: { type: "save-as-svg" } });
                        break;
                    }
                    case "png": {
                        ev = new MessageEvent('message', { data: { type: "save-as-binary-image" } });
                        break;
                    }
                    case "excalidraw": {
                        ev = new MessageEvent('message', { data: { type: "save-as-json" } });
                        break;
                    }
                    default: {
                        console.log("Unknown format");
                        break;
                    }
                }
                window.dispatchEvent(ev);
                break;
            }
            case "svg-content": {
                await
                    syscall("space.writeFile", window.diagramPath, message.svg);
                break;
            }
            case "binary-image-base64-content": {
                await
                    syscall("space.writeFile", window.diagramPath, message.blob);
                break;
            }
            case "json-content": {
                await
                    syscall("space.writeFile", window.diagramPath, message.json);
                break;
            }
            case "exit": {
                console.debug("Exit");
                await syscall("editor.reloadPage");
                await syscall("editor.flashNotification", "Refresh page to view changes!");
                await syscall("editor.hidePanel", "modal");
                window.removeEventListener('message', pluginEventHandler);
                break;
            }
            case "fullscreen": {
                console.debug("fullscreen");
                await syscall("system.invokeFunction", "excalidraw.editExcalidrawFull", window.diagramPath);
                break;
            }
        }
    } catch (error) {
        console.log("Message in Plugin error", error)
    }
}

window.addEventListener('message', pluginEventHandler);
