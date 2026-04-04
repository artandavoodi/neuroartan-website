// ----------------- QUESTIONS -----------------
const QUESTIONS = [ 
  {stage:1,en:"Life happens to me.",de:"Das Leben passiert mir.",fa:"زندگی برای من اتفاق می‌افتد."},
  {stage:2,en:"Life happens through me.",de:"Das Leben passiert durch mich.",fa:"زندگی از طریق من رخ می‌دهد."},
  {stage:3,en:"Life happens as me.",de:"Das Leben passiert als ich.",fa:"زندگی به‌مثابه من رخ می‌دهد."},

  {stage:1,en:"I feel life is unfair or against me.",de:"Ich fühle, dass das Leben unfair oder gegen mich ist.",fa:"احساس می‌کنم زندگی ناعادلانه است یا علیه من است."},
  {stage:2,en:"I notice patterns repeating and wonder why.",de:"Ich bemerke wiederholende Muster und frage mich warum.",fa:"الگوهای تکرارشونده را مشاهده می‌کنم و تعجب می‌کنم چرا."},
  {stage:3,en:"I see all as one flow of consciousness.",de:"Ich sehe alles als einen Fluss des Bewusstseins.",fa:"همه چیز را به‌عنوان یک جریان آگاهی می‌بینم."},

  {stage:1,en:"My experiences feel disconnected.",de:"Meine Erfahrungen fühlen sich getrennt an.",fa:"تجربیاتم جدا به نظر می‌رسند."},
  {stage:2,en:"I integrate experiences to find coherence.",de:"Ich integriere Erfahrungen, um Kohärenz zu finden.",fa:"تجربیات را برای یافتن همبستگی یکپارچه می‌کنم."},
  {stage:3,en:"I realize all experiences are unified and arise as me.",de:"Ich erkenne, dass alle Erfahrungen vereint sind und als ich Erscheinung zeigen.",fa:"می‌فهمم همه تجربیات متحد هستند و به‌عنوان من ظهور می‌کنند."},
];

// ----------------- STAGE SUMMARY -----------------
const STAGE_SUMMARY = {
  1:{en:"I am in Stage I — Victimhood: life feels like it happens to me.",de:"Ich bin in Stufe I — Opferrolle: das Leben scheint mir zu widerfahren.",fa:"من در مرحله اول هستم — قربانی: زندگی را به‌عنوان چیزی که برایم اتفاق می‌افتد تجربه می‌کنم."},
  2:{en:"I am in Stage II — Awakening: life happens through me.",de:"Ich bin in Stufe II — Erwachen: das Leben geschieht durch mich.",fa:"من در مرحله دوم هستم — بیداری: زندگی از طریق من جریان دارد."},
  3:{en:"I am in Stage III — Mastery: life happens as me.",de:"Ich bin in Stufe III — Meisterschaft: das Leben geschieht als ich.",fa:"من در مرحله سوم هستم — تسلط: زندگی همان من است."}
};

