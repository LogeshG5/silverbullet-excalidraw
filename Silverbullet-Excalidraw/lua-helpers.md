# Lua Helper

## Render Excalidraw Widget

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

## Excalidraw Picker

```space-lua
view.define {
  name = "excalidraw-files",
  title = "Open",
  command = "Navigate: Excalidraw Picker",
  dock = "modal",
  supportedDocks = { "modal", "lhs", "rhs", "bhs"},
  source = function()
    return query [[
      from t = index.documents()
      where t.extension == "excalidraw"
    ]]
  end,
  presentation = {
    mode = "list",
    row = {
      primary = "name",
      description = "page"
    }
  },
  onSelect = function(task)
    editor.navigate(task.ref)
  end,
}
```

