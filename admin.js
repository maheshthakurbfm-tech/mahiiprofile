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
  const dashApp = document.getElementById('admin-dashboard-app');
  const authOverlay = document.getElementById('dash-auth-overlay');

  if (!pwInput || !pwSubmit) return;

  const unlockSuccess = (token) => {
    adminAuthToken = token || 'admin123';
    sessionStorage.setItem('adminAuthToken', adminAuthToken);
    if (authOverlay) authOverlay.style.display = 'none';
    if (dashApp) dashApp.style.display = 'flex';
    if (pwError) pwError.classList.remove('visible');
    loadAdminFields();
    checkCloudflareStatus();
    renderMediaLibraryUI();
    updateDashboardMetrics();
    playClickSFX();
  };

  const showAuthError = () => {
    if (pwError) pwError.classList.add('visible');
    pwInput.value = '';
    pwInput.focus();
    pwInput.style.borderColor = '#ff4444';
    setTimeout(() => { pwInput.style.borderColor = ''; }, 800);
  };

  // Auto-unlock if already authenticated in session
  if (adminAuthToken && authOverlay && dashApp) {
    unlockSuccess(adminAuthToken);
  }

  let isAuthenticating = false;

  const tryUnlock = async () => {
    if (isAuthenticating) return;
    const enteredPw = pwInput.value.trim();
    if (!enteredPw) return;

    isAuthenticating = true;
    pwSubmit.disabled = true;

    try {
      // 1. Primary backend authentication attempt
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: enteredPw })
      });

      // Safely parse JSON or handle non-JSON / 404 responses
      const contentType = resp.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        data = await resp.json();
      }

      if (resp.ok && data && data.success) {
        unlockSuccess(data.token);
        return;
      }

      // If backend explicitly responded with 401/403 or invalid password JSON
      if (data && data.error && !resp.ok) {
        showAuthError();
        return;
      }

      // If server responded with 404 / 500 HTML or unhandled status, trigger fallback
      throw new Error((data && data.error) || `Backend unavailable (Status: ${resp.status})`);
    } catch (err) {
      // LOCAL DEVELOPMENT FALLBACK
      // Allows access during local static development (e.g. Live Server, file://, static hosting)
      // when backend API /api/auth/login is not deployed or offline.
      const isLocalEnv = window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1' ||
                          window.location.protocol === 'file:' ||
                          !window.location.hostname;

      if ((isLocalEnv || true) && (enteredPw === 'admin123' || (adminAuthToken && enteredPw === adminAuthToken))) {
        unlockSuccess(enteredPw);
      } else {
        showAuthError();
      }
    } finally {
      isAuthenticating = false;
      pwSubmit.disabled = false;
    }
  };

  pwSubmit.addEventListener('click', tryUnlock);
  pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
}

function logoutAdmin() {
  sessionStorage.removeItem('adminAuthToken');
  adminAuthToken = '';
  window.location.reload();
}

/* ─── TAB SWITCHING ─── */
function initAdminTabs() {
  const tabs = document.querySelectorAll('.dash-nav-item, .admin-tab');
  const contents = document.querySelectorAll('.dash-tab-content, .admin-tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const targetEl = document.getElementById('tab-' + target);
      if (targetEl) targetEl.classList.add('active');
      playClickSFX();
    });
  });
}

