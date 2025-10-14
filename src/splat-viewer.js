// src/splat-viewer.js
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { SplatMesh } from "@sparkjsdev/spark";

// Get house ID from URL
const params = new URLSearchParams(window.location.search);
const id = params.get("id") || "casa1";

const SPLATS = {
  casa1: "/splats/gs_Anahuac_0.ply",
  casa2: "/splats/gs_Etica_0.ply",
  casa3: "/splats/gs_Millar_0.ply",
  casa4: "/splats/gs_Ventana_0.ply",
  casa5: "/splats/gs_PatioHilos_0.ply",
  casa6: "/splats/gs_Casa6_0.ply", // Add your actual file path
  casa7: "/splats/gs_Casa7_0.ply",
};

// Patio information
const PATIO_INFO = {
  casa1: { name: "Tramas ocultas", author: "UNIVERSIDAD ANÁHUAC" },
  casa2: { name: "La ética de los cuidados", author: "TEC DE MONTERREY" },
  casa3: { name: "Millar", author: "ANDRÉS Y JOSÉ + MAJO MENDOZA" },
  casa4: { name: "Una ventana hacia el pasado", author: "EMA" },
  casa5: { name: "Ciudad deshilada", author: "ARQUÍA" },
  casa6: { name: "Paisajes urbanos trans(h)istóricos", author: "NOSOTRANS" },
  casa7: { name: "Biombo Urbano", author: "COLECTIVO ÁGORA" },
};

// Three.js setup
const container = document.getElementById("viewer") || document.body;

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
  },
});
scene.add(splat);

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
      camera.rotation.y -= deltaX * sensitivity;
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
      camera.position.addScaledVector(right3D, right * speed);
    } else {
      controls.moveForward(forward * speed);
      controls.moveRight(right * speed);
    }
  }

  camera.position.y = CAMERA_HEIGHT;
}

// Bounds
const bounds = new THREE.Box3(
  new THREE.Vector3(-50, -10, -50),
  new THREE.Vector3(50, 10, 50)
);
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
}

// UI
const hint = document.createElement("div");
// Detect if touch device
const isTouchDevice = "ontouchstart" in window;
hint.textContent = isTouchDevice
  ? "Arrastra para mirar • Botones para moverte"
  : "Click para mirar • WASD para moverte por el patio";
Object.assign(hint.style, {
  position: "absolute",
  bottom: "12px",
  left: "12px",
  color: "#ddd",
  font: "12px/1.2 system-ui, sans-serif",
  opacity: "0.8",
  pointerEvents: "none",
});
document.body.appendChild(hint);

// Title overlay (bottom left like Luma)
const info = PATIO_INFO[id] || {
  name: "Patio Desconocido",
  author: "AUTOR PENDIENTE",
};

const titleOverlay = document.createElement("div");
titleOverlay.innerHTML = `
  <div style="font-size: 22px; opacity: 0.7; margin-bottom: 4px; letter-spacing: 0.5px;">Por ${info.author}</div>
  <div style="font-size: 32px; font-weight: 600; line-height: 1.2;">${info.name}</div>
`;
Object.assign(titleOverlay.style, {
  position: "absolute",
  bottom: "48px",
  left: "12px",
  color: "#fff",
  font: "14px/1.4 system-ui, sans-serif",
  pointerEvents: "none",
  textShadow: "0 2px 4px rgba(0,0,0,0.9)",
});
document.body.appendChild(titleOverlay);

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
