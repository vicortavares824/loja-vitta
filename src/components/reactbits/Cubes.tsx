import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface CubesProps {
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

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, gridSize * 0.85);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // 3. Grid of Cubes
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const baseColorObj = new THREE.Color(faceColor);
    const rippleColorObj = new THREE.Color(rippleColor);

    interface CubeItem {
      mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
      row: number;
      col: number;
      targetRotX: number;
      targetRotY: number;
      currentRotX: number;
      currentRotY: number;
      rippleTime: number;
      rippleActive: boolean;
      rippleDistance: number;
    }

    const cubes: CubeItem[] = [];
    const group = new THREE.Group();

    const offset = ((gridSize - 1) * (cubeSize + 0.12)) / 2;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const material = new THREE.MeshStandardMaterial({
          color: baseColorObj.clone(),
          roughness: 0.3,
          metalness: 0.2
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = c * (cubeSize + 0.12) - offset;
        mesh.position.y = -(r * (cubeSize + 0.12) - offset);
        mesh.position.z = 0;

        group.add(mesh);
        cubes.push({
          mesh,
          row: r,
          col: c,
          targetRotX: 0,
          targetRotY: 0,
          currentRotX: 0,
          currentRotY: 0,
          rippleTime: 0,
          rippleActive: false,
          rippleDistance: 0
        });
      }
    }

    scene.add(group);

    // Interaction & Simulation State
    const mouse = { x: -999, y: -999 };
    const raycaster = new THREE.Raycaster();
    let isUserActive = false;
    let userTimer: ReturnType<typeof setTimeout> | null = null;

    const simTarget = { r: gridSize / 2, c: gridSize / 2 };
    const simPos = { r: gridSize / 2, c: gridSize / 2 };

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      isUserActive = true;
      if (userTimer) clearTimeout(userTimer);
      userTimer = setTimeout(() => {
        isUserActive = false;
      }, 2500);
    };

    const handlePointerMove = (e: MouseEvent) => {
      updatePointer(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        updatePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!rippleOnClick) return;
      const rect = container.getBoundingClientRect();
      const mX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(mX, mY), camera);
      const intersects = raycaster.intersectObjects(group.children);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const hitCube = cubes.find(item => item.mesh === hitMesh);
        if (hitCube) {
          cubes.forEach(item => {
            const dist = Math.hypot(item.row - hitCube.row, item.col - hitCube.col);
            item.rippleDistance = dist;
            item.rippleTime = -dist * (0.12 / rippleSpeed);
            item.rippleActive = true;
          });
        }
      }
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('click', handleClick);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      let targetR = -999;
      let targetC = -999;

      if (isUserActive) {
        raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);

        if (intersectPoint) {
          targetC = (intersectPoint.x + offset) / (cubeSize + 0.12);
          targetR = (-intersectPoint.y + offset) / (cubeSize + 0.12);
        }
      } else if (autoAnimate) {
        simPos.r += (simTarget.r - simPos.r) * 0.03;
        simPos.c += (simTarget.c - simPos.c) * 0.03;
        targetR = simPos.r;
        targetC = simPos.c;

        if (Math.hypot(simPos.r - simTarget.r, simPos.c - simTarget.c) < 0.2) {
          simTarget.r = Math.random() * gridSize;
          simTarget.c = Math.random() * gridSize;
        }
      }

      cubes.forEach(item => {
        // Tilt animation
        const dist = Math.hypot(item.row - targetR, item.col - targetC);
        if (dist <= radius) {
          const pct = 1 - dist / radius;
          item.targetRotX = -pct * maxAngle;
          item.targetRotY = pct * maxAngle;
        } else {
          item.targetRotX = 0;
          item.targetRotY = 0;
        }

        item.currentRotX += (item.targetRotX - item.currentRotX) * 0.1;
        item.currentRotY += (item.targetRotY - item.currentRotY) * 0.1;

        item.mesh.rotation.x = item.currentRotX;
        item.mesh.rotation.y = item.currentRotY;

        // Ripple Effect Animation
        if (item.rippleActive) {
          item.rippleTime += delta * rippleSpeed;
          if (item.rippleTime >= 0 && item.rippleTime <= 0.6) {
            const p = Math.sin((item.rippleTime / 0.6) * Math.PI);
            item.mesh.material.color.lerpColors(baseColorObj, rippleColorObj, p);
            item.mesh.position.z = p * 0.4;
          } else if (item.rippleTime > 0.6) {
            item.mesh.material.color.copy(baseColorObj);
            item.mesh.position.z = 0;
            item.rippleActive = false;
          }
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('click', handleClick);
      if (userTimer) clearTimeout(userTimer);

      geometry.dispose();
      cubes.forEach(item => item.mesh.material.dispose());
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [gridSize, cubeSize, maxAngle, radius, faceColor, autoAnimate, rippleOnClick, rippleColor, rippleSpeed]);

  return <div ref={mountRef} className="w-full h-full min-h-[350px] relative pointer-events-auto" />;
};

export default Cubes;

