import React from "react";
import { createRoot } from "react-dom/client"; // From React 18

import "./styles.css";

import { renderWidget } from "./widget";
import { renderEditor } from "./editor";

(function init() {
    const editorElement = document.getElementById("editor");
    const widgetElement = document.getElementById("widget");
    console.log({ widgetElement, editorElement });

    if (editorElement) {
        renderEditor(editorElement);
    } else if (widgetElement && typeof silverbullet === "undefined") { // workaround to stop widget to open unnecessarily 
        renderWidget(widgetElement);
    } else {
        console.error("Excalidraw: No editor or widget element found");
    }
})();
