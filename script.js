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
soundAssets.repulsor.volume = 0.75;
soundAssets.magnetic.volume = 0.18;
soundAssets.click4.volume = 0.65;

/**
 * Play Click 4 SFX (assets/click_4.mp3) EXCLUSIVELY for opening Intro cards/boxes
 * (Showreel Accordion & Beyond The Edit cards)
 */
function playCardOpenSFX() {
  if (!audioEnabled) return;
  try {
    const snd = soundAssets.click4.cloneNode();
    snd.volume = 0.65;
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
    soundAssets.repulsor.volume = 0.75;
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
    snd.volume = 0.18;
    snd.play().catch(() => {});
  } catch (_) {}
}

function playHoverSFX() {
  if (!audioEnabled) return;
  try {
    const snd = soundAssets.magnetic.cloneNode();
    snd.volume = 0.22;
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
    subGain.gain.linearRampToValueAtTime(0.28, now + (duration * 0.35));
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
    gain.gain.linearRampToValueAtTime(0.32, now + (duration * 0.4));
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
  // 1. Try server API endpoint first for real-time global site data
  try {
    const apiResp = await fetch('/api/site-data');
    if (apiResp.ok) {
      const apiData = await apiResp.json();
      if (apiData && apiData.projects && apiData.projects.length > 0) {
        siteData = apiData;
        try { localStorage.setItem('mt-portfolio-data', JSON.stringify(apiData)); } catch (_) {}
        return;
      }
    }
  } catch (err) {
    console.warn('API /api/site-data unreachable, falling back to static files:', err);
  }

  // 2. Try static data.json file from server
  try {
    const res = await fetch('data.json');
    if (res.ok) {
      const fileData = await res.json();
      if (fileData && fileData.projects && fileData.projects.length > 0) {
        siteData = fileData;
        return;
      }
    }
  } catch (_) {}

  // 3. Fall back to localStorage if offline/local cache exists
  try {
    const localDataStr = localStorage.getItem('mt-portfolio-data');
    if (localDataStr) {
      const parsed = JSON.parse(localDataStr);
      if (parsed && parsed.projects && parsed.projects.length > 0) {
        siteData = parsed;
        return;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local siteData:', e);
  }

  // 4. Default fallback memory data structure
  siteData = getFallbackData();
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
    showreelReels: [
      {
        id: "reel-1",
        title: "Commercial & Brand Short-Form",
        description: "High-retention vertical ad edit with kinetic pacing, beat-synced motion, and punchy hooks.",
        category: "Commercial Ads",
        year: "2025",
        embedUrl: "https://res.cloudinary.com/esvwgoxe/video/upload/v1789095426/portfolio-projects/tduu0lc9ianrp2ia6c4r.mp4",
        videoId: "tduu0lc9ianrp2ia6c4r",
        thumbnail: ""
      },
      {
        id: "reel-2",
        title: "Real Estate Dynamic Showcase",
        description: "Clean speed-ramped transitions, color-graded footage, and modern typography overlays.",
        category: "Real Estate",
        year: "2025",
        embedUrl: "https://res.cloudinary.com/esvwgoxe/video/upload/v1789095943/real_estate_video_raw_vs_edited.mp4",
        videoId: "real_estate_video_raw_vs_edited",
        thumbnail: ""
      },
      {
        id: "reel-3",
        title: "Kinetic Typography & Motion Reel",
        description: "Bold title animations, custom After Effects MOGRTs, and retention-focused visual pacing.",
        category: "Motion Graphics",
        year: "2025",
        embedUrl: "",
        videoId: "",
        thumbnail: ""
      }
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

/* ─── DYNAMIC 3D COVER-FLOW SHOWREEL CAROUSEL ─── */
let showreelActiveIndex = 0;
let showreelReelsData = [];

function renderShowreelReels() {
  const track = document.getElementById('showreel-carousel-track');
  const dotsContainer = document.getElementById('reel-carousel-dots');
  const wrapper = document.getElementById('showreel-carousel-wrapper');
  if (!track || !siteData) return;

  const rawReels = Array.isArray(siteData.showreelReels) && siteData.showreelReels.length > 0
    ? siteData.showreelReels
    : [
        {
          id: "reel-1",
          title: "Short-Form Reel 01",
          description: "High-retention vertical edit with dynamic pacing.",
          category: "Commercial Ads",
          embedUrl: "",
          thumbnail: ""
        },
        {
          id: "reel-2",
          title: "Short-Form Reel 02",
          description: "Beat-synced motion graphics and clean cuts.",
          category: "Real Estate",
          embedUrl: "",
          thumbnail: ""
        },
        {
          id: "reel-3",
          title: "Short-Form Reel 03",
          description: "Color-graded vertical showcase and visual storytelling.",
          category: "Motion Graphics",
          embedUrl: "",
          thumbnail: ""
        }
      ];

  showreelReelsData = rawReels;

  // Render cards with direct click/tap fallback
  track.innerHTML = showreelReelsData.map((r, idx) => `
    <div class="reel-card" data-index="${idx}" data-reel-id="${escAttr(r.id || `reel-${idx + 1}`)}" onclick="handleReelCardClick(${idx})">
      <div class="reel-video-viewport">
        <span class="reel-slot-badge">REEL 0${idx + 1}</span>
        ${r.category ? `<span class="reel-category-pill">${escHtml(r.category)}</span>` : ''}
        ${renderReelMedia(r, idx)}
      </div>
      <div class="reel-card-body">
        <h3 class="reel-card-title">${escHtml(r.title || `Vertical Reel 0${idx + 1}`)}</h3>
        <p class="reel-card-desc">${escHtml(r.description || '')}</p>
      </div>
    </div>
  `).join('');

  // Render navigation dots
  if (dotsContainer) {
    dotsContainer.innerHTML = showreelReelsData.map((_, idx) => `
      <div class="reel-dot ${idx === showreelActiveIndex ? 'active' : ''}" onclick="goToShowreelIndex(${idx})" aria-label="Go to Reel ${idx + 1}"></div>
    `).join('');
  }

  // Setup navigation & interaction listeners
  initShowreelControls();

  // Position cards in 3D space
  updateShowreel3DPositions();

  // Initialize carousel viewport pointer tracking and controls
  initShowreelControls();
}

let showreelPointerArmed = true;
let isShowreelTransitionLocked = false;
let showreelTransitionTimeout = null;

function initShowreelControls() {
  const wrapper = document.getElementById('showreel-carousel-wrapper');
  const viewport = document.getElementById('showreel-carousel-viewport');
  const container = wrapper || viewport;
  if (container && !container._hasPointerZoneTracker) {
    container._hasPointerZoneTracker = true;

    container.addEventListener('mousemove', (e) => {
      // Only active on desktop viewports (skip on mobile touch devices)
      if (window.innerWidth <= 768 && 'ontouchstart' in window) return;
      if (!showreelReelsData || showreelReelsData.length <= 1) return;

      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width || container.offsetWidth || window.innerWidth || 1000;
      const containerLeft = rect.left || 0;
      const relativeX = (e.clientX - containerLeft) / containerWidth;

      // Center neutral / dead-zone: 36% to 64%
      if (relativeX >= 0.36 && relativeX <= 0.64) {
        // Re-arm pointer navigation whenever user returns pointer to neutral center
        showreelPointerArmed = true;
        return;
      }

      // If transition is currently running or pointer has not been re-armed in center, ignore
      if (isShowreelTransitionLocked || !showreelPointerArmed) return;

      if (relativeX < 0.36) {
        // LEFT ZONE -> ONE card backward
        showreelPointerArmed = false; // disarm until pointer returns to center or transition finishes
        const leftIndex = (showreelActiveIndex - 1 + showreelReelsData.length) % showreelReelsData.length;
        if (leftIndex !== showreelActiveIndex) {
          goToShowreelIndex(leftIndex);
        }
      } else if (relativeX > 0.64) {
        // RIGHT ZONE -> ONE card forward
        showreelPointerArmed = false; // disarm until pointer returns to center or transition finishes
        const rightIndex = (showreelActiveIndex + 1) % showreelReelsData.length;
        if (rightIndex !== showreelActiveIndex) {
          goToShowreelIndex(rightIndex);
        }
      }
    });

    container.addEventListener('mouseleave', () => {
      showreelPointerArmed = true;
    });
  }

  // Touch / Drag swipe support for mobile/tablet fallback
  if (viewport && !viewport._hasTouch) {
    viewport._hasTouch = true;
    let touchStartX = 0;
    let touchEndX = 0;

    viewport.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 45) {
        nextShowreel();
      } else if (touchEndX - touchStartX > 45) {
        prevShowreel();
      }
    }, { passive: true });
  }

  // Keyboard arrow navigation when hovering over carousel
  if (wrapper && !wrapper._hasKeyNav) {
    wrapper._hasKeyNav = true;
    let isHovered = false;
    wrapper.addEventListener('mouseenter', () => { isHovered = true; });
    wrapper.addEventListener('mouseleave', () => { isHovered = false; });
    document.addEventListener('keydown', (e) => {
      if (!isHovered) return;
      if (e.key === 'ArrowLeft') {
        prevShowreel();
      } else if (e.key === 'ArrowRight') {
        nextShowreel();
      }
    });
  }

  // Window resize handler for responsive 3D carousel spacing
  if (!window._hasShowreelResize) {
    window._hasShowreelResize = true;
    window.addEventListener('resize', () => {
      updateShowreel3DPositions();
    });
  }
}

function nextShowreel() {
  if (showreelReelsData.length === 0 || isShowreelTransitionLocked) return;
  const nextIdx = (showreelActiveIndex + 1) % showreelReelsData.length;
  goToShowreelIndex(nextIdx);
}
window.nextShowreel = nextShowreel;

function prevShowreel() {
  if (showreelReelsData.length === 0 || isShowreelTransitionLocked) return;
  const prevIdx = (showreelActiveIndex - 1 + showreelReelsData.length) % showreelReelsData.length;
  goToShowreelIndex(prevIdx);
}
window.prevShowreel = prevShowreel;

function goToShowreelIndex(index) {
  if (index < 0 || index >= showreelReelsData.length) return;
  if (isShowreelTransitionLocked && index !== showreelActiveIndex) return;

  showreelActiveIndex = index;

  // Lock transitions during 3D CSS transform transition (380ms)
  isShowreelTransitionLocked = true;
  if (showreelTransitionTimeout) clearTimeout(showreelTransitionTimeout);
  showreelTransitionTimeout = setTimeout(() => {
    isShowreelTransitionLocked = false;
  }, 380);

  updateShowreel3DPositions();
  playClickSFX();
}
window.goToShowreelIndex = goToShowreelIndex;

window.handleReelCardClick = function(index) {
  if (index !== showreelActiveIndex) {
    goToShowreelIndex(index);
  }
};

function updateShowreel3DPositions() {
  const cards = document.querySelectorAll('.showreel-carousel-track .reel-card');
  const dots = document.querySelectorAll('.reel-carousel-dots .reel-dot');
  const total = showreelReelsData.length;
  if (!cards.length || total === 0) return;

  // Screen adaptive card spacing step (px)
  const isMobile = window.innerWidth <= 768;
  const isTablet = window.innerWidth <= 1024 && !isMobile;
  const stepX = isMobile ? 120 : (isTablet ? 170 : 210);

  cards.forEach((card, idx) => {
    // Calculate circular shortest relative distance from active index
    let offset = idx - showreelActiveIndex;
    if (total > 2) {
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;
    }

    // Reset base classes
    card.classList.remove('is-center', 'is-side', 'is-hidden');

    if (offset === 0) {
      // CENTER CARD: foreground, full scale, prominent
      card.classList.add('is-center');
      card.style.transform = `translateX(0px) translateZ(60px) scale(1)`;
      card.style.opacity = '1';
      card.style.filter = 'brightness(1)';
      card.style.zIndex = '15';
      card.style.pointerEvents = 'auto';

      // Auto-play / enable video interaction if center
      const vid = card.querySelector('video');
      if (vid && vid.paused && vid.hasAttribute('data-autoplay-on-focus')) {
        vid.play().catch(() => {});
      }
    } else if (Math.abs(offset) === 1) {
      // IMMEDIATE SIDE CARDS: scale down, lower z-index, offset behind center
      card.classList.add('is-side');
      const translateX = offset * stepX;
      const rotY = offset * -8; // subtle 3D angle
      card.style.transform = `translateX(${translateX}px) translateZ(-40px) scale(0.82) rotateY(${rotY}deg)`;
      card.style.opacity = '0.65';
      card.style.filter = 'brightness(0.7)';
      card.style.zIndex = '8';
      card.style.pointerEvents = 'auto';

      // Pause non-center video
      const vid = card.querySelector('video');
      if (vid && !vid.paused) vid.pause();
    } else if (Math.abs(offset) === 2) {
      // DEEPER SIDE CARDS: progressively smaller and more transparent
      card.classList.add('is-side');
      const translateX = offset * (stepX * 0.95);
      const rotY = offset * -14;
      card.style.transform = `translateX(${translateX}px) translateZ(-110px) scale(0.68) rotateY(${rotY}deg)`;
      card.style.opacity = '0.35';
      card.style.filter = 'brightness(0.5)';
      card.style.zIndex = '4';
      card.style.pointerEvents = 'auto';

      const vid = card.querySelector('video');
      if (vid && !vid.paused) vid.pause();
    } else {
      // FARTHER CARDS: fully behind / hidden from view
      card.classList.add('is-hidden');
      const sign = offset > 0 ? 1 : -1;
      card.style.transform = `translateX(${sign * stepX * 2.2}px) translateZ(-200px) scale(0.5)`;
      card.style.opacity = '0';
      card.style.zIndex = '1';
      card.style.pointerEvents = 'none';

      const vid = card.querySelector('video');
      if (vid && !vid.paused) vid.pause();
    }
  });

  // Update dots active class
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === showreelActiveIndex);
  });
}