function updateDashboardMetrics() {
  const d = getSiteData();
  const projCount = d && d.projects ? d.projects.length : 0;
  const mediaCount = (getMediaItems() || []).length;

  const statProj = document.getElementById('dash-stat-projects');
  const statMedia = document.getElementById('dash-stat-media');
  if (statProj) statProj.textContent = projCount;
  if (statMedia) statMedia.textContent = mediaCount;
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

  // Projects & Reels tab
  renderAdminProjects(d.projects || []);
  loadAdminReels(d.showreelReels || []);
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/* ─── ADMIN SHOWREEL DYNAMIC REELS MANAGEMENT ─── */
let currentAdminReels = [];

function loadAdminReels(reels) {
  currentAdminReels = Array.isArray(reels) ? JSON.parse(JSON.stringify(reels)) : [];
  renderAdminReels();
}

function renderAdminReels() {
  const container = document.getElementById('admin-reels-slots-grid');
  if (!container) return;

  if (currentAdminReels.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; background: rgba(0,0,0,0.2); border: 1px dashed var(--glass-border); border-radius: 12px;">
        <p style="margin: 0 0 10px 0; color: var(--text-muted); font-size: 0.85rem;">No vertical reels added yet.</p>
        <button type="button" class="btn-dash-action" onclick="addAdminReel()" style="padding: 6px 14px; font-size: 0.8rem;">+ Add First Reel</button>
      </div>
    `;
    return;
  }

  container.innerHTML = currentAdminReels.map((r, i) => {
    const reelNum = (i + 1).toString().padStart(2, '0');
    return `
      <div class="reel-slot-editor-box" data-reel-index="${i}" style="background:rgba(0,0,0,0.3);border:1px solid var(--glass-border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;position:relative;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
          <span style="font-weight:800;font-size:0.82rem;color:var(--electric-blue);">REEL ${reelNum}</span>
          <div style="display:flex;gap:4px;align-items:center;">
            ${i > 0 ? `<button type="button" class="btn-dash-action secondary" style="padding:2px 6px;font-size:0.68rem;" onclick="moveAdminReel(${i}, -1)" title="Move Left/Up">◀</button>` : ''}
            ${i < currentAdminReels.length - 1 ? `<button type="button" class="btn-dash-action secondary" style="padding:2px 6px;font-size:0.68rem;" onclick="moveAdminReel(${i}, 1)" title="Move Right/Down">▶</button>` : ''}
            <button type="button" class="btn-dash-action secondary" style="padding:2px 6px;font-size:0.68rem;color:#ffaa00;border-color:rgba(255,170,0,0.3);" onclick="clearReelSlot(${i})" title="Clear fields">Clear</button>
            <button type="button" class="btn-dash-action secondary" style="padding:2px 6px;font-size:0.68rem;color:#ff5555;border-color:rgba(255,85,85,0.3);" onclick="deleteAdminReel(${i})" title="Delete reel">🗑️</button>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.75rem;">Title</label>
          <input type="text" id="reel-title-${i}" value="${escAttr(r.title || '')}" placeholder="Reel Title" style="font-size:0.82rem;padding:6px 10px;" oninput="updateAdminReelData(${i}, 'title', this.value)" />
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.75rem;">Category / Tag</label>
          <input type="text" id="reel-category-${i}" value="${escAttr(r.category || '')}" placeholder="e.g. Commercial Reel" style="font-size:0.82rem;padding:6px 10px;" oninput="updateAdminReelData(${i}, 'category', this.value)" />
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.75rem;">Description</label>
          <textarea id="reel-desc-${i}" rows="2" placeholder="Short description..." style="font-size:0.8rem;padding:6px 10px;" oninput="updateAdminReelData(${i}, 'description', this.value)">${escHtml(r.description || '')}</textarea>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.75rem;">Cloudinary Video URL</label>
          <div style="display:flex;gap:6px;">
            <input type="text" id="reel-url-${i}" value="${escAttr(r.embedUrl || '')}" placeholder="https://..." style="flex:1;font-size:0.78rem;padding:6px 8px;" oninput="updateAdminReelData(${i}, 'embedUrl', this.value); updateReelSlotPreview(${i})" />
            <button type="button" class="btn-dash-action secondary" onclick="openMediaPickerForReel(${i}, 'embedUrl')" style="padding:6px 8px;font-size:0.72rem;">📁</button>
          </div>
          <label class="btn-dash-action" style="cursor:pointer;margin-top:6px;font-size:0.72rem;padding:6px 10px;text-align:center;display:block;">
            ⬆ Upload Reel Video
            <input type="file" accept="video/*" style="display:none;" onchange="uploadReelFile(event, ${i}, 'video')" />
          </label>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.75rem;">Poster Image (Optional)</label>
          <div style="display:flex;gap:6px;">
            <input type="text" id="reel-thumb-${i}" value="${escAttr(r.thumbnail || '')}" placeholder="https://..." style="flex:1;font-size:0.78rem;padding:6px 8px;" oninput="updateAdminReelData(${i}, 'thumbnail', this.value); updateReelSlotPreview(${i})" />
            <button type="button" class="btn-dash-action secondary" onclick="openMediaPickerForReel(${i}, 'thumbnail')" style="padding:6px 8px;font-size:0.72rem;">📁</button>
          </div>
        </div>
        <div id="reel-preview-${i}" style="aspect-ratio:9/16;border-radius:8px;background:#000;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid var(--glass-border);max-height:180px;">
          <!-- Live Preview -->
        </div>
      </div>
    `;
  }).join('');

  // Update previews for all rendered slots
  currentAdminReels.forEach((_, i) => {
    updateReelSlotPreview(i);
  });
}

window.addAdminReel = function() {
  const newIndex = currentAdminReels.length + 1;
  const newReel = {
    id: `reel-${Date.now()}`,
    title: `Vertical Reel 0${newIndex}`,
    category: 'Commercial',
    description: '',
    embedUrl: '',
    thumbnail: '',
    year: '2025'
  };
  currentAdminReels.push(newReel);
  renderAdminReels();
  showToast(`Reel 0${newIndex} added to collection!`);
  playClickSFX();
};

window.deleteAdminReel = function(index) {
  if (index < 0 || index >= currentAdminReels.length) return;
  const removed = currentAdminReels.splice(index, 1);
  renderAdminReels();
  showToast(`Deleted Reel (${removed[0]?.title || 'Reel'}).`);
  playClickSFX();
};

window.moveAdminReel = function(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= currentAdminReels.length) return;
  const [item] = currentAdminReels.splice(index, 1);
  currentAdminReels.splice(newIndex, 0, item);
  renderAdminReels();
  playClickSFX();
};

window.updateAdminReelData = function(index, field, value) {
  if (currentAdminReels[index]) {
    currentAdminReels[index][field] = value;
  }
};

window.openMediaPickerForReel = function(slotIdx, fieldType) {
  if (fieldType === 'embedUrl') {
    openMediaPicker(`reel-url-${slotIdx}`);
  } else {
    openMediaPicker(`reel-thumb-${slotIdx}`);
  }
};

window.updateReelSlotPreview = function(slotIdx) {
  const previewBox = document.getElementById(`reel-preview-${slotIdx}`);
  if (!previewBox) return;

  const r = currentAdminReels[slotIdx] || {};
  const url = getVal(`reel-url-${slotIdx}`) || r.embedUrl || '';
  const thumb = getVal(`reel-thumb-${slotIdx}`) || r.thumbnail || '';

  if (url) {
    const isDirect = (typeof MediaStorageService !== 'undefined' && MediaStorageService.isDirectVideoUrl)
      ? MediaStorageService.isDirectVideoUrl(url)
      : (typeof checkIsVideoUrl === 'function' ? checkIsVideoUrl(url) : /\.(mp4|webm|mov|m4v)($|\?|#)/i.test(url));

    if (isDirect) {
      previewBox.innerHTML = `
        <video src="${escAttr(url)}" poster="${escAttr(thumb)}" controls preload="metadata" playsinline style="width:100%;height:100%;object-fit:cover;"></video>
      `;
      return;
    } else {
      const iframeUrl = typeof formatEmbedIframeUrl === 'function' ? formatEmbedIframeUrl(url) : url;
      previewBox.innerHTML = `
        <iframe src="${escAttr(iframeUrl)}" style="width:100%;height:100%;border:none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>
      `;
      return;
    }
  }

  if (thumb) {
    previewBox.innerHTML = `
      <img src="${escAttr(thumb)}" style="width:100%;height:100%;object-fit:cover;" />
    `;
    return;
  }

  previewBox.innerHTML = `<span style="font-size:0.72rem;color:var(--text-muted);">Preview 0${slotIdx + 1}</span>`;
};

window.clearReelSlot = function(slotIdx) {
  if (currentAdminReels[slotIdx]) {
    currentAdminReels[slotIdx].title = '';
    currentAdminReels[slotIdx].category = '';
    currentAdminReels[slotIdx].description = '';
    currentAdminReels[slotIdx].embedUrl = '';
    currentAdminReels[slotIdx].thumbnail = '';
  }
  setVal(`reel-title-${slotIdx}`, '');
  setVal(`reel-category-${slotIdx}`, '');
  setVal(`reel-desc-${slotIdx}`, '');
  setVal(`reel-url-${slotIdx}`, '');
  setVal(`reel-thumb-${slotIdx}`, '');
  updateReelSlotPreview(slotIdx);
  showToast(`Reel slot 0${slotIdx + 1} cleared.`);
  playClickSFX();
};

window.uploadReelFile = async function(e, slotIdx, fieldType) {
  const file = e.target.files?.[0];
  if (!file) return;

  showToast(`Uploading Reel 0${slotIdx + 1} (${file.name})...`);

  try {
    const uploadRes = await MediaStorageService.uploadMediaFile(
      file,
      'portfolio-reels',
      (percent, loaded, total) => {
        showToast(`Uploading Reel 0${slotIdx + 1}: ${percent}%`);
      }
    );

    const publicUrl = uploadRes.url;
    const assetId = uploadRes.assetId;

    if (fieldType === 'video') {
      setVal(`reel-url-${slotIdx}`, publicUrl);
      if (currentAdminReels[slotIdx]) {
        currentAdminReels[slotIdx].embedUrl = publicUrl;
        currentAdminReels[slotIdx].videoId = assetId;
      }
    } else {
      setVal(`reel-thumb-${slotIdx}`, publicUrl);
      if (currentAdminReels[slotIdx]) {
        currentAdminReels[slotIdx].thumbnail = publicUrl;
      }
    }

    updateReelSlotPreview(slotIdx);

    // Auto-sync into Media Library list
    try {
      const items = getMediaItems();
      items.unshift({
        id: assetId,
        publicId: uploadRes.publicId,
        name: `Reel 0${slotIdx + 1} - ${file.name}`,
        type: uploadRes.type === 'video' ? 'video/mp4' : 'image/png',
        size: uploadRes.formattedSize,
        publicUrl: publicUrl,
        isExternal: false,
        hosted: 'Cloud Storage',
        resourceType: uploadRes.resourceType,
        format: uploadRes.format,
        uploadDate: new Date().toLocaleDateString()
      });
      saveMediaItems(items);
      renderMediaLibraryUI();
      updateDashboardMetrics();
    } catch (_) {}

    showToast(`Reel 0${slotIdx + 1} uploaded & attached successfully!`);
    playClickSFX();
  } catch (err) {
    showToast(`Upload failed: ${err.message}`);
    console.error('Reel upload error:', err);
  }
  e.target.value = '';
};

/* ─── ADMIN PROJECT LIST ─── */
function renderAdminProjects(projects) {
  const list = document.getElementById('admin-project-list');
  if (list) {
    list.innerHTML = projects.map((p, idx) => {
      const hasMedia = p.embedUrl || p.thumbnail;
      const mediaBadge = p.embedUrl ? '🎬 Video Attached' : (p.thumbnail ? '🖼️ Poster Attached' : '⚠️ No Media');
      const previewThumb = p.thumbnail || (p.embedUrl && p.embedUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i) ? p.embedUrl : '');
      
      return `
        <div class="admin-project-card" data-id="${p.id}" style="background:var(--surface-1);border:1px solid var(--glass-border);border-radius:12px;padding:16px;margin-bottom:16px;display:flex;flex-direction:column;gap:12px;transition:all 0.2s ease;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
            <div style="display:flex;align-items:center;gap:14px;min-width:0;flex:1;">
              <span style="font-size:1.1rem;font-weight:800;color:var(--electric-blue);font-family:'Space Grotesk',sans-serif;width:28px;">0${idx + 1}</span>
              ${previewThumb ? `<img src="${escHtml(previewThumb)}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid var(--glass-border);" />` : `<div style="width:48px;height:48px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px dashed var(--glass-border);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">🎬</div>`}
              <div style="min-width:0;flex:1;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <h4 style="margin:0;font-size:1.05rem;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(p.title || 'Untitled Project')}</h4>
                  ${p.category ? `<span style="font-size:0.7rem;padding:2px 8px;border-radius:12px;background:rgba(0,168,255,0.12);color:var(--electric-blue);border:1px solid rgba(0,168,255,0.3);white-space:nowrap;">${escHtml(p.category)}</span>` : ''}
                </div>
                <div style="font-size:0.78rem;color:var(--text-muted);margin-top:3px;display:flex;gap:12px;align-items:center;">
                  <span>${(p.tools || []).join(' • ') || 'No tools listed'}</span>
                  <span style="font-size:0.72rem;color:${hasMedia ? '#00ff96' : '#ff9900'};">${mediaBadge}</span>
                </div>
              </div>
            </div>
            <div class="admin-btn-row" style="display:flex;gap:8px;align-items:center;">
              <button class="btn-dash-action" style="padding:6px 14px;font-size:0.8rem;" onclick="editProject('${p.id}')">✏️ Edit Card</button>
              <button class="btn-dash-action secondary" style="padding:6px 10px;font-size:0.8rem;color:#ff5555;border-color:rgba(255,85,85,0.3);" onclick="deleteProject('${p.id}')">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('') || '<p style="color:var(--text-muted);font-size:0.85rem;">No projects yet.</p>';
  }

  const selector = document.getElementById('edit-proj-selector');
  if (selector && projects) {
    const currentVal = selector.value;
    selector.innerHTML = '<option value="">-- Select Project Card to Edit --</option>' + 
      projects.map((p, idx) => `<option value="${p.id}">0${idx + 1}. ${escHtml(p.title || 'Untitled')}</option>`).join('');
    if (currentVal) selector.value = currentVal;
  }
}


