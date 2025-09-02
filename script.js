// script.js

const appState = {
  deadline: null,
  tasks: [],
  dateFormat: 'yyyy-MM-dd',
  excludeHolidays: true,
  holidays: [],
  enabledHolidays: new Set()
};

const elems = {
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  dateFormatSelect: document.getElementById('date-format'),
  excludeHolidaysCheckbox: document.getElementById('exclude-holidays'),
  holidayItems: document.getElementById('holiday-items'),
  deadlineInput: document.getElementById('deadline'),
  setDeadlineBtn: document.getElementById('set-deadline'),
  deadlineDisplay: document.getElementById('deadline-display'),
  taskSection: document.getElementById('task-section'),
  taskNameInput: document.getElementById('task-name'),
  taskDurationInput: document.getElementById('task-duration'),
  addTaskBtn: document.getElementById('add-task'),
  planTable: document.getElementById('plan-table'),
  planBody: document.getElementById('plan-body'),
  noTasksMsg: document.getElementById('no-tasks-msg')
};

// Load and parse holidays
async function loadHolidays() {
  const resp = await fetch('/holidays.json');
  const data = await resp.json();
  const events = data.vcalendar[0].vevent;
  appState.holidays = events.map(e => {
    const d = e.dtstart[0];
    return {
      date: new Date(+d.slice(0,4), +d.slice(4,6)-1, +d.slice(6,8)),
      summary: e.summary
    };
  });
  appState.holidays.forEach(h => appState.enabledHolidays.add(h.date.getTime()));
  renderHolidays(); // Display holidays after loading
}

// Render holidays list for reference
function renderHolidays() {
  elems.holidayItems.innerHTML = '';
  if (!appState.holidays.length) {
    elems.holidayItems.textContent = 'No holidays loaded.';
    return;
  }
  
  appState.holidays.forEach(h => {
    const div = document.createElement('div');
    div.className = 'holiday-item';
    
    const dateSpan = document.createElement('span');
    dateSpan.className = 'holiday-date';
    dateSpan.textContent = formatDate(h.date);
    
    const summarySpan = document.createElement('span');
    summarySpan.textContent = h.summary;
    
    div.appendChild(dateSpan);
    div.appendChild(summarySpan);
    elems.holidayItems.appendChild(div);
  });
}

// Check if holiday should be excluded
function isHoliday(date) {
  return appState.excludeHolidays && appState.enabledHolidays.has(date.getTime());
}

// Skip weekends and excluded holidays
function skipNonWorkingDays(date) {
  const d = new Date(date);
  while (d.getDay() === 0 || d.getDay() === 6 || isHoliday(d)) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

// Format date
function formatDate(date) {
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const MMM = date.toLocaleString(undefined, { month: 'short' });
  switch (appState.dateFormat) {
    case 'MM/dd/yyyy': return `${MM}/${dd}/${yyyy}`;
    case 'dd MMM yyyy': return `${dd} ${MMM} ${yyyy}`;
    default: return `${yyyy}-${MM}-${dd}`;
  }
}

function getWeekday(date) {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()];
}


// Update displayed deadline
function updateDeadlineDisplay() {
  if (!appState.deadline) return;
  elems.deadlineDisplay.textContent = 'Deadline: ' + formatDate(appState.deadline);
}

// Calculate task dates
function calculateTaskDates() {
  if (!appState.deadline) return;
  let currentEnd = skipNonWorkingDays(appState.deadline);
  for (let i = appState.tasks.length - 1; i >= 0; i--) {
    const t = appState.tasks[i];
    t.endDate = new Date(currentEnd);
    let daysRemaining = t.duration;
    let cursor = new Date(currentEnd);
    while (daysRemaining > 0) {
      cursor.setDate(cursor.getDate() - 1);
      if (cursor.getDay() !== 0 && cursor.getDay() !== 6 && !isHoliday(cursor)) {
        daysRemaining--;
      }
    }
    t.startDate = skipNonWorkingDays(cursor);
    const prev = new Date(t.startDate);
    prev.setDate(prev.getDate() - 1);
    currentEnd = skipNonWorkingDays(prev);
  }
}

// Render tasks
function renderTasks() {
  elems.planTable.style.display = 'none';
  elems.noTasksMsg.style.display = 'none';

  if (!appState.deadline) {
    elems.noTasksMsg.textContent = 'Please set a deadline first.';
    elems.noTasksMsg.style.display = 'block';
    return;
  }
  if (!appState.tasks.length) {
    elems.noTasksMsg.textContent = 'No tasks added yet.';
    elems.noTasksMsg.style.display = 'block';
    return;
  }

  elems.planBody.innerHTML = '';
  appState.tasks.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.name}</td>
      <td>${formatDate(t.startDate)}</td>
      <td>${getWeekday(t.startDate)}</td>
      <td>${formatDate(t.endDate)}</td>
      <td>${getWeekday(t.endDate)}</td>
      <td>${t.duration}</td>
    `;
    elems.planBody.appendChild(tr);
  });
  elems.planTable.style.display = 'table';
}


// Event handlers
elems.tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    elems.tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    elems.tabContents.forEach(c => c.classList.remove('active'));
    document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
  });
});

elems.dateFormatSelect.addEventListener('change', () => {
  appState.dateFormat = elems.dateFormatSelect.value;
  updateDeadlineDisplay();
  renderTasks();
  renderHolidays(); // Re-render holidays with new date format
});

elems.excludeHolidaysCheckbox.addEventListener('change', () => {
  appState.excludeHolidays = elems.excludeHolidaysCheckbox.checked;
  calculateTaskDates();
  renderTasks();
});

elems.setDeadlineBtn.addEventListener('click', () => {
  const dt = elems.deadlineInput.valueAsDate;
  if (!dt) return alert('Pick a valid date.');
  appState.deadline = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  calculateTaskDates();
  updateDeadlineDisplay();
  elems.taskSection.style.display = 'block';
  renderTasks();
});

elems.addTaskBtn.addEventListener('click', () => {
  const name = elems.taskNameInput.value.trim();
  const dur = parseInt(elems.taskDurationInput.value, 10);
  if (!name || isNaN(dur) || dur < 1) {
    return alert('Enter valid task & duration.');
  }
  appState.tasks.push({ name, duration: dur });
  elems.taskNameInput.value = '';
  elems.taskDurationInput.value = '';
  calculateTaskDates();
  renderTasks();
});

// Initialize
(async function init() {
  await loadHolidays();
  renderTasks();
})();
