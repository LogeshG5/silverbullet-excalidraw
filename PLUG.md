---
name: Library/LogeshG5/silverbullet-excalidraw
tags: meta/library
files:
- excalidraw.plug.js
- Silverbullet-Excalidraw/excalidraw_editor.js
- Silverbullet-Excalidraw/libraries.json
- Silverbullet-Excalidraw/lua-helpers.md
---
# SilverBullet plug for Excalidraw diagrams

This plug adds [Excalidraw](https://excalidraw.com/) support to Silverbullet.

## Usage

https://github.com/user-attachments/assets/1402f02d-b85b-4cb9-866f-16ab7b478f9c

### Create New Diagram

Run `Excalidraw: Create diagram` command and type in the name of the diagram. (or) Use `/excalidraw` slash command.

A code widget will be inserted. Move away from the code widget and you will see the diagram.

If you wish to create SVG/PNG files, Run `Excalidraw: Create SVG/PNG diagram`.

### Use Lua Instead of Code Block

You can render an existing file using below lua function,

```
${excalidraw.render("work.excalidraw")}
```

Optionally you can pass height in pixels and theme arguments (dark or light),

```
${excalidraw.render("work.excalidraw", 500, 'dark')}
```

### Use Document Picker

Run `Navigate: Document Picker` and select .excalidraw files to open the editor.

### Edit SVG/PNG Diagram

Run `Excalidraw: Edit diagram`.

If multiple diagrams are present in a page, you will be prompted to choose one.

### Using Libraries

1. In the library sidebar, click **Browse libraries** to open [libraries.excalidraw.com](https://libraries.excalidraw.com/).
2. Find your desired library and click **Download** (do not click *Add to Excalidraw*).
3. Return to Silverbullet Excalidraw, click the **three dots menu (...)**, and select **Open** to load the downloaded file.

