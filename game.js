// game.js — Unit Fraction Builder (no identical denominators, unique choices, PL/EN toggle)
(() => {
  // ----- DOM -----
  const $ = (id) => document.getElementById(id);

  const choicesGrid = $('choicesGrid');
  const targetFractionEl = $('targetFraction');
  const targetBar = $('targetBar');
  const selBar1 = $('selBar1');
  const selBar2 = $('selBar2');
  const feedback = $('feedback'); // <- this is the feedback area
  const questionProgressEl = $('questionProgress');
  const scoreEl = $('score');
  const checkBtn = $('checkBtn');
  const nextBtn = $('nextBtn');
  const resetBtn = $('resetBtn');
  const summary = $('summary');
  const finalScoreEl = $('finalScore');
  const playAgainBtn = $('playAgainBtn');
  const polishToggle = $('polishToggle'); // optional: checkbox/button for Polish mode

  // ----- i18n (English / Polish) -----
  const i18n = {
    en: {
      pickTwo: 'Pick two denominators, then press Check.',
      cleared: 'Selection cleared. Pick two denominators, then press Check.',
      question: (i, t) => `Question ${i}/${t}`,
      score: (s) => `Score: ${s}`,
      correctEq: (n, a, b) => `Correct! 1/${n} = 1/${a} + 1/${b}`,
      wrongEq: (n, a, b) => `Try again! 1/${a} + 1/${b} ≠ 1/${n}`,
      explainGood: (a,b,n,sumNum,ab) =>
        `1/${a} + 1/${b} = (${a} + ${b}) / (${a} × ${b}) = ${sumNum}/${ab} = 1/${n}. Great job!`,
      explainBad: (a,b,n,sumNum,ab,nCalc,approx) =>
        `1/${a} + 1/${b} = (${a} + ${b}) / (${a} × ${b}) = ${sumNum}/${ab}${nCalc ? ` = 1/${nCalc}` : ''}. Target is 1/${n}. (≈ ${approx})`,
      youScored: (s,t) => `You scored ${s}/${t} points.`,
    },
    pl: {
      pickTwo: 'Wybierz dwa mianowniki, a potem naciśnij Sprawdź.',
      cleared: 'Wyczyszczono wybór. Wybierz dwa mianowniki, a potem naciśnij Sprawdź.',
      question: (i, t) => `Pytanie ${i}/${t}`,
      score: (s) => `Wynik: ${s}`,
      correctEq: (n, a, b) => `Brawo! 1/${n} = 1/${a} + 1/${b}`,
      wrongEq: (n, a, b) => `Spróbuj ponownie! 1/${a} + 1/${b} ≠ 1/${n}`,
      explainGood: (a,b,n,sumNum,ab) =>
        `1/${a} + 1/${b} = (${a} + ${b}) / (${a} × ${b}) = ${sumNum}/${ab} = 1/${n}. Świetna robota!`,
      explainBad: (a,b,n,sumNum,ab,nCalc,approx) =>
        `1/${a} + 1/${b} = (${a} + ${b}) / (${a} × ${b}) = ${sumNum}/${ab}${nCalc ? ` = 1/${nCalc}` : ''}. Cel to 1/${n}. (≈ ${approx})`,
      youScored: (s,t) => `Zdobyłaś/łeś ${s}/${t} punktów.`,
    }
  };
  const lang = () => (polishToggle && (polishToggle.checked || polishToggle.getAttribute('aria-pressed') === 'true')) ? 'pl' : 'en';
  const T = (...args) => {
    const k = args.shift();
    return i18n[lang()][k](...args);
  };

  // ----- Config -----
  const MIN_DEN = 2;
  const MAX_DEN = 20; // keep visuals readable
  const MIN_TARGET = 3;
  const MAX_TARGET = 20;
  const CHOICES_COUNT = 8;

  // ----- State -----
  const state = {
    questionIndex: 1,
    totalQuestions: 10,
    score: 0,
    target: 0,
    solutionPair: [0, 0],
    choices: [],
    selection: [],
    locked: false,
    setComplete: false,
  };

  // ----- Utils -----
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = (arr) => { for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; };

  // Draw a simple unit-fraction bar (first piece shaded)
  function renderFractionBar(container, denom) {
    container.innerHTML = '';
    if (!denom || denom < MIN_DEN) return;
    for (let i = 0; i < denom; i++) {
      const seg = document.createElement('div');
      seg.className = 'segment' + (i === 0 ? ' shaded' : '');
      container.appendChild(seg);
    }
    const label = document.createElement('div');
    label.className = 'fraction-label';
    label.textContent = `1/${denom}`;
    container.appendChild(label);
  }

  function setFeedback(html, cls = '') {
    if (!feedback) return;
    feedback.innerHTML = `<span class="${cls}">${html}</span>`;
  }

  function resetSelectionUI() {
    state.selection = [];
    if (selBar1) selBar1.innerHTML = '';
    if (selBar2) selBar2.innerHTML = '';
    if (checkBtn) checkBtn.disabled = true;
    document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected', 'disabled'));
  }

  // ----- Math helpers -----
  // Strict integer check for 1/a + 1/b = 1/n <=> a*b = n*(a+b) and a≠b
  const isUnitSumEqualTarget = (a, b, n) => (a !== b) && (a * b === n * (a + b));

  // Get ALL valid unordered pairs (a<b) with a,b in [MIN_DEN..MAX_DEN], a≠b
  function pairsForTarget(n) {
    const out = [];
    for (let a = n + 1; a <= MAX_DEN; a++) {
      const denom = a - n; // b = (n*a)/(a-n)
      const num = n * a;
      if (denom <= 0 || num % denom !== 0) continue;
      const b = num / denom;
      if (!Number.isInteger(b)) continue;
      if (b < MIN_DEN || b > MAX_DEN) continue;
      if (a === b) continue; // forbid identical denominators
      const x = Math.min(a, b), y = Math.max(a, b);
      if (!out.some(([p, q]) => p === x && q === y)) out.push([x, y]);
    }
    return out;
  }

  // Build a round that is guaranteed to have a≠b solution in bounds
  function makeRound() {
    for (let tries = 0; tries < 200; tries++) {
      const n = randInt(MIN_TARGET, MAX_TARGET);
      const pairs = pairsForTarget(n);
      if (pairs.length === 0) continue; // skip n that forces a=b or out-of-range
      const [a, b] = pairs[randInt(0, pairs.length - 1)];
      // Unique choices: include a,b then distractors not equal to them
      const bag = new Set([a, b]);
      while (bag.size < CHOICES_COUNT) {
        const r = randInt(MIN_DEN, MAX_DEN);
        if (r !== a && r !== b) bag.add(r);
      }
      return { n, pair: [a, b], choices: shuffle([...bag]) };
    }
    // Fail-safe: fixed solvable case in range
    return { n: 6, pair: [3, 6], choices: shuffle([3,6,4,5,7,8,9,10]) };
  }

  // ----- Rounds -----
  function startRound() {
    state.locked = false;
    if (summary) summary.hidden = true;

    const { n, pair, choices } = makeRound();
    state.target = n;
    state.solutionPair = pair;
    state.choices = choices;

    if (targetFractionEl) targetFractionEl.textContent = `1/${n}`;
    if (targetBar) renderFractionBar(targetBar, n);
    resetSelectionUI();
    if (nextBtn) nextBtn.hidden = true;

    // Render choices
    if (choicesGrid) {
      choicesGrid.innerHTML = '';
      choices.forEach(den => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = den;
        btn.setAttribute('aria-label', `Choose denominator ${den}`);
        btn.addEventListener('click', () => onChoice(btn, den));
        choicesGrid.appendChild(btn);
      });
    }

    setFeedback(T('pickTwo'));
    updateHud();
  }

  function updateHud() {
    if (questionProgressEl) questionProgressEl.textContent = T('question', state.questionIndex, state.totalQuestions);
    if (scoreEl) scoreEl.textContent = T('score', state.score);
  }

  // ----- Interaction -----
  function onChoice(btn, denom) {
    if (state.locked) return;

    // Toggle selection; enforce at most two, and a != b automatically by array logic
    const idx = state.selection.indexOf(denom);
    if (idx >= 0) {
      state.selection.splice(idx, 1);
      btn.classList.remove('selected');
    } else {
      if (state.selection.length === 2) return; // already two chosen
      state.selection.push(denom);
      btn.classList.add('selected');
    }

    // Update bars
    if (selBar1) renderFractionBar(selBar1, state.selection[0] || 0);
    if (selBar2) renderFractionBar(selBar2, state.selection[1] || 0);

    if (checkBtn) checkBtn.disabled = (state.selection.length !== 2);
  }

  function explainSum(a, b, n) {
    const ab = a * b;
    const sumNum = a + b; // (a+b)/ab
    const nCalc = (ab % sumNum === 0) ? (ab / sumNum) : null;
    if (nCalc === n && a !== b) {
      return T('explainGood', a, b, n, sumNum, ab);
    }
    const approx = ((1 / a) + (1 / b)).toFixed(3);
    return T('explainBad', a, b, n, sumNum, ab, nCalc, approx);
  }

  function checkAnswer() {
    if (state.selection.length !== 2) return;
    const [a, b] = state.selection;
    const correct = isUnitSumEqualTarget(a, b, state.target);

    if (correct) {
      setFeedback(`${T('correctEq', state.target, a, b)}<br>${explainSum(a,b,state.target)}`, 'ok');
      state.score += 1;
    } else {
      setFeedback(`${T('wrongEq', state.target, a, b)}<br>${explainSum(a,b,state.target)}`, 'warn');
    }

    state.locked = true;
    if (nextBtn) nextBtn.hidden = false;
    if (checkBtn) checkBtn.disabled = true;

    // freeze the grid
    document.querySelectorAll('.choice-btn').forEach(btn => {
      const den = parseInt(btn.textContent, 10);
      if (den === a || den === b) btn.classList.add('selected');
      btn.classList.add('disabled');
    });
    updateHud();
  }
function startRound() {
  state.locked = false;
  if (summary) summary.hidden = true;
  setFeedback('Pick two denominators, then press Check.');

  const { n, pair, choices } = makeRound();
  state.target = n;
  state.solutionPair = pair;
  state.choices = choices;

  targetFractionEl.textContent = `1/${n}`;
  renderFractionBar(targetBar, n);
  resetSelectionUI();
  nextBtn.hidden = true;

  // render choices...
  choicesGrid.innerHTML = '';
  choices.forEach(den => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = den;
    btn.setAttribute('aria-label', `Choose denominator ${den}`);
    btn.addEventListener('click', () => onChoice(btn, den));
    choicesGrid.appendChild(btn);
  });

  updateHud();
}

  function nextRound() {
  if (state.setComplete) return;
  if (state.questionIndex < state.totalQuestions) {
    state.questionIndex += 1;
    startRound(); // <- this must be called
  } else {
    showSummary();
  }
}

    }
  }

  function showSummary() {
    state.setComplete = true;
    if (finalScoreEl) finalScoreEl.textContent = T('youScored', state.score, state.totalQuestions);
    if (summary) summary.hidden = false;
    setFeedback('');
    if (nextBtn) nextBtn.hidden = true;
    if (checkBtn) checkBtn.disabled = true;
  }

  function startNewSet() {
    state.questionIndex = 1;
    state.score = 0;
    state.setComplete = false;
    if (summary) summary.hidden = true;
    startRound();
  }

  function resetSelection() {
    if (state.locked) return; // keep visible after checking
    resetSelectionUI();
    setFeedback(T('cleared'));
  }

  // ----- Wiring -----
  if (checkBtn) checkBtn.addEventListener('click', checkAnswer);
  if (nextBtn) nextBtn.addEventListener('click', nextRound);
  if (resetBtn) resetBtn.addEventListener('click', resetSelection);
  if (playAgainBtn)playAgainBtn.addEventListener('click', startNewSet);
  if (polishToggle) {
    const toggle = () => { // re-write HUD + feedback line when language flips
      setFeedback(T('pickTwo'));
      updateHud();
    };
    polishToggle.addEventListener('click', toggle);
    polishToggle.addEventListener('change', toggle);
  }

  // ----- Go -----
  startRound();
})();