// ----------------- STAGE INFO -----------------
const STAGE_INFO = [
  {
    title:{en:"Victimhood",de:"Opferrolle",fa:"قربانی"},
    description:{
      en:[
        "Stage I is the realm of victimhood, where I feel distant from my origin and lost in forgetfulness. Life is experienced as happening to me rather than through me.",
        "Close to 10:\nI am deeply immersed in victimhood; heavy attachment, resistance, and identification with external stories. Overall state dominated by Stage I.",
        "Around 5:\nPartial awareness emerges; glimpses of truth appear, potential to move toward Stage II.",
        "Close to 1:\nEarly awakening; I begin noticing patterns and reflections. Shadow work and self-inquiry required."
      ],
      de:[
        "Stufe I ist das Reich der Opferrolle, in dem ich mich von meiner Quelle entfernt und in Vergessenheit verloren fühle. Das Leben wird erlebt, als geschähe es mir, nicht durch mich.",
        "Close to 10:\nIch bin tief in der Opferhaltung; starke Bindung, Widerstand und Identifikation mit äußeren Geschichten. Gesamtzustand von Stufe I dominiert.",
        "Around 5:\nTeilweise aufkommendes Bewusstsein; Einblicke erscheinen, Potenzial für Stufe II.",
        "Close to 1:\nFrühes Erwachen; ich bemerke Muster und Spiegelungen. Schattenarbeit und Selbstreflexion erforderlich."
      ],
      fa:[
        "مرحله اول حوزه قربانی بودن است که در آن من احساس دوری از منبع خود دارم و در فراموشی گم شده‌ام. زندگی به‌عنوان چیزی که بر من رخ می‌دهد تجربه می‌شود، نه از طریق من.",
        "Close to 10:\nغرق شدن در قربانی بودن؛ وابستگی شدید، مقاومت و هویت با داستان‌های بیرونی. وضعیت کلی تحت سلطه مرحله اول.",
        "Around 5:\nآگاهی جزئی ظاهر می‌شود؛ درک‌هایی از حقیقت نمایان می‌شود، پتانسیل حرکت به سمت مرحله دوم.",
        "Close to 1:\nبیداری اولیه؛ من الگوها و بازتاب‌ها را متوجه می‌شوم. نیاز به کار سایه و خودکاوی."
      ]
    }
  },
  {
    title:{en:"Awakening",de:"Erwachen",fa:"بیداری"},
    description:{
      en:[
        "Stage II is the awakening stage. I begin noticing patterns, understanding my role as co-creator, and feeling connected to a greater flow. Awareness increases and judgment diminishes.",
        "Close to 10:\nHigh awareness, conscious decision-making; beginning integration of shadow and light.",
        "Around 5:\nGrowing insight; I am partially aware of patterns and influences.",
        "Close to 1:\nEarly awareness; I notice repetition, questioning begins."
      ],
      de:[
        "Stufe II ist die Erwachensstufe. Ich beginne Muster zu erkennen, meine Rolle als Mit-Schöpfer zu verstehen und mich mit einem größeren Fluss verbunden zu fühlen. Bewusstsein steigt, Urteilskraft nimmt ab.",
        "Close to 10:\nHohes Bewusstsein, bewusstes Entscheiden; Beginn der Integration von Schatten und Licht.",
        "Around 5:\nWachsende Einsicht; ich bin teilweise mir der Muster bewusst.",
        "Close to 1:\nFrühes Bewusstsein; ich bemerke Wiederholungen, Fragen beginnen."
      ],
      fa:[
        "مرحله دوم مرحله بیداری است. من شروع به مشاهده الگوها، درک نقش خود به‌عنوان هم‌آفریننده و احساس ارتباط با جریان بزرگتر می‌کنم. آگاهی افزایش می‌یابد و قضاوت کاهش می‌یابد.",
        "Close to 10:\nآگاهی بالا، تصمیم‌گیری آگاهانه؛ شروع یکپارچه‌سازی سایه و نور.",
        "Around 5:\nبینش در حال رشد؛ من تا حدی از الگوها و تأثیرات آگاه هستم.",
        "Close to 1:\nآگاهی اولیه؛ من تکرارها را می‌بینم، پرسش‌ها آغاز می‌شوند."
      ]
    }
  },
  {
    title:{en:"Mastery",de:"Meisterschaft",fa:"تسلط"},
    description:{
      en:[
        "Stage III is the stage of mastery and full integration. I know I am the only source; all experiences are reflections of my inner consciousness. There is no separation, only pure creation.",
        "Close to 10:\nComplete embodiment of mastery; life flows effortlessly through me.",
        "Around 5:\nIntegration in progress; glimpses of mastery and unity appear.",
        "Close to 1:\nEarly mastery signs; I experiment with full ownership and creation."
      ],
      de:[
        "Stufe III ist die Stufe der Meisterschaft und vollständigen Integration. Ich erkenne, dass ich die einzige Quelle bin; alle Erfahrungen sind Spiegelungen meines inneren Bewusstseins. Keine Trennung, nur reine Schöpfung.",
        "Close to 10:\nVollständige Verkörperung der Meisterschaft; das Leben fließt mühelos durch mich.",
        "Around 5:\nIntegration im Gange; Einblicke in Meisterschaft und Einheit erscheinen.",
        "Close to 1:\nFrühe Meisterschaftsanzeichen; ich experimentiere mit voller Verantwortung und Schöpfung."
      ],
      fa:[
        "مرحله سوم مرحله تسلط و یکپارچگی کامل است. من می‌دانم که تنها منبع هستم؛ همه تجربه‌ها بازتاب آگاهی درونی من هستند. هیچ جدایی وجود ندارد، فقط خلق خالص.",
        "Close to 10:\nتجسم کامل تسلط؛ زندگی به‌راحتی از طریق من جریان می‌یابد.",
        "Around 5:\nیکپارچه‌سازی در حال انجام؛ درک‌هایی از تسلط و وحدت ظاهر می‌شود.",
        "Close to 1:\nنشانه‌های اولیه تسلط؛ من با مالکیت کامل و خلق آزمایش می‌کنم."
      ]
    }
  }
];