function renderReelMedia(r, idx) {
  if (r.embedUrl && r.embedUrl.trim()) {
    const rawUrl = r.embedUrl.trim();
    const isDirectVideo = checkIsVideoUrl(rawUrl);

    if (isDirectVideo) {
      return `
        <video 
          src="${escAttr(rawUrl)}" 
          poster="${escAttr(r.thumbnail || '')}" 
          controls 
          preload="metadata" 
          playsinline 
          onerror="this.style.display='none'; const fb = this.nextElementSibling; if (fb) fb.style.display='flex';"
        ></video>
        <div class="reel-placeholder" style="display:none;">
          <div class="play-icon">▶</div>
          <span>${escHtml(r.title || 'Vertical Reel')}</span>
          <a href="${escAttr(rawUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:0.75rem;color:var(--electric-blue);text-decoration:underline;">Watch Direct Video</a>
        </div>
      `;
    }

    const iframeUrl = formatEmbedIframeUrl(rawUrl);
    return `<iframe src="${escAttr(iframeUrl)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${escAttr(r.title || 'Vertical Reel')}"></iframe>`;
  }

  if (r.thumbnail && r.thumbnail.trim()) {
    return `
      <img 
        src="${escAttr(r.thumbnail)}" 
        alt="${escAttr(r.title || 'Vertical Reel')}" 
        onerror="this.style.display='none'; const fb = this.nextElementSibling; if (fb) fb.style.display='flex';"
      />
      <div class="reel-placeholder" style="display:none;">
        <div class="play-icon">▶</div>
        <span>${escHtml(r.title || 'Vertical Reel')}</span>
      </div>
    `;
  }

  return `
    <div class="reel-placeholder">
      <div class="play-icon">▶</div>
      <span>Add 9:16 Vertical Reel<br />via Admin Panel</span>
    </div>
  `;
}

