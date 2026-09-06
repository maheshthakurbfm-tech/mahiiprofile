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

/* ─── BROWSER-COMPLIANT AUDIO UNLOCK SYSTEM (Safari & Modern Browsers) ─── */
let sharedAudioCtx = null;
let isAudioUnlocked = false;

function getAudioCtx() {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function unlockAudioSystem() {
  if (isAudioUnlocked) return;
  isAudioUnlocked = true;

  // 1. Resume Web Audio API Context (for Whoosh SFX)
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // 2. Unlock HTMLAudioElement playback & trigger repulsor landing sound on first gesture
  try {
    soundAssets.repulsor.currentTime = 0;
    soundAssets.repulsor.play().catch(() => {});
  } catch (_) {}

  // Remove listeners after initial legitimate user interaction
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
    window.removeEventListener(evt, unlockAudioSystem, { capture: true });
  });
}

// Listen ONLY to true user activation gestures (Safari WebKit requirement)
['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
  window.addEventListener(evt, unlockAudioSystem, { passive: true, capture: true });
});

/* ─── REAL AUDIO ASSET ENGINE ─── */
const soundAssets = {
  repulsor: new Audio('assets/repulsor_beam.mp3'),
  magnetic: new Audio('assets/magnetic_button.wav'),
  click4: new Audio('assets/click_4.mp3')
};

// Preload & setup volume
soundAssets.repulsor.volume = 0.35;
soundAssets.magnetic.volume = 0.45;
soundAssets.click4.volume = 0.50;

/**
 * Play Click 4 SFX (assets/click_4.mp3) EXCLUSIVELY for opening Intro cards/boxes
 * (Showreel Accordion & Beyond The Edit cards)
 */
function playCardOpenSFX() {
  if (!audioEnabled) return;
  try {
    const snd = soundAssets.click4.cloneNode();
    snd.volume = 0.50;
    snd.play().catch(() => {});
  } catch (_) {}
}

/**
 * Play Repulsor Beam SFX when user lands on page
 */
function playRepulsorLandingSFX() {
  if (!audioEnabled) return;
  try {
    soundAssets.repulsor.currentTime = 0;
    soundAssets.repulsor.play().catch(() => {});
  } catch (_) {}
}

/**
 * Play Magnetic Button SFX (assets/magnetic_button.wav) for clicks and card/box triggers
 */
function playClickSFX() {
  if (!audioEnabled) return;
  try {
    const snd = soundAssets.magnetic.cloneNode();
    snd.volume = 0.45;
    snd.play().catch(() => {});
  } catch (_) {}
}

function playHoverSFX() {
  if (!audioEnabled) return;
  try {
    const snd = soundAssets.magnetic.cloneNode();
    snd.volume = 0.20;
    snd.play().catch(() => {});
  } catch (_) {}
}

/**
 * Heavy, Deep & Long Cinematic Whoosh SFX (Web Audio API)
 * Synthesizes a deep sub-bass heavy whoosh that scales duration & speed with scroll velocity.
 * @param {string} type - 'in' (sweeps up & deep) or 'out' (sweeps down & deep)
 * @param {number} velocity - Current scroll speed (fast scroll = faster heavy whoosh, slow scroll = long smooth fade)
 */
function playWhooshSFX(type = 'in', velocity = 1.0) {
  if (!audioEnabled) return;
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    
    // Scale duration with scroll speed: fast scroll = ~0.35s punchy heavy whoosh, slow scroll = ~0.85s long heavy whoosh
    const absVel = Math.abs(velocity) || 1.0;
    const duration = Math.max(0.35, Math.min(0.95 - (absVel * 0.1), 0.95));

    // 1. Deep Sub-Bass Rumble Layer (Bharipan)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    const subStart = type === 'in' ? 65 : 120;
    const subEnd = type === 'in' ? 140 : 45;
    
    subOsc.frequency.setValueAtTime(subStart, now);
    subOsc.frequency.exponentialRampToValueAtTime(subEnd, now + duration);
    
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.065, now + (duration * 0.35));
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + duration);

    // 2. Heavy Filtered Air Noise Layer
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(3.5, now);

    const startFreq = type === 'in' ? 180 : 1400;
    const endFreq = type === 'in' ? 1600 : 150;

    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.075, now + (duration * 0.4));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  } catch (_) {}
}

