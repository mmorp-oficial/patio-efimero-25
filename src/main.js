import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const container = document.getElementById("map");

// ── renderer / scene / camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#3186D6");

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
camera.position.set(12, 16, 50); // temporary; framing will override

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.5;
controls.minPolarAngle = Math.PI * 0.1;
controls.target.set(0, 0, 0);

// ── hover/click machinery
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickables = new Set();
let hovered = null;
let lastMaterialState = null;

function setCursorPointer(on) {
  renderer.domElement.style.cursor = on ? "pointer" : "default";
}

function highlight(mesh) {
  if (hovered === mesh) return;

  // restore previous
  if (hovered && lastMaterialState) {
    const m = hovered.material;
    if (m && m.emissive) {
      m.emissive.setHex(lastMaterialState.emissiveHex);
      m.emissiveIntensity = lastMaterialState.emissiveIntensity;
    }
  }
  hovered = mesh;
  lastMaterialState = null;

  // apply new
  const m = hovered?.material;
  if (m && m.emissive) {
    lastMaterialState = {
      emissiveHex: m.emissive.getHex(),
      emissiveIntensity: m.emissiveIntensity ?? 1,
    };
    m.emissive.setHex(0x222222);
    m.emissiveIntensity = 0.9;
  }
}

function clearHighlight() {
  if (hovered && lastMaterialState) {
    const m = hovered.material;
    if (m && m.emissive) {
      m.emissive.setHex(lastMaterialState.emissiveHex);
      m.emissiveIntensity = lastMaterialState.emissiveIntensity;
    }
  }
  hovered = null;
  lastMaterialState = null;
  setCursorPointer(false);
}

function findHouseId(node) {
  let cur = node;
  while (cur) {
    if (cur.userData?.houseId) return String(cur.userData.houseId);
    if (cur.name && /^casa\d+$/i.test(cur.name.replace(/[_-]/g, ""))) {
      return cur.name.toLowerCase().replace(/[_-]/g, "");
    }
    cur = cur.parent;
  }
  return null;
}

function onPointerMove(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const arr = clickables.size ? Array.from(clickables) : [];
  const hit = arr.length ? raycaster.intersectObjects(arr, true)[0] : null;

  if (hit?.object) {
    setCursorPointer(true);
    highlight(hit.object);
  } else {
    clearHighlight();
  }
}

function onClick() {
  if (!hovered) return;
  const id = findHouseId(hovered);
  if (id) window.location.href = `/splat.html?id=${encodeURIComponent(id)}`;
}

// ── load GLB (make sure your file is actually .glb at that path)
const loader = new GLTFLoader();
loader.load(
  "/models/mapaPuebla.glb",
  (gltf) => {
    const map = gltf.scene;

    map.traverse((o) => {
      if (o.isMesh) {
        o.material.side = THREE.FrontSide;
        o.receiveShadow = true;

        const id = findHouseId(o);
        if (id) {
          clickables.add(o);
        }
      }
    });

    scene.add(map);
    console.log("Loaded map:", map);

    // frame the scene
    const box = new THREE.Box3().setFromObject(map);
    const sizeV = box.getSize(new THREE.Vector3());
    const size = sizeV.length();
    const center = box.getCenter(new THREE.Vector3());

    controls.target.copy(center);

    const dist = Math.max(sizeV.x, sizeV.y, sizeV.z) * 1.2;
    camera.near = Math.max(0.01, size / 1000);
    camera.far = size * 10;
    camera.updateProjectionMatrix();

    resize(); // ensure the first layout is correct
  },
  (e) => console.log(`Loading map.glb: ${((e.loaded / e.total) * 100) | 0}%`),
  (err) => console.error("Failed to load /models/map.glb", err)
);

// ── events
renderer.domElement.addEventListener("mousemove", onPointerMove);
renderer.domElement.addEventListener("click", onClick);

// ── loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ── sizing to the right-hand panel
function resize() {
  const w = container.clientWidth || 600;
  const h = container.clientHeight || 400;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize", resize);
