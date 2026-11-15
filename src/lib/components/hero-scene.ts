import * as THREE from 'three';

/** A decorative voxel orbit. The page remains usable when WebGL is unavailable. */
export function createHeroScene(host: HTMLElement, progress: { value: number }) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
  camera.position.z = 10;
  const orbit = new THREE.Group();
  scene.add(orbit);
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const light = new THREE.PointLight(0xff315c, 70);
  light.position.set(2, 3, 4);
  scene.add(light);

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const edges = new THREE.EdgesGeometry(geometry);
  const solid = new THREE.MeshStandardMaterial({ color: 0x60132b, metalness: 0.6, roughness: 0.35 });
  const wire = new THREE.LineBasicMaterial({ color: 0xff476b, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 15; i++) {
    const cube = new THREE.Group();
    cube.add(new THREE.Mesh(geometry, solid), new THREE.LineSegments(edges, wire));
    const angle = (i / 15) * Math.PI * 2;
    const radius = 2.6 + (i % 3) * 0.35;
    cube.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.8, Math.sin(i * 2) * 1.4);
    cube.rotation.set(i * 0.4, i * 0.7, i * 0.2);
    cube.scale.setScalar(0.14 + (i % 4) * 0.075);
    orbit.add(cube);
  }

  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resize.observe(host);
  let visible = false;
  let elapsed = 0;
  let previous = 0;
  const render = (time: number) => {
    elapsed += previous ? Math.min((time - previous) / 1000, 0.05) : 0;
    previous = time;
    orbit.rotation.y = elapsed * 0.07 + progress.value * 0.8;
    orbit.rotation.z = Math.sin(elapsed * 0.18) * 0.08 + progress.value * 0.3;
    orbit.position.y = progress.value * 0.6;
    orbit.children.forEach((cube, i) => {
      cube.rotation.x = elapsed * 0.14 + i;
      cube.rotation.y = elapsed * 0.2 + i * 0.7;
    });
    renderer.render(scene, camera);
  };
  const updateLoop = () => {
    previous = 0;
    renderer.setAnimationLoop(visible && !document.hidden ? render : null);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateLoop();
  });
  observer.observe(host);
  document.addEventListener('visibilitychange', updateLoop);

  return () => {
    resize.disconnect();
    observer.disconnect();
    document.removeEventListener('visibilitychange', updateLoop);
    renderer.setAnimationLoop(null);
    geometry.dispose();
    edges.dispose();
    solid.dispose();
    wire.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
