/* Lightweight cover preview using the current tower assembly assets. */
(() => {
  'use strict';
  const canvasHost = document.getElementById('coverCanvas');
  const status = document.getElementById('previewStatus');
  const label = document.getElementById('moduleLabel');
  const rotateButton = document.getElementById('rotatePreview');
  const explodeButton = document.getElementById('explodePreview');
  const wireButton = document.getElementById('wirePreview');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rotating = !reducedMotion;
  let expanded = false;
  let wireframe = false;
  let expansion = 0;
  let lastTime = 0;
  let active = true;
  let dragging = null;
  let frame;
  let observer;
  let viewportObserver;
  let previewVisible = false;
  let scrolling = false;
  let scrollTimer;
  let onWindowScroll;
  let onDocumentVisibility;
  let renderer;
  const abort = new AbortController();
  const moduleGroups = [];

  function updateRotationButton() {
    rotateButton.setAttribute('aria-pressed', String(rotating));
    rotateButton.innerHTML = rotating ? '暂停环绕 <span>Ⅱ</span>' : '自动环绕 <span>↻</span>';
  }
  updateRotationButton();

  async function loadJson(path) {
    const response = await fetch(path, { signal: abort.signal });
    if (!response.ok) throw new Error('Preview metadata unavailable');
    return response.json();
  }

  async function readGeometry(spec) {
    const output = new Uint8Array(spec.bytes);
    let offset = 0;
    for (const chunk of spec.chunks) {
      const response = await fetch(chunk.url, { signal: abort.signal });
      if (!response.ok) throw new Error('Preview geometry unavailable');
      const bytes = new Uint8Array(await response.arrayBuffer());
      const compressed = bytes[0] === 31 && bytes[1] === 139;
      const stream = new Blob([bytes]).stream();
      const decoded = await new Response(compressed ? stream.pipeThrough(new DecompressionStream('gzip')) : stream).arrayBuffer();
      if (decoded.byteLength !== chunk.rawBytes || offset + decoded.byteLength > output.length) throw new Error('Invalid geometry size');
      output.set(new Uint8Array(decoded), offset);
      offset += decoded.byteLength;
    }
    if (offset !== output.length) throw new Error('Incomplete geometry');
    return output.buffer;
  }

  function makeGeometry(module, spec, raw) {
    const originalParts = new Map(module.parts.map(part => [part.id, part]));
    const positions = new Float32Array(spec.geometry.vertices * 3);
    const normals = new Int16Array(spec.geometry.vertices * 3);
    const indices = new Uint32Array(spec.geometry.indices);
    for (const part of spec.parts) {
      const original = originalParts.get(part.id);
      const count = part.vertexCount * 3;
      const quantized = new Uint16Array(raw, part.stream.p, count);
      const sourceNormals = new Int16Array(raw, part.stream.n, count);
      const sourceIndices = part.stream.width === 2
        ? new Uint16Array(raw, part.stream.i, part.indexCount)
        : new Uint32Array(raw, part.stream.i, part.indexCount);
      for (let i = 0; i < count; i++) {
        const axis = i % 3;
        positions[part.vertexStart * 3 + i] = original.min[axis] + quantized[i] * original.step[axis];
      }
      normals.set(sourceNormals, part.vertexStart * 3);
      for (let i = 0; i < sourceIndices.length; i++) indices[part.indexStart + i] = sourceIndices[i] + part.vertexStart;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3, true));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    return geometry;
  }

  async function start() {
    if (!window.THREE || !window.DecompressionStream) throw new Error('Preview unavailable');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .9;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', '铁塔预览，拖动或按左右方向键旋转。完整探索请点击开始三维探索。');
    canvasHost.append(renderer.domElement);
    const canvas = renderer.domElement;
    const scene = new THREE.Scene();
    const model = new THREE.Group();
    scene.add(model);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc7ced6, 1.35));
    for (const [position, color, intensity] of [ [[-500,-500,900],0xd9eee5,2.2], [[400,400,500],0x72bcb2,2], [[100,-100,-200],0xf0a578,.8] ]) {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(...position);
      scene.add(light);
    }
    const camera = new THREE.PerspectiveCamera(33, 1, 1, 7000);
    camera.up.set(0, 0, 1);
    const [data, overview, lineData] = await Promise.all([
      loadJson('assets/model.json'), loadJson('assets/lod/manifest-v26.json'), loadJson('assets/lines.json')
    ]);
    const bounds = new THREE.Box3();
    data.modules.forEach(module => bounds.union(new THREE.Box3(new THREE.Vector3(...module.bounds[0]), new THREE.Vector3(...module.bounds[1]))));
    const center = bounds.getCenter(new THREE.Vector3());
    const height = bounds.max.z - bounds.min.z;
    const lineMap = new Map();
    for (const line of lineData.lines) {
      const id = Number(line.partId.match(/^module(\d+)-/)[1]);
      if (!lineMap.has(id)) lineMap.set(id, []);
      const points = line.points;
      for (let i = 1; i < points.length; i++) lineMap.get(id).push(...points[i-1], ...points[i]);
    }
    for (const module of data.modules) {
      const group = new THREE.Group();
      group.position.set(...module.translation).sub(center);
      group.userData = { module, initial: group.position.clone() };
      model.add(group);
      moduleGroups.push(group);
      const vertices = lineMap.get(module.id) || [];
      const translation = module.translation;
      const localVertices = vertices.map((value, index) => value - translation[index % 3]);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(localVertices, 3));
      const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x91c7b1, transparent: true, opacity: .7 }));
      lines.userData.module = module;
      group.add(lines);
      group.userData.lines = lines;
    }
    model.rotation.z = -.55;
    let fitDistance = 1;
    function resize() {
      const width = canvasHost.clientWidth;
      const viewHeight = canvasHost.clientHeight;
      renderer.setSize(width, viewHeight);
      camera.aspect = width / viewHeight;
      const distance = height / (2 * Math.tan(THREE.MathUtils.degToRad(16.5))) * Math.max(1.3, .6 / camera.aspect);
      fitDistance = distance;
      camera.position.set(0, -distance, height * .06);
      camera.lookAt(0, 0, height * .025);
      camera.updateProjectionMatrix();
      requestRender();
    }
    observer = new ResizeObserver(resize);
    observer.observe(canvasHost);
    resize();
    document.body.classList.add('model-ready');
    status.textContent = '实时三维预览 / 拖动即可旋转';
    [rotateButton, explodeButton, wireButton].forEach(button => button.disabled = false);
    rotateButton.onclick = () => { rotating = !rotating; updateRotationButton(); requestRender(); };
    explodeButton.onclick = () => { expanded = !expanded; explodeButton.setAttribute('aria-pressed', String(expanded)); explodeButton.innerHTML = expanded ? '合拢模块 <span>⊟</span>' : '展开模块 <span>⊞</span>'; requestRender(); };
    wireButton.onclick = () => {
      wireframe = !wireframe;
      wireButton.setAttribute('aria-pressed', String(wireframe));
      wireButton.innerHTML = wireframe ? '实体模型 <span>◇</span>' : '结构线 <span>⌘</span>';
      for (const group of moduleGroups) {
        if (group.userData.mesh) group.userData.mesh.visible = !wireframe;
        group.userData.lines.material.opacity = wireframe ? .95 : .26;
      }
      requestRender();
    };
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 2;
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
      rotating = false; updateRotationButton();
      canvas.setPointerCapture(event.pointerId);
    });
    let lastPickTime = 0;
    canvas.addEventListener('pointermove', event => {
      if (dragging) {
        model.rotation.z += (event.clientX - dragging.x) * .006;
        model.rotation.x = THREE.MathUtils.clamp(model.rotation.x + (event.clientY - dragging.y) * .002, -.22, .22);
        dragging.x = event.clientX; dragging.y = event.clientY;
        requestRender();
        return;
      }
      if (!previewVisible || performance.now() - lastPickTime < 50) return;
      lastPickTime = performance.now();
      const rect = canvas.getBoundingClientRect();
      const pointer = new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1);
      raycaster.setFromCamera(pointer, camera);
      const targets = moduleGroups.map(group => wireframe || !group.userData.mesh ? group.userData.lines : group.userData.mesh);
      const hit = raycaster.intersectObjects(targets, false)[0];
      label.textContent = hit ? `${hit.object.userData.module.name} · ${hit.object.userData.module.role}` : '结构全景';
      for (const group of moduleGroups) {
        const mesh = group.userData.mesh;
        if (mesh) mesh.material.emissive.setHex(hit?.object.userData.module.id === group.userData.module.id ? 0x24483a : 0x000000);
      }
      requestRender();
    });
    function endDrag() { dragging = null; requestRender(); }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('lostpointercapture', endDrag);
    canvas.addEventListener('pointerleave', () => {
      label.textContent = '结构全景';
      for (const group of moduleGroups) group.userData.mesh?.material.emissive.setHex(0x000000);
      requestRender();
    });
    canvas.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); rotating = false; updateRotationButton();
      model.rotation.z += event.key === 'ArrowLeft' ? -.12 : .12;
      requestRender();
    });
    function requestRender() {
      if (!active || !previewVisible || document.hidden || scrolling) {
        canvas.dataset.rendering = 'paused';
        return;
      }
      if (frame === undefined) frame = requestAnimationFrame(render);
    }
    function render(time) {
      frame = undefined;
      if (!active || !previewVisible || document.hidden || scrolling) return;
      // The cover is a preview. Keep its automatic motion at 30 fps.
      if (lastTime && time - lastTime < 1000 / 30) { requestRender(); return; }
      const delta = lastTime ? Math.min((time-lastTime)/1000, .05) : 1/30;
      lastTime = time;
      if (rotating) model.rotation.z += delta * .095;
      const targetExpansion = expanded ? 1 : 0;
      expansion += (targetExpansion - expansion) * (reducedMotion ? 1 : Math.min(1, delta*6));
      if (Math.abs(targetExpansion - expansion) < .001) expansion = targetExpansion;
      for (const group of moduleGroups) {
        const id = group.userData.module.id;
        group.position.copy(group.userData.initial);
        const module = group.userData.module;
        if (module.family === 'leg') {
          group.position.x += Math.sign(module.bounds[0][0] + module.bounds[1][0]) * expansion * 48;
          group.position.y += Math.sign(module.bounds[0][1] + module.bounds[1][1]) * expansion * 48;
          group.position.z -= expansion * 135;
        } else group.position.z += (5-id) * expansion * 26;
        if (id <= 2) group.position.x += (id===1 ? -1 : 1) * expansion * 60;
      }
      camera.position.y = -fitDistance * (1 + expansion * .24);
      camera.lookAt(0, 0, height * .025);
      renderer.render(scene, camera);
      const moving = rotating || expansion !== targetExpansion;
      canvas.dataset.rendering = moving ? 'active' : 'idle';
      if (moving) requestRender();
    }
    onDocumentVisibility = () => {
      cancelAnimationFrame(frame); frame = undefined; lastTime = 0;
      requestRender();
    };
    viewportObserver = new IntersectionObserver(([entry]) => {
      previewVisible = entry.isIntersecting;
      onDocumentVisibility();
    });
    viewportObserver.observe(canvasHost);
    onWindowScroll = () => {
      scrolling = true;
      clearTimeout(scrollTimer);
      onDocumentVisibility();
      scrollTimer = setTimeout(() => { scrolling = false; onDocumentVisibility(); }, 140);
    };
    addEventListener('scroll', onWindowScroll, { passive: true });
    document.addEventListener('visibilitychange', onDocumentVisibility);
    // Load one small overview module at a time, keeping preview memory bounded.
    for (const spec of overview.modules) {
      if (!active) return;
      const group = moduleGroups.find(item => item.userData.module.id === spec.id);
      const raw = await readGeometry(spec.geometry);
      const geometry = makeGeometry(group.userData.module, spec, raw);
      const material = new THREE.MeshStandardMaterial({ color: 0xddeee5, metalness: .35, roughness: .4 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.module = group.userData.module;
      mesh.visible = !wireframe;
      group.add(mesh);
      group.userData.mesh = mesh;
      group.userData.lines.material.opacity = wireframe ? .95 : .26;
      requestRender();
    }
  }
  start().catch(error => {
    if (error.name === 'AbortError') return;
    status.textContent = document.body.classList.contains('model-ready') ? '结构线预览 / 可进入完整展厅' : '铁塔总览 / 进入展厅开始探索';
  });
  addEventListener('pagehide', event => {
    if (event.persisted) return;
    active = false; abort.abort(); cancelAnimationFrame(frame); observer?.disconnect(); viewportObserver?.disconnect();
    if (onDocumentVisibility) document.removeEventListener('visibilitychange', onDocumentVisibility);
    if (onWindowScroll) removeEventListener('scroll', onWindowScroll);
    clearTimeout(scrollTimer);
    for (const group of moduleGroups) group.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    renderer?.dispose();
  });
})();
