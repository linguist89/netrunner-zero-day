# figma-sync

Keeps the FigJam world-layout board (https://www.figma.com/board/KtENECHclGSx4xZaRcXhSL) in step with `index.html` without reading the board.

```
npm i                      # once: jsdom + babylonjs (same version as index.html)
node sync.js               # dump the world headlessly, list sections that changed since the last sync
node sync.js --mark-synced # after the Figma calls succeeded: record the new state in manifest.json
```

- `dump.js` runs `index.html` in Babylon's NullEngine and writes `out/world.json` (meshes, lights, interactables, door spawns, building footprints).
- `gen.js` turns that into drawing data and the World Layout Guide checks (`out/specs.json`).
- `build.js` writes one self-contained `use_figma` script per board section to `out/calls/`. Each script deletes the section with the same name first, so re-running is safe.
- `sync.js` hashes every section script and compares with `manifest.json`. Only `UPDATE` lines need sending to Figma.
- `meta.json` holds what the code cannot tell us: section titles, colours, board slots, quest notes. A new interior zone shows up as a `WARN` until it has an entry.

The `netrunner-total-update` skill drives this.
