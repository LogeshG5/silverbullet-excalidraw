# SilverBullet plug for Excalidraw diagrams

This plug adds [Excalidraw](https://excalidraw.com/) support to Silverbullet.

## Installation

The plug is installed like any other plug using SpaceLua. Just add `ghr:LogeshG5/silverbullet-excalidraw` to the plugs array in your CONFIG page.

```space-lua
config.set {
  plugs = {
  "ghr:LogeshG5/silverbullet-excalidraw"
  }
}
```

Run `Plugs: Update` command and off you go!

## Usage

https://github.com/user-attachments/assets/1402f02d-b85b-4cb9-866f-16ab7b478f9c

### Create New Diagram

Run `Excalidraw: Create diagram` command and type in the name of the diagram. (or) Use `/excalidraw` slash command. 

A code widget will be inserted. Move away from the code widget and you will see the diagram. 

If you wish to create SVG/PNG files, Run `Excalidraw: Create SVG/PNG diagram`. 

### Use Document Picker

Run `Navigate: Document Picker` and select .excalidraw files to open the editor.

### Edit SVG/PNG Diagram

Run `Excalidraw: Edit diagram`.

If multiple diagrams are present in a page, you will be prompted to choose one.

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
