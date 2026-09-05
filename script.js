/* ================================================
   MAHESH THAKUR PORTFOLIO — SCRIPT.JS
   Main interaction, animation, and data layer
   ================================================ */

'use strict';

/* ─── STATE ─── */
let siteData = null;
let audioEnabled = true;
let audioCtx = null;
let lenis = null;

/* ─── AUDIO ENGINE (Web Audio API) ─── */
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playClickSFX() {
  if (!audioEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch (_) {}
}

function playScrollTick() {
  if (!audioEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.015);
  } catch (_) {}
}

/* ─── SOUND TOGGLE ─── */
function initSoundToggle() {
  const stored = localStorage.getItem('mt-sound');
  audioEnabled = stored !== 'off';
  const btn = document.getElementById('sound-toggle');
  if (btn) {
    btn.textContent = audioEnabled ? '🔊' : '🔇';
    btn.addEventListener('click', () => {
      audioEnabled = !audioEnabled;
      localStorage.setItem('mt-sound', audioEnabled ? 'on' : 'off');
      btn.textContent = audioEnabled ? '🔊' : '🔇';
      playClickSFX();
      showToast(audioEnabled ? 'Sound on' : 'Sound muted');
    });
  }
}

/* ─── CUSTOM CURSOR ─── */
function initCursor() {
  const dot = document.getElementById('custom-cursor');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top = my + 'px';
  });

  function animRing() {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(animRing);
  }
  animRing();
}

