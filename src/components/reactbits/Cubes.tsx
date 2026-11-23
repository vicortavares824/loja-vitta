import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface CubesProps {
  /** Número de linhas da grade. As colunas acompanham a largura da seção. */
  gridSize?: number;
  cubeSize?: number;
  maxAngle?: number;
  radius?: number;
  faceColor?: string;
  autoAnimate?: boolean;
  rippleOnClick?: boolean;
  rippleColor?: string;
  rippleSpeed?: number;
}

/**
 * Grade de cubos 3D que inclinam perto do cursor e cobre toda a seção.
 *
 * Desempenho:
 * - Um único `InstancedMesh` (1 draw call) em vez de um mesh/material por cubo.
 * - O loop só roda com a seção visível na tela e a aba ativa.
 * - Nenhuma alocação por quadro; suavização baseada em tempo (independe do FPS).
 */
const Cubes: React.FC<CubesProps> = ({
  gridSize = 12,
  cubeSize = 0.55,
  maxAngle = Math.PI / 4,
  radius = 3.5,
  faceColor = '#666666',
  autoAnimate = true,
  rippleOnClick = true,
  rippleColor = '#ffffff',
  rippleSpeed = 2.5
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [colCount, setColCount] = useState(gridSize);

  // Mede o container e calcula quantas colunas cabem para preencher a largura.
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const measure = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      setColCount(Math.max(gridSize, Math.ceil(gridSize * (w / h)) + 1));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(measure, 200);
    });
    ro.observe(container);
    return () => {
      ro.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [gridSize]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const rowCount = gridSize;
    const step = cubeSize + 0.12;
    const fov = 45;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
    // Distância em que as linhas preenchem a altura (corte leve nas bordas).
    const fitDistance = ((rowCount * step) / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2))) * 0.92;
    camera.position.set(0, 0, fitDistance);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      // WebGL indisponível: não renderiza nada e mantém o layout (R11.4).
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Grade instanciada
    const offsetX = ((colCount - 1) * step) / 2;
    const offsetY = ((rowCount - 1) * step) / 2;
    const count = rowCount * colCount;

    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.2 });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);

    const baseColor = new THREE.Color(faceColor);
    const rippleColorObj = new THREE.Color(rippleColor);
    const tmpColor = new THREE.Color();
    const dummy = new THREE.Object3D();

    const rowOf = new Float32Array(count);
    const colOf = new Float32Array(count);
    const rotX = new Float32Array(count);
    const rotY = new Float32Array(count);
    const posZ = new Float32Array(count);
    const rippleTime = new Float32Array(count);
    const rippleActive = new Uint8Array(count);

    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / colCount);
      const c = i % colCount;
      rowOf[i] = r;
      colOf[i] = c;
      dummy.position.set(c * step - offsetX, -(r * step - offsetY), 0);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, baseColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // Interação (ouve na janela para funcionar mesmo com cards por cima)
    const pointer = new THREE.Vector2(-999, -999);
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hit = new THREE.Vector3();
    let isUserActive = false;
    let userTimer: ReturnType<typeof setTimeout> | null = null;

    const simTarget = { r: rowCount / 2, c: colCount / 2 };
    const simPos = { r: rowCount / 2, c: colCount / 2 };

    const toNdc = (clientX: number, clientY: number): boolean => {
      const rect = container.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
      pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      return true;
    };

    const updatePointer = (clientX: number, clientY: number) => {
      if (!toNdc(clientX, clientY)) return;
      isUserActive = true;
      if (userTimer) clearTimeout(userTimer);
      userTimer = setTimeout(() => {
        isUserActive = false;
      }, 2500);
    };

    const handlePointerMove = (e: PointerEvent) => updatePointer(e.clientX, e.clientY);

    const handleClick = (e: MouseEvent) => {
      if (!rippleOnClick || !toNdc(e.clientX, e.clientY)) return;
      raycaster.setFromCamera(pointer, camera);
      const id = raycaster.intersectObject(mesh)[0]?.instanceId;
      if (id === undefined) return;
      for (let i = 0; i < count; i++) {
        const dist = Math.hypot(rowOf[i] - rowOf[id], colOf[i] - colOf[id]);
        rippleTime[i] = -dist * (0.12 / rippleSpeed);
        rippleActive[i] = 1;
      }
      start();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('click', handleClick);

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', handleResize);

    // Loop de animação (pausável)
    let animId = 0;
    let running = false;
    let inView = false;
    const clock = new THREE.Clock(false);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      // Limita o delta para não "pular" depois de pausas.
      const delta = Math.min(clock.getDelta(), 0.05);
      const ease = 1 - Math.exp(-delta * 14);

      let targetR = -999;
      let targetC = -999;

      if (isUserActive) {
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(plane, hit)) {
          targetC = (hit.x + offsetX) / step;
          targetR = (-hit.y + offsetY) / step;
        }
      } else if (autoAnimate) {
        const simEase = 1 - Math.exp(-delta * 2.5);
        simPos.r += (simTarget.r - simPos.r) * simEase;
        simPos.c += (simTarget.c - simPos.c) * simEase;
        targetR = simPos.r;
        targetC = simPos.c;
        if (Math.hypot(simPos.r - simTarget.r, simPos.c - simTarget.c) < 0.3) {
          simTarget.r = Math.random() * rowCount;
          simTarget.c = Math.random() * colCount;
        }
      }

      let colorsChanged = false;

      for (let i = 0; i < count; i++) {
        const dist = Math.hypot(rowOf[i] - targetR, colOf[i] - targetC);
        const pct = dist <= radius ? 1 - dist / radius : 0;
        rotX[i] += (-pct * maxAngle - rotX[i]) * ease;
        rotY[i] += (pct * maxAngle - rotY[i]) * ease;

        if (rippleActive[i]) {
          rippleTime[i] += delta * rippleSpeed;
          const t = rippleTime[i];
          if (t >= 0 && t <= 0.6) {
            const p = Math.sin((t / 0.6) * Math.PI);
            mesh.setColorAt(i, tmpColor.lerpColors(baseColor, rippleColorObj, p));
            posZ[i] = p * 0.4;
            colorsChanged = true;
          } else if (t > 0.6) {
            mesh.setColorAt(i, baseColor);
            posZ[i] = 0;
            rippleActive[i] = 0;
            colorsChanged = true;
          }
        }

        dummy.position.set(colOf[i] * step - offsetX, -(rowOf[i] * step - offsetY), posZ[i]);
        dummy.rotation.set(rotX[i], rotY[i], 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (colorsChanged && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      renderer.render(scene, camera);
    };

    const start = () => {
      if (running || !inView || document.hidden) return;
      running = true;
      clock.start();
      animate();
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(animId);
      clock.stop();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      },
      { rootMargin: '100px' }
    );
    observer.observe(container);

    const handleVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', handleVisibility);

    renderer.render(scene, camera);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('click', handleClick);
      if (userTimer) clearTimeout(userTimer);

      geometry.dispose();
      material.dispose();
      mesh.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [gridSize, colCount, cubeSize, maxAngle, radius, faceColor, autoAnimate, rippleOnClick, rippleColor, rippleSpeed]);

  return <div ref={mountRef} className="w-full h-full min-h-[350px] relative pointer-events-auto" />;
};

export default Cubes;