function playScrollTick() {
  playHoverSFX();
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
    contact: { email:"mahesh19031@govtsciencecollegedurg.ac.in", linkedin:"https://www.linkedin.com/in/mahesh-thakur-317872277/", instagram:"https://www.instagram.com/motion.mogrt" },
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

  // Helper function to open a specific accordion item
  const openItem = (item) => {
    if (item.classList.contains('is-open')) return;
    wrap.querySelectorAll('.accordion-item').forEach(el => {
      el.classList.remove('is-open');
      const tr = el.querySelector('.accordion-trigger');
      if (tr) tr.setAttribute('aria-expanded', 'false');
    });
    item.classList.add('is-open');
    const trigger = item.querySelector('.accordion-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    playCardOpenSFX();
  };

  // Bind hover (mouseenter) and click on each item
  wrap.querySelectorAll('.accordion-item').forEach((item) => {
    // Hover auto-open
    item.addEventListener('mouseenter', () => {
      openItem(item);
    });

    // Click toggle fallback
    const trigger = item.querySelector('.accordion-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        if (!isOpen) {
          openItem(item);
        } else {
          item.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }
  });
}

function renderVideoArea(p) {
  if (p.embedUrl && p.embedUrl.trim()) {
    const rawUrl = p.embedUrl.trim();
    const url = rawUrl.toLowerCase();
    const isDirectVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || url.includes('/media/videos/') || url.includes('cloudinary.com/') || url.includes('/video/upload/');
    
    if (isDirectVideo) {
      return `
        <video 
          src="${escAttr(rawUrl)}" 
          poster="${escAttr(p.thumbnail || '')}" 
          controls 
          preload="metadata" 
          playsinline 
          style="width:100%;height:100%;object-fit:cover;border-radius:12px;"
        ></video>
      `;
    }
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

    // Section entrance whoosh trigger for PORTFOLIO
    ScrollTrigger.create({
      trigger: '#hero',
      start: 'top 80%',
      onEnter: () => playWhooshSFX('in', currentScrollVelocity),
      onLeave: () => playWhooshSFX('out', currentScrollVelocity),
      onEnterBack: () => playWhooshSFX('in', currentScrollVelocity),
      onLeaveBack: () => playWhooshSFX('out', currentScrollVelocity)
    });

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

  // ------------------------------------------------------------
  // ABOUT BG WATERMARK MOTION (ABOUT)
  // Replicating exact PORTFOLIO watermark (#hero-bg-text) scroll logic
  // ------------------------------------------------------------
  const aboutBgText = document.getElementById('about-bg-text');
  if (aboutBgText && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    const targetAboutOpacity = 0.35;
    const exitXPercent = 35; // Matches PORTFOLIO exitXPercent
    const scrollState = { x: 0, opacity: targetAboutOpacity };

    // Initial base state
    aboutBgText.style.setProperty('--scroll-x', '0vw');
    aboutBgText.style.opacity = targetAboutOpacity;

    // Section entrance & exit whoosh SFX for ABOUT watermark
    ScrollTrigger.create({
      trigger: '#about',
      start: 'top 75%',
      end: 'bottom top',
      onEnter: () => playWhooshSFX('in', currentScrollVelocity),
      onLeave: () => playWhooshSFX('out', currentScrollVelocity),
      onEnterBack: () => playWhooshSFX('in', currentScrollVelocity),
      onLeaveBack: () => playWhooshSFX('out', currentScrollVelocity)
    });

    gsap.to(scrollState, {
      x: exitXPercent,
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '#about',
        start: 'top top',
        end: '85% top',
        scrub: 0.35,
        invalidateOnRefresh: true,
        onUpdate: () => {
          aboutBgText.style.setProperty('--scroll-x', `${scrollState.x}vw`);
          aboutBgText.style.opacity = scrollState.opacity;
        },
        onLeaveBack: () => {
          // Hard reset to canonical state at the top of section
          scrollState.x = 0;
          scrollState.opacity = targetAboutOpacity;
          aboutBgText.style.setProperty('--scroll-x', '0vw');
          aboutBgText.style.opacity = targetAboutOpacity;
        }
      }
    });

    const mouseObj = { x: 0, y: 0 };
    let mouseTween = null;
    document.addEventListener('mousemove', (e) => {
      if (window.innerWidth <= 768) return;
      const aboutSec = document.getElementById('about');
      if (!aboutSec) return;
      const rect = aboutSec.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) return;

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / cx));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / cy));

      if (mouseTween) mouseTween.kill();
      mouseTween = gsap.to(mouseObj, {
        x: dx * 8.0,
        y: dy * 4.5,
        duration: 0.25,
        ease: 'power2.out',
        onUpdate: () => {
          aboutBgText.style.setProperty('--mouse-x', `${mouseObj.x}px`);
          aboutBgText.style.setProperty('--mouse-y', `${mouseObj.y}px`);
        }
      });
    }, { passive: true });
  }

  // ------------------------------------------------------------
  // PASSIONS BG WATERMARK MOTION (INTERESTS)
  // ------------------------------------------------------------
  const interestsBgText = document.getElementById('interests-bg-text');
  if (interestsBgText && typeof ScrollTrigger !== 'undefined') {
    const targetPassionsOpacity = 0.35;
    const exitXPercent = 35;
    const scrollState = { x: 0, opacity: targetPassionsOpacity };

    interestsBgText.style.setProperty('--scroll-x', '0vw');
    interestsBgText.style.opacity = targetPassionsOpacity;

    // Section entrance & exit whoosh SFX for PASSIONS watermark
    ScrollTrigger.create({
      trigger: '#interests',
      start: 'top 75%',
      end: 'bottom top',
      onEnter: () => playWhooshSFX('in', currentScrollVelocity),
      onLeave: () => playWhooshSFX('out', currentScrollVelocity),
      onEnterBack: () => playWhooshSFX('in', currentScrollVelocity),
      onLeaveBack: () => playWhooshSFX('out', currentScrollVelocity)
    });

    gsap.to(scrollState, {
      x: exitXPercent,
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '#interests',
        start: 'top top',
        end: '85% top',
        scrub: 0.35,
        invalidateOnRefresh: true,
        onUpdate: () => {
          interestsBgText.style.setProperty('--scroll-x', `${scrollState.x}vw`);
          interestsBgText.style.opacity = scrollState.opacity;
        },
        onLeaveBack: () => {
          scrollState.x = 0;
          scrollState.opacity = targetPassionsOpacity;
          interestsBgText.style.setProperty('--scroll-x', '0vw');
          interestsBgText.style.opacity = targetPassionsOpacity;
        }
      }
    });

    const mouseObjPassions = { x: 0, y: 0 };
    let mouseTweenPassions = null;
    document.addEventListener('mousemove', (e) => {
      if (window.innerWidth <= 768) return;
      const interestsSec = document.getElementById('interests');
      if (!interestsSec) return;
      const rect = interestsSec.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) return;

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / cx));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / cy));

      if (mouseTweenPassions) mouseTweenPassions.kill();
      mouseTweenPassions = gsap.to(mouseObjPassions, {
        x: dx * 8.0,
        y: dy * 4.5,
        duration: 0.25,
        ease: 'power2.out',
        onUpdate: () => {
          interestsBgText.style.setProperty('--mouse-x', `${mouseObjPassions.x}px`);
          interestsBgText.style.setProperty('--mouse-y', `${mouseObjPassions.y}px`);
        }
      });
    }, { passive: true });
  }

  // ------------------------------------------------------------
  // PASSIONS HORIZONTAL ACCORDION INTERACTION
  // ------------------------------------------------------------
  const passionCards = document.querySelectorAll('.passion-card');
  if (passionCards.length) {
    passionCards.forEach(card => {
      const activateCard = () => {
        if (card.classList.contains('is-active')) return;
        passionCards.forEach(c => c.classList.remove('is-active'));
        card.classList.add('is-active');
        playCardOpenSFX();
      };
      card.addEventListener('mouseenter', activateCard);
      card.addEventListener('click', activateCard);
    });
  }
}