/* ─── AMBIENT PARTICLES CANVAS ─── */
function initParticles() {
  const canvas = document.getElementById('ambient-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const particles = [];
  const COUNT = 55;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.4 + 0.08,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,168,255,${p.alpha})`;
      ctx.fill();
    });

    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,168,255,${0.055 * (1 - dist / 110)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ─── MAGNETIC GRID CANVAS (mouse glow) ─── */
function initMagneticGrid() {
  const canvas = document.getElementById('magnetic-grid');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let mx = -9999, my = -9999;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });

  const COLS = 28, ROWS = 18;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cw = canvas.width / COLS;
    const ch = canvas.height / ROWS;

    for (let r = 0; r <= ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        const px = c * cw;
        const py = r * ch;
        const dx = px - mx;
        const dy = py - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 200;
        if (dist < radius) {
          const alpha = (1 - dist / radius) * 0.18;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,168,255,${alpha})`;
          ctx.fill();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ─── LOAD DATA ─── */
async function loadData() {
  try {
    const res = await fetch('data.json');
    siteData = await res.json();
  } catch (_) {
    siteData = getFallbackData();
  }
}

function getFallbackData() {
  return {
    hero: { greeting: "Available for freelance", firstName: "Mahesh", lastName: "Thakur", bio: "Retention-focused video edits, After Effects MOGRTs, color grading, sound design." },
    about: { bio: "I'm Mahesh Thakur, a Video Editor & Motion Graphics Specialist based in India." },
    projects: [
      { id:1, title:"Commercial & Brand Ads", description:"High-impact commercial edits for brands.", tools:["Premiere Pro","After Effects"], embedUrl:"", thumbnail:"" },
      { id:2, title:"Motion Graphics & MOGRT Packs", description:"Kinetic typography and custom MOGRT templates.", tools:["After Effects","Illustrator"], embedUrl:"", thumbnail:"" },
      { id:3, title:"YouTube & Long-Form Edits", description:"Documentary-style long-form content.", tools:["Premiere Pro","After Effects"], embedUrl:"", thumbnail:"" },
      { id:4, title:"Reels & Short-Form Content", description:"Beat-synced high-energy short-form edits.", tools:["Premiere Pro","CapCut"], embedUrl:"", thumbnail:"" },
      { id:5, title:"Cinematic Short Film / Music Video", description:"Cinematic storytelling with Log footage.", tools:["DaVinci Resolve","After Effects"], embedUrl:"", thumbnail:"" }
    ],
    contact: { email:"maheshthakurbfm@gmail.com", linkedin:"https://www.linkedin.com/in/mahesh-thakur-317872277/", instagram:"https://www.instagram.com/motion.mogrt" },
    software: [
      {name:"Premiere Pro",icon:"🎬",level:95},{name:"After Effects",icon:"⚡",level:92},
      {name:"DaVinci Resolve",icon:"🎨",level:88},{name:"Final Cut Pro",icon:"✂️",level:80},
      {name:"Cinema 4D",icon:"🌐",level:70},{name:"Blender",icon:"🔷",level:65},
      {name:"Photoshop",icon:"🖼️",level:85},{name:"Audition",icon:"🔊",level:82}
    ]
  };
}

/* ─── RENDER ACCORDION ─── */
function renderAccordion() {
  const wrap = document.getElementById('accordion-wrap');
  if (!wrap || !siteData) return;

  wrap.innerHTML = siteData.projects.map((p, idx) => `
    <div class="accordion-item" data-id="${p.id}">
      <button class="accordion-trigger" aria-expanded="false">
        <div class="accordion-trigger-left">
          <span class="accordion-num">0${idx + 1}</span>
          <span class="accordion-title">${escHtml(p.title)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="accordion-tools">
            ${(p.tools || []).map(t => `<span class="tool-chip">${escHtml(t)}</span>`).join('')}
          </div>
          <span class="accordion-icon">+</span>
        </div>
      </button>
      <div class="accordion-body">
        <div class="accordion-content">
          <div>
            <p class="accordion-desc">${escHtml(p.description)}</p>
          </div>
          <div class="accordion-video-area" id="video-area-${p.id}">
            ${renderVideoArea(p)}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Bind toggle
  wrap.querySelectorAll('.accordion-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion-item');
      const isOpen = item.classList.contains('is-open');

      wrap.querySelectorAll('.accordion-item').forEach(el => {
        el.classList.remove('is-open');
        el.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        playScrollTick();
      } else {
        playClickSFX();
      }
    });
  });
}

function renderVideoArea(p) {
  if (p.embedUrl && p.embedUrl.trim()) {
    return `<iframe src="${escAttr(p.embedUrl)}" allow="autoplay; encrypted-media" allowfullscreen title="${escAttr(p.title)}"></iframe>`;
  }
  if (p.thumbnail && p.thumbnail.trim()) {
    return `<img src="${escAttr(p.thumbnail)}" alt="${escAttr(p.title)}" style="width:100%;height:100%;object-fit:cover;" />`;
  }
  return `
    <div class="video-placeholder">
      <div class="play-icon">▶</div>
      <span>Add a video or embed URL<br />via the Admin Panel</span>
    </div>
  `;
}

/* ─── RENDER SOFTWARE GRID ─── */
function renderSoftware() {
  const grid = document.getElementById('software-grid');
  if (!grid || !siteData) return;
  grid.innerHTML = siteData.software.map(s => {
    const isImg = s.icon && (s.icon.includes('/') || s.icon.endsWith('.svg') || s.icon.endsWith('.png'));
    const iconMarkup = isImg
      ? `<img class="software-icon-img" src="${escAttr(s.icon)}" alt="${escAttr(s.name)}" />`
      : s.icon;
    return `
      <div class="software-card glass-card reveal-up">
        <span class="software-icon">${iconMarkup}</span>
        <div class="software-name">${escHtml(s.name)}</div>
        <div class="skill-bar">
          <div class="skill-bar-fill" data-level="${s.level}"></div>
        </div>
      </div>
    `;
  }).join('');
}

/* ─── UPDATE HERO FROM DATA ─── */
function applyHeroData() {
  if (!siteData) return;
  const h = siteData.hero;
  const fn = document.querySelector('.hero-name .first');
  const ln = document.querySelector('.hero-name .last');
  const bio = document.querySelector('.hero-bio');
  const greet = document.querySelector('.hero-greeting');
  if (fn) fn.textContent = h.firstName;
  if (ln) ln.textContent = h.lastName;
  if (bio) bio.textContent = h.bio;
  if (greet) {
    const rawGreeting = h.greeting || "Hi I'm";
    if (rawGreeting.trim().toLowerCase().startsWith("hi i'm") || rawGreeting.trim().toLowerCase().startsWith("hi, i'm")) {
      greet.innerHTML = `<span class="greet-bold">Hi</span> <span class="greet-thin">I'm</span>`;
    } else {
      greet.textContent = rawGreeting;
    }
  }

  // Contact
  const emailLinks = document.querySelectorAll('.contact-email, [href^="mailto:"]');
  emailLinks.forEach(el => {
    el.href = `mailto:${siteData.contact.email}`;
    if (el.classList.contains('contact-email')) el.childNodes[el.childNodes.length - 1].textContent = ` ${siteData.contact.email}`;
  });
}

