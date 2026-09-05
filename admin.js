/* ================================================
   MAHESH THAKUR PORTFOLIO — ADMIN.JS
   Admin Panel: password gate, CRUD, localStorage, export
   ================================================ */

'use strict';

const ADMIN_PASSWORD = 'admin123';

/* ─── PASSWORD GATE ─── */
function initPasswordGate() {
  const pwInput = document.getElementById('admin-pw-input');
  const pwSubmit = document.getElementById('admin-pw-submit');
  const pwError = document.getElementById('pw-error');
  const content = document.getElementById('admin-panel-content');
  const gate = document.getElementById('admin-password-gate');

  if (!pwInput || !pwSubmit) return;

  const tryUnlock = () => {
    if (pwInput.value === ADMIN_PASSWORD) {
      gate.style.display = 'none';
      content.classList.add('unlocked');
      pwError.classList.remove('visible');
      loadAdminFields();
      playClickSFX();
    } else {
      pwError.classList.add('visible');
      pwInput.value = '';
      pwInput.focus();
      pwInput.style.borderColor = '#ff4444';
      setTimeout(() => { pwInput.style.borderColor = ''; }, 800);
    }
  };

  pwSubmit.addEventListener('click', tryUnlock);
  pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
}

/* ─── TAB SWITCHING ─── */
function initAdminTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  const contents = document.querySelectorAll('.admin-tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + target)?.classList.add('active');
      playClickSFX();
    });
  });
}

