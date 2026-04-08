const STORAGE_KEY = "qualilab-demo-state";

const defaultState = {
  equipments: [
    { id: 1, name: "Balance analytique", reference: "BAL-220", serial: "ENJ-2026-014", location: "Salle de masse", lastCalibration: "2026-01-12", nextCalibration: "2026-04-10", status: "a-planifier" },
    { id: 2, name: "Thermometre etalon", reference: "TH-500", serial: "ENJ-2025-091", location: "Salle climatique", lastCalibration: "2026-02-15", nextCalibration: "2026-08-15", status: "conforme" },
    { id: 3, name: "Pied a coulisse numerique", reference: "PC-150", serial: "ENJ-2024-033", location: "Controle dimensionnel", lastCalibration: "2025-10-01", nextCalibration: "2026-03-20", status: "hors-service" },
    { id: 4, name: "Manometre de reference", reference: "MAN-80", serial: "ENJ-2026-002", location: "Pression", lastCalibration: "2026-03-03", nextCalibration: "2026-05-02", status: "conforme" }
  ],
  calibrations: [
    { equipment: "Balance analytique", scheduledDate: "2026-04-10", measuredValue: "200.001 g", correction: "-0.001 g", uncertainty: "0.002 g", validation: "En attente", status: "a-planifier" },
    { equipment: "Thermometre etalon", scheduledDate: "2026-08-15", measuredValue: "24.98 C", correction: "+0.02 C", uncertainty: "0.05 C", validation: "Valide par le responsable", status: "valide" },
    { equipment: "Manometre de reference", scheduledDate: "2026-05-02", measuredValue: "5.002 bar", correction: "-0.002 bar", uncertainty: "0.01 bar", validation: "Planifie", status: "planifie" }
  ],
  certificates: [
    { number: "CERT-2026-0018", equipment: "Thermometre etalon", issuedAt: "2026-02-15", validity: "2027-02-15", status: "valide" },
    { number: "CERT-2026-0021", equipment: "Balance analytique", issuedAt: "2026-01-12", validity: "2026-04-12", status: "a-planifier" },
    { number: "CERT-2025-0114", equipment: "Pied a coulisse numerique", issuedAt: "2025-10-01", validity: "2026-03-20", status: "rejetee" }
  ],
  methods: [
    { title: "Methode d'etalonnage des balances", revision: "Rev. 03", owner: "Responsable metrologie", status: "valide" },
    { title: "Verification des thermometres etalons", revision: "Rev. 02", owner: "Technicien senior", status: "a-mettre-a-jour" },
    { title: "Traitement des donnees d'incertitude", revision: "Rev. 01", owner: "Responsable qualite", status: "en-cours" }
  ],
  nonConformities: [
    { title: "Certificat expire sur PC-150", owner: "Technicien qualite", cause: "Retard de renouvellement fournisseur", status: "ouverte" },
    { title: "Etiquetage incomplet d'un etalon", owner: "Responsable qualite", cause: "Verification visuelle non documentee", status: "analyse" },
    { title: "Plan d'action balance analytique", owner: "Chef de laboratoire", cause: "Action corrective en cours", status: "cloturee" }
  ],
  audits: [
    { title: "Audit interne ISO 17025", date: "2026-04-18", scope: "Gestion documentaire et traceabilite", progress: 78, status: "actif" },
    { title: "Audit fournisseurs etalons", date: "2026-05-06", scope: "Raccordement metrologique", progress: 42, status: "planifie" },
    { title: "Revue d'efficacite des actions", date: "2026-04-28", scope: "Non-conformites critiques", progress: 60, status: "actif" }
  ],
  users: [
    { name: "Amina El Idrissi", role: "Admin", team: "Direction qualite", access: "Complet" },
    { name: "Youssef Benali", role: "Responsable qualite", team: "SMQ", access: "Validation et audits" },
    { name: "Sara Kabbaj", role: "Technicien", team: "Metrologie", access: "Saisie etalonnages" }
  ]
};

let state = loadState();

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return normalizeState(cloneDefaultState());
  try {
    return normalizeState({ ...cloneDefaultState(), ...JSON.parse(saved) });
  } catch {
    return normalizeState(cloneDefaultState());
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateString}T00:00:00`);
  return Math.ceil((target - today) / 86400000);
}

function computeEquipmentStatus(nextCalibration) {
  const diff = daysUntil(nextCalibration);
  if (diff < 0) return "hors-service";
  if (diff <= 15) return "a-planifier";
  return "conforme";
}

function normalizeState(source) {
  return {
    ...source,
    equipments: source.equipments.map((item) => ({
      ...item,
      status: computeEquipmentStatus(item.nextCalibration)
    }))
  };
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${dateString}T00:00:00`));
}

