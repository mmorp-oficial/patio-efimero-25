import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const container = document.getElementById("map");

// Grain Shader
const grainShader = `
uniform float iTime;
vec2 iResolution = vec2(10.0);
 
#define SHOW_NOISE 0
#define SRGB 0
#define BLEND_MODE 0
#define SPEED 0.4
#define INTENSITY 0.07
#define MEAN 0.0
#define VARIANCE 0.45
 
vec3 channel_mix(vec3 a, vec3 b, vec3 w) {
    return vec3(mix(a.r, b.r, w.r), mix(a.g, b.g, w.g), mix(a.b, b.b, w.b));
}
 
float gaussian(float z, float u, float o) {
    return (1.0 / (o * sqrt(2.0 * 3.1415))) * exp(-(((z - u) * (z - u)) / (2.0 * (o * o))));
}
 
vec3 madd(vec3 a, vec3 b, float w) {
    return a + a * b * w;
}
 
vec3 screen(vec3 a, vec3 b, float w) {
    return mix(a, vec3(1.0) - (vec3(1.0) - a) * (vec3(1.0) - b), w);
}
 
vec3 overlay(vec3 a, vec3 b, float w) {
    return mix(a, channel_mix(
        2.0 * a * b,
        vec3(1.0) - 2.0 * (vec3(1.0) - a) * (vec3(1.0) - b),
        step(vec3(0.5), a)
    ), w);
}
 
vec3 soft_light(vec3 a, vec3 b, float w) {
    return mix(a, pow(a, pow(vec3(2.0), 2.0 * (vec3(0.5) - b))), w);
}
 
void main() {
    vec2 coord = gl_FragCoord.xy;
    vec2 ps = vec2(1.0) / iResolution.xy;
    vec2 uv = coord * ps;
    vec4 color = vec4(0.);
    #if SRGB
    color = pow(color, vec4(2.2));
    #endif
 
    float t = iTime * float(SPEED);
    float seed = dot(uv, vec2(12.9898, 78.233));
    float noise = fract(sin(seed) * 43758.5453 + t);
    noise = gaussian(noise, float(MEAN), float(VARIANCE) * float(VARIANCE));
 
    #if SHOW_NOISE
    color = vec4(noise);
    #else    
    float w = float(INTENSITY);
    vec3 grain = vec3(noise) * (1.0 - color.rgb);
 
    #if BLEND_MODE == 0
    color.rgb += grain * w;
    #elif BLEND_MODE == 1
    color.rgb = screen(color.rgb, grain, w);
    #elif BLEND_MODE == 2
    color.rgb = overlay(color.rgb, grain, w);
    #elif BLEND_MODE == 3
    color.rgb = soft_light(color.rgb, grain, w);
    #elif BLEND_MODE == 4
    color.rgb = max(color.rgb, grain * w);
    #endif
 
    #if SRGB
    color = pow(color, vec4(1.0 / 2.2));
    #endif
    #endif
    gl_FragColor = vec4(1.,1.,1.,color.r);
}
`;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#3186D6");

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
camera.position.set(12, 16, 50);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI * 0.5;
controls.minPolarAngle = Math.PI * 0.1;
controls.target.set(0, 0, 0);
controls.screenSpacePanning = false; // Horizontal panning only

// Create separate scene and camera for grain overlay
const grainScene = new THREE.Scene();
const grainCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const grainMaterial = new THREE.ShaderMaterial({
  fragmentShader: grainShader,
  transparent: true,
  depthTest: false,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    iTime: { value: 0 },
  },
});

const grainMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), grainMaterial);
grainScene.add(grainMesh);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Hover/click machinery
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickables = new Set();
let hovered = null;
let lastMaterialState = null;

// Location markers data
const locationMarkers = [
  {
    id: "casa1",
    number: 1,
    name: "Casa Presno",
    position: new THREE.Vector3(0, 0, 0),
  },
  {
    id: "casa2",
    number: 2,
    name: "Gerencia del Centro Histórico",
    position: new THREE.Vector3(0, 0, 0),
  },
  {
    id: "casa3",
    number: 3,
    name: "Casa Sacristía",
    position: new THREE.Vector3(0, 0, 0),
  },
  {
    id: "casa4",
    number: 4,
    name: "Patio Malicia",
    position: new THREE.Vector3(0, 0, 0),
  },
  {
    id: "casa5",
    number: 5,
    name: "Patio Anónimo",
    position: new THREE.Vector3(0, 0, 0),
  },
  {
    id: "casa6",
    number: 6,
    name: "Patio Mucho Bueno",
    position: new THREE.Vector3(0, 0, 0),
  },
  {
    id: "casa7",
    number: 7,
    name: "Casa Sabino",
    position: new THREE.Vector3(0, 0, 0),
  },
];

