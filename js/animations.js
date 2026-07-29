// Animaciones de ejecución: figuras SVG minimalistas animadas por CSS.
// No dependen de red ni de una API externa (ExerciseDB, etc.) para que la
// app funcione 100% offline. Cada "animationType" mueve partes distintas
// de la misma figura base para sugerir el patrón de movimiento.

function buildFigureSVG(animationType) {
  return `
  <svg class="exanim anim-${animationType}" viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g class="p-rig">
      <line class="p-part p-legL" x1="60" y1="82" x2="42" y2="132"/>
      <line class="p-part p-legR" x1="60" y1="82" x2="78" y2="132"/>
      <line class="p-part p-spine" x1="60" y1="34" x2="60" y2="82"/>
      <line class="p-part p-armL" x1="60" y1="44" x2="34" y2="66"/>
      <line class="p-part p-armR" x1="60" y1="44" x2="86" y2="66"/>
      <circle class="p-part p-head" cx="60" cy="20" r="11"/>
    </g>
  </svg>`;
}

// Foto animada (crossfade entre posición inicial y final) tomada de una
// base de ejercicios de dominio público, guardada localmente en media/.
// Si un ejercicio no tiene foto mapeada, cae de nuevo al muñeco SVG.
function buildExerciseMedia(item) {
  if (!item.media) return buildFigureSVG(item.animationType || "core");
  const base = `media/${item.media}`;
  const alt = item.name.replace(/"/g, "");
  return `
  <div class="exphoto">
    <img class="frame frame0" src="${base}/0.jpg" alt="${alt}">
    <img class="frame frame1" src="${base}/1.jpg" alt="">
  </div>`;
}

// Lista de categorías válidas (debe coincidir con las keyframes en style.css)
const ANIMATION_TYPES = [
  "cardio",
  "core",
  "legpress",
  "squat",
  "legextension",
  "legcurl",
  "hipthrust",
  "calf",
  "press",
  "raise",
  "extension",
  "curl",
  "backextension",
  "abductor",
  "pull",
];