/* ─── STAT COUNTER ─── */
function initStatCounters() {
  if (typeof ScrollTrigger === 'undefined') return;
  document.querySelectorAll('.stat-value[data-count]').forEach(el => {
    const rawCount = el.getAttribute('data-count');
    if (!rawCount || isNaN(parseInt(rawCount, 10))) return;
    const target = parseInt(rawCount, 10);
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

let currentScrollVelocity = 1.0;

/* ─── SMOOTH SCROLL (Lenis) ─── */
function initLenis() {
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });

    lenis.on('scroll', (e) => {
      currentScrollVelocity = e.velocity || 1.0;
    });

    function raf(time) {
      lenis.raf(time);
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.update();
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(target, { offset: -80 });
        } else {
          target.scrollIntoView({ behavior: 'smooth' });
        }
        playClickSFX();
      }
    });
  });
}

/* ─── FUTURISTIC SUBTLE UI SFX BINDINGS ─── */
function initClickSFX() {
  const isInteractive = (target) => {
    // Exclude Beyond The Edit (#interests / .passion-card) and Showreel Accordion (#projects / .accordion-item)
    if (target.closest('#interests, .passion-card, #projects, .accordion-item, .accordion-trigger')) {
      return null;
    }
    return target.closest('button, a, .btn-primary, .btn-ghost, .social-btn, .focus-card, .software-card, .nav-links a, .stat-card, .role-pill, .hero-scroll-hint');
  };

  // Global event delegation for clicks
  document.addEventListener('click', (e) => {
    if (isInteractive(e.target)) {
      playClickSFX();
    }
  }, { passive: true });

  // Global event delegation for hovers
  document.addEventListener('mouseover', (e) => {
    const el = isInteractive(e.target);
    if (el && !el._hoveredSFX) {
      el._hoveredSFX = true;
      playHoverSFX();
      setTimeout(() => { el._hoveredSFX = false; }, 200);
    }
  }, { passive: true });
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
  window.location.href = 'admin.html';
}
window.openAdmin = openAdmin;

