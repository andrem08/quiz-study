// Salesforce Certification Quiz App
const $ = (id) => document.getElementById(id);
let data = null;
let currentCert = null;
let currentCertId = null;
let currentPage = 0;
let userAnswers = {};
let revealed = {};
let QUESTIONS_PER_PAGE = 10;
let isRandomTest = false;

// Timer variables
let timerInterval = null;
let startTime = null;
let timeLimit = null; // in seconds, null for unlimited
let timeLimitWarningShown = false;

// Dark Mode Toggle
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.querySelector(".theme-icon");
const savedTheme = localStorage.getItem("theme") || "light";

if (savedTheme === "dark") {
  document.body.classList.add("dark-mode");
  themeIcon.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  themeIcon.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// Load data from questions folder
async function loadCertifications() {
  try {
    // List of certification files to load
    const certFiles = ['jsdev1', 'pd1'];
    
    const certifications = [];
    for (const certId of certFiles) {
      const response = await fetch(`questions/${certId}.json`);
      const certData = await response.json();
      certifications.push(certData.certification);
    }
    
    data = { certifications };
    renderCertifications();
  } catch (e) {
    document.getElementById("cert-list").innerHTML =
      '<p style="color:red;padding:20px">Erro: ' + e.message + "</p>";
  }
}

loadCertifications();

function renderCertifications() {
  const html = data.certifications
    .map(
      (cert) =>
        `<div class="cert-card" data-cert-id="${cert.id}" tabindex="0">
      <h3>${cert.name}</h3>
      <p>${cert.questions.length} perguntas</p>
    </div>`
    )
    .join("");
  document.getElementById("cert-list").innerHTML = html;

  // Add keyboard support for cert cards
  document.querySelectorAll(".cert-card").forEach((card) => {
    card.addEventListener("keypress", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });
}

// Event listener for cert cards
document.getElementById("cert-list").addEventListener("click", (e) => {
  const card = e.target.closest(".cert-card");
  if (card) showModeSelection(card.dataset.certId);
});

function showModeSelection(certId) {
  currentCertId = certId;
  const cert = data.certifications.find((c) => c.id === certId);

  document.getElementById("mode-cert-title").textContent = cert.name;
  document.getElementById(
    "full-quiz-count"
  ).textContent = `${cert.questions.length} perguntas`;
  
  // Use recommended questions as default, or fallback to 20
  const defaultQuestionCount = cert.recommendedQuestions || 20;
  document.getElementById("random-count").value = Math.min(
    defaultQuestionCount,
    cert.questions.length
  );
  document.getElementById("random-count").max = cert.questions.length;

  // Use recommended time as default (convert minutes to hours and minutes)
  if (cert.recommendedTime) {
    const hours = Math.floor(cert.recommendedTime / 60);
    const minutes = cert.recommendedTime % 60;
    document.getElementById("time-hours").value = hours;
    document.getElementById("time-minutes").value = minutes;
  } else {
    // Fallback to no time limit
    document.getElementById("time-hours").value = 0;
    document.getElementById("time-minutes").value = 0;
  }

  document.getElementById("selection").classList.add("hidden");
  document.getElementById("mode-selection").classList.remove("hidden");
}

document.getElementById("mode-back-btn").addEventListener("click", () => {
  document.getElementById("mode-selection").classList.add("hidden");
  document.getElementById("selection").classList.remove("hidden");
});

document.querySelectorAll(".mode-card").forEach((card) => {
  card.addEventListener("click", (e) => {
    // Don't trigger if clicking on button or input
    if (e.target.closest(".btn") || e.target.closest("input")) return;
    e.currentTarget.querySelector(".btn").click();
  });
});

document
  .querySelector('.mode-card[data-mode="full"] .btn')
  .addEventListener("click", () => {
    startQuiz(currentCertId, false, null, null);
  });

document
  .querySelector('.mode-card[data-mode="random"] .btn')
  .addEventListener("click", () => {
    const count = parseInt(document.getElementById("random-count").value);
    const hours = parseInt(document.getElementById("time-hours").value) || 0;
    const minutes =
      parseInt(document.getElementById("time-minutes").value) || 0;
    const cert = data.certifications.find((c) => c.id === currentCertId);

    if (count < 1 || count > cert.questions.length) {
      alert(`Por favor, escolha um número entre 1 e ${cert.questions.length}`);
      return;
    }

    const timeLimitSeconds = hours * 3600 + minutes * 60;
    startQuiz(
      currentCertId,
      true,
      count,
      timeLimitSeconds > 0 ? timeLimitSeconds : null
    );
  });

// Prevent input click from bubbling to card
["random-count", "time-hours", "time-minutes"].forEach((id) => {
  const input = document.getElementById(id);
  input.addEventListener("click", (e) => e.stopPropagation());
  input.addEventListener("focus", (e) => e.stopPropagation());
});

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function startQuiz(
  certId,
  random = false,
  questionCount = null,
  timeLimitSeconds = null
) {
  const baseCert = data.certifications.find((c) => c.id === certId);
  isRandomTest = random;

  if (random && questionCount) {
    // Create a random test with shuffled questions and options
    const shuffledQuestions = shuffleArray(baseCert.questions).slice(
      0,
      questionCount
    );

    // Shuffle options for each question
    const questionsWithShuffledOptions = shuffledQuestions.map((q) => ({
      ...q,
      options: shuffleArray(q.options),
    }));

    currentCert = {
      ...baseCert,
      name: `${baseCert.name} - Teste Aleatório (${questionCount} questões)`,
      questions: questionsWithShuffledOptions,
    };
  } else {
    currentCert = baseCert;
  }

  currentPage = 0;
  userAnswers = {};

  // Initialize timer
  startTime = Date.now();
  timeLimit = timeLimitSeconds;
  timeLimitWarningShown = false;
  startTimer();
  revealed = {};
  document.getElementById("cert-title").textContent = currentCert.name;
  document.getElementById("mode-selection").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");
  renderQuestionsPerPageSelector();
  renderQuestions();
}

function startTimer() {
  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  const timerDisplay = document.getElementById("timer-display");

  if (!timeLimit) {
    // No time limit - show elapsed time
    timerDisplay.classList.remove("hidden", "warning", "expired");
    timerInterval = setInterval(updateElapsedTime, 1000);
    updateElapsedTime();
  } else {
    // Has time limit - show countdown
    timerDisplay.classList.remove("hidden", "warning", "expired");
    timerInterval = setInterval(updateCountdownTime, 1000);
    updateCountdownTime();
  }
}

function updateElapsedTime() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const timerDisplay = document.getElementById("timer-display");
  timerDisplay.innerHTML = `⏱️ ${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function updateCountdownTime() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const remaining = timeLimit - elapsed;

  if (remaining <= 0) {
    // Time's up!
    const timerDisplay = document.getElementById("timer-display");
    timerDisplay.innerHTML = `⏰ 00:00:00`;
    timerDisplay.classList.add("expired");

    if (!timeLimitWarningShown) {
      timeLimitWarningShown = true;
      document.getElementById("time-over-modal").classList.remove("hidden");
    }
    return;
  }

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const timerDisplay = document.getElementById("timer-display");
  timerDisplay.innerHTML = `⏱️ ${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Warning at 5 minutes or 10% of time remaining (whichever is less)
  const warningThreshold = Math.min(300, timeLimit * 0.1);
  if (remaining <= warningThreshold) {
    timerDisplay.classList.add("warning");
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function getElapsedTime() {
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function renderQuestionsPerPageSelector() {
  const selector = document.getElementById("questions-per-page");
  if (selector) {
    selector.innerHTML = `
      <label style="font-weight:600;margin-right:8px">Perguntas por página:</label>
      <select id="qpp-select" style="padding:6px 12px;border-radius:4px;border:1px solid #ccc;font-size:14px">
        <option value="1" ${
          QUESTIONS_PER_PAGE === 1 ? "selected" : ""
        }>1</option>
        <option value="5" ${
          QUESTIONS_PER_PAGE === 5 ? "selected" : ""
        }>5</option>
        <option value="10" ${
          QUESTIONS_PER_PAGE === 10 ? "selected" : ""
        }>10</option>
        <option value="20" ${
          QUESTIONS_PER_PAGE === 20 ? "selected" : ""
        }>20</option>
        <option value="50" ${
          QUESTIONS_PER_PAGE === 50 ? "selected" : ""
        }>50</option>
      </select>
    `;
    document.getElementById("qpp-select").addEventListener("change", (e) => {
      QUESTIONS_PER_PAGE = parseInt(e.target.value);
      currentPage = 0;
      renderQuestions();
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderQuestions() {
  const start = currentPage * QUESTIONS_PER_PAGE;
  const end = Math.min(
    start + QUESTIONS_PER_PAGE,
    currentCert.questions.length
  );
  const questions = currentCert.questions.slice(start, end);

  const html =
    questions
      .map((q, idx) => {
        const isMulti = q.correct.length > 1;
        const opts = q.options
          .map(
            (opt) =>
              `<label class="option"><input type="${
                isMulti ? "checkbox" : "radio"
              }" name="opt_${q.id}" value="${escapeHtml(opt.id)}" ${
                userAnswers[q.id]?.includes(opt.id) ? "checked" : ""
              }><span>${escapeHtml(opt.text)}</span></label>`
          )
          .join("");
        return `<div class="question-block" data-qid="${q.id}">
      <div class="question-text">${start + idx + 1}. ${escapeHtml(q.text)}</div>
      <div class="options">${opts}</div>
      <div class="question-actions">
        <button class="btn-small" data-action="show-answer" data-qid="${
          q.id
        }">👁️ Mostrar Resposta</button>
        <button class="btn-small" data-action="clear-answer" data-qid="${
          q.id
        }" style="display:none">🗑️ Limpar</button>
      </div>
    </div>`;
      })
      .join("") +
    `<div class="question-range-info">Perguntas ${start + 1}-${end} de ${
      currentCert.questions.length
    }</div>`;

  document.getElementById("question-area").innerHTML = html;
  document.getElementById("page-result-area").classList.add("hidden");

  // Restore revealed state for questions that were already shown
  questions.forEach((q) => {
    if (revealed[q.id]) {
      const block = document.querySelector(`[data-qid="${q.id}"]`);
      if (block) {
        const selected = userAnswers[q.id] || [];
        const correctSet = new Set(q.correct);

        // Show correct/incorrect styling
        block.querySelectorAll(".option").forEach((el) => {
          const optId = el.querySelector("input").value;
          if (correctSet.has(optId)) {
            el.classList.add("correct");
          } else if (selected.includes(optId)) {
            el.classList.add("incorrect");
          }
        });

        // Show explanation
        const isCorrect =
          selected.length > 0 &&
          selected.length === q.correct.length &&
          selected.every((id) => correctSet.has(id));
        const exp = document.createElement("div");
        exp.className = "explanation";
        if (selected.length === 0) {
          exp.innerHTML = `<strong>❌ Não respondida</strong><br>${escapeHtml(
            q.explanation || ""
          )}`;
        } else {
          exp.innerHTML = `<strong>${
            isCorrect ? "✅ Correto!" : "❌ Incorreto"
          }</strong><br>${escapeHtml(q.explanation || "")}`;
        }
        block.appendChild(exp);

        // Toggle button visibility
        const showBtn = block.querySelector('[data-action="show-answer"]');
        const clearBtn = block.querySelector('[data-action="clear-answer"]');
        if (showBtn) showBtn.style.display = "none";
        if (clearBtn) clearBtn.style.display = "inline-block";
      }
    }
  });

  updateNavButtons();
}

function updateNavButtons() {
  const totalPages = Math.ceil(
    currentCert.questions.length / QUESTIONS_PER_PAGE
  );
  document
    .querySelectorAll('[data-nav="first"],[data-nav="prev"]')
    .forEach((b) => {
      b.disabled = currentPage === 0;
      b.style.opacity = currentPage === 0 ? "0.5" : "1";
    });
  document
    .querySelectorAll('[data-nav="next"],[data-nav="last"]')
    .forEach((b) => {
      b.disabled = currentPage >= totalPages - 1;
      b.style.opacity = currentPage >= totalPages - 1 ? "0.5" : "1";
    });
}

document.getElementById("back-btn").addEventListener("click", () => {
  stopTimer();
  document.getElementById("timer-display").classList.add("hidden");
  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("mode-selection").classList.remove("hidden");
});

document.addEventListener("click", (e) => {
  if (e.target.matches('[data-nav="first"]')) {
    currentPage = 0;
    renderQuestions();
    window.scrollTo(0, 0);
  } else if (e.target.matches('[data-nav="prev"]') && currentPage > 0) {
    currentPage--;
    renderQuestions();
    window.scrollTo(0, 0);
  } else if (e.target.matches('[data-nav="next"]')) {
    currentPage++;
    renderQuestions();
    window.scrollTo(0, 0);
  } else if (e.target.matches('[data-nav="last"]')) {
    currentPage =
      Math.ceil(currentCert.questions.length / QUESTIONS_PER_PAGE) - 1;
    renderQuestions();
    window.scrollTo(0, 0);
  } else if (e.target.matches('[data-action="confirm-page"]'))
    confirmPageAnswers();
  else if (e.target.matches('[data-action="confirm-all"]')) {
    // Show confirmation modal
    document.getElementById("confirm-all-modal").classList.remove("hidden");
  } else if (e.target.matches('[data-action="clear"]')) clearAnswers();
  else if (e.target.matches('[data-action="show-answer"]')) {
    const qid = e.target.dataset.qid;
    showSingleAnswer(qid);
  } else if (e.target.matches('[data-action="clear-answer"]')) {
    const qid = e.target.dataset.qid;
    clearSingleAnswer(qid);
  } else if (e.target.matches('[data-action="back-to-quiz"]')) {
    document.getElementById("summary").classList.add("hidden");
    document.getElementById("quiz").classList.remove("hidden");
    window.scrollTo(0, 0);
  } else if (e.target.matches('[data-action="restart-quiz"]')) {
    document.getElementById("summary").classList.add("hidden");
    document.getElementById("mode-selection").classList.remove("hidden");
  } else if (e.target.matches(".summary-question-box")) {
    const qNum = parseInt(e.target.dataset.qnum);
    showQuestionDetail(qNum);
  }
});

// Confirm All Modal - Yes button
document.getElementById("confirm-all-yes").addEventListener("click", () => {
  document.getElementById("confirm-all-modal").classList.add("hidden");
  confirmAllAnswers();
});

function showSingleAnswer(qid) {
  const q = currentCert.questions.find((question) => question.id === qid);
  if (!q) return;

  const selected = Array.from(
    document.querySelectorAll(`input[name="opt_${qid}"]:checked`)
  ).map((i) => i.value);
  const block = document.querySelector(`[data-qid="${qid}"]`);

  // Remove previous feedback if it exists
  block.querySelectorAll(".option").forEach((el) => {
    el.classList.remove("correct", "incorrect");
  });
  const oldExp = block.querySelector(".explanation");
  if (oldExp) oldExp.remove();

  // Save user answers if any
  if (selected.length > 0) {
    userAnswers[qid] = selected;
  }
  revealed[qid] = true;

  // Show correct answers
  const correctSet = new Set(q.correct);
  block.querySelectorAll(".option").forEach((el) => {
    const optId = el.querySelector("input").value;
    if (correctSet.has(optId)) {
      el.classList.add("correct");
    } else if (selected.includes(optId)) {
      el.classList.add("incorrect");
    }
  });

  // Show explanation
  const isCorrect =
    selected.length > 0 &&
    selected.length === q.correct.length &&
    selected.every((id) => correctSet.has(id));
  const exp = document.createElement("div");
  exp.className = "explanation";
  if (selected.length === 0) {
    exp.innerHTML = `<strong>❌ Não respondida</strong><br>${escapeHtml(
      q.explanation || ""
    )}`;
  } else {
    exp.innerHTML = `<strong>${
      isCorrect ? "✅ Correto!" : "❌ Incorreto"
    }</strong><br>${escapeHtml(q.explanation || "")}`;
  }
  block.appendChild(exp);

  // Toggle button visibility
  const showBtn = block.querySelector('[data-action="show-answer"]');
  const clearBtn = block.querySelector('[data-action="clear-answer"]');
  if (showBtn) showBtn.style.display = "none";
  if (clearBtn) clearBtn.style.display = "inline-block";
}

function clearSingleAnswer(qid) {
  const block = document.querySelector(`[data-qid="${qid}"]`);
  if (block) {
    // Remove visual feedback
    block.querySelectorAll(".option").forEach((el) => {
      el.classList.remove("correct", "incorrect");
    });
    const exp = block.querySelector(".explanation");
    if (exp) exp.remove();
    // Uncheck all inputs
    block.querySelectorAll("input").forEach((input) => (input.checked = false));

    // Toggle button visibility
    const showBtn = block.querySelector('[data-action="show-answer"]');
    const clearBtn = block.querySelector('[data-action="clear-answer"]');
    if (showBtn) showBtn.style.display = "inline-block";
    if (clearBtn) clearBtn.style.display = "none";
  }
  delete userAnswers[qid];
  delete revealed[qid];
}

function confirmAllAnswers() {
  // Save all answers from all pages before showing summary
  currentCert.questions.forEach((q) => {
    const selected = Array.from(
      document.querySelectorAll(`input[name="opt_${q.id}"]:checked`)
    ).map((i) => i.value);
    if (selected.length > 0) {
      userAnswers[q.id] = selected;
    }
  });

  // Navigate to summary page
  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("summary").classList.remove("hidden");
  window.scrollTo(0, 0);
  showSummary();
}

function confirmPageAnswers() {
  const start = currentPage * QUESTIONS_PER_PAGE;
  const end = Math.min(
    start + QUESTIONS_PER_PAGE,
    currentCert.questions.length
  );
  const pageQuestions = currentCert.questions.slice(start, end);

  pageQuestions.forEach((q) => {
    const selected = Array.from(
      document.querySelectorAll(`input[name="opt_${q.id}"]:checked`)
    ).map((i) => i.value);
    const block = document.querySelector(`[data-qid="${q.id}"]`);

    // Remove previous feedback if it exists
    block.querySelectorAll(".option").forEach((el) => {
      el.classList.remove("correct", "incorrect");
    });
    const oldExp = block.querySelector(".explanation");
    if (oldExp) oldExp.remove();

    // Save user answers if any
    if (selected.length > 0) {
      userAnswers[q.id] = selected;
    }
    revealed[q.id] = true;

    // Always show correct answers
    const correctSet = new Set(q.correct);
    block.querySelectorAll(".option").forEach((el) => {
      const optId = el.querySelector("input").value;
      if (correctSet.has(optId)) {
        el.classList.add("correct");
      } else if (selected.includes(optId)) {
        el.classList.add("incorrect");
      }
    });

    // Show explanation
    const isCorrect =
      selected.length > 0 &&
      selected.length === q.correct.length &&
      selected.every((id) => correctSet.has(id));
    const exp = document.createElement("div");
    exp.className = "explanation";
    if (selected.length === 0) {
      exp.innerHTML = `<strong>❌ Não respondida</strong><br>${escapeHtml(
        q.explanation || ""
      )}`;
    } else {
      exp.innerHTML = `<strong>${
        isCorrect ? "✅ Correto!" : "❌ Incorreto"
      }</strong><br>${escapeHtml(q.explanation || "")}`;
    }
    block.appendChild(exp);

    // Toggle button visibility
    const showBtn = block.querySelector('[data-action="show-answer"]');
    const clearBtn = block.querySelector('[data-action="clear-answer"]');
    if (showBtn) showBtn.style.display = "none";
    if (clearBtn) clearBtn.style.display = "inline-block";
  });

  showPageScore(pageQuestions);
}

function showPageScore(pageQuestions) {
  let score = 0,
    answered = 0;

  pageQuestions.forEach((q) => {
    const sel = userAnswers[q.id] || [];
    if (sel.length > 0) answered++;
    if (
      sel.length === q.correct.length &&
      sel.every((id) => q.correct.includes(id))
    )
      score++;
  });

  const pct = answered > 0 ? Math.round((score / answered) * 100) : 0;
  const passingScore = currentCert.passingScore || 70;
  const pass = pct >= passingScore;
  const start = currentPage * QUESTIONS_PER_PAGE;
  const end = Math.min(
    start + QUESTIONS_PER_PAGE,
    currentCert.questions.length
  );

  document.getElementById("page-result-area").classList.remove("hidden");
  document.getElementById(
    "page-result-area"
  ).innerHTML = `<div class="page-result-box ${
    pass ? "pass" : "fail"
  }"><div style="font-size:18px;font-weight:600;margin-bottom:8px">📄 Resultado desta página (${
    start + 1
  }-${end})</div><div style="font-size:28px;font-weight:bold;color:${
    pass ? "#0b8a3f" : "#d32f2f"
  }">${score}/${
    pageQuestions.length
  }</div><div style="font-size:20px;margin-top:6px;font-weight:600;color:${
    pass ? "#0b8a3f" : "#d32f2f"
  }">${pct}%</div><div style="margin-top:8px">${answered} de ${
    pageQuestions.length
  } respondidas</div></div>`;
}

function showScore() {
  let score = 0,
    answered = 0;
  currentCert.questions.forEach((q) => {
    const sel = userAnswers[q.id] || [];
    if (sel.length > 0) answered++;
    if (
      sel.length === q.correct.length &&
      sel.every((id) => q.correct.includes(id))
    )
      score++;
  });
  const pct = Math.round((score / currentCert.questions.length) * 100);
  const passingScore = currentCert.passingScore || 70;
  const pass = pct >= passingScore;
  document.getElementById("result-area").classList.remove("hidden");
  document.getElementById(
    "result-area"
  ).innerHTML = `<div style="text-align:center;padding:24px;background:${
    pass ? "#e6ffed" : "#ffeef0"
  };border-radius:8px;border:2px solid ${
    pass ? "#b7f2c7" : "#ffcad3"
  }"><div style="font-size:48px">${
    pass ? "" : ""
  }</div><div style="font-size:32px;font-weight:bold;color:${
    pass ? "#0b8a3f" : "#d32f2f"
  }">${score}/${
    currentCert.questions.length
  }</div><div style="font-size:24px;margin-top:8px;font-weight:600;color:${
    pass ? "#0b8a3f" : "#d32f2f"
  }">${pct}%</div><div style="margin-top:12px">${answered} de ${
    currentCert.questions.length
  } respondidas</div><div style="margin-top:16px;font-size:20px;font-weight:600;color:${
    pass ? "#0b8a3f" : "#d32f2f"
  }">${pass ? " Aprovado!" : "Continue estudando!"}</div></div>`;
}

function clearAnswers() {
  const start = currentPage * QUESTIONS_PER_PAGE;
  const end = Math.min(
    start + QUESTIONS_PER_PAGE,
    currentCert.questions.length
  );
  currentCert.questions.slice(start, end).forEach((q) => {
    const block = document.querySelector(`[data-qid="${q.id}"]`);
    if (block) {
      // Remove visual feedback
      block.querySelectorAll(".option").forEach((el) => {
        el.classList.remove("correct", "incorrect");
      });
      const exp = block.querySelector(".explanation");
      if (exp) exp.remove();
      // Uncheck all inputs
      block
        .querySelectorAll("input")
        .forEach((input) => (input.checked = false));

      // Toggle button visibility
      const showBtn = block.querySelector('[data-action="show-answer"]');
      const clearBtn = block.querySelector('[data-action="clear-answer"]');
      if (showBtn) showBtn.style.display = "inline-block";
      if (clearBtn) clearBtn.style.display = "none";
    }
    delete userAnswers[q.id];
    delete revealed[q.id];
  });
  document.getElementById("result-area").classList.add("hidden");
  document.getElementById("page-result-area").classList.add("hidden");
}

function showSummary() {
  // Stop the timer
  stopTimer();
  const elapsedTime = getElapsedTime();
  const timeExceeded = timeLimit && elapsedTime > timeLimit;

  document.getElementById(
    "summary-title"
  ).textContent = `Resumo: ${currentCert.name}`;

  let correct = 0,
    incorrect = 0,
    unanswered = 0;

  // Calculate overall results
  currentCert.questions.forEach((q) => {
    const selected = userAnswers[q.id] || [];
    if (selected.length === 0) {
      unanswered++;
    } else {
      const isCorrect =
        selected.length === q.correct.length &&
        selected.every((id) => q.correct.includes(id));
      if (isCorrect) correct++;
      else incorrect++;
    }
  });

  const total = currentCert.questions.length;
  const answered = correct + incorrect;
  const pct = answered > 0 ? Math.round((correct / total) * 100) : 0;
  const passingScore = currentCert.passingScore || 65;
  const pass = pct >= passingScore;

  // Calculate difficulty-based scores
  const difficultyStats = {
    easy: { correct: 0, incorrect: 0, unanswered: 0, total: 0 },
    medium: { correct: 0, incorrect: 0, unanswered: 0, total: 0 },
    hard: { correct: 0, incorrect: 0, unanswered: 0, total: 0 },
  };

  currentCert.questions.forEach((q) => {
    const difficulty = q.difficulty || 5;
    let level = "medium";
    if (difficulty <= 3) level = "easy";
    else if (difficulty >= 7) level = "hard";

    difficultyStats[level].total++;

    const selected = userAnswers[q.id] || [];
    if (selected.length === 0) {
      difficultyStats[level].unanswered++;
    } else {
      const isCorrect =
        selected.length === q.correct.length &&
        selected.every((id) => q.correct.includes(id));
      if (isCorrect) {
        difficultyStats[level].correct++;
      } else {
        difficultyStats[level].incorrect++;
      }
    }
  });

  // Calculate category-based scores
  const categoryStats = {};

  // First, collect categories that actually exist in the test questions
  currentCert.questions.forEach((q) => {
    if (q.category && q.category.length > 0) {
      const catName = q.category[0];
      if (!categoryStats[catName]) {
        // Find description from certificate categories if available
        const category = currentCert.categories
          ? currentCert.categories.find((c) => c.name === catName)
          : null;
        categoryStats[catName] = {
          correct: 0,
          total: 0,
          description: category ? category.description : "",
        };
      }
      categoryStats[catName].total++;

      const selected = userAnswers[q.id] || [];
      if (selected.length > 0) {
        const isCorrect =
          selected.length === q.correct.length &&
          selected.every((id) => q.correct.includes(id));
        if (isCorrect) {
          categoryStats[catName].correct++;
        }
      }
    }
  });

  // Generate difficulty evaluation message
  let difficultyEvaluation = "";
  let difficultyIcon = "📊";
  let difficultyColor = "#333";

  const easyPct =
    difficultyStats.easy.total > 0
      ? Math.round(
          (difficultyStats.easy.correct / difficultyStats.easy.total) * 100
        )
      : 0;
  const mediumPct =
    difficultyStats.medium.total > 0
      ? Math.round(
          (difficultyStats.medium.correct / difficultyStats.medium.total) * 100
        )
      : 0;
  const hardPct =
    difficultyStats.hard.total > 0
      ? Math.round(
          (difficultyStats.hard.correct / difficultyStats.hard.total) * 100
        )
      : 0;

  const hasEasy = difficultyStats.easy.total > 0;
  const hasMedium = difficultyStats.medium.total > 0;
  const hasHard = difficultyStats.hard.total > 0;

  // Determine performance level and provide feedback
  if (hasEasy && easyPct >= 80) {
    difficultyIcon = "🌟";
    difficultyColor = "#28a745";
    difficultyEvaluation = `<strong>Excelente!</strong> Você dominou as questões fáceis (${easyPct}%). `;
    if (hasMedium) {
      if (mediumPct >= 70) {
        difficultyEvaluation += `Seu desempenho nas questões médias também está ótimo (${mediumPct}%). `;
        if (hasHard) {
          if (hardPct >= 50) {
            difficultyEvaluation += `E você está se saindo bem até nas questões difíceis (${hardPct}%)! Continue assim!`;
          } else {
            difficultyEvaluation += `Nas questões difíceis (${hardPct}%), há espaço para melhorar, mas você está no caminho certo.`;
          }
        } else {
          difficultyEvaluation += `Continue assim!`;
        }
      } else {
        difficultyEvaluation += `Porém, as questões médias (${mediumPct}%) merecem mais atenção. Revise esses conceitos intermediários.`;
      }
    } else if (hasHard) {
      if (hardPct >= 50) {
        difficultyEvaluation += `E você está se saindo bem nas questões difíceis (${hardPct}%)! Continue assim!`;
      } else {
        difficultyEvaluation += `Nas questões difíceis (${hardPct}%), há espaço para melhorar. Continue estudando!`;
      }
    } else {
      difficultyEvaluation += `Continue assim!`;
    }
  } else if (hasEasy && easyPct >= 60) {
    difficultyIcon = "💪";
    difficultyColor = "#ffc107";
    difficultyEvaluation = `<strong>Bom progresso!</strong> Você acertou ${easyPct}% das questões fáceis. Com mais prática, você pode melhorar! `;
    if (hasMedium) {
      if (mediumPct < 50) {
        difficultyEvaluation += `Foque em fortalecer os conceitos intermediários (${mediumPct}% nas questões médias).`;
      } else {
        difficultyEvaluation += `Seu desempenho nas questões médias (${mediumPct}%) está razoável. Continue estudando!`;
      }
    }
  } else if (hasEasy && easyPct < 60) {
    difficultyIcon = "📚";
    difficultyColor = "#dc3545";
    difficultyEvaluation = `<strong>Continue estudando!</strong> Você acertou apenas ${easyPct}% das questões fáceis, que são fundamentais. `;
    difficultyEvaluation += `Recomendamos revisar os conceitos básicos antes de avançar. `;
    if (difficultyStats.easy.unanswered > 0) {
      difficultyEvaluation += `Você deixou ${difficultyStats.easy.unanswered} questões fáceis sem responder. `;
    }
    difficultyEvaluation += `Pratique mais e refaça o teste!`;
  } else if (!hasEasy && hasMedium) {
    // Caso não tenha questões fáceis, avaliar pelas médias
    if (mediumPct >= 70) {
      difficultyIcon = "🌟";
      difficultyColor = "#28a745";
      difficultyEvaluation = `<strong>Excelente!</strong> Você dominou as questões de nível médio (${mediumPct}%). `;
      if (hasHard) {
        if (hardPct >= 50) {
          difficultyEvaluation += `E você está se saindo bem nas questões difíceis (${hardPct}%)! Continue assim!`;
        } else {
          difficultyEvaluation += `Nas questões difíceis (${hardPct}%), há espaço para melhorar. Continue praticando!`;
        }
      } else {
        difficultyEvaluation += `Continue assim!`;
      }
    } else if (mediumPct >= 50) {
      difficultyIcon = "💪";
      difficultyColor = "#ffc107";
      difficultyEvaluation = `<strong>Bom progresso!</strong> Você acertou ${mediumPct}% das questões de nível médio. Com mais prática, você pode melhorar! `;
      if (hasHard) {
        difficultyEvaluation += `Nas questões difíceis você obteve ${hardPct}%. Continue estudando!`;
      }
    } else {
      difficultyIcon = "📚";
      difficultyColor = "#dc3545";
      difficultyEvaluation = `<strong>Continue estudando!</strong> Você acertou apenas ${mediumPct}% das questões de nível médio. `;
      difficultyEvaluation += `Revise os conceitos e pratique mais!`;
    }
  } else if (!hasEasy && !hasMedium && hasHard) {
    // Caso só tenha questões difíceis
    if (hardPct >= 50) {
      difficultyIcon = "🌟";
      difficultyColor = "#28a745";
      difficultyEvaluation = `<strong>Excelente!</strong> Você está se saindo muito bem nas questões difíceis (${hardPct}%)! Continue assim!`;
    } else if (hardPct >= 30) {
      difficultyIcon = "💪";
      difficultyColor = "#ffc107";
      difficultyEvaluation = `<strong>Bom progresso!</strong> Você acertou ${hardPct}% das questões difíceis. Continue praticando!`;
    } else {
      difficultyIcon = "📚";
      difficultyColor = "#dc3545";
      difficultyEvaluation = `<strong>Continue estudando!</strong> As questões difíceis requerem mais prática. Você acertou ${hardPct}%. Revise os conceitos e tente novamente!`;
    }
  } else {
    // Fallback genérico
    difficultyIcon = "📊";
    difficultyColor = "#666";
    difficultyEvaluation = `<strong>Análise de desempenho:</strong> `;
    const parts = [];
    if (hasEasy) parts.push(`Fáceis: ${easyPct}%`);
    if (hasMedium) parts.push(`Médias: ${mediumPct}%`);
    if (hasHard) parts.push(`Difíceis: ${hardPct}%`);
    difficultyEvaluation +=
      parts.join(" • ") + ". Continue praticando para melhorar!";
  }

  // Determine difficulty container class based on actual performance
  let difficultyContainerClass = "needs-work";

  // Calculate overall difficulty-weighted performance
  if (hasEasy) {
    // If there are easy questions, they are the foundation
    if (easyPct >= 80) {
      // Strong foundation - check if overall performance is excellent
      if ((!hasMedium || mediumPct >= 70) && (!hasHard || hardPct >= 40)) {
        difficultyContainerClass = "excellent";
      } else if (!hasMedium || mediumPct >= 50 || !hasHard || hardPct >= 30) {
        difficultyContainerClass = "good";
      }
    } else if (easyPct >= 60) {
      // Decent foundation - good progress
      difficultyContainerClass = "good";
    }
  } else if (hasMedium) {
    // No easy questions - evaluate by medium
    if (mediumPct >= 70) {
      if (!hasHard || hardPct >= 40) {
        difficultyContainerClass = "excellent";
      } else {
        difficultyContainerClass = "good";
      }
    } else if (mediumPct >= 50) {
      difficultyContainerClass = "good";
    }
  } else if (hasHard) {
    // Only hard questions - adjust expectations
    if (hardPct >= 50) {
      difficultyContainerClass = "excellent";
    } else if (hardPct >= 30) {
      difficultyContainerClass = "good";
    }
  }

  // Show score
  document.getElementById("summary-score").innerHTML = `
    <div class="summary-score-main ${pass ? "pass" : "fail"}">
      <div style="font-size:42px;font-weight:bold;color:${
        pass ? "#0b8a3f" : "#d32f2f"
      };margin-bottom:10px">${correct}/${total}</div>
      <div style="font-size:32px;font-weight:600;color:${
        pass ? "#0b8a3f" : "#d32f2f"
      };margin-bottom:15px">${pct}%</div>
      <div style="font-size:24px;font-weight:600;color:${
        pass ? "#0b8a3f" : "#d32f2f"
      };margin-bottom:15px">${pass ? "✅ APROVADO!" : "❌ NÃO APROVADO"}</div>
      <div class="summary-stats-divider ${pass ? "pass" : "fail"}">
        <span class="stat-correct">✓ ${correct} Corretas</span> <span class="stat-separator">•</span> 
        <span class="stat-incorrect">✗ ${incorrect} Incorretas</span> <span class="stat-separator">•</span> 
        <span class="stat-unanswered">○ ${unanswered} Não Respondidas</span>
      </div>
      <div class="summary-time-info ${pass ? "pass" : "fail"}">
        <strong>⏱️ Tempo:</strong> ${formatTime(elapsedTime)}
        ${
          timeLimit
            ? ` <span class="time-limit ${
                timeExceeded ? "exceeded" : "ok"
              }">(Limite: ${formatTime(timeLimit)}${
                timeExceeded ? " - EXCEDIDO" : ""
              })</span>`
            : ""
        }
      </div>
    </div>
    
    <div class="difficulty-analysis-container difficulty-${difficultyContainerClass}">
      <h3 class="difficulty-analysis-title">
        <span style="font-size:32px">${difficultyIcon}</span>
        Análise por Dificuldade
      </h3>
      
      <div class="difficulty-cards-grid">
        ${
          difficultyStats.easy.total > 0
            ? `
          <div class="difficulty-card difficulty-easy difficulty-${
            easyPct >= 80 ? "excellent" : easyPct >= 60 ? "good" : "poor"
          }">
            <div class="difficulty-label">😊 Fácil (1-3)</div>
            <div class="difficulty-score">${difficultyStats.easy.correct}/${
                difficultyStats.easy.total
              }</div>
            <div class="difficulty-percent">${easyPct}%</div>
            ${
              difficultyStats.easy.unanswered > 0
                ? `<div class="difficulty-unanswered">${difficultyStats.easy.unanswered} não respondidas</div>`
                : ""
            }
          </div>
        `
            : ""
        }
        
        ${
          difficultyStats.medium.total > 0
            ? `
          <div class="difficulty-card difficulty-medium difficulty-${
            mediumPct >= 70 ? "excellent" : mediumPct >= 50 ? "good" : "poor"
          }">
            <div class="difficulty-label">😐 Média (4-6)</div>
            <div class="difficulty-score">${difficultyStats.medium.correct}/${
                difficultyStats.medium.total
              }</div>
            <div class="difficulty-percent">${mediumPct}%</div>
            ${
              difficultyStats.medium.unanswered > 0
                ? `<div class="difficulty-unanswered">${difficultyStats.medium.unanswered} não respondidas</div>`
                : ""
            }
          </div>
        `
            : ""
        }
        
        ${
          difficultyStats.hard.total > 0
            ? `
          <div class="difficulty-card difficulty-hard difficulty-${
            hardPct >= 50 ? "excellent" : hardPct >= 30 ? "good" : "poor"
          }">
            <div class="difficulty-label">😤 Difícil (7-10)</div>
            <div class="difficulty-score">${difficultyStats.hard.correct}/${
                difficultyStats.hard.total
              }</div>
            <div class="difficulty-percent">${hardPct}%</div>
            ${
              difficultyStats.hard.unanswered > 0
                ? `<div class="difficulty-unanswered">${difficultyStats.hard.unanswered} não respondidas</div>`
                : ""
            }
          </div>
        `
            : ""
        }
      </div>
      
      <div class="difficulty-evaluation">
        ${difficultyEvaluation}
      </div>
    </div>
    
    ${
      Object.keys(categoryStats).length > 0
        ? `
      <div style="margin-top:30px">
        <h3 class="category-title" style="margin-bottom:15px;font-size:20px">📊 Desempenho por Categoria</h3>
        <div id="category-grid" style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px">
          ${Object.entries(categoryStats)
            .map(([catName, stats]) => {
              const catPct =
                stats.total > 0
                  ? Math.round((stats.correct / stats.total) * 100)
                  : 0;
              const catPass = catPct >= passingScore;
              const category = currentCert.categories.find(
                (c) => c.name === catName
              );
              const description = category ? category.description : "";
              return `
              <div class="category-card" data-category="${escapeHtml(
                catName
              )}" style="position:relative;border:2px solid ${
                catPass ? "#28a745" : "#dc3545"
              };border-radius:6px;padding:12px;cursor:pointer">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
                  <div style="font-weight:600;font-size:15px;flex:1">${escapeHtml(
                    catName
                  )}</div>
                  <div style="font-size:16px;font-weight:bold;color:${
                    catPass ? "#28a745" : "#dc3545"
                  };white-space:nowrap">${stats.correct}/${stats.total}</div>
                  <div style="font-size:18px;font-weight:bold;color:${
                    catPass ? "#28a745" : "#dc3545"
                  };min-width:50px;text-align:right">${catPct}%</div>
                </div>
                <div class="progress-bar" style="margin-top:8px;border-radius:3px;height:6px;overflow:hidden">
                  <div style="background:${
                    catPass ? "#28a745" : "#dc3545"
                  };height:100%;width:${catPct}%;transition:width 0.3s ease"></div>
                </div>
                <div class="category-description" data-description="${escapeHtml(
                  description
                )}">
                  <div class="category-description-content">${escapeHtml(
                    description
                  )}</div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `
        : ""
    }
  `;

  // Create grid of questions
  const grid = currentCert.questions
    .map((q, idx) => {
      const selected = userAnswers[q.id] || [];
      let status = "unanswered";

      if (selected.length > 0) {
        const isCorrect =
          selected.length === q.correct.length &&
          selected.every((id) => q.correct.includes(id));
        status = isCorrect ? "correct" : "incorrect";
      }

      return `<div class="summary-question-box ${status}" data-qnum="${
        idx + 1
      }">${idx + 1}</div>`;
    })
    .join("");

  document.getElementById("summary-grid").innerHTML = grid;
  document.getElementById("summary-detail").classList.add("hidden");

  // Add click event listener for category cards using event delegation
  setTimeout(() => {
    const categoryGrid = document.getElementById("category-grid");
    if (categoryGrid) {
      // Remove old listener if exists to prevent duplicates
      const oldHandler = categoryGrid._clickHandler;
      if (oldHandler) {
        categoryGrid.removeEventListener("click", oldHandler);
      }

      // Create new handler
      const clickHandler = (e) => {
        const card = e.target.closest(".category-card");
        if (card) {
          e.stopPropagation();
          const description = card.querySelector(".category-description");
          const isOpen = description.classList.contains("open");

          // Close all other descriptions
          document.querySelectorAll(".category-card").forEach((c) => {
            c.classList.remove("expanded");
            const desc = c.querySelector(".category-description");
            if (desc) {
              desc.classList.remove("open");
            }
          });

          // Toggle current description
          if (!isOpen) {
            card.classList.add("expanded");
            description.classList.add("open");
          }
        }
      };

      categoryGrid._clickHandler = clickHandler;
      categoryGrid.addEventListener("click", clickHandler);
    }
  }, 0);
}

function showQuestionDetail(qNum) {
  const q = currentCert.questions[qNum - 1];
  const selected = userAnswers[q.id] || [];
  const correctSet = new Set(q.correct);

  let status = "unanswered";
  if (selected.length > 0) {
    const isCorrect =
      selected.length === q.correct.length &&
      selected.every((id) => correctSet.has(id));
    status = isCorrect ? "correct" : "incorrect";
  }

  // Update selected box in grid
  document.querySelectorAll(".summary-question-box").forEach((box) => {
    box.classList.remove("selected");
  });
  document.querySelector(`[data-qnum="${qNum}"]`).classList.add("selected");

  // Build options HTML
  const optionsHtml = q.options
    .map((opt) => {
      const isCorrectAnswer = correctSet.has(opt.id);
      const wasSelected = selected.includes(opt.id);
      let optClass = "";
      let icon = "";

      if (isCorrectAnswer) {
        optClass = "correct";
        icon = "✓";
      } else if (wasSelected) {
        optClass = "incorrect";
        icon = "✗";
      }

      return `<div class="option ${optClass}">
      ${icon ? `<strong>${icon}</strong> ` : ""}
      ${
        wasSelected && !isCorrectAnswer
          ? "<strong>[Sua resposta] </strong>"
          : ""
      }
      ${isCorrectAnswer ? "<strong>[Resposta correta] </strong>" : ""}
      ${escapeHtml(opt.text)}
    </div>`;
    })
    .join("");

  let statusText = "";
  let statusColor = "";
  if (status === "correct") {
    statusText = "✅ CORRETO!";
    statusColor = "#28a745";
  } else if (status === "incorrect") {
    statusText = "❌ INCORRETO";
    statusColor = "#dc3545";
  } else {
    statusText = "○ NÃO RESPONDIDA";
    statusColor = "#ffc107";
  }

  document.getElementById("summary-detail").innerHTML = `
    <div class="status-badge" style="text-align:center;margin-bottom:15px;padding:12px;border-radius:6px">
      <span style="font-size:20px;font-weight:600;color:${statusColor}">${statusText}</span>
    </div>
    <div class="question-text">Questão ${qNum}: ${escapeHtml(q.text)}</div>
    <div style="margin:16px 0">${optionsHtml}</div>
    ${
      q.explanation
        ? `<div class="explanation"><strong>Explicação:</strong><br>${escapeHtml(
            q.explanation
          )}</div>`
        : ""
    }
  `;

  document.getElementById("summary-detail").classList.remove("hidden");
  document
    .getElementById("summary-detail")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Global click handler to close category descriptions when clicking outside
document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".category-card") &&
    !e.target.closest("#category-grid")
  ) {
    document.querySelectorAll(".category-card").forEach((card) => {
      card.classList.remove("expanded");
    });
    document.querySelectorAll(".category-description").forEach((desc) => {
      desc.classList.remove("open");
    });
  }
});

