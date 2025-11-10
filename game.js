(() => {

// ---------- Helpers ----------
const $ = id => document.getElementById(id);

function drawUnitBar(el, parts, shadeLeft=1, shadeRight=0){
  el.innerHTML = "";
  const totalShade = Math.min(parts, shadeLeft + shadeRight);
  for(let i=0;i<parts;i++){
    const seg = document.createElement("div");
    seg.className = "seg";
    if(i < shadeLeft) seg.style.background = "rgba(37,99,235,.35)"; // blue
    else if(i < totalShade) seg.style.background = "rgba(34,197,94,.35)"; // green
    el.appendChild(seg);
  }
}

const gcd = (x,y) => y ? gcd(y,x%y) : x;
const lcm = (a,b) => a/gcd(a,b)*b;
const lcmMany = (...nums) => nums.reduce((acc,n)=>lcm(acc,n));

// ---------- Soft Sound (Polish Mode) ----------
const sndCorrect = new Audio("data:audio/mp3;base64,SUQzAwAAAAAAF1RTU0UAAAAPAAAACAAABG1hcmltYmEtcGluZwAAACQAAACiAAACrC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t");
const sndWrong = new Audio("data:audio/mp3;base64,SUQzAwAAAAAAF1RTU0UAAAAPAAAACAAABHdvb2QtY2xpY2sAAAAkAAAAmgAAArgtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t");
function playCorrect(){ sndCorrect.currentTime = 0; sndCorrect.play(); }
function playWrong(){ sndWrong.currentTime = 0; sndWrong.play(); }

// ---------- Rules ----------
function isCorrect(n,a,b){
  return a !== b && (a*b === n*(a+b));
}

function hasDistinctPair(n){
  for(let a=1;a<=20;a++){
    for(let b=a+1;b<=20;b++){
      if(isCorrect(n,a,b)) return true;
    }
  }
  return false;
}

function correctPairFor(n){
  for(let a=1;a<=20;a++){
    for(let b=a+1;b<=20;b++){
      if(isCorrect(n,a,b)) return [a,b];
    }
  }
  for(let k=1;k<=n*n;k++){
    if((n*n)%k===0 && k!==n){
      const a=n+k, b=n+(n*n)/k;
      if(a!==b) return [a,b];
    }
  }
  return [n+1, n*(n+1)];
}

// ---------- Difficulty ----------
const poolEasy = [8,9,10,12];
const poolMedium = [6,7,11,13,14];
const poolHard = [15,16,18,20];
function pickFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

// ---------- State ----------
let q=1, score=0;
let targetN=8;
let pick1=null, pick2=null;
let attempts=0, wrong=0;
let allowNext=false;
let level="easy";

// ---------- UI Rendering ----------
function render(){
  $("headlineTarget").textContent = `1/${targetN}`;
  $("pillTarget").textContent = `1/${targetN}`;
  $("qNo").textContent = q;
  $("score").textContent = score;
  $("attempts").textContent = attempts;

  $("liveEq").textContent = `1/${targetN} = 1/${pick1 ?? "–"} + 1/${pick2 ?? "–"}`;

  drawUnitBar($("barTarget"), targetN, 1, 0);
  $("barPick1").innerHTML=""; $("barPick2").innerHTML="";
  if(pick1) drawUnitBar($("barPick1"), pick1, 1, 0);
  if(pick2) drawUnitBar($("barPick2"), pick2, 1, 0);

  if(pick1 && pick2){
    const L = lcmMany(pick1,pick2,targetN);
    drawUnitBar($("cmpTarget"), L, L/targetN,0);
    drawUnitBar($("cmpSum"), L, L/pick1, L/pick2);
    $("cmpText").textContent =
      `Common split: ${L}. Your shaded: ${(L/pick1)+(L/pick2)}/${L}. Target: ${L/targetN}/${L}.`;
  } else {
    $("cmpTarget").innerHTML="";
    $("cmpSum").innerHTML="";
    $("cmpText").textContent="Pick two numbers to compare.";
    $("cmpVerdict").textContent="";
  }

  const box=$("choices"); box.innerHTML="";
  for(let d=1; d<=20; d++){
    const btn=document.createElement("button");
    btn.className="choice";
    btn.textContent=d;
    if(d===pick1 || d===pick2) btn.classList.add("selected");
    btn.onclick=()=>{
      if(allowNext) return;
      if(d===pick1) pick1=null;
      else if(d===pick2) pick2=null;
      else if(!pick1) pick1=d;
      else if(!pick2 && d!==pick1) pick2=d;
      $("checkBtn").disabled = !(pick1 && pick2);
      render();
    };
    box.appendChild(btn);
  }

  $("checkBtn").disabled = !(pick1 && pick2);
  $("nextBtn").disabled = !allowNext;
  $("revealCard").classList.add("hidden");
}

// ---------- New Question ----------
function newQuestion(){
  const pools = level==="hard" ? poolHard : level==="medium" ? poolMedium : poolEasy;
  let tries=0;
  do { targetN = pickFrom(pools); tries++; }
  while(!hasDistinctPair(targetN) && tries<50);

  pick1=pick2=null;
  attempts=0; wrong=0; allowNext=false;
  $("cmpVerdict").textContent="";
  render();

  $("coachText").innerHTML =
   `Let’s make <b>1/${targetN}</b>.<br>Try one number first — then adjust based on too big / too small.`;
}

// ---------- Check Answer ----------
function checkAnswer(){
  if(!(pick1 && pick2)) return;

  attempts++;
  $("attempts").textContent = attempts;

  const ok = isCorrect(targetN, pick1, pick2);
  const bigger = (1/pick1 + 1/pick2) > (1/targetN);

  if(ok){
    score++;
    $("cmpVerdict").innerHTML = `🎯 <b>Awesome! Right on target!</b>`;
    playCorrect();
    $("cmpSum").classList.add("correct-glow");
    setTimeout(()=>$("cmpSum").classList.remove("correct-glow"),600);
  } else {
    wrong++;
    $("cmpVerdict").innerHTML =
      `🙃 <b>Oops!</b> Our sum is <b>${bigger?"bigger":"smaller"}</b> than 1/${targetN}. Try adjusting!`;
    playWrong();
    $("cmpSum").classList.add("shake");
    setTimeout(()=>$("cmpSum").classList.remove("shake"),450);
  }

  if(attempts>=5){ allowNext=true; $("nextBtn").disabled=false; }

  if(!ok && wrong>=5){
    const [a,b] = correctPairFor(targetN);
    $("revealEq").textContent = `1/${targetN} = 1/${a} + 1/${b}`;
    const L = lcmMany(a,b,targetN);
    drawUnitBar($("revTarget"), L, L/targetN, 0);
    drawUnitBar($("revSum"), L, L/a, L/b);
    $("revealCard").classList.remove("hidden");
  }

  render();
}

// ---------- Next ----------
function nextQuestion(){
  if(wrong===0) level = level==="easy" ? "medium" : "hard";
  else if(wrong>=4) level = level==="hard" ? "medium" : "easy";

  q++;
  newQuestion();
}

// ---------- Reset ----------
function resetSelection(){
  pick1=pick2=null;
  $("cmpVerdict").textContent="";
  render();
}

// ---------- Wire ----------
$("checkBtn").onclick = checkAnswer;
$("nextBtn").onclick = nextQuestion;
$("resetBtn").onclick = resetSelection;

// ---------- Start ----------
newQuestion();

})();

