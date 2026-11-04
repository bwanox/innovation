/**
 * INGENIERIE DE L'INNOVATION TECHNOLOGIQUE & INDUSTRIALISATION
 * Main Application Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const state = {
    currentView: "dashboard",
    theme: localStorage.getItem("innov_theme") || "light",
    activeChapter: null,
    
    // QCM State
    quiz: {
      mode: "training", // 'training' | 'exam'
      filter: "all",
      questions: [],
      currentIndex: 0,
      userAnswers: {}, // { qId: selectedIndex }
      score: 0,
      examSubmitted: false,
      examTimer: null,
      examTimeRemaining: 30 * 60, // 30 minutes in seconds
    },

    // Flashcards State
    flashcards: {
      filter: "all",
      items: [],
      currentIndex: 0,
      isFlipped: false,
      mastered: JSON.parse(localStorage.getItem("innov_fc_mastered") || "[]"),
    },

    // Read Sections Progress Tracking
    readSections: JSON.parse(localStorage.getItem("innov_read_sections") || "[]")
  };

  // Set Theme
  document.documentElement.setAttribute("data-theme", state.theme);

  // Initialize
  initNavigation();
  initThemeToggle();
  initSearch();
  initDashboard();
  renderAllLessons();
  initQuiz();
  initFlashcards();
  initSimulators();
  updateProgressUI();

  // ==========================================
  // NAVIGATION & VIEWS
  // ==========================================
  function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const sidebar = document.querySelector(".app-sidebar");

    navItems.forEach(item => {
      item.addEventListener("click", () => {
        const viewId = item.getAttribute("data-view");
        switchView(viewId);
        if (window.innerWidth <= 992) {
          sidebar.classList.remove("open");
        }
      });
    });

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
      });
    }

    // Direct chapter clicks from dashboard
    document.addEventListener("click", (e) => {
      const tile = e.target.closest(".chapter-tile");
      if (tile) {
        const chId = tile.getAttribute("data-chapter-id");
        switchView(chId);
      }
    });
  }

  function switchView(viewId) {
    state.currentView = viewId;

    // Update nav active state
    document.querySelectorAll(".nav-item").forEach(item => {
      if (item.getAttribute("data-view") === viewId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update panels
    document.querySelectorAll(".view-panel").forEach(panel => {
      if (panel.id === `view-${viewId}`) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ==========================================
  // THEME TOGGLE
  // ==========================================
  function initThemeToggle() {
    const btn = document.getElementById("themeToggleBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      state.theme = state.theme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", state.theme);
      localStorage.setItem("innov_theme", state.theme);
      btn.innerHTML = state.theme === "light" ? "🌙" : "☀️";
    });

    btn.innerHTML = state.theme === "light" ? "🌙" : "☀️";
  }

  // ==========================================
  // SEARCH FUNCTIONALITY
  // ==========================================
  function initSearch() {
    const searchInput = document.getElementById("globalSearchInput");
    const dropdown = document.getElementById("searchResultsDropdown");
    if (!searchInput || !dropdown) return;

    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (q.length < 2) {
        dropdown.classList.remove("open");
        dropdown.innerHTML = "";
        return;
      }

      const results = [];

      // Search in course sections
      if (window.COURSE_DATA && window.COURSE_DATA.chapters) {
        window.COURSE_DATA.chapters.forEach(ch => {
          ch.sections.forEach(sec => {
            const rawContent = sec.content.replace(/<[^>]*>/g, " ").toLowerCase();
            const rawTitle = sec.title.toLowerCase();
            if (rawTitle.includes(q) || rawContent.includes(q)) {
              let snippet = "";
              const matchIdx = rawContent.indexOf(q);
              if (matchIdx !== -1) {
                const sStart = Math.max(0, matchIdx - 40);
                const sEnd = Math.min(rawContent.length, matchIdx + 80);
                snippet = "..." + rawContent.substring(sStart, sEnd).replace(/\s+/g, " ") + "...";
              }
              results.push({
                type: "Cours",
                chapterId: ch.id,
                chapterNum: ch.number,
                sectionId: sec.id,
                title: sec.title,
                snippet: snippet
              });
            }
          });
        });
      }

      // Search in QCM questions
      if (window.QCM_QUESTIONS) {
        window.QCM_QUESTIONS.forEach(question => {
          if (question.question.toLowerCase().includes(q) || question.explanation.toLowerCase().includes(q)) {
            results.push({
              type: "QCM",
              chapterId: "qcm",
              chapterNum: question.chapterTitle,
              sectionId: `qcard-${question.id}`,
              title: question.question,
              snippet: question.explanation.substring(0, 100) + "..."
            });
          }
        });
      }

      if (results.length === 0) {
        dropdown.innerHTML = `<div class="search-result-item" style="color: var(--text-muted); text-align: center;">Aucun résultat pour « ${q} » dans le cours.</div>`;
        dropdown.classList.add("open");
        return;
      }

      let html = "";
      results.slice(0, 8).forEach(res => {
        html += `
          <div class="search-result-item" data-ch="${res.chapterId}" data-sec="${res.sectionId}">
            <div class="search-result-title">
              <span>${res.title}</span>
              <span class="search-result-chapter">${res.type} &bull; ${res.chapterId.toUpperCase()}</span>
            </div>
            <div class="search-result-snippet">${res.snippet}</div>
          </div>
        `;
      });

      dropdown.innerHTML = html;
      dropdown.classList.add("open");

      // Attach click to navigate
      dropdown.querySelectorAll(".search-result-item").forEach(item => {
        item.addEventListener("click", () => {
          const chId = item.getAttribute("data-ch");
          const secId = item.getAttribute("data-sec");
          switchView(chId);
          dropdown.classList.remove("open");
          searchInput.value = "";

          setTimeout(() => {
            const targetEl = document.getElementById(secId) || document.getElementById(`section-${secId}`);
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
              targetEl.style.outline = "2px solid var(--primary)";
              setTimeout(() => { targetEl.style.outline = "none"; }, 2500);
            }
          }, 300);
        });
      });
    });

    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove("open");
      }
    });
  }

  // ==========================================
  // DASHBOARD INITIALIZATION
  // ==========================================
  function initDashboard() {
    const totalQuestionsCount = window.QCM_QUESTIONS ? window.QCM_QUESTIONS.length : 85;
    const totalFlashcardsCount = window.FLASHCARDS_DATA ? window.FLASHCARDS_DATA.length : 30;

    const elQ = document.getElementById("statTotalQuestions");
    if (elQ) elQ.textContent = totalQuestionsCount;

    const elF = document.getElementById("statTotalFlashcards");
    if (elF) elF.textContent = totalFlashcardsCount;
  }

  // ==========================================
  // RENDER LESSON CONTENTS
  // ==========================================
  function renderAllLessons() {
    if (!window.COURSE_DATA || !window.COURSE_DATA.chapters) return;

    window.COURSE_DATA.chapters.forEach(ch => {
      const container = document.getElementById(`lesson-container-${ch.id}`);
      if (!container) return;

      let html = `
        <div class="chapter-header">
          <div class="chapter-breadcrumbs">Master I2TI &bull; S7 &bull; Chapitre ${ch.number}</div>
          <h1 class="chapter-main-title">${ch.title}</h1>
          <p class="chapter-main-subtitle">${ch.subtitle}</p>
        </div>
      `;

      ch.sections.forEach(sec => {
        const isRead = state.readSections.includes(sec.id);
        html += `
          <div class="lesson-section-wrapper" id="section-${sec.id}">
            <div class="section-heading mt-4">
              <h2>${sec.title}</h2>
              <button class="btn-mark-read ${isRead ? 'read' : ''}" data-sec-id="${sec.id}">
                ${isRead ? '✓ Lu et assimilé' : 'Marquer comme lu'}
              </button>
            </div>
            ${sec.content}
          </div>
        `;
      });

      container.innerHTML = html;
    });

    // Attach mark as read listeners
    document.querySelectorAll(".btn-mark-read").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const secId = e.currentTarget.getAttribute("data-sec-id");
        toggleSectionRead(secId, e.currentTarget);
      });
    });

    if (window.renderMathInElement) {
      try {
        renderMathInElement(document.body, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ]
        });
      } catch (err) {
        console.warn("KaTeX render error:", err);
      }
    }
  }

  function toggleSectionRead(secId, btn) {
    const idx = state.readSections.indexOf(secId);
    if (idx > -1) {
      state.readSections.splice(idx, 1);
      btn.classList.remove("read");
      btn.textContent = "Marquer comme lu";
    } else {
      state.readSections.push(secId);
      btn.classList.add("read");
      btn.textContent = "✓ Lu et assimilé";
    }
    localStorage.setItem("innov_read_sections", JSON.stringify(state.readSections));
    updateProgressUI();
  }

  function updateProgressUI() {
    // Total sections = 3 (ch1) + 5 (ch2) + 5 (ch3) + 5 (ch4) = 18 sections
    const totalSections = 18;
    const readCount = state.readSections.length;
    const pct = Math.min(100, Math.round((readCount / totalSections) * 100));

    const progressFill = document.getElementById("sidebarProgressFill");
    const progressLabel = document.getElementById("sidebarProgressText");
    const statProgress = document.getElementById("statGlobalProgress");

    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressLabel) progressLabel.textContent = `${pct}%`;
    if (statProgress) statProgress.textContent = `${pct}%`;
  }

  // ==========================================
  // EXHAUSTIVE QCM ENGINE
  // ==========================================
  function initQuiz() {
    if (!window.QCM_QUESTIONS) return;

    // Filter Buttons
    document.querySelectorAll(".quiz-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".quiz-filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.quiz.filter = btn.getAttribute("data-filter");
        resetQuiz();
      });
    });

    // Mode Switch Buttons
    document.querySelectorAll(".mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.quiz.mode = btn.getAttribute("data-mode");
        resetQuiz();
      });
    });

    // Reset Quiz Button
    const resetBtn = document.getElementById("quizResetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", resetQuiz);
    }

    resetQuiz();
  }

  function resetQuiz() {
    let list = [...window.QCM_QUESTIONS];
    if (state.quiz.filter !== "all") {
      list = list.filter(q => q.chapter === state.quiz.filter);
    }

    if (state.quiz.mode === "exam") {
      // Pick 30 randomized questions for exam mode
      list = shuffleArray(list).slice(0, 30);
      startExamTimer();
    } else {
      stopExamTimer();
    }

    state.quiz.questions = list;
    state.quiz.userAnswers = {};
    state.quiz.score = 0;
    state.quiz.examSubmitted = false;

    renderQuizList();
  }

  function renderQuizList() {
    const container = document.getElementById("quizContainer");
    if (!container) return;

    if (state.quiz.questions.length === 0) {
      container.innerHTML = `<div class="lesson-card"><p>Aucune question trouvée pour ce filtre.</p></div>`;
      return;
    }

    let html = `
      <div class="quiz-progress-card">
        <div>
          <strong>${state.quiz.mode === 'exam' ? 'Examen Blanc Chronométré' : 'Mode Entraînement'}</strong> : 
          ${state.quiz.questions.length} questions au total
        </div>
        <div class="quiz-score-pill" id="quizLiveScore">
          Score : 0 / ${state.quiz.questions.length}
        </div>
      </div>
    `;

    state.quiz.questions.forEach((q, qIndex) => {
      const isAnswered = state.quiz.userAnswers.hasOwnProperty(q.id);
      const selectedOption = isAnswered ? state.quiz.userAnswers[q.id] : null;

      html += `
        <div class="question-card" id="qcard-${q.id}">
          <div class="question-meta">
            <span class="question-chapter">Question ${qIndex + 1} &bull; ${q.chapterTitle}</span>
            <span class="question-difficulty">${q.difficulty}</span>
          </div>
          <div class="question-text">${q.question}</div>
          <div class="options-list">
      `;

      q.options.forEach((opt, optIndex) => {
        const letter = String.fromCharCode(65 + optIndex);
        let optClass = "option-btn";

        if (state.quiz.mode === "training") {
          if (isAnswered) {
            if (optIndex === q.correct) optClass += " correct";
            else if (optIndex === selectedOption) optClass += " wrong";
          }
        } else if (state.quiz.examSubmitted) {
          if (optIndex === q.correct) optClass += " correct";
          else if (optIndex === selectedOption) optClass += " wrong";
        } else if (isAnswered && selectedOption === optIndex) {
          optClass += " selected";
        }

        const disabledAttr = (state.quiz.mode === 'training' && isAnswered) || state.quiz.examSubmitted ? 'disabled' : '';

        html += `
          <button class="${optClass}" data-qid="${q.id}" data-opt="${optIndex}" ${disabledAttr}>
            <span class="option-letter">${letter}</span>
            <span class="option-label">${opt}</span>
          </button>
        `;
      });

      html += `</div>`;

      // Show explanation if answered in training or if exam is submitted
      if ((state.quiz.mode === "training" && isAnswered) || state.quiz.examSubmitted) {
        const isRight = selectedOption === q.correct;
        html += `
          <div class="quiz-explanation ${isRight ? 'border-success' : 'border-danger'}">
            <strong>${isRight ? '✓ Bonne réponse !' : '❌ Réponse incorrecte.'}</strong>
            <p class="mt-2">${q.explanation}</p>
          </div>
        `;
      }

      html += `</div>`;
    });

    if (state.quiz.mode === "exam" && !state.quiz.examSubmitted) {
      html += `
        <div class="lesson-card text-center">
          <button class="btn-primary" id="btnSubmitExam" style="font-size: 16px; padding: 14px 32px;">
            Terminer et Valider l'Examen Blanc
          </button>
        </div>
      `;
    }

    container.innerHTML = html;

    // Attach answer selection events
    container.querySelectorAll(".option-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const qId = e.currentTarget.getAttribute("data-qid");
        const optIdx = parseInt(e.currentTarget.getAttribute("data-opt"), 10);
        handleAnswer(qId, optIdx);
      });
    });

    const submitExamBtn = document.getElementById("btnSubmitExam");
    if (submitExamBtn) {
      submitExamBtn.addEventListener("click", submitExam);
    }

    updateScoreDisplay();
  }

  function handleAnswer(qId, optIndex) {
    state.quiz.userAnswers[qId] = optIndex;
    renderQuizList();
  }

  function updateScoreDisplay() {
    let score = 0;
    state.quiz.questions.forEach(q => {
      if (state.quiz.userAnswers[q.id] === q.correct) {
        score++;
      }
    });

    const el = document.getElementById("quizLiveScore");
    if (el) {
      el.textContent = `Score : ${score} / ${state.quiz.questions.length}`;
    }
  }

  function submitExam() {
    stopExamTimer();
    state.quiz.examSubmitted = true;
    renderQuizList();

    let score = 0;
    state.quiz.questions.forEach(q => {
      if (state.quiz.userAnswers[q.id] === q.correct) score++;
    });

    const noteSur20 = ((score / state.quiz.questions.length) * 20).toFixed(1);
    alert(`Examen terminé !\nVotre note officielle : ${noteSur20} / 20 (${score} réponses correctes sur ${state.quiz.questions.length})`);
  }

  function startExamTimer() {
    stopExamTimer();
    state.quiz.examTimeRemaining = 30 * 60;
    const timerEl = document.getElementById("examTimerDisplay");

    state.quiz.examTimer = setInterval(() => {
      state.quiz.examTimeRemaining--;
      if (timerEl) {
        const m = Math.floor(state.quiz.examTimeRemaining / 60);
        const s = state.quiz.examTimeRemaining % 60;
        timerEl.textContent = `Temps restant : ${m}:${s < 10 ? '0' : ''}${s}`;
      }
      if (state.quiz.examTimeRemaining <= 0) {
        alert("Temps écoulé ! Validation automatique de l'examen.");
        submitExam();
      }
    }, 1000);
  }

  function stopExamTimer() {
    if (state.quiz.examTimer) {
      clearInterval(state.quiz.examTimer);
      state.quiz.examTimer = null;
    }
    const timerEl = document.getElementById("examTimerDisplay");
    if (timerEl) timerEl.textContent = "";
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ==========================================
  // FLASHCARDS ENGINE
  // ==========================================
  function initFlashcards() {
    if (!window.FLASHCARDS_DATA) return;

    state.flashcards.items = [...window.FLASHCARDS_DATA];
    state.flashcards.currentIndex = 0;
    state.flashcards.isFlipped = false;

    const cardEl = document.getElementById("flashcardElement");
    const btnFlip = document.getElementById("btnFlipCard");
    const btnNext = document.getElementById("btnNextCard");
    const btnPrev = document.getElementById("btnPrevCard");
    const btnMastered = document.getElementById("btnCardMastered");
    const btnAgain = document.getElementById("btnCardAgain");

    if (cardEl) {
      cardEl.addEventListener("click", () => {
        state.flashcards.isFlipped = !state.flashcards.isFlipped;
        cardEl.classList.toggle("flipped", state.flashcards.isFlipped);
      });
    }

    if (btnFlip) {
      btnFlip.addEventListener("click", () => {
        state.flashcards.isFlipped = !state.flashcards.isFlipped;
        if (cardEl) cardEl.classList.toggle("flipped", state.flashcards.isFlipped);
      });
    }

    if (btnNext) {
      btnNext.addEventListener("click", () => {
        nextFlashcard();
      });
    }

    if (btnPrev) {
      btnPrev.addEventListener("click", () => {
        prevFlashcard();
      });
    }

    if (btnMastered) {
      btnMastered.addEventListener("click", () => {
        const item = state.flashcards.items[state.flashcards.currentIndex];
        if (!state.flashcards.mastered.includes(item.id)) {
          state.flashcards.mastered.push(item.id);
          localStorage.setItem("innov_fc_mastered", JSON.stringify(state.flashcards.mastered));
        }
        nextFlashcard();
      });
    }

    if (btnAgain) {
      btnAgain.addEventListener("click", () => {
        nextFlashcard();
      });
    }

    renderCurrentFlashcard();
  }

  function renderCurrentFlashcard() {
    const item = state.flashcards.items[state.flashcards.currentIndex];
    const cardEl = document.getElementById("flashcardElement");
    const countEl = document.getElementById("flashcardCounter");
    const masteredCountEl = document.getElementById("flashcardMasteredCounter");

    if (!item) return;

    state.flashcards.isFlipped = false;
    if (cardEl) cardEl.classList.remove("flipped");

    const catFront = document.getElementById("fcCategoryFront");
    const catBack = document.getElementById("fcCategoryBack");
    const textFront = document.getElementById("fcTextFront");
    const textBack = document.getElementById("fcTextBack");

    if (catFront) catFront.textContent = item.category;
    if (catBack) catBack.textContent = item.category;
    if (textFront) textFront.textContent = item.front;
    if (textBack) textBack.textContent = item.back;

    if (countEl) {
      countEl.textContent = `Carte ${state.flashcards.currentIndex + 1} / ${state.flashcards.items.length}`;
    }
    if (masteredCountEl) {
      masteredCountEl.textContent = `Maîtrisées : ${state.flashcards.mastered.length} / ${state.flashcards.items.length}`;
    }
  }

  function nextFlashcard() {
    if (state.flashcards.currentIndex < state.flashcards.items.length - 1) {
      state.flashcards.currentIndex++;
    } else {
      state.flashcards.currentIndex = 0; // loop
    }
    renderCurrentFlashcard();
  }

  function prevFlashcard() {
    if (state.flashcards.currentIndex > 0) {
      state.flashcards.currentIndex--;
    } else {
      state.flashcards.currentIndex = state.flashcards.items.length - 1;
    }
    renderCurrentFlashcard();
  }

  // ==========================================
  // INTERACTIVE TOOLS & SIMULATORS
  // ==========================================
  function initSimulators() {
    // 1. ESPACENET QUERY SIMULATOR
    const simKeyword1 = document.getElementById("simKeyword1");
    const simWildcard1 = document.getElementById("simWildcard1");
    const simOperator = document.getElementById("simOperator");
    const simKeyword2 = document.getElementById("simKeyword2");
    const simWildcard2 = document.getElementById("simWildcard2");
    const simField = document.getElementById("simField");
    const simOutput = document.getElementById("simQueryOutput");
    const simExplain = document.getElementById("simQueryExplain");

    function updateEspacenetSim() {
      if (!simKeyword1 || !simOutput) return;

      const k1 = simKeyword1.value.trim() || "water";
      const w1 = simWildcard1.value;
      const op = simOperator.value;
      const k2 = simKeyword2.value.trim() || "irrigation";
      const w2 = simWildcard2.value;
      const field = simField.value;

      const term1 = `${k1}${w1}`;
      const term2 = `${k2}${w2}`;

      let queryStr = "";
      if (op === "NOT") {
        queryStr = `${term1} AND NOT ${term2}`;
      } else {
        queryStr = `${term1} ${op} ${term2}`;
      }

      if (field !== "all") {
        queryStr = `${field}=(${queryStr})`;
      }

      simOutput.textContent = queryStr;

      let explainText = `Cette requête recherche `;
      if (field === "ti") explainText += `dans le <strong>Titre</strong> uniquement. `;
      else if (field === "ab") explainText += `dans l'<strong>Abrégé</strong> uniquement. `;
      else explainText += `dans <strong>Tout le texte</strong> du brevet. `;

      if (op === "AND") explainText += `Elle exige la présence simultanée de termes dérivés de "${k1}" ET de "${k2}".`;
      else if (op === "OR") explainText += `Elle admet au moins l'un des deux termes (synonymes ou alternatives).`;
      else if (op === "NOT") explainText += `Elle inclut "${term1}" mais élimine rigoureusement tous les documents contenant "${term2}".`;
      else if (op === "XOR") explainText += `Elle sélectionne les brevets ayant l'un ou l'autre terme, mais JAMAIS les deux ensemble.`;

      if (simExplain) simExplain.innerHTML = explainText;
    }

    [simKeyword1, simWildcard1, simOperator, simKeyword2, simWildcard2, simField].forEach(el => {
      if (el) el.addEventListener("input", updateEspacenetSim);
    });
    updateEspacenetSim();

    // 2. PATENTABILITY DECISION TREE
    const checkObj = document.getElementById("chkPatentObj");
    const checkNotExcluded = document.getElementById("chkNotExcluded");
    const checkNovelty = document.getElementById("chkNovelty");
    const checkDoublePatenting = document.getElementById("chkDoublePatenting");
    const checkInventive = document.getElementById("chkInventive");
    const checkIndustrial = document.getElementById("chkIndustrial");
    const btnTestPatent = document.getElementById("btnRunPatentTest");
    const testResult = document.getElementById("patentTestResult");

    if (btnTestPatent && testResult) {
      btnTestPatent.addEventListener("click", () => {
        const isObj = checkObj.checked;
        const isNotExcl = checkNotExcluded.checked;
        const isNov = checkNovelty.checked;
        const hasDouble = checkDoublePatenting.checked;
        const isInv = checkInventive.checked;
        const isInd = checkIndustrial.checked;

        let verdict = "";
        let isSuccess = false;

        if (!isObj) {
          verdict = "❌ REJET : L'objet ne constitue pas un produit, un procédé ou une application nouvelle (Art. 21).";
        } else if (!isNotExcl) {
          verdict = "❌ REJET : L'objet fait partie des exclusions légales (génome humain, objet naturel, théorie pure, méthode de diagnostic ou thérapeutique, machine perpétuelle).";
        } else if (!isNov) {
          verdict = "❌ REJET : Défaut de nouveauté absolue (Art. 26 al. 1 & 2) : l'invention était déjà accessible au public avant le dépôt.";
        } else if (hasDouble) {
          verdict = "❌ REJET : Double Brevetage (Art. 26 al. 3) : Une demande marocaine antérieure non encore publiée au jour du dépôt portait déjà sur cette même invention !";
        } else if (!isInv) {
          verdict = "❌ REJET : Défaut d'activité inventive (Art. 28) : Pour l'homme du métier, la solution découle de manière évidente de l'état de la technique (règle du could vs would).";
        } else if (!isInd) {
          verdict = "❌ REJET : Défaut d'application industrielle (Art. 29) : L'invention ne présente pas une utilité déterminée, probante et crédible.";
        } else {
          isSuccess = true;
          verdict = "🎉 DÉLIVRANCE ACCORDÉE : Tous les critères légaux de la Loi 17-97 modifiée 23-13 sont satisfaits ! Le brevet est délivré pour une durée de 20 ans au Maroc.";
        }

        testResult.className = `callout ${isSuccess ? 'callout-success' : 'callout-warning'} mt-3`;
        testResult.innerHTML = `<strong>Diagnostic Juridique :</strong><br>${verdict}`;
        testResult.style.display = "block";
      });
    }

    // 3. PROBLEM-SOLUTION SIMULATOR
    const simEtppChoice = document.getElementById("simEtppChoice");
    const simFeatureDiff = document.getElementById("simFeatureDiff");
    const simTechEffect = document.getElementById("simTechEffect");
    const simObjectiveProblem = document.getElementById("simObjectiveProblem");

    if (simEtppChoice) {
      simEtppChoice.addEventListener("change", () => {
        if (simEtppChoice.value === "AA1") {
          simFeatureDiff.value = "3 roues en triangle au lieu de 2 roues";
          simTechEffect.value = "Amélioration de la stabilité du véhicule";
          simObjectiveProblem.value = "Comment améliorer la stabilité du véhicule de AA1 ?";
        } else {
          simFeatureDiff.value = "Moteur à explosion au lieu de propulsion mécanique à pédales";
          simTechEffect.value = "Augmentation de la puissance et réduction de l'effort physique";
          simObjectiveProblem.value = "Comment motoriser le véhicule tricycle de AA2 ?";
        }
      });
    }

    // 4. INNOVATION TYPOLOGY SIMULATOR (MANUEL D'OSLO, SCHUMPETER, DEGRES & PI)
    const TYPOLOGY_DATABASE = {
      "ikea-kit": {
        title: "IKEA (1955) : Meuble avec pieds démontables (meuble en kit)",
        osloType: "Innovation de Produit (Bien)",
        osloDetails: "Nouvelles caractéristiques matérielles et fonctionnelles d'usage : pieds amovibles permettant le transport à plat sans dommage.",
        degree: "Innovation Radicale (de Rupture)",
        degreeDetails: "Rupture historique avec l'ébénisterie monobloc traditionnelle, créant le standard mondial du mobilier en kit à monter soi-même.",
        nature: "Technologique & Commerciale",
        schumpeter: "Forme 1 : Fabrication d'un bien nouveau (ou nouvelle qualité d'un bien)",
        protection: "Brevet d'invention (système mécanique de fixation démontable) + Dessins et Modèles Industriels (DMI)",
        impact: "Naissance du concept IKEA moderne, standardisation mondiale et réduction massive du risque de casse pendant le transport."
      },
      "ikea-flatpack": {
        title: "IKEA : Conditionnement en paquets plats (Flat-Pack)",
        osloType: "Innovation de Commercialisation (Packaging) & de Procédé (Distribution)",
        osloDetails: "Méthode de conditionnement compact révolutionnant le stockage, la manutention et la chaîne d'approvisionnement logistique.",
        degree: "Innovation Incrémentale / Stratégique",
        degreeDetails: "Optimisation continue du conditionnement plat pour tous les meubles du catalogue.",
        nature: "Commerciale & Logistique",
        schumpeter: "Forme 2 : Introduction d'une méthode de production / distribution nouvelle",
        protection: "Dessin ou Modèle Industriel (DMI) sur l'emballage + Secret d'affaires et savoir-faire logistique",
        impact: "Divise par 3 les coûts de transport et d'entreposage ; économies répercutées directement sur les prix de vente aux consommateurs."
      },
      "ikea-design": {
        title: "IKEA : « Design démocratique » & Renouvellement continu des gammes",
        osloType: "Innovation de Commercialisation (Conception / Design) & de Produit",
        osloDetails: "Changement de formes, de motifs, de couleurs et de lignes esthétiques sans altérer la fonction première du meuble.",
        degree: "Innovation Incrémentale de Design",
        degreeDetails: "Renouvellement permanent et rapide des collections pour maintenir l'attractivité constante de l'enseigne auprès des consommateurs.",
        nature: "Commerciale / Esthétique",
        schumpeter: "Forme 1 : Qualités nouvelles de biens existants",
        protection: "Dessins et Modèles Industriels (DMI) : plus de 600 DMI déposés auprès de l'OMPI (WIPO) + Droit d'auteur",
        impact: "Démocratisation du design scandinave haut de gamme à prix abordable ; valorisation par des designers réputés."
      },
      "ikea-store": {
        title: "IKEA (1950) : Grandes surfaces avec parcours immersif et univers de vie",
        osloType: "Innovation d'Organisation & de Commercialisation (Placement / Distribution)",
        osloDetails: "Nouvelle organisation spatiale : parcours client dirigé de pièce en pièce (salon -> cuisine -> déco), mise en scène en univers réels, conception modulaire et services associés.",
        degree: "Innovation Radicale de Distribution",
        degreeDetails: "Révolution de l'expérience d'achat de meubles : le client peut voir, toucher et tester le mobilier avant achat.",
        nature: "Organisationnelle & Commerciale",
        schumpeter: "Forme 3 & 5 : Débouché nouveau et nouvelle organisation de l'industrie du meuble",
        protection: "Marque de service + Secret d'affaires (concept architectural et merchandising)",
        impact: "Immersion client totale, déclenchement d'achats coup de cœur, intégration de services (garderie Småland, restauration suédoise)."
      },
      "levis-rivets": {
        title: "Levi's (1873) : Pantalon de travail renforcé par rivets métalliques (Jacob Davis)",
        osloType: "Innovation de Produit (Bien)",
        osloDetails: "Introduction de rivets de cuivre aux points de tension (poches) résolvant le problème organique de déchirement des vêtements de travail.",
        degree: "Innovation Radicale / Nouvelle Combinaison Schumpétérienne",
        degreeDetails: "Combinaison d'une technologie métallique simple à une toile denim existante, créant le standard mondial du vêtement de travail.",
        nature: "Technologique (Solution technique à problème technique)",
        schumpeter: "Forme 1 : Fabrication d'un bien nouveau à caractéristiques supérieures",
        protection: "Brevet d'invention américain US 139,121 (délivré à Jacob Davis et Levi Strauss & Co. en 1873)",
        impact: "Monopole de 17 ans (1873-1890) fondant l'empire Levi's et l'industrie universelle du blue-jeans."
      },
      "levis-hidden": {
        title: "Levi's (1937) : Rivets métalliques cachés (anti-rayures)",
        osloType: "Innovation de Produit (Amélioration fonctionnelle)",
        osloDetails: "Couture recouvrant les rivets arrière pour éviter qu'ils ne rayent les meubles ou les selles de cheval.",
        degree: "Innovation Incrémentale",
        degreeDetails: "Perfectionnement technique apporté à un produit déjà mature sans en modifier la structure de base.",
        nature: "Technologique",
        schumpeter: "Forme 1 : Amélioration de la qualité d'un bien existant",
        protection: "Brevet d'invention américain US 1,999,927 (accordé en 1937)",
        impact: "Satisfaction des réclamations clients, élimination d'un défaut d'usage et prolongation de la suprématie de la marque."
      },
      "google-pagerank": {
        title: "Google (1998) : Algorithme PageRank d'indexation par réseau de liens",
        osloType: "Innovation de Produit (Service) & de Procédé (Algorithmique)",
        osloDetails: "Méthode automatisée d'attribution de scores d'importance aux pages web selon la structure des hyperliens (crawling + indexation).",
        degree: "Innovation Radicale (de Rupture)",
        degreeDetails: "Bascule totale du modèle d'organisation du Web : remplace les annuaires humains hiérarchiques (Yahoo) par un classement algorithmique automatique.",
        nature: "Technologique",
        schumpeter: "Forme 2 : Introduction d'une méthode de production / traitement de données nouvelle",
        protection: "Brevet d'invention US 6,285,999 B1 (inventeur Lawrence Page, Université Stanford)",
        impact: "Destruction créatrice de l'hégémonie de Yahoo, émergence du monopole mondial de Google dans la recherche en ligne."
      },
      "google-adwords": {
        title: "Google (2003) : Publicité ciblée et enchères de mots-clés AdWords",
        osloType: "Innovation de Commercialisation (Tarification & Promotion)",
        osloDetails: "Système de vente d'espaces publicitaires basé sur des enchères en temps réel liées à l'intention de recherche de l'utilisateur.",
        degree: "Innovation Radicale de Modèle Économique",
        degreeDetails: "Transformation d'un simple moteur de recherche en une gigantesque régie publicitaire mondiale ultra-rentable.",
        nature: "Commerciale & Technologique",
        schumpeter: "Forme 3 & 5 : Ouverture d'un débouché nouveau et nouvelle organisation de l'économie numérique",
        protection: "Brevets algorithmiques + Secret d'affaires sur les formules d'enchères",
        impact: "Monétisation massive assurant l'indépendance financière et la capacité de rachat d'écosystèmes entiers (YouTube, Android)."
      },
      "kodak-digital": {
        title: "Kodak (Faillite 2012) : Révolution numérique manquée de la photographie",
        osloType: "Innovation de Produit & Procédé (Numérisation de l'image)",
        osloDetails: "Remplacement du film chimique argentique par des capteurs électroniques et des mémoires numériques.",
        degree: "Innovation Radicale de Rupture ignorée / rejetée par la direction",
        degreeDetails: "Kodak avait inventé l'appareil photo numérique dès 1975 mais a refusé de le commercialiser par crainte de cannibaliser ses ventes de pellicules.",
        nature: "Technologique",
        schumpeter: "Destruction Créatrice Schumpétérienne : le nouveau apparaît à côté de l'ancien et le concurrence jusqu'à le ruiner.",
        protection: "Portefeuille initial de brevets numériques cédé ou dispersé",
        impact: "Dépôt de bilan en 2012. Leçon du cours : « La stratégie est plus importante que la vitesse. Obtenez votre boussole avant d'accélérer ! »."
      },
      "pillbox-smart": {
        title: "Challenge Étudiant : Pilulier intelligent avec alertes et verrouillage",
        osloType: "Innovation de Produit (Bien)",
        osloDetails: "Dispositif combinant caractéristiques mécaniques (verrouillage motorisé), matérielles (capteurs de présence) et logicielles (alertes smartphone).",
        degree: "Innovation Incrémentale à haute valeur sociétale",
        degreeDetails: "Perfectionnement d'un pilulier classique en un système mécatronique connecté répondant au problème organique des oublis médicamenteux.",
        nature: "Technologique & Sociale",
        schumpeter: "Forme 1 : Bien nouveau pour la santé et le maintien à domicile",
        protection: "Brevet d'invention (mécanisme de distribution asservi) + Dessin ou Modèle Industriel (DMI) + Marque",
        impact: "Sécurisation de la prise de médicaments chez les personnes âgées, réduction des hospitalisations d'urgence."
      },
      "argan-composite": {
        title: "Challenge Étudiant : Coques d'argan valorisées en support composite parfumé",
        osloType: "Innovation de Produit & de Procédé (Matériaux)",
        osloDetails: "Procédé de broyage, traitement et agglomération des sous-produits de l'arganier pour créer un matériau composite biodégradable parfumé.",
        degree: "Innovation Incrémentale verte / Éco-conception",
        degreeDetails: "Transformation d'un déchet agricole abondant au Maroc en un produit noble à valeur ajoutée (économie circulaire).",
        nature: "Technologique & Environnementale",
        schumpeter: "Forme 4 : Conquête d'une nouvelle source de matières premières",
        protection: "Brevet d'invention (formulation du composite et procédé d'imprégnation) + Indication Géographique (IGP Argan)",
        impact: "Valorisation de la biomasse locale, zéro déchet, création d'emplois ruraux durables dans la région Souss-Massa."
      },
      "oil-pourer": {
        title: "Challenge Étudiant : Dispositif verseur d'huile à débit contrôlé sans pertes",
        osloType: "Innovation de Produit (Accessoire)",
        osloDetails: "Embout mécanique avec clapet anti-goutte et régulateur de débit d'air évitant éclaboussures et gaspillage.",
        degree: "Innovation Incrémentale",
        degreeDetails: "Réponse directe à un problème organique quotidien observé dans les cuisines marocaines.",
        nature: "Technologique & Fonctionnelle",
        schumpeter: "Forme 1 : Bien nouveau d'usage ménager",
        protection: "Brevet d'invention (mécanisme fluidique anti-retour) ou Modèle d'utilité + DMI",
        impact: "Économie d'huile, propreté des plans de travail, confort d'utilisation au quotidien."
      }
    };

    const simTypologyPreset = document.getElementById("simTypologyPreset");
    const btnAnalyzeTypology = document.getElementById("btnAnalyzeTypology");
    const simTypologyOutput = document.getElementById("simTypologyOutput");

    function renderTypologyAnalysis(key) {
      const item = TYPOLOGY_DATABASE[key];
      if (!item || !simTypologyOutput) return;

      const isTech = item.nature.includes("Technologique");

      simTypologyOutput.innerHTML = `
        <div class="lesson-card" style="border: 2px solid var(--primary-light); background: var(--bg-surface);">
          <div class="card-badge bg-primary">Fiche d'Analyse Multi-Typologique Complète</div>
          <h3 class="mt-2" style="color: var(--primary);">${item.title}</h3>

          <div class="grid-2-col mt-3">
            <div class="feature-box">
              <div class="d-flex align-items-center mb-1">
                <span class="card-badge bg-primary me-2" style="font-size: 11px;">1. Manuel d'Oslo</span>
                <strong>${item.osloType}</strong>
              </div>
              <p class="small text-muted mt-2">${item.osloDetails}</p>
            </div>

            <div class="feature-box">
              <div class="d-flex align-items-center mb-1">
                <span class="card-badge bg-danger me-2" style="font-size: 11px;">2. Degré de Nouveauté</span>
                <strong>${item.degree}</strong>
              </div>
              <p class="small text-muted mt-2">${item.degreeDetails}</p>
            </div>

            <div class="feature-box mt-3">
              <div class="d-flex align-items-center mb-1">
                <span class="card-badge bg-info me-2" style="font-size: 11px;">3. Nature & Objet</span>
                <strong>${item.nature}</strong>
              </div>
              <p class="small text-muted mt-2"><strong>Éligibilité au brevet :</strong> ${isTech ? "✅ Oui, potentiellement brevetable si les 3 critères cumulatifs (nouveauté, activité inventive, application industrielle) sont réunis." : "❌ Non directement brevetable (relève de la marque, du DMI, du droit d'auteur ou du secret d'affaires)."}</p>
            </div>

            <div class="feature-box mt-3">
              <div class="d-flex align-items-center mb-1">
                <span class="card-badge bg-warning me-2" style="font-size: 11px;">4. Schumpeter (1911)</span>
                <strong>${item.schumpeter}</strong>
              </div>
              <p class="small text-muted mt-2">Exécution d'une nouvelle combinaison de moyens de production rompant la routine économique existante.</p>
            </div>
          </div>

          <div class="callout callout-warning mt-3">
            <div class="callout-icon">🛡️</div>
            <div class="callout-body">
              <strong>Titres de Propriété Intellectuelle Mobilisés :</strong><br>
              ${item.protection}
            </div>
          </div>

          <div class="callout callout-success mt-2">
            <div class="callout-icon">📈</div>
            <div class="callout-body">
              <strong>Impact Stratégique & Économique (Cours de Pr. Benbrahim) :</strong><br>
              ${item.impact}
            </div>
          </div>
        </div>
      `;
    }

    if (btnAnalyzeTypology && simTypologyPreset) {
      btnAnalyzeTypology.addEventListener("click", () => {
        renderTypologyAnalysis(simTypologyPreset.value);
      });
      simTypologyPreset.addEventListener("change", () => {
        renderTypologyAnalysis(simTypologyPreset.value);
      });
      // Initial render on load
      renderTypologyAnalysis(simTypologyPreset.value);
    }

  }
});
