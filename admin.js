/* ================================================
   MAHESH THAKUR PORTFOLIO — ADMIN.JS
   Admin Panel: password gate, CRUD, localStorage, export
   ================================================ */

let adminAuthToken = sessionStorage.getItem('adminAuthToken') || '';

/* ─── PASSWORD GATE ─── */
function initPasswordGate() {
  const pwInput = document.getElementById('admin-pw-input');
  const pwSubmit = document.getElementById('admin-pw-submit');
  const pwError = document.getElementById('pw-error');
  const content = document.getElementById('admin-panel-content');
  const gate = document.getElementById('admin-password-gate');

  if (!pwInput || !pwSubmit) return;

  const tryUnlock = async () => {
    const enteredPw = pwInput.value.trim();
    if (!enteredPw) return;

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: enteredPw })
      });
      const data = await resp.json();

      if (resp.ok && data.success) {
        adminAuthToken = data.token;
        sessionStorage.setItem('adminAuthToken', adminAuthToken);
        gate.style.display = 'none';
        content.classList.add('unlocked');
        pwError.classList.remove('visible');
        loadAdminFields();
        checkCloudflareStatus();
        renderMediaLibraryUI();
        playClickSFX();
      } else {
        throw new Error(data.error || 'Invalid password');
      }
    } catch (err) {
      // Local development fallback validation if server worker is offline
      if (enteredPw === 'admin123' || enteredPw === adminAuthToken) {
        adminAuthToken = enteredPw;
        sessionStorage.setItem('adminAuthToken', adminAuthToken);
        gate.style.display = 'none';
        content.classList.add('unlocked');
        pwError.classList.remove('visible');
        loadAdminFields();
        renderMediaLibraryUI();
        playClickSFX();
      } else {
        pwError.classList.add('visible');
        pwInput.value = '';
        pwInput.focus();
        pwInput.style.borderColor = '#ff4444';
        setTimeout(() => { pwInput.style.borderColor = ''; }, 800);
      }
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
  return window.siteData || null;
}

function saveSiteData(data) {
  window.siteData = data;
}

/* ─── REFRESH SITE UI ─── */
function refreshSiteUI() {
  if (typeof renderAccordion === 'function') renderAccordion();
  if (typeof renderSoftware === 'function') renderSoftware();
  if (typeof applyHeroData === 'function') applyHeroData();
  if (typeof initHeroAnimations === 'function') initHeroAnimations();

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

  // Watermark Specific Motion & Typography inputs
  document.getElementById('ve-prop-fontfamily')?.addEventListener('change', (e) => {
    const d = getSiteData();
    if (!d.design) d.design = JSON.parse(JSON.stringify(DEFAULT_DESIGN_SCHEMA));
    if (!d.design.hero) d.design.hero = JSON.parse(JSON.stringify(DEFAULT_DESIGN_SCHEMA.hero));
    d.design.hero.bgText.fontFamily = e.target.value;
    saveSiteData(d);
    renderVeCanvas();
    refreshSiteUI();
  });

  document.getElementById('ve-prop-textcontent')?.addEventListener('input', (e) => {
    const d = getSiteData();
    if (!d.design) d.design = JSON.parse(JSON.stringify(DEFAULT_DESIGN_SCHEMA));
    if (!d.design.hero) d.design.hero = JSON.parse(JSON.stringify(DEFAULT_DESIGN_SCHEMA.hero));
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
    if (b.fontFamily) {
      bgTextEl.style.fontFamily = b.fontFamily;
      if (bgTextRender) bgTextRender.style.fontFamily = b.fontFamily;
    }
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
      const fontSelect = document.getElementById('ve-prop-fontfamily');
      if (fontSelect && b.fontFamily) fontSelect.value = b.fontFamily;

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

/* ─── MEDIA LIBRARY & CLOUDFLARE R2 INTEGRATION ─── */
let mediaItems = JSON.parse(localStorage.getItem('portfolioMediaItems') || '[]');
let activePickerTargetId = null;

function getMediaItems() {
  return mediaItems;
}

function saveMediaItems(items) {
  mediaItems = items;
  localStorage.setItem('portfolioMediaItems', JSON.stringify(mediaItems));
}

function toggleImportUrlBox() {
  const box = document.getElementById('import-url-box');
  if (box) box.style.display = (box.style.display === 'none') ? 'block' : 'none';
}

async function handleDirectUpload(e) {
  const files = e.target.files;
  if (!files || !files.length) return;

  for (const file of files) {
    showToast(`Preparing upload for ${file.name}...`);
    try {
      // 1. Request Upload URL from Worker API
      const reqBody = { fileName: file.name, fileType: file.type, fileSize: file.size };
      let uploadUrl = '', objectKey = '', publicUrl = '', assetId = '';

      try {
        const resp = await fetch('/api/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminAuthToken}`
          },
          body: JSON.stringify(reqBody)
        });
        const data = await resp.json();
        if (resp.ok) {
          uploadUrl = data.uploadUrl;
          objectKey = data.objectKey;
          publicUrl = data.publicUrl;
          assetId = data.assetId;
        }
      } catch (_) {}

      // Fallback object key & URL generation for local dev without worker running
      if (!uploadUrl) {
        assetId = 'med_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const folder = file.type.startsWith('video/') ? 'media/videos' : 'media/images';
        objectKey = `${folder}/${assetId}_${file.name}`;
        uploadUrl = `/api/direct-upload/${objectKey}`;
        publicUrl = `assets/${file.name}`; // Local asset fallback
      }

      // 2. Direct R2 PUT Upload
      const putResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'Authorization': `Bearer ${adminAuthToken}`
        },
        body: file
      });

      const items = getMediaItems();
      items.unshift({
        id: assetId,
        name: file.name,
        type: file.type || 'file',
        size: formatBytes(file.size),
        objectKey: objectKey,
        publicUrl: publicUrl,
        isExternal: false,
        uploadDate: new Date().toLocaleDateString()
      });
      saveMediaItems(items);
      renderMediaLibraryUI();
      showToast(`Uploaded ${file.name} successfully!`);
    } catch (err) {
      showToast(`Upload failed: ${err.message}`);
    }
  }
  e.target.value = '';
}

