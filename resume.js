"use strict";

const RESUME_DEFAULTS = {
  headline: "Video Editor | Motion Graphics Designer | Colorist",
  location: "Durg, Chhattisgarh, India",
  summary: "Video Editor from India with 2.5+ years of experience across video editing, motion graphics, color grading, and sound design. Focused on clean work, strong pacing, visual storytelling, retention-focused editing, and professional post-production for commercial, brand, YouTube, short-form, and cinematic content.",
  links: {
    portfolio: "/"
  },
  expertiseGroups: [
    {
      title: "Editing & Story",
      items: ["Video Editing", "Commercial & Brand Content", "YouTube / Long-Form Editing", "Short-Form / Reels", "Visual Storytelling"]
    },
    {
      title: "Post-Production",
      items: ["Motion Graphics", "Color Grading", "Sound Design", "Post-Production"]
    }
  ],
  experience: [
    {
      company: "Siyaram Developers",
      role: "Creative / Video Editing Experience",
      location: "India",
      points: [
        "Worked on video and visual content with attention to pacing, clarity, color treatment, and audio polish.",
        "Supported developer and real-estate-oriented creative work through editing, motion graphics, and presentation-ready post-production.",
        "Used professional post-production workflows across editing, motion, color, and sound."
      ]
    }
  ],
  selectedProjects: [
    {
      title: "Commercial & Brand Ads",
      category: "Commercial / Brand",
      description: "Retention-focused commercial and branded video editing combining story structure, pacing, motion graphics, color treatment, and sound design for polished promotional content.",
      tools: ["Premiere Pro", "After Effects", "DaVinci Resolve"],
      portfolioAnchor: "./#projects"
    },
    {
      title: "Motion Graphics & MOGRT Packs",
      category: "Motion Graphics",
      description: "Kinetic typography, animated lower thirds, logo reveals, and reusable Premiere-ready motion templates built around clear hierarchy and edit-friendly timing.",
      tools: ["After Effects", "Premiere Pro", "Illustrator"],
      portfolioAnchor: "./#projects"
    },
    {
      title: "YouTube & Long-Form Edits",
      category: "Long-Form",
      description: "Long-form edits structured around clean pacing, B-roll rhythm, narrative continuity, audio cleanup, and watchable visual storytelling.",
      tools: ["Premiere Pro", "After Effects", "Audition"],
      portfolioAnchor: "./#projects"
    },
    {
      title: "Reels & Short-Form Content",
      category: "Short-Form",
      description: "High-energy vertical edits for short-form platforms with fast hooks, beat-synced cuts, titles, and compact visual storytelling.",
      tools: ["Premiere Pro", "After Effects", "CapCut"],
      portfolioAnchor: "./#projects"
    },
    {
      title: "Cinematic Short Film / Music Video",
      category: "Cinematic",
      description: "Cinematic editing with color-graded footage, atmospheric sound, foley-style polish, and story-led scene flow.",
      tools: ["DaVinci Resolve", "After Effects", "Audition"],
      portfolioAnchor: "./#projects"
    },
    {
      title: "MAH-CRM",
      category: "Creative Technology",
      description: "AI-integrated CRM tool for real-estate workflows, supporting lead management and automated client communication pipelines.",
      tools: ["React / Vite", "TypeScript", "Cloud Storage CDN", "AI Workflows"]
    },
    {
      title: "Personal Portfolio",
      category: "Creative Technology",
      description: "Interactive portfolio with CMS-style content management, Cloudinary media integration, visual editing controls, and motion-driven presentation.",
      tools: ["JavaScript", "Custom CMS", "Cloudinary", "GSAP / Lenis"],
      portfolioAnchor: "./"
    }
  ],
  toolGroups: [
    {
      title: "Video / Post Production",
      items: ["Adobe Premiere Pro", "Adobe After Effects", "DaVinci Resolve", "Adobe Audition", "CapCut", "Blender"]
    },
    {
      title: "Design",
      items: ["Adobe Photoshop", "Adobe Illustrator", "Canva", "Inkscape"]
    },
    {
      title: "Creative / Development",
      items: ["VS Code", "GitHub", "Claude", "ChatGPT", "Antigravity", "Google AI Studio"]
    },
    {
      title: "Web / Digital",
      items: ["HTML", "CSS", "JavaScript", "Cloudinary"]
    }
  ],
  education: [
    {
      institution: "Hemchand Yadav Vishwavidyalaya, Durg",
      period: "2021-2023",
      detail: "72%"
    }
  ],
  achievements: [
    "100+ videos edited.",
    "2.5+ years of video editing and post-production experience.",
    "Portfolio work spans commercial ads, motion graphics, long-form edits, reels, and cinematic storytelling."
  ],
  interests: [
    "Video Editing",
    "Motion Graphics",
    "Color Grading",
    "Sound Design",
    "Cinematic Storytelling",
    "Visual Design",
    "Creative Technology",
    "AI-assisted Creative Workflows"
  ]
};

function escHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escAttr(value) {
  return escHtml(value).replace(/`/g, "&#96;");
}

function normalizeTitle(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function firstUsefulArray(primary, fallback) {
  return Array.isArray(primary) && primary.length ? primary : fallback;
}

function resolvePortfolioHref(resume) {
  if (resume.links?.portfolio) return resume.links.portfolio;
  if (window.location.origin && window.location.origin !== "null") {
    return `${window.location.origin}/`;
  }
  return "./";
}

function mergeResumeData(data) {
  const source = data?.resume || {};
  return {
    ...RESUME_DEFAULTS,
    ...source,
    links: {
      ...RESUME_DEFAULTS.links,
      ...(source.links || {})
    },
    expertiseGroups: firstUsefulArray(source.expertiseGroups, RESUME_DEFAULTS.expertiseGroups),
    experience: firstUsefulArray(source.experience, RESUME_DEFAULTS.experience),
    selectedProjects: firstUsefulArray(source.selectedProjects, RESUME_DEFAULTS.selectedProjects),
    toolGroups: firstUsefulArray(source.toolGroups, RESUME_DEFAULTS.toolGroups),
    education: firstUsefulArray(source.education, RESUME_DEFAULTS.education),
    achievements: firstUsefulArray(source.achievements, RESUME_DEFAULTS.achievements),
    interests: firstUsefulArray(source.interests, RESUME_DEFAULTS.interests)
  };
}

async function loadPortfolioData() {
  const endpoints = ["/api/site-data", "data.json"];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) continue;
      const data = await response.json();
      if (data && typeof data === "object") return data;
    } catch (error) {
      console.warn(`Resume data source unavailable: ${endpoint}`, error);
    }
  }

  return {};
}

function buildContactLinks(data, resume) {
  const contact = data.contact || {};
  const links = [];
  const portfolioHref = resolvePortfolioHref(resume);

  if (contact.email) {
    links.push({
      label: "Email",
      text: contact.email,
      href: `mailto:${contact.email}`
    });
  }

  if (contact.linkedin) {
    links.push({
      label: "LinkedIn",
      text: "LinkedIn",
      href: contact.linkedin,
      external: true
    });
  }

  links.push({
    label: "Portfolio",
    text: "Portfolio",
    href: portfolioHref
  });

  const github = contact.github || resume.links?.github;
  if (github) {
    links.push({
      label: "GitHub",
      text: "GitHub",
      href: github,
      external: true
    });
  }

  if (contact.instagram) {
    links.push({
      label: "Instagram",
      text: "Instagram",
      href: contact.instagram,
      external: true
    });
  }

  return links;
}

function renderLinks(target, links, compact = false) {
  if (!target) return;
  target.innerHTML = links.map((link) => {
    const rel = link.external ? ' rel="noopener noreferrer"' : "";
    const targetAttr = link.external ? ' target="_blank"' : "";
    const label = compact
      ? `<span>${escHtml(link.label)}</span><span class="resume-link-muted">${escHtml(link.text)}</span>`
      : escHtml(link.text);

    return `<a class="resume-link" href="${escAttr(link.href)}"${targetAttr}${rel}>${label}</a>`;
  }).join("");
}

function renderExpertise(resume) {
  const grid = document.getElementById("expertiseGrid");
  if (!grid) return;

  grid.innerHTML = resume.expertiseGroups.map((group) => `
    <article class="expertise-group">
      <h3>${escHtml(group.title)}</h3>
      <div class="chip-list">
        ${(group.items || []).map((item) => `<span class="chip">${escHtml(item)}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

function renderExperience(resume) {
  const list = document.getElementById("experienceList");
  if (!list) return;

  list.innerHTML = resume.experience.map((item) => `
    <article class="timeline-item">
      <h3>${escHtml(item.company)}</h3>
      <div class="timeline-meta">
        ${item.role ? `<span>${escHtml(item.role)}</span>` : ""}
        ${item.employmentType ? `<span>${escHtml(item.employmentType)}</span>` : ""}
        ${item.location ? `<span>${escHtml(item.location)}</span>` : ""}
        ${item.period ? `<span>${escHtml(item.period)}</span>` : ""}
      </div>
      ${item.summary ? `<p>${escHtml(item.summary)}</p>` : ""}
      ${(item.points || []).length ? `
        <ul>
          ${item.points.map((point) => `<li>${escHtml(point)}</li>`).join("")}
        </ul>
      ` : ""}
    </article>
  `).join("");
}

function enrichProject(project, dataProjects) {
  const match = (dataProjects || []).find((candidate) => {
    return normalizeTitle(candidate.title) === normalizeTitle(project.title);
  });

  return {
    ...project,
    tools: firstUsefulArray(project.tools, match?.tools || []),
    mediaUrl: match?.embedUrl || match?.thumbnail || "",
    portfolioAnchor: project.portfolioAnchor || (match ? "./#projects" : "")
  };
}

function renderProjects(resume, data) {
  const list = document.getElementById("resumeProjects");
  if (!list) return;

  const projects = resume.selectedProjects.map((project) => enrichProject(project, data.projects));

  list.innerHTML = projects.map((project) => {
    const href = project.portfolioAnchor || project.mediaUrl || "";
    const linkLabel = project.portfolioAnchor === "./" ? "Open portfolio" : "View in portfolio";
    return `
      <article class="project-card">
        <h3>${escHtml(project.title)}</h3>
        ${project.category ? `<div class="project-meta"><span>${escHtml(project.category)}</span></div>` : ""}
        <p>${escHtml(project.description)}</p>
        ${(project.tools || []).length ? `
          <div class="project-tools">
            ${project.tools.map((tool) => `<span class="mini-tool">${escHtml(tool)}</span>`).join("")}
          </div>
        ` : ""}
        ${href ? `<a class="project-link no-print" href="${escAttr(href)}">${escHtml(linkLabel)}</a>` : ""}
      </article>
    `;
  }).join("");
}

function renderToolGroups(resume) {
  const target = document.getElementById("toolGroups");
  if (!target) return;

  target.innerHTML = resume.toolGroups.map((group) => `
    <article class="tool-group">
      <h3>${escHtml(group.title)}</h3>
      <div class="tool-chip-list">
        ${(group.items || []).map((item) => `<span class="tool-chip">${escHtml(item)}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

function renderEducation(resume) {
  const target = document.getElementById("educationList");
  if (!target) return;

  target.innerHTML = resume.education.map((item) => `
    <article class="education-item">
      <h3>${escHtml(item.institution)}</h3>
      <div class="education-meta">
        ${item.period ? `<span>${escHtml(item.period)}</span>` : ""}
        ${item.detail ? `<span>${escHtml(item.detail)}</span>` : ""}
      </div>
      ${item.note ? `<p>${escHtml(item.note)}</p>` : ""}
    </article>
  `).join("");
}

function renderList(id, items) {
  const target = document.getElementById(id);
  if (!target) return;
  target.innerHTML = items.map((item) => `<li>${escHtml(item)}</li>`).join("");
}

function renderChips(id, items) {
  const target = document.getElementById(id);
  if (!target) return;
  target.innerHTML = items.map((item) => `<span class="chip">${escHtml(item)}</span>`).join("");
}

function initPrintButtons() {
  const print = () => window.print();
  document.getElementById("printResume")?.addEventListener("click", print);
  document.getElementById("printResumeInline")?.addEventListener("click", print);
}

function initReveal() {
  const items = [...document.querySelectorAll(".reveal")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14 });

  items.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 55, 260)}ms`;
    observer.observe(item);
  });
}

function renderResume(data) {
  const resume = mergeResumeData(data);
  const firstName = data.hero?.firstName || "Mahesh";
  const lastName = data.hero?.lastName || "Thakur";
  const contactLinks = buildContactLinks(data, resume);

  document.getElementById("resumeName").textContent = `${firstName} ${lastName}`.trim();
  document.getElementById("resumeHeadline").textContent = resume.headline;
  document.getElementById("resumeLocation").textContent = resume.location;
  document.getElementById("resumeSummary").textContent = resume.summary;

  renderLinks(document.getElementById("resumeTopLinks"), contactLinks);
  renderLinks(document.getElementById("resumeContactList"), contactLinks, true);
  renderExpertise(resume);
  renderExperience(resume);
  renderProjects(resume, data);
  renderToolGroups(resume);
  renderEducation(resume);
  renderList("achievementList", resume.achievements);
  renderChips("interestList", resume.interests);
}

async function bootResume() {
  initPrintButtons();
  const data = await loadPortfolioData();
  renderResume(data);
  initReveal();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootResume);
} else {
  bootResume();
}
