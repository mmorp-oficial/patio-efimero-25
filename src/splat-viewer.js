// src/splat-viewer.js
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { SplatMesh } from "@sparkjsdev/spark";

// Load Material Symbols font
const link = document.createElement("link");
link.rel = "stylesheet";
link.href =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
document.head.appendChild(link);

// Get house ID from URL
const params = new URLSearchParams(window.location.search);
const id = params.get("id") || "casa1";

const SPLATS = {
  casa1: "/splats/gs_Anahuac_0.ply",
  casa2: "/splats/gs_Etica_0.ply",
  casa3: "/splats/gs_Millar_0.ply",
  casa4: "/splats/gs_Ventana_0.ply",
  casa5: "/splats/gs_PatioHilos_0.ply",
  casa6: "/splats/gs_Biombo_0.ply",
  casa7: "/splats/gs_Gallito_0.ply",
};

// Patio information
const PATIO_INFO = {
  casa1: {
    name: "Tramas ocultas",
    author: "UNIVERSIDAD ANÁHUAC",
    description:
      "Tramas Ocultas reflexiona sobre los barrios fundacionales de Puebla y su papel en la memoria urbana. La instalación presenta catorce pendones que muestran la superposición de sus polígonos históricos y actuales, acompañados de símbolos que narran su transformación. Un manto translúcido los envuelve, evocando lo olvidado o silenciado. El proyecto propone ver la ciudad como un aula viva donde arquitectura y urbanismo se aprenden desde la experiencia. Es una invitación a reconocer las historias ocultas que conforman el paisaje patrimonial.",
  },
  casa2: {
    name: "La ética de los cuidados",
    author: "TEC DE MONTERREY",
    description:
      "La Ética de los Cuidados plantea una lectura urbana desde el feminismo y la interdependencia. Inspirada en la teoría del colectivo Punt 6, visibiliza las labores que sostienen la vida y suelen ser invisibles: alimentar, acompañar, limpiar. A través de tres piezas —sombras, anaglifo y estructuras germinadas—, la instalación recorre la transición entre lo doméstico y lo público. Propone entender los cuidados como infraestructura vital de la ciudad y reflexionar sobre cómo diseñar entornos que fomenten empatía, responsabilidad y comunidad.",
  },
  casa3: {
    name: "Millar",
    author: "ANDRÉS Y JOSÉ + MAJO MENDOZA",
    description:
      "Millar transforma el patio mediante mil ladrillos dispuestos como un relieve efímero. La instalación celebra la sencillez del material y su capacidad para generar emoción y encuentro. Cada ladrillo, humilde y repetido, refleja el trabajo humano que da forma a la ciudad. El agua, presente en el conjunto, recuerda los antiguos cauces y la relación entre materia y memoria. Millar es una lectura contemporánea del paisaje cultural de Puebla y un homenaje a lo elemental, a la belleza de lo simple y al valor del oficio en la construcción del espacio común.",
  },
  casa4: {
    name: "Una ventana hacia el pasado",
    author: "EMA",
    description:
      "Una ventana hacia el pasado propone mirar el paisaje urbano de Puebla desde la memoria. La pieza, concebida como un umbral simbólico, revela la superposición de tiempos y transforma la percepción del entorno. El maíz, elemento central, representa resistencia ante la pérdida de diversidad agrícola y cultural. Entre hojas y roca volcánica, el visitante experimenta un paisaje sonoro y táctil que evoca los campos ancestrales. La obra invita a reflexionar sobre nuestra relación con el territorio y la historia compartida que habita en la ciudad.",
  },
  casa5: {
    name: "Ciudad deshilada",
    author: "ARQUÍA",
    description:
      "Ciudad Deshilada reinterpreta la tradición textil poblana mediante hilos de hilaza almidonada suspendidos en aros de plata. La instalación genera un espacio envolvente que transforma la percepción del visitante, evocando el oficio artesanal que fue esencial en la economía y cultura local. Los hilos, suspendidos entre la firmeza y la fragilidad, simbolizan un legado que resiste pese al tiempo. El recorrido invita a redescubir la memoria de los artesanos y a valorar la delicadeza del trabajo manual como parte viva del patrimonio cultural.",
  },
  casa6: {
    name: "Biombo Urbano",
    author: "COLECTIVO ÁGORA",
    description:
      "Biombo Urbano crea una pausa dentro del tejido urbano. Hecho con madera quemada y telas teñidas, el espacio ofrece un tránsito entre luz y sombra, lo íntimo y lo colectivo. La obra rescata materiales comunes y los resignifica, proponiendo una reflexión sobre la circularidad y la sustentabilidad. Las texturas y aromas invitan a una experiencia sensorial que transforma la percepción del visitante. Este biombo es un umbral efímero que no separa, sino que conecta: un instante de silencio en medio del ritmo cotidiano de la ciudad.",
  },
  casa7: {
    name: "Paisajes urbanos trans(h)istóricos",
    author: "NOSOTRANS",
    description:
      "Paisajes Urbanos Trans(H)istóricos visibiliza las experiencias trans, feministas y disidentes dentro del paisaje urbano poblano. A través de símbolos como el reloj del Gallito o las placas de calle, la instalación reinterpreta la ciudad desde voces históricamente excluidas. Los materiales y colores evocan los espacios populares —tianguis, ferias, mercados— como parte esencial del patrimonio vivo. La obra invita a repensar la planeación urbana desde la inclusión, imaginando una ciudad que acoja todas las identidades y preserve sus múltiples memorias.",
  },
};

