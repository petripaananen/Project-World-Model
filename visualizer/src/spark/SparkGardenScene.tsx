/**
 * SparkGardenScene.tsx
 *
 * Project World Model — Spark 2.0 Garden Integration
 * Built with World Labs' open-source 3DGS renderer: https://sparkjs.dev
 *
 * Architecture: Imperative Three.js + SparkRenderer (NOT @react-three/fiber).
 * Mounts into its own <div> ref, so it does not conflict with the existing
 * R3F canvas used for the DTO simulation in standard mode.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
// @ts-ignore – sparkjsdev types may lag behind minor releases
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';

// ─── World catalog ──────────────────────────────────────────────────────────
// All worlds are publicly hosted on World Labs' CDN — no server needed.
export interface GardenWorld {
  id: string;
  label: string;
  emoji: string;
  url: string;
  startPos: [number, number, number];
  startQuat?: [number, number, number, number];
  splatLimit?: number;
  description: string;
}

export const GARDEN_WORLDS: GardenWorld[] = [
  {
    id: 'ruins',
    label: 'Ancient Ruins',
    emoji: '🏛️',
    url: 'https://wlt-ai-cdn.art/spark-2.0/rad/ruins-lod.rad',
    startPos: [-55, 20, -38.3],
    startQuat: [-0.01, -0.7, -0.01, 0.72],
    splatLimit: 1_500_000,
    description: 'Navigate the integration debt landscape as ancient ruins — high-risk zones crumble at the edges.',
  },
  {
    id: 'spaceship',
    label: 'Cozy Spaceship',
    emoji: '🚀',
    url: 'https://wlt-ai-cdn.art/spark-2.0/rad/spaceship-lod.rad',
    startPos: [0, 6.5, 0],
    splatLimit: 1_500_000,
    description: 'Your project as a spacecraft — agents work in isolation modules, connected by dependency corridors.',
  },
  {
    id: 'cave',
    label: 'Crystal Cave',
    emoji: '💎',
    url: 'https://wlt-ai-cdn.art/spark-2.0/rad/cave-lod.rad',
    startPos: [28.5, 0.2, 36.5],
    startQuat: [0.08, 0.45, -0.04, 0.88],
    splatLimit: 1_500_000,
    description: 'Deep latent-space representation — crystalline structures encode causal probability clusters.',
  },
  {
    id: 'hobbiton',
    label: 'Hobbiton Garden',
    emoji: '🌿',
    url: 'https://wlt-ai-cdn.art/spark-2.0/rad/hobbiton-lod.rad',
    startPos: [0, 0, 1],
    splatLimit: 1_500_000,
    description: 'The garden metaphor made real — green zones are healthy sprints, overgrown areas signal debt.',
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface SparkGardenSceneProps {
  /** CRR value drives ambient lighting temperature */
  crr?: number;
  /** Project name shown in the world info panel */
  projectName?: string;
  /** Whether the garden scene is currently visible */
  active: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function SparkGardenScene({ crr, projectName, active }: SparkGardenSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sparkRef = useRef<any>(null);
  const splatMeshRef = useRef<any>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef = useRef<number>(0);
  const isMovingRef = useRef(false);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, lastX: 0, lastY: 0 });
  const yawRef = useRef(0);
  const pitchRef = useRef(0);

  const [selectedWorld, setSelectedWorld] = useState<GardenWorld>(GARDEN_WORLDS[0]);
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [streamProgress, setStreamProgress] = useState(0);
  const [showWorldPicker, setShowWorldPicker] = useState(false);
  const [fps, setFps] = useState(0);
  const lastFpsTime = useRef(Date.now());
  const frameCount = useRef(0);

  // ─── Scene tear-down ──────────────────────────────────────────────────────
  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (splatMeshRef.current && sceneRef.current) {
      sceneRef.current.remove(splatMeshRef.current);
      splatMeshRef.current = null;
    }
    if (sparkRef.current && sceneRef.current) {
      sceneRef.current.remove(sparkRef.current);
      sparkRef.current = null;
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
      const canvas = rendererRef.current.domElement;
      canvas.parentNode?.removeChild(canvas);
      rendererRef.current = null;
    }
    sceneRef.current = null;
    cameraRef.current = null;
  }, []);

  // ─── Scene setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Three.js renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera — start from the world's preferred position
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.05, 1000);
    const [sx, sy, sz] = selectedWorld.startPos;
    camera.position.set(sx, sy, sz);
    if (selectedWorld.startQuat) {
      const [qx, qy, qz, qw] = selectedWorld.startQuat;
      camera.quaternion.set(qx, qy, qz, qw);
      // Extract yaw/pitch from quaternion for FPS controls
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      yawRef.current = euler.y;
      pitchRef.current = euler.x;
    }
    cameraRef.current = camera;

    // Ambient lighting — CRR-driven color temperature
    const ambientColor = crr !== undefined && crr < 1.0
      ? new THREE.Color(0.6, 0.35, 0.25) // warm amber = debt warning
      : new THREE.Color(0.45, 0.55, 0.7);  // cool blue = optimal
    const ambient = new THREE.AmbientLight(ambientColor, 1.2);
    scene.add(ambient);

    // Spark renderer (wraps the THREE.WebGLRenderer)
    const spark = new SparkRenderer({ renderer });
    scene.add(spark);
    sparkRef.current = spark;

    // Load the 3DGS world
    setLoadingState('loading');
    setStreamProgress(0);

    const splatMesh = new SplatMesh({
      url: selectedWorld.url,
      onProgress: (loaded: number, total: number) => {
        if (total > 0) setStreamProgress(Math.round((loaded / total) * 100));
      },
    });
    if (selectedWorld.splatLimit) {
      splatMesh.splatLimit = selectedWorld.splatLimit;
    }

    scene.add(splatMesh);
    splatMeshRef.current = splatMesh;

    // Mark ready once splats start rendering
    const readyTimeout = setTimeout(() => setLoadingState('ready'), 1500);

    // ─── FPS-style keyboard controls ───────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ─── Mouse look (pointer lock) ─────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseRef.current.isDown) return;
      const dx = e.clientX - mouseRef.current.lastX;
      const dy = e.clientY - mouseRef.current.lastY;
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
      yawRef.current -= dx * 0.002;
      pitchRef.current -= dy * 0.002;
      pitchRef.current = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitchRef.current));
    };

    const onMouseDown = (e: MouseEvent) => {
      mouseRef.current.isDown = true;
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
    };
    const onMouseUp = () => { mouseRef.current.isDown = false; };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    // ─── Resize handler ────────────────────────────────────────────────────
    const onResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      rendererRef.current.setSize(nw, nh);
      cameraRef.current.aspect = nw / nh;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // ─── Render loop ───────────────────────────────────────────────────────
    const moveSpeed = 0.08;
    const direction = new THREE.Vector3();
    const front = new THREE.Vector3();
    const right = new THREE.Vector3();

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const cam = cameraRef.current;
      if (!cam) return;

      // Apply yaw/pitch
      const q = new THREE.Quaternion();
      q.setFromEuler(new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ'));
      cam.quaternion.copy(q);

      // WASD movement
      cam.getWorldDirection(front);
      right.crossVectors(front, cam.up).normalize();
      direction.set(0, 0, 0);

      const keys = keysRef.current;
      if (keys.has('KeyW') || keys.has('ArrowUp'))    direction.addScaledVector(front, moveSpeed);
      if (keys.has('KeyS') || keys.has('ArrowDown'))  direction.addScaledVector(front, -moveSpeed);
      if (keys.has('KeyA') || keys.has('ArrowLeft'))  direction.addScaledVector(right, -moveSpeed);
      if (keys.has('KeyD') || keys.has('ArrowRight')) direction.addScaledVector(right, moveSpeed);
      if (keys.has('KeyE') || keys.has('Space'))      direction.y += moveSpeed;
      if (keys.has('KeyQ') || keys.has('ShiftLeft'))  direction.y -= moveSpeed;

      cam.position.add(direction);

      renderer.render(scene, cam);

      // FPS counter
      frameCount.current++;
      const now = Date.now();
      if (now - lastFpsTime.current >= 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastFpsTime.current = now;
      }
    };
    loop();

    return () => {
      clearTimeout(readyTimeout);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      teardown();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, selectedWorld]);

  // ─── CRR → ambient light color reactive update ────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const ambientLight = scene.children.find(c => c instanceof THREE.AmbientLight) as THREE.AmbientLight | undefined;
    if (!ambientLight) return;
    const targetColor = crr !== undefined && crr < 1.0
      ? new THREE.Color(0.6, 0.35, 0.25)
      : new THREE.Color(0.45, 0.55, 0.7);
    ambientLight.color.lerp(targetColor, 0.3);
  }, [crr]);

  if (!active) return null;

  // ─── UI ───────────────────────────────────────────────────────────────────
  const isDebt = crr !== undefined && crr < 1.0;

  return (
    <div className="spark-garden-root">
      {/* Three.js canvas mount point */}
      <div ref={containerRef} className="spark-canvas-mount" />

      {/* Loading overlay */}
      {loadingState === 'loading' && (
        <div className="spark-loading-overlay">
          <div className="spark-loader-inner">
            <div className="spark-loader-spinner" />
            <span className="spark-loader-title">Streaming Garden World</span>
            <span className="spark-loader-sub">
              Powered by World Labs Spark 2.0 LoD
            </span>
            {streamProgress > 0 && (
              <div className="spark-progress-bar-wrap">
                <div
                  className="spark-progress-bar-fill"
                  style={{ width: `${streamProgress}%` }}
                />
              </div>
            )}
            <span className="spark-loader-hint">
              {selectedWorld.emoji} {selectedWorld.label}
            </span>
          </div>
        </div>
      )}

      {/* World info banner — top left */}
      {loadingState === 'ready' && (
        <div className="spark-world-banner">
          <span className="spark-world-emoji">{selectedWorld.emoji}</span>
          <div>
            <div className="spark-world-name">{selectedWorld.label}</div>
            <div className="spark-world-desc">{selectedWorld.description}</div>
          </div>
        </div>
      )}

      {/* Status badge — top right */}
      {loadingState === 'ready' && (
        <div className={`spark-status-badge ${isDebt ? 'debt' : 'optimal'}`}>
          <span className="spark-status-dot" />
          <span>{isDebt ? '⚠ Integration Debt' : '✓ Optimal State'}</span>
          {crr !== undefined && (
            <span className="spark-crr-val">CRR {crr.toFixed(2)}x</span>
          )}
        </div>
      )}

      {/* FPS counter */}
      {loadingState === 'ready' && (
        <div className="spark-fps-badge">{fps} fps · Spark 2.0 LoD</div>
      )}

      {/* World selector — bottom center */}
      <div className="spark-world-selector-bar">
        <button
          className="spark-world-picker-toggle"
          onClick={() => setShowWorldPicker(p => !p)}
        >
          <span>🌍</span>
          <span>Change World</span>
          <span className="spark-picker-chevron">{showWorldPicker ? '▲' : '▼'}</span>
        </button>

        {showWorldPicker && (
          <div className="spark-world-picker-popup">
            {GARDEN_WORLDS.map(world => (
              <button
                key={world.id}
                className={`spark-world-option ${selectedWorld.id === world.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedWorld(world);
                  setShowWorldPicker(false);
                  setLoadingState('idle');
                }}
              >
                <span className="spark-world-option-emoji">{world.emoji}</span>
                <div>
                  <div className="spark-world-option-label">{world.label}</div>
                  <div className="spark-world-option-desc">{world.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls hint */}
      {loadingState === 'ready' && (
        <div className="spark-controls-hint">
          <kbd>W A S D</kbd> Move &nbsp;·&nbsp; <kbd>Q E</kbd> Up/Down &nbsp;·&nbsp;
          <kbd>Mouse drag</kbd> Look
        </div>
      )}

      {/* Powered-by badge */}
      <a
        className="spark-powered-badge"
        href="https://sparkjs.dev"
        target="_blank"
        rel="noopener noreferrer"
      >
        Powered by World Labs Spark 2.0
      </a>
    </div>
  );
}