const markerElements = new Map();

// Create marker HTML elements
locationMarkers.forEach((marker) => {
  const el = document.createElement("div");
  el.className = "location-marker hidden";
  el.textContent = marker.number;
  el.dataset.houseId = marker.id;

  el.addEventListener("click", () => {
    window.location.href = `/splat.html?id=${encodeURIComponent(marker.id)}`;
  });

  container.appendChild(el);
  markerElements.set(marker.id, { element: el, position: marker.position });
});

// Update marker positions based on 3D coordinates
function updateMarkers() {
  markerElements.forEach((marker, id) => {
    const pos = marker.position.clone();
    pos.y += 5; // Move markers up by 2 units
    pos.project(camera);

    // Convert to screen space
    const x = (pos.x * 0.5 + 0.5) * container.clientWidth;
    const y = (pos.y * -0.5 + 0.5) * container.clientHeight;

    // Check if marker is in front of camera
    const isVisible = pos.z < 1;

    marker.element.style.left = `${x}px`;
    marker.element.style.top = `${y}px`;
    marker.element.style.transform = "translate(-50%, -50%)";

    if (isVisible) {
      marker.element.classList.remove("hidden");
    } else {
      marker.element.classList.add("hidden");
    }
  });
}

function setCursorPointer(on) {
  renderer.domElement.style.cursor = on ? "pointer" : "default";
}

function highlight(mesh) {
  if (hovered === mesh) return;

  // Restore previous
  if (hovered && lastMaterialState) {
    restoreMaterial(hovered, lastMaterialState);
  }
  hovered = mesh;
  lastMaterialState = null;

  // Apply new highlight
  if (hovered) {
    const materials = Array.isArray(hovered.material)
      ? hovered.material
      : [hovered.material];

    lastMaterialState = materials.map((m) => ({
      colorHex: m.color.getHex(),
    }));

    materials.forEach((m) => {
      // Brighten the color for highlight
      const currentColor = m.color.getHex();
      m.color.setHex(Math.min(currentColor + 0x333333, 0xffffff));
    });
  }
}

function clearHighlight() {
  if (hovered && lastMaterialState) {
    restoreMaterial(hovered, lastMaterialState);
  }
  hovered = null;
  lastMaterialState = null;
  setCursorPointer(false);
}

function restoreMaterial(mesh, state) {
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  materials.forEach((m, i) => {
    if (state[i]) {
      m.color.setHex(state[i].colorHex);
    }
  });
}

// Find house ID from mesh or its parents
function findHouseId(node) {
  let cur = node;
  while (cur) {
    // Check userData first
    if (cur.userData?.houseId) {
      return String(cur.userData.houseId);
    }

    // Check name patterns: casa1, casa_1, Casa1, etc.
    if (cur.name) {
      const normalized = cur.name.toLowerCase().replace(/[_-\s]/g, "");
      const match = normalized.match(/^casa(\d+)$/);
      if (match) {
        return `casa${match[1]}`;
      }
    }

    cur = cur.parent;
  }
  return null;
}

// Fix problematic materials
function fixMaterial(material) {
  // Use MeshBasicMaterial to avoid shader uniform issues
  const newMat = new THREE.MeshBasicMaterial();

  try {
    // Priority 1: Copy the texture map (your color palette)
    if (material.map) {
      // Check if texture is valid
      if (material.map.image && material.map.image.complete !== false) {
        newMat.map = material.map;
        newMat.map.needsUpdate = true;
        newMat.map.colorSpace = THREE.SRGBColorSpace;
      } else {
        console.warn("Invalid texture found, using color fallback");
        newMat.color.set(material.color || 0xaaaaaa);
      }
    } else {
      // No texture, use color
      if (material.color) {
        newMat.color.copy(material.color);
      } else {
        newMat.color.set(0xaaaaaa);
      }
    }

    // Copy opacity settings
    newMat.opacity = material.opacity ?? 1;
    newMat.transparent = material.transparent ?? false;
  } catch (e) {
    console.warn("Error copying material properties:", e);
    newMat.color.set(0xaaaaaa);
  }

  // Set safe defaults
  newMat.side = THREE.FrontSide;

  return newMat;
}