Sent from Outlook for Android
From: Azimah Ghazali <azimahghazali@hotmail.com>
Sent: Monday, November 10, 2025 3:12:37 PM
To: Azimah Ghazali <azimahghazali@hotmail.com>
Subject: Re: Adaptive Thinking Code 1
 
Song

/* POLISH MODE */

/* Correct gentle glow pulse */
.correct-glow {
  animation: correctPulse 0.6s ease-out;
}
@keyframes correctPulse {
  0% { box-shadow: 0 0 0 rgba(34,197,94,0); }
  50% { box-shadow: 0 0 16px rgba(34,197,94,0.5); }
  100% { box-shadow: 0 0 0 rgba(34,197,94,0); }
}

/* Incorrect gentle shake */
.shake {
  animation: shakeAnim 0.4s ease;
}
@keyframes shakeAnim {
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
  100% { transform: translateX(0); }
}

Modify game

if(ok){
  score++;
  $("cmpVerdict").innerHTML = `🎯 <b>Awesome! Right on target!</b>`;
  playCorrect();

  $("cmpSum").classList.add("correct-glow");
  setTimeout(() => $("cmpSum").classList.remove("correct-glow"), 600);

} else {
  wrong++;
  $("cmpVerdict").innerHTML =
    `🙃 <b>Oops!</b> Our sum is <b>${bigger ? "bigger" : "smaller"}</b> than 1/${targetN}. Try adjusting!`;
  playWrong();

  $("cmpSum").classList.add("shake");
  setTimeout(() => $("cmpSum").classList.remove("shake"), 450);
}