function closeAdmin() {
  // Safe fallback
}
window.closeAdmin = closeAdmin;

function initAdminTrigger() {
  const btn = document.getElementById('admin-btn');
  if (btn) btn.addEventListener('click', () => { openAdmin(); playClickSFX(); });

  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'a') { e.preventDefault(); openAdmin(); }
  });
}

/* ─── SITE LOADER ─── */
function hideLoader() {
  const loader = document.getElementById('site-loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
      playRepulsorLandingSFX();
    }, 1500);
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

/* ── CONTACT CHOOSER POPOVER ── */
function toggleContactChooser(show) {
  const chooser = document.getElementById('contact-chooser');
  if (!chooser) return;
  if (show) {
    chooser.classList.add('active');
    chooser.setAttribute('aria-hidden', 'false');
  } else {
    chooser.classList.remove('active');
    chooser.setAttribute('aria-hidden', 'true');
  }
}

// Global listeners for closing popover on Escape key or outside click
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    toggleContactChooser(false);
  }
});

document.addEventListener('click', (e) => {
  const chooser = document.getElementById('contact-chooser');
  const msgBtn = document.getElementById('contact-msg-btn');
  if (!chooser || !chooser.classList.contains('active')) return;
  if (!chooser.contains(e.target) && !msgBtn.contains(e.target)) {
    toggleContactChooser(false);
  }
});
