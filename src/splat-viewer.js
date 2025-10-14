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
  casa5: "/splats/gs_Casa5_0.ply", // Add your actual file paths
  casa6: "/splats/gs_Casa6_0.ply",
  casa7: "/splats/gs_Casa7_0.ply",
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
  const tex = loader.load("/textures/sky_360.png", () => {
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
renderer.domElement.addEventListener("click", () => controls.lock());

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
    controls.moveForward(forward * speed);
    controls.moveRight(right * speed);
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
hint.textContent = "Click to look • WASD to move • Shift to sprint";
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

// Animate
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (controls.isLocked) move(dt);
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
