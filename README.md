# Overgrind Studios

Website of Overgrind Studios, a small Roblox game studio.

**Live:** https://overgrindstudio.click/

- Roblox community: https://www.roblox.com/communities/1068137339/Overgrind-Studios
- TikTok: https://www.tiktok.com/@overgrindstudios

## How it's built

- `src/games.py`: all game texts (English and German). Edit a game here.
- `src/index.tpl.html`: page layout and styles.
- `src/game.tpl.html`: the page every game gets under `games/<game>/`.
- `game.js` / `transition.js`: game page motion and the page transitions.
- `app.js`: animations (GSAP + ScrollTrigger + SplitText, Lenis smooth scroll) and the EN/DE switch.
- `assets/games/<game>.jpg`: key art per game. Replace a file, then run `python3 src/images.py` to rebuild the WebP versions.
- `bricks.js`: the 3D brick field in the hero (Three.js).
- `assets/crew/`: Roblox avatars for the crew cards.
- `vendor/`: self-hosted libraries, so the site has no external dependencies.

After editing `src/`, run `python3 src/build.py` to regenerate `index.html`.