/* ─── GSAP HERO ANIMATIONS ─── */
function initHeroAnimations() {
  if (typeof gsap === 'undefined') return;

  const bgText = document.getElementById('hero-bg-text');
  const heroLeft = document.getElementById('hero-left');
  const heroCenter = document.getElementById('hero-center');
  const heroRight = document.getElementById('hero-right');
  const portraitImg = document.querySelector('.portrait-img');
  const scrollHint = document.querySelector('.hero-scroll-hint');

  const design = siteData?.design?.hero || {
    subject: { x: 0, y: 0, scale: 1, opacity: 1, zIndex: 3, locked: true },
    bgText: {
      content: 'PORTFOLIO', x: 0, y: 0, scale: 1, opacity: 0.085, zIndex: 1,
      mouseParallax: { enabled: true, speedX: -3, speedY: -2 },
      scrollMotion: { exitXPercent: 35 }
    }
  };

  // ------------------------------------------------------------
  // CANONICAL BASE STATE
  // The subject and the hero columns NEVER participate in scroll
  // animation. Their position is owned by CSS/layout only.
  // ------------------------------------------------------------
  if (portraitImg && design.subject) {
    portraitImg.style.transform = `translate(${design.subject.x || 0}px, ${design.subject.y || 0}px) scale(${design.subject.scale ?? 1})`;
    portraitImg.style.opacity = design.subject.opacity ?? 1;
  }
  if (heroCenter && design.subject) heroCenter.style.zIndex = design.subject.zIndex || 3;
  if (heroCenter) gsap.set(heroCenter, { clearProps: 'transform,opacity' });
  if (heroLeft) gsap.set(heroLeft, { clearProps: 'transform,opacity' });
  if (heroRight) gsap.set(heroRight, { clearProps: 'transform,opacity' });

  if (bgText && design.bgText) {
    bgText.textContent = design.bgText.content || 'PORTFOLIO';
    bgText.style.zIndex = design.bgText.zIndex || 1;
    if (design.bgText.fontFamily) bgText.style.fontFamily = design.bgText.fontFamily;
    bgText.style.setProperty('--mouse-x', '0px');
    bgText.style.setProperty('--mouse-y', '0px');
    bgText.style.setProperty('--scroll-x', '0vw');
    bgText.style.opacity = design.bgText.opacity ?? 0.085;
    gsap.set(bgText, { clearProps: 'transform' });
  }

  // Entry animation only. Once complete, transforms are cleared.
  const tl = gsap.timeline({
    delay: 0.1,
    onComplete: () => {
      if (heroLeft) gsap.set(heroLeft, { clearProps: 'transform' });
      if (heroCenter) gsap.set(heroCenter, { clearProps: 'transform' });
      if (heroRight) gsap.set(heroRight, { clearProps: 'transform' });
    }
  });

  const targetBgOpacity = design.bgText?.opacity ?? 0.085;

  if (bgText) {
    tl.fromTo(bgText, { opacity: 0 }, {
      opacity: targetBgOpacity,
      duration: 1.0,
      ease: 'power3.out'
    }, 0);
  }

  if (heroLeft) {
    tl.fromTo(heroLeft, { y: 20 }, {
      y: 0, duration: 0.8, ease: 'power3.out'
    }, 0.15);
  }

  if (heroCenter) {
    tl.fromTo(heroCenter, { y: 20 }, {
      y: 0, duration: 0.8, ease: 'power3.out'
    }, 0.2);
  }

  const pills = document.querySelectorAll('.role-pill');
  if (pills.length) {
    tl.fromTo(pills, { y: 12 }, {
      y: 0, duration: 0.65, stagger: 0.08, ease: 'power3.out'
    }, 0.25);
  }

  // ------------------------------------------------------------
  // PORTFOLIO SCROLL MOTION ONLY
  // The scroll animation writes ONLY CSS variables on bgText.
  // No hero/image transform is touched here.
  // ------------------------------------------------------------
  if (typeof ScrollTrigger !== 'undefined' && bgText) {
    gsap.registerPlugin(ScrollTrigger);

    const exitXPercent = design.bgText?.scrollMotion?.exitXPercent ?? 35;
    const scrollState = { x: 0, opacity: targetBgOpacity };

    gsap.to(scrollState, {
      x: exitXPercent,
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '85% top',
        scrub: 0.35,
        invalidateOnRefresh: true,
        onUpdate: () => {
          bgText.style.setProperty('--scroll-x', `${scrollState.x}vw`);
          bgText.style.opacity = scrollState.opacity;
        },
        onLeaveBack: () => {
          // Hard reset to canonical state at the top.
          scrollState.x = 0;
          scrollState.opacity = targetBgOpacity;
          bgText.style.setProperty('--scroll-x', '0vw');
          bgText.style.opacity = targetBgOpacity;
        }
      }
    });

    const subjectOpacity = design.subject?.opacity ?? 1;
    const createSideExitConfig = () => ({
        y: -120,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: '35% top',
          scrub: 0.35,
          invalidateOnRefresh: true
        }
      });

    if (heroLeft) {
      gsap.fromTo(heroLeft, { y: 0, opacity: 1 }, createSideExitConfig());
    }

    if (heroRight) {
      gsap.fromTo(heroRight, { y: 0, opacity: 1 }, createSideExitConfig());
    }

    if (portraitImg) {
      gsap.fromTo(portraitImg, { opacity: subjectOpacity }, {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: '85% top',
          scrub: 0.35,
          invalidateOnRefresh: true
        }
      });
    }

    if (scrollHint) {
      gsap.fromTo(scrollHint, { autoAlpha: 1 }, {
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: '25% top',
          scrub: 0.35,
          invalidateOnRefresh: true
        }
      });
    }

    // Section reveals are independent from the hero composition.
    gsap.utils.toArray('.reveal-up').forEach((el) => {
      gsap.fromTo(el,
        { y: 48, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 1.0, ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });

    document.querySelectorAll('.skill-bar-fill').forEach(bar => {
      const level = bar.getAttribute('data-level');
      ScrollTrigger.create({
        trigger: bar,
        start: 'top 90%',
        onEnter: () => gsap.to(bar, { width: level + '%', duration: 1.2, ease: 'power2.out' }),
        once: true
      });
    });
  }

  // ------------------------------------------------------------
  // PORTFOLIO MOUSE WIGGLE ONLY
  // Absolute offset from the center; never accumulates.
  // Subject, left content and right pills are untouched.
  // ------------------------------------------------------------
  if (bgText) {
    const mouseObj = { x: 0, y: 0 };
    let mouseTween = null;
    let idleTimer = null;
    let lastInsideHero = false;

    const setMouseVars = () => {
      bgText.style.setProperty('--mouse-x', `${mouseObj.x}px`);
      bgText.style.setProperty('--mouse-y', `${mouseObj.y}px`);
    };

    const springReturnToHome = () => {
      if (mouseTween) mouseTween.kill();
      mouseTween = gsap.to(mouseObj, {
        x: 0,
        y: 0,
        duration: 0.8,
        ease: 'elastic.out(1, 0.4)',
        overwrite: 'auto',
        onUpdate: setMouseVars,
        onComplete: () => {
          mouseObj.x = 0;
          mouseObj.y = 0;
          setMouseVars();
        }
      });
    };

    document.addEventListener('mousemove', (e) => {
      if (window.innerWidth <= 768) return;

      const hero = document.getElementById('hero');
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const insideHero = e.clientY >= rect.top && e.clientY <= rect.bottom;

      if (!insideHero) {
        if (lastInsideHero) springReturnToHome();
        lastInsideHero = false;
        return;
      }
      lastInsideHero = true;

      const p = siteData?.design?.hero?.bgText?.mouseParallax || {};
      if (p.enabled === false) {
        springReturnToHome();
        return;
      }

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / cx));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / cy));

      // Elastic pull away from home anchor: minimal yet clearly noticeable offset
      const targetX = dx * 8.0;
      const targetY = dy * 4.5;

      if (mouseTween) mouseTween.kill();
      mouseTween = gsap.to(mouseObj, {
        x: targetX,
        y: targetY,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto',
        onUpdate: setMouseVars
      });

      // Elastic spring back to home anchor when mouse pauses
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        springReturnToHome();
      }, 150);
    }, { passive: true });

    window.addEventListener('blur', springReturnToHome);
    window.addEventListener('resize', springReturnToHome);
  }
}

