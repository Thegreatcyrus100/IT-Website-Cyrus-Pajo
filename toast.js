(function(){
  // Shared toast notification utility (exposed as window.showToast)
  function showToast(msg, type='default', ms=3500){
    const wrap = document.getElementById('toast-wrap');
    if(!wrap){
      // fallback: try creating a temporary container
      try{
        const w = document.createElement('div'); w.id = 'toast-wrap'; w.className = 'toast-wrap'; w.setAttribute('aria-live','polite'); document.body.appendChild(w);
        const t = document.createElement('div'); t.className = 'toast' + (type?(' '+type):''); t.textContent = msg; w.appendChild(t);
        setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>w.removeChild(t),220); }, ms);
      }catch(e){ console.warn('Unable to show toast', e); }
      return;
    }
    const t = document.createElement('div'); t.className = 'toast' + (type?(' '+type):''); t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(()=>{ t.style.opacity = '0'; setTimeout(()=>{ if(wrap.contains(t)) wrap.removeChild(t); },220); }, ms);
  }

  // expose
  window.showToast = showToast;
})();
