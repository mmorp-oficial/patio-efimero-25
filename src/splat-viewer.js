// src/splat-viewer.js
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js"; // used in Option B
import { SplatMesh } from "@sparkjsdev/spark";

// ── which splat?
const params = new URLSearchParams(window.location.search);
const id = params.get("id") || "casa1";

const SPLATS = {
  /* casa1: "/splats/casa1.spz",
  casa2: "/splats/casa2.spz",
  casa3: "/splats/casa3.spz",
  casa4: "/splats/casa4.spz", */
  // in splat-viewer.js, replace url with:
  casa1: "/splats/gs_Anahuac_0.ply",
  casa2: "/splats/gs_Etica_0.ply",
  casa3: "/splats/gs_Millar_0.ply",
  casa4: "/splats/gs_Ventana_0.ply",
};

// ── three setup
const container = document.getElementById("viewer") || document.body;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(
  container.clientWidth || window.innerWidth,
  container.clientHeight || window.innerHeight
);
// IMPORTANT: newer three -> use SRGBColorSpace (not sRGBEncoding)
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

/* ------------------------------
   Option A) 360° JPG/PNG background
   Put your file at: /public/textures/sky_360.jpg
--------------------------------*/
{
  const loader = new THREE.TextureLoader();
  const tex = loader.load("/textures/sky_360.png", () => {
    // equirectangular mapping
    tex.mapping = THREE.EquirectangularReflectionMapping;
    // color management (new API)
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
    // If you want PBR meshes to be lit by the sky:
    scene.environment = tex;
  });
}

/* ------------------------------
   Option B) HDRI background+lighting (comment Option A block above if you enable this)
   Put your HDR at: /public/hdr/studio_small_09_2k.hdr
--------------------------------
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  new RGBELoader()
    .setPath('/hdr/')
    .load('studio_small_09_2k.hdr', (hdr) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;

      // show the HDR as the visible background
      scene.background = hdr;

      // use a filtered envmap for PBR lighting
      const envMap = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = envMap;

      hdr.dispose?.();
      pmrem.dispose();
    });
}
*/

// ── load splat
const splat = new SplatMesh({
  url: SPLATS[id],
  onLoad: () => {
    console.log("Splat ready:", id);
    // If it looks upside down, flip it:
    splat.rotation.x = Math.PI; // 180° around X
  },
});
scene.add(splat);

// ── Pointer-lock FPS controls
const controls = new PointerLockControls(camera, renderer.domElement);
renderer.domElement.addEventListener("click", () => controls.lock());

// ── Movement state
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

// ── XZ-only movement via PointerLockControls helpers
const clock = new THREE.Clock();
const BASE_SPEED = .9; // m/s
const SPRINT = 1.5; // multiplier

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

  // lock to plane
  camera.position.y = CAMERA_HEIGHT;
}

// optional bounds
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

// UI: hint + back
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

// animate
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (controls.isLocked) move(dt);
  clampToBounds();
  renderer.render(scene, camera);
});

// resize
addEventListener("resize", () => {
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