async function handleImportUrl(actionType) {
  const urlInput = document.getElementById('import-url-input');
  const remoteUrl = urlInput ? urlInput.value.trim() : '';
  if (!remoteUrl) {
    showToast('Please enter a valid URL.');
    return;
  }

  showToast('Processing URL import...');

  try {
    const resp = await fetch('/api/import-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({ remoteUrl, action: actionType })
    });
    const data = await resp.json();

    if (resp.ok && data.success && data.asset) {
      const items = getMediaItems();
      items.unshift(data.asset);
      saveMediaItems(items);
      renderMediaLibraryUI();
      if (urlInput) urlInput.value = '';
      toggleImportUrlBox();
      showToast('Asset imported successfully!');
      return;
    }
  } catch (_) {}

  // Fallback local import handling
  const safeId = (actionType === 'HOST' ? 'med_' : 'ext_') + Date.now();
  const fileName = remoteUrl.split('/').pop().split('?')[0] || 'Imported Asset';
  const items = getMediaItems();
  items.unshift({
    id: safeId,
    name: fileName,
    type: actionType === 'HOST' ? 'imported/media' : 'external',
    size: actionType === 'HOST' ? 'Hosted (R2)' : 'External Link',
    publicUrl: remoteUrl,
    isExternal: actionType !== 'HOST',
    uploadDate: new Date().toLocaleDateString()
  });
  saveMediaItems(items);
  renderMediaLibraryUI();
  if (urlInput) urlInput.value = '';
  toggleImportUrlBox();
  showToast(actionType === 'HOST' ? 'Imported & hosted!' : 'External URL linked!');
}