/* ─── RENDER ACCORDION ─── */
function renderAccordion() {
  renderShowreelReels();
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

function checkIsVideoUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  if (typeof MediaStorageService !== 'undefined' && MediaStorageService.isDirectVideoUrl) {
    return MediaStorageService.isDirectVideoUrl(rawUrl);
  }
  const url = rawUrl.trim().toLowerCase();
  const cleanUrl = url.split('?')[0].split('#')[0];
  if (/\.(mp4|webm|mov|m4v|ogg|mkv)$/i.test(cleanUrl)) return true;
  if (url.includes('cloudinary.com/') && (url.includes('/video/upload/') || url.includes('/video/'))) return true;
  if (url.includes('firebasestorage.googleapis.com') && (url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('video'))) return true;
  return false;
}

function formatEmbedIframeUrl(url) {
  if (!url) return '';
  // Convert standard YouTube watch URLs to embed format
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('watch?v=')[1]?.split('&')[0];
    if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}`;
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}`;
  }
  // Convert Vimeo watch URLs to embed format
  if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    if (videoId && !isNaN(videoId)) return `https://player.vimeo.com/video/${videoId}`;
  }
  return url;
}

function renderVideoArea(p) {
  if (p.embedUrl && p.embedUrl.trim()) {
    const rawUrl = p.embedUrl.trim();
    const isDirectVideo = checkIsVideoUrl(rawUrl);
    
    if (isDirectVideo) {
      return `
        <video 
          src="${escAttr(rawUrl)}" 
          poster="${escAttr(p.thumbnail || '')}" 
          controls 
          preload="metadata" 
          playsinline 
          style="width:100%;height:100%;object-fit:cover;border-radius:12px;background:#000;"
          onerror="this.style.display='none'; const fb = this.nextElementSibling; if (fb) fb.style.display='flex';"
        ></video>
        <div class="video-error-fallback" style="display:none;width:100%;height:100%;border-radius:12px;background:rgba(0,0,0,0.7);display:none;align-items:center;justify-content:center;flex-direction:column;gap:8px;padding:20px;text-align:center;">
          ${p.thumbnail ? `<img src="${escAttr(p.thumbnail)}" alt="${escAttr(p.title)}" style="max-height:140px;border-radius:8px;object-fit:cover;" />` : `<div style="font-size:2rem;">🎬</div>`}
          <span style="font-size:0.75rem;color:var(--text-muted);">${escHtml(p.title)}</span>
          <a href="${escAttr(rawUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:0.72rem;color:var(--electric-blue);text-decoration:underline;">Watch Direct Video</a>
        </div>
      `;
    }

    const iframeUrl = formatEmbedIframeUrl(rawUrl);
    return `<iframe src="${escAttr(iframeUrl)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${escAttr(p.title)}" style="width:100%;height:100%;border-radius:12px;border:none;"></iframe>`;
  }

  if (p.thumbnail && p.thumbnail.trim()) {
    return `
      <img 
        src="${escAttr(p.thumbnail)}" 
        alt="${escAttr(p.title)}" 
        style="width:100%;height:100%;object-fit:cover;border-radius:12px;" 
        onerror="this.style.display='none'; const fb = this.nextElementSibling; if (fb) fb.style.display='flex';"
      />
      <div class="video-placeholder" style="display:none;">
        <div class="play-icon">▶</div>
        <span>${escHtml(p.title)}</span>
      </div>
    `;
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
  const software = Array.isArray(siteData.software) ? siteData.software : [];
  grid.innerHTML = software.map(s => {
    const isImg = s.icon && (s.icon.includes('/') || s.icon.endsWith('.svg') || s.icon.endsWith('.png'));
    const iconMarkup = isImg
      ? `<img class="software-icon-img" src="${escAttr(s.icon)}" alt="${escAttr(s.name)}" />`
      : s.icon;
    return `
      <div class="software-card glass-card reveal-up">
        <span class="software-icon">${iconMarkup}</span>
        <div class="software-name">${escHtml(s.name)}</div>
        <div class="skill-bar">
          <div class="skill-bar-fill" data-level="${s.level || 0}"></div>
        </div>
      </div>
    `;
  }).join('');
}

/* ─── UPDATE HERO FROM DATA ─── */
function applyHeroData() {
  if (!siteData) return;
  const h = siteData.hero || {};
  const fn = document.querySelector('.hero-name .first');
  const ln = document.querySelector('.hero-name .last');
  const bio = document.querySelector('.hero-bio');
  const greet = document.querySelector('.hero-greeting');
  if (fn && h.firstName) fn.textContent = h.firstName;
  if (ln && h.lastName) ln.textContent = h.lastName;
  if (bio && h.bio) bio.textContent = h.bio;
  if (greet) {
    const rawGreeting = h.greeting || "Hi I'm";
    if (rawGreeting.trim().toLowerCase().startsWith("hi i'm") || rawGreeting.trim().toLowerCase().startsWith("hi, i'm")) {
      greet.innerHTML = `<span class="greet-bold">Hi</span> <span class="greet-thin">I'm</span>`;
    } else {
      greet.textContent = rawGreeting;
    }
  }

  // Contact
  if (siteData.contact && siteData.contact.email) {
    const emailLinks = document.querySelectorAll('.contact-email, [href^="mailto:"]');
    emailLinks.forEach(el => {
      el.href = `mailto:${siteData.contact.email}`;
      if (el.classList.contains('contact-email') && el.childNodes.length > 0) {
        el.childNodes[el.childNodes.length - 1].textContent = ` ${siteData.contact.email}`;
      }
    });
  }
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

  // CINEMATIC BLUR + SCALE + STAGGER REVEAL FOR "Hi", "I'm", "Mahesh", "Thakur"
  const cineBlurTexts = document.querySelectorAll('.cine-blur-text');
  if (cineBlurTexts.length) {
    tl.fromTo(cineBlurTexts,
      {
        opacity: 0,
        filter: 'blur(14px)',
        scale: 0.88,
        y: 18
      },
      {
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1.0,
        y: 0,
        duration: 0.85,
        stagger: 0.16,
        ease: 'power3.out'
      },
      0.1
    );
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
      if (el.classList.contains('about-bio')) return; // Handled separately below for sentence-by-sentence reveal
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

    // CINEMATIC BLUR + SCALE REVEAL WITH RANDOM SENTENCE TIMING FOR ABOUT BIO
    const aboutBio = document.querySelector('.about-bio');
    if (aboutBio) {
      aboutBio.classList.remove('reveal-up'); // Prevent conflict with general reveal-up loop
      gsap.set(aboutBio, { opacity: 1, y: 0 }); // Ensure parent container is visible

      // Split paragraph into distinct sentences/clauses while preserving HTML tags
      const sentences = [
        `I'm <strong>Mahesh Thakur</strong>, a Video Editor from India with 2.5+ years of experience.`,
        `I work across video editing, motion graphics, color grading, and sound, with a focus on clean work, strong pacing, and attention to detail.`,
        `I'm looking for a team where I can put my skills to their best use, keep learning, take on new challenges, and contribute to the growth of the work and the company along the way.`
      ];

      aboutBio.innerHTML = sentences.map(s => `<span class="bio-sentence" style="display:inline-block; will-change:transform,filter,opacity; margin-right: 0.35em;">${s}</span>`).join(' ');

      const sentenceElements = aboutBio.querySelectorAll('.bio-sentence');

      // Random delay timing array for each sentence
      const sentenceDelays = [0.00, 0.32, 0.16];

      sentenceElements.forEach((el, index) => {
        const delay = sentenceDelays[index % sentenceDelays.length];

        gsap.fromTo(el,
          {
            opacity: 0,
            filter: 'blur(12px)',
            scale: 0.92,
            y: 16
          },
          {
            opacity: 1,
            filter: 'blur(0px)',
            scale: 1.0,
            y: 0,
            duration: 0.85,
            delay: delay,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: aboutBio,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      });
    }

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
    // Exclude Creative Passions (.passion-card) and Showreel Accordion (#projects / .accordion-item)
    if (target.closest('#interests, .passion-card, #projects, .accordion-item, .accordion-trigger')) {
      return null;
    }
    return target.closest('button, a, .btn-primary, .btn-ghost, .social-btn, .focus-card, .software-card, .nav-links a, .stat-card, .role-pill, .hero-scroll-hint, .dev-project-card, .ai-tool-item');
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
let loaderHidden = false;
function hideLoader() {
  if (loaderHidden) return;
  const loader = document.getElementById('site-loader');
  if (loader) {
    loaderHidden = true;
    setTimeout(() => {
      loader.classList.add('hidden');
      try { playRepulsorLandingSFX(); } catch (_) {}
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
  // Emergency fallback timer to guarantee loader dismissal even on unexpected errors
  const fallbackTimer = setTimeout(() => {
    hideLoader();
  }, 4000);

  try {
    await loadData();
    try { applyHeroData(); } catch (e) { console.error('Error applying hero data:', e); }
    try { renderAccordion(); } catch (e) { console.error('Error rendering accordion:', e); }
    try { renderSoftware(); } catch (e) { console.error('Error rendering software grid:', e); }
    try { initSoundToggle(); } catch (e) { console.error('Error init sound toggle:', e); }
    try { initCursor(); } catch (e) { console.error('Error init cursor:', e); }
    try { initParticles(); } catch (e) { console.error('Error init particles:', e); }
    try { initMagneticGrid(); } catch (e) { console.error('Error init magnetic grid:', e); }
    try { initNavbar(); } catch (e) { console.error('Error init navbar:', e); }
    try { initClickSFX(); } catch (e) { console.error('Error init click SFX:', e); }
    try { initAdminTrigger(); } catch (e) { console.error('Error init admin trigger:', e); }
  } catch (fatalBootError) {
    console.error('Fatal error during site initialization:', fatalBootError);
  } finally {
    clearTimeout(fallbackTimer);
    hideLoader();
  }

  // GSAP & Lenis init after scripts load
  const waitForGSAP = () => {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      try {
        gsap.registerPlugin(ScrollTrigger);
        initHeroAnimations();
        initStatCounters();
      } catch (e) {
        console.error('Error initializing GSAP/ScrollTrigger:', e);
      }
    } else {
      setTimeout(waitForGSAP, 80);
    }
  };
  waitForGSAP();

  const waitForLenis = () => {
    if (typeof Lenis !== 'undefined') {
      try {
        initLenis();
      } catch (e) {
        console.error('Error initializing Lenis:', e);
      }
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
