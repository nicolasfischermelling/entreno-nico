// App de entrenamiento personal — lógica principal.
// Todo el estado real vive en localStorage bajo STORAGE_KEY.

const STORAGE_KEY = "entrenoNico_v1";
const DELOAD_WEEKS = 6;
const DELOAD_VOLUME_FACTOR = 0.6; // reduce 40% -> queda 60%

let state = null;
const app = document.getElementById("app");

// ---------------- estado / persistencia ----------------

function todayISO() {
  return new Date().toISOString();
}

function freshState() {
  const exercises = {};
  for (const e of EXERCISES) {
    exercises[e.id] = {
      weight: e.weight,
      lastReps: [],
      lastDate: null,
      lastTechniqueClean: true,
      notes: "",
    };
  }
  const warmup = {};
  for (const w of WARMUP.items) {
    if (w.hasWeight) warmup[w.id] = { weight: w.defaultWeight ?? null };
  }
  return {
    version: 1,
    cycle: { lastCompletedDay: null },
    exercises,
    warmup,
    deload: { lastDeloadDate: todayISO(), active: false, sessionsRemaining: 0 },
    history: [],
    currentSession: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    // completar campos que puedan faltar si se agregaron ejercicios nuevos
    const fresh = freshState();
    parsed.exercises = Object.assign(fresh.exercises, parsed.exercises || {});
    parsed.warmup = Object.assign(fresh.warmup, parsed.warmup || {});
    if (!parsed.deload) parsed.deload = fresh.deload;
    if (!parsed.history) parsed.history = [];
    if (parsed.currentSession === undefined) parsed.currentSession = null;
    return parsed;
  } catch (err) {
    console.error("Error leyendo estado, se reinicia:", err);
    return freshState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------------- utilidades de ciclo/deload ----------------

function nextDay() {
  const last = state.cycle.lastCompletedDay;
  if (!last) return "D1";
  const idx = CYCLE_ORDER.indexOf(last);
  return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
}

function weeksSinceLastDeload() {
  const last = new Date(state.deload.lastDeloadDate);
  const diffMs = Date.now() - last.getTime();
  return diffMs / (1000 * 60 * 60 * 24 * 7);
}

function deloadDue() {
  return !state.deload.active && weeksSinceLastDeload() >= DELOAD_WEEKS;
}

// ---------------- navegación ----------------

function render(view, params = {}) {
  window.scrollTo(0, 0);
  if (view === "home") return renderHome();
  if (view === "session") return renderSession();
  if (view === "exercise") return renderExercise(params.id);
  if (view === "history") return renderHistory();
  if (view === "settings") return renderSettings();
}

// ---------------- HOME ----------------

function renderHome() {
  const resuming = !!state.currentSession;
  const day = resuming ? state.currentSession.day : nextDay();
  const title = DAY_TITLES[day];
  const deloadBanner = state.deload.active
    ? `<div class="deload-banner">💤 <strong>Semana de descarga activa</strong> — volumen reducido ~40%, mismo peso. Quedan ${state.deload.sessionsRemaining} sesión(es) de descarga.</div>`
    : deloadDue()
    ? `<div class="deload-banner">💤 Toca semana de descarga: al iniciar la próxima sesión se reduce el volumen automáticamente.</div>`
    : "";

  app.innerHTML = `
    <div class="topbar">
      <h1>Entrenamiento</h1>
      <button class="icon-btn" id="btnHistory" title="Historial">📖</button>
      <button class="icon-btn" id="btnSettings" title="Ajustes">⚙️</button>
    </div>
    ${deloadBanner}
    <button class="hero-btn" id="btnStart">
      <div class="hero-label">${resuming ? "Continuar" : "Hoy"}</div>
      <div class="hero-day">${day} — ${title.split("(")[0].trim()}</div>
      <div class="hero-sub">${title}</div>
    </button>
    <div class="general-warning">⚠️ ${GENERAL_WARNING}</div>
    <div class="card">
      <h2>Estado</h2>
      <p style="color:var(--text-dim); font-size:0.9rem;">
        Última sesión completada: ${state.cycle.lastCompletedDay ?? "ninguna todavía"}<br/>
        Semanas desde la última descarga: ${weeksSinceLastDeload().toFixed(1)}
      </p>
    </div>
    <footer class="app-footer">App personal de entrenamiento — datos guardados solo en este dispositivo.</footer>
  `;

  document.getElementById("btnStart").onclick = () => startOrResumeSession();
  document.getElementById("btnHistory").onclick = () => render("history");
  document.getElementById("btnSettings").onclick = () => render("settings");
}

function startOrResumeSession() {
  if (!state.currentSession) {
    const day = nextDay();
    const deloadThisSession = state.deload.active || deloadDue();
    if (!state.deload.active && deloadDue()) {
      state.deload.active = true;
      state.deload.sessionsRemaining = 4;
    }
    state.currentSession = {
      day,
      startedAt: todayISO(),
      deloadThisSession,
      entries: {}, // exerciseId -> {reps:[], weight, techniqueClean, skipped, acked}
      warmup: {}, // warmupItemId -> true
    };
    saveState();
  }
  render("session");
}

// ---------------- SESIÓN ----------------

function renderSession() {
  const sess = state.currentSession;
  if (!sess) return render("home");
  const day = sess.day;
  const list = exercisesForDay(day);
  const deloadNote = sess.deloadThisSession
    ? `<div class="deload-banner">💤 Sesión de descarga: series reducidas, mismo peso que la sesión anterior.</div>`
    : "";

  const warmupHtml = WARMUP.items
    .map((w) => {
      const checked = !!sess.warmup[w.id];
      return `<div class="exercise-row" data-warm="${w.id}">
        <div class="mini-anim">${buildExerciseMedia(w)}</div>
        <div class="info">
          <div class="name">${w.name}</div>
          <div class="meta">${w.detail ?? ""}</div>
        </div>
        <div class="status">${checked ? "✅" : "⬜"}</div>
      </div>`;
    })
    .join("");

  const exHtml = list
    .map((e) => {
      const entry = sess.entries[e.id];
      const done = entry && (entry.skipped || (entry.reps && entry.reps.length));
      const ex = state.exercises[e.id];
      const weightLabel = e.hasWeight ? (ex.weight != null ? `${ex.weight} kg · ` : "sin peso registrado · ") : "";
      const repsLabel = e.timeBased ? "por tiempo" : `${e.repMin}-${e.repMax} reps`;
      return `<button class="exercise-row ${done ? "done" : ""}" data-ex="${e.id}">
        <div class="mini-anim">${buildExerciseMedia(e)}</div>
        <div class="info">
          <div class="name">${e.name}</div>
          <div class="meta">${e.sets}x ${repsLabel} · ${weightLabel}</div>
        </div>
        <div class="status">${entry ? (entry.skipped ? "⏭️" : "✅") : "⬜"}</div>
      </button>`;
    })
    .join("");

  app.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="btnBack">←</button>
      <h1>${day} — ${DAY_TITLES[day].split("(")[0].trim()}</h1>
    </div>
    ${deloadNote}
    <div class="general-warning">⚠️ ${GENERAL_WARNING}</div>
    <h2>${WARMUP.title}</h2>
    <div class="exercise-list" style="margin-bottom:18px;">${warmupHtml}</div>
    <h2>Ejercicios</h2>
    <div class="exercise-list">${exHtml}</div>
    <div class="actions-row">
      <button class="btn btn-danger" id="btnAbort">Cancelar sesión</button>
      <button class="btn btn-primary" id="btnFinish">Finalizar sesión</button>
    </div>
  `;

  document.getElementById("btnBack").onclick = () => render("home");
  document.querySelectorAll("[data-warm]").forEach((row) => {
    row.onclick = () => {
      const id = row.getAttribute("data-warm");
      sess.warmup[id] = !sess.warmup[id];
      saveState();
      renderSession();
    };
  });
  document.querySelectorAll("[data-ex]").forEach((row) => {
    row.onclick = () => render("exercise", { id: row.getAttribute("data-ex") });
  });
  document.getElementById("btnAbort").onclick = () => {
    if (confirm("¿Cancelar esta sesión? Se pierde el progreso registrado hasta ahora en esta sesión.")) {
      state.currentSession = null;
      saveState();
      render("home");
    }
  };
  document.getElementById("btnFinish").onclick = () => finishSession();
}

function finishSession() {
  const sess = state.currentSession;
  const list = exercisesForDay(sess.day);
  const pending = list.filter((e) => !sess.entries[e.id]);
  if (pending.length) {
    const ok = confirm(`Quedan ${pending.length} ejercicio(s) sin registrar. ¿Finalizar la sesión igual?`);
    if (!ok) return;
  }

  const historyEntry = { date: todayISO(), day: sess.day, deload: sess.deloadThisSession, entries: [] };

  for (const e of list) {
    const entry = sess.entries[e.id];
    const exState = state.exercises[e.id];
    if (!entry || entry.skipped) {
      historyEntry.entries.push({ id: e.id, name: e.name, skipped: true });
      continue;
    }
    const weightUsed = entry.weight != null ? entry.weight : exState.weight;
    exState.weight = weightUsed;
    exState.lastReps = entry.reps;
    exState.lastDate = todayISO();
    exState.lastTechniqueClean = entry.techniqueClean;

    // progresión doble (no aplica durante deload: se mantiene el mismo peso)
    if (!sess.deloadThisSession && e.hasWeight && !e.timeBased && e.repMax != null) {
      const allTop = entry.reps.length > 0 && entry.reps.every((r) => Number(r) >= e.repMax) && entry.techniqueClean;
      if (allTop) {
        const newWeight = Math.round((weightUsed + e.incrementKg) * 10) / 10;
        exState.weight = newWeight;
      }
    }

    historyEntry.entries.push({
      id: e.id,
      name: e.name,
      weight: weightUsed,
      reps: entry.reps,
      techniqueClean: entry.techniqueClean,
      newWeight: exState.weight,
    });
  }

  state.history.unshift(historyEntry);
  if (state.history.length > 100) state.history.length = 100;

  state.cycle.lastCompletedDay = sess.day;

  if (sess.deloadThisSession) {
    state.deload.sessionsRemaining -= 1;
    if (state.deload.sessionsRemaining <= 0) {
      state.deload.active = false;
      state.deload.lastDeloadDate = todayISO();
    }
  }

  state.currentSession = null;
  saveState();
  render("home");
}

// ---------------- EJERCICIO ----------------

function renderExercise(id) {
  const sess = state.currentSession;
  const e = EXERCISES.find((x) => x.id === id);
  const exState = state.exercises[id];
  if (!sess || !e) return render("session");

  let entry = sess.entries[id];
  const needsAck = !!e.warning && !(entry && entry.acked);

  if (needsAck) {
    app.innerHTML = `
      <div class="topbar">
        <button class="icon-btn" id="btnBack">←</button>
        <h1>${e.name}</h1>
      </div>
      <div class="warning-banner danger">
        <span class="icon">⚠️</span>
        <span>${e.warning}</span>
      </div>
      <button class="btn btn-primary btn-block" id="btnAck">Entendido, continuar</button>
    `;
    document.getElementById("btnBack").onclick = () => render("session");
    document.getElementById("btnAck").onclick = () => {
      sess.entries[id] = sess.entries[id] || { reps: [], acked: true, techniqueClean: true };
      sess.entries[id].acked = true;
      saveState();
      renderExercise(id);
    };
    return;
  }

  const setsCount = sess.deloadThisSession ? Math.max(1, Math.round(e.sets * DELOAD_VOLUME_FACTOR)) : e.sets;
  const savedReps = (entry && entry.reps) || [];
  const savedWeight = (entry && entry.weight) ?? exState.weight;
  const savedClean = entry ? entry.techniqueClean : true;
  const skipped = entry && entry.skipped;

  const setsRowsHtml = Array.from({ length: setsCount })
    .map((_, i) => {
      const val = savedReps[i] ?? "";
      const placeholder = e.timeBased ? "seg" : e.repMin != null ? `${e.repMin}-${e.repMax}` : "reps";
      return `<div class="set-row">
        <label>#${i + 1}</label>
        <input type="number" inputmode="numeric" min="0" data-set="${i}" value="${val}" placeholder="${placeholder}">
      </div>`;
    })
    .join("");

  app.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="btnBack">←</button>
      <h1>${e.name}</h1>
    </div>
    <div class="anim-wrap">${buildExerciseMedia(e)}</div>
    <p class="pill">${e.sets}x ${e.timeBased ? "tiempo" : `${e.repMin}-${e.repMax} reps`}${sess.deloadThisSession ? ` · descarga: ${setsCount} series` : ""}</p>
    ${e.note ? `<div class="note-box">📝 ${e.note}</div>` : ""}
    ${
      e.skippable
        ? `<div class="skip-row"><button class="btn btn-ghost btn-block" id="btnSkip">${skipped ? "✅ Omitido" : "⏭️ " + e.skipLabel}</button></div>`
        : ""
    }
    <div id="loggingArea" style="${skipped ? "display:none" : ""}">
      ${
        e.hasWeight
          ? `<div class="field-row">
              <label>Peso (kg)</label>
              <input type="number" inputmode="decimal" step="0.5" id="weightInput" value="${savedWeight ?? ""}" placeholder="kg">
            </div>`
          : ""
      }
      <h2>Series realizadas</h2>
      ${setsRowsHtml}
      <div class="checkbox-row">
        <input type="checkbox" id="cleanCheck" ${savedClean ? "checked" : ""}>
        <label for="cleanCheck">Técnica limpia en todas las series</label>
      </div>
    </div>
    <div class="actions-row">
      <button class="btn btn-ghost" id="btnCancel">Volver</button>
      <button class="btn btn-primary" id="btnSave">Guardar</button>
    </div>
  `;

  document.getElementById("btnBack").onclick = () => render("session");
  document.getElementById("btnCancel").onclick = () => render("session");

  if (e.skippable) {
    document.getElementById("btnSkip").onclick = () => {
      const cur = sess.entries[id] || {};
      cur.skipped = !cur.skipped;
      sess.entries[id] = cur;
      saveState();
      renderExercise(id);
    };
  }

  document.getElementById("btnSave").onclick = () => {
    const cur = sess.entries[id] || {};
    if (!skipped) {
      const reps = [];
      document.querySelectorAll("[data-set]").forEach((inp) => {
        reps.push(inp.value === "" ? 0 : Number(inp.value));
      });
      cur.reps = reps;
      cur.techniqueClean = document.getElementById("cleanCheck").checked;
      if (e.hasWeight) {
        const w = document.getElementById("weightInput").value;
        cur.weight = w === "" ? null : Number(w);
      }
      cur.skipped = false;
    }
    cur.acked = true;
    sess.entries[id] = cur;
    saveState();
    render("session");
  };
}

// ---------------- HISTORIAL ----------------

function renderHistory() {
  const items = state.history
    .map((h) => {
      const d = new Date(h.date);
      const dateStr = d.toLocaleDateString("es-NZ", { day: "2-digit", month: "2-digit", year: "numeric" });
      const rows = h.entries
        .map((en) => {
          if (en.skipped) return `${en.name}: omitido`;
          const repsStr = (en.reps || []).join("/");
          return `${en.name}: ${en.weight ?? "-"}kg × [${repsStr}]${en.newWeight && en.newWeight !== en.weight ? ` → sube a ${en.newWeight}kg` : ""}`;
        })
        .join("<br>");
      return `<div class="history-item">
        <div class="hdate">${dateStr} · ${h.day}${h.deload ? " · descarga" : ""}</div>
        <div>${rows}</div>
      </div>`;
    })
    .join("");

  app.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="btnBack">←</button>
      <h1>Historial</h1>
    </div>
    <div class="card">${items || '<p style="color:var(--text-dim)">Todavía no hay sesiones registradas.</p>'}</div>
  `;
  document.getElementById("btnBack").onclick = () => render("home");
}

// ---------------- AJUSTES ----------------

function renderSettings() {
  const rows = EXERCISES.map((e) => {
    const exState = state.exercises[e.id];
    if (!e.hasWeight) return "";
    return `<div class="field-row">
      <label>${e.name} (${DAY_TITLES[e.day].split("(")[0].trim()})</label>
      <input type="number" step="0.5" data-wid="${e.id}" value="${exState.weight ?? ""}" placeholder="kg">
    </div>`;
  }).join("");

  app.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="btnBack">←</button>
      <h1>Ajustes</h1>
    </div>
    <div class="card">
      <h2>Estado de descarga</h2>
      <p style="font-size:0.9rem;color:var(--text-dim)">
        Última descarga: ${new Date(state.deload.lastDeloadDate).toLocaleDateString("es-NZ")}<br>
        Activa: ${state.deload.active ? `sí (${state.deload.sessionsRemaining} sesiones restantes)` : "no"}
      </p>
      <button class="btn btn-ghost btn-sm" id="btnForceDeload">${state.deload.active ? "Cancelar descarga" : "Forzar descarga ahora"}</button>
    </div>
    <div class="card">
      <h2>Pesos actuales</h2>
      ${rows}
      <button class="btn btn-primary btn-block" id="btnSaveWeights">Guardar pesos</button>
    </div>
    <div class="card">
      <h2>Datos</h2>
      <button class="btn btn-danger btn-block" id="btnReset">Borrar todos los datos</button>
    </div>
  `;
  document.getElementById("btnBack").onclick = () => render("home");
  document.getElementById("btnSaveWeights").onclick = () => {
    document.querySelectorAll("[data-wid]").forEach((inp) => {
      const id = inp.getAttribute("data-wid");
      state.exercises[id].weight = inp.value === "" ? null : Number(inp.value);
    });
    saveState();
    render("settings");
  };
  document.getElementById("btnForceDeload").onclick = () => {
    if (state.deload.active) {
      state.deload.active = false;
      state.deload.sessionsRemaining = 0;
    } else {
      state.deload.active = true;
      state.deload.sessionsRemaining = 4;
    }
    saveState();
    render("settings");
  };
  document.getElementById("btnReset").onclick = () => {
    if (confirm("Esto borra todo el progreso guardado en este dispositivo. ¿Continuar?")) {
      state = freshState();
      saveState();
      render("home");
    }
  };
}

// ---------------- init ----------------

function init() {
  state = loadState();
  saveState();
  render("home");

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch((err) => console.error("SW error:", err));
  }
}

document.addEventListener("DOMContentLoaded", init);