// ============== Keyboard Shortcuts for Accessibility ==============
document.addEventListener("keydown", (e) => {
  // Only activate shortcuts when not typing in an input field
  if (e.target.matches("input, textarea, select")) return;

  const quizVisible = !document
    .getElementById("quiz")
    .classList.contains("hidden");
  const summaryVisible = !document
    .getElementById("summary")
    .classList.contains("hidden");

  // Quiz navigation shortcuts
  if (quizVisible) {
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        if (currentPage > 0) {
          currentPage--;
          renderQuestions();
          window.scrollTo(0, 0);
        }
        break;

      case "ArrowRight":
        e.preventDefault();
        const totalPages = Math.ceil(
          currentCert.questions.length / QUESTIONS_PER_PAGE
        );
        if (currentPage < totalPages - 1) {
          currentPage++;
          renderQuestions();
          window.scrollTo(0, 0);
        }
        break;

      case "Enter":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          document.querySelector('[data-action="confirm-all"]')?.click();
        }
        break;

      case "Home":
        e.preventDefault();
        currentPage = 0;
        renderQuestions();
        window.scrollTo(0, 0);
        break;

      case "End":
        e.preventDefault();
        currentPage =
          Math.ceil(currentCert.questions.length / QUESTIONS_PER_PAGE) - 1;
        renderQuestions();
        window.scrollTo(0, 0);
        break;

      case "Escape":
        e.preventDefault();
        const confirmModal = document.getElementById("confirm-all-modal");
        const timeModal = document.getElementById("time-over-modal");
        if (!confirmModal.classList.contains("hidden")) {
          confirmModal.classList.add("hidden");
        } else if (!timeModal.classList.contains("hidden")) {
          timeModal.classList.add("hidden");
        }
        break;
      case "?":
        e.preventDefault();
        showKeyboardShortcuts();
        break;
    }
  }

  // Summary navigation shortcuts
  if (summaryVisible) {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        document.querySelector('[data-action="back-to-quiz"]')?.click();
        break;

      case "?":
        e.preventDefault();
        showKeyboardShortcuts();
        break;
    }
  }

  // Global shortcuts
  if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    document.getElementById("theme-toggle").click();
  }
});

