# Netrunner: Zero Day (overhead cut)

A browser game built with Babylon.js. Nine city blocks of Meridian Row seen from above (or from a chase camera), cars to take, pedestrians to dodge, and a hacking investigation told through four buildings and five terminal-driven quests that teach real shell and networking commands.

## Play

Open `index.html` through any static web server (the page loads its audio, textures and character rigs from the folders beside it, so it needs `http://`, not `file://`):

```
python3 -m http.server 8000
```

then visit http://localhost:8000/. Babylon.js itself loads from jsDelivr.

## Controls

| Key | Action |
| --- | --- |
| W / S | run forward and back (walk indoors) |
| A / D | turn |
| Shift | stroll outdoors, run indoors |
| E or Enter | interact, enter or leave a car |
| W / S, A / D, Space | gas and brake, steer, handbrake (in a car) |
| H | horn |
| C | overhead or chase camera |
| mouse wheel | zoom |
| P | missions and journal |
| L | settings and audio credits |
| M / N | sound and music on or off |

## Quests

1. Terminal Echoes: Dara's workstation in Building A (ls, cd, cat, pwd)
2. Knock Knock: Rosa's networking kit (dig, ping, nmap, traceroute, curl)
3. Three Twelve: the Caduceus auth log in Building F (grep, wc, pipes, cron)
4. The Hum: the service console in Building D (ps, ss, find)
5. Ghost Host: the host with no name (arp, nmap, ssh)

Every objective shows a "look around" hint, and each room holds its own cheat sheet or handout.

## Layout

- `index.html`: the whole game (markup, styles, core data and shell, scene, sound, UI)
- `audio/`: music, ambience and effects
- `tex/`: photographic textures and PBR maps
- `env/studio.env.txt`: prefiltered environment map for PBR materials, base64 encoded
- `models/`: Ready Player Me avatars and animation clips, base64 encoded glTF

## Credits

Music (CC0, via the Free Music Archive through the SoundSafari CC0 corpus): HoliznaCC0 (Night Driving, Retro Synths, Cyber Anxiety, City Lights, Retro Soundtrack), John Bartmann (Profound Mystery, Ominous Night), Komiku (Action Investigation), SUPERARE (Neon).

Ambience: hmoosher (machine-room drone, CC0, freesound.org). The street bed is synthesised.

Effects: Kenney.nl Interface Sounds and UI Audio (CC0). Horns and impacts from the Godot demo projects (MIT). Footsteps, engine and interface sounds are synthesised with Web Audio.

Textures: oak, brick and carbon maps from the three.js examples (MIT); moss from "dark grass" on OpenGameArt (CC-BY 3.0); studio environment map from the Babylon.js Assets repository (CC-BY 4.0).

Characters: Ready Player Me avatars and animation clips.
