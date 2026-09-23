(function(){
  var root = document.documentElement;
  root.classList.remove('js-off');

  /* theme */
  var tb = document.querySelector('.theme-btn');
  if (tb) tb.addEventListener('click', function(){
    var t = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch(e) {}
  });

  /* mobile menu */
  var mb = document.querySelector('.menu-btn'), mn = document.querySelector('.mnav');
  if (mb && mn) {
    mb.addEventListener('click', function(){ mn.classList.toggle('open'); mb.setAttribute('aria-expanded', mn.classList.contains('open')); });
    mn.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ mn.classList.remove('open'); }); });
  }

  /* on-this-page list for case studies */
  var toc = document.querySelector('.toc');
  if (toc) {
    var hs = document.querySelectorAll('.case-main h2[id]');
    if (hs.length > 2) {
      toc.innerHTML = '<b>On this page</b>' + [].map.call(hs, function(h){ return '<a href="#' + h.id + '">' + h.textContent + '</a>'; }).join('');
    }
  }

  /* nav state, progress, active section */
  var nav = document.querySelector('nav.top'), bar = document.querySelector('.progress i');
  var links = [].slice.call(document.querySelectorAll('.nav-links a[href^="#"], .toc a'));
  var secs = links.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  var ticking = false;
  function onScroll(){
    var h = document.documentElement, st = h.scrollTop || document.body.scrollTop;
    if (bar) bar.style.width = (st / Math.max(1, h.scrollHeight - h.clientHeight) * 100) + '%';
    if (nav) nav.classList.toggle('stuck', st > 8);
    var idx = -1;
    secs.forEach(function(s, i){ if (s && s.getBoundingClientRect().top <= 150) idx = i; });
    links.forEach(function(a, i){ a.classList.toggle('on', i === idx); });
    ticking = false;
  }
  addEventListener('scroll', function(){ if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, {passive:true});
  onScroll();

  /* typewriter */
  var typed = document.getElementById('typed');
  if (typed) {
    var phrases = JSON.parse(typed.dataset.phrases || '[]'), pi = 0, ci = 0, del = false;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { typed.textContent = phrases[0] || ''; }
    else (function type(){
      var cur = phrases[pi] || '';
      typed.textContent = cur.slice(0, ci);
      if (!del && ci < cur.length) { ci++; setTimeout(type, 42); }
      else if (!del) { del = true; setTimeout(type, 1800); }
      else if (ci > 0) { ci--; setTimeout(type, 20); }
      else { del = false; pi = (pi + 1) % phrases.length; setTimeout(type, 320); }
    })();
  }

  /* counters */
  function fmt(v, dec){ return v.toLocaleString('en-US', {minimumFractionDigits:dec, maximumFractionDigits:dec}); }
  function animate(el){
    var target = parseFloat(el.dataset.count), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', dec = parseInt(el.dataset.dec || '0', 10);
    var t0 = performance.now(), dur = 1400;
    (function step(t){
      var k = Math.min((t - t0) / dur, 1), v = target * (1 - Math.pow(1 - k, 3));
      el.textContent = pre + fmt(k < 1 ? v : target, dec) + suf;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  var nums = document.querySelectorAll('.num[data-count]');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    nums.forEach(function(n){ var r = n.getBoundingClientRect(); if (r.top > innerHeight) n.textContent = (n.dataset.prefix || '') + fmt(0, parseInt(n.dataset.dec || '0', 10)) + (n.dataset.suffix || ''); else n.dataset.done = '1'; });
    var so = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { if (!e.target.dataset.done) animate(e.target); so.unobserve(e.target); } }); }, {threshold:.6});
    nums.forEach(function(n){ so.observe(n); });
    var ro = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('vis'); ro.unobserve(e.target); } }); }, {threshold:0, rootMargin:'0px 0px -40px 0px'});
    document.querySelectorAll('.reveal').forEach(function(el){ ro.observe(el); });
    /* safety net: anything already scrolled past (fast scroll, jump links, print) is shown */
    var sweep = function(){ document.querySelectorAll('.reveal:not(.vis)').forEach(function(el){ if (el.getBoundingClientRect().top < innerHeight) { el.classList.add('vis'); ro.unobserve(el); } }); };
    var ticking = false;
    addEventListener('scroll', function(){ if (!ticking) { ticking = true; requestAnimationFrame(function(){ sweep(); ticking = false; }); } }, {passive:true});
    addEventListener('load', sweep); addEventListener('beforeprint', function(){ document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('vis'); }); });
  } else {
    document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('vis'); });
  }

  /* card glow */
  document.querySelectorAll('.pcard').forEach(function(card){
    card.addEventListener('pointermove', function(e){
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* project filters */
  var fb = document.querySelectorAll('.fbtn');
  fb.forEach(function(b){
    b.addEventListener('click', function(){
      fb.forEach(function(x){ x.classList.remove('active'); x.setAttribute('aria-pressed','false'); });
      b.classList.add('active'); b.setAttribute('aria-pressed','true');
      var t = b.dataset.tag;
      document.querySelectorAll('#projectGrid .pcard').forEach(function(c){
        c.classList.toggle('hide', t !== 'All' && (c.dataset.tags || '').split('|').indexOf(t) < 0);
      });
    });
  });

  /* lightbox */
  var lb = document.getElementById('lightbox');
  if (lb) {
    var li = lb.querySelector('img');
    document.addEventListener('click', function(e){
      var t = e.target.closest('[data-zoom]');
      if (!t) return;
      e.preventDefault();
      li.src = t.dataset.zoom || t.getAttribute('src');
      li.alt = t.getAttribute('alt') || '';
      lb.classList.add('open');
    });
    lb.addEventListener('click', function(){ lb.classList.remove('open'); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') lb.classList.remove('open'); });
  }

  var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
})();
