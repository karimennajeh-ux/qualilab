const STORAGE_KEY = "qualiflow-qms-state";

const seedState = {
  documents: [
    { id: crypto.randomUUID(), title: "Procedure gestion documentaire", type: "Procedure", owner: "Responsable QHSE", reviewDate: "2026-05-15" },
    { id: crypto.randomUUID(), title: "Instruction controle reception", type: "Instruction", owner: "Chef d'atelier", reviewDate: "2026-04-20" },
    { id: crypto.randomUUID(), title: "Politique qualite", type: "Politique", owner: "Direction generale", reviewDate: "2026-06-01" }
  ],
  nonconformities: [
    { id: crypto.randomUUID(), title: "Etiquetage incomplet sur lot A-204", source: "Production", severity: "Majeure", owner: "Ahmed K.", dueDate: "2026-04-18", status: "Ouverte" },
    { id: crypto.randomUUID(), title: "Retard de traitement reclamation client Atlas", source: "Reclamation client", severity: "Critique", owner: "Meriem S.", dueDate: "2026-04-12", status: "En analyse" }
  ],
  capa: [
    { id: crypto.randomUUID(), title: "Mettre a jour le standard de controle a reception", type: "Corrective", owner: "Responsable methodes", progress: 60, dueDate: "2026-04-17" },
    { id: crypto.randomUUID(), title: "Deployer check-list 5M pour causes recurrentes", type: "Preventive", owner: "Animateur qualite", progress: 35, dueDate: "2026-04-28" }
  ],
  audits: [
    { id: crypto.randomUUID(), process: "Achats et fournisseurs", auditor: "S. Karim", type: "Interne", date: "2026-04-16" },
    { id: crypto.randomUUID(), process: "Production conditionnement", auditor: "L. Diallo", type: "Certification", date: "2026-05-08" }
  ],
  training: [
    { id: crypto.randomUUID(), employee: "Aicha M.", module: "ISO 9001 - sensibilisation", status: "Validee", targetDate: "2026-03-22" },
    { id: crypto.randomUUID(), employee: "Youssef B.", module: "Traitement des non-conformites", status: "En cours", targetDate: "2026-04-14" },
    { id: crypto.randomUUID(), employee: "Nadia T.", module: "Audit interne processus", status: "Planifiee", targetDate: "2026-04-25" }
  ]
};

const appState = loadState();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(seedState);
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Impossible de lire les donnees locales", error);
    return structuredClone(seedState);
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateString));
}

function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function badgeClass(status) {
  const value = status.toLowerCase();
  if (["validee", "maitrise", "cloturee", "interne", "preventive"].includes(value)) return "badge-success";
  if (["planifiee", "en cours", "en analyse", "corrective"].includes(value)) return "badge-info";
  if (["mineure", "a surveiller"].includes(value)) return "badge-warning";
  if (["critique", "majeure", "ouverte", "retard"].includes(value)) return "badge-danger";
  return "badge-warning";
}

function createBadge(text) {
  return `<span class="badge ${badgeClass(text)}">${text}</span>`;
}

function renderStackItems(items) {
  if (!items.length) return document.getElementById("empty-state-template").innerHTML;
  return items.map((item) => `
    <div class="stack-item">
      <h5>${item.title}</h5>
      <p>${item.meta}</p>
    </div>
  `).join("");
}