/* ─── STAT COUNTER ─── */
function initStatCounters() {
  if (typeof ScrollTrigger === 'undefined') return;
  document.querySelectorAll('.stat-value[data-count]').forEach(el => {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const suffix = el.getAttribute('data-suffix') || '';
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        let start = 0;
        const dur = 1800;
        const step = (ts) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / dur, 1);
          const val = Math.floor(progress * target);
          el.textContent = val + suffix;
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = target + suffix;
        };
        requestAnimationFrame(step);
      }
    });
  });
}

/* ─── NAVBAR SCROLL STATE ─── */
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  let lastSection = '';
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');

    // Scroll tick on section change
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(s => {
      const rect = s.getBoundingClientRect();
      if (rect.top <= 80 && rect.bottom > 80 && s.id !== lastSection) {
        lastSection = s.id;
        playScrollTick();
      }
    });
  }, { passive: true });
}

/* ─── SMOOTH SCROLL (Lenis) ─── */
function initLenis() {
  if (typeof Lenis === 'undefined') return;
  lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });

  function raf(time) {
    lenis.raf(time);
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.update();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80 });
        playClickSFX();
      }
    });
  });
}

/* ─── CLICK SFX on all interactive elements ─── */
function initClickSFX() {
  document.querySelectorAll('button, .btn-primary, .btn-ghost, .social-btn, .focus-card, .software-card').forEach(el => {
    el.addEventListener('click', playClickSFX);
  });
}

