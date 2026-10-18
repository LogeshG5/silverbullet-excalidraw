---
name: Library/LogeshG5/silverbullet-excalidraw
tags: meta/library
files:
- excalidraw.plug.js
- excalidraw_editor.js
---
# SilverBullet plug for Excalidraw diagrams

This plug adds [Excalidraw](https://excalidraw.com/) support to Silverbullet.

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

## Lua Helper

```space-lua
excalidraw = excalidraw or {}
function excalidraw.render(url, height, theme)
  height = height or 500
  local lines = {
    "url:" .. url,
    "height:" .. height .. "px"
  }
  if theme then
    table.insert(lines, "theme:" .. theme)
  end
  local body = table.concat(lines, "\n")

  local excali = codeWidget.render('excalidraw', body, '')
  return widget.sandbox {
    html     = excali.html,
    markdown = "Not supported",
    script   = excali.script,
  }
end
```