function renderTable(containerId, headers, rows) {
  const container = document.getElementById(containerId);
  if (!rows.length) {
    container.innerHTML = document.getElementById("empty-state-template").innerHTML;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderStats() {
  const docsNearReview = appState.documents.filter((doc) => daysUntil(doc.reviewDate) <= 20).length;
  const openNc = appState.nonconformities.filter((nc) => nc.status !== "Cloturee").length;
  const auditsComing = appState.audits.filter((audit) => daysUntil(audit.date) >= 0 && daysUntil(audit.date) <= 30).length;
  const validatedTraining = appState.training.filter((item) => item.status === "Validee").length;
  const trainingRate = Math.round((validatedTraining / Math.max(appState.training.length, 1)) * 100);

  const stats = [
    { label: "Docs a revoir", value: docsNearReview, detail: "dans les 20 prochains jours" },
    { label: "Ecarts ouverts", value: openNc, detail: "necessitent une action" },
    { label: "Audits a venir", value: auditsComing, detail: "sur 30 jours" },
    { label: "Taux formation", value: `${trainingRate}%`, detail: "collaborateurs valides" }
  ];

  document.getElementById("stats-grid").innerHTML = stats.map((item) => `
    <article class="stat-card">
      <p class="eyebrow">${item.label}</p>
      <strong>${item.value}</strong>
      <p class="delta">${item.detail}</p>
    </article>
  `).join("");
}

function renderDashboardLists() {
  const docItems = [...appState.documents].sort((a, b) => new Date(a.reviewDate) - new Date(b.reviewDate)).slice(0, 3);
  const auditItems = [...appState.audits].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3);
  const trainingItems = [...appState.training].sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate)).slice(0, 3);

  document.getElementById("document-focus").innerHTML = renderStackItems(docItems.map((doc) => ({
    title: doc.title,
    meta: `${doc.owner} • revue ${formatDate(doc.reviewDate)}`
  })));

  document.getElementById("upcoming-audits").innerHTML = renderStackItems(auditItems.map((audit) => ({
    title: audit.process,
    meta: `${audit.type} • ${audit.auditor} • ${formatDate(audit.date)}`
  })));

  document.getElementById("training-overview").innerHTML = renderStackItems(trainingItems.map((entry) => ({
    title: `${entry.employee} • ${entry.module}`,
    meta: `${entry.status} • cible ${formatDate(entry.targetDate)}`
  })));

  const capaSorted = [...appState.capa].sort((a, b) => b.progress - a.progress).slice(0, 4);
  document.getElementById("capa-progress").innerHTML = capaSorted.map((action) => `
    <div class="progress-item">
      <h5>${action.title}</h5>
      <p class="progress-meta">${action.type} • ${action.owner} • echeance ${formatDate(action.dueDate)}</p>
      <div class="progress-track"><span style="width:${action.progress}%"></span></div>
      <p class="progress-meta">${action.progress}% realise</p>
    </div>
  `).join("");
}

function renderDocuments() {
  const query = document.getElementById("document-search").value.trim().toLowerCase();
  const filtered = appState.documents.filter((doc) => [doc.title, doc.type, doc.owner].some((field) => field.toLowerCase().includes(query)));

  renderTable("documents-table", ["Titre", "Type", "Responsable", "Prochaine revue", "Statut"], filtered
    .sort((a, b) => new Date(a.reviewDate) - new Date(b.reviewDate))
    .map((doc) => {
      const remaining = daysUntil(doc.reviewDate);
      const status = remaining <= 7 ? "a surveiller" : "maitrise";
      return [doc.title, doc.type, doc.owner, formatDate(doc.reviewDate), `${createBadge(status)}<div class="table-meta">${remaining} jours restants</div>`];
    }));
}

function renderNonConformities() {
  const query = document.getElementById("nc-search").value.trim().toLowerCase();
  const filtered = appState.nonconformities.filter((nc) => [nc.title, nc.source, nc.owner].some((field) => field.toLowerCase().includes(query)));

  renderTable("nc-table", ["Ecart", "Source", "Gravite", "Pilote", "Echeance", "Statut"], filtered
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .map((nc) => [nc.title, nc.source, createBadge(nc.severity), nc.owner, formatDate(nc.dueDate), createBadge(nc.status)]));
}

function renderCapa() {
  renderTable("capa-table", ["Action", "Type", "Responsable", "Echeance", "Avancement"], [...appState.capa]
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .map((action) => [action.title, createBadge(action.type), action.owner, formatDate(action.dueDate), `${action.progress}%`]));
}

