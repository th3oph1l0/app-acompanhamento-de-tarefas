/*
  Aplicação: Lista de Tarefas com duas telas (Tarefas / Estatísticas)
  - Interface responsiva mobile (uma tela)
  - Entrada do usuário: formulário, busca, filtros, botões
  - Lógica: validação, ordenação, filtros, cálculos de estatísticas
*/

const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));

const state = {
  tasks: load() || sampleTasks(),
  ui: { screen: 'tasks', search: '', filterPriority: 'all', sort: 'created' }
};

/* --- Elements --- */
const tabs = { tasks: qs('#tab-tasks'), stats: qs('#tab-stats') };
const screens = { tasks: qs('#screen-tasks'), stats: qs('#screen-stats') };

const form = qs('#task-form');
const inputTitle = qs('#task-title');
const inputPriority = qs('#task-priority');
const inputEstimate = qs('#task-estimate');

const listEl = qs('#task-list');
const searchEl = qs('#search');
const filterPriorityEl = qs('#filter-priority');
const sortEl = qs('#sort');
const clearDoneBtn = qs('#clear-done');

const statTotal = qs('#stat-total');
const statDone = qs('#stat-done');
const statHours = qs('#stat-hours');
const breakdownList = qs('#breakdown-list');

/* --- Navigation --- */
tabs.tasks.addEventListener('click', () => switchScreen('tasks'));
tabs.stats.addEventListener('click', () => switchScreen('stats'));
function switchScreen(name){
  state.ui.screen = name;
  qsa('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-'+name));
  qsa('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-'+name));
  render();
}

/* --- Form handling --- */
form.addEventListener('submit', e => {
  e.preventDefault();
  const title = inputTitle.value.trim();
  if(!title) return flash(inputTitle);
  const priority = inputPriority.value;
  const estimate = parseFloat(inputEstimate.value) || 0;
  const task = {
    id: cryptoRandomId(),
    title,
    priority,
    estimate,
    done: false,
    createdAt: Date.now()
  };
  state.tasks.unshift(task);
  save();
  form.reset();
  inputTitle.focus();
  render();
});

/* --- Controls --- */
searchEl.addEventListener('input', e => { state.ui.search = e.target.value; render(); });
filterPriorityEl.addEventListener('change', e => { state.ui.filterPriority = e.target.value; render(); });
sortEl.addEventListener('change', e => { state.ui.sort = e.target.value; render(); });
clearDoneBtn.addEventListener('click', () => {
  state.tasks = state.tasks.filter(t => !t.done);
  save();
  render();
});

/* --- Render loop --- */
function render(){
  renderList();
  renderStats();
}

/* Render tasks list with filters, search, sort */
function renderList(){
  const s = state.ui;
  let items = state.tasks.slice();

  // Search
  if(s.search) {
    const q = s.search.toLowerCase();
    items = items.filter(t => t.title.toLowerCase().includes(q));
  }

  // Priority filter
  if(s.filterPriority !== 'all'){
    items = items.filter(t => t.priority === s.filterPriority);
  }

  // Sorting
  if(s.sort === 'created'){
    items.sort((a,b)=>b.createdAt - a.createdAt);
  } else if(s.sort === 'priority'){
    const map = { high:3, medium:2, low:1 };
    items.sort((a,b)=>map[b.priority]-map[a.priority]);
  } else if(s.sort === 'estimate'){
    items.sort((a,b)=> (a.estimate||0) - (b.estimate||0));
  }

  // Build DOM
  listEl.innerHTML = '';
  if(items.length===0){
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.textContent = 'Nenhuma tarefa encontrada.';
    listEl.appendChild(empty);
    return;
  }

  for(const t of items){
    const li = document.createElement('li');
    li.className = 'item';

    const cb = document.createElement('button');
    cb.className = 'checkbox';
    cb.title = t.done ? 'Marcar como não concluída' : 'Marcar como concluída';
    cb.innerHTML = t.done ? '✓' : '';
    cb.addEventListener('click', ()=>{ toggleDone(t.id); });
    li.appendChild(cb);

    const info = document.createElement('div');
    info.className = 'info';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = t.title;
    if(t.done) title.style.textDecoration = 'line-through';
    info.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span class="p-${t.priority}">${labelPriority(t.priority)}</span> • ${t.estimate || 0}h`;
    info.appendChild(meta);

    li.appendChild(info);

    const actions = document.createElement('div');
    actions.style.display='flex';
    actions.style.gap='6px';
    actions.style.alignItems='center';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon';
    editBtn.title = 'Editar';
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', ()=> editTask(t.id));
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon';
    delBtn.title = 'Excluir';
    delBtn.textContent = '🗑';
    delBtn.addEventListener('click', ()=> { if(confirm('Excluir tarefa?')) removeTask(t.id); });
    actions.appendChild(delBtn);

    li.appendChild(actions);
    listEl.appendChild(li);
  }
}

/* --- Stats --- */
function renderStats(){
  const total = state.tasks.length;
  const done = state.tasks.filter(t=>t.done).length;
  const hours = state.tasks.reduce((s,t)=>s+(t.estimate||0),0);

  statTotal.textContent = total;
  statDone.textContent = done;
  statHours.textContent = hours.toFixed(2).replace('.',',');

  // breakdown by priority
  const counts = { high:0, medium:0, low:0 };
  for(const t of state.tasks) counts[t.priority]++;

  breakdownList.innerHTML = '';
  for(const p of ['high','medium','low']){
    const li = document.createElement('li');
    li.className = 'item';
    li.innerHTML = `<div class="info"><div class="title">${labelPriority(p)}</div><div class="meta">${counts[p]} tarefas</div></div>`;
    breakdownList.appendChild(li);
  }
}

/* --- Task actions --- */
function toggleDone(id){
  const t = state.tasks.find(x=>x.id===id); if(!t) return;
  t.done = !t.done;
  save(); render();
}

function removeTask(id){
  state.tasks = state.tasks.filter(t=>t.id!==id);
  save(); render();
}

function editTask(id){
  const t = state.tasks.find(x=>x.id===id); if(!t) return;
  const newTitle = prompt('Editar título', t.title);
  if(newTitle===null) return;
  const trimmed = newTitle.trim();
  if(!trimmed){ alert('Título não pode ficar vazio'); return; }
  t.title = trimmed;
  save(); render();
}

/* --- Utilities --- */
function labelPriority(p){
  return p === 'high' ? 'Alta' : (p === 'medium' ? 'Média' : 'Baixa');
}
function cryptoRandomId(){ return Math.random().toString(36).slice(2,9); }
function flash(el){
  el.animate([{boxShadow:'0 0 0 4px rgba(13,110,253,0.12)'},{boxShadow:'none'}],{duration:350});
}

/* --- Persistence --- */
function save(){ localStorage.setItem('tasks_v1', JSON.stringify(state.tasks)); }
function load(){ try{ return JSON.parse(localStorage.getItem('tasks_v1') || 'null'); }catch(e){return null;} }

/* --- Sample data for first use --- */
function sampleTasks(){
  return [
    { id: 'a1', title: 'Estudar para prova de história', priority:'high', estimate:2, done:false, createdAt: Date.now()-3600_000 },
    { id: 'b2', title: 'Fazer exercícios de matemática', priority:'medium', estimate:1.5, done:false, createdAt: Date.now()-7200_000 },
    { id: 'c3', title: 'Ler capítulo do livro', priority:'low', estimate:0.5, done:true, createdAt: Date.now()-1000_000 }
  ];
}

/* --- Start --- */
switchScreen(state.ui.screen);
render();