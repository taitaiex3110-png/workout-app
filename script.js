const STORAGE_KEY = "workout-routine-app-records";
const TEMPLATE_STORAGE_KEY = "workout-routine-app-templates";

try {
  WorkoutBackup.recover(localStorage);
} catch (error) {
  alert("中断した取り込みの復旧ができませんでした。サイトデータを削除せず、この画面を閉じて再度開いてください。");
  throw error;
}

const BODY_PARTS = [
  { id: "chest", label: "胸" },
  { id: "back", label: "背中" },
  { id: "legs", label: "脚" },
  { id: "shoulders", label: "肩" },
  { id: "triceps", label: "三頭筋" },
  { id: "biceps", label: "二頭筋" }
];

const SPLITS = {
  Push: ["chest", "shoulders", "triceps"],
  Pull: ["back", "biceps"],
  Legs: ["legs"]
};

const defaultTemplates = [
  {
    id: createId(),
    name: "ベンチプレス",
    bodyPart: "chest",
    sets: [{ weight: "60", reps: "8" }, { weight: "55", reps: "10" }, { weight: "50", reps: "10" }]
  },
  {
    id: createId(),
    name: "スクワット",
    bodyPart: "legs",
    sets: [{ weight: "80", reps: "6" }, { weight: "75", reps: "8" }, { weight: "70", reps: "8" }]
  },
  {
    id: createId(),
    name: "ラットプルダウン",
    bodyPart: "back",
    sets: [{ weight: "45", reps: "10" }, { weight: "40", reps: "12" }, { weight: "40", reps: "10" }]
  }
];

const state = {
  records: loadRecords(),
  templates: loadTemplates(),
  todayKey: getTodayKey(),
  currentDate: getTodayKey(),
  selectedCalendarDate: getTodayKey(),
  isCalendarDetailOpen: false,
  currentPage: "main",
  calendarDate: new Date(),
  currentSplit: "Push",
  currentBodyPart: "chest",
  todayExercises: []
};

const elements = {
  todayLabel: document.getElementById("todayLabel"),
  editingDateLabel: document.getElementById("editingDateLabel"),
  completionStat: document.getElementById("completionStat"),
  setStat: document.getElementById("setStat"),
  volumeStat: document.getElementById("volumeStat"),
  summaryMount: document.getElementById("summaryMount"),
  splitButtons: document.getElementById("splitButtons"),
  bodyPartButtons: document.getElementById("bodyPartButtons"),
  templateSelect: document.getElementById("templateSelect"),
  addTemplateButton: document.getElementById("addTemplateButton"),
  openHistoryButton: document.getElementById("openHistoryButton"),
  addExerciseButton: document.getElementById("addExerciseButton"),
  todayExercises: document.getElementById("todayExercises"),
  saveButton: document.getElementById("saveButton"),
  saveStatus: document.getElementById("saveStatus"),
  returnTodayButton: document.getElementById("returnTodayButton"),
  calendarDateDetail: document.getElementById("calendarDateDetail"),
  calendarDatePanel: document.getElementById("calendarDatePanel"),
  closeCalendarDetailButton: document.getElementById("closeCalendarDetailButton"),
  tableDateDetail: document.getElementById("tableDateDetail"),
  tableDatePanel: document.getElementById("tableDatePanel"),
  closeTableDetailButton: document.getElementById("closeTableDetailButton"),
  backToMainButton: document.getElementById("backToMainButton"),
  previousSummary: document.getElementById("previousSummary"),
  prSummary: document.getElementById("prSummary"),
  templateSummary: document.getElementById("templateSummary"),
  calendarTab: document.getElementById("calendarTab"),
  tableTab: document.getElementById("tableTab"),
  calendarView: document.getElementById("calendarView"),
  tableView: document.getElementById("tableView"),
  panelMain: document.querySelector(".panel-main"),
  panelSide: document.querySelector(".panel-side"),
  panelHistory: document.querySelector(".panel-history"),
  calendarTitle: document.getElementById("calendarTitle"),
  weeklyTrainingSummary: document.getElementById("weeklyTrainingSummary"),
  calendarGrid: document.getElementById("calendarGrid"),
  prevMonthButton: document.getElementById("prevMonthButton"),
  nextMonthButton: document.getElementById("nextMonthButton"),
  historyTableBody: document.getElementById("historyTableBody"),
  exerciseTemplate: document.getElementById("exerciseTemplate"),
  setRowTemplate: document.getElementById("setRowTemplate")
};

let editorBaseline = "";
initialize();

function initialize() {
  loadExercisesForDate(state.todayKey);
  moveSummaryBelowInput();
  bindEvents();
  renderAll();
  editorBaseline = editorSnapshot();
}

function editorSnapshot() {
  return JSON.stringify([state.currentDate, state.currentSplit, state.todayExercises]);
}

