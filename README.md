# SilverBullet plug for Excalidraw diagrams

This plug adds [Excalidraw](https://excalidraw.com/) support to Silverbullet.

## Installation

Run the {[Plugs: Add]} command and paste in: `github:logeshg5/silverbullet-excalidraw/excalidraw.plug.js`

## Usage

https://github.com/user-attachments/assets/65c8aab8-aa2a-4878-84b9-852ca83d9b53

### Create New Diagram

Run `Excalidraw: Create diagram` command and type in the name of the diagram.

(or)

In the editor, type the name of the diagram e.g., `flowchart.excalidraw.svg`, select it and run `Excalidraw: Create diagram` command.

Excalidraw editor will open. Make your changes and it is automatically saved. Once done close the editor and refresh the page.

Note: You will have to refresh the page to view the updates.

### Edit Existing Diagram

Attach your diagrams to the page `![FlowChart](FlowChart.excalidraw.png)`.

Run `Excalidraw: Edit diagram`.

If multiple diagrams are present in a page, you will be prompted to choose one.

Note: You will have to refresh the page to view the updates.

## Build the Plugin

If you wish to contribute to this plugin,

1. Build the excalidraw react app under `editor` directory 
    1. `cd editor`
    2. `npm install`
    3. `npm run build`
2. Go back to the main dir `cd ..` & Build the plugin with `deno task build`
3. Copy the plugin js `excalidraw.plug.js` to your space `<space>/_plug`
4. Refresh and reload Silverbullet couple of times

---

Thanks to [Brice Dutheil](https://github.com/bric3). This pulugin is based on his [excalidraw-jetbrains-plugin](https://github.com/bric3/excalidraw-jetbrains-plugin). 
Thanks to [Max Richter](https://github.com/jim-fx) for similar plugin [excalidraw-silverbullet](https://github.com/jim-fx/silverbullet-excalidraw) where I lifted/learned some implementation ideas.