function getAlerts() {
  return state.equipments
    .map((item) => ({ ...item, remainingDays: daysUntil(item.nextCalibration) }))
    .filter((item) => item.remainingDays <= 20)
    .sort((a, b) => a.remainingDays - b.remainingDays);
}

function getComplianceRate() {
  const totalWeight = state.equipments.length + state.audits.length + state.nonConformities.length;
  const compliantEquipments = state.equipments.filter((item) => item.status === "conforme").length;
  const activeAudits = state.audits.filter((item) => item.progress >= 60).length;
  const closedActions = state.nonConformities.filter((item) => item.status === "cloturee").length;
  return Math.round(((compliantEquipments + activeAudits + closedActions) / totalWeight) * 100);
}

function renderStats() {
  const stats = [
    { label: "Equipements suivis", value: state.equipments.length, detail: "registre metrologique centralise" },
    { label: "Etalonnages en cours", value: state.calibrations.length, detail: "planning et validation" },
    { label: "Certificats actifs", value: state.certificates.filter((item) => item.status === "valide").length, detail: "preuves conformes disponibles" },
    { label: "Actions correctives", value: state.nonConformities.length, detail: "traitement des ecarts qualite" }
  ];

  document.getElementById("statsGrid").innerHTML = stats.map((stat) => `
    <article class="metric-card">
      <p class="eyebrow">${stat.label}</p>
      <strong class="metric-value">${stat.value}</strong>
      <p>${stat.detail}</p>
    </article>
  `).join("");
}

function renderAlerts() {
  const alerts = getAlerts();
  document.getElementById("alertCounter").textContent = `${alerts.length} alertes`;
  document.getElementById("alertsList").innerHTML = alerts.length ? alerts.map((alert) => {
    const statusLabel = alert.remainingDays < 0 ? "Echu" : `Dans ${alert.remainingDays} jours`;
    return `
      <div class="stack-item">
        <div>
          <strong>${alert.name}</strong>
          <p>${alert.reference} · ${alert.location}</p>
        </div>
        <span class="tag ${alert.status}">${statusLabel}</span>
      </div>
    `;
  }).join("") : `<div class="empty-state">Aucune alerte d'etalonnage pour les 20 prochains jours.</div>`;
}

function renderWorkload() {
  const items = [
    { title: "Dossier a finaliser", detail: "Validation du certificat CERT-2026-0021" },
    { title: "Audit a preparer", detail: "Checklist ISO 17025 pour le 18 avril 2026" },
    { title: "Action corrective", detail: "Suivre le renouvellement du PC-150" }
  ];

  document.getElementById("workloadList").innerHTML = items.map((item) => `
    <div class="stack-item">
      <div>
        <strong>${item.title}</strong>
        <p>${item.detail}</p>
      </div>
    </div>
  `).join("");
}

function renderEquipmentTable() {
  const query = document.getElementById("equipmentSearch").value.trim().toLowerCase();
  const filter = document.getElementById("equipmentFilter").value;
  const filtered = state.equipments.filter((item) => {
    const matchesQuery = item.name.toLowerCase().includes(query) || item.reference.toLowerCase().includes(query) || item.location.toLowerCase().includes(query);
    const matchesFilter = filter === "all" || item.status === filter;
    return matchesQuery && matchesFilter;
  });

  const table = document.getElementById("equipmentTable");
  if (!filtered.length) {
    table.innerHTML = `<div class="empty-state">Aucun equipement ne correspond a ce filtre.</div>`;
    return;
  }

  table.innerHTML = `
    <div class="table-head">
      <span>Equipement</span><span>Reference</span><span>Localisation</span><span>Prochain etalonnage</span><span>Statut</span>
    </div>
    ${filtered.map((item) => `
      <div class="table-row">
        <span><strong>${item.name}</strong><br><span class="small-copy">${item.serial}</span></span>
        <span>${item.reference}</span>
        <span>${item.location}</span>
        <span>${formatDate(item.nextCalibration)}</span>
        <span><span class="tag ${item.status}">${item.status}</span></span>
      </div>
    `).join("")}
  `;
}

function renderCalibrations() {
  document.getElementById("calibrationCards").innerHTML = state.calibrations.map((item) => `
    <article class="card-item">
      <span class="tag ${item.status}">${item.status}</span>
      <strong>${item.equipment}</strong>
      <p>Date planifiee : ${formatDate(item.scheduledDate)}</p>
      <p>Valeur mesuree : ${item.measuredValue}</p>
      <p>Correction : ${item.correction}</p>
      <p>Incertitude : ${item.uncertainty}</p>
      <p><strong>${item.validation}</strong></p>
    </article>
  `).join("");
}