function renderAudits() {
  renderTable("audit-table", ["Processus", "Auditeur", "Type", "Date", "Priorite"], [...appState.audits]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((audit) => {
      const priority = daysUntil(audit.date) <= 10 ? "a surveiller" : "planifiee";
      return [audit.process, audit.auditor, createBadge(audit.type), formatDate(audit.date), createBadge(priority)];
    }));
}

function renderTraining() {
  renderTable("training-table", ["Collaborateur", "Module", "Statut", "Date cible"], [...appState.training]
    .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))
    .map((entry) => [entry.employee, entry.module, createBadge(entry.status), formatDate(entry.targetDate)]));
}

function renderAll() {
  renderStats();
  renderDashboardLists();
  renderDocuments();
  renderNonConformities();
  renderCapa();
  renderAudits();
  renderTraining();
  persistState();
}

function setActiveSection(sectionId) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === sectionId);
  });
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.toggle("active", section.id === sectionId);
  });
}

function addDocument(formData) {
  appState.documents.unshift({
    id: crypto.randomUUID(),
    title: formData.get("title"),
    type: formData.get("type"),
    owner: formData.get("owner"),
    reviewDate: formData.get("reviewDate")
  });
}

function addNonConformity(formData) {
  const title = formData.get("title");
  const owner = formData.get("owner");
  const dueDate = formData.get("dueDate");

  appState.nonconformities.unshift({
    id: crypto.randomUUID(),
    title,
    source: formData.get("source"),
    severity: formData.get("severity"),
    owner,
    dueDate,
    status: "Ouverte"
  });

  appState.capa.unshift({
    id: crypto.randomUUID(),
    title: `Traiter: ${title}`,
    type: "Corrective",
    owner,
    progress: 10,
    dueDate
  });
}

function addCapa(formData) {
  appState.capa.unshift({
    id: crypto.randomUUID(),
    title: formData.get("title"),
    type: formData.get("type"),
    owner: formData.get("owner"),
    progress: Number(formData.get("progress")),
    dueDate: formData.get("dueDate")
  });
}

function addAudit(formData) {
  appState.audits.unshift({
    id: crypto.randomUUID(),
    process: formData.get("process"),
    auditor: formData.get("auditor"),
    type: formData.get("type"),
    date: formData.get("date")
  });
}

function addTraining(formData) {
  appState.training.unshift({
    id: crypto.randomUUID(),
    employee: formData.get("employee"),
    module: formData.get("module"),
    status: formData.get("status"),
    targetDate: formData.get("targetDate")
  });
}

function bindForms() {
  const formConfig = [
    { id: "document-form", handler: addDocument, section: "documents" },
    { id: "nc-form", handler: addNonConformity, section: "nonconformities" },
    { id: "capa-form", handler: addCapa, section: "capa" },
    { id: "audit-form", handler: addAudit, section: "audits" },
    { id: "training-form", handler: addTraining, section: "training" }
  ];

  formConfig.forEach(({ id, handler, section }) => {
    document.getElementById(id).addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      handler(new FormData(form));
      form.reset();
      renderAll();
      setActiveSection(section);
    });
  });
}

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => setActiveSection(item.dataset.section));
  });

  document.querySelector("[data-section-shortcut]").addEventListener("click", (event) => {
    setActiveSection(event.currentTarget.dataset.sectionShortcut);
  });

  document.getElementById("seed-reset").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    Object.keys(appState).forEach((key) => {
      appState[key] = structuredClone(seedState[key]);
    });
    renderAll();
    setActiveSection("dashboard");
  });

  document.getElementById("document-search").addEventListener("input", renderDocuments);
  document.getElementById("nc-search").addEventListener("input", renderNonConformities);
}

bindNavigation();
bindForms();
renderAll();
