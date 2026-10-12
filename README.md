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
| T | show or hide the clock and the date |

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

## Skills

Every runner has eight skills in three groups, each ranked 1 to 5:

| Group | Skills |
| --- | --- |
| Technical | Recon, Systems, Forensics, Hardening |
| Social | Rapport, Phishing Awareness |
| Field | Hardware, Observation |

A new profile gets 18 points, rolled when you jump in: every skill starts at 1, nothing starts above 4, and every roll has at least two strengths (3 or more) and two weaknesses (1). The roll is hidden. A skill shows as untested until a quest checks it or a class trains it. Saves from before skills existed get their roll when continued.

**Skill checks.** Some quests test a skill before they start: Three Twelve needs Rapport 2 (Julien has to trust you), The Hum needs Systems 2, Ghost Host needs Recon 2, The Exchange needs Hardware 2, several gigs and side stories need a 2, and the Meridian Works quests need a 3. Falling short leaves the quest waiting and says what is missing.

**Training.** Rosa's training board, on the east wall of the Solarpunk Lab (Building H), lists two classes per skill. Each class is a short practical (a command on lab-h, a conversation, or something to examine) plus a three-question drill, and raises its skill by one. Part II opens when part I is done. Drills can also be taken from the Skills tab in the missions panel (P). The practice files live in `training/` on lab-h.

A few side stories and gigs also pay a skill rank on top of their credits: Baseline (Forensics), Dotfiles (Systems), Customs Fee (Phishing Awareness), Rack Three (Rapport), Checksums (Hardening) and Clean Room (Observation).

## People

Rosa, Julien and Nadia speak their lines through the browser's own speech voices (a Voices switch in settings turns this off; without voices the old radio blips play). Every passer-by has a name and a mood: the kind ones give directions and gossip about Dara, the rude ones tell you to keep walking, the busy ones are late for Caduceus. Anyone you nearly ran over will mention it.

The crowd is drawn from 22 Microsoft Rocketbox characters (MIT), put on the game's own skeleton so they walk, jog, idle and talk with the same clips as everyone else. Who they are decides where they spend the day: office staff and a security guard outside Caduceus (F), work crews outside Meridian Utilities and the Exchange (D, X), a gardener by the Solarpunk Lab (H), and everyone else anywhere on the grid. People with a workplace drift back toward it when they wander off. Nadia behind the Byte Mart counter and Ines by the fountain have their own bodies too. `tools/rocketbox` holds the converter and the full cast list.

## Time, date and the 03:12 event

Meridian Row runs on its own calendar. A new profile starts on Saturday 10 October 2026 at 19:00, six days after Dara was last seen. Two game minutes pass every real second, so a day lasts twelve minutes, and the clock stops while a terminal, a conversation or a menu is open. T shows a pager-style clock with the time, the date and a 24-hour strip. The date is saved with the profile.

- **Day and night.** Outdoors the sun rises at 06:00 in the east and sets at 18:00 in the west; sky, fog and shadows follow it. By day the street lamps, their light pools, lit office windows and bloom fade out; at dusk they come back.
- **03:12 every night.** The cron job on Caduceus runs: the street lights stutter, the pager reports the ops login, and the logs grow by one night (`auth.log` and `styx-sync.log` on Caduceus, `styxd.log` on the Building D box, `cdr.csv` at the exchange). The gateway's hit counter goes up by one.
- **The caller's deadline.** Answering the first call in Act 2 starts a countdown to the next 03:12 (at least six game hours away), shown in red on the clock. Miss it before finishing The Exchange and Building H goes dark, windows, sign and lab lights; finishing The Exchange brings it back.
- **In the terminals** `date` and the new `cal` command use the game's date; journal and notebook entries carry game-date stamps.

## Meridian Police

The station is on the block east of Building X, facing the Row (P on the minimap), with blue POLICE lamps, bollards and two cruisers on the forecourt. The notice on its door lists Dara's missing person report (MP-2610-044) and explains how to report a cyber incident properly; reading it adds a notebook entry.

Six officers patrol the sidewalks, three of them on Meridian Row. The three men are Rocketbox officers: one in a peaked-cap uniform and two cybercrime detectives in POLICE vests. The three women wear a uniform built on the game's own rigs and fixed to their bones, so it follows every animation: navy shirt and trousers, black boots, a peaked cap with a chequered band and gold badge, a hi-vis vest with reflective bands and POLICE on the back, a duty belt and a radio. Talk to them with E for cyber-safety advice (phishing, responsible disclosure, logs as evidence) and remarks that follow the story.

Three white cruisers patrol the grid with flashing red and blue light bars and a POLICE roof plate readable from above. Take one and dispatch reports it stolen; speed past an officer and you get a warning.

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
- `models/`: Ready Player Me avatars and animation clips, Rocketbox characters (`rb-*`), base64 encoded glTF
- `tools/rocketbox/`: the converter that puts Rocketbox characters on the game's skeleton

## Credits

Music (CC0, via the Free Music Archive through the SoundSafari CC0 corpus): HoliznaCC0 (Night Driving, Retro Synths, Cyber Anxiety, City Lights, Retro Soundtrack), John Bartmann (Profound Mystery, Ominous Night), Komiku (Action Investigation), SUPERARE (Neon).

Ambience: hmoosher (machine-room drone, CC0, freesound.org). The street bed is synthesised.

Effects: Kenney.nl Interface Sounds and UI Audio (CC0). Horns and impacts from the Godot demo projects (MIT). Footsteps, the car engine and the tyre skid are Kenney recordings from the Godot Starter Kit FPS and Starter Kit Racing (MIT, `audio/sfx/LICENSE-kenney-starter-kits.txt`); the engine is retuned live to a five-speed gearbox, with synthesised tyre roar and wind. Interface sounds and the fallbacks are synthesised with Web Audio.

Textures: building facades and roofs, and the car skins, are drawn in code at startup (no image files); oak, brick and carbon maps from the three.js examples (MIT); moss from "dark grass" on OpenGameArt (CC-BY 3.0); studio environment map from the Babylon.js Assets repository (CC-BY 4.0).

Characters: Ready Player Me avatars and animation clips. Passers-by, officers, Nadia and Ines from the Microsoft Rocketbox library (MIT, `models/LICENSE-microsoft-rocketbox.txt`).
