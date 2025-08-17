(() => {
  const BOARD_SIZE = 50; // tiles
  const BOOST_TILES = 6; // number of boost tiles
  const SKIP_TILES = 5; // number of skip tiles
  const MAX_MOVE_PER_TURN = 12; // 2 dice
  const CAR_TRANSITION_MS = 450; // keep in sync with CSS transform transition (~420ms)
  const TILE_SIZE = 72; // px, grid tile size

  /** @typedef {{name:string, pos:number, skip:boolean, isComputer:boolean, color:string, carEl:HTMLElement}} Player */

  const el = {
    board: document.getElementById('board'),
    tiles: document.getElementById('tiles'),
    trackPath: document.getElementById('trackPath'),
    turn: document.getElementById('turnDisplay'),
    die1: document.getElementById('die1'),
    die2: document.getElementById('die2'),
    rollBtn: document.getElementById('rollBtn'),
    qArea: document.getElementById('questionArea'),
    qText: document.getElementById('questionText'),
    ansInput: document.getElementById('answerInput'),
    ansBtn: document.getElementById('answerBtn'),
    startBtn: document.getElementById('startBtn'),
    resetBtn: document.getElementById('resetBtn'),
    mode: document.getElementById('mode'),
    p1name: document.getElementById('p1name'),
    p2name: document.getElementById('p2name'),
    p1car: document.getElementById('p1car'),
    p2car: document.getElementById('p2car'),
    log: document.getElementById('log'),
    car1: document.getElementById('car1'),
    car2: document.getElementById('car2'),
    winnerDialog: document.getElementById('winnerDialog'),
    winnerText: document.getElementById('winnerText'),
    closeDialogBtn: document.getElementById('closeDialogBtn'),
    winOverlay: document.getElementById('winOverlay'),
    winOverlayText: document.getElementById('winOverlayText'),
    winOverlayClose: document.getElementById('winOverlayClose'),
  };

  /** @type {Array<'normal'|'boost'|'skip'>} */
  let tiles = new Array(BOARD_SIZE).fill('normal');
  /** @type {Player[]} */
  let players = [];
  let turnIndex = 0;
  let rolledSum = null; // holds the sum for the math question gate
  let gameStarted = false;
  let finished = false;
  let winAnnounced = false;

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function log(message) {
    const entry = document.createElement('div');
    entry.className = 'log__entry';
    entry.textContent = message;
    el.log.prepend(entry);
  }

  function setUIEnabled(isEnabled) {
    el.rollBtn.disabled = !isEnabled;
    el.ansInput.disabled = !isEnabled;
    el.ansBtn.disabled = !isEnabled;
    el.resetBtn.disabled = !gameStarted;
  }

  function resetBoard() {
    if (!el.tiles) {
      el.tiles = document.getElementById('tiles');
    }
    // ignore path-based track
    el.tiles.innerHTML = '';
    tiles = new Array(BOARD_SIZE).fill('normal');

    // randomly mark boosts and skips; avoid start(0) and last tile (BOARD_SIZE-1)
    const used = new Set([0, BOARD_SIZE - 1]);
    for (let i = 0; i < BOOST_TILES; i++) {
      let idx;
      do { idx = randInt(1, BOARD_SIZE - 2); } while (used.has(idx));
      used.add(idx);
      tiles[idx] = 'boost';
    }
    for (let i = 0; i < SKIP_TILES; i++) {
      let idx;
      do { idx = randInt(1, BOARD_SIZE - 2); } while (used.has(idx));
      used.add(idx);
      tiles[idx] = 'skip';
    }

    for (let i = 0; i < BOARD_SIZE; i++) {
      const tileEl = document.createElement('div');
      tileEl.className = `tile ${tiles[i] !== 'normal' ? tiles[i] : ''}`.trim();
      tileEl.dataset.index = String(i + 1);
      tileEl.setAttribute('aria-label', `Tile ${i + 1}${tiles[i] !== 'normal' ? ' ' + tiles[i] : ''}`);
      tileEl.title = tiles[i] === 'boost' ? 'Boost: advance forward' : tiles[i] === 'skip' ? 'Skip: miss next turn' : '';
      // grid auto-placement handles position
      if (tiles[i] === 'boost') {
        const bonus = randInt(2, 6);
        tileEl.dataset.boost = String(bonus);
        const label = document.createElement('div');
        label.className = 'tile__label';
        label.textContent = `Boost +${bonus}`;
        tileEl.appendChild(label);
      } else if (tiles[i] === 'skip') {
        const label = document.createElement('div');
        label.className = 'tile__label';
        label.textContent = 'Miss Turn';
        tileEl.appendChild(label);
      }
      el.tiles.appendChild(tileEl);
    }
    el.board.style.minHeight = '';
  }

  function applyCarSkin(el, color) {
    // remove SVG inside car and replace with image
    el.innerHTML = '';
    const img = document.createElement('img');
    const map = {
      blue: 'cars/blue_car.png',
      white: 'cars/white_car.png',
      green: 'cars/green_lotus.png',
      orange: 'cars/Orange.png',
      lightning: 'cars/Lightning.png',
    };
    img.src = map[color] || map.blue;
    img.alt = `${color} car`;
    el.appendChild(img);
  }

  function initPlayers() {
    const mode = el.mode.value;
    const p1Name = el.p1name.value.trim() || 'Player 1';
    let p2Name = el.p2name.value.trim() || 'Player 2';
    const isComputer = mode === 'pvc';
    if (isComputer) p2Name = 'Computer';
    // car color selection with uniqueness
    const chosen1 = (el.p1car && el.p1car.value) || 'blue';
    let chosen2 = (el.p2car && el.p2car.value) || 'white';
    if (chosen1 === chosen2) {
      const order = ['blue', 'white', 'green', 'orange', 'lightning'];
      chosen2 = order.find(c => c !== chosen1) || 'white';
      if (el.p2car) el.p2car.value = chosen2;
    }

    players = [
      { name: p1Name, pos: 0, skip: false, isComputer: false, color: chosen1, carEl: el.car1 },
      { name: p2Name, pos: 0, skip: false, isComputer, color: chosen2, carEl: el.car2 },
    ];
    turnIndex = 0;
    // apply skins
    applyCarSkin(el.car1, players[0].color);
    applyCarSkin(el.car2, players[1].color);
    updateCars();
  }

  function updateTurnText() {
    const p = players[turnIndex];
    if (finished) {
      el.turn.textContent = 'Game Over';
      return;
    }
    el.turn.textContent = `${p.name}'s turn ${p.skip ? '(skipped)' : ''}`.trim();
  }

  function updateCars() {
    if (!el.tiles || !el.tiles.children.length) return;
    const boardRect = el.board.getBoundingClientRect();
    players.forEach((p, idx) => {
      const targetTile = el.tiles.children[p.pos];
      if (!targetTile) return;
      const tileRect = targetTile.getBoundingClientRect();
      const carWidth = p.carEl.offsetWidth || 120;
      const carHeight = p.carEl.offsetHeight || 64;
      const centerX = tileRect.left - boardRect.left + tileRect.width / 2;
      const centerY = tileRect.top - boardRect.top + tileRect.height / 2;
      const laneOffsetY = idx === 0 ? -10 : 10; // slight separation within same tile
      const x = centerX - carWidth / 2;
      const y = centerY - carHeight / 2 + laneOffsetY;
      p.carEl.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  function setQuestion(sum) {
    rolledSum = sum;
    el.qText.textContent = `What is ${lastRoll[0]} + ${lastRoll[1]}?`;
    el.ansInput.value = '';
    el.ansInput.focus();
  }

  /** @type {[number, number]} */
  let lastRoll = [0, 0];
  function rollDice() {
    const r1 = randInt(1, 6);
    const r2 = randInt(1, 6);
    lastRoll = [r1, r2];
    el.die1.textContent = String(r1);
    el.die2.textContent = String(r2);
    const sum = r1 + r2;
    setQuestion(sum);
  }

  function applyTileEffectsChain(player) {
    // Apply chained effects: multiple boosts, or a skip.
    while (true) {
      if (player.pos >= BOARD_SIZE - 1) return; // finished
      const tileType = tiles[player.pos];
      if (tileType === 'boost') {
        const bonus = randInt(2, 6);
        player.pos = Math.min(BOARD_SIZE - 1, player.pos + bonus);
        log(`${player.name} hit a Boost! +${bonus} to ${player.pos + 1}`);
        updateCars();
        if (player.pos >= BOARD_SIZE - 1) return;
        // Continue to check next landing tile
        continue;
      }
      if (tileType === 'skip') {
        player.skip = true;
        log(`${player.name} hit a Skip tile and will miss next turn!`);
        return;
      }
      return; // normal tile
    }
  }

  function moveActivePlayer(spaces) {
    const p = players[turnIndex];
    const from = p.pos;
    const to = Math.min(BOARD_SIZE - 1, from + spaces);
    p.pos = to;
    log(`${p.name} moves ${spaces} ${spaces === 1 ? 'space' : 'spaces'} to ${to + 1}`);
    updateCars();
    applyTileEffectsChain(p);

    // Win check – wait for car animation to complete before showing banner
    if (p.pos >= BOARD_SIZE - 1) {
      setTimeout(() => { if (!finished) finishGame(p); }, CAR_TRANSITION_MS);
    }
  }

  function finishGame(winner) {
    finished = true;
    el.rollBtn.disabled = true;
    el.ansInput.disabled = true;
    el.ansBtn.disabled = true;
    // Keep the turn banner neutral to avoid duplicate win messages
    el.turn.textContent = 'Game Over';
    el.winnerText.textContent = `${winner.name} wins!`;
    const dlg = el.winnerDialog;
    if (!dlg) {
      if (el.winOverlay && el.winOverlayText) {
        el.winOverlayText.textContent = `${winner.name} wins!`;
        el.winOverlay.hidden = false;
      }
    } else {
      let shown = false;
      if (typeof dlg.showModal === 'function') {
        try { dlg.showModal(); shown = true; } catch (_) {}
      }
      if (!shown && typeof dlg.show === 'function') {
        try { dlg.show(); shown = true; } catch (_) {}
      }
      if (!shown) {
        try { dlg.setAttribute('open', ''); shown = true; } catch (_) {}
      }
      if (!shown && el.winOverlay && el.winOverlayText) {
        el.winOverlayText.textContent = `${winner.name} wins!`;
        el.winOverlay.hidden = false;
      }
    }
    // Remove extra alert to avoid double notification; rely on dialog/overlay only
    winAnnounced = true;
  }

  function endTurnAndAdvance() {
    if (finished) return;
    turnIndex = (turnIndex + 1) % players.length;
    const p = players[turnIndex];
    updateTurnText();
    if (p.skip) {
      log(`${p.name}'s turn is skipped!`);
      p.skip = false; // consume skip
      // advance to next player
      turnIndex = (turnIndex + 1) % players.length;
      updateTurnText();
    }
    if (players[turnIndex].isComputer) {
      // ensure rolling state is reset before computer plays
      rolledSum = null;
      computerPlay();
    } else {
      // Next human: allow roll, require answer after rolling
      rolledSum = null;
      el.rollBtn.disabled = false;
      el.ansInput.disabled = true;
      el.ansBtn.disabled = true;
    }
  }

  function handleAnswerSubmit() {
    const p = players[turnIndex];
    const userAns = Number(el.ansInput.value);
    if (!Number.isFinite(userAns)) return;
    if (rolledSum === null) return;
    // Prevent multiple submissions
    el.ansInput.disabled = true;
    el.ansBtn.disabled = true;
    if (userAns === rolledSum) {
      log(`${p.name} answered correctly (+${rolledSum}).`);
      moveActivePlayer(rolledSum);
    } else {
      log(`${p.name} answered ${userAns} (wrong). No movement.`);
    }
    rolledSum = null;
    setTimeout(() => endTurnAndAdvance(), 550);
  }

  function computerPlay() {
    // disable human inputs
    el.rollBtn.disabled = true;
    el.ansInput.disabled = true;
    el.ansBtn.disabled = true;
    const p = players[turnIndex];
    log(`${p.name} is rolling...`);
    rollDice();
    const [a, b] = lastRoll;
    const correct = a + b;
    // simulate thinking delay
    setTimeout(() => {
      log(`${p.name} answers ${correct}.`);
      moveActivePlayer(correct);
      // clear rolled sum so the next human turn can roll again
      rolledSum = null;
      setTimeout(() => endTurnAndAdvance(), 550);
    }, 700);
  }

  function startGame() {
    gameStarted = true;
    finished = false;
    winAnnounced = false;
    resetBoard();
    initPlayers();
    el.rollBtn.disabled = players[turnIndex].isComputer;
    el.ansInput.disabled = true;
    el.ansBtn.disabled = true;
    el.resetBtn.disabled = false;
    updateTurnText();
    updateCars();

    if (players[turnIndex].isComputer) {
      computerPlay();
    }
  }

  function resetGame() {
    gameStarted = false;
    finished = false;
    winAnnounced = false;
    rolledSum = null;
    players.forEach(p => { p.pos = 0; p.skip = false; });
    updateCars();
    el.turn.textContent = 'Press Start';
    el.die1.textContent = '';
    el.die2.textContent = '';
    el.qText.textContent = 'Sum?';
    el.ansInput.value = '';
    el.rollBtn.disabled = true;
    el.ansInput.disabled = true;
    el.ansBtn.disabled = true;
    el.log.innerHTML = '';
    // ensure winner dialog closed
    const dlg = el.winnerDialog;
    if (dlg) {
      try { dlg.close(); } catch (_) {}
      try { dlg.removeAttribute('open'); } catch (_) {}
    }
  }

  // Event listeners
  el.rollBtn.addEventListener('click', () => {
    if (!gameStarted || finished) return;
    if (rolledSum !== null) return; // already rolled this turn
    rollDice();
    el.rollBtn.disabled = true;
    el.ansInput.disabled = false;
    el.ansBtn.disabled = false;
  });
  el.ansBtn.addEventListener('click', handleAnswerSubmit);
  el.ansInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAnswerSubmit();
  });
  el.startBtn.addEventListener('click', startGame);
  el.resetBtn.addEventListener('click', resetGame);
  // Enforce unique car color selection in UI
  function enforceUniqueCars() {
    if (!el.p1car || !el.p2car) return;
    const c1 = el.p1car.value;
    const c2 = el.p2car.value;
    if (c1 === c2) {
      const order = ['blue', 'white', 'green', 'orange', 'lightning'];
      const next = order.find(c => c !== c1);
      el.p2car.value = next || 'white';
    }
  }
  if (el.p1car && el.p2car) {
    el.p1car.addEventListener('change', enforceUniqueCars);
    el.p2car.addEventListener('change', enforceUniqueCars);
  }
  el.mode.addEventListener('change', () => {
    // update placeholder for p2 when pvc
    if (el.mode.value === 'pvc') {
      el.p2name.value = 'Computer';
      el.p2name.disabled = true;
    } else {
      el.p2name.disabled = false;
      if (el.p2name.value === 'Computer') el.p2name.value = 'Player 2';
    }
  });
  el.closeDialogBtn.addEventListener('click', () => {
    try { el.winnerDialog.close(); } catch (_) { /* ignore */ }
  });
  if (el.winOverlayClose) {
    el.winOverlayClose.addEventListener('click', () => {
      if (el.winOverlay) el.winOverlay.hidden = true;
    });
  }

  // Resize handling to keep car positions accurate
  window.addEventListener('resize', () => updateCars());

  // Initialize UI defaults
  setUIEnabled(false);
  resetBoard();
  initPlayers();
  updateTurnText();

  // Populate track select and react to changes
  // No manual selector; track is randomized on each reset
})();


