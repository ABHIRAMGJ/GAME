import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Flame,
  Droplets,
  HelpCircle,
  Eye,
  CheckCircle,
  Music,
  Heart,
  RotateCcw,
  Navigation,
  Compass,
  X,
  Clock,
} from 'lucide-react';

interface Kitchen3DGameProps {
  onBackToDashboard: () => void;
}

// Procedural Audio Synthesizer for Kitchen Sounds
class KitchenAudio {
  private ctx: AudioContext | null = null;
  public enabled = true;
  private waterNode: AudioBufferSourceNode | null = null;
  private waterGain: GainNode | null = null;
  private sizzleNode: AudioBufferSourceNode | null = null;
  private sizzleGain: GainNode | null = null;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Create loopable noise buffer
  private createNoiseBuffer(): AudioBuffer | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public startWaterSound() {
    const ctx = this.getContext();
    if (!ctx || this.waterNode) return;
    const noise = this.createNoiseBuffer();
    if (!noise) return;

    this.waterNode = ctx.createBufferSource();
    this.waterNode.buffer = noise;
    this.waterNode.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);

    this.waterGain = ctx.createGain();
    this.waterGain.gain.setValueAtTime(0.01, ctx.currentTime);
    this.waterGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.2);

    this.waterNode.connect(filter);
    filter.connect(this.waterGain);
    this.waterGain.connect(ctx.destination);
    this.waterNode.start();
  }

  public stopWaterSound() {
    if (this.waterGain && this.ctx) {
      this.waterGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      setTimeout(() => {
        if (this.waterNode) {
          try { this.waterNode.stop(); } catch (_) {}
          this.waterNode.disconnect();
          this.waterNode = null;
        }
      }, 160);
    }
  }

  public startSizzleSound() {
    const ctx = this.getContext();
    if (!ctx || this.sizzleNode) return;
    const noise = this.createNoiseBuffer();
    if (!noise) return;

    this.sizzleNode = ctx.createBufferSource();
    this.sizzleNode.buffer = noise;
    this.sizzleNode.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, ctx.currentTime);
    filter.Q.setValueAtTime(2.0, ctx.currentTime);

    this.sizzleGain = ctx.createGain();
    this.sizzleGain.gain.setValueAtTime(0.01, ctx.currentTime);
    this.sizzleGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.2);

    this.sizzleNode.connect(filter);
    filter.connect(this.sizzleGain);
    this.sizzleGain.connect(ctx.destination);
    this.sizzleNode.start();
  }

  public stopSizzleSound() {
    if (this.sizzleGain && this.ctx) {
      this.sizzleGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      setTimeout(() => {
        if (this.sizzleNode) {
          try { this.sizzleNode.stop(); } catch (_) {}
          this.sizzleNode.disconnect();
          this.sizzleNode = null;
        }
      }, 160);
    }
  }

  public playWashClink() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  public playSparkle() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [1046.5, 1318.5, 1567.98, 2093.0];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.05);
      osc.stop(ctx.currentTime + idx * 0.05 + 0.18);
    });
  }

  public playBoilWhistle() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1800, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  }

  public playUkulele() {
    const ctx = this.getContext();
    if (!ctx) return;
    const chord = [392.0, 523.25, 659.25, 880.0]; // G-C-E-A
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.035);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.035 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.035);
      osc.stop(ctx.currentTime + i * 0.035 + 0.6);
    });
  }

  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  public playTimerTick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  public dispose() {
    this.stopWaterSound();
    this.stopSizzleSound();
    if (this.ctx) {
      try { this.ctx.close(); } catch (_) {}
      this.ctx = null;
    }
  }
}

