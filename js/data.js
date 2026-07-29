// Base de datos de ejercicios del ciclo D1-D4 y calentamiento fijo.
// Este archivo define el estado INICIAL. Una vez que la app corre, el
// progreso real (pesos, reps, ciclo, deload) vive en localStorage.

const CYCLE_ORDER = ["D1", "D2", "D3", "D4"];

const DAY_TITLES = {
  D1: "Tren Inferior A (cuádriceps + glúteo)",
  D2: "Tren Superior A (empuje + bíceps)",
  D3: "Tren Inferior B (cadena posterior + glúteo)",
  D4: "Tren Superior B (tracción + bíceps)",
};

const GENERAL_WARNING =
  "Detener el ejercicio si hay dolor articular en rodilla izquierda o molestia en el pie izquierdo.";

const WARMUP = {
  title: "Calentamiento (todos los días)",
  items: [
    { id: "warm_cardio", name: "Cardio intensivo", detail: "15 min — bici fija o cinta a 10 km/h", animationType: "cardio", hasWeight: false },
    { id: "warm_abs", name: "Máquina de abdominales", detail: null, animationType: "core", hasWeight: true, defaultWeight: 60 },
    { id: "warm_obliques", name: "Máquina de oblicuos", detail: null, animationType: "core", hasWeight: true, defaultWeight: null },
    { id: "warm_glutes", name: "Máquina de glúteos", detail: null, animationType: "hipthrust", hasWeight: true, defaultWeight: null },
  ],
};

// category: 'lower' | 'upper' -> usada solo como referencia de incremento por defecto
// incrementKg: cuánto sube el peso al completar el tope de reps en todas las series
function ex(id, day, order, name, sets, repMin, repMax, defaultWeight, animationType, opts = {}) {
  return {
    id,
    day,
    order,
    name,
    sets,
    repMin,
    repMax,
    weight: defaultWeight,
    incrementKg: opts.incrementKg ?? (opts.category === "upper" ? 2 : 2.5),
    category: opts.category ?? "lower",
    animationType,
    note: opts.note ?? null,
    warning: opts.warning ?? null, // advertencia bloqueante antes de cargar peso
    skippable: opts.skippable ?? false,
    skipLabel: opts.skipLabel ?? null,
    hasWeight: opts.hasWeight ?? true,
    timeBased: opts.timeBased ?? false,
  };
}