// Movement bounds for each house - adjust these values per location
const BOUNDS_CONFIG = {
  casa1: { minX: -0.65, maxX: 0.5, minZ: -1.8, maxZ: 0.05 },
  casa2: { minX: -1, maxX: 0.9, minZ: -1.6, maxZ: 0.1 },
  casa3: { minX: -1.7, maxX: 1.5, minZ: -4.2, maxZ: 0.2 },
  casa4: { minX: -3, maxX: 0.3, minZ: -0.7, maxZ: 0.7 },
  casa5: { minX: -2, maxX: 1.5, minZ: -0.75, maxZ: 0.75 },
  casa6: { minX: -1.2, maxX: 1.2, minZ: -1.2, maxZ: 1 },
  casa7: { minX: -1.5, maxX: 1, minZ: -0.5, maxZ: 1 },
};

// Cube dimensions for each house - adjust to fit the scene
const CUBE_CONFIG = {
  casa1: { width: 2, height: 5, depth: 5, y: 0 },
  casa2: { width: 5, height: 4, depth: 5, y: 0 },
  casa3: { width: 6, height: 4, depth: 9, y: 0 },
  casa4: { width: 10, height: 10, depth: 10, y: 0 },
  casa5: { width: 10, height: 10, depth: 10, y: 0 },
  casa6: { width: 10, height: 10, depth: 10, y: 0 },
  casa7: { width: 10, height: 10, depth: 10, y: 0 },
};

// Floor plan images for each house
const FLOOR_PLANS = {
  casa1: "/textures/plans/Anahuac_plan.png",
  casa2: "/textures/plans/Etica_plan.png",
  casa3: "/textures/plans/Millar_plan.png",
  casa4: "/textures/plans/Ventana_plan.png",
  casa5: "/textures/plans/PatioHilos_plan.png",
  casa6: "/textures/plans/Biombo_plan.png",
  casa7: "/textures/plans/Gallito_plan.png",
};

// Minimap player position offsets (in pixels from center 200,200)
const MINIMAP_OFFSETS = {
  casa1: { x: -50, y: 0 },
  casa2: { x: 110, y: 0 },
  casa3: { x: 0, y: 0 },
  casa4: { x: -30, y: -40 },
  casa5: { x: 0, y: 0 },
  casa6: { x: 0, y: 0 },
  casa7: { x: 20, y: 30},
};

// Rotation offset for minimap FOV triangle (in degrees)
const MINIMAP_ROTATION_OFFSET = {
  casa1: -90,
  casa2: -90,
  casa3: 90,
  casa4: 0,
  casa5: 180,
  casa6: 180,
  casa7: 0,
};

// Get bounds for current house
const houseBounds = BOUNDS_CONFIG[id] || BOUNDS_CONFIG.casa1;
const bounds = new THREE.Box3(
  new THREE.Vector3(houseBounds.minX, -10, houseBounds.minZ),
  new THREE.Vector3(houseBounds.maxX, 10, houseBounds.maxZ)
);