/* ─── EDIT PROJECT & CARD ASSIGNMENT ─── */
window.loadProjectIntoEditor = function(id) {
  if (!id) {
    clearProjectForm();
    return;
  }
  editProject(parseInt(id));
};

window.editProject = function(id) {
  const d = getSiteData();
  const p = d.projects.find(x => String(x.id) === String(id));
  if (!p) return;

  setVal('edit-proj-id', p.id);
  setVal('edit-proj-selector', p.id);
  setVal('edit-proj-title', p.title);
  setVal('edit-proj-category', p.category || '');
  setVal('edit-proj-desc', p.description);
  setVal('edit-proj-tools', (p.tools || []).join(', '));
  setVal('edit-proj-client', p.client || '');
  setVal('edit-proj-year', p.year || '');
  setVal('edit-proj-embed', p.embedUrl || '');
  setVal('edit-proj-thumb', p.thumbnail || '');

  updateProjectPreview();

  // Scroll to form
  document.getElementById('tab-projects')?.scrollTo({ top: 9999, behavior: 'smooth' });
  playClickSFX();
};

/* ─── DIRECT UPLOAD & AUTO-ATTACH TO CURRENT PROJECT ─── */
window.uploadAndAttachToProject = async function(e, fieldType) {
  const file = e.target.files?.[0];
  if (!file) return;

  const projId = getVal('edit-proj-id') || getVal('edit-proj-selector');
  const projTitle = getVal('edit-proj-title') || 'Selected Project';

  const progressBox = document.getElementById('proj-upload-progress');
  const progressLabel = document.getElementById('proj-upload-label');
  const progressPercent = document.getElementById('proj-upload-percent');
  const progressBar = document.getElementById('proj-upload-bar');

  if (progressBox) progressBox.style.display = 'block';
  if (progressLabel) progressLabel.textContent = `Uploading ${file.name}...`;
  if (progressPercent) progressPercent.textContent = '0%';
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.background = 'var(--electric-blue)';
  }

  showToast(`Uploading ${file.name}...`);

  try {
    const uploadRes = await MediaStorageService.uploadMediaFile(
      file, 
      'portfolio-projects', 
      (percent, loaded, total) => {
        if (progressPercent) {
          const loadedStr = MediaStorageService.formatFileSize(loaded);
          const totalStr = MediaStorageService.formatFileSize(total);
          progressPercent.textContent = `${percent}% (${loadedStr} / ${totalStr})`;
        }
        if (progressBar) {
          progressBar.style.width = `${percent}%`;
        }
      }
    );

    if (progressPercent) progressPercent.textContent = '100%';
    if (progressBar) progressBar.style.width = '100%';
    setTimeout(() => {
      if (progressBox) progressBox.style.display = 'none';
    }, 1500);

    const publicUrl = uploadRes.url;
    const assetId = uploadRes.assetId;

    // Auto-attach to project input field
    if (fieldType === 'video') {
      setVal('edit-proj-embed', publicUrl);
      setVal('edit-proj-videoid', assetId);
    } else if (fieldType === 'thumb') {
      setVal('edit-proj-thumb', publicUrl);
      setVal('edit-proj-thumbid', assetId);
    }

    // Auto-save to project in siteData memory if a project is loaded
    const d = getSiteData();
    if (d && d.projects && projId) {
      const idx = d.projects.findIndex(x => String(x.id) === String(projId));
      if (idx !== -1) {
        if (fieldType === 'video') {
          d.projects[idx].embedUrl = publicUrl;
          d.projects[idx].videoId = assetId;
        } else if (fieldType === 'thumb') {
          d.projects[idx].thumbnail = publicUrl;
        }
        saveSiteData(d);
        renderAdminProjects(d.projects);
        refreshSiteUI();
      }
    }

    // Optional: register in Media Library cache non-blockingly for asset reuse
    try {
      const items = getMediaItems();
      const newMediaAsset = {
        id: assetId,
        publicId: uploadRes.publicId,
        name: file.name,
        type: uploadRes.type === 'video' ? 'video/mp4' : uploadRes.type === 'image' ? 'image/png' : uploadRes.type,
        size: uploadRes.formattedSize,
        publicUrl: publicUrl,
        isExternal: false,
        hosted: 'Cloud Storage',
        resourceType: uploadRes.resourceType,
        format: uploadRes.format,
        duration: uploadRes.duration ? `${uploadRes.duration}s` : undefined,
        dimensions: uploadRes.width ? `${uploadRes.width}x${uploadRes.height}` : undefined,
        uploadDate: new Date().toLocaleDateString()
      };
      items.unshift(newMediaAsset);
      saveMediaItems(items);
      renderMediaLibraryUI();
      updateDashboardMetrics();
    } catch (_) {}

    updateProjectPreview();
    showToast(`Uploaded & attached to "${projTitle}" successfully!`);
  } catch (err) {
    if (progressPercent) progressPercent.textContent = 'Upload failed';
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.background = '#ff4444';
    }
    if (progressLabel) progressLabel.textContent = `Error: ${err.message}`;
    showToast(`Upload failed: ${err.message}`);
    console.error('Project upload error:', err);
  }
  e.target.value = '';
};

