// Unit Fraction Addition Game

(() => {
  const choicesGrid = document.getElementById('choicesGrid');
  const targetFractionEl = document.getElementById('targetFraction');
  const targetBar = document.getElementById('targetBar');
  const selBar1 = document.getElementById('selBar1');
  const selBar2 = document.getElementById('selBar2');
  const feedback = document.getElementById('feedback');
  const questionProgressEl = document.getElementById('questionProgress');
  const scoreEl = document.getElementById('score');
  const checkBtn = document.getElementById('checkBtn');
  const nextBtn = document.getElementById('nextBtn');
  const resetBtn = document.getElementById('resetBtn');
  const summary = document.getElementById('summary');
  const finalScoreEl = document.getElementById('finalScore');
  const playAgainBtn = document.getElementById('playAgainBtn');

  const MIN_DEN = 2;
  const MAX_DEN = 20; // keep bars readable
  const MIN_TARGET = 3;
  const MAX_TARGET = 12;
  const CHOICES_COUNT = 8;

  let state = {
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

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Try to find a solvable round by ensuring at least one (a, b) works: 1/a + 1/b = 1/n
  function makeRound() {
    // Find target n with a valid pair
    for (let tries = 0; tries < 100; tries++) {
      const n = randInt(MIN_TARGET, MAX_TARGET);
      const pair = findValidPairForTarget(n);
      if (pair) {
        const [a, b] = pair;
        // Build choices including a and b, then distractors
        const choices = new Set([a, b]);
        while (choices.size < CHOICES_COUNT) {
          choices.add(randInt(MIN_DEN, MAX_DEN));
        }
        return { n, pair, choices: shuffle([...choices]) };
      }
    }
    // Fallback (should be rare): deterministic round
    const n = 6; // 1/6 = 1/3 + 1/6? No, example pair: 1/3 + 1/2 = 5/6 not unit.
    const pair = [3, 6]; // 1/3 + 1/6 = 1/2 (not target fallback). We'll recompute target from pair.
    const nFromPair = (pair[0] * pair[1]) / (pair[0] + pair[1]);
    const choices = shuffle([pair[0], pair[1], 4, 5, 7, 8, 9, 10]);
    return { n: nFromPair, pair, choices };
  }

  // Find a pair (a, b) such that b = n*a / (a - n) is integer and within limits
  function findValidPairForTarget(n) {
    const candidates = [];
    for (let a = n + 1; a <= MAX_DEN; a++) {
      const denom = a - n;
      const numerator = n * a;
      if (denom > 0 && numerator % denom === 0) {
        const b = numerator / denom;
        if (Number.isInteger(b) && b >= MIN_DEN && b <= MAX_DEN) {
          candidates.push([a, b]);
        }
      }
    }
    if (candidates.length === 0) return null;
    return candidates[randInt(0, candidates.length - 1)];
  }

  function renderFractionBar(container, denom) {
    container.innerHTML = '';
    if (!denom || denom < MIN_DEN || denom > 50) return;
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
    feedback.innerHTML = `<span class="${cls}">${html}</span>`;
  }

  function resetSelectionUI() {
    state.selection = [];
    selBar1.innerHTML = '';
    selBar2.innerHTML = '';
    checkBtn.disabled = true;
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(b => b.classList.remove('selected'));
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

    // Render choices
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

  function updateHud() {
    if (questionProgressEl) {
      questionProgressEl.textContent = `Question ${state.questionIndex}/${state.totalQuestions}`;
    }
    if (scoreEl) {
      scoreEl.textContent = `Score: ${state.score}`;
    }
  }

  function onChoice(btn, denom) {
    if (state.locked) return;
    const idx = state.selection.indexOf(denom);
    if (idx >= 0) {
      state.selection.splice(idx, 1);
      btn.classList.remove('selected');
    } else {
      if (state.selection.length === 2) return; // limit two
      state.selection.push(denom);
      btn.classList.add('selected');
    }
    // Update bars
    renderFractionBar(selBar1, state.selection[0] || 0);
    renderFractionBar(selBar2, state.selection[1] || 0);
    checkBtn.disabled = state.selection.length !== 2;
  }

  function isUnitSumEqualTarget(a, b, n) {
    const ab = a * b;
    const sumNum = a + b; // (a+b)/ab
    if (ab % sumNum !== 0) return false;
    const nCalc = ab / sumNum;
    return nCalc === n;
  }

  function explainSum(a, b, n) {
    const ab = a * b;
    const sumNum = a + b;
    const nCalc = ab % sumNum === 0 ? ab / sumNum : null;
    const sumStr = `${sumNum}/${ab}`;
    if (nCalc === n) {
      return `1/${a} + 1/${b} = (${a} + ${b}) / (${a} × ${b}) = ${sumStr} = 1/${n}. Great job!`;
    }
    const approx = ((1 / a) + (1 / b)).toFixed(3);
    return `1/${a} + 1/${b} = (${a} + ${b}) / (${a} × ${b}) = ${sumStr}${nCalc ? ` = 1/${nCalc}` : ''}. Target is 1/${n}. (≈ ${approx})`;
  }

  function checkAnswer() {
    if (state.selection.length !== 2) return;
    const [a, b] = state.selection;
    const correct = isUnitSumEqualTarget(a, b, state.target);
    if (correct) {
      setFeedback(explainSum(a, b, state.target), 'ok');
      state.score += 1;
    } else {
      setFeedback(explainSum(a, b, state.target), 'warn');
    }
    // Lock this question and show Next
    state.locked = true;
    nextBtn.hidden = false;
    checkBtn.disabled = true;
    // Disable choices and mark selection
    document.querySelectorAll('.choice-btn').forEach(btn => {
      const den = parseInt(btn.textContent, 10);
      if (den === a || den === b) btn.classList.add('selected');
      btn.classList.add('disabled');
    });
    updateHud();
  }

  function nextRound() {
    if (state.setComplete) return;
    if (state.questionIndex < state.totalQuestions) {
      state.questionIndex += 1;
      startRound();
    } else {
      showSummary();
    }
  }

  function showSummary() {
    state.setComplete = true;
    if (finalScoreEl) {
      finalScoreEl.textContent = `You scored ${state.score}/${state.totalQuestions} points.`;
    }
    if (summary) summary.hidden = false;
    setFeedback('');
    // Hide gameplay controls while summary is shown
    nextBtn.hidden = true;
    checkBtn.disabled = true;
  }

  function startNewSet() {
    state.questionIndex = 1;
    state.score = 0;
    state.setComplete = false;
    if (summary) summary.hidden = true;
    startRound();
  }

  function resetSelection() {
    if (state.locked) return; // keep correct state until next round
    resetSelectionUI();
    setFeedback('Selection cleared. Pick two denominators, then press Check.');
  }

  // Wire buttons
  checkBtn.addEventListener('click', checkAnswer);
  nextBtn.addEventListener('click', nextRound);
  resetBtn.addEventListener('click', resetSelection);
  if (playAgainBtn) playAgainBtn.addEventListener('click', startNewSet);

  // Initialize
  startRound();
})();