const EXERCISES = [
  // ---------------- D1 — Tren Inferior A ----------------
  ex("d1_prensa45", "D1", 1, "Prensa 45°", 4, 8, 12, 80, "legpress", { category: "lower" }),
  ex("d1_hacksquat", "D1", 2, "Hack squat / sentadilla en máquina", 3, 10, 12, null, "squat", { category: "lower" }),
  ex("d1_extcuad", "D1", 3, "Extensión de cuádriceps", 3, 12, 15, null, "legextension", {
    category: "lower",
    note: "Controlá el rango de movimiento por la rodilla izquierda (reconstrucción de ligamentos).",
  }),
  ex("d1_curlfemsentado", "D1", 4, "Curl femoral sentado", 3, 12, 15, null, "legcurl", {
    category: "lower",
    note: "Priorizá isquiotibiales — compensación de rodilla izquierda.",
  }),
  ex("d1_hipthrust", "D1", 5, "Hip thrust", 3, 10, 12, null, "hipthrust", { category: "lower" }),
  ex("d1_gemelo", "D1", 6, "Gemelo sentado", 3, 15, 20, null, "calf", {
    category: "lower",
    skippable: true,
    skipLabel: "Omitir si molesta el pie izquierdo",
  }),
  ex("d1_core_rueda", "D1", 7, "Rueda abdominal / crunch en polea", 3, 10, 15, null, "core", { category: "lower" }),
  ex("d1_core_plancha", "D1", 8, "Plancha lateral", 3, null, null, null, "core", {
    category: "lower",
    note: "Series por tiempo (ej. 20-40s por lado) en vez de repeticiones.",
    hasWeight: false,
    timeBased: true,
  }),

  // ---------------- D2 — Tren Superior A ----------------
  ex("d2_pressinclinado", "D2", 1, "Press inclinado (mancuernas o máquina)", 4, 8, 12, null, "press", {
    category: "upper",
    note: "Prioridad 1 de la sesión.",
  }),
  ex("d2_pressplano", "D2", 2, "Press plano (máquina o mancuernas)", 3, 10, 12, 60, "press", { category: "upper" }),
  ex("d2_flypecho", "D2", 3, "Fly de pecho (ambas poleas)", 3, 10, 15, 20, "extension", {
    category: "upper",
    note: "Accesorio de pecho.",
  }),
  ex("d2_presshombro", "D2", 4, "Press de hombro", 3, 10, 12, 12, "press", { category: "upper" }),
  ex("d2_elevlaterales", "D2", 5, "Elevaciones laterales", 3, 12, 15, null, "raise", { category: "upper", incrementKg: 1 }),
  ex("d2_exttriceps", "D2", 6, "Extensión de tríceps en polea", 3, 10, 15, null, "extension", { category: "upper", incrementKg: 1 }),
  ex("d2_curlbicep", "D2", 7, "Curl de bíceps con mancuernas", 3, 10, 12, null, "curl", { category: "upper", incrementKg: 1 }),
  ex("d2_curlscott", "D2", 8, "Curl banco Scott o polea", 3, 12, 15, null, "curl", { category: "upper", incrementKg: 1 }),
  ex("d2_core_pallof", "D2", 9, "Pallof press", 3, 12, 15, null, "core", { category: "upper" }),
  ex("d2_core_piernas", "D2", 10, "Elevación de piernas colgado", 3, 8, 12, null, "core", { category: "upper" }),

  // ---------------- D3 — Tren Inferior B ----------------
  ex("d3_hipthrustbarra", "D3", 1, "Hip thrust con barra", 4, 8, 12, null, "hipthrust", {
    category: "lower",
    note: "Foco de progresión de la sesión.",
    warning:
      "Mantené la pelvis neutra: no hiperextiendas la zona lumbar en el tope del movimiento. Subí la barra con glúteo, no arqueando la espalda.",
  }),
  ex("d3_curlfemacostado", "D3", 2, "Curl femoral acostado", 3, 10, 12, null, "legcurl", { category: "lower" }),
  ex("d3_extlumbar", "D3", 3, "Extensión lumbar 45°", 3, 12, 15, null, "backextension", {
    category: "lower",
    warning:
      "Mantené la pelvis neutra: no hiperextiendas la zona lumbar en el tope del movimiento. Movimiento controlado, sin rebote.",
  }),
  ex("d3_prensastance", "D3", 4, "Prensa stance alto/ancho", 3, 10, 12, 80, "legpress", { category: "lower" }),
  ex("d3_curlfemsentado", "D3", 5, "Curl femoral sentado", 3, 12, 15, null, "legcurl", { category: "lower" }),
  ex("d3_abductor", "D3", 6, "Abductor en máquina", 3, 15, 20, null, "abductor", { category: "lower" }),
  ex("d3_core_mcgill", "D3", 7, "McGill Big 3 (curl-up, plancha lateral, bird-dog)", 3, null, null, null, "core", {
    category: "lower",
    note: "Series por tiempo/repeticiones bajas, técnica ante todo.",
    hasWeight: false,
    timeBased: true,
  }),
  ex("d3_core_hollow", "D3", 8, "Hollow body hold", 3, null, null, null, "core", {
    category: "lower",
    note: "Series por tiempo (ej. 15-30s).",
    hasWeight: false,
    timeBased: true,
  }),

  // ---------------- D4 — Tren Superior B ----------------
  ex("d4_jalonpecho", "D4", 1, "Jalón al pecho", 4, 8, 12, 45, "pull", { category: "upper" }),
  ex("d4_remosentado", "D4", 2, "Remo sentado en polea", 3, 10, 12, 30, "pull", { category: "upper" }),
  ex("d4_remopecho", "D4", 3, "Remo con apoyo de pecho", 3, 10, 12, null, "pull", { category: "upper" }),
  ex("d4_deltoideposterior", "D4", 4, "Deltoide posterior", 3, 12, 15, null, "raise", { category: "upper", incrementKg: 1 }),
  ex("d4_facepull", "D4", 5, "Face pull", 3, 15, 15, null, "raise", { category: "upper", incrementKg: 1 }),
  ex("d4_curlez", "D4", 6, "Curl barra Z", 4, 8, 12, null, "curl", {
    category: "upper",
    incrementKg: 1,
    note: "Foco de progresión — prioridad bíceps.",
  }),
  ex("d4_curlmartillo", "D4", 7, "Curl martillo o inclinado", 3, 10, 12, null, "curl", { category: "upper", incrementKg: 1 }),
  ex("d4_core_rueda", "D4", 8, "Rueda abdominal", 3, 10, 15, null, "core", { category: "upper" }),
  ex("d4_core_plancha", "D4", 9, "Plancha con toques de hombro", 3, null, null, null, "core", {
    category: "upper",
    note: "Series por tiempo o repeticiones de toques.",
    hasWeight: false,
    timeBased: true,
  }),
];

function exercisesForDay(day) {
  return EXERCISES.filter((e) => e.day === day).sort((a, b) => a.order - b.order);
}