// ----------------- LANGUAGE CONTROL REMOVED -----------------
  
// ----------------- SLIDER & QUESTIONS -----------------
let currentQ = 0;
let answers = [];
const questionTextEl = document.getElementById("questionText");
const sliderEl = document.getElementById("questionSlider");
const nextBtnEl = document.getElementById("nextBtn");

// ----------------- QUESTION INDICATOR BASELINE FUNCTIONALITY -----------------
function updateProgressBar() {
  const total = (randomizedQuestions && randomizedQuestions.length > 0) ? randomizedQuestions.length : QUESTIONS.length;
  const percent = (currentQ / total) * 100;
  const fill = document.getElementById("questionProgressFill");
  if (fill) fill.style.width = percent + "%";
}

// --------- NEW: randomizedQuestions and randomizer function (added only) ---------
// Keeps original QUESTIONS array and text intact and uses randomizedQuestions for display & results.
// Randomization logic: Shuffle within stages then interleave so same-stage doesn't repeat when possible.

let randomizedQuestions = [];

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Create randomizedQuestions from QUESTIONS while avoiding consecutive same-stage when possible
function randomizeQuestions() {
  // create stage buckets (deep copy items)
  const stageMap = {1: [], 2: [], 3: []};
  QUESTIONS.forEach(q => stageMap[q.stage].push({...q}));

  // shuffle each stage bucket
  Object.keys(stageMap).forEach(k => shuffleArray(stageMap[k]));

  randomizedQuestions = [];
  let lastStage = null;

  while (stageMap[1].length + stageMap[2].length + stageMap[3].length > 0) {
    // choose available stages that are not the last stage if possible
    const available = [1,2,3].filter(s => stageMap[s].length > 0 && s !== lastStage);
    const choice = available.length > 0 ? available[Math.floor(Math.random()*available.length)] : 
                   ( [1,2,3].find(s => stageMap[s].length>0) );
    randomizedQuestions.push(stageMap[choice].shift());
    lastStage = choice;
  }

  // reset pointers and answers
  currentQ = 0;
  answers = [];
}

// ----------------------------------------------------------------------------------

function showQuestion() {
  // use randomizedQuestions if available, else fallback to original QUESTIONS
  const source = (randomizedQuestions && randomizedQuestions.length > 0) ? randomizedQuestions : QUESTIONS;
  const q = source[currentQ];
  questionTextEl.textContent = q.en;
  sliderEl.value = 5;
}
nextBtnEl.addEventListener("click", () => {
  // Prevent double-answering or going out of bounds
  const source = (randomizedQuestions && randomizedQuestions.length > 0) ? randomizedQuestions : QUESTIONS;
  if (currentQ < source.length) {
    answers.push(parseFloat(sliderEl.value));
    currentQ++;
    updateProgressBar();
    if (currentQ >= source.length) {
      showResults();
    } else {
      showQuestion();
    }
  }
});