function onPointerMove(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const arr = Array.from(clickables);
  const intersects = arr.length ? raycaster.intersectObjects(arr, true) : [];

  if (intersects.length > 0) {
    const hit = intersects[0];
    setCursorPointer(true);
    highlight(hit.object);
  } else {
    clearHighlight();
  }
}

function onClick() {
  if (!hovered) return;

  const id = findHouseId(hovered);
  if (id) {
    console.log(`Navigating to splat view for: ${id}`);
    window.location.href = `/splat.html?id=${encodeURIComponent(id)}`;
  } else {
    console.warn("Clicked object has no house ID:", hovered.name);
  }
}

// Load the GLB map
const loader = new GLTFLoader();
loader.load(
  "/models/mapaPuebla.glb",
  (gltf) => {
    const map = gltf.scene;

    console.log("Map loaded, analyzing structure...");

    // Traverse and setup clickable houses
    map.traverse((o) => {
      if (o.isMesh) {
        try {
          // Replace ALL materials with fresh ones
          if (Array.isArray(o.material)) {
            o.material = o.material.map((mat) => fixMaterial(mat));
          } else if (o.material) {
            o.material = fixMaterial(o.material);
          } else {
            // Create default material if none exists
            o.material = new THREE.MeshBasicMaterial({
              color: 0xaaaaaa,
              side: THREE.FrontSide,
            });
          }

          o.receiveShadow = true;
          o.castShadow = true;

          // Check if this mesh represents a house
          const id = findHouseId(o);
          if (id) {
            clickables.add(o);
            console.log(`Found clickable house: ${o.name} -> ${id}`);
          }
        } catch (error) {
          console.error(`Error processing mesh ${o.name}:`, error);
        }
      }
    });

    scene.add(map);
    console.log(
      `Map added to scene. Found ${clickables.size} clickable houses.`
    );

    // Update marker positions based on actual house positions
    clickables.forEach((mesh) => {
      const id = findHouseId(mesh);
      if (id && markerElements.has(id)) {
        // Get the world position of the mesh
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());

        // Update marker position
        markerElements.get(id).position.copy(center);
        console.log(`Updated marker position for ${id}:`, center);
      }
    });

    // Frame the scene properly
    const box = new THREE.Box3().setFromObject(map);
    const sizeV = box.getSize(new THREE.Vector3());
    const size = sizeV.length();
    const center = box.getCenter(new THREE.Vector3());

    controls.target.copy(center);

    // Position camera for good initial view
    const maxDim = Math.max(sizeV.x, sizeV.y, sizeV.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5;

    camera.position.set(center.x, center.y + maxDim * 0.3, center.z + cameraZ);
    camera.lookAt(center);

    camera.near = size / 100;
    camera.far = size * 10;
    camera.updateProjectionMatrix();

    controls.update();
    resize();
  },
  (progress) => {
    const percent = ((progress.loaded / progress.total) * 100) | 0;
    console.log(`Loading map: ${percent}%`);
  },
  (error) => {
    console.error("Failed to load map:", error);
    alert("Error loading 3D map. Please check console for details.");
  }
);

// Event listeners
renderer.domElement.addEventListener("mousemove", onPointerMove);
renderer.domElement.addEventListener("click", onClick);

// Animation loop
let renderError = false;

function animate() {
  requestAnimationFrame(animate);

  // Update grain shader time
  grainMaterial.uniforms.iTime.value = performance.now() * 0.001;

  if (!renderError) {
    try {
      controls.update();

      // Update marker positions
      updateMarkers();

      // Render main scene first
      renderer.autoClear = false;
      renderer.clear();
      renderer.render(scene, camera);

      // Render grain overlay on top
      renderer.render(grainScene, grainCamera);
    } catch (error) {
      renderError = true;
      console.error("Render error:", error);
      console.log("Attempting to fix materials...");

      // Try to fix materials on the fly
      scene.traverse((o) => {
        if (o.isMesh && o.material) {
          try {
            const newMat = new THREE.MeshBasicMaterial({
              color: o.material.color || 0xcccccc,
              map: o.material.map || null,
            });
            o.material.dispose();
            o.material = newMat;
          } catch (e) {
            // Ignore individual failures
          }
        }
      });

      renderError = false;
    }
  }
}
animate();

// Resize handling
function resize() {
  const w = container.clientWidth || 600;
  const h = container.clientHeight || 400;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  updateMarkers();
}
resize();
window.addEventListener("resize", resize);