// Show keyboard shortcuts modal
function showKeyboardShortcuts() {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "shortcuts-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-labelledby", "shortcuts-title");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `
    <div class="modal-content" style="max-width:600px">
      <h2 id="shortcuts-title">⌨️ Atalhos de Teclado</h2>
      <div style="text-align:left;margin:20px 0">
        <h3 style="margin-top:0;color:var(--text-primary)">Durante o Quiz</h3>
        <table style="width:100%;border-collapse:collapse" role="table">
          <tbody>
            <tr><td style="padding:8px;border-bottom:1px solid var(--border-light)"><kbd>←</kbd></td><td style="padding:8px;border-bottom:1px solid var(--border-light)">Página anterior</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid var(--border-light)"><kbd>→</kbd></td><td style="padding:8px;border-bottom:1px solid var(--border-light)">Próxima página</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid var(--border-light)"><kbd>Home</kbd></td><td style="padding:8px;border-bottom:1px solid var(--border-light)">Primeira página</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid var(--border-light)"><kbd>End</kbd></td><td style="padding:8px;border-bottom:1px solid var(--border-light)">Última página</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid var(--border-light)"><kbd>Enter</kbd></td><td style="padding:8px;border-bottom:1px solid var(--border-light)">Confirmar página</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid var(--border-light)"><kbd>Ctrl/Cmd + Enter</kbd></td><td style="padding:8px;border-bottom:1px solid var(--border-light)">Confirmar tudo</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid var(--border-light)"><kbd>Esc</kbd></td><td style="padding:8px;border-bottom:1px solid var(--border-light)">Fechar modal</td></tr>
          </tbody>
        </table>
        
        <h3 style="margin-top:20px;color:var(--text-primary)">Global</h3>
        <table style="width:100%;border-collapse:collapse" role="table">
          <tbody>
            <tr><td style="padding:8px;border-bottom:1px solid var(--border-light)"><kbd>Ctrl/Cmd + D</kbd></td><td style="padding:8px;border-bottom:1px solid var(--border-light)">Alternar tema claro/escuro</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid var(--border-light)"><kbd>?</kbd></td><td style="padding:8px;border-bottom:1px solid var(--border-light)">Mostrar atalhos</td></tr>
          </tbody>
        </table>
      </div>
      <button class="btn primary" onclick="document.getElementById('shortcuts-modal').remove()">Fechar</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Focus the close button
  setTimeout(() => {
    modal.querySelector(".btn").focus();
  }, 100);

  // Close on Escape
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      modal.remove();
    }
  });
}

// Initialize shortcuts help button
document.addEventListener("DOMContentLoaded", () => {
  const shortcutsBtn = document.getElementById("shortcuts-help");
  if (shortcutsBtn) {
    shortcutsBtn.addEventListener("click", showKeyboardShortcuts);
  }
});