function hasUnsavedWorkout() {
  return editorSnapshot() !== editorBaseline;
}

function bindEvents() {
  elements.addExerciseButton.addEventListener("click", () => {
    state.todayExercises.push(createEmptyExercise(state.currentBodyPart));
    renderTodayExercises();
    updateSummaryPanels();
  });

  elements.addTemplateButton.addEventListener("click", addExerciseFromSelectedTemplate);
  elements.openHistoryButton.addEventListener("click", showHistoryPage);
  elements.saveButton.addEventListener("click", saveCurrentRecord);
  elements.returnTodayButton.addEventListener("click", () => enterEditMode(state.todayKey));
  elements.closeCalendarDetailButton.addEventListener("click", closeDateDetail);
  elements.closeTableDetailButton.addEventListener("click", closeDateDetail);
  elements.backToMainButton.addEventListener("click", showMainPage);
  elements.calendarTab.addEventListener("click", () => switchHistoryView("calendar"));
  elements.tableTab.addEventListener("click", () => switchHistoryView("table"));
  elements.prevMonthButton.addEventListener("click", () => changeMonth(-1));
  elements.nextMonthButton.addEventListener("click", () => changeMonth(1));
}

function moveSummaryBelowInput() {
  const heroStats = document.querySelector(".hero-stats");
  if (heroStats && elements.summaryMount) {
    elements.summaryMount.appendChild(heroStats);
  }
}

function renderAll() {
  elements.todayLabel.textContent = formatDateJP(state.todayKey);
  elements.editingDateLabel.textContent = `${formatDateJP(state.currentDate)}のトレーニング`;
  elements.saveButton.textContent = `${formatDateJP(state.currentDate)}を保存`;
  renderSplitButtons();
  renderBodyPartButtons();
  renderTemplateControls();
  renderTodayExercises();
  renderTemplateSummary();
  updateSummaryPanels();
  renderHistoryTable();
  renderCalendar();
  renderPageVisibility();
}

function showHistoryPage() {
  state.currentPage = "history";
  switchHistoryView(elements.tableView.classList.contains("active") ? "table" : "calendar");
  renderHistoryTable();
  renderCalendar();
  renderSelectedDateDetail();
  renderPageVisibility();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showMainPage() {
  state.currentPage = "main";
  renderPageVisibility();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPageVisibility() {
  const isHistoryPage = state.currentPage === "history";
  elements.panelMain.hidden = isHistoryPage;
  elements.panelSide.hidden = isHistoryPage;
  elements.panelHistory.hidden = !isHistoryPage;
}

function renderSplitButtons() {
  elements.splitButtons.innerHTML = "";
  Object.keys(SPLITS).forEach((split) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = split;
    button.classList.toggle("active", split === state.currentSplit);
    button.addEventListener("click", () => {
      state.currentSplit = split;
      const allowedBodyParts = SPLITS[split];
      if (!allowedBodyParts.includes(state.currentBodyPart)) {
        state.currentBodyPart = allowedBodyParts[0];
      }
      renderSplitButtons();
      renderBodyPartButtons();
      renderTemplateControls();
      updateSummaryPanels();
    });
    elements.splitButtons.appendChild(button);
  });
}

function renderBodyPartButtons() {
  elements.bodyPartButtons.innerHTML = "";
  (SPLITS[state.currentSplit] || []).forEach((bodyPartId) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = getBodyPartLabel(bodyPartId);
    button.classList.toggle("active", bodyPartId === state.currentBodyPart);
    button.addEventListener("click", () => {
      state.currentBodyPart = bodyPartId;
      renderBodyPartButtons();
      renderTemplateControls();
      updateSummaryPanels();
    });
    elements.bodyPartButtons.appendChild(button);
  });
}

function renderTemplateControls() {
  const matchingTemplates = getTemplatesForCurrentSelection();
  elements.templateSelect.innerHTML = "";

  if (matchingTemplates.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "該当テンプレートなし";
    elements.templateSelect.appendChild(option);
    elements.templateSelect.disabled = true;
    elements.addTemplateButton.disabled = true;
    return;
  }

  elements.templateSelect.disabled = false;
  elements.addTemplateButton.disabled = false;
  matchingTemplates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = `${template.name} (${getBodyPartLabel(template.bodyPart)})`;
    elements.templateSelect.appendChild(option);
  });
}