// Three.js setup
const container = document.getElementById("viewer") || document.body;

// Create loading screen
const loadingScreen = document.createElement("div");
loadingScreen.id = "loading-screen";
loadingScreen.innerHTML = `
  <div class="loading-content">
    <div class="spinner"></div>
    <div class="loading-text">CAMMARQ</div>
    <div class="loading-subtext">Construyendo el Futuro</div>
  </div>
`;
document.body.appendChild(loadingScreen);

// Add loading screen styles
const loadingStyles = document.createElement("style");
loadingStyles.textContent = `
  #loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    transition: opacity 0.5s ease;
  }

  #loading-screen.hidden {
    opacity: 0;
    pointer-events: none;
  }

  .loading-content {
    text-align: center;
    color: white;
  }

  .spinner {
    width: 60px;
    height: 60px;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 32px auto;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: 2px;
    margin-bottom: 8px;
    font-family: 'Manrope', sans-serif;
  }

  .loading-subtext {
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 1px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    display: inline-block;
    font-family: 'Manrope', sans-serif;
  }
`;
document.head.appendChild(loadingStyles);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(
  container.clientWidth || window.innerWidth,
  container.clientHeight || window.innerHeight
);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const CAMERA_HEIGHT = 0;
const camera = new THREE.PerspectiveCamera(
  70,
  (container.clientWidth || window.innerWidth) /
    (container.clientHeight || window.innerHeight),
  0.01,
  2000
);
camera.position.set(0, CAMERA_HEIGHT, 0);

// 360° background
{
  const loader = new THREE.TextureLoader();
  const tex = loader.load("/textures/sky_360.webp", () => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
    scene.environment = tex;
  });
}

// Load splat
const splat = new SplatMesh({
  url: SPLATS[id],
  onLoad: () => {
    console.log("Splat ready:", id);
    splat.rotation.x = Math.PI;

    // Hide loading screen after splat loads
    setTimeout(() => {
      loadingScreen.classList.add("hidden");
      setTimeout(() => {
        loadingScreen.remove();
      }, 500);
    }, 500);
  },
});
scene.add(splat);

// Create white cube without top face
const cubeConfig = CUBE_CONFIG[id] || CUBE_CONFIG.casa1;

