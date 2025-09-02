// script.js

// ─── State ─────────────────────────────────────────────────────────────────────
const state = {
  deadline: null,
  tasks: [],
  dateFormat: 'yyyy-MM-dd',
  skipHolidays: true,
  holidays: [],
  holidaySet: new Set()
};

// ─── Element References ─────────────────────────────────────────────────────────
const refs = {
  // Tabs
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Settings
  dateFormatSelect: document.getElementById('date-format'),
  skipHolidaysCheckbox: document.getElementById('exclude-holidays'),
  holidayContainer: document.getElementById('holiday-items'),

  // Deadline
  deadlineInput: document.getElementById('deadline'),
  setDeadlineBtn: document.getElementById('set-deadline'),
  deadlineDisplay: document.getElementById('deadline-display'),

  // Tasks
  taskSection: document.getElementById('task-section'),
  taskNameInput: document.getElementById('task-name'),
  taskDurationInput: document.getElementById('task-duration'),
  addTaskBtn: document.getElementById('add-task'),

  // Plan Table
  planTable: document.getElementById('plan-table'),
  planBody: document.getElementById('plan-body'),
  noTasksMsg: document.getElementById('no-tasks-msg')
};

// ─── Initialization ────────────────────────────────────────────────────────────
initApp();

async function initApp() {
  bindEventListeners();
  await loadHolidays();
  renderHolidays();
  renderTasks();
}

// ─── Event Binding ─────────────────────────────────────────────────────────────
function bindEventListeners() {
  refs.tabButtons.forEach(btn => btn.addEventListener('click', handleTabSwitch));
  refs.dateFormatSelect.addEventListener('change', handleFormatChange);
  refs.skipHolidaysCheckbox.addEventListener('change', handleSkipHolidaysToggle);
  refs.setDeadlineBtn.addEventListener('click', handleSetDeadline);
  refs.addTaskBtn.addEventListener('click', handleAddTask);
}

// ─── Event Handlers ────────────────────────────────────────────────────────────
function handleTabSwitch(e) {
  const target = e.currentTarget.dataset.tab;
  refs.tabButtons.forEach(b => b.classList.toggle('active', b === e.currentTarget));
  refs.tabContents.forEach(c => c.classList.toggle('active', c.id === `${target}-tab`));
}

function handleFormatChange() {
  state.dateFormat = refs.dateFormatSelect.value;
  updateDeadlineDisplay();
  renderHolidays();
  renderTasks();
}

function handleSkipHolidaysToggle() {
  state.skipHolidays = refs.skipHolidaysCheckbox.checked;
  calculateDatesForAllTasks();
  renderTasks();
}

function handleSetDeadline() {
  const date = refs.deadlineInput.valueAsDate;
  if (!date) return alert('Please pick a valid date.');
  state.deadline = normalizeDate(date);
  calculateDatesForAllTasks();
  updateDeadlineDisplay();
  refs.taskSection.style.display = 'block';
  renderTasks();
}

function handleAddTask() {
  const name = refs.taskNameInput.value.trim();
  const duration = parseInt(refs.taskDurationInput.value, 10);
  if (!name || isNaN(duration) || duration < 1) {
    return alert('Enter valid task name and duration.');
  }
  state.tasks.push({ name, duration });
  refs.taskNameInput.value = '';
  refs.taskDurationInput.value = '';
  calculateDatesForAllTasks();
  renderTasks();
}

// ─── Holidays Logic ────────────────────────────────────────────────────────────
async function loadHolidays() {
  const resp = await fetch('/holidays.json');
  const { vcalendar } = await resp.json();
  state.holidays = vcalendar[0].vevent.map(e => parseHoliday(e));
  state.holidays.forEach(h => state.holidaySet.add(+h.date));
}

function parseHoliday(event) {
  const raw = event.dtstart[0];
  const date = new Date(+raw.slice(0,4), +raw.slice(4,6)-1, +raw.slice(6,8));
  return { date: normalizeDate(date), summary: event.summary };
}

function renderHolidays() {
  refs.holidayContainer.innerHTML = '';
  state.holidays.forEach(({ date, summary }) => {
    const div = document.createElement('div');
    div.className = 'holiday-item';
    div.innerHTML = `<span class="holiday-date">${formatDate(date)}</span> ${summary}`;
    refs.holidayContainer.appendChild(div);
  });
}

// ─── Date Calculation ──────────────────────────────────────────────────────────
function calculateDatesForAllTasks() {
  if (!state.deadline) return;
  let cursor = getLastWorkingDay(state.deadline);

  for (let i = state.tasks.length - 1; i >= 0; i--) {
    const task = state.tasks[i];
    task.endDate = new Date(cursor);
    task.startDate = findStartDate(cursor, task.duration);
    cursor = getLastWorkingDay(addDays(task.startDate, -1));
  }
}

function getLastWorkingDay(date) {
  let d = new Date(date);
  while (isWeekend(d) || isExcludedHoliday(d)) {
    d = addDays(d, -1);
  }
  return normalizeDate(d);
}

function findStartDate(endDate, duration) {
  let daysLeft = duration;
  let d = new Date(endDate);
  while (daysLeft > 0) {
    d = addDays(d, -1);
    if (!isWeekend(d) && !isExcludedHoliday(d)) daysLeft--;
  }
  return normalizeDate(d);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isExcludedHoliday(date) {
  return state.skipHolidays && state.holidaySet.has(+normalizeDate(date));
}

// ─── Rendering Tasks ──────────────────────────────────────────────────────────
function renderTasks() {
  toggleVisibility(refs.planTable, state.tasks.length > 0 && state.deadline);
  refs.noTasksMsg.textContent = state.deadline
    ? state.tasks.length ? '' : 'No tasks added yet.'
    : 'Please set a deadline first.';
  toggleVisibility(refs.noTasksMsg, !state.tasks.length || !state.deadline);

  if (state.tasks.length && state.deadline) {
    refs.planBody.innerHTML = '';
    state.tasks.forEach(t => refs.planBody.appendChild(createTaskRow(t)));
  }
}

function createTaskRow({ name, startDate, endDate, duration }) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${name}</td>
    <td>${formatDate(startDate)}</td>
    <td>${getWeekday(startDate)}</td>
    <td>${formatDate(endDate)}</td>
    <td>${getWeekday(endDate)}</td>
    <td>${duration}</td>
  `;
  return tr;
}

// ─── Utility Functions ────────────────────────────────────────────────────────
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  switch (state.dateFormat) {
    case 'MM/dd/yyyy': return `${m}/${d}/${y}`;
    case 'dd MMM yyyy': return `${d} ${date.toLocaleString(undefined,{month:'short'})} ${y}`;
    default: return `${y}-${m}-${d}`;
  }
}

function getWeekday(date) {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()];
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toggleVisibility(elem, show) {
  elem.style.display = show ? '' : 'none';
}

function updateDeadlineDisplay() {
  refs.deadlineDisplay.textContent =
    state.deadline ? 'Deadline: ' + formatDate(state.deadline) : '';
}