/* ─── LOAD DATA INTO FIELDS ─── */
function loadAdminFields() {
  const d = getSiteData();
  if (!d) return;

  // Hero tab
  setVal('edit-firstName', d.hero?.firstName);
  setVal('edit-lastName', d.hero?.lastName);
  setVal('edit-bio', d.hero?.bio);
  setVal('edit-greeting', d.hero?.greeting);

  // Contact tab
  setVal('edit-email', d.contact?.email);
  setVal('edit-linkedin', d.contact?.linkedin);
  setVal('edit-instagram', d.contact?.instagram);

  // Projects tab
  renderAdminProjects(d.projects || []);
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/* ─── ADMIN PROJECT LIST ─── */
function renderAdminProjects(projects) {
  const list = document.getElementById('admin-project-list');
  if (!list) return;

  list.innerHTML = projects.map(p => `
    <div class="admin-project-item" data-id="${p.id}">
      <div style="flex:1;min-width:0;">
        <h4>${escHtml(p.title)}</h4>
        <p>${(p.tools || []).join(', ')}</p>
      </div>
      <div class="admin-btn-row">
        <button class="admin-btn" onclick="editProject(${p.id})">Edit</button>
        <button class="admin-btn delete" onclick="deleteProject(${p.id})">Delete</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);font-size:0.85rem;">No projects yet.</p>';
}

/* ─── EDIT PROJECT ─── */
window.editProject = function(id) {
  const d = getSiteData();
  const p = d.projects.find(x => x.id === id);
  if (!p) return;

  setVal('edit-proj-id', p.id);
  setVal('edit-proj-title', p.title);
  setVal('edit-proj-desc', p.description);
  setVal('edit-proj-tools', (p.tools || []).join(', '));
  setVal('edit-proj-embed', p.embedUrl || '');
  setVal('edit-proj-thumb', p.thumbnail || '');

  // Scroll to form
  document.getElementById('tab-projects')?.scrollTo({ top: 9999, behavior: 'smooth' });
  playClickSFX();
};

/* ─── DELETE PROJECT ─── */
window.deleteProject = function(id) {
  const d = getSiteData();
  const idx = d.projects.findIndex(x => x.id === id);
  if (idx === -1) return;
  d.projects.splice(idx, 1);
  saveSiteData(d);
  renderAdminProjects(d.projects);
  refreshSiteUI();
  showToast('Project deleted.');
  playClickSFX();
};

/* ─── ADD PROJECT BUTTON ─── */
function initAddProject() {
  const btn = document.getElementById('admin-add-proj-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    clearProjectForm();
    document.querySelector('[data-tab="projects"]')?.click();
    playClickSFX();
  });
}

function clearProjectForm() {
  ['edit-proj-id','edit-proj-title','edit-proj-desc','edit-proj-tools','edit-proj-embed','edit-proj-thumb'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

/* ─── SAVE CHANGES ─── */
function initSaveButton() {
  const btn = document.getElementById('admin-save-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const d = getSiteData();

    // Hero
    d.hero.firstName = getVal('edit-firstName') || d.hero.firstName;
    d.hero.lastName = getVal('edit-lastName') || d.hero.lastName;
    d.hero.bio = getVal('edit-bio') || d.hero.bio;
    d.hero.greeting = getVal('edit-greeting') || d.hero.greeting;

    // Contact
    d.contact.email = getVal('edit-email') || d.contact.email;
    d.contact.linkedin = getVal('edit-linkedin') || d.contact.linkedin;
    d.contact.instagram = getVal('edit-instagram') || d.contact.instagram;

    // Project save/update
    const projTitle = getVal('edit-proj-title');
    if (projTitle) {
      const projId = getVal('edit-proj-id');
      const toolsRaw = getVal('edit-proj-tools');
      const tools = toolsRaw ? toolsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
      const projData = {
        title: projTitle,
        description: getVal('edit-proj-desc'),
        tools,
        embedUrl: getVal('edit-proj-embed'),
        thumbnail: getVal('edit-proj-thumb'),
      };

      if (projId) {
        const idx = d.projects.findIndex(x => String(x.id) === String(projId));
        if (idx !== -1) {
          d.projects[idx] = { ...d.projects[idx], ...projData };
        }
      } else {
        const maxId = d.projects.reduce((m, p) => Math.max(m, p.id), 0);
        d.projects.push({ id: maxId + 1, ...projData });
      }
      clearProjectForm();
    }

    saveSiteData(d);
    renderAdminProjects(d.projects);
    refreshSiteUI();
    showToast('Changes saved!');
    playClickSFX();
  });
}

/* ─── EXPORT data.json ─── */
function initExport() {
  const btn = document.getElementById('admin-export-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const d = getSiteData();
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('data.json exported!');
    playClickSFX();
  });
}

/* ─── DATA HELPERS ─── */
function getSiteData() {
  try {
    const stored = localStorage.getItem('mt-portfolio-data');
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return window.siteData || null;
}

function saveSiteData(data) {
  localStorage.setItem('mt-portfolio-data', JSON.stringify(data));
  window.siteData = data;
}

/* ─── REFRESH SITE UI ─── */
function refreshSiteUI() {
  if (typeof renderAccordion === 'function') renderAccordion();
  if (typeof renderSoftware === 'function') renderSoftware();
  if (typeof applyHeroData === 'function') applyHeroData();

  // Re-bind GSAP skill bars
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    document.querySelectorAll('.skill-bar-fill').forEach(bar => {
      const level = bar.getAttribute('data-level');
      gsap.to(bar, { width: level + '%', duration: 1.2, ease: 'power2.out' });
    });
    ScrollTrigger.refresh();
  }
}

/* ─── SAFE UTIL REFERENCES ─── */
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg) {
  if (typeof window.showToast === 'function') window.showToast(msg);
}

function playClickSFX() {
  if (typeof window !== 'undefined' && window.AudioContext) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch (_) {}
  }
}

/* ─── VISUAL EDITOR CONTROLLER ─── */
let activeVeLayer = 'subject';
const veHistoryStack = [];
let veHistoryIndex = -1;

const DEFAULT_DESIGN_SCHEMA = {
  hero: {
    subject: { x: 0, y: 0, scale: 1.0, opacity: 1.0, zIndex: 3, locked: true },
    bgText: {
      content: 'PORTFOLIO',
      x: 0,
      y: 0,
      scale: 1.0,
      opacity: 0.085,
      zIndex: 1,
      mouseParallax: { enabled: true, speedX: -14, speedY: -7 },
      scrollMotion: { exitXPercent: 35, fadeOnScroll: true }
    }
  }
};

function initVisualEditor() {
  const d = getSiteData();
  if (!d.design) {
    d.design = JSON.parse(JSON.stringify(DEFAULT_DESIGN_SCHEMA));
    saveSiteData(d);
  }
  pushVeHistory(d.design);

  // Device switcher
  document.querySelectorAll('.ve-device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ve-device-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const frame = document.getElementById('ve-canvas-frame');
      if (frame) frame.setAttribute('data-device', btn.getAttribute('data-device'));
      updateVeTransformBox();
      playClickSFX();
    });
  });

  // Layer tabs
  document.querySelectorAll('.ve-layer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ve-layer-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeVeLayer = tab.getAttribute('data-target-layer');
      loadVeInspectorProps();
      updateVeTransformBox();
      playClickSFX();
    });
  });

  // Canvas layer click selection
  document.querySelectorAll('.ve-layer').forEach(layerEl => {
    layerEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const layerName = layerEl.getAttribute('data-layer');
      if (layerName) {
        const tab = document.querySelector(`.ve-layer-tab[data-target-layer="${layerName}"]`);
        if (tab) tab.click();
      }
    });
  });

  // Dragging logic
  initVeCanvasDragging();

  // Bi-directional Inspector Inputs
  bindVeInputPairs('ve-slider-x', 've-num-x', (val) => updateActiveVeProp('x', parseFloat(val)));
  bindVeInputPairs('ve-slider-y', 've-num-y', (val) => updateActiveVeProp('y', parseFloat(val)));
  bindVeInputPairs('ve-slider-scale', 've-num-scale', (val) => updateActiveVeProp('scale', parseFloat(val)));
  bindVeInputPairs('ve-slider-opacity', 've-num-opacity', (val) => updateActiveVeProp('opacity', parseFloat(val)));

  document.getElementById('ve-num-zindex')?.addEventListener('input', (e) => {
    updateActiveVeProp('zIndex', parseInt(e.target.value) || 1);
  });

  document.getElementById('ve-prop-locked')?.addEventListener('change', (e) => {
    updateActiveVeProp('locked', e.target.checked);
  });

  // Watermark Specific Motion inputs
  document.getElementById('ve-prop-textcontent')?.addEventListener('input', (e) => {
    const d = getSiteData();
    d.design.hero.bgText.content = e.target.value || 'PORTFOLIO';
    saveSiteData(d);
    renderVeCanvas();
    refreshSiteUI();
  });

  document.getElementById('ve-prop-parallax-enabled')?.addEventListener('change', (e) => {
    const d = getSiteData();
    d.design.hero.bgText.mouseParallax.enabled = e.target.checked;
    saveSiteData(d);
    refreshSiteUI();
  });

  bindVeInputPairs('ve-slider-parallax-x', 've-num-parallax-x', (val) => {
    const d = getSiteData();
    d.design.hero.bgText.mouseParallax.speedX = parseFloat(val);
    saveSiteData(d);
    refreshSiteUI();
  });

  bindVeInputPairs('ve-slider-parallax-y', 've-num-parallax-y', (val) => {
    const d = getSiteData();
    d.design.hero.bgText.mouseParallax.speedY = parseFloat(val);
    saveSiteData(d);
    refreshSiteUI();
  });

  bindVeInputPairs('ve-slider-scrollexit', 've-num-scrollexit', (val) => {
    const d = getSiteData();
    d.design.hero.bgText.scrollMotion.exitXPercent = parseFloat(val);
    saveSiteData(d);
    refreshSiteUI();
  });

  // History / Reset
  document.getElementById('ve-undo-btn')?.addEventListener('click', veUndo);
  document.getElementById('ve-redo-btn')?.addEventListener('click', veRedo);
  document.getElementById('ve-reset-btn')?.addEventListener('click', veResetToDefault);

  // Initial Load into Canvas
  loadVeInspectorProps();
  renderVeCanvas();
}

function renderVeCanvas() {
  const d = getSiteData();
  const design = d.design?.hero || DEFAULT_DESIGN_SCHEMA.hero;

  const subjEl = document.getElementById('ve-layer-subject');
  if (subjEl) {
    const s = design.subject;
    subjEl.style.transform = `translate(${s.x}px, ${s.y}px) scale(${s.scale})`;
    subjEl.style.opacity = s.opacity;
    subjEl.style.zIndex = s.zIndex;
  }

  const bgTextEl = document.getElementById('ve-layer-bgText');
  const bgTextRender = document.getElementById('ve-canvas-bgtext-render');
  if (bgTextEl) {
    const b = design.bgText;
    bgTextEl.style.transform = `translate(${b.x}px, ${b.y}px) scale(${b.scale})`;
    bgTextEl.style.opacity = b.opacity;
    bgTextEl.style.zIndex = b.zIndex;
    if (bgTextRender) bgTextRender.textContent = b.content || 'PORTFOLIO';
  }

  updateVeTransformBox();
}

function updateVeTransformBox() {
  const activeLayerEl = document.getElementById(`ve-layer-${activeVeLayer}`);
  const box = document.getElementById('ve-transform-box');
  const frame = document.getElementById('ve-canvas-frame');
  if (!activeLayerEl || !box || !frame) return;

  const layerRect = activeLayerEl.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();

  box.style.left = `${layerRect.left - frameRect.left - 2}px`;
  box.style.top = `${layerRect.top - frameRect.top - 2}px`;
  box.style.width = `${layerRect.width + 4}px`;
  box.style.height = `${layerRect.height + 4}px`;
  box.classList.add('visible');
}

function loadVeInspectorProps() {
  const d = getSiteData();
  const heroDesign = d.design?.hero || DEFAULT_DESIGN_SCHEMA.hero;
  const targetProps = heroDesign[activeVeLayer] || DEFAULT_DESIGN_SCHEMA.hero[activeVeLayer];

  setVeInputPair('ve-slider-x', 've-num-x', targetProps.x || 0);
  setVeInputPair('ve-slider-y', 've-num-y', targetProps.y || 0);
  setVeInputPair('ve-slider-scale', 've-num-scale', targetProps.scale ?? 1.0);
  setVeInputPair('ve-slider-opacity', 've-num-opacity', targetProps.opacity ?? 1.0);

  const zIndexInput = document.getElementById('ve-num-zindex');
  if (zIndexInput) zIndexInput.value = targetProps.zIndex || 1;

  const lockedCheckbox = document.getElementById('ve-prop-locked');
  if (lockedCheckbox) lockedCheckbox.checked = !!targetProps.locked;

  const motionGroup = document.getElementById('ve-motion-group');
  if (motionGroup) {
    if (activeVeLayer === 'bgText') {
      motionGroup.style.display = 'flex';
      const b = heroDesign.bgText;
      const contentInput = document.getElementById('ve-prop-textcontent');
      if (contentInput) contentInput.value = b.content || 'PORTFOLIO';

      const parallaxCheckbox = document.getElementById('ve-prop-parallax-enabled');
      if (parallaxCheckbox) parallaxCheckbox.checked = b.mouseParallax?.enabled !== false;

      setVeInputPair('ve-slider-parallax-x', 've-num-parallax-x', b.mouseParallax?.speedX ?? -14);
      setVeInputPair('ve-slider-parallax-y', 've-num-parallax-y', b.mouseParallax?.speedY ?? -7);
      setVeInputPair('ve-slider-scrollexit', 've-num-scrollexit', b.scrollMotion?.exitXPercent ?? 35);
    } else {
      motionGroup.style.display = 'none';
    }
  }
}

function updateActiveVeProp(key, val) {
  const d = getSiteData();
  if (!d.design) d.design = JSON.parse(JSON.stringify(DEFAULT_DESIGN_SCHEMA));
  d.design.hero[activeVeLayer][key] = val;
  saveSiteData(d);
  pushVeHistory(d.design);
  renderVeCanvas();
  refreshSiteUI();
}

function bindVeInputPairs(sliderId, numId, onChange) {
  const slider = document.getElementById(sliderId);
  const num = document.getElementById(numId);
  if (!slider || !num) return;

  const update = (val) => {
    slider.value = val;
    num.value = val;
    onChange(val);
  };

  slider.addEventListener('input', (e) => update(e.target.value));
  num.addEventListener('input', (e) => update(e.target.value));
}

function setVeInputPair(sliderId, numId, val) {
  const slider = document.getElementById(sliderId);
  const num = document.getElementById(numId);
  if (slider) slider.value = val;
  if (num) num.value = val;
}

function initVeCanvasDragging() {
  let isDragging = false;
  let startX = 0, startY = 0;
  let initialPropX = 0, initialPropY = 0;

  const frame = document.getElementById('ve-canvas-frame');
  if (!frame) return;

  frame.addEventListener('mousedown', (e) => {
    const d = getSiteData();
    const layerProp = d.design?.hero?.[activeVeLayer];
    if (layerProp?.locked) return; // Prevent dragging locked elements

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialPropX = layerProp.x || 0;
    initialPropY = layerProp.y || 0;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const newX = Math.round(initialPropX + dx);
    const newY = Math.round(initialPropY + dy);

    setVeInputPair('ve-slider-x', 've-num-x', newX);
    setVeInputPair('ve-slider-y', 've-num-y', newY);
    updateActiveVeProp('x', newX);
    updateActiveVeProp('y', newY);
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
    }
  });
}

function pushVeHistory(designObj) {
  if (veHistoryIndex < veHistoryStack.length - 1) {
    veHistoryStack.splice(veHistoryIndex + 1);
  }
  veHistoryStack.push(JSON.parse(JSON.stringify(designObj)));
  veHistoryIndex = veHistoryStack.length - 1;
}

function veUndo() {
  if (veHistoryIndex > 0) {
    veHistoryIndex--;
    applyVeHistoryState();
    showToast('Undo applied');
    playClickSFX();
  }
}

function veRedo() {
  if (veHistoryIndex < veHistoryStack.length - 1) {
    veHistoryIndex++;
    applyVeHistoryState();
    showToast('Redo applied');
    playClickSFX();
  }
}

function applyVeHistoryState() {
  const d = getSiteData();
  d.design = JSON.parse(JSON.stringify(veHistoryStack[veHistoryIndex]));
  saveSiteData(d);
  loadVeInspectorProps();
  renderVeCanvas();
  refreshSiteUI();
}

function veResetToDefault() {
  if (confirm('Reset visual layout to baseline defaults?')) {
    const d = getSiteData();
    d.design = JSON.parse(JSON.stringify(DEFAULT_DESIGN_SCHEMA));
    saveSiteData(d);
    pushVeHistory(d.design);
    loadVeInspectorProps();
    renderVeCanvas();
    refreshSiteUI();
    showToast('Visual layout reset to defaults!');
    playClickSFX();
  }
}

/* ─── INIT ─── */
function initAdmin() {
  initPasswordGate();
  initAdminTabs();
  initAddProject();
  initSaveButton();
  initExport();
  initVisualEditor();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
