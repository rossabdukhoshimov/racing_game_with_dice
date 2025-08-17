# Racing Board Game with Dice for Families

A lightweight browser game: roll two dice, add them up, and race to the finish. Supports Player vs Player (PvP) and Player vs Computer (PvC). Built with plain HTML, CSS, and JavaScript — no build tools required. This game is especially useful if you have elementary school kids and want them practice their basic math skills.

## Preview

- Board: 10×5 grid of tiles (1 → 50)
- Special tiles: Boost (+2…+6), Skip Turn (miss next turn)
- Animated cars with PNG skins (Blue, White, Green, Orange, Lightning).

## Play locally

1. Clone the repo
2. Open `index.html` in your browser
   - Or serve locally (optional):
     - Python: `python3 -m http.server 8000`
     - Node: `npx serve -l 8000`
3. Play! No build step needed

## Rules

- On your turn, click “Roll Dice” to roll 2 dice
- Solve the sum shown (e.g., 2 + 4) and click “Submit”
  - Correct answer → your car advances by the sum
  - Wrong answer → no movement
- Landing effects chain immediately:
  - Boost: instantly move forward by the tile’s bonus (+2…+6). If you land on another Boost, it chains again
  - Skip Turn: you’ll miss your next turn (consumed once)
- First player to tile 50 wins
- In PvC mode, the computer rolls and answers automatically

## Controls

- Roll Dice: enabled once at the start of your turn
- Submit: press Enter in the answer field or click “Submit”
- Start Game: initializes the board and cars
- Reset: clears the board and returns to idle state

## Car selection

Use the “Player 1 Car” and “Player 2 Car” dropdowns. Both players cannot select the same color; the second selection auto-adjusts to keep them unique. Add PNGs under `cars/` and extend the map in `script.js` if you want more skins.

## Project structure

```
index.html      # UI layout
styles.css      # Styling (dark theme, grid board, car & dialog styles)
script.js       # Game logic and animations
cars/           # PNG car sprites used in the game
```

## Notable implementation details

- Grid board: CSS Grid (`#tiles`) – 10 columns, fixed row height (72px)
- Cars: absolutely positioned and animated to the center of the current tile
- Single roll per turn: after rolling, “Roll Dice” disables until the next turn
- Win UX: the car finishes its move first, then the win dialog appears

### Key constants (tweak in `script.js`)

- `BOARD_SIZE`: number of tiles (default 50)
- `BOOST_TILES`: count of Boost tiles (default 6)
- `SKIP_TILES`: count of Skip tiles (default 5)
- `TILE_SIZE`: grid tile size in px (72, keep in sync with CSS)
- `CAR_TRANSITION_MS`: car movement animation duration (~450ms)

## Accessibility

- Clear focus behavior on buttons/inputs
- Dialog uses `<dialog>` with a fallback overlay if unsupported
- Large tap targets for dice and submit on touch devices

## Browser support

Modern evergreen browsers (Chrome, Edge, Firefox, Safari). If `<dialog>` is unavailable, a custom overlay is used.

## Contributing

Issues and PRs are welcome. Please keep the codebase dependency‑free and match the existing code style.

👨‍💻 About Me

Hi! I'm Khamroz Abdukhoshimov, a QA Automation Engineer with 10+ years of experience in building robust automation frameworks using Playwright, Selenium, Nightwatch and BDD tools.
I love leveraging AI-driven testing solutions to reduce flakiness and improve reliability. Also enjoy creating simple games for my son, who like many of his peers, loves computer games. I try to keep his learning skills sharpened with the games. This game is dedicated to my son, Alfred.
Connect with me:
[![GitHub](https://img.shields.io/badge/GitHub-Follow-black)](https://github.com/rossabdukhoshimov)

## License

MIT © 2025
