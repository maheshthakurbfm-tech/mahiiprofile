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

/* ─── INIT ─── */
function initAdmin() {
  initPasswordGate();
  initAdminTabs();
  initAddProject();
  initSaveButton();
  initExport();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
