// =========================
// 🎯 LEMBRIS - FOCO (POMODORO)
// =========================

// Variáveis Globais
let timer;
let isPaused = true;
let totalSeconds = 25 * 60;
let defaultFocoTime = 25 * 60;
let defaultBreakTime = 5 * 60;

// Elementos do DOM
const timerDisplay = document.getElementById("timer-display");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");
const progressRing = document.getElementById("progress-ring");
const breakNav = document.getElementById("break-nav");
const focoNav = document.getElementById("foco-nav");
const sessionStatusDisplay = document.getElementById("session-status");

// Modal (já existe no HTML)
const modal = document.getElementById("modal-overlay");
const btnSettings = document.getElementById("settings-nav");
const btnCancelar = document.getElementById("cancelar-modal");
const btnSalvar = document.getElementById("salvar-modal");

// --------------------------
// 🔧 Funções de Utilidade
// --------------------------

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function updateProgress(seconds, total) {
  const percent = Math.max(0, 100 - (seconds / total) * 100);
  progressRing.style.setProperty("--progress", `${percent}%`);
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(totalSeconds);
  const totalForProgress =
    currentSession === "foco" ? defaultFocoTime : defaultBreakTime;
  updateProgress(totalSeconds, totalForProgress);
}

// --------------------------
// ⏱️ Lógica Principal
// --------------------------

let currentSession = "foco";
let sessionCount = 1;
const maxSessions = 4;

function countdown() {
  if (totalSeconds <= 0) {
    clearInterval(timer);
    isPaused = true;
    startBtn.textContent = "Iniciar";

    if (currentSession === "foco") {
      alert("⏰ Tempo de Foco concluído! Hora do descanso.");
      sessionCount++;
      loadTime(defaultBreakTime, "descanso");
    } else {
      alert("💪 Descanso concluído! Hora de focar novamente.");
      loadTime(defaultFocoTime, "foco");
    }

    updateSessionStatus();
    return;
  }

  totalSeconds--;
  updateDisplay();
}

function loadTime(timeInSeconds, sessionType) {
  clearInterval(timer);
  isPaused = true;
  startBtn.textContent = "Iniciar";
  totalSeconds = timeInSeconds;
  currentSession = sessionType;
  updateDisplay();
}

function updateSessionStatus() {
  sessionStatusDisplay.textContent = `${
    currentSession === "foco" ? "Foco" : "Descanso"
  } ${sessionCount} de ${maxSessions}`;
}

// --------------------------
// 🎮 Controles
// --------------------------

function handleStartPause() {
  if (isPaused) {
    timer = setInterval(countdown, 1000);
    startBtn.textContent = "Pausar";
    startBtn.style.display = "none";
    pauseBtn.style.display = "inline-flex";
    isPaused = false;
  } else {
    clearInterval(timer);
    startBtn.textContent = "Continuar";
    startBtn.style.display = "inline";
    pauseBtn.style.display = "none";
    isPaused = true;
  }
}

function handlePauseButton() {
  if (!isPaused) handleStartPause();
}

function handleReset() {
  const resetTime =
    currentSession === "foco" ? defaultFocoTime : defaultBreakTime;
  loadTime(resetTime, currentSession);
  updateSessionStatus();

  startBtn.style.display = "inline";
  pauseBtn.style.display = "none";
  startBtn.textContent = "Iniciar";
}

// --------------------------
// ⚙️ Modal de Personalização
// --------------------------

btnSettings.addEventListener("click", () => {
  modal.classList.add("active");
});

btnCancelar.addEventListener("click", () => {
  modal.classList.remove("active");
});

btnSalvar.addEventListener("click", () => {
  const focoTempo = parseInt(document.getElementById("foco-tempo").value);
  const descansoTempo = parseInt(document.getElementById("descanso-tempo").value);

  if (focoTempo > 0 && descansoTempo > 0) {
    defaultFocoTime = focoTempo * 60;
    defaultBreakTime = descansoTempo * 60;
    loadTime(defaultFocoTime, "foco");
    alert("✅ Tempos atualizados com sucesso!");
  } else {
    alert("⚠️ Insira valores válidos!");
  }

  modal.classList.remove("active");
});

// --------------------------
// 🚀 Inicialização
// --------------------------

document.addEventListener("DOMContentLoaded", () => {
  loadTime(defaultFocoTime, "foco");
  updateSessionStatus();

  startBtn.addEventListener("click", handleStartPause);
  pauseBtn.addEventListener("click", handlePauseButton);
  resetBtn.addEventListener("click", handleReset);

  pauseBtn.style.display = "none";

  breakNav.addEventListener("click", () => {
    loadTime(defaultBreakTime, "descanso");
    updateSessionStatus();
  });

  focoNav.addEventListener("click", () => {
    loadTime(defaultFocoTime, "foco");
    updateSessionStatus();
  });
});