// Remove legacy/duplicate showResults (if present above)
function calculateOverallAwareness(stageAvg){
  // Determine line colors per stage and per line
  // Line thresholds: Near10>6, Around5 4-6, Near1<4
  const getLineColor = (score, stage, lineIdx) => {
    let color = "#FFCC33"; // default neutral yellow

    if(score>6){ // Near 10
      if(stage===1) color="#FF6B6B"; // Stage I danger
      if(stage===2) color="#4CAF50"; // Stage II progress
      if(stage===3) color="#4CAF50"; // Stage III peak
    } else if(score<4){ // Close to 1
      if(stage===1) color="#4CAF50"; // Stage I better
      if(stage===2) color="#FF6B6B"; // Stage II low
      if(stage===3) color="#FF6B6B"; // Stage III needs integration
    }
    return color;
  };

  // Step 1: simulate 3 lines per stage with same stageAvg (for simplicity)
  const lines = [0,1,2].map(lineIdx=>{
    const colors = [
      getLineColor(stageAvg[1],1,lineIdx),
      getLineColor(stageAvg[2],2,lineIdx),
      getLineColor(stageAvg[3],3,lineIdx)
    ];

    // Combine line colors (🔴+🔴+🟢 etc.)
    // Logic: 3 same -> that color; 2 same -> that color; 1 each -> neutral yellow
    const uniqueColors = [...new Set(colors)];
    if(uniqueColors.length===1) return uniqueColors[0];
    if(uniqueColors.length===2){
      const counts = {};
      colors.forEach(c=>counts[c]=(counts[c]||0)+1);
      return Object.keys(counts).find(k=>counts[k]>1);
    }
    return "#FFCC33"; // neutral
  });

  // Step 2: combine 3 line colors for final overall color
  const uniqueFinal = [...new Set(lines)];
  let finalColor;
  if(uniqueFinal.length===1) finalColor=uniqueFinal[0];
  else if(uniqueFinal.length===2){
    const counts={};
    lines.forEach(c=>counts[c]=(counts[c]||0)+1);
    finalColor=Object.keys(counts).find(k=>counts[k]>1);
  } else finalColor="#FFCC33";

  // Step 3: text messages in English only
  const messages = {
    "#4CAF50":"I am fully aware of who I am. I move with clarity, grace, and confidence, expanding my consciousness and aligning effortlessly with my true nature.",
    "#FFCC33":"I am partially aware, observing my patterns and growing steadily. I integrate insights into a higher version of myself, unlocking greater awareness and potential.",
    "#FF6B6B":"I am unaware of my true self, caught in the illusion of separation and forgetfulness. My awareness is obscured, and I am still immersed in the patterns of limitation."
  };

  return {finalColor, finalText:messages[finalColor]};
}