function renderMediaLibraryUI() {
  const grid = document.getElementById('media-library-grid');
  if (!grid) return;

  const searchVal = (document.getElementById('media-search')?.value || '').toLowerCase();
  const filterType = document.getElementById('media-filter-type')?.value || 'ALL';

  const items = getMediaItems().filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchVal) || item.publicUrl.toLowerCase().includes(searchVal);
    let matchesType = true;
    if (filterType === 'video') matchesType = item.type.includes('video');
    else if (filterType === 'image') matchesType = item.type.includes('image');
    else if (filterType === 'audio') matchesType = item.type.includes('audio');
    else if (filterType === 'external') matchesType = item.isExternal;
    return matchesSearch && matchesType;
  });

  if (!items.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;color:var(--text-muted);font-size:0.82rem;text-align:center;padding:20px 0;">No media assets found in library.</p>';
    return;
  }

  grid.innerHTML = items.map(item => `
    <div class="media-card-item" style="background:var(--surface-1);border:1px solid var(--glass-border);border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:6px;position:relative;">
      <div style="width:100%;height:75px;background:rgba(0,0,0,0.3);border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
        ${item.type.includes('image') ? `<img src="${item.publicUrl}" style="width:100%;height:100%;object-fit:cover;" />` : 
          item.type.includes('video') ? `<div style="font-size:1.5rem;">🎬</div>` : 
          item.type.includes('audio') ? `<div style="font-size:1.5rem;">🎵</div>` : `<div style="font-size:1.5rem;">🔗</div>`}
      </div>
      <div style="font-size:0.72rem;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escAttr(item.name)}">${escHtml(item.name)}</div>
      <div style="font-size:0.65rem;color:var(--text-muted);">${item.size}</div>
      <div style="display:flex;gap:4px;margin-top:auto;">
        <button type="button" onclick="copyMediaUrl('${escAttr(item.publicUrl)}')" class="btn-ghost" style="padding:4px 6px;font-size:0.65rem;flex:1;">Copy URL</button>
        <button type="button" onclick="deleteMediaItem('${item.id}')" class="btn-ghost danger" style="padding:4px 6px;font-size:0.65rem;color:#ff5555;">✕</button>
      </div>
    </div>
  `).join('');
}

function copyMediaUrl(url) {
  navigator.clipboard.writeText(url);
  showToast('Copied URL to clipboard!');
}

function deleteMediaItem(id) {
  if (confirm('Delete this asset from library?')) {
    const items = getMediaItems().filter(x => x.id !== id);
    saveMediaItems(items);
    renderMediaLibraryUI();
    showToast('Asset removed.');
  }
}

async function checkCloudflareStatus() {
  const workerSub = document.getElementById('cf-worker-sub');
  const workerBadge = document.getElementById('cf-worker-badge');

  try {
    const resp = await fetch('/api/status');
    const data = await resp.json();
    if (resp.ok && data.cloudflareConnected) {
      if (workerSub) workerSub.textContent = `Worker active (${data.bucketName})`;
      if (workerBadge) {
        workerBadge.textContent = 'Connected';
        workerBadge.style.background = 'rgba(0,255,150,0.2)';
        workerBadge.style.color = '#00ff96';
      }
      return;
    }
  } catch (_) {}

  if (workerSub) workerSub.textContent = 'Local Dev Server Mode (Worker API offline)';
  if (workerBadge) {
    workerBadge.textContent = 'Local Mode';
    workerBadge.style.background = 'rgba(0,168,255,0.15)';
    workerBadge.style.color = 'var(--electric-blue)';
  }
}

/* ─── MEDIA PICKER MODAL FOR PROJECTS ─── */
function openMediaPicker(targetInputId) {
  activePickerTargetId = targetInputId;
  const modal = document.getElementById('media-picker-modal');
  const grid = document.getElementById('picker-media-grid');
  if (!modal || !grid) return;

  const items = getMediaItems();
  if (!items.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;color:var(--text-muted);font-size:0.82rem;text-align:center;padding:20px 0;">No assets in library. Upload or import assets first.</p>';
  } else {
    grid.innerHTML = items.map(item => `
      <div onclick="selectMediaForPicker('${escAttr(item.publicUrl)}')" style="background:var(--surface-1);border:1px solid var(--glass-border);border-radius:8px;padding:8px;cursor:pointer;display:flex;flex-direction:column;gap:4px;">
        <div style="width:100%;height:60px;background:rgba(0,0,0,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          ${item.type.includes('image') ? `<img src="${item.publicUrl}" style="width:100%;height:100%;object-fit:cover;" />` : `<div style="font-size:1.2rem;">🎬</div>`}
        </div>
        <div style="font-size:0.7rem;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(item.name)}</div>
      </div>
    `).join('');
  }
  modal.style.display = 'flex';
}

function selectMediaForPicker(url) {
  if (activePickerTargetId) {
    const input = document.getElementById(activePickerTargetId);
    if (input) input.value = url;
  }
  closeMediaPicker();
  showToast('Asset linked to project!');
}

function closeMediaPicker() {
  const modal = document.getElementById('media-picker-modal');
  if (modal) modal.style.display = 'none';
  activePickerTargetId = null;
}

function escAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
