# figma-sync

Keeps the FigJam world-layout board (https://www.figma.com/board/KtENECHclGSx4xZaRcXhSL) in step with `index.html` without ever reading the board.

```
npm i                      # once: jsdom + babylonjs (same version as index.html)
node sync.js               # dump the world, diff against manifest.json, write out/patch-N.js
node sync.js --mark-synced # after the patches were sent: record the new state
```

## Pipeline

- `dump.js` runs `index.html` in Babylon's NullEngine and writes `out/world.json` (meshes, lights, interactables, door spawns, building footprints).
- `gen.js` turns that into drawing data plus the World Layout Guide checks (`out/specs.json`).
- `board.js` lays the board out as sections (`out/board.json`) and cuts every plan into 160 px tiles.
- `render.js` is the Figma-side drawing code, split into `//#fn NAME deps` blocks.
- `sync.js` hashes every piece, compares with `manifest.json`, and writes the smallest patches that bring the board up to date.
- `meta.json` holds what the code cannot tell us: section titles, colours, board slots, quest notes. A new interior zone shows up as a `WARN` until it has an entry.

## How the diff stays small

Each section is stored as separate hashed pieces:

| piece | what it holds | key |
|---|---|---|
| shell | header, plan frames, grid, roads | `Interior X\|shell` |
| tile | the shapes inside one 160 × 160 px square of a plan | `Interior X\|0\|tile:3,2` |
| overlay | pins, lights, labels, spawn, axis ticks for one plan | `Interior X\|0\|overlay` |
| panel | the interactables table and checks text | `Interior X\|panel` |

- A shape that crosses a tile edge is stored in every tile it touches, so moving it changes those tiles and nothing else.
- If a shell changes, or `render.js` changes, the whole section is redrawn. Otherwise only the changed tiles, overlays and panels are sent.
- Tiles that disappear are dropped, and sections that no longer exist are removed.
- Each patch includes only the `render.js` blocks its operations need, and patches are capped at about 42k characters.
- Replacing a tile keeps its layer position, so the overlay stays on top.

A typical one-object edit sends one or two tiles plus the panel text, a few kB, instead of the whole building.

The `netrunner-total-update` skill drives this.
