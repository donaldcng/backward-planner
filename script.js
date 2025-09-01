// 1. App state
const appState = {
  deadline: null,
  tasks: [],
  dateFormat: 'yyyy-MM-dd'
};

// 2. Element references
const elems = {
  dateFormatSelect: document.getElementById('date-format'),
  deadlineInput: document.getElementById('deadline'),
  setDeadlineBtn: document.getElementById('set-deadline'),
  deadlineDisplay: document.getElementById('deadline-display'),
  taskSection: document.getElementById('task-section'),
  taskNameInput: document.getElementById('task-name'),
  taskDurationInput: document.getElementById('task-duration'),
  addTaskBtn: document.getElementById('add-task'),
  planTable: document.getElementById('plan-table'),
  planBody: document.getElementById('plan-body'),
  noTasksMsg: document.getElementById('no-tasks-msg'),
};

// 3. Format date for display
function formatDate(date) {
  const yyyy = date.getFullYear()
  const MM = String(date.getMonth()+1).padStart(2,'0')
  const dd = String(date.getDate()).padStart(2,'0')
  const MMM = date.toLocaleString(undefined,{month:'short'})

  switch(appState.dateFormat){
    case 'MM/dd/yyyy': return `${MM}/${dd}/${yyyy}`
    case 'dd MMM yyyy': return `${dd} ${MMM} ${yyyy}`
    default: return `${yyyy}-${MM}-${dd}`
  }
}

// 4. Update deadline display
function updateDeadlineDisplay(){
  if(!appState.deadline) return
  elems.deadlineDisplay.textContent = 
    'Deadline: '+formatDate(appState.deadline)
}

// 5. Calculate task dates backward
function calculateTaskDates(){
  if(!appState.deadline) return
  let currentEnd = new Date(appState.deadline)
  for(let i=appState.tasks.length-1;i>=0;i--){
    const t = appState.tasks[i]
    t.endDate = new Date(currentEnd)
    const start = new Date(currentEnd)
    start.setDate(start.getDate()-t.duration)
    t.startDate = start
    currentEnd = new Date(start)
  }
}

// 6. Render tasks table
function renderTasks(){
  elems.planTable.style.display='none'
  elems.noTasksMsg.style.display='none'

  if(!appState.deadline){
    elems.noTasksMsg.textContent='Please set a deadline first.'
    elems.noTasksMsg.style.display='block'
    return
  }
  if(appState.tasks.length===0){
    elems.noTasksMsg.textContent='No tasks added yet.'
    elems.noTasksMsg.style.display='block'
    return
  }

  elems.planBody.innerHTML=''
  appState.tasks.forEach(t=>{
    const row=document.createElement('tr')
    row.innerHTML=`
      <td>${t.name}</td>
      <td>${formatDate(t.startDate)}</td>
      <td>${formatDate(t.endDate)}</td>
      <td>${t.duration}</td>
    `
    elems.planBody.appendChild(row)
  })
  elems.planTable.style.display='table'
}

// 7. Event handlers

// Format change
elems.dateFormatSelect.addEventListener('change',()=>{
  appState.dateFormat=elems.dateFormatSelect.value
  updateDeadlineDisplay()
  renderTasks()
})

// Set deadline using date picker
elems.setDeadlineBtn.addEventListener('click',()=>{
  const dt = elems.deadlineInput.valueAsDate
  if(!dt) return alert('Please pick a valid date.')
  appState.deadline=new Date(dt.getFullYear(),dt.getMonth(),dt.getDate())
  calculateTaskDates()
  updateDeadlineDisplay()
  elems.taskSection.style.display='block'
  renderTasks()
})

// Add task
elems.addTaskBtn.addEventListener('click',()=>{
  const name=elems.taskNameInput.value.trim()
  const duration=parseInt(elems.taskDurationInput.value,10)
  if(!name||isNaN(duration)||duration<1){
    return alert('Enter valid task name & duration.')
  }
  appState.tasks.push({name,duration})
  elems.taskNameInput.value=''
  elems.taskDurationInput.value=''
  calculateTaskDates()
  renderTasks()
})

// Initial render
renderTasks()