// Create shader material for gradient alpha on walls
const vertexShader = `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float height;
  varying vec3 vPosition;
  void main() {
    // Calculate alpha based on height (1 at bottom, 0 at top)
    float alpha = 1.0 - (vPosition.y + height * 0.5) / height;
    alpha = clamp(alpha, 0.0, 1.0);
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;

const wallMaterial = new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: {
    height: { value: cubeConfig.height },
  },
  transparent: true,
  side: THREE.BackSide,
  depthWrite: false,
});

// Create materials - gradient for walls, solid for floor, invisible for top
const materials = [
  wallMaterial.clone(), // Right
  wallMaterial.clone(), // Left
  new THREE.MeshBasicMaterial({ visible: false }), // Top - invisible
  new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide }), // Bottom - solid
  wallMaterial.clone(), // Front
  wallMaterial.clone(), // Back
];

const cubeGeometry = new THREE.BoxGeometry(
  cubeConfig.width,
  cubeConfig.height,
  cubeConfig.depth
);
const cube = new THREE.Mesh(cubeGeometry, materials);
cube.position.y = cubeConfig.y;
scene.add(cube);

// Pointer-lock FPS controls
const controls = new PointerLockControls(camera, renderer.domElement);
renderer.domElement.addEventListener("click", () => {
  // Only lock pointer on desktop (not touch devices)
  if (!("ontouchstart" in window)) {
    controls.lock();
  }
});

// Touch controls for mobile
let touchStartX = 0;
let touchStartY = 0;
let touchMoveActive = false;

renderer.domElement.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchMoveActive = true;
  }
});

renderer.domElement.addEventListener(
  "touchmove",
  (e) => {
    if (touchMoveActive && e.touches.length === 1) {
      e.preventDefault();

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;

      const deltaX = touchX - touchStartX;
      const deltaY = touchY - touchStartY;

      // Rotate camera based on touch drag
      const sensitivity = 0.002;
      camera.rotation.y -= deltaX * sensitivity; // This controls left/right looking
      camera.rotation.x -= deltaY * sensitivity;

      // Clamp vertical rotation
      camera.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, camera.rotation.x)
      );

      touchStartX = touchX;
      touchStartY = touchY;
    }
  },
  { passive: false }
);

renderer.domElement.addEventListener("touchend", () => {
  touchMoveActive = false;
});

// Movement state
const keys = { w: false, s: false, a: false, d: false, shift: false };
addEventListener("keydown", (e) => {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      keys.w = true;
      break;
    case "KeyS":
    case "ArrowDown":
      keys.s = true;
      break;
    case "KeyA":
    case "ArrowLeft":
      keys.a = true;
      break;
    case "KeyD":
    case "ArrowRight":
      keys.d = true;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      keys.shift = true;
      break;
  }
});
addEventListener("keyup", (e) => {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      keys.w = false;
      break;
    case "KeyS":
    case "ArrowDown":
      keys.s = false;
      break;
    case "KeyA":
    case "ArrowLeft":
      keys.a = false;
      break;
    case "KeyD":
    case "ArrowRight":
      keys.d = false;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      keys.shift = false;
      break;
  }
});

// Movement
const clock = new THREE.Clock();
const BASE_SPEED = 0.9;
const SPRINT = 1.5;

function move(dt) {
  let forward = 0,
    right = 0;
  if (keys.w) forward += 1;
  if (keys.s) forward -= 1;
  if (keys.d) right += 1;
  if (keys.a) right -= 1;

  const mag = Math.hypot(forward, right);
  if (mag > 0) {
    forward /= mag;
    right /= mag;
    const speed = (keys.shift ? BASE_SPEED * SPRINT : BASE_SPEED) * dt;

    // For touch devices, move in camera's facing direction
    if ("ontouchstart" in window) {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();

      const right3D = new THREE.Vector3();
      right3D.crossVectors(camera.up, direction).normalize();

      camera.position.addScaledVector(direction, forward * speed);
      camera.position.addScaledVector(right3D, -right * speed); // Negated right for correct direction
    } else {
      controls.moveForward(forward * speed);
      controls.moveRight(right * speed);
    }
  }

  camera.position.y = CAMERA_HEIGHT;
}

function clampToBounds() {
  camera.position.x = THREE.MathUtils.clamp(
    camera.position.x,
    bounds.min.x,
    bounds.max.x
  );
  camera.position.z = THREE.MathUtils.clamp(
    camera.position.z,
    bounds.min.z,
    bounds.max.z
  );
  camera.position.y = CAMERA_HEIGHT;

  // Debug: Log player position
  console.log(
    `Position: x=${camera.position.x.toFixed(2)}, z=${camera.position.z.toFixed(
      2
    )}`
  );
}

// UI
const hint = document.createElement("div");
// Detect if touch device
const isTouchDevice = "ontouchstart" in window;
hint.innerHTML = isTouchDevice
  ? "Arrastra para mirar • Botones para moverte"
  : `
    <div style="margin-bottom: 8px;">
      <span style="background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 4px; font-size: 11px; border: 1px solid rgba(255,255,255,0.3);">ESC</span>
      para mostrar cursor
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="display: flex; gap: 2px;">
        <span style="background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 4px; font-size: 11px; border: 1px solid rgba(255,255,255,0.3); min-width: 24px; text-align: center;">W</span>
        <span style="background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 4px; font-size: 11px; border: 1px solid rgba(255,255,255,0.3); min-width: 24px; text-align: center;">A</span>
        <span style="background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 4px; font-size: 11px; border: 1px solid rgba(255,255,255,0.3); min-width: 24px; text-align: center;">S</span>
        <span style="background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 4px; font-size: 11px; border: 1px solid rgba(255,255,255,0.3); min-width: 24px; text-align: center;">D</span>
      </div>
      <span>o</span>
      <div style="display: flex; gap: 2px;">
        <span style="background: rgba(255,255,255,0.15); padding: 4px 6px; border-radius: 4px; font-size: 11px; border: 1px solid rgba(255,255,255,0.3); min-width: 24px; text-align: center;">↑</span>
        <span style="background: rgba(255,255,255,0.15); padding: 4px 6px; border-radius: 4px; font-size: 11px; border: 1px solid rgba(255,255,255,0.3); min-width: 24px; text-align: center;">←</span>
        <span style="background: rgba(255,255,255,0.15); padding: 4px 6px; border-radius: 4px; font-size: 11px; border: 1px solid rgba(255,255,255,0.3); min-width: 24px; text-align: center;">↓</span>
        <span style="background: rgba(255,255,255,0.15); padding: 4px 6px; border-radius: 4px; font-size: 11px; border: 1px solid rgba(255,255,255,0.3); min-width: 24px; text-align: center;">→</span>
      </div>
      <span>para moverte</span>
    </div>
  `;
Object.assign(hint.style, {
  position: "absolute",
  bottom: "12px",
  left: "12px",
  color: "#ddd",
  font: "12px/1.4 system-ui, sans-serif",
  opacity: "0.8",
  pointerEvents: "none",
});
document.body.appendChild(hint);

// Title overlay (bottom left)
const info = PATIO_INFO[id] || {
  name: "Patio Desconocido",
  author: "AUTOR PENDIENTE",
  description: "Sin descripción.",
};

const titleOverlay = document.createElement("div");
titleOverlay.innerHTML = `
  <div id="titleContent" style="transition: transform 0.3s ease;">
    <div style="font-size: 22px; opacity: 0.7; margin-bottom: 4px; letter-spacing: 0.5px;">Por ${info.author}</div>
    <div style="font-size: 32px; font-weight: 600; line-height: 1.2; display: flex; align-items: center; gap: 12px;">
      ${info.name}
      <button id="infoToggle" style="
        width: 36px;
        height: 36px;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        flex-shrink: 0;
        padding: 0;
      ">
        <span class="material-symbols-outlined" style="font-size: 24px;">expand_circle_up</span>
      </button>
    </div>
  </div>
  <div id="descriptionPanel" style="
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, margin-top 0.3s ease;
    margin-top: 0;
  ">
    <div style="
      padding: 16px;
      background: rgba(0, 0, 0, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      margin-top: 16px;
      backdrop-filter: blur(10px);
    ">
      <div style="font-size: 14px; line-height: 1.6; opacity: 0.9;">
        ${info.description}
      </div>
    </div>
  </div>
`;
Object.assign(titleOverlay.style, {
  position: "absolute",
  bottom: "96px",
  left: "12px",
  maxWidth: "600px",
  color: "#fff",
  font: "14px/1.4 system-ui, sans-serif",
  pointerEvents: "auto",
  textShadow: "0 2px 4px rgba(0,0,0,0.9)",
});
document.body.appendChild(titleOverlay);

// Toggle description functionality
setTimeout(() => {
  const toggleBtn = document.getElementById("infoToggle");
  const titleContent = document.getElementById("titleContent");
  const descPanel = document.getElementById("descriptionPanel");
  let isOpen = false;

  if (toggleBtn && titleContent && descPanel) {
    const icon = toggleBtn.querySelector(".material-symbols-outlined");

    toggleBtn.onmouseenter = () => {
      toggleBtn.style.background = "rgba(0, 0, 0, 0.9)";
      toggleBtn.style.transform = "scale(1.1)";
    };
    toggleBtn.onmouseleave = () => {
      toggleBtn.style.background = "rgba(0, 0, 0, 0.7)";
      toggleBtn.style.transform = "scale(1)";
    };

    toggleBtn.onclick = () => {
      isOpen = !isOpen;
      if (isOpen) {
        titleContent.style.transform = "translateY(-20px)";
        descPanel.style.maxHeight = "300px";
        descPanel.style.marginTop = "16px";
        icon.textContent = "expand_circle_down";
      } else {
        titleContent.style.transform = "translateY(0)";
        descPanel.style.maxHeight = "0";
        descPanel.style.marginTop = "0";
        icon.textContent = "expand_circle_up";
      }
    };
  }
}, 100);

const back = document.createElement("button");
back.textContent = "← Back";
Object.assign(back.style, {
  position: "absolute",
  top: "12px",
  left: "12px",
  padding: "8px 12px",
  zIndex: 10,
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: "6px",
  cursor: "pointer",
});
back.onclick = () => (window.location.href = "/");
document.body.appendChild(back);

// Floor plan HUD (top right)
const floorPlanPath = FLOOR_PLANS[id];
const minimapOffset = MINIMAP_OFFSETS[id] || { x: 0, y: 0 };

if (floorPlanPath) {
  const centerX = 200 + minimapOffset.x;
  const centerY = 200 + minimapOffset.y;

  const floorPlanHUD = document.createElement("div");
  floorPlanHUD.innerHTML = `
    <img src="${floorPlanPath}" alt="Floor Plan" style="
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    ">
    <div id="playerDot" style="
      position: absolute;
      top: 50%;
      left: 50%;
      width: 12px;
      height: 12px;
      background: #ED1E79;
      border: 2px solid white;
      border-radius: 50%;
      transform: translate(calc(-50% + ${minimapOffset.x}px), calc(-50% + ${
    minimapOffset.y
  }px));
      z-index: 2;
      box-shadow: 0 2px 4px rgba(0,0,0,0.5);
    "></div>
    <svg id="playerFOV" style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    " viewBox="0 0 400 400">
      <defs>
        <linearGradient id="fovGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style="stop-color:#ED1E79;stop-opacity:0.6" />
          <stop offset="100%" style="stop-color:#ED1E79;stop-opacity:0" />
        </linearGradient>
      </defs>
      <polygon id="fovTriangle" points="${centerX},${centerY} ${centerX - 30},${
    centerY - 60
  } ${centerX + 30},${centerY - 60}" 
        fill="url(#fovGradient)" 
        stroke="none"/>
    </svg>
  `;
  Object.assign(floorPlanHUD.style, {
    position: "absolute",
    top: "12px",
    right: "12px",
    width: "400px",
    height: "400px",
    background: "rgba(0, 0, 0, 0.7)",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "8px",
    padding: "8px",
    zIndex: 10,
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  });
  document.body.appendChild(floorPlanHUD);
}

// Update FOV triangle rotation
function updateMinimap() {
  const fovTriangle = document.getElementById("fovTriangle");
  const offset = MINIMAP_OFFSETS[id] || { x: 0, y: 0 };
  const rotationOffset = MINIMAP_ROTATION_OFFSET[id] || 0;
  const centerX = 200 + offset.x;
  const centerY = 200 + offset.y;

  if (fovTriangle && camera) {
    // Get camera's forward direction vector
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    // Calculate angle in XZ plane and reverse rotation direction
    const angle = Math.atan2(direction.x, direction.z);
    const rotationDegrees = -THREE.MathUtils.radToDeg(angle) + rotationOffset;

    fovTriangle.setAttribute(
      "transform",
      `rotate(${rotationDegrees} ${centerX} ${centerY})`
    );
  }
}

// Mobile touch controls (on-screen buttons)
if ("ontouchstart" in window) {
  const controlsContainer = document.createElement("div");
  Object.assign(controlsContainer.style, {
    position: "absolute",
    bottom: "60px",
    right: "20px",
    display: "grid",
    gridTemplateColumns: "50px 50px 50px",
    gridTemplateRows: "50px 50px",
    gap: "8px",
    zIndex: 10,
  });

  const buttonStyle = {
    background: "rgba(17, 17, 17, 0.8)",
    border: "1px solid #333",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "20px",
    cursor: "pointer",
    userSelect: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  };

  // Create movement buttons
  const buttons = [
    { key: "w", label: "↑", row: 1, col: 2 },
    { key: "a", label: "←", row: 2, col: 1 },
    { key: "s", label: "↓", row: 2, col: 2 },
    { key: "d", label: "→", row: 2, col: 3 },
  ];

  buttons.forEach(({ key, label, row, col }) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    Object.assign(btn.style, {
      ...buttonStyle,
      gridRow: row,
      gridColumn: col,
    });

    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      keys[key] = true;
      btn.style.background = "rgba(237, 30, 121, 0.8)";
    });

    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      keys[key] = false;
      btn.style.background = "rgba(17, 17, 17, 0.8)";
    });

    controlsContainer.appendChild(btn);
  });

  document.body.appendChild(controlsContainer);
}

// Animate
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();

  // Check if locked (desktop) or touch device
  const isTouchDevice = "ontouchstart" in window;
  if (controls.isLocked || isTouchDevice) {
    move(dt);
  }

  clampToBounds();
  updateMinimap(); // Update FOV indicator
  renderer.render(scene, camera);
});

// Resize
addEventListener("resize", () => {
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