function renderTodayExercises() {
  elements.todayExercises.innerHTML = "";

  state.todayExercises.forEach((exercise, exerciseIndex) => {
    const fragment = elements.exerciseTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".exercise-card");
    const nameInput = fragment.querySelector(".exercise-name");
    const bodyPartSelect = fragment.querySelector(".exercise-body-part");
    const notesInput = fragment.querySelector(".exercise-notes");
    const setList = fragment.querySelector(".set-list");
    const addSetButton = fragment.querySelector(".add-set-button");
    const saveTemplateButton = fragment.querySelector(".save-template-button");
    const removeButton = fragment.querySelector(".remove-button");

    populateBodyPartSelect(bodyPartSelect, exercise.bodyPart);
    nameInput.value = exercise.name;
    notesInput.value = exercise.notes;

    nameInput.addEventListener("input", (event) => updateExerciseField(exerciseIndex, "name", event.target.value, card));
    bodyPartSelect.addEventListener("change", (event) => updateExerciseField(exerciseIndex, "bodyPart", event.target.value, card));
    notesInput.addEventListener("input", (event) => updateExerciseField(exerciseIndex, "notes", event.target.value, card));
    addSetButton.addEventListener("click", () => {
      state.todayExercises[exerciseIndex].sets.push(createEmptySet());
      renderExerciseSets(setList, card, exerciseIndex);
      syncExerciseCardUI(card, state.todayExercises[exerciseIndex]);
      updateTopStats();
      updateSummaryPanels();
    });
    saveTemplateButton.addEventListener("click", () => saveTemplateFromExercise(exerciseIndex));
    removeButton.addEventListener("click", () => {
      state.todayExercises.splice(exerciseIndex, 1);
      if (state.todayExercises.length === 0) {
        state.todayExercises.push(createEmptyExercise(state.currentBodyPart));
      }
      renderTodayExercises();
      updateSummaryPanels();
    });

    renderExerciseSets(setList, card, exerciseIndex);
    syncExerciseCardUI(card, exercise);
    elements.todayExercises.appendChild(fragment);
  });

  updateTopStats();
}

function renderExerciseSets(setListElement, card, exerciseIndex) {
  setListElement.innerHTML = "";
  const exercise = state.todayExercises[exerciseIndex];

  exercise.sets.forEach((setItem, setIndex) => {
    const fragment = elements.setRowTemplate.content.cloneNode(true);
    const setIndexElement = fragment.querySelector(".set-index");
    const weightInput = fragment.querySelector(".set-weight");
    const repsInput = fragment.querySelector(".set-reps");
    const removeSetButton = fragment.querySelector(".remove-set-button");

    setIndexElement.textContent = String(setIndex + 1);
    weightInput.value = setItem.weight;
    repsInput.value = setItem.reps;
    weightInput.addEventListener("input", (event) => updateSetField(exerciseIndex, setIndex, "weight", event.target.value, card));
    repsInput.addEventListener("input", (event) => updateSetField(exerciseIndex, setIndex, "reps", event.target.value, card));
    removeSetButton.addEventListener("click", () => {
      state.todayExercises[exerciseIndex].sets.splice(setIndex, 1);
      if (state.todayExercises[exerciseIndex].sets.length === 0) {
        state.todayExercises[exerciseIndex].sets.push(createEmptySet());
      }
      renderExerciseSets(setListElement, card, exerciseIndex);
      syncExerciseCardUI(card, state.todayExercises[exerciseIndex]);
      updateTopStats();
      updateSummaryPanels();
    });

    removeSetButton.disabled = exercise.sets.length === 1;
    setListElement.appendChild(fragment);
  });
}

function populateBodyPartSelect(selectElement, selectedBodyPart) {
  selectElement.innerHTML = "";
  BODY_PARTS.forEach((bodyPart) => {
    const option = document.createElement("option");
    option.value = bodyPart.id;
    option.textContent = bodyPart.label;
    option.selected = bodyPart.id === selectedBodyPart;
    selectElement.appendChild(option);
  });
}

function updateExerciseField(exerciseIndex, key, value, card) {
  state.todayExercises[exerciseIndex][key] = value;
  syncExerciseCardUI(card, state.todayExercises[exerciseIndex]);
  updateTopStats();
  updateSummaryPanels();
}

function updateSetField(exerciseIndex, setIndex, key, value, card) {
  state.todayExercises[exerciseIndex].sets[setIndex][key] = value;
  syncExerciseCardUI(card, state.todayExercises[exerciseIndex]);
  updateTopStats();
  updateSummaryPanels();
}