function renderCertificates() {
  document.getElementById("certificateList").innerHTML = state.certificates.map((item) => `
    <div class="stack-item">
      <div>
        <strong>${item.number}</strong>
        <p>${item.equipment}</p>
        <p class="certificate-meta">Emission : ${formatDate(item.issuedAt)} · Validite : ${formatDate(item.validity)}</p>
      </div>
      <span class="tag ${item.status}">${item.status}</span>
    </div>
  `).join("");
}

function renderMethods() {
  document.getElementById("methodsGrid").innerHTML = state.methods.map((item) => `
    <article class="card-item">
      <span class="tag ${item.status}">${item.status}</span>
      <strong>${item.title}</strong>
      <p>${item.revision}</p>
      <p>Responsable : ${item.owner}</p>
    </article>
  `).join("");
}

function renderNonConformities() {
  const columns = [
    { id: "ouverte", title: "Ouvertes" },
    { id: "analyse", title: "Analyse des causes" },
    { id: "cloturee", title: "Cloturees" }
  ];

  document.getElementById("nonConformityBoard").innerHTML = columns.map((column) => {
    const items = state.nonConformities.filter((item) => item.status === column.id);
    return `
      <section class="board-column">
        <h4>${column.title}</h4>
        <div class="board-stack">
          ${items.length ? items.map((item) => `
            <article class="card-item">
              <span class="tag ${item.status}">${item.status}</span>
              <strong>${item.title}</strong>
              <p>Responsable : ${item.owner}</p>
              <p>Cause : ${item.cause}</p>
            </article>
          `).join("") : `<div class="empty-state">Aucun element</div>`}
        </div>
      </section>
    `;
  }).join("");
}

function renderAudits() {
  document.getElementById("auditList").innerHTML = state.audits.map((item) => `
    <article class="card-item">
      <div class="audit-head">
        <strong>${item.title}</strong>
        <span class="tag ${item.status}">${item.status}</span>
      </div>
      <p>Date : ${formatDate(item.date)}</p>
      <p>Perimetre : ${item.scope}</p>
      <div class="audit-progress"><span style="width:${item.progress}%"></span></div>
      <p>${item.progress}% de preparation</p>
    </article>
  `).join("");
}

function renderUsers() {
  document.getElementById("userGrid").innerHTML = state.users.map((user) => `
    <article class="card-item user-card">
      <div class="user-top">
        <div class="avatar">${user.name.slice(0, 1)}</div>
        <span class="tag actif">${user.role}</span>
      </div>
      <strong>${user.name}</strong>
      <p>${user.team}</p>
      <p>Acces : ${user.access}</p>
    </article>
  `).join("");
}

function renderAll() {
  document.getElementById("complianceRate").textContent = `${getComplianceRate()}%`;
  renderStats();
  renderAlerts();
  renderWorkload();
  renderEquipmentTable();
  renderCalibrations();
  renderCertificates();
  renderMethods();
  renderNonConformities();
  renderAudits();
  renderUsers();
  saveState();
}

function setupNavigation() {
  const links = [...document.querySelectorAll(".nav-link")];
  const panels = [...document.querySelectorAll(".panel")];
  links.forEach((link) => {
    link.addEventListener("click", () => {
      const target = link.dataset.target;
      links.forEach((item) => item.classList.toggle("active", item === link));
      panels.forEach((panel) => panel.classList.toggle("active", panel.id === target));
      document.getElementById(target)?.scrollIntoView({ block: "start" });
    });
  });
}

function setupFilters() {
  document.getElementById("equipmentSearch").addEventListener("input", renderEquipmentTable);
  document.getElementById("equipmentFilter").addEventListener("change", renderEquipmentTable);
}

function setupForm() {
  const form = document.getElementById("equipmentForm");
  const feedback = document.getElementById("formFeedback");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const nextCalibration = String(formData.get("nextCalibration"));
    const equipment = {
      id: Date.now(),
      name: String(formData.get("name")),
      reference: String(formData.get("reference")),
      serial: String(formData.get("serial")),
      location: String(formData.get("location")),
      lastCalibration: String(formData.get("lastCalibration")),
      nextCalibration,
      status: computeEquipmentStatus(nextCalibration)
    };

    state.equipments.unshift(equipment);
    feedback.textContent = `Equipement "${equipment.name}" ajoute avec succes.`;
    form.reset();
    renderAll();
  });
}

setupNavigation();
setupFilters();
setupForm();
renderAll();
