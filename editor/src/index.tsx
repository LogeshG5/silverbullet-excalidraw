import React from "react";
import { createRoot } from "react-dom/client"; // From React 18

// import "./styles.scss";
import "./styles.css";

import { renderWidget } from "./widget";
import { renderEditor } from "./editor";

// https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-client-rendering-apis
// const rootContainer = document.getElementById("root");
// const root = createRoot(rootContainer!)
// root.render(React.createElement(App));

(function init() {
    const editorElement = document.getElementById("editor");
    const widgetElement = document.getElementById("widget");
    console.log({ widgetElement, editorElement });

    if (editorElement) {
        renderEditor(editorElement);
    } else if (widgetElement) {
        renderWidget(widgetElement);
    } else {
        console.error("Excalidraw: No editor or widget element found");
    }
})();