function syncExerciseCardUI(card, exercise) {
  const exerciseOrder = state.todayExercises.indexOf(exercise) + 1;
  card.querySelector(".exercise-order").textContent = `${exerciseOrder}種目目`;
  card.querySelector(".exercise-total-sets").textContent = String(getEffectiveSetCount(exercise.sets));
  card.querySelector(".exercise-volume").textContent = `${calculateVolume(exercise.sets)}kg`;

  const previousContainer = card.querySelector(".previous-record-text");
  const previousBox = card.querySelector(".previous-record");
  const previousRecord = findMostRecentExercise(exercise.name);

  if (!exercise.name.trim() || !previousRecord) {
    previousBox.hidden = true;
    previousContainer.innerHTML = "";
    return;
  }

  previousBox.hidden = false;
  const noteHtml = previousRecord.exercise.notes ? `<span>${escapeHtml(previousRecord.exercise.notes)}</span>` : "";
  previousContainer.innerHTML = `
    <strong>${escapeHtml(formatDateJP(previousRecord.date))}</strong>
    <span>前回は${previousRecord.exerciseOrder}種目目${previousRecord.exerciseOrder !== exerciseOrder ? `（今回は${exerciseOrder}種目目・実施順が異なります）` : "（今回と同じ順番）"}</span>
    ${formatSetRows(previousRecord.exercise.sets)}
    ${noteHtml}
  `;
}

function updateTopStats() {
  const totalExercises = state.todayExercises.length;
  const totalSets = state.todayExercises.reduce((sum, exercise) => sum + getEffectiveSetCount(exercise.sets), 0);
  const totalVolume = state.todayExercises.reduce((sum, exercise) => sum + calculateVolume(exercise.sets), 0);

  elements.completionStat.textContent = String(totalExercises);
  elements.setStat.textContent = String(totalSets);
  elements.volumeStat.textContent = `${totalVolume}kg`;
}

function updateSummaryPanels() {
  renderPreviousSummary();
  renderPrSummary();
}

function saveCurrentRecord() {
  const normalizedExercises = state.todayExercises
    .map((exercise) => normalizeExercise(exercise, state.currentSplit))
    .filter((exercise) => hasExerciseContent(exercise))
    .map((exercise) => ({
      ...exercise,
      volume: calculateVolume(exercise.sets),
      totalSets: getEffectiveSetCount(exercise.sets),
      isPR: isPersonalRecord(exercise)
    }));

  state.records[state.currentDate] = {
    date: state.currentDate,
    split: state.currentSplit,
    exercises: normalizedExercises
  };

  persistRecords();
  editorBaseline = editorSnapshot();
  elements.saveStatus.textContent = "保存しました。";
  renderAll();
  window.setTimeout(() => {
    elements.saveStatus.textContent = "";
  }, 2200);
}

function renderPreviousSummary() {
  const previousRecord = getLatestRecordForCurrentSplit();
  if (!previousRecord) {
    elements.previousSummary.className = "info-list empty-state";
    elements.previousSummary.textContent = "現在のsplitに合う前回記録はまだありません。種目名を入力すると、各カード内にその種目の前回記録を表示します。";
    return;
  }

  elements.previousSummary.className = "info-list";
  elements.previousSummary.innerHTML = "";
  previousRecord.exercises.forEach((exercise, exerciseIndex) => {
    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML = `
      <strong>${exerciseIndex + 1}種目目: ${escapeHtml(exercise.name || "未入力種目")}</strong>
      <span class="summary-meta">${escapeHtml(formatDateJP(previousRecord.date))} / ${escapeHtml(getBodyPartLabel(exercise.bodyPart))} / ${escapeHtml(previousRecord.split || "-")}</span>
      <span>${formatSetRows(exercise.sets)}</span>
    `;
    elements.previousSummary.appendChild(row);
  });
}

function renderPrSummary() {
  const prs = state.todayExercises
    .map((exercise) => normalizeExercise(exercise, state.currentSplit))
    .filter((exercise) => exercise.name.trim())
    .filter((exercise) => isPersonalRecord(exercise))
    .map((exercise) => ({ exercise, previousBest: getPreviousBest(exercise.name) }));

  if (prs.length === 0) {
    elements.prSummary.className = "info-list empty-state";
    elements.prSummary.textContent = "現在の入力ではPR更新はありません。";
    return;
  }

  elements.prSummary.className = "info-list";
  elements.prSummary.innerHTML = "";
  prs.forEach(({ exercise, previousBest }) => {
    const row = document.createElement("div");
    row.className = "summary-row pr";
    row.innerHTML = `
      <strong>${escapeHtml(exercise.name)}</strong>
      <span>今回: ${escapeHtml(formatCompactSets(exercise.sets))} / ${escapeHtml(`${calculateVolume(exercise.sets)}kg`)}</span>
      <span>過去最高: ${escapeHtml(previousBest ? `${formatCompactSets(previousBest.sets)} / ${calculateVolume(previousBest.sets)}kg` : "初回記録")}</span>
    `;
    elements.prSummary.appendChild(row);
  });
}