/* ─── TOAST ─── */
function showToast(message, duration = 2400) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}
window.showToast = showToast;

/* ─── ADMIN MODAL OPEN ─── */
function openAdmin() {
  const modal = document.getElementById('admin-modal');
  if (!modal) return;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  const pw = document.getElementById('admin-pw-input');
  if (pw && !document.getElementById('admin-panel-content').classList.contains('unlocked')) {
    setTimeout(() => pw.focus(), 100);
  }
}

function closeAdmin() {
  const modal = document.getElementById('admin-modal');
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
}
window.closeAdmin = closeAdmin;

function initAdminTrigger() {
  const btn = document.getElementById('admin-btn');
  if (btn) btn.addEventListener('click', () => { openAdmin(); playClickSFX(); });

  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'a') { e.preventDefault(); openAdmin(); }
    if (e.key === 'Escape') closeAdmin();
  });

  const modal = document.getElementById('admin-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAdmin();
    });
  }
}

/* ─── SITE LOADER ─── */
function hideLoader() {
  const loader = document.getElementById('site-loader');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), 1500);
  }
}

/* ─── UTILS ─── */
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str || '').replace(/"/g, '%22').replace(/'/g, '%27');
}
window.escHtml = escHtml;
window.escAttr = escAttr;

/* ─── BOOT ─── */
async function boot() {
  await loadData();
  applyHeroData();
  renderAccordion();
  renderSoftware();
  initSoundToggle();
  initCursor();
  initParticles();
  initMagneticGrid();
  initNavbar();
  initClickSFX();
  initAdminTrigger();
  hideLoader();

  // GSAP & Lenis init after scripts load
  const waitForGSAP = () => {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      initHeroAnimations();
      initStatCounters();
    } else {
      setTimeout(waitForGSAP, 80);
    }
  };
  waitForGSAP();

  const waitForLenis = () => {
    if (typeof Lenis !== 'undefined') {
      initLenis();
    } else {
      setTimeout(waitForLenis, 80);
    }
  };
  waitForLenis();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
