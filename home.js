 (function(){
  // Matrix canvas + RAF + debounce
  const canvas = document.getElementById('matrix');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  let cols = 0, ypos = [], rafId = null, running = true;

  function debounce(fn, wait){ let t = null; return function(...a){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,a), wait); }; }

  function resize(){
    if(!canvas) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    cols = Math.max(8, Math.floor(canvas.width / 12)); ypos = Array(cols).fill(0).map(()=>Math.random()*20);
  }
  const onResize = debounce(resize, 120);

  function loop(){
    if(!ctx || !running) return;
    ctx.fillStyle = 'rgba(0,0,0,0.04)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = 'rgba(0,255,120,0.85)'; ctx.font = '12px "Share Tech Mono", monospace';
    for(let i=0;i<cols;i++){
      const ch = String.fromCharCode(33 + Math.random()*94);
      const x = i * 14; ctx.fillText(ch, x, ypos[i]*14);
      if(ypos[i]*14 > canvas.height && Math.random()>0.97) ypos[i]=0;
      ypos[i] += 1.4 + Math.random()*1.0;
    }
    rafId = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', onResize);
  resize(); loop();
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden){ running=false; if(rafId) cancelAnimationFrame(rafId); } else { running=true; loop(); } });

  // simple storage helpers
  function getUsers(){ try{return JSON.parse(localStorage.getItem('users')||'[]')}catch(e){return []} }
  function saveUsers(u){ localStorage.setItem('users', JSON.stringify(u)); }
  function getSession(){ try{return JSON.parse(localStorage.getItem('sessionUser'))}catch(e){return null} }
  function setSession(s){ localStorage.setItem('sessionUser', JSON.stringify(s)); }

  // UI elements
  const welcome = document.getElementById('home-welcome');
  const avatar = document.getElementById('avatar');
  const signout = document.getElementById('signout');
  const tiles = Array.from(document.querySelectorAll('.tiles .tile'));
  const content = document.getElementById('content');

  const session = getSession();
  if(!session){ window.location.href = 'index.html'; return; }

  function refreshHeader(){ welcome.textContent = `Hello, ${session.name.split(' ')[0]}`; avatar.textContent = session.name.split(' ')[0].charAt(0).toUpperCase(); }
  refreshHeader();

  signout && signout.addEventListener('click', ()=>{ localStorage.removeItem('sessionUser'); window.location.href = 'index.html'; });

  // view renderers
  function renderDashboard(){
    const users = getUsers();
    content.innerHTML = `
      <h3>Dashboard</h3>
      <div class="panel-row">
        <div class="tile-stat">
          <div class="small">Registered users</div>
          <div class="tile-value">${users.length}</div>
        </div>
        <div class="tile-stat">
          <div class="small">Your email</div>
          <div class="tile-value">${escapeHtml(session.email)}</div>
        </div>
      </div>
      <p class="small">This is a client-side demo dashboard. Data is stored in localStorage.</p>
    `;
  }

  function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function renderProfile(){
    content.innerHTML = `
      <h3>Profile</h3>
      <form id="profile-form">
        <div class="field"><label>Full name</label><input id="pf-name" value="${escapeHtml(session.name)}" /></div>
        <div class="field"><label>Email</label><input id="pf-email" value="${escapeHtml(session.email)}" /></div>
        <div class="field"><label>Change password (leave blank to keep)</label><input id="pf-pass" type="password" placeholder="New password" /></div>
        <div class="panel-row"><button type="submit" class="btn">Save</button><div id="profile-msg" class="small"></div></div>
      </form>
    `;
    const form = document.getElementById('profile-form');
    form && form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = document.getElementById('pf-name').value.trim();
      const email = document.getElementById('pf-email').value.trim().toLowerCase();
      const pass = document.getElementById('pf-pass').value;
      const users = getUsers();
      const other = users.find(u=>u.email===email && u.email !== session.email);
      const msgEl = document.getElementById('profile-msg');
      if(!name||!email){ if(msgEl) msgEl.textContent = 'Name and email are required'; return }
      if(other){ if(msgEl) msgEl.textContent = 'Email already in use by another account'; return }
      const idx = users.findIndex(u=>u.email===session.email);
      if(idx!==-1){ users[idx].name = name; users[idx].email = email; if(pass) users[idx].password = pass; saveUsers(users); session.name = name; session.email = email; setSession(session); refreshHeader(); if(msgEl) msgEl.textContent = 'Saved';
        if(window && window.showToast) window.showToast('Profile saved', 'success');
      }
    });
  }

  function renderAbout(){
    content.innerHTML = `
      <h3>About Us</h3>
      <p>This is a demo 3D-styled authentication portal built as a client-side example. No server is used — accounts and data are stored in your browser's localStorage.</p>
      <p class="small">Features: 3D auth card, neon/matrix visual theme, local registration/login, and a small dashboard.</p>
      <p class="small">This demo is for learning and prototyping only. Do not use it for real authentication.</p>
    `;
  }

  // Messages / Messenger
  function convoKey(a,b){ const p=[a||'',b||''].map(s=>s.toLowerCase()).sort(); return 'messages_' + p[0] + '__' + p[1]; }

  function renderMessages(){
    const users = getUsers().filter(u=>u.email !== session.email);
    content.innerHTML = `
      <h3>Messages</h3>
      <div class="messenger">
        <div class="people-list">
          <input type="search" id="people-search" class="search-input" placeholder="Search users by name or email" />
          <div id="people-container"></div>
        </div>
        <div class="chat-panel">
          <div class="chat-header"><div id="chat-with">Select a user to start chatting</div><div id="chat-actions"></div></div>
          <div id="chat-window" class="chat-window"><div class="small">No conversation selected</div></div>
          <div class="chat-input"><textarea id="chat-text" placeholder="Write a message..."></textarea><button id="chat-send" class="btn">Send</button></div>
        </div>
      </div>
    `;

    const peopleContainer = document.getElementById('people-container');
    const searchInput = document.getElementById('people-search');
    const chatWindow = document.getElementById('chat-window');
    const chatWith = document.getElementById('chat-with');
    const chatSend = document.getElementById('chat-send');
    const chatText = document.getElementById('chat-text');

    function renderPeople(list){
      peopleContainer.innerHTML = list.map(u=>{
        const initial = (u.name||u.email||'').trim().charAt(0).toUpperCase();
        return `<div class="person" data-email="${escapeHtml(u.email)}"><div class="p-avatar">${escapeHtml(initial)}</div><div><div style="font-weight:700">${escapeHtml(u.name||u.email)}</div><div class="small">${escapeHtml(u.email)}</div></div></div>`;
      }).join('') || '<div class="small">No users found</div>';
      Array.from(peopleContainer.querySelectorAll('.person')).forEach(el=> el.addEventListener('click', ()=> selectPerson(el.dataset.email)));
    }

    function loadConversation(otherEmail){
      const key = convoKey(session.email, otherEmail);
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      chatWindow.innerHTML = arr.map(m=>{
        const cls = m.from === session.email ? 'chat-msg me' : 'chat-msg they';
        return `<div class="${cls}"><div class="small">${escapeHtml(new Date(m.t).toLocaleString())}</div><div>${escapeHtml(m.text)}</div></div>`;
      }).join('') || '<div class="small">No messages yet. Say hello!</div>';
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    let activeEmail = null;
    function selectPerson(email){
      activeEmail = email;
      Array.from(peopleContainer.querySelectorAll('.person')).forEach(p=> p.classList.toggle('active', p.dataset.email===email));
      const usersList = getUsers();
      const u = usersList.find(x=>x.email===email) || {name:email,email};
      chatWith.textContent = `Chat — ${u.name || u.email}`;
      loadConversation(email);
    }

    chatSend && chatSend.addEventListener('click', ()=>{
      const txt = (chatText && chatText.value || '').trim();
      if(!activeEmail){ if(window && window.showToast) window.showToast('Select a user first', 'error'); return }
      if(!txt) return;
      const key = convoKey(session.email, activeEmail);
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      const msg = {from: session.email, to: activeEmail, t: Date.now(), text: txt};
      arr.push(msg); localStorage.setItem(key, JSON.stringify(arr));
      if(window && window.showToast) window.showToast('Message sent', 'success');
      chatText.value = '';
      loadConversation(activeEmail);
    });

    searchInput && searchInput.addEventListener('input', ()=>{
      const q = (searchInput.value||'').trim().toLowerCase();
      const filtered = users.filter(u=> (u.name||u.email||'').toLowerCase().includes(q));
      renderPeople(filtered);
    });

    renderPeople(users);
  }

  function applyTheme(t){ if(t==='dark'){ document.documentElement.style.setProperty('--neon','#aeb6c1'); document.documentElement.style.setProperty('--neon2','#88b0c1'); } else { document.documentElement.style.setProperty('--neon','#00ff6a'); document.documentElement.style.setProperty('--neon2','#33ff99'); } }
  applyTheme(localStorage.getItem('theme')||'neon');

  function setActive(view){ tiles.forEach(b=>{ b.classList.toggle('active', b.dataset.view===view); }); }
  function show(view){ setActive(view); if(view==='dashboard') renderDashboard(); if(view==='profile') renderProfile(); if(view==='messages') renderMessages(); if(view==='about') renderAbout(); }

  tiles.forEach(b=> b.addEventListener('click', ()=> show(b.dataset.view)) );
  show('dashboard');

})();