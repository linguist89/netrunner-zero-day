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
| E or Enter | interact, talk to people, enter or leave a car |
| W / S, A / D, Space | gas and brake, steer, handbrake (in a car) |
| H | horn |
| C | overhead or chase camera |
| mouse wheel | zoom |
| P | missions and journal |
| L | settings and audio credits |
| M / N | sound and music on or off |
| B | drink an OVERCLOCK (from Byte Mart) |
| K | whistle your own car back to Byte Mart |
| F | the burner phone (Act 2) |

## Quests

1. Terminal Echoes: Dara's workstation in Building A (ls, cd, cat, pwd)
2. Knock Knock: Rosa's networking kit (dig, ping, nmap, traceroute, curl)
3. Three Twelve: the Caduceus auth log in Building F (grep, wc, pipes, cron)
4. The Hum: the service console in Building D (ps, ss, find)
5. Ghost Host: the host with no name (arp, nmap, ssh)

Act 2 opens once the ghost host is done:

6. Burner: Rosa sends you to a courier by the park fountain, who hands over Dara's prepaid phone (F opens it)
7. Dial Tone: a threatening call at 03:12 and a photo of a keypad door; trace the VoIP gateway (traceroute, nmap, curl on a non-standard port)
8. The Exchange: Building X, the Meridian Exchange, with a keypad door and a lineman console running the phone system (sip.conf, call records as CSV, grep through a dial plan, mail)

Every objective shows a "look around" hint, and each room holds its own cheat sheet or handout.

## Cybersecurity intake

A new profile starts with a ten-question multiple-choice intake (contributed by hugoClews in PR #2). The score sets a briefing level, Beginner, Foundation, Intermediate or Advanced, which shapes the hints on the mission card and in the journal. It is saved with the profile; older saves take the intake once when continued.

## Character creator

Before dropping in (and whenever you continue) the runner is styled Morrowind-style with arrows. A new profile first picks a body, man or woman; that choice is fixed for the profile. Then: five hair styles, four facial-hair options, ten hair colours, seven skin tones, ten jacket and eight trouser colours, plus Random. The woman has no facial-hair row; hair and beards borrowed from the other rigs are carried by the head bone, so they follow every animation. The look is saved with the profile.

## People

Rosa, Julien and Nadia speak their lines through the browser's own speech voices (a Voices switch in settings turns this off; without voices the old radio blips play). Every passer-by has a name and a mood: the kind ones give directions and gossip about Dara, the rude ones tell you to keep walking, the busy ones are late for Caduceus. Anyone you nearly ran over will mention it.

## Byte Mart

The shop under the orange sign, west of Building A on the north side of Meridian Row. Nadia sells gear that changes how the street and the terminals behave:

| Item | Credits | What it does |
| --- | --- | --- |
| OVERCLOCK energy drink | 15 | B drinks one: 90 seconds of faster running and a quicker car |
| USB Rubber Ducky | 110 | `duck` on any terminal types the command the current objective needs |
| Wi-Fi Pineapple | 90 | `scan` sweeps the STYX network: every host, name, port and service |
| Proxmark RFID cloner | 120 | the card readers on Buildings F and D accept the clone |
| STYX scanner app | 60 | credit chips show on the minimap |
| Car keys: Caduceus Coupe | 220 | your own coupe outside the mart; K whistles it back |
| Books (three) | 35 to 45 | add `man grep`, `man nmap`, `man ps` and friends to every terminal |

Credits come from the five quests, the four gigs on the board by the mart door (find, ls -a, grep -c, ps | wc), and the chips lying on the sidewalks, which respawn a few minutes after they are picked up.

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