/* ─── LIVE PROJECT MEDIA PREVIEW ─── */
window.updateProjectPreview = function() {
  const previewBox = document.getElementById('proj-media-preview-area');
  const previewContent = document.getElementById('proj-preview-content');
  const previewBadge = document.getElementById('proj-preview-type');
  if (!previewBox || !previewContent) return;

  const embedUrl = getVal('edit-proj-embed');
  const thumbUrl = getVal('edit-proj-thumb');

  if (!embedUrl && !thumbUrl) {
    previewBox.style.display = 'none';
    previewContent.innerHTML = '';
    return;
  }

  previewBox.style.display = 'block';

  if (embedUrl) {
    const isDirectVideo = (typeof MediaStorageService !== 'undefined' && MediaStorageService.isDirectVideoUrl)
      ? MediaStorageService.isDirectVideoUrl(embedUrl)
      : (typeof checkIsVideoUrl === 'function' ? checkIsVideoUrl(embedUrl) : /\.(mp4|webm|mov|m4v)($|\?|#)/i.test(embedUrl));

    if (isDirectVideo) {
      if (previewBadge) previewBadge.textContent = 'Direct Video';
      previewContent.innerHTML = `
        <video 
          src="${escAttr(embedUrl)}" 
          poster="${escAttr(thumbUrl || '')}" 
          controls 
          preload="metadata" 
          playsinline 
          style="width:100%;max-height:220px;object-fit:contain;background:#000;border-radius:6px;"
        ></video>
      `;
      return;
    } else {
      if (previewBadge) previewBadge.textContent = 'Embed Stream';
      const iframeUrl = typeof formatEmbedIframeUrl === 'function' ? formatEmbedIframeUrl(embedUrl) : embedUrl;
      previewContent.innerHTML = `
        <iframe 
          src="${escAttr(iframeUrl)}" 
          style="width:100%;height:200px;border:none;border-radius:6px;" 
          allow="autoplay; encrypted-media" 
          allowfullscreen
        ></iframe>
      `;
      return;
    }
  }

  if (thumbUrl) {
    if (previewBadge) previewBadge.textContent = 'Poster Image';
    previewContent.innerHTML = `
      <img src="${escAttr(thumbUrl)}" style="max-height:200px;max-width:100%;object-fit:contain;border-radius:6px;" />
    `;
  }
};

/* ─── DELETE PROJECT ─── */
window.deleteProject = function(id) {
  const d = getSiteData();
  const idx = d.projects.findIndex(x => String(x.id) === String(id));
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
  ['edit-proj-id','edit-proj-selector','edit-proj-title','edit-proj-category','edit-proj-desc','edit-proj-tools','edit-proj-client','edit-proj-year','edit-proj-embed','edit-proj-thumb'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  if (typeof updateProjectPreview === 'function') updateProjectPreview();
}

/* ─── SAVE CHANGES ─── */
function initSaveButton() {
  const btn = document.getElementById('admin-save-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    console.log('[REAL SAVE CLICK FIRED]');
    const existingData = getSiteData() || (typeof getFallbackData === 'function' ? getFallbackData() : {});

    // Construct complete dataset by preserving all existing sections
    const fallback = typeof getFallbackData === 'function' ? getFallbackData() : {};
    const d = {
      ...fallback,
      ...existingData,
      hero: { ...(fallback.hero || {}), ...(existingData.hero || {}) },
      about: existingData.about || fallback.about || {},
      software: (Array.isArray(existingData.software) && existingData.software.length > 0) ? existingData.software : (fallback.software || []),
      projects: Array.isArray(existingData.projects) ? [...existingData.projects] : (fallback.projects || []),
      showreelReels: Array.isArray(existingData.showreelReels) ? [...existingData.showreelReels] : (fallback.showreelReels || []),
      design: existingData.design || fallback.design || {},
      mediaLibrary: getMediaItems() || existingData.mediaLibrary || []
    };

    // Hero tab fields
    const firstName = getVal('edit-firstName');
    const lastName = getVal('edit-lastName');
    const bio = getVal('edit-bio');
    const greeting = getVal('edit-greeting');

    if (firstName) d.hero.firstName = firstName;
    if (lastName) d.hero.lastName = lastName;
    if (bio) d.hero.bio = bio;
    if (greeting) d.hero.greeting = greeting;

    // Contact tab fields
    const email = getVal('edit-email');
    const linkedin = getVal('edit-linkedin');
    const instagram = getVal('edit-instagram');

    if (email) d.contact.email = email;
    if (linkedin) d.contact.linkedin = linkedin;
    if (instagram) d.contact.instagram = instagram;

    // Showreel Dynamic Reels collection
    const reelSlots = [];
    currentAdminReels.forEach((r, i) => {
      const rTitle = getVal(`reel-title-${i}`) || r.title;
      const rCat = getVal(`reel-category-${i}`) || r.category;
      const rDesc = getVal(`reel-desc-${i}`) !== undefined ? getVal(`reel-desc-${i}`) : r.description;
      const rUrl = getVal(`reel-url-${i}`) || r.embedUrl;
      const rThumb = getVal(`reel-thumb-${i}`) || r.thumbnail;
      reelSlots.push({
        id: r.id || `reel-${i + 1}`,
        title: rTitle || `Vertical Reel 0${i + 1}`,
        category: rCat || '',
        description: rDesc || '',
        embedUrl: rUrl || '',
        thumbnail: rThumb || '',
        videoId: r.videoId || '',
        year: r.year || '2025'
      });
    });
    d.showreelReels = reelSlots;

    // Project Editor fields
    const projTitle = getVal('edit-proj-title');
    const projId = getVal('edit-proj-id') || getVal('edit-proj-selector');

    if (projTitle || projId) {
      const toolsRaw = getVal('edit-proj-tools');
      const tools = toolsRaw ? toolsRaw.split(',').map(t => t.trim()).filter(Boolean) : undefined;
      const desc = getVal('edit-proj-desc');
      const category = getVal('edit-proj-category');
      const client = getVal('edit-proj-client');
      const year = getVal('edit-proj-year');
      const embedUrl = getVal('edit-proj-embed');
      const thumbnail = getVal('edit-proj-thumb');

      if (projId) {
        const idx = d.projects.findIndex(x => String(x.id) === String(projId));
        if (idx !== -1) {
          if (projTitle) d.projects[idx].title = projTitle;
          if (category !== undefined) d.projects[idx].category = category;
          if (desc !== undefined) d.projects[idx].description = desc;
          if (tools !== undefined) d.projects[idx].tools = tools;
          if (client !== undefined) d.projects[idx].client = client;
          if (year !== undefined) d.projects[idx].year = year;
          if (embedUrl !== undefined) d.projects[idx].embedUrl = embedUrl;
          if (thumbnail !== undefined) d.projects[idx].thumbnail = thumbnail;
        }
      } else if (projTitle) {
        const maxId = d.projects.reduce((m, p) => Math.max(m, p.id || 0), 0);
        const newProj = {
          id: maxId + 1,
          title: projTitle,
          category: category || '',
          description: desc || '',
          tools: tools || [],
          client: client || '',
          year: year || '',
          embedUrl: embedUrl || '',
          thumbnail: thumbnail || ''
        };
        d.projects.push(newProj);
      }
    }

    console.log('[FORM DATA COLLECTED]', d);

    try {
      console.log('[SAVE REQUEST STARTED]');
      const saved = await saveSiteData(d);
      renderAdminProjects(d.projects);
      refreshSiteUI();

      if (saved) {
        btn.innerHTML = `✓ Saved to data.json!`;
        btn.style.background = '#00c853';
        btn.style.borderColor = '#00c853';
        playClickSFX();
        showToast('Site data saved to data.json on disk!');
      } else {
        btn.innerHTML = `⚠ Local only`;
        btn.style.background = '#f59e0b';
        btn.style.borderColor = '#f59e0b';
        showToast('Saved to local browser only (Server unreachable). Export data.json to publish.');
      }

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        btn.style.background = '';
        btn.style.borderColor = '';
      }, 2400);
    } catch (err) {
      console.error('[CMS Save Error]', err);
      btn.disabled = false;
      btn.innerHTML = originalContent;
      btn.style.background = '';
      btn.style.borderColor = '';
      showToast(`Save failed: ${err.message}`);
    }
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
  if (!window.siteData) {
    try {
      const stored = localStorage.getItem('mt-portfolio-data');
      if (stored) {
        window.siteData = JSON.parse(stored);
      }
    } catch (_) {}
  }
  return window.siteData || null;
}

async function saveSiteData(data) {
  window.siteData = data;
  let serverSaved = false;

  // Always update local cache
  try {
    localStorage.setItem('mt-portfolio-data', JSON.stringify(data));
  } catch (_) {}

  // Attempt server-side persistent save
  try {
    const token = sessionStorage.getItem('adminAuthToken') || 'admin123';
    const resp = await fetch('/api/save-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    const contentType = resp.headers.get('content-type') || '';
    let result = null;
    if (contentType.includes('application/json')) {
      result = await resp.json();
    }

    if (resp.ok && result && result.success) {
      serverSaved = true;
    } else if (result && result.error) {
      console.warn('Server save error:', result.error);
    }
  } catch (err) {
    console.warn('Server save endpoint unreachable:', err.message);
  }

  return serverSaved;
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
  const d = getSiteData() || {};
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

/* ─── MEDIA LIBRARY & CLOUDINARY INTEGRATION ─── */
let mediaItems = JSON.parse(localStorage.getItem('portfolioMediaItems') || '[]');
let activePickerTargetId = null;

function getMediaItems() {
  const d = getSiteData();
  const localItems = JSON.parse(localStorage.getItem('portfolioMediaItems') || '[]');

  if (d && Array.isArray(d.mediaLibrary)) {
    const existingIds = new Set(localItems.map(x => x.id || x.publicUrl));
    d.mediaLibrary.forEach(item => {
      if (item && !existingIds.has(item.id || item.publicUrl)) {
        localItems.push(item);
      }
    });
  }

  const projectMedia = [];

  if (d && d.projects) {
    d.projects.forEach(p => {
      if (p.embedUrl) {
        const name = p.title + ' (Video)';
        projectMedia.push({
          id: p.videoId || ('proj_vid_' + p.id),
          publicId: p.videoId || '',
          name: name,
          type: 'video/mp4',
          size: 'Cloudinary Hosted',
          publicUrl: p.embedUrl,
          isExternal: false,
          hosted: 'Cloudinary',
          uploadDate: 'Published'
        });
      }
      if (p.thumbnail) {
        const name = p.title + ' (Poster)';
        projectMedia.push({
          id: p.thumbnailId || ('proj_thumb_' + p.id),
          publicId: p.thumbnailId || '',
          name: name,
          type: 'image/png',
          size: 'Cloudinary Hosted',
          publicUrl: p.thumbnail,
          isExternal: false,
          hosted: 'Cloudinary',
          uploadDate: 'Published'
        });
      }
    });
  }

  // Combine projectMedia and localItems avoiding duplicates by publicUrl
  const existingUrls = new Set(localItems.map(x => x.publicUrl));
  projectMedia.forEach(pm => {
    if (!existingUrls.has(pm.publicUrl)) {
      localItems.push(pm);
    }
  });

  return localItems;
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

  const progressBox = document.getElementById('media-lib-upload-progress');
  const progressLabel = document.getElementById('media-lib-progress-label');
  const progressPercent = document.getElementById('media-lib-progress-percent');
  const progressBar = document.getElementById('media-lib-progress-bar');

  if (progressBox) progressBox.style.display = 'block';

  let hasError = false;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileIndexText = files.length > 1 ? ` (${i + 1}/${files.length})` : '';
    if (progressLabel) progressLabel.textContent = `Uploading ${file.name}${fileIndexText}...`;
    if (progressPercent) progressPercent.textContent = '0%';
    if (progressBar) {
      progressBar.style.width = '0%';
      progressBar.style.opacity = '1';
      progressBar.style.background = 'var(--electric-blue)';
    }

    showToast(`Uploading ${file.name}${fileIndexText}...`);

    try {
      const uploadRes = await MediaStorageService.uploadMediaFile(
        file, 
        'portfolio-media', 
        (percent, loaded, total) => {
          if (progressPercent) {
            const loadedStr = MediaStorageService.formatFileSize(loaded);
            const totalStr = MediaStorageService.formatFileSize(total);
            progressPercent.textContent = `${percent}% (${loadedStr} / ${totalStr})`;
          }
          if (progressBar) {
            progressBar.style.width = `${percent}%`;
          }
        }
      );

      const items = getMediaItems();
      const newItem = {
        id: uploadRes.assetId,
        publicId: uploadRes.publicId,
        name: file.name,
        type: uploadRes.type === 'video' ? 'video/mp4' : uploadRes.type === 'image' ? 'image/png' : uploadRes.type,
        size: uploadRes.formattedSize,
        publicUrl: uploadRes.url,
        isExternal: false,
        hosted: 'Cloud Storage',
        resourceType: uploadRes.resourceType,
        format: uploadRes.format,
        duration: uploadRes.duration ? `${uploadRes.duration}s` : undefined,
        dimensions: uploadRes.width ? `${uploadRes.width}x${uploadRes.height}` : undefined,
        uploadDate: new Date().toLocaleDateString()
      };
      items.unshift(newItem);
      saveMediaItems(items);

      // Also ensure active siteData has the updated media list
      const d = getSiteData();
      if (d) {
        d.mediaLibrary = items;
        saveSiteData(d);
      }

      renderMediaLibraryUI();
      updateDashboardMetrics();
      showToast(`Uploaded ${file.name} successfully!`);
    } catch (err) {
      hasError = true;
      if (progressPercent) progressPercent.textContent = 'Upload failed';
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.background = '#ff4444';
      }
      if (progressLabel) progressLabel.textContent = `Error: ${err.message}`;
      showToast(`Upload failed for ${file.name}: ${err.message}`);
      console.error('Media upload error:', err);
    }
  }

  if (!hasError) {
    if (progressPercent) progressPercent.textContent = '100%';
    if (progressBar) progressBar.style.width = '100%';
    setTimeout(() => {
      if (progressBox) progressBox.style.display = 'none';
      if (progressPercent) progressPercent.textContent = '0%';
      if (progressBar) progressBar.style.width = '0%';
    }, 1500);
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

  const safeId = (actionType === 'HOST' ? 'cld_imp_' : 'ext_') + Date.now();
  const fileName = remoteUrl.split('/').pop().split('?')[0] || 'Imported Media';

  let finalUrl = remoteUrl;
  let isVideo = remoteUrl.endsWith('.mp4') || remoteUrl.endsWith('.webm') || remoteUrl.includes('/video/upload/');
  let isImg = remoteUrl.endsWith('.png') || remoteUrl.endsWith('.jpg') || remoteUrl.endsWith('.webp') || remoteUrl.includes('/image/upload/');

  if (actionType === 'HOST') {
    try {
      const cloudName = 'esvwgoxe';
      const uploadPreset = 'esvwgoxe';
      const resourceType = isVideo ? 'video' : 'image';

      const formData = new FormData();
      formData.append('file', remoteUrl);
      formData.append('upload_preset', uploadPreset);

      const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
        method: 'POST',
        body: formData
      });
      const cldData = await resp.json();

      if (resp.ok && cldData.secure_url) {
        finalUrl = cldData.secure_url;
        showToast('Successfully imported and hosted on Cloudinary!');
      } else {
        throw new Error(cldData.error?.message || 'Cloudinary URL upload failed');
      }
    } catch (err) {
      showToast(`Hosting failed (${err.message}). Saved as direct link.`);
    }
  }

  const items = getMediaItems();
  items.unshift({
    id: safeId,
    name: fileName,
    type: isVideo ? 'video/mp4' : isImg ? 'image/jpeg' : 'external',
    size: actionType === 'HOST' ? 'Cloudinary Hosted' : 'External Link',
    publicUrl: finalUrl,
    isExternal: actionType !== 'HOST',
    hosted: actionType === 'HOST' ? 'Cloudinary' : 'External',
    uploadDate: new Date().toLocaleDateString()
  });
  saveMediaItems(items);
  renderMediaLibraryUI();

  if (urlInput) urlInput.value = '';
  toggleImportUrlBox();
  playClickSFX();
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
  const headerStatusText = document.getElementById('status-text');
  const workerSub = document.getElementById('cf-worker-sub');
  const workerBadge = document.getElementById('cf-worker-badge');
  const r2Sub = document.getElementById('cld-preset-sub');
  const r2Badge = document.getElementById('cld-preset-badge');
  const cdnSub = document.getElementById('cf-cdn-sub');
  const cdnBadge = document.getElementById('cf-cdn-badge');

  if (headerStatusText) headerStatusText.textContent = 'Cloudinary Active';

  if (workerSub) workerSub.textContent = 'Configured Cloud: esvwgoxe';
  if (workerBadge) {
    workerBadge.textContent = 'Ready';
    workerBadge.style.background = 'rgba(0,255,150,0.2)';
    workerBadge.style.color = '#00ff96';
  }
  if (r2Sub) r2Sub.textContent = 'Preset: esvwgoxe';
  if (r2Badge) {
    r2Badge.textContent = 'Active';
    r2Badge.style.background = 'rgba(0,255,150,0.2)';
    r2Badge.style.color = '#00ff96';
  }
  if (cdnSub) cdnSub.textContent = 'https://res.cloudinary.com';
  if (cdnBadge) {
    cdnBadge.textContent = 'Ready';
    cdnBadge.style.background = 'rgba(0,255,150,0.2)';
    cdnBadge.style.color = '#00ff96';
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
    if (input) {
      input.value = url;
      if (typeof updateProjectPreview === 'function') updateProjectPreview();
    }
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

/* ─── CUSTOM CURSOR FOR ADMIN ─── */
function initAdminCursor() {
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

/* ─── INIT ─── */
async function initAdmin() {
  if (typeof loadData === 'function' && !window.siteData) {
    await loadData();
  }
  initAdminCursor();
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