function renderTemplateSummary() {
  if (state.templates.length === 0) {
    elements.templateSummary.className = "info-list empty-state";
    elements.templateSummary.textContent = "テンプレートはまだありません。";
    return;
  }

  elements.templateSummary.className = "info-list";
  elements.templateSummary.innerHTML = "";
  state.templates.slice(0, 6).forEach((template) => {
    const row = document.createElement("div");
    row.className = "summary-row template";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(template.name)}</strong>
        <span class="summary-meta">${escapeHtml(getBodyPartLabel(template.bodyPart))} / ${escapeHtml(formatCompactSets(template.sets))}</span>
      </div>
    `;
    elements.templateSummary.appendChild(row);
  });
}

function addExerciseFromSelectedTemplate() {
  const templateId = elements.templateSelect.value;
  const template = state.templates.find((item) => item.id === templateId);
  if (!template) return;

  state.todayExercises.push({
    name: template.name,
    bodyPart: template.bodyPart,
    notes: "",
    sets: cloneSets(template.sets)
  });
  renderTodayExercises();
  updateSummaryPanels();
}

function saveTemplateFromExercise(exerciseIndex) {
  const exercise = normalizeExercise(state.todayExercises[exerciseIndex], state.currentSplit);
  if (!exercise.name.trim()) {
    elements.saveStatus.textContent = "種目名を入力してからテンプレートを保存してください。";
    return;
  }

  const existingIndex = state.templates.findIndex((template) => (
    template.name.trim().toLowerCase() === exercise.name.trim().toLowerCase()
      && template.bodyPart === exercise.bodyPart
  ));
  const template = {
    id: existingIndex >= 0 ? state.templates[existingIndex].id : createId(),
    name: exercise.name.trim(),
    bodyPart: exercise.bodyPart,
    sets: cloneSets(exercise.sets)
  };

  if (existingIndex >= 0) {
    state.templates.splice(existingIndex, 1, template);
  } else {
    state.templates.unshift(template);
  }

  persistTemplates();
  renderTemplateControls();
  renderTemplateSummary();
  elements.saveStatus.textContent = "テンプレートを保存しました。";
}

function switchHistoryView(view) {
  const isCalendar = view === "calendar";
  elements.calendarTab.classList.toggle("active", isCalendar);
  elements.tableTab.classList.toggle("active", !isCalendar);
  elements.calendarView.classList.toggle("active", isCalendar);
  elements.tableView.classList.toggle("active", !isCalendar);
  renderSelectedDateDetail();
}

function renderHistoryTable() {
  const rows = getAllRowsSorted();
  elements.historyTableBody.innerHTML = "";

  if (rows.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = '<td colspan="9" class="empty-state">保存した記録がまだありません。</td>';
    elements.historyTableBody.appendChild(emptyRow);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.tabIndex = 0;
    tr.innerHTML = `
      <td data-label="日付">${escapeHtml(formatDateJP(row.date))}</td>
      <td data-label="Split">${escapeHtml(row.split || "-")}</td>
      <td data-label="部位">${escapeHtml(getBodyPartLabel(row.bodyPart))}</td>
      <td data-label="種目">${escapeHtml(row.name || "未入力種目")}</td>
      <td data-label="セット内容">${formatHistorySetRows(row.sets)}</td>
      <td data-label="合計set">${escapeHtml(String(getEffectiveSetCount(row.sets)))}</td>
      <td data-label="ボリューム">${escapeHtml(`${calculateVolume(row.sets)}kg`)}</td>
      <td data-label="PR"><span class="pill ${row.isPR ? "success" : "neutral"}">${row.isPR ? "更新" : "-"}</span></td>
      <td data-label="メモ">${escapeHtml(row.notes || "-")}</td>
    `;
    tr.addEventListener("click", () => selectCalendarDate(row.date));
    tr.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCalendarDate(row.date);
      }
    });
    elements.historyTableBody.appendChild(tr);
  });
}

function renderSelectedDateDetail() {
  const selectedDate = state.selectedCalendarDate;
  const record = state.records[selectedDate];

  elements.calendarDatePanel.hidden = !state.isCalendarDetailOpen || !elements.calendarView.classList.contains("active");
  elements.tableDatePanel.hidden = !state.isCalendarDetailOpen || !elements.tableView.classList.contains("active");

  if (state.isCalendarDetailOpen) {
    renderDateDetailInto(elements.calendarDateDetail, selectedDate, record, true);
    renderDateDetailInto(elements.tableDateDetail, selectedDate, record, true);
  }
}

function renderDateDetailInto(container, selectedDate, record, expanded) {
  if (!container) return;

  const emptyMarkup = `
    <div class="detail-block">
      <strong>${escapeHtml(formatDateJP(selectedDate))}</strong>
      <p class="action-help">この日はまだ記録がありません。</p>
    </div>
    <button class="button-secondary detail-edit-button" type="button">この日を編集</button>
  `;
  const filledMarkup = `
    <div class="detail-block">
      <strong>${escapeHtml(formatDateJP(selectedDate))}</strong>
      <div class="detail-meta">Split: ${escapeHtml(record?.split || "-")}</div>
    </div>
    ${(record?.exercises || []).map((exercise, exerciseIndex) => `
      <div class="detail-block detail-exercise">
        <strong>${exerciseIndex + 1}種目目: ${escapeHtml(exercise.name || "未入力種目")}</strong>
        <div class="detail-meta">${escapeHtml(getBodyPartLabel(exercise.bodyPart))}</div>
        <div class="detail-meta">${formatSetRows(exercise.sets)}</div>
        ${exercise.notes ? `<div class="detail-meta">メモ: ${escapeHtml(exercise.notes)}</div>` : ""}
      </div>
    `).join("")}
    <button class="button-secondary detail-edit-button" type="button">この日を編集</button>
  `;

  container.className = expanded ? "info-list detail-large" : "info-list";
  container.innerHTML = (!record || !record.exercises || record.exercises.length === 0) ? emptyMarkup : filledMarkup;
  const editButton = container.querySelector(".detail-edit-button");
  if (editButton) {
    editButton.addEventListener("click", () => enterEditMode(selectedDate));
  }
}

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  elements.calendarTitle.textContent = `${year}年 ${month + 1}月`;
  elements.calendarGrid.innerHTML = "";
  renderWeeklyTrainingSummary(year, month);

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    const dayNumber = cellIndex - startWeekday + 1;
    const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
    const date = isCurrentMonth
      ? new Date(year, month, dayNumber)
      : dayNumber <= 0
        ? new Date(year, month - 1, daysInPrevMonth + dayNumber)
        : new Date(year, month + 1, dayNumber - daysInMonth);

    const dateKey = toDateKey(date);
    const record = state.records[dateKey];
    const logs = record?.exercises || [];
    const day = document.createElement("div");
    day.className = "calendar-day";
    if (!isCurrentMonth) day.classList.add("muted");
    if (dateKey === state.todayKey) day.classList.add("today");
    if (dateKey === state.selectedCalendarDate) day.classList.add("selected");
    if (logs.length > 0) day.classList.add("has-log");
    day.tabIndex = 0;

    const notes = logs.slice(0, 3).map((exercise) => {
      const label = `${exercise.name || "未入力"} ${getEffectiveSetCount(exercise.sets)}set`;
      return `<span class="calendar-pill">${escapeHtml(label)}</span>`;
    }).join("");

    day.innerHTML = `
      <div class="calendar-date">${date.getDate()}</div>
      <div class="calendar-notes">
        ${record ? `<span>${escapeHtml(record.split || "-")}</span>` : ""}
        ${notes || '<span class="empty-state">記録なし</span>'}
      </div>
    `;
    day.addEventListener("click", () => selectCalendarDate(dateKey));
    day.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCalendarDate(dateKey);
      }
    });
    elements.calendarGrid.appendChild(day);
  }
}

function renderWeeklyTrainingSummary(year, month) {
  const weekCounts = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const weekIndex = Math.floor((day + firstWeekday - 1) / 7);
    weekCounts[weekIndex] = weekCounts[weekIndex] || 0;
    if (state.records[dateKey]?.exercises?.length > 0) {
      weekCounts[weekIndex] += 1;
    }
  }

  elements.weeklyTrainingSummary.innerHTML = weekCounts
    .map((count, index) => `<span>第${index + 1}週 ${count}回</span>`)
    .join("");
}

function changeMonth(offset) {
  state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + offset, 1);
  renderCalendar();
}

function selectCalendarDate(dateKey) {
  state.selectedCalendarDate = dateKey;
  state.isCalendarDetailOpen = true;
  renderCalendar();
  renderSelectedDateDetail();
  window.setTimeout(() => {
    const detailPanel = elements.tableView.classList.contains("active")
      ? elements.tableDatePanel
      : elements.calendarDatePanel;
    detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
}

function enterEditMode(dateKey) {
  state.currentPage = "main";
  state.currentDate = dateKey;
  state.selectedCalendarDate = dateKey;
  state.calendarDate = new Date(`${dateKey}T00:00:00`);
  loadExercisesForDate(dateKey);
  editorBaseline = editorSnapshot();
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeDateDetail() {
  state.isCalendarDetailOpen = false;
  renderSelectedDateDetail();
  renderCalendar();
}

function loadExercisesForDate(dateKey) {
  const existingRecord = state.records[dateKey];

  if (existingRecord && Array.isArray(existingRecord.exercises) && existingRecord.exercises.length > 0) {
    state.currentSplit = existingRecord.split || "Push";
    state.currentBodyPart = SPLITS[state.currentSplit]?.[0] || "chest";
    state.todayExercises = existingRecord.exercises.map((exercise) => {
      const normalized = normalizeExercise(exercise, state.currentSplit);
      return { ...normalized, sets: cloneSets(normalized.sets) };
    });
    return;
  }

  state.currentSplit = state.currentSplit || "Push";
  state.currentBodyPart = SPLITS[state.currentSplit]?.[0] || "chest";
  state.todayExercises = [createEmptyExercise(state.currentBodyPart)];
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return Object.fromEntries(
      Object.entries(parsed).map(([date, record]) => [date, normalizeRecord(date, record)])
    );
  } catch (error) {
    return {};
  }
}

function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return defaultTemplates.map(cloneTemplate);
    const parsed = JSON.parse(raw);
    const normalized = Array.isArray(parsed) ? parsed.map(normalizeTemplate) : [];
    return normalized;
  } catch (error) {
    return defaultTemplates.map(cloneTemplate);
  }
}

function persistRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function persistTemplates() {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(state.templates));
}

function normalizeRecord(date, record) {
  const split = record?.split || inferSplitFromExercises(record?.exercises || []);
  return {
    date,
    split,
    exercises: Array.isArray(record?.exercises) ? record.exercises.map((exercise) => normalizeExercise(exercise, split)) : []
  };
}

function normalizeExercise(exercise, splitHint = "") {
  const normalizedSets = Array.isArray(exercise?.sets) && exercise.sets.length > 0
    ? exercise.sets.map(normalizeSet).filter(hasSetContent)
    : convertLegacyFieldsToSets(exercise);

  return {
    name: exercise?.name || "",
    bodyPart: normalizeBodyPart(exercise?.bodyPart || "chest", splitHint, exercise?.name || ""),
    notes: exercise?.notes || "",
    sets: normalizedSets.length > 0 ? normalizedSets : [createEmptySet()],
    isPR: Boolean(exercise?.isPR)
  };
}

function normalizeSet(setItem) {
  return {
    weight: setItem?.weight !== undefined ? String(setItem.weight) : "",
    reps: setItem?.reps !== undefined ? String(setItem.reps) : ""
  };
}

function normalizeTemplate(template) {
  return {
    id: template?.id || createId(),
    name: template?.name || "",
    bodyPart: normalizeBodyPart(template?.bodyPart || "chest", "", template?.name || ""),
    sets: (template?.sets || []).map(normalizeSet).filter(hasSetContent)
  };
}

function convertLegacyFieldsToSets(exercise) {
  const legacyWeight = exercise?.weight !== undefined ? String(exercise.weight) : "";
  const legacyReps = exercise?.reps !== undefined ? String(exercise.reps) : "";
  const legacySetCount = Math.max(Number(exercise?.sets) || 0, 1);

  if (!legacyWeight && !legacyReps) {
    return [createEmptySet()];
  }

  return Array.from({ length: legacySetCount }, () => ({
    weight: legacyWeight,
    reps: legacyReps
  }));
}

function getLatestRecordForCurrentSplit() {
  const allowedBodyParts = SPLITS[state.currentSplit] || [];
  const dates = Object.keys(state.records)
    .filter((date) => date < state.currentDate)
    .sort()
    .reverse();

  for (const date of dates) {
    const record = state.records[date];
    if (record.split === state.currentSplit) {
      return record;
    }

    const matchingExercises = record.exercises.filter((exercise) => allowedBodyParts.includes(exercise.bodyPart));
    if (matchingExercises.length > 0) {
      return { ...record, exercises: matchingExercises };
    }
  }

  return null;
}

function findMostRecentExercise(name) {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return null;

  const dates = Object.keys(state.records)
    .filter((date) => date < state.currentDate)
    .sort()
    .reverse();

  for (const date of dates) {
    const exercises = state.records[date].exercises;
    const matchIndex = exercises.findIndex((exercise) => exercise.name.trim().toLowerCase() === normalizedName);
    if (matchIndex !== -1) {
      return { date, exercise: normalizeExercise(exercises[matchIndex]), exerciseOrder: matchIndex + 1 };
    }
  }

  return null;
}

function getPreviousBest(name, beforeDate = state.currentDate) {
  const normalizedName = name.trim().toLowerCase();
  let best = null;

  Object.keys(state.records).forEach((date) => {
    if (date >= beforeDate) return;
    state.records[date].exercises.forEach((exercise) => {
      if (exercise.name.trim().toLowerCase() !== normalizedName) return;
      if (!best || calculateVolume(exercise.sets) > calculateVolume(best.sets)) {
        best = normalizeExercise(exercise);
      }
    });
  });

  return best;
}

function isPersonalRecord(exercise, beforeDate = state.currentDate) {
  if (!exercise.name.trim()) return false;
  const currentVolume = calculateVolume(exercise.sets);
  if (currentVolume === 0) return false;
  const previousBest = getPreviousBest(exercise.name, beforeDate);
  if (!previousBest) return true;
  return currentVolume > calculateVolume(previousBest.sets);
}

function getAllRowsSorted() {
  return Object.values(state.records)
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((record) => record.exercises.map((exercise) => ({
      date: record.date,
      split: record.split,
      ...normalizeExercise(exercise, record.split),
      isPR: isPersonalRecord(exercise, record.date)
    })));
}

function getTemplatesForCurrentSelection() {
  return state.templates.filter((template) => {
    const allowedBodyParts = SPLITS[state.currentSplit] || [];
    return allowedBodyParts.includes(template.bodyPart) && template.bodyPart === state.currentBodyPart;
  });
}

function calculateVolume(sets) {
  return sets.reduce((sum, setItem) => {
    const weight = Number(setItem.weight) || 0;
    const reps = Number(setItem.reps) || 0;
    return sum + (weight * reps);
  }, 0);
}

function getEffectiveSetCount(sets) {
  return sets.filter(hasSetContent).length;
}

function hasSetContent(setItem) {
  return String(setItem.weight || "").trim() !== "" || String(setItem.reps || "").trim() !== "";
}

function hasExerciseContent(exercise) {
  return exercise.name.trim() !== "" || exercise.notes.trim() !== "" || exercise.sets.some(hasSetContent);
}

function inferSplitFromExercises(exercises) {
  const bodyParts = exercises.map((exercise) => normalizeExercise(exercise).bodyPart);
  if (bodyParts.length > 0 && bodyParts.every((bodyPart) => SPLITS.Legs.includes(bodyPart))) return "Legs";
  if (bodyParts.length > 0 && bodyParts.every((bodyPart) => SPLITS.Pull.includes(bodyPart))) return "Pull";
  return "Push";
}

function normalizeBodyPart(bodyPart, splitHint = "", exerciseName = "") {
  if (bodyPart === "arms" || bodyPart === "arm" || bodyPart === "腕") {
    if (splitHint === "Pull") return "biceps";
    if (splitHint === "Push") return "triceps";
    return inferArmBodyPartFromName(exerciseName);
  }

  return BODY_PARTS.some((item) => item.id === bodyPart) ? bodyPart : "chest";
}

function inferArmBodyPartFromName(exerciseName) {
  const lowerName = exerciseName.trim().toLowerCase();
  const bicepsHints = ["curl", "カール", "chin", "チン", "pull"];
  const tricepsHints = ["pushdown", "extension", "dip", "ディップ", "プレスダウン", "エクステンション"];

  if (bicepsHints.some((hint) => lowerName.includes(hint))) return "biceps";
  if (tricepsHints.some((hint) => lowerName.includes(hint))) return "triceps";
  return "triceps";
}

function formatSetRows(sets) {
  const rows = sets.filter(hasSetContent).map((setItem, index) => (
    `<span class="previous-set-row">${index + 1}セット目: ${escapeHtml(withUnit(setItem.weight, "kg"))} x ${escapeHtml(withUnit(setItem.reps, "回"))}</span>`
  ));
  return rows.length > 0 ? rows.join("") : '<span class="empty-state">セット記録なし</span>';
}

function formatHistorySetRows(sets) {
  const rows = sets.filter(hasSetContent).map((setItem, index) => (
    `<span class="history-set-row">${index + 1}. ${escapeHtml(withUnit(setItem.weight, "kg"))} x ${escapeHtml(withUnit(setItem.reps, "回"))}</span>`
  ));
  return rows.length > 0 ? rows.join("") : "-";
}

function formatCompactSets(sets) {
  const rows = sets.filter(hasSetContent).map((setItem) => `${withUnit(setItem.weight, "kg")}x${withUnit(setItem.reps, "回")}`);
  return rows.length > 0 ? rows.join(" / ") : "セット記録なし";
}

function withUnit(value, unit) {
  if (value === "" || value === null || value === undefined) return "-";
  return `${value}${unit}`;
}

function getBodyPartLabel(bodyPartId) {
  return BODY_PARTS.find((bodyPart) => bodyPart.id === bodyPartId)?.label || bodyPartId;
}

function getTodayKey() {
  return toDateKey(new Date());
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateJP(dateKey) {
  const [year, month, day] = dateKey.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function createEmptyExercise(bodyPart = "chest") {
  return {
    name: "",
    bodyPart,
    notes: "",
    sets: [createEmptySet()]
  };
}

function createEmptySet() {
  return { weight: "", reps: "" };
}

function cloneSets(sets) {
  return sets.map((setItem) => ({ ...setItem }));
}

function cloneTemplate(template) {
  return {
    ...template,
    sets: cloneSets(template.sets)
  };
}

function createId() {
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
