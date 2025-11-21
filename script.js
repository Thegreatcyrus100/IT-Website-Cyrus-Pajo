(function(){
  // Matrix canvas background
  const canvas = document.getElementById('matrix');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  let cols = 0; let ypos = [];
  let rafId = null;
  let matrixRunning = true;

  // simple debounce helper to avoid thrashing on resize
  function debounce(fn, wait){
    let t = null; return function(...a){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,a), wait); };
  }

  function resizeCanvas(){
    if(!canvas) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    cols = Math.max(8, Math.floor(canvas.width / 12) + 1);
    ypos = Array(cols).fill(0).map(()=>Math.random()*20);
  }
  const debouncedResize = debounce(resizeCanvas, 120);

  function matrixLoop(){
    if(!ctx) return;
    if(!matrixRunning) return; // paused when page hidden
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = 'rgba(0,255,120,0.8)';
    ctx.font = '12px "Share Tech Mono", monospace';
    for(let i=0;i<cols;i++){
      const text = String.fromCharCode(33 + Math.random()*94);
      const x = i * 14;
      ctx.fillText(text, x, ypos[i]*14);
      if(ypos[i]*14 > canvas.height && Math.random()>0.97) ypos[i]=0;
      ypos[i] += 1.4 + Math.random()*1.0;
    }
    rafId = requestAnimationFrame(matrixLoop);
  }
  window.addEventListener('resize', debouncedResize);
  resizeCanvas();
  matrixLoop();

  // pause/resume when page is hidden to save CPU
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){ matrixRunning = false; if(rafId) cancelAnimationFrame(rafId); }
    else { matrixRunning = true; matrixLoop(); }
  });

  // Card interactions & auth logic
  const card = document.getElementById('card');
  const scene = document.querySelector('.scene');
  const toRegister = document.getElementById('to-register');
  const toLogin = document.getElementById('to-login');
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  const authWrap = document.getElementById('auth-wrap');
  const home = document.getElementById('home');
  const homeWelcome = document.getElementById('home-welcome');
  const signout = document.getElementById('signout');

  function setSession(user){ localStorage.setItem('sessionUser', JSON.stringify(user)); }
  function getSession(){ try{return JSON.parse(localStorage.getItem('sessionUser'))}catch(e){return null} }
  function getUsers(){ try{return JSON.parse(localStorage.getItem('users')||'[]')}catch(e){return []} }
  function saveUsers(users){ localStorage.setItem('users', JSON.stringify(users)); }

  // helper for showing inline errors
  function showFormError(id, msg){ const el = document.getElementById(id); if(el) el.textContent = msg; }
  function clearFormError(id){ const el = document.getElementById(id); if(el) el.textContent = ''; }

  // Toast notifications are provided by shared `toast.js`.

  // simple password generator (demo only)
  function generatePassword(len = 12){
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let out = '';
    for(let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
    return out;
  }

  // navigation
  if(toRegister) toRegister.addEventListener('click', (e)=>{e.preventDefault(); card.classList.add('flipped')});
  if(toLogin) toLogin.addEventListener('click', (e)=>{e.preventDefault(); card.classList.remove('flipped')});

  registerForm && registerForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    clearFormError('reg-error');
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    if(regSubmit) { regSubmit.disabled = true; const prev = regSubmit.innerHTML; regSubmit.innerHTML = '<span class="spinner"></span> Registering...'; }
    if(!name||!email||!password){ showFormError('reg-error','Please fill all fields'); return }
    // basic email format check
    const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if(!emailOK){ showFormError('reg-error','Please enter a valid email'); return }
    const users = getUsers();
    if(users.find(u=>u.email===email)){ showFormError('reg-error','An account with that email already exists'); return }
    const user = {name,email,password}; users.push(user); saveUsers(users); setSession(user);
    showToast('Registered — redirecting...', 'success');
    // small delay so user sees toast / disabled state
    setTimeout(()=>{ if(regSubmit) { regSubmit.disabled = false; regSubmit.innerHTML = 'Register'; } showHome(user); }, 400);
  });

  loginForm && loginForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    clearFormError('login-error');
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const loginBtn = document.getElementById('login-submit'); if(loginBtn){ loginBtn.disabled = true; const prevLogin = loginBtn.innerHTML; loginBtn.innerHTML = '<span class="spinner"></span> Signing in...'; }
    if(!email||!password){ showFormError('login-error','Please enter your email and password'); return }
    const users = getUsers();
    const user = users.find(u=>u.email===email && u.password===password);
    if(!user){ showFormError('login-error','Invalid credentials'); return }
    setSession(user);
    showToast('Signed in', 'success');
    setTimeout(()=>{ if(loginBtn){ loginBtn.disabled = false; loginBtn.innerHTML = 'Sign In' } showHome(user); }, 300);
  });

  signout && signout.addEventListener('click', ()=>{
    localStorage.removeItem('sessionUser'); home.classList.add('hidden'); authWrap.classList.remove('hidden'); card.classList.remove('flipped');
  });

  // Forgot password flow
  const forgotLink = document.getElementById('forgot-link');
  const forgotModal = document.getElementById('forgot-modal');
  const forgotForm = document.getElementById('forgot-form');
  const forgotEmail = document.getElementById('forgot-email');
  const forgotError = document.getElementById('forgot-error');
  const forgotResult = document.getElementById('forgot-result');
  const newPasswordEl = document.getElementById('new-password');
  const copyPassword = document.getElementById('copy-password');
  const loginWithNew = document.getElementById('login-with-new');
  const forgotClose = document.getElementById('forgot-close');

  function openForgot(){ if(forgotModal) { forgotModal.classList.remove('hidden'); forgotResult && forgotResult.classList.add('hidden'); forgotForm && forgotForm.classList.remove('hidden'); forgotEmail && forgotEmail.focus(); clearFormError('forgot-error'); } }
  function closeForgot(){ if(forgotModal) { forgotModal.classList.add('hidden'); } }

  forgotLink && forgotLink.addEventListener('click', (e)=>{ e.preventDefault(); openForgot(); });
  forgotClose && forgotClose.addEventListener('click', ()=>{ closeForgot(); });

  if(forgotForm){
    forgotForm.addEventListener('submit', (e)=>{
      e.preventDefault(); clearFormError('forgot-error');
      const email = (forgotEmail && forgotEmail.value || '').trim().toLowerCase();
      if(!email){ showFormError('forgot-error','Enter the email for your account'); return }
      const users = getUsers();
      const idx = users.findIndex(u=>u.email===email);
      if(idx === -1){ showFormError('forgot-error','No account found for that email'); return }
      // generate and save password
      const newPass = generatePassword(12);
      users[idx].password = newPass; saveUsers(users);
      // show result
      if(newPasswordEl) newPasswordEl.textContent = newPass;
      if(forgotResult) forgotResult.classList.remove('hidden');
      if(forgotForm) forgotForm.classList.add('hidden');
      // also autofill login fields so user can copy/paste or sign in quickly
      const loginEmailInput = document.getElementById('login-email');
      const loginPassInput = document.getElementById('login-password');
      if(loginEmailInput) loginEmailInput.value = email;
      if(loginPassInput) loginPassInput.value = newPass;
      showToast('New password generated — copy it or sign in', 'success');
    });
  }

  if(copyPassword){ copyPassword.addEventListener('click', ()=>{
    const txt = newPasswordEl && newPasswordEl.textContent || '';
    if(!txt) return;
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
  }); }

  if(loginWithNew){ loginWithNew.addEventListener('click', ()=>{
    const email = (forgotEmail && forgotEmail.value || '').trim().toLowerCase();
    const users = getUsers();
    const user = users.find(u=>u.email===email);
    if(!user) { showFormError('forgot-error','Unable to sign in'); return }
    // close modal first for a cleaner transition
    closeForgot();
    setSession(user); window.location.href = 'home.html';
  }); }

  // allow clicking the overlay or pressing Escape to close the modal
  if(forgotModal){
    forgotModal.addEventListener('click', (ev)=>{ if(ev.target === forgotModal) closeForgot(); });
    document.addEventListener('keydown', (ev)=>{ if(ev.key === 'Escape') closeForgot(); });
  }

  // Password strength meter
  const pwInput = document.getElementById('reg-password');
  const pwSeg1 = document.getElementById('pw-seg1');
  const pwSeg2 = document.getElementById('pw-seg2');
  const pwSeg3 = document.getElementById('pw-seg3');
  const pwLabel = document.getElementById('pw-label');
  const regSubmit = document.getElementById('reg-submit');

  function evaluatePassword(pw){
    let score = 0;
    if(pw.length >= 8) score++;
    if(/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if(/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0..3
  }

  function updatePwUI(){
    const v = pwInput && pwInput.value || '';
    const score = evaluatePassword(v);
    // reset
    pwSeg1.className = 'pw-seg'; pwSeg2.className = 'pw-seg'; pwSeg3.className = 'pw-seg';
    pwLabel.textContent = '';
    if(score === 1){ pwSeg1.classList.add('pw-weak'); pwLabel.textContent = 'Weak'; }
    else if(score === 2){ pwSeg1.classList.add('pw-medium'); pwSeg2.classList.add('pw-medium'); pwLabel.textContent = 'Medium'; }
    else if(score >= 3){ pwSeg1.classList.add('pw-strong'); pwSeg2.classList.add('pw-strong'); pwSeg3.classList.add('pw-strong'); pwLabel.textContent = 'Strong'; }
    // enable register only for medium or strong
    if(regSubmit) regSubmit.disabled = score < 2;
  }
  if(pwInput){ pwInput.addEventListener('input', updatePwUI); updatePwUI(); }

  // Smoke test runner (client-side)
  function runSmokeTests(){
    const results = [];
    const usersKey = 'users';
    const orig = getUsers();
    const testEmail = `smoketest+${Date.now()}@example.com`;
    const testPass = 'Sm0ke!Test';
    // Clean up any existing test with same email
    let users = getUsers().filter(u=>u.email!==testEmail);
    saveUsers(users);

    // Test: register
    try{
      users = getUsers();
      users.push({name:'Smoke Tester', email:testEmail, password:testPass});
      saveUsers(users);
      const found = getUsers().find(u=>u.email===testEmail);
      results.push(found?('Register: OK'):'Register: FAIL');
    }catch(e){ results.push('Register: ERROR'); }

    // Test: duplicate register should be detected by code (simulate check)
    const dupCheck = getUsers().filter(u=>u.email===testEmail).length > 1 ? 'Duplicate detection: FAIL' : 'Duplicate detection: OK';
    results.push(dupCheck);

    // Test: login
    const u = getUsers().find(u=>u.email===testEmail && u.password===testPass);
    results.push(u? 'Login: OK' : 'Login: FAIL');

    // Test: forgot password generates new password
    const usersArr = getUsers();
    const idx = usersArr.findIndex(x=>x.email===testEmail);
    if(idx !== -1){
      const newP = generatePassword(10);
      usersArr[idx].password = newP; saveUsers(usersArr);
      const u2 = getUsers().find(x=>x.email===testEmail && x.password===newP);
      results.push(u2? 'Forgot/reset: OK' : 'Forgot/reset: FAIL');
    } else { results.push('Forgot/reset: FAIL'); }

    // Test: signout/session
    setSession({name:'temp', email:testEmail});
    const s1 = getSession();
    localStorage.removeItem('sessionUser');
    const s2 = getSession();
    results.push((s1 && !s2)? 'Signout: OK' : 'Signout: FAIL');

    // cleanup test user
    const after = getUsers().filter(u=>u.email!==testEmail);
    saveUsers(after);

    // show results
    results.forEach(r=> showToast(r, r.includes('OK')? 'success':'error', 3000));
    console.group('Smoke tests'); results.forEach(r=>console.log(r)); console.groupEnd();
  }

  const runBtn = document.getElementById('run-tests'); if(runBtn) runBtn.addEventListener('click', runSmokeTests);

  // Password visibility toggles
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if(!input) return;
      if(input.type === 'password'){ input.type = 'text'; btn.setAttribute('aria-pressed','true'); btn.textContent = '🙈'; }
      else { input.type = 'password'; btn.setAttribute('aria-pressed','false'); btn.textContent = '👁️'; }
    });
  });

  // Real-time email availability check on register
  const regEmail = document.getElementById('reg-email');
  if(regEmail){
    regEmail.addEventListener('input', ()=> clearFormError('reg-error'));
    regEmail.addEventListener('blur', ()=>{
      const v = (regEmail.value||'').trim().toLowerCase();
      if(!v) return;
      const ex = getUsers().find(u=>u.email===v);
      if(ex) showFormError('reg-error','Email already registered');
    });
  }

  function showHome(user){
    // store session and navigate to separate home page
    setSession(user);
    window.location.href = 'home.html';
  }

  // auto-login: if a session exists, navigate directly to `home.html`
  const session = getSession(); if(session){ window.location.href = 'home.html' }

  // Card tilt based on pointer/pointermove so it works on touch and mouse
  function handlePointerMove(e){
    if(!scene) return;
    const rect = scene.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX) || 0;
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
    const px = (clientX - rect.left) / rect.width - 0.5;
    const py = (clientY - rect.top) / rect.height - 0.5;
    const rx = (-py * 10).toFixed(2);
    const ry = (px * 14).toFixed(2);
    card && card.style && card.style.setProperty('--rx', rx + 'deg');
    card && card.style && card.style.setProperty('--ry', ry + 'deg');
  }
  function resetVars(){ if(card && card.style){ card.style.setProperty('--rx','0deg'); card.style.setProperty('--ry','0deg'); } }
  if(scene){
    scene.addEventListener('pointermove', handlePointerMove);
    scene.addEventListener('touchmove', handlePointerMove, {passive:true});
    scene.addEventListener('pointerleave', resetVars);
    scene.addEventListener('touchend', resetVars);
  }

})();