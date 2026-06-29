"use strict";

// ----- 상태 -----
let allDays = [];        // words.json 의 days 배열
let selectedCount = 10;  // 선택된 문제 수
let quiz = [];           // 생성된 문제 배열
let current = 0;         // 현재 문제 인덱스
let score = 0;           // 맞힌 개수

// ----- 요소 -----
const $ = (id) => document.getElementById(id);
const setupEl = $("setup");
const quizEl = $("quiz");
const resultEl = $("result");

// ----- 유틸 -----
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(el) {
  for (const s of [setupEl, quizEl, resultEl]) s.hidden = (s !== el);
}

// ----- 초기화: 데이터 로드 + 설정 화면 구성 -----
async function init() {
  // Day 드롭다운 (26~50)
  const startSel = $("startDay");
  const endSel = $("endDay");
  for (let d = 26; d <= 50; d++) {
    startSel.add(new Option("Day " + d, d));
    endSel.add(new Option("Day " + d, d));
  }
  startSel.value = 26;
  endSel.value = 50;

  // 문제 수 버튼
  const countBtns = document.querySelectorAll(".count-btn");
  countBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      countBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedCount = Number(btn.dataset.count);
    });
  });
  countBtns[0].classList.add("selected"); // 기본 10

  $("startBtn").addEventListener("click", startTest);
  $("nextBtn").addEventListener("click", nextQuestion);
  $("restartBtn").addEventListener("click", () => showScreen(setupEl));

  // 데이터 로드
  try {
    const res = await fetch("data/words.json");
    if (!res.ok) throw new Error("로드 실패");
    const data = await res.json();
    allDays = data.days || [];
  } catch (e) {
    showError("data/words.json 을 불러오지 못했습니다. 로컬 서버로 실행하세요.");
  }
}

function showError(msg) {
  const el = $("setupError");
  el.textContent = msg;
  el.hidden = false;
}

// ----- 테스트 시작 -----
function startTest() {
  $("setupError").hidden = true;

  const start = Number($("startDay").value);
  const end = Number($("endDay").value);
  if (start > end) {
    showError("시작 Day 는 끝 Day 보다 클 수 없습니다.");
    return;
  }

  // 범위 내 모든 단어 모으기
  const pool = [];
  for (const day of allDays) {
    if (day.day >= start && day.day <= end) {
      for (const w of day.words) pool.push(w);
    }
  }

  if (pool.length < 5) {
    showError("선택한 범위에 단어가 충분하지 않습니다 (최소 5개 필요).");
    return;
  }

  // 문제 수: 사용 가능한 단어 수로 제한
  const n = Math.min(selectedCount, pool.length);
  const targets = shuffle(pool).slice(0, n);
  const useHint = $("hintToggle").checked;

  quiz = targets.map((target) => {
    // 정의 1개 무작위 선택
    const definition = target.definitions[Math.floor(Math.random() * target.definitions.length)];
    // 오답 4개: 같은 범위에서 정답과 다른 단어
    const distractors = shuffle(pool.filter((w) => w.word !== target.word))
      .slice(0, 4)
      .map((w) => w.word);
    const choices = shuffle([target.word, ...distractors]);
    return { answer: target.word, definition, choices, useHint };
  });

  current = 0;
  score = 0;
  showScreen(quizEl);
  renderQuestion();
}

// ----- 문제 렌더링 -----
function renderQuestion() {
  const q = quiz[current];

  $("progressText").textContent = "문제 " + (current + 1) + " / " + quiz.length;
  $("scoreText").textContent = "점수 " + score;
  $("definition").textContent = q.definition;

  // 힌트: 앞 두 글자 + 나머지 글자 수만큼 밑줄
  const hintEl = $("hint");
  if (q.useHint) {
    const word = q.answer;
    const rest = Math.max(word.length - 2, 0);
    hintEl.textContent = word.slice(0, 2) + " " + "_ ".repeat(rest).trim();
    hintEl.hidden = false;
  } else {
    hintEl.hidden = true;
  }

  // 선택지
  const choicesEl = $("choices");
  choicesEl.innerHTML = "";
  q.choices.forEach((word) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.textContent = word;
    btn.addEventListener("click", () => handleAnswer(btn, q));
    choicesEl.appendChild(btn);
  });

  $("nextBtn").hidden = true;
}

// ----- 답 처리 -----
function handleAnswer(clickedBtn, q) {
  const buttons = document.querySelectorAll(".choice");
  buttons.forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent === q.answer) btn.classList.add("correct");
  });

  if (clickedBtn.textContent === q.answer) {
    score++;
  } else {
    clickedBtn.classList.add("wrong");
  }

  $("scoreText").textContent = "점수 " + score;

  const nextBtn = $("nextBtn");
  nextBtn.textContent = (current === quiz.length - 1) ? "결과 보기" : "다음";
  nextBtn.hidden = false;
}

// ----- 다음 문제 / 결과 -----
function nextQuestion() {
  current++;
  if (current < quiz.length) {
    renderQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  const total = quiz.length;
  const percent = Math.round((score / total) * 100);
  $("resultScore").textContent = score + " / " + total;
  $("resultPercent").textContent = "정답률 " + percent + "%";
  showScreen(resultEl);
}

init();