// ----------------- Show Overall Result -----------------
function showOverallResult(stageAvg){
  const overallEl = document.getElementById("overallResult");
  const {finalColor, finalText} = calculateOverallAwareness(stageAvg);

  overallEl.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:12px;">
      <span style="display:inline-block;width:60px;height:12px;border-radius:6px;background:${finalColor};box-shadow:0 2px 6px rgba(0,0,0,0.1);"></span>
    </div>
    <div style="font-size:15px;line-height:1.5; color:#222;">${finalText}</div>
  `;
  overallEl.classList.remove("hidden");
}

function showResults() {
  // Hide question, show result
  document.getElementById("questionPane").classList.add("hidden");
  document.getElementById("resultPane").classList.remove("hidden");

  const stageScores = { 1: [], 2: [], 3: [] };
  const source = (randomizedQuestions && randomizedQuestions.length > 0) ? randomizedQuestions : QUESTIONS;
  source.forEach((q, i) => {
    stageScores[q.stage].push(answers[i]);
  });

  const stageAvg = {
    1: average(stageScores[1]),
    2: average(stageScores[2]),
    3: average(stageScores[3])
  };

  document.getElementById("scoreI").textContent = stageAvg[1].toFixed(1);
  document.getElementById("scoreII").textContent = stageAvg[2].toFixed(1);
  document.getElementById("scoreIII").textContent = stageAvg[3].toFixed(1);

  let maxStage = 1;
  if (stageAvg[2] >= stageAvg[maxStage]) maxStage = 2;
  if (stageAvg[3] >= stageAvg[maxStage]) maxStage = 3;

  const dominantMessageEl = document.getElementById("dominantMessage");
  dominantMessageEl.classList.remove("hidden");
  dominantMessageEl.innerHTML = STAGE_SUMMARY[maxStage].en;

  const detailsEl = document.getElementById("stageDetails");
  detailsEl.innerHTML = "";
  STAGE_INFO.forEach((stage, i) => {
    const score = stageAvg[i + 1];
    const stageDiv = document.createElement("div");
    stageDiv.classList.add("stage-desc");

    const descHTML = stage.description.en.map((line, j) => {
      if (j === 0) return line + "\n\n"; // Stage description line

      let circleColor = "#FFCC33"; // default neutral
      let opacity = 0.3;
      let bold = false;

      if (line.startsWith("Close to 10:")) {
        if (i === 0) circleColor = "#FF6B6B";
        if (i === 1) circleColor = "#4CAF50";
        if (i === 2) circleColor = "#4CAF50";
        if (score > 6) { bold = true; opacity = 1; }
      } else if (line.startsWith("Around 5:")) {
        circleColor = "#FFCC33";
        if (score >= 4 && score <= 6) { bold = true; opacity = 1; }
      } else if (line.startsWith("Close to 1:")) {
        if (i === 0) circleColor = "#4CAF50";
        if (i === 1) circleColor = "#FF6B6B";
        if (i === 2) circleColor = "#FF6B6B";
        if (score < 4) { bold = true; opacity = 1; }
      }

      const circleHTML = `<span style="
        display:inline-block;
        width:14px;
        height:14px;
        border-radius:50%;
        background:${circleColor};
        opacity:${opacity};
        box-shadow:0 2px 6px rgba(0,0,0,0.1);
        transition: transform 0.2s, opacity 0.3s;
        margin-right:6px;
        vertical-align:middle;"
        title="${line.split(':')[0]}"></span>`;

      const text = line.replace(/^(Close to 10:|Around 5:|Close to 1:)/, '').trim();
      return (bold ? "<strong>" + circleHTML + text + "</strong>" : circleHTML + text);
    }).join("\n\n");

    stageDiv.innerHTML = `<h3 style="font-weight:bold">${stage.title.en}</h3><p>${descHTML}</p>`;
    detailsEl.appendChild(stageDiv);
  });

  // Show the overall result bar and message
  showOverallResult(stageAvg);
}
// ----------------- STAGE CLICK TOGGLE -----------------
document.querySelectorAll('.result-stage').forEach((el, idx)=>{
  el.addEventListener('click', ()=>{
    const descs = document.querySelectorAll('.stage-desc');
    descs[idx].style.display = descs[idx].style.display==='none'?'block':'none';
  });
});

function average(arr){
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}

// ----------------- START / RESTART -----------------
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

if (startBtn) {
  startBtn.addEventListener("click", () => {
    document.getElementById("landingPane").classList.add("hidden");
    randomizeQuestions();
    document.getElementById("questionPane").classList.remove("hidden");
    updateProgressBar();
    showQuestion();
  });
}
if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    randomizeQuestions();
    // currentQ and answers are reset in randomizeQuestions
    document.getElementById("resultPane").classList.add("hidden");
    document.getElementById("questionPane").classList.remove("hidden");
    updateProgressBar();
    showQuestion();
  });
}

