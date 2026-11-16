# Overgrind Studios

Website of Overgrind Studios, a small Roblox game studio.

**Live:** https://antony-bdc.github.io/overgrind-studios/

- Roblox community: https://www.roblox.com/communities/1068137339/Overgrind-Studios
- TikTok: https://www.tiktok.com/@overgrindstudios

## How it's built

- `src/games.py`: all game texts (English and German). Edit a game here.
- `src/index.tpl.html`: page layout and styles.
- `app.js`: animations (GSAP + ScrollTrigger + SplitText, Lenis smooth scroll) and the EN/DE switch.
- `assets/games/<game>.jpg`: key art per game. Replace a file to change the image.
- `vendor/`: self-hosted libraries, so the site has no external dependencies.

After editing `src/`, run `python3 src/build.py` to regenerate `index.html`.