export const Kitchen3DGame: React.FC<Kitchen3DGameProps> = ({ onBackToDashboard }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<KitchenAudio>(new KitchenAudio());

  // Interactive Kitchen States
  const [faucetRunning, setFaucetRunning] = useState(false);
  const [platesCleanCount, setPlatesCleanCount] = useState(0);
  const [stoveIgnited, setStoveIgnited] = useState(false);
  const [foodCooking, setFoodCooking] = useState(false);
  const [kettleBoiling, setKettleBoiling] = useState(false);
  const [ovenOpen, setOvenOpen] = useState(false);
  const [microwaveRunning, setMicrowaveRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [activeObject, setActiveObject] = useState<string | null>(null);
  const [ukuleleStrummed, setUkuleleStrummed] = useState(false);
  const [appleGrabbed, setAppleGrabbed] = useState(false);

  // User Exit Modal with Timer (As requested)
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitTimer, setExitTimer] = useState(3);
  const exitIntervalRef = useRef<any>(null);

  // 3D Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const interactiveObjectsRef = useRef<THREE.Mesh[]>([]);

  // Particle systems
  const waterStreamRef = useRef<THREE.Points | null>(null);
  const steamParticlesRef = useRef<THREE.Points | null>(null);
  const sizzleParticlesRef = useRef<THREE.Points | null>(null);
  const flameMeshRef = useRef<THREE.Mesh | null>(null);
  const ovenDoorRef = useRef<THREE.Group | null>(null);
  const plateMeshRef = useRef<THREE.Mesh | null>(null);

  // First person navigation state
  const playerPosRef = useRef({ x: 0, y: 1.45, z: 1.6 });
  const cameraRotationRef = useRef({ yaw: 0, pitch: -0.1 });
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const isDraggingRef = useRef(false);
  const previousMousePosRef = useRef({ x: 0, y: 0 });

  // Sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioRef.current.enabled = next;
    if (!next) {
      audioRef.current.stopWaterSound();
      audioRef.current.stopSizzleSound();
    }
  };

  // Trigger Exit with Countdown Timer
  const handleInitiateExit = () => {
    audioRef.current.playClick();
    setShowExitModal(true);
    setExitTimer(3);
  };

  useEffect(() => {
    if (showExitModal) {
      audioRef.current.playTimerTick();
      exitIntervalRef.current = setInterval(() => {
        setExitTimer((prev) => {
          if (prev <= 1) {
            clearInterval(exitIntervalRef.current);
            audioRef.current.dispose();
            onBackToDashboard();
            return 0;
          }
          audioRef.current.playTimerTick();
          return prev - 1;
        });
      }, 1000);
    } else {
      if (exitIntervalRef.current) clearInterval(exitIntervalRef.current);
    }
    return () => {
      if (exitIntervalRef.current) clearInterval(exitIntervalRef.current);
    };
  }, [showExitModal, onBackToDashboard]);

  // Cancel Exit
  const handleCancelExit = () => {
    audioRef.current.playClick();
    setShowExitModal(false);
    if (exitIntervalRef.current) clearInterval(exitIntervalRef.current);
  };

  // Force Instant Exit
  const handleInstantExit = () => {
    if (exitIntervalRef.current) clearInterval(exitIntervalRef.current);
    audioRef.current.dispose();
    onBackToDashboard();
  };

  // Helper: Procedural Wood Texture Canvas
  const createWoodTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base warm oak floor
    ctx.fillStyle = '#b78752';
    ctx.fillRect(0, 0, 512, 512);

    // Plank lines
    const plankWidth = 64;
    for (let x = 0; x < 512; x += plankWidth) {
      ctx.fillStyle = (x / plankWidth) % 2 === 0 ? '#ba8b55' : '#b3814c';
      ctx.fillRect(x, 0, plankWidth, 512);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(120, 75, 30, 0.18)';
      ctx.lineWidth = 1.5;
      for (let y = 0; y < 512; y += 8) {
        ctx.beginPath();
        ctx.moveTo(x, y + Math.random() * 4);
        ctx.lineTo(x + plankWidth, y + Math.random() * 4);
        ctx.stroke();
      }

      // Vertical plank seam
      ctx.strokeStyle = 'rgba(60, 35, 10, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();

      // Staggered horizontal cuts
      const cuts = [128, 256, 384];
      cuts.forEach((cut) => {
        const offsetCut = (cut + (x % 3) * 60) % 512;
        ctx.beginPath();
        ctx.moveTo(x, offsetCut);
        ctx.lineTo(x + plankWidth, offsetCut);
        ctx.stroke();
      });
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  };

  // Hotspot Teleportation
  const teleportTo = (x: number, z: number, yaw: number, pitch = -0.1) => {
    playerPosRef.current = { x, y: 1.45, z };
    cameraRotationRef.current = { yaw, pitch };
    audioRef.current.playClick();
  };

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6e9e4);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(playerPosRef.current.x, playerPosRef.current.y, playerPosRef.current.z);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    interactiveObjectsRef.current = [];

    // ==========================================
    // 1. LIGHTING (Atmospheric warm kitchen lighting)
    // ==========================================
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.65);
    scene.add(ambientLight);

    // Warm Sun stream through right window
    const sunLight = new THREE.DirectionalLight(0xfff6ea, 1.2);
    sunLight.position.set(3.5, 2.8, 1.2);
    sunLight.target.position.set(0, 0.8, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Overhead Pendant Lamp Light
    const pendantLight = new THREE.PointLight(0xffeedd, 1.2, 5);
    pendantLight.position.set(0, 2.3, 0.8);
    pendantLight.castShadow = true;
    scene.add(pendantLight);

    // ==========================================
    // 2. ROOM ENCLOSURE & MATERIALS
    // ==========================================
    const woodFloorTex = createWoodTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: woodFloorTex,
      roughness: 0.35,
      metalness: 0.05,
    });
    const floorGeo = new THREE.PlaneGeometry(3.6, 5.0);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 1.0);
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xfaf8f6, roughness: 0.9 });
    const ceilingGeo = new THREE.PlaneGeometry(3.6, 5.0);
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 2.9, 1.0);
    scene.add(ceiling);

    // Iconic Dusty Pink / Blush Wall (Matches uploaded image)
    const pinkWallMat = new THREE.MeshStandardMaterial({
      color: 0xdcb8ba,
      roughness: 0.85,
    });

    // Back Wall (Pink)
    const backWallGeo = new THREE.PlaneGeometry(3.6, 2.9);
    const backWall = new THREE.Mesh(backWallGeo, pinkWallMat);
    backWall.position.set(0, 1.45, -1.5);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left Wall (Soft off-white)
    const leftWallMat = new THREE.MeshStandardMaterial({ color: 0xedebe8, roughness: 0.9 });
    const leftWallGeo = new THREE.PlaneGeometry(5.0, 2.9);
    const leftWall = new THREE.Mesh(leftWallGeo, leftWallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-1.8, 1.45, 1.0);
    scene.add(leftWall);

    // Right Wall (Sunlit window wall)
    const rightWallMat = new THREE.MeshStandardMaterial({ color: 0xf5f3f0, roughness: 0.9 });
    const rightWallGeo = new THREE.PlaneGeometry(5.0, 2.9);
    const rightWall = new THREE.Mesh(rightWallGeo, rightWallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(1.8, 1.45, 1.0);
    scene.add(rightWall);

    // Large Window on the right
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0xdaf2ff,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.7,
    });
    const windowGroup = new THREE.Group();
    const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 1.4), windowFrameMat);
    const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.8, 1.3), windowGlassMat);
    windowGroup.add(frameMesh);
    windowGroup.add(glassMesh);
    windowGroup.position.set(1.76, 1.6, 1.1);
    scene.add(windowGroup);

    // Industrial Pendant Lamp above center
    const pendantGroup = new THREE.Group();
    const cordMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    cordMesh.position.y = 2.6;
    const coneShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.18, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x3d444d, roughness: 0.5, side: THREE.DoubleSide })
    );
    coneShade.position.y = 2.3;
    const bulbMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff0aa })
    );
    bulbMesh.position.y = 2.26;
    pendantGroup.add(cordMesh, coneShade, bulbMesh);
    scene.add(pendantGroup);

    // ==========================================
    // 3. CENTER COOKING STATION (Double Oven, Stove, Vent Hood)
    // ==========================================
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      metalness: 0.85,
      roughness: 0.25,
    });
    const blackGlassMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.5,
      roughness: 0.15,
    });
    const oakWoodMat = new THREE.MeshStandardMaterial({
      color: 0xc48c54,
      roughness: 0.4,
    });

    // Stainless Backsplash Plate behind stove
    const backsplash = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.03), steelMat);
    backsplash.position.set(-0.25, 1.35, -1.48);
    scene.add(backsplash);

    // Range Hood / Extractor (Pyramid Chimney)
    const hoodChimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35), steelMat);
    hoodChimney.position.set(-0.25, 2.4, -1.35);
    const hoodCanopy = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.5), steelMat);
    hoodCanopy.position.set(-0.25, 1.9, -1.25);
    scene.add(hoodChimney, hoodCanopy);

    // Freestanding Double Oven Body
    const ovenBody = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.9, 0.65), steelMat);
    ovenBody.position.set(-0.25, 0.45, -1.15);
    ovenBody.castShadow = true;
    ovenBody.receiveShadow = true;
    scene.add(ovenBody);

    // Oven Top Glass & Dials
    const cooktop = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.04, 0.65), blackGlassMat);
    cooktop.position.set(-0.25, 0.92, -1.15);
    scene.add(cooktop);

    // Burners (Trivets)
    const burnerGeo = new THREE.TorusGeometry(0.08, 0.015, 8, 24);
    burnerGeo.rotateX(Math.PI / 2);
    const burnerMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
    const b1 = new THREE.Mesh(burnerGeo, burnerMat);
    b1.position.set(-0.45, 0.945, -1.3);
    const b2 = new THREE.Mesh(burnerGeo, burnerMat);
    b2.position.set(-0.05, 0.945, -1.3);
    const b3 = new THREE.Mesh(burnerGeo, burnerMat);
    b3.position.set(-0.45, 0.945, -1.0);
    const b4 = new THREE.Mesh(burnerGeo, burnerMat);
    b4.position.set(-0.05, 0.945, -1.0);
    scene.add(b1, b2, b3, b4);

    // Interactive Gas Flame (on front right burner b4)
    const flameGeo = new THREE.TorusGeometry(0.08, 0.02, 12, 24);
    flameGeo.rotateX(Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
    });
    const flameMesh = new THREE.Mesh(flameGeo, flameMat);
    flameMesh.position.set(-0.05, 0.95, -1.0);
    scene.add(flameMesh);
    flameMeshRef.current = flameMesh;

    // Oven Doors Group (Interactive click to open)
    const ovenDoorGroup = new THREE.Group();
    ovenDoorGroup.position.set(-0.25, 0.45, -0.82);

    const ovenDoorUpper = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.32, 0.04), blackGlassMat);
    ovenDoorUpper.position.set(0, 0.18, 0);
    const ovenDoorLower = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.42, 0.04), blackGlassMat);
    ovenDoorLower.position.set(0, -0.22, 0);

    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9 });
    const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6), handleMat);
    h1.rotation.z = Math.PI / 2;
    h1.position.set(0, 0.3, 0.04);
    const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6), handleMat);
    h2.rotation.z = Math.PI / 2;
    h2.position.set(0, -0.05, 0.04);

    ovenDoorGroup.add(ovenDoorUpper, ovenDoorLower, h1, h2);
    (ovenDoorGroup as any).name = 'interactive_oven';
    scene.add(ovenDoorGroup);
    ovenDoorRef.current = ovenDoorGroup;

    // Inside Oven: Baking tray with fresh cookies!
    const cookieTray = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.02, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.8 })
    );
    cookieTray.position.set(-0.25, 0.35, -1.15);
    scene.add(cookieTray);

    // Frying Pan on front-left burner (Interactive cooking)
    const panGroup = new THREE.Group();
    const panBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.3 })
    );
    const panHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x111827 })
    );
    panHandle.rotation.x = Math.PI / 2;
    panHandle.position.set(0, 0.02, 0.18);

    // Sunny side egg inside pan
    const eggWhite = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.01, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    );
    eggWhite.position.set(0, 0.022, 0);
    const eggYolk = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.1 })
    );
    eggYolk.position.set(0, 0.035, 0);
    panGroup.add(panBase, panHandle, eggWhite, eggYolk);
    panGroup.position.set(-0.45, 0.96, -1.0);
    panGroup.name = 'interactive_pan';
    scene.add(panGroup);

    // Utensil Rail hanging from backsplash
    const railMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.8), steelMat);
    railMesh.rotation.z = Math.PI / 2;
    railMesh.position.set(-0.25, 1.45, -1.45);
    scene.add(railMesh);

    // Hanging Red Gloves (from photo!)
    const redGlove = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.18, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 })
    );
    redGlove.position.set(-0.42, 1.34, -1.44);
    scene.add(redGlove);

    // Hanging Spatula and Ladle
    const spatula = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.01), steelMat);
    spatula.position.set(-0.3, 1.32, -1.44);
    const ladle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.008, 0.24), steelMat);
    ladle.position.set(-0.18, 1.32, -1.44);
    scene.add(spatula, ladle);

    // Knife Block on counter
    const knifeBlock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.15), oakWoodMat);
    knifeBlock.rotation.y = 0.2;
    knifeBlock.position.set(0.24, 1.0, -1.35);
    scene.add(knifeBlock);

    // ==========================================
    // 4. LEFT COUNTER, MICROWAVE, UPPER CABINETS & KETTLE
    // ==========================================
    // White Base Cabinets
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xfcfcfc, roughness: 0.3 });
    const leftCounterBase = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 1.6), cabinetMat);
    leftCounterBase.position.set(-1.25, 0.45, -0.65);
    leftCounterBase.receiveShadow = true;
    scene.add(leftCounterBase);

    // Oak Butcher Block Top
    const leftCounterTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 1.65), oakWoodMat);
    leftCounterTop.position.set(-1.25, 0.925, -0.65);
    leftCounterTop.castShadow = true;
    leftCounterTop.receiveShadow = true;
    scene.add(leftCounterTop);

    // Built-in Microwave
    const microMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4), blackGlassMat);
    microMesh.position.set(-1.2, 0.6, -0.65);
    microMesh.name = 'interactive_microwave';
    scene.add(microMesh);

    // Chrome Tea Kettle on Counter (Interactive boil tea)
    const kettleGroup = new THREE.Group();
    const kettleBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 })
    );
    const kettleSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.1), steelMat);
    kettleSpout.rotation.z = Math.PI / 4;
    kettleSpout.position.set(0.08, 0.05, 0);
    const kettleLid = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02), oakWoodMat);
    kettleLid.position.y = 0.09;
    kettleGroup.add(kettleBody, kettleSpout, kettleLid);
    kettleGroup.position.set(-1.15, 1.05, -0.3);
    kettleGroup.name = 'interactive_kettle';
    scene.add(kettleGroup);

    // Glass Cake Dome
    const cakeDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.1 })
    );
    cakeDome.position.set(-1.15, 1.05, -1.1);
    scene.add(cakeDome);

    // Upper Double Cabinets (White)
    const upperCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.8, 1.5), cabinetMat);
    upperCabinet.position.set(-1.3, 2.2, -0.65);
    scene.add(upperCabinet);

    // ==========================================
    // 5. RIGHT FLOATING SOLID OAK SHELVES (The 6 tiers from photo)
    // ==========================================
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0xba8045, roughness: 0.4 });
    const shelfGeo = new THREE.BoxGeometry(0.7, 0.04, 0.35);

    let appleMesh: THREE.Mesh | null = null;
    const shelfHeights = [0.85, 1.15, 1.45, 1.75, 2.05, 2.35];
    shelfHeights.forEach((y, idx) => {
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      shelf.position.set(0.85, y, -1.3);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      scene.add(shelf);

      // Shelf items matching the user's photo
      if (idx === 5) {
        // Shelf 1 (Top): White jug & chrome juicer
        const jug = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.07, 0.18, 16),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
        );
        jug.position.set(0.7, y + 0.1, -1.3);
        const juicer = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 16), steelMat);
        juicer.position.set(0.9, y + 0.08, -1.3);
        scene.add(jug, juicer);
      } else if (idx === 4) {
        // Shelf 2: Storage canisters & tall stockpot
        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.18, 24),
          new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 })
        );
        pot.position.set(0.9, y + 0.1, -1.3);
        const jar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1), cabinetMat);
        jar1.position.set(0.68, y + 0.06, -1.3);
        const jar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1), cabinetMat);
        jar2.position.set(0.77, y + 0.06, -1.3);
        scene.add(pot, jar1, jar2);
      } else if (idx === 3) {
        // Shelf 3: French press & black cast iron Dutch oven
        const dutchOven = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.11, 0.12, 24),
          new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 })
        );
        dutchOven.position.set(0.85, y + 0.07, -1.3);
        const press = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.15, 16),
          new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
        );
        press.position.set(0.65, y + 0.08, -1.3);
        scene.add(dutchOven, press);
      } else if (idx === 2) {
        // Shelf 4: Herb vase with white flowers & wine glasses
        const vase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.05, 0.14, 16),
          new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 })
        );
        vase.position.set(0.65, y + 0.08, -1.3);
        // Wine glasses
        const glass1 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.015, 0.12, 12),
          new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
        );
        glass1.position.set(0.82, y + 0.07, -1.3);
        const glass2 = glass1.clone();
        glass2.position.set(0.95, y + 0.07, -1.3);
        scene.add(vase, glass1, glass2);
      } else if (idx === 1) {
        // Shelf 5: Stack of white ceramic plates & wooden grinders
        const plateStack = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 24), cabinetMat);
        plateStack.position.set(0.92, y + 0.05, -1.3);
        const grinder = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.14, 12), oakWoodMat);
        grinder.position.set(0.72, y + 0.08, -1.3);
        scene.add(plateStack, grinder);
      } else if (idx === 0) {
        // Shelf 6: Wooden fruit bowl with fresh apples
        const fruitBowl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.06, 0.06, 16),
          new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.5 })
        );
        fruitBowl.position.set(0.75, y + 0.04, -1.3);
        // Apples
        const apple = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 })
        );
        apple.position.set(0.75, y + 0.08, -1.3);
        apple.name = 'interactive_apple';
        appleMesh = apple;
        scene.add(fruitBowl, apple);
      }
    });

    // Cookbooks nook under shelves
    const books = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    books.forEach((col, i) => {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.22, 0.18),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(col) })
      );
      book.position.set(0.65 + i * 0.045, 0.55, -1.3);
      scene.add(book);
    });

    // Ukulele on the wall (from the photo!)
    const ukeGroup = new THREE.Group();
    const ukeBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.3 })
    );
    ukeBody.rotation.x = Math.PI / 2;
    const ukeNeck = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.02), oakWoodMat);
    ukeNeck.position.set(0, 0.15, 0);
    ukeGroup.add(ukeBody, ukeNeck);
    ukeGroup.position.set(1.35, 1.45, -1.45);
    ukeGroup.name = 'interactive_ukulele';
    scene.add(ukeGroup);

    // ==========================================
    // 6. RIGHT FOREGROUND DISHWASHING STATION (Sink, Faucet, Dishwasher)
    // ==========================================
    const sinkCounterGroup = new THREE.Group();

    // Peninsula Counter Base (White + Oak sides)
    const sinkBase = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 1.6), cabinetMat);
    sinkBase.position.set(1.15, 0.45, 0.85);
    sinkBase.castShadow = true;
    sinkBase.receiveShadow = true;

    // Stainless Steel Countertop
    const sinkTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 1.65), steelMat);
    sinkTop.position.set(1.15, 0.925, 0.85);

    // Rectangular Sink Basin Cavity
    const sinkBasin = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.22, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.3 })
    );
    sinkBasin.position.set(1.05, 0.82, 0.85);

    // Tall Gooseneck Arch Faucet (with spray head)
    const faucetGroup = new THREE.Group();
    const faucetStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22), steelMat);
    faucetStem.position.set(0, 0.11, 0);

    const faucetArchGeo = new THREE.TorusGeometry(0.1, 0.014, 12, 24, Math.PI);
    faucetArchGeo.rotateY(Math.PI / 2);
    const faucetArch = new THREE.Mesh(faucetArchGeo, steelMat);
    faucetArch.position.set(0, 0.22, -0.1);

    const sprayHead = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.06), steelMat);
    sprayHead.position.set(0, 0.18, -0.2);

    const faucetHandle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.07, 0.01), steelMat);
    faucetHandle.position.set(0.04, 0.08, 0);

    faucetGroup.add(faucetStem, faucetArch, sprayHead, faucetHandle);
    faucetGroup.position.set(1.32, 0.95, 0.85);
    faucetGroup.name = 'interactive_faucet';

    // Dirty Dishes in Sink
    const plateGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.02, 24);
    const dirtyPlateMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 }); // Dirty food stain
    const plateMesh = new THREE.Mesh(plateGeo, dirtyPlateMat);
    plateMesh.position.set(1.05, 0.73, 0.85);
    plateMesh.name = 'interactive_plate';
    plateMeshRef.current = plateMesh;

    // Sponge
    const sponge = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.03, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.9 })
    );
    sponge.position.set(1.15, 0.73, 0.72);

    // Dish Soap Bottle
    const soapBottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2, transparent: true, opacity: 0.8 })
    );
    soapBottle.position.set(1.32, 1.02, 1.15);

    // Built-in Stainless Dishwasher Underneath
    const dishwasherFront = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.75, 0.65), steelMat);
    dishwasherFront.position.set(0.71, 0.45, 0.85);

    sinkCounterGroup.add(sinkBase, sinkTop, sinkBasin, faucetGroup, plateMesh, sponge, soapBottle, dishwasherFront);
    scene.add(sinkCounterGroup);

    // ==========================================
    // 7. PARTICLE SYSTEMS (Water Stream, Steam, Sizzle)
    // ==========================================
    // Water stream particles
    const waterParticleCount = 200;
    const waterGeo = new THREE.BufferGeometry();
    const waterPositions = new Float32Array(waterParticleCount * 3);
    for (let i = 0; i < waterParticleCount; i++) {
      waterPositions[i * 3] = 1.32;
      waterPositions[i * 3 + 1] = 1.1 - Math.random() * 0.35;
      waterPositions[i * 3 + 2] = 0.65 + (Math.random() - 0.5) * 0.03;
    }
    waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPositions, 3));
    const waterMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.03,
      transparent: true,
      opacity: 0,
    });
    const waterPoints = new THREE.Points(waterGeo, waterMat);
    scene.add(waterPoints);
    waterStreamRef.current = waterPoints;

    // Steam particles (for Kettle)
    const steamCount = 80;
    const steamGeo = new THREE.BufferGeometry();
    const steamPositions = new Float32Array(steamCount * 3);
    for (let i = 0; i < steamCount; i++) {
      steamPositions[i * 3] = -1.07 + (Math.random() - 0.5) * 0.05;
      steamPositions[i * 3 + 1] = 1.12 + Math.random() * 0.3;
      steamPositions[i * 3 + 2] = -0.3 + (Math.random() - 0.5) * 0.05;
    }
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));
    const steamMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0,
    });
    const steamPoints = new THREE.Points(steamGeo, steamMat);
    scene.add(steamPoints);
    steamParticlesRef.current = steamPoints;

    // Register interactive meshes for raycasting
    const interactives: THREE.Object3D[] = [
      faucetGroup,
      plateMesh,
      panGroup,
      flameMesh,
      kettleGroup,
      ovenDoorGroup,
      microMesh,
      ukeGroup,
      ...(appleMesh ? [appleMesh] : []),
    ];
    interactives.forEach((obj) => {
      obj.traverse((child: any) => {
        if (child.isMesh) {
          child.parentInteractive = obj.name;
          interactiveObjectsRef.current.push(child as THREE.Mesh);
        }
      });
    });

    // ==========================================
    // 8. INPUT LISTENERS (WASD, Arrows, Mouse Drag, Raycast)
    // ==========================================
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = true;
      keysPressedRef.current[e.key] = true;
      if (e.key === 'Escape') {
        handleInitiateExit();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
      keysPressedRef.current[e.key] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDraggingRef.current = true;
        previousMousePosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousMousePosRef.current.x;
        const deltaY = e.clientY - previousMousePosRef.current.y;
        previousMousePosRef.current = { x: e.clientX, y: e.clientY };

        cameraRotationRef.current.yaw -= deltaX * 0.004;
        cameraRotationRef.current.pitch -= deltaY * 0.004;
        cameraRotationRef.current.pitch = Math.max(-0.9, Math.min(0.9, cameraRotationRef.current.pitch));
      }

      // Raycasting for interactive hover tooltip
      const rect = renderer.domElement.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      const hits = raycaster.intersectObjects(interactiveObjectsRef.current, false);

      if (hits.length > 0) {
        const hitObj = hits[0].object as any;
        const parentName = hitObj.parentInteractive || hitObj.name;
        setActiveObject(parentName);
        updatePromptForObject(parentName);
      } else {
        setActiveObject(null);
        setActivePrompt(null);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    // Click handler for 3D objects
    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      const hits = raycaster.intersectObjects(interactiveObjectsRef.current, false);

      if (hits.length > 0) {
        const hitObj = hits[0].object as any;
        const parentName = hitObj.parentInteractive || hitObj.name;
        triggerObjectAction(parentName);
      }
    };

    // Touch support for mobile / tablets
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - previousMousePosRef.current.x;
        const deltaY = e.touches[0].clientY - previousMousePosRef.current.y;
        previousMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        cameraRotationRef.current.yaw -= deltaX * 0.005;
        cameraRotationRef.current.pitch -= deltaY * 0.005;
        cameraRotationRef.current.pitch = Math.max(-0.9, Math.min(0.9, cameraRotationRef.current.pitch));
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const dom = renderer.domElement;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('click', handleClick);
    dom.addEventListener('touchstart', handleTouchStart);
    dom.addEventListener('touchmove', handleTouchMove);
    dom.addEventListener('touchend', handleTouchEnd);

    // ==========================================
    // 9. ANIMATION LOOP (Movement & Visual Effects)
    // ==========================================
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);

      // Keyboard movement (W, A, S, D, Arrow keys)
      const keys = keysPressedRef.current;
      const speed = 2.4 * delta;
      const yaw = cameraRotationRef.current.yaw;

      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const strafeX = Math.cos(yaw);
      const strafeZ = -Math.sin(yaw);

      let moveX = 0;
      let moveZ = 0;

      if (keys['KeyW'] || keys['ArrowUp'] || keys['w'] || keys['W']) {
        moveX += forwardX * speed;
        moveZ += forwardZ * speed;
      }
      if (keys['KeyS'] || keys['ArrowDown'] || keys['s'] || keys['S']) {
        moveX -= forwardX * speed;
        moveZ -= forwardZ * speed;
      }
      if (keys['KeyA'] || keys['ArrowLeft'] || keys['a'] || keys['A']) {
        moveX -= strafeX * speed;
        moveZ -= strafeZ * speed;
      }
      if (keys['KeyD'] || keys['ArrowRight'] || keys['d'] || keys['D']) {
        moveX += strafeX * speed;
        moveZ += strafeZ * speed;
      }

      // Smooth collision bounds (Walkable hallway between -0.65 to 0.75 in X, and -0.35 to 2.3 in Z)
      const nextX = playerPosRef.current.x + moveX;
      const nextZ = playerPosRef.current.z + moveZ;

      if (nextX >= -0.65 && nextX <= 0.75) {
        playerPosRef.current.x = nextX;
      }
      if (nextZ >= -0.35 && nextZ <= 2.3) {
        playerPosRef.current.z = nextZ;
      }

      // Update camera orientation
      camera.position.set(playerPosRef.current.x, playerPosRef.current.y, playerPosRef.current.z);

      const lookTarget = new THREE.Vector3(
        playerPosRef.current.x - Math.sin(cameraRotationRef.current.yaw) * Math.cos(cameraRotationRef.current.pitch),
        playerPosRef.current.y + Math.sin(cameraRotationRef.current.pitch),
        playerPosRef.current.z - Math.cos(cameraRotationRef.current.yaw) * Math.cos(cameraRotationRef.current.pitch)
      );
      camera.lookAt(lookTarget);

      // Animate water stream particles
      if (waterStreamRef.current && (waterStreamRef.current.material as THREE.PointsMaterial).opacity > 0) {
        const positions = waterStreamRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < waterParticleCount; i++) {
          positions[i * 3 + 1] -= delta * 1.5;
          if (positions[i * 3 + 1] < 0.74) {
            positions[i * 3 + 1] = 1.1;
          }
        }
        waterStreamRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Animate steam particles
      if (steamParticlesRef.current && (steamParticlesRef.current.material as THREE.PointsMaterial).opacity > 0) {
        const positions = steamParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < steamCount; i++) {
          positions[i * 3 + 1] += delta * 0.4;
          positions[i * 3] += (Math.random() - 0.5) * delta * 0.1;
          if (positions[i * 3 + 1] > 1.45) {
            positions[i * 3 + 1] = 1.12;
            positions[i * 3] = -1.07 + (Math.random() - 0.5) * 0.05;
          }
        }
        steamParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('click', handleClick);
      dom.removeEventListener('touchstart', handleTouchStart);
      dom.removeEventListener('touchmove', handleTouchMove);
      dom.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update hover prompt text
  const updatePromptForObject = (name: string) => {
    switch (name) {
      case 'interactive_faucet':
        setActivePrompt(faucetRunning ? 'Turn Off Water Faucet' : 'Turn On Water Faucet 🚰');
        break;
      case 'interactive_plate':
        setActivePrompt('Scrub & Wash Dirty Dish 🧼');
        break;
      case 'interactive_pan':
        setActivePrompt('Flip Breakfast Eggs in Pan 🍳');
        break;
      case 'interactive_kettle':
        setActivePrompt(kettleBoiling ? 'Stop Kettle' : 'Boil Tea Kettle ☕');
        break;
      case 'interactive_oven':
        setActivePrompt(ovenOpen ? 'Close Oven Door' : 'Open Oven & Inspect Cookies 🍪');
        break;
      case 'interactive_microwave':
        setActivePrompt('Start Microwave (Popcorn Mode) 🍿');
        break;
      case 'interactive_ukulele':
        setActivePrompt('Strum the Kitchen Ukulele 🎸');
        break;
      case 'interactive_apple':
        setActivePrompt('Grab Fresh Red Apple 🍎');
        break;
      default:
        setActivePrompt(null);
    }
  };

  // Trigger Object Interaction
  const triggerObjectAction = useCallback((name: string) => {
    switch (name) {
      case 'interactive_faucet': {
        const next = !faucetRunning;
        setFaucetRunning(next);
        if (next) {
          audioRef.current.startWaterSound();
          if (waterStreamRef.current) {
            (waterStreamRef.current.material as THREE.PointsMaterial).opacity = 0.8;
          }
        } else {
          audioRef.current.stopWaterSound();
          if (waterStreamRef.current) {
            (waterStreamRef.current.material as THREE.PointsMaterial).opacity = 0;
          }
        }
        break;
      }
      case 'interactive_plate': {
        audioRef.current.playWashClink();
        setTimeout(() => audioRef.current.playSparkle(), 250);
        setPlatesCleanCount((prev) => prev + 1);
        if (plateMeshRef.current) {
          (plateMeshRef.current.material as THREE.MeshStandardMaterial).color.set(0xffffff); // Turn clean white
        }
        break;
      }
      case 'interactive_pan': {
        audioRef.current.playClick();
        const next = !foodCooking;
        setFoodCooking(next);
        if (next) {
          audioRef.current.startSizzleSound();
          setStoveIgnited(true);
          if (flameMeshRef.current) {
            (flameMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.85;
          }
        } else {
          audioRef.current.stopSizzleSound();
          setStoveIgnited(false);
          if (flameMeshRef.current) {
            (flameMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
          }
        }
        break;
      }
      case 'interactive_kettle': {
        const next = !kettleBoiling;
        setKettleBoiling(next);
        if (next) {
          audioRef.current.playBoilWhistle();
          if (steamParticlesRef.current) {
            (steamParticlesRef.current.material as THREE.PointsMaterial).opacity = 0.7;
          }
        } else {
          if (steamParticlesRef.current) {
            (steamParticlesRef.current.material as THREE.PointsMaterial).opacity = 0;
          }
        }
        break;
      }
      case 'interactive_oven': {
        audioRef.current.playClick();
        const next = !ovenOpen;
        setOvenOpen(next);
        if (ovenDoorRef.current) {
          ovenDoorRef.current.rotation.x = next ? Math.PI / 3 : 0;
        }
        break;
      }
      case 'interactive_microwave': {
        audioRef.current.playClick();
        setMicrowaveRunning(true);
        setTimeout(() => {
          audioRef.current.playSparkle();
          setMicrowaveRunning(false);
        }, 2000);
        break;
      }
      case 'interactive_ukulele': {
        audioRef.current.playUkulele();
        setUkuleleStrummed(true);
        setTimeout(() => setUkuleleStrummed(false), 800);
        break;
      }
      case 'interactive_apple': {
        audioRef.current.playSparkle();
        setAppleGrabbed(true);
        setTimeout(() => setAppleGrabbed(false), 2000);
        break;
      }
    }
  }, [faucetRunning, foodCooking, kettleBoiling, ovenOpen]);

  // Touch Virtual Movement
  const moveDirection = (dir: 'forward' | 'back' | 'left' | 'right') => {
    const yaw = cameraRotationRef.current.yaw;
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const strafeX = Math.cos(yaw);
    const strafeZ = -Math.sin(yaw);
    const step = 0.35;

    let dX = 0;
    let dZ = 0;
    if (dir === 'forward') { dX = forwardX * step; dZ = forwardZ * step; }
    if (dir === 'back') { dX = -forwardX * step; dZ = -forwardZ * step; }
    if (dir === 'left') { dX = -strafeX * step; dZ = -strafeZ * step; }
    if (dir === 'right') { dX = strafeX * step; dZ = strafeZ * step; }

    const nextX = playerPosRef.current.x + dX;
    const nextZ = playerPosRef.current.z + dZ;
    if (nextX >= -0.65 && nextX <= 0.75) playerPosRef.current.x = nextX;
    if (nextZ >= -0.35 && nextZ <= 2.3) playerPosRef.current.z = nextZ;
    audioRef.current.playClick();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 select-none overflow-hidden font-sans">
      {/* Top Header with Back/Exit button and Humorous respect banner */}
      <header className="relative z-30 flex items-center justify-between px-4 py-2 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          {/* Exit Kitchen Button with Esc badge */}
          <button
            onClick={handleInitiateExit}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer border border-red-400/40 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Exit Kitchen</span>
            <kbd className="hidden sm:inline bg-black/40 px-1.5 py-0.5 rounded text-[10px] font-mono text-red-200">
              Esc
            </kbd>
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            <span className="text-xl">👩‍🍳</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-rose-300 uppercase tracking-wide">
                  The Kitchen 3D Arena
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-950/80 text-pink-300 border border-pink-500/30">
                  <Sparkles className="w-3 h-3 text-pink-400" /> Free Roam 3D
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden md:block">
                Walk anywhere (WASD / Arrows) · Scrub dishes · Cook stove · Inspect shelves
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right Humorous Respect Disclaimer */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-rose-950/60 border border-rose-500/30 rounded-xl text-xs text-rose-200 font-semibold">
          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 animate-pulse" />
          <span>I Respect All Women — Just For Fun! 😄</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </header>

      {/* 3D Viewport Canvas Container */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-stone-900 cursor-crosshair" ref={mountRef}>
        {/* Reticle / Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="w-3 h-3 border-2 border-white/60 rounded-full" />
        </div>

        {/* Hover Interaction Prompt */}
        {activePrompt && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-bounce">
            <div className="bg-slate-900/95 border border-pink-500/50 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-2xl shadow-pink-500/20 backdrop-blur-md flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{activePrompt}</span>
            </div>
          </div>
        )}

        {/* Quick Hotspot Teleport Bar */}
        <div className="absolute top-3 left-4 z-20 hidden md:flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-1 rounded-xl text-[11px] font-bold text-slate-300">
          <span className="text-[10px] text-slate-400 px-1.5 flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" /> Jump To:
          </span>
          <button
            onClick={() => teleportTo(0, 1.8, 0)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            📍 Entrance
          </button>
          <button
            onClick={() => teleportTo(0.65, 0.9, -0.2)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-cyan-300"
          >
            🚰 Sink & Dishes
          </button>
          <button
            onClick={() => teleportTo(-0.25, -0.4, 0, -0.25)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-amber-300"
          >
            🍳 Stove & Oven
          </button>
          <button
            onClick={() => teleportTo(0.4, -0.5, 0.4, 0.1)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-rose-300"
          >
            🏺 Oak Shelves
          </button>
          <button
            onClick={() => teleportTo(-0.5, 0.2, -1.5, 0)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-emerald-300"
          >
            ☕ Tea & Counter
          </button>
        </div>

        {/* Floating Mini Checklist / Progress */}
        <div className="absolute bottom-4 left-4 z-20 bg-slate-950/85 backdrop-blur-md border border-slate-800 p-3 rounded-2xl text-xs space-y-1.5 max-w-xs shadow-xl hidden sm:block">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider pb-1 border-b border-slate-800">
            <span>Kitchen Chores Tracker</span>
            <span className="text-cyan-400">{platesCleanCount} / 3 Clean</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className={platesCleanCount > 0 ? 'text-emerald-400' : 'text-slate-500'}>
              {platesCleanCount > 0 ? '✓' : '○'}
            </span>
            <span>Wash dirty dishes in sink</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className={foodCooking ? 'text-emerald-400' : 'text-slate-500'}>
              {foodCooking ? '✓' : '○'}
            </span>
            <span>Fry eggs on the stove</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className={kettleBoiling ? 'text-emerald-400' : 'text-slate-500'}>
              {kettleBoiling ? '✓' : '○'}
            </span>
            <span>Boil tea kettle on counter</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className={ovenOpen ? 'text-emerald-400' : 'text-slate-500'}>
              {ovenOpen ? '✓' : '○'}
            </span>
            <span>Check fresh cookies in oven</span>
          </div>
        </div>

        {/* Mobile / Touch On-Screen D-Pad Controls */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-center gap-1 sm:hidden bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
          <button
            onClick={() => moveDirection('forward')}
            className="w-10 h-10 bg-slate-800 active:bg-cyan-600 rounded-lg flex items-center justify-center font-bold text-white shadow"
          >
            ▲
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => moveDirection('left')}
              className="w-10 h-10 bg-slate-800 active:bg-cyan-600 rounded-lg flex items-center justify-center font-bold text-white shadow"
            >
              ◀
            </button>
            <button
              onClick={() => moveDirection('back')}
              className="w-10 h-10 bg-slate-800 active:bg-cyan-600 rounded-lg flex items-center justify-center font-bold text-white shadow"
            >
              ▼
            </button>
            <button
              onClick={() => moveDirection('right')}
              className="w-10 h-10 bg-slate-800 active:bg-cyan-600 rounded-lg flex items-center justify-center font-bold text-white shadow"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Action feedback notifications */}
        {microwaveRunning && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-amber-500/90 text-slate-950 font-black text-xs px-4 py-1.5 rounded-full shadow-lg">
            🍿 Microwave Humming... Popcorn Ready in 2s!
          </div>
        )}
        {appleGrabbed && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-emerald-500/90 text-slate-950 font-black text-xs px-4 py-1.5 rounded-full shadow-lg">
            🍎 You ate a crisp apple! +50 Health
          </div>
        )}
        {ukuleleStrummed && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-purple-500/90 text-white font-black text-xs px-4 py-1.5 rounded-full shadow-lg">
            🎶 Strumming smooth ukulele tunes!
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* EXIT MODAL WITH TIMER (Requested: keep timer saying exiting AND I RESPECT ALL WOMEN JUST FOR FUN) */}
      {/* ========================================================================= */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-rose-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/50 text-center space-y-6 animate-in fade-in zoom-in duration-200">
            {/* Countdown Badge */}
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-4xl font-black text-slate-950 shadow-xl shadow-rose-500/30 animate-pulse">
              {exitTimer}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Exiting Kitchen in {exitTimer}s...
              </h2>
              <p className="text-sm text-slate-300">
                Pencils down, spatulas away! Escaping back to the gaming lounge. 🏃💨
              </p>
            </div>

            {/* Respect Banner (Bold & Highlighted) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/90 via-pink-900/60 to-purple-950/90 border border-rose-500/40 text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 text-rose-300 font-black text-sm uppercase tracking-wide">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                <span>AND I RESPECT ALL WOMEN JUST FOR FUN</span>
              </div>
              <p className="text-xs text-rose-200/80">
                Created purely for humor & laughs with full love and respect! ❤️
              </p>
            </div>

            {/* Timer Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-500 to-amber-400 h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(exitTimer / 3) * 100}%` }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancelExit}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                Stay in Kitchen
              </button>
              <button
                onClick={handleInstantExit}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                Exit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
