import { useEffect, useRef } from "react";
import type { EquippedCosmetics, GameUniverse } from "../types/game";

export type CanvasPickupType = "coin" | "fact" | "quiz" | "portal";

interface TrackEntity {
  id: number;
  kind: CanvasPickupType;
  lane: 0 | 1 | 2;
  /** 0 = far horizon -> 1 = near player in 3-lane mode; or X coordinate in Bob Run mode */
  progress: number;
  /** Elevation height in Bob Run mode (0 = ground, 1 = mid platform, 2 = high coin arc) */
  yLevel: number;
  collected: boolean;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingPopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface NutriRunCanvasProps {
  universe: GameUniverse;
  paused: boolean;
  running: boolean;
  level: number;
  initialDistanceKm: number;
  equippedCosmetics: EquippedCosmetics;
  actionSignal: { seq: number; action: "left" | "right" | "jump" } | null;
  onDistanceTick: (distanceKm: number, score: number, coinsCollected: number) => void;
  onPickupCoin: (amount: number) => void;
  onPickupFact: () => void;
  onPickupQuiz: () => void;
  onPortalReached: () => void;
}

const LOGICAL_W = 760;
const LOGICAL_H = 420;

// Fast, fun pacing so Fact/Hack boxes, Dimension Portals (Universe Switch), and Quizzes show up early!
const FIRST_FACT_OFFSET_KM = 0.24;
const REPEAT_FACT_KM = 0.85;
const FIRST_PORTAL_OFFSET_KM = 0.45;
const REPEAT_PORTAL_KM = 1.05;
const FIRST_QUIZ_OFFSET_KM = 0.65;
const REPEAT_QUIZ_KM = 1.35;

// Deterministic twinkling night sky stars (seeded so zero allocation per frame)
const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: ((i * 137.5) % (LOGICAL_W - 20)) + 10,
  y: ((i * 53.7) % 150) + 10,
  r: (i % 3) * 0.55 + 0.7,
  phase: i * 0.9,
}));

// Deterministic skyline silhouette buildings flanking the 3-lane vanishing corridor
const SKYLINE_TOWERS = [
  { side: -1, dist: 0.92, w: 46, h: 78, lights: 3 },
  { side: -1, dist: 0.72, w: 38, h: 58, lights: 2 },
  { side: -1, dist: 0.52, w: 30, h: 46, lights: 2 },
  { side: -1, dist: 0.34, w: 22, h: 32, lights: 1 },
  { side: 1, dist: 0.9, w: 48, h: 82, lights: 3 },
  { side: 1, dist: 0.7, w: 36, h: 62, lights: 2 },
  { side: 1, dist: 0.5, w: 28, h: 44, lights: 2 },
  { side: 1, dist: 0.32, w: 22, h: 30, lights: 1 },
];

export function NutriRunCanvas({
  universe,
  paused,
  running,
  level,
  initialDistanceKm,
  equippedCosmetics,
  actionSignal,
  onDistanceTick,
  onPickupCoin,
  onPickupFact,
  onPickupQuiz,
  onPortalReached,
}: NutriRunCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevUniverseRef = useRef<GameUniverse>(universe);

  const callbacksRef = useRef({
    onDistanceTick,
    onPickupCoin,
    onPickupFact,
    onPickupQuiz,
    onPortalReached,
  });
  callbacksRef.current = {
    onDistanceTick,
    onPickupCoin,
    onPickupFact,
    onPickupQuiz,
    onPortalReached,
  };

  const stateRef = useRef({
    lane: 1 as 0 | 1 | 2,
    visualLaneX: 1,
    leanAngle: 0,
    playerY: 0,
    vy: 0,
    bobX: 160,
    bobVx: 0,
    distanceKm: initialDistanceKm,
    score: 0,
    coins: 0,
    spawnTimer: 0.25,
    nextFactAtKm: initialDistanceKm + FIRST_FACT_OFFSET_KM,
    nextQuizAtKm: initialDistanceKm + FIRST_QUIZ_OFFSET_KM,
    nextPortalAtKm: initialDistanceKm + FIRST_PORTAL_OFFSET_KM,
    nextId: 1,
    entities: [] as TrackEntity[],
    trail: [] as { x: number; y: number }[],
    particles: [] as BurstParticle[],
    popups: [] as FloatingPopup[],
    frameTick: 0,
    idleTick: 0,
    lastReportedStep: 0,
  });

  // Reset run state cleanly when not running
  useEffect(() => {
    if (!running) {
      const s = stateRef.current;
      s.distanceKm = initialDistanceKm;
      s.score = 0;
      s.coins = 0;
      s.entities = [];
      s.particles = [];
      s.popups = [];
      s.trail = [];
      s.lane = 1;
      s.visualLaneX = 1;
      s.leanAngle = 0;
      s.playerY = 0;
      s.vy = 0;
      s.bobX = 160;
      s.bobVx = 0;
      s.spawnTimer = 0.22;
      s.lastReportedStep = 0;
      s.nextFactAtKm = initialDistanceKm + FIRST_FACT_OFFSET_KM;
      s.nextQuizAtKm = initialDistanceKm + FIRST_QUIZ_OFFSET_KM;
      s.nextPortalAtKm = initialDistanceKm + FIRST_PORTAL_OFFSET_KM;
    }
  }, [running, initialDistanceKm]);

  // Flush coordinate-incompatible entities cleanly when switching universes mid-run
  useEffect(() => {
    if (prevUniverseRef.current !== universe) {
      prevUniverseRef.current = universe;
      const s = stateRef.current;
      s.entities = [];
      s.trail = [];
      s.playerY = 0;
      s.vy = 0;
      s.lane = 1;
      s.visualLaneX = 1;
      s.leanAngle = 0;
      s.bobX = 160;
      s.bobVx = 0;
      s.spawnTimer = 0.25;
      s.nextFactAtKm = Math.min(s.nextFactAtKm, s.distanceKm + 0.3);
      s.nextPortalAtKm = Math.max(s.nextPortalAtKm, s.distanceKm + 0.9);
      s.popups.push({
        x: LOGICAL_W / 2,
        y: 120,
        text: universe === "platform_bob" ? "BOB RUN WORLD!" : "3-LANE TRACK!",
        color: "#38BDF8",
        life: 1.4,
        maxLife: 1.4,
      });
    }
  }, [universe]);

  const triggerAction = (action: "left" | "right" | "jump") => {
    const s = stateRef.current;
    if (universe === "runner_3lane") {
      if (action === "left") {
        s.lane = Math.max(0, s.lane - 1) as 0 | 1 | 2;
      } else if (action === "right") {
        s.lane = Math.min(2, s.lane + 1) as 0 | 1 | 2;
      } else if (action === "jump" && s.playerY === 0) {
        s.vy = 15.2;
      }
    } else {
      if (action === "left") {
        s.bobVx = -230;
      } else if (action === "right") {
        s.bobVx = 230;
      } else if (action === "jump" && s.playerY <= 1) {
        s.vy = 17.0;
      }
    }
  };

  useEffect(() => {
    if (!actionSignal) return;
    triggerAction(actionSignal.action);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionSignal]);

  // Keyboard bindings cleanly scoped while actively running
  useEffect(() => {
    if (!running || paused) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        triggerAction("left");
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        triggerAction("right");
      } else if (
        e.key === " " ||
        e.key === "ArrowUp" ||
        e.key === "w" ||
        e.key === "W"
      ) {
        e.preventDefault();
        triggerAction("jump");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, paused, universe]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Sharp HiDPI canvas backing buffer
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== LOGICAL_W * dpr || canvas.height !== LOGICAL_H * dpr) {
      canvas.width = LOGICAL_W * dpr;
      canvas.height = LOGICAL_H * dpr;
    }

    let rafId = 0;
    let lastTs = performance.now();

    const addBurst = (
      s: typeof stateRef.current,
      x: number,
      y: number,
      color: string,
      count: number,
    ) => {
      if (prefersReduced) return;
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const spd = 55 + Math.random() * 115;
        s.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 35,
          life: 0.45 + Math.random() * 0.2,
          maxLife: 0.65,
          color,
          size: 2.2 + Math.random() * 2.4,
        });
      }
    };

    const spawnItem = (s: typeof stateRef.current) => {
      let kind: CanvasPickupType = "coin";
      if (s.distanceKm >= s.nextPortalAtKm) {
        kind = "portal";
        s.nextPortalAtKm = s.distanceKm + REPEAT_PORTAL_KM;
      } else if (s.distanceKm >= s.nextQuizAtKm) {
        kind = "quiz";
        s.nextQuizAtKm = s.distanceKm + REPEAT_QUIZ_KM;
      } else if (s.distanceKm >= s.nextFactAtKm) {
        kind = "fact";
        s.nextFactAtKm = s.distanceKm + REPEAT_FACT_KM;
      }

      const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
      const yLevel =
        kind === "coin" && universe === "platform_bob" && Math.random() > 0.45 ? 1 : 0;

      s.entities.push({
        id: s.nextId++,
        kind,
        lane,
        progress: universe === "runner_3lane" ? 0.03 : LOGICAL_W + 46,
        yLevel,
        collected: false,
      });
    };

    const handleEntityCollection = (
      s: typeof stateRef.current,
      kind: CanvasPickupType,
      x: number,
      y: number,
    ) => {
      if (kind === "coin") {
        s.coins += 2;
        addBurst(s, x, y - 10, "#FBBF24", 8);
        s.popups.push({
          x,
          y: y - 22,
          text: "+2 COINS",
          color: "#FDE047",
          life: 0.75,
          maxLife: 0.75,
        });
        callbacksRef.current.onPickupCoin(2);
      } else if (kind === "fact") {
        addBurst(s, x, y - 12, "#34D399", 12);
        callbacksRef.current.onPickupFact();
      } else if (kind === "quiz") {
        addBurst(s, x, y - 12, "#F472B6", 12);
        callbacksRef.current.onPickupQuiz();
      } else if (kind === "portal") {
        addBurst(s, x, y - 28, "#38BDF8", 16);
        callbacksRef.current.onPortalReached();
      }
    };

    const drawRunnerFrame = (dt: number) => {
      const s = stateRef.current;
      const hasSolarSkin = equippedCosmetics.skin === "skin_solar_runner";
      const hasTrail = equippedCosmetics.trail === "trail_mint_comet";
      const hasAuroraPortal = equippedCosmetics.portal === "portal_aurora_ring";

      if (!prefersReduced) {
        s.idleTick += dt * 3;
      }

      if (running && !paused) {
        const kmRate = 0.14 + Math.min(level - 1, 3) * 0.025;
        s.distanceKm += kmRate * dt;
        s.score = Math.floor(s.distanceKm * 100 + s.coins * 15);
        s.frameTick += dt * 8.5;

        // Vertical jump physics
        if (s.playerY > 0 || s.vy !== 0) {
          s.playerY += s.vy * dt * 22;
          s.vy -= 42 * dt;
          if (s.playerY <= 0) {
            s.playerY = 0;
            s.vy = 0;
          }
        }

        if (universe === "runner_3lane") {
          const prevVisual = s.visualLaneX;
          s.visualLaneX += (s.lane - s.visualLaneX) * Math.min(1, dt * 15);
          const targetLean = Math.max(-1, Math.min(1, (s.visualLaneX - prevVisual) * 18));
          s.leanAngle += (targetLean - s.leanAngle) * Math.min(1, dt * 16);
        } else {
          s.bobX = Math.max(70, Math.min(LOGICAL_W - 140, s.bobX + s.bobVx * dt));
          s.bobVx *= Math.pow(0.02, dt);
          const targetLean = Math.max(-0.85, Math.min(0.85, s.bobVx / 240));
          s.leanAngle += (targetLean - s.leanAngle) * Math.min(1, dt * 14);
        }

        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
          spawnItem(s);
          s.spawnTimer = 0.64;
        }

        // Update particles & popups
        s.particles = s.particles.filter((pt) => {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.vy += 190 * dt;
          pt.life -= dt;
          return pt.life > 0;
        });
        s.popups = s.popups.filter((pop) => {
          pop.y -= 38 * dt;
          pop.life -= dt;
          return pop.life > 0;
        });

        // Smooth distance telemetry (~25 Hz cap at 50 buckets per km)
        const stepBucket = Math.floor(s.distanceKm * 50);
        if (stepBucket > s.lastReportedStep) {
          s.lastReportedStep = stepBucket;
          callbacksRef.current.onDistanceTick(s.distanceKm, s.score, s.coins);
        }
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

      const animTick = running ? s.frameTick : s.idleTick;

      if (universe === "runner_3lane") {
        const horizonY = 128;
        draw3LaneSkyAndCity(ctx, horizonY, animTick, prefersReduced);

        // 3-lane perspective geometry
        const topLeft = LOGICAL_W / 2 - 82;
        const topRight = LOGICAL_W / 2 + 82;
        const botLeft = 78;
        const botRight = LOGICAL_W - 78;

        // Outer metallic track shoulders
        ctx.fillStyle = "#0b1512";
        ctx.beginPath();
        ctx.moveTo(topLeft - 14, horizonY);
        ctx.lineTo(topRight + 14, horizonY);
        ctx.lineTo(botRight + 32, LOGICAL_H);
        ctx.lineTo(botLeft - 32, LOGICAL_H);
        ctx.closePath();
        ctx.fill();

        // Main wet-asphalt track gradient with horizon sun sheen
        const roadGrad = ctx.createLinearGradient(0, horizonY, 0, LOGICAL_H);
        roadGrad.addColorStop(0, "#142620");
        roadGrad.addColorStop(0.35, "#0f1c17");
        roadGrad.addColorStop(1, "#080d0b");
        ctx.fillStyle = roadGrad;
        ctx.beginPath();
        ctx.moveTo(topLeft, horizonY);
        ctx.lineTo(topRight, horizonY);
        ctx.lineTo(botRight, LOGICAL_H);
        ctx.lineTo(botLeft, LOGICAL_H);
        ctx.closePath();
        ctx.fill();

        // Horizon light reflection streak down center lane
        const sheen = ctx.createLinearGradient(0, horizonY, 0, horizonY + 180);
        sheen.addColorStop(0, "rgba(163, 255, 18, 0.16)");
        sheen.addColorStop(1, "rgba(163, 255, 18, 0)");
        ctx.fillStyle = sheen;
        ctx.beginPath();
        ctx.moveTo(LOGICAL_W / 2 - 22, horizonY);
        ctx.lineTo(LOGICAL_W / 2 + 22, horizonY);
        ctx.lineTo(LOGICAL_W / 2 + 95, horizonY + 180);
        ctx.lineTo(LOGICAL_W / 2 - 95, horizonY + 180);
        ctx.closePath();
        ctx.fill();

        // Perspective cross-ties (speed stripes rushing toward camera)
        const tiePhase = (s.frameTick * 0.22) % 1;
        for (let i = 0; i < 10; i++) {
          const frac = (i / 10 + tiePhase * 0.1) % 1;
          const depth = Math.pow(frac, 1.8);
          const ty = horizonY + (LOGICAL_H - horizonY) * depth;
          const xl = topLeft + (botLeft - topLeft) * depth;
          const xr = topRight + (botRight - topRight) * depth;
          ctx.strokeStyle = `rgba(52, 211, 153, ${0.06 + depth * 0.14})`;
          ctx.lineWidth = 1 + depth * 1.4;
          ctx.beginPath();
          ctx.moveTo(xl + 4, ty);
          ctx.lineTo(xr - 4, ty);
          ctx.stroke();
        }

        // Outer neon side rails with soft glow
        ctx.save();
        ctx.shadowColor = "rgba(52, 211, 153, 0.7)";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "#34D399";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(topLeft, horizonY);
        ctx.lineTo(botLeft, LOGICAL_H);
        ctx.moveTo(topRight, horizonY);
        ctx.lineTo(botRight, LOGICAL_H);
        ctx.stroke();
        ctx.restore();

        // Perspective lane dividers
        const t1Top = topLeft + (topRight - topLeft) / 3;
        const t1Bot = botLeft + (botRight - botLeft) / 3;
        const t2Top = topLeft + ((topRight - topLeft) * 2) / 3;
        const t2Bot = botLeft + ((botRight - botLeft) * 2) / 3;

        ctx.strokeStyle = "rgba(163, 255, 18, 0.42)";
        ctx.lineWidth = 2;
        ctx.setLineDash([16, 18]);
        ctx.lineDashOffset = -s.frameTick * 22;
        ctx.beginPath();
        ctx.moveTo(t1Top, horizonY);
        ctx.lineTo(t1Bot, LOGICAL_H);
        ctx.moveTo(t2Top, horizonY);
        ctx.lineTo(t2Bot, LOGICAL_H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Roadside neon wellness trees / mile-markers rushing along both sides
        for (let i = 0; i < 6; i++) {
          const prog = ((i / 6 + (s.frameTick * 0.085) % 1) % 1);
          const depth = Math.pow(prog, 1.6);
          const py = horizonY + (LOGICAL_H - horizonY) * depth;
          const xl = topLeft - 24 + (botLeft - 52 - (topLeft - 24)) * depth;
          const xr = topRight + 24 + (botRight + 52 - (topRight + 24)) * depth;
          const sc = 0.24 + depth * 0.85;
          drawRoadsideBeacon(ctx, xl, py, sc, -1);
          drawRoadsideBeacon(ctx, xr, py, sc, 1);
        }

        const laneCenterX = (laneVal: number, prog: number) => {
          const leftEdge = topLeft + (botLeft - topLeft) * prog;
          const rightEdge = topRight + (botRight - topRight) * prog;
          const laneW = (rightEdge - leftEdge) / 3;
          return leftEdge + laneW * (laneVal + 0.5);
        };

        // Update & draw track entities back-to-front
        const activeEntities: TrackEntity[] = [];
        for (const ent of s.entities) {
          if (running && !paused) {
            ent.progress += 0.68 * dt;
          }
          if (ent.progress > 1.08 || ent.collected) continue;

          const p = ent.progress;
          const depth = Math.pow(p, 1.35);
          const y = horizonY + (LOGICAL_H - horizonY) * depth;
          const x = ent.kind === "portal" ? LOGICAL_W / 2 : laneCenterX(ent.lane, depth);
          const scale = 0.34 + p * 0.92;

          if (running && !paused && p >= 0.78 && p <= 0.94) {
            const laneHit = ent.kind === "portal" || Math.abs(s.visualLaneX - ent.lane) < 0.5;
            if (laneHit) {
              ent.collected = true;
              handleEntityCollection(s, ent.kind, x, y);
              continue;
            }
          }

          activeEntities.push(ent);
          drawPickup3D(ctx, ent.kind, x, y, scale, hasAuroraPortal, animTick);
        }
        s.entities = activeEntities;

        // Player ground position & comet trail
        const px = laneCenterX(s.visualLaneX, 0.86);
        const shadowY = LOGICAL_H - 26;
        const py = LOGICAL_H - 54 - s.playerY;

        if (hasTrail && !prefersReduced && running) {
          s.trail.push({ x: px, y: py + 12 });
          if (s.trail.length > 10) s.trail.shift();
          for (let i = 0; i < s.trail.length; i++) {
            const tr = s.trail[i];
            const ratio = i / s.trail.length;
            ctx.fillStyle = `rgba(52, 211, 153, ${ratio * 0.45})`;
            ctx.beginPath();
            ctx.arc(tr.x, tr.y + (s.trail.length - i) * 3.8, 9 * ratio, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        drawArticulatedRunner(
          ctx,
          px,
          py,
          shadowY,
          s.playerY,
          s.leanAngle,
          hasSolarSkin,
          animTick,
          running,
        );
      } else {
        // Universe 2: Rich Parallax Bob Run Adventure World
        const groundY = 342;
        drawBobParallaxWorld(ctx, groundY, s.frameTick, animTick, prefersReduced);

        const px = s.bobX;
        const shadowY = groundY + 4;
        const py = groundY - 26 - s.playerY;

        if (hasTrail && !prefersReduced && running) {
          s.trail.push({ x: px - 14, y: py });
          if (s.trail.length > 9) s.trail.shift();
          for (let i = 0; i < s.trail.length; i++) {
            const tr = s.trail[i];
            const ratio = i / s.trail.length;
            ctx.fillStyle = `rgba(56, 189, 248, ${ratio * 0.45})`;
            ctx.beginPath();
            ctx.arc(tr.x - (s.trail.length - i) * 5, tr.y, 7.5 * ratio, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        const activeEntities: TrackEntity[] = [];
        for (const ent of s.entities) {
          if (running && !paused) {
            ent.progress -= 275 * dt;
          }
          if (ent.progress < -55 || ent.collected) continue;

          const ex = ent.progress;
          const ey = ent.kind === "portal" ? groundY - 20 : ent.yLevel > 0 ? 204 : groundY - 12;

          const dx = Math.abs(ex - px);
          const dy = Math.abs(ey - py);
          const yHit =
            ent.kind === "portal" ? py <= ey + 18 && py >= ey - 92 : dy < 44;
          if (running && !paused && dx < 36 && yHit) {
            ent.collected = true;
            handleEntityCollection(s, ent.kind, ex, ey);
            continue;
          }

          activeEntities.push(ent);
          drawPickup3D(ctx, ent.kind, ex, ey, 1.05, hasAuroraPortal, animTick);
        }
        s.entities = activeEntities;

        drawArticulatedRunner(
          ctx,
          px,
          py,
          shadowY,
          s.playerY,
          s.leanAngle,
          hasSolarSkin,
          animTick,
          running,
        );
      }

      // Render burst particles & floating popups cleanly on top
      for (const pt of s.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (const pop of s.popups) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (pop.life / pop.maxLife) * 1.4);
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#050706";
        ctx.fillText(pop.text, pop.x + 1, pop.y + 1);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      }

      // Live portal proximity chip while actively running
      if (running) {
        const portalEnt = s.entities.find((e) => e.kind === "portal");
        const kmLeft = Math.max(0, s.nextPortalAtKm - s.distanceKm);
        const label = portalEnt
          ? "PORTAL GATE AHEAD — ENTER TO SWITCH WORLD!"
          : `Next Dimension Portal: ${kmLeft.toFixed(2)} km`;
        ctx.save();
        ctx.fillStyle = portalEnt
          ? "rgba(14, 165, 233, 0.28)"
          : "rgba(5, 7, 6, 0.65)";
        ctx.strokeStyle = portalEnt
          ? "rgba(56, 189, 248, 0.85)"
          : "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = 1;
        const badgeW = portalEnt ? 290 : 210;
        drawRoundedRect(ctx, 14, 14, badgeW, 24, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = portalEnt ? "#E0F2FE" : "#CBD5E1";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "left";
        ctx.fillText(label, 24, 29);
        ctx.restore();
      }

      ctx.restore();
    };

    const loop = (ts: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
      lastTs = ts;
      drawRunnerFrame(dt);
      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [universe, paused, running, level, equippedCosmetics]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#050706] shadow-[0_18px_50px_rgba(0,0,0,0.65)]">
      <canvas
        ref={canvasRef}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const start = touchStartRef.current;
          const t = e.changedTouches[0];
          touchStartRef.current = null;
          if (!start || !t) return;
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 22) {
            triggerAction(dx < 0 ? "left" : "right");
          } else if (dy < -22) {
            triggerAction("jump");
          }
        }}
        aria-label="NutriSense Run interactive game canvas"
        className="block aspect-[760/420] w-full touch-none select-none"
      />
    </div>
  );
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function draw3LaneSkyAndCity(
  ctx: CanvasRenderingContext2D,
  horizonY: number,
  tick: number,
  prefersReduced: boolean,
) {
  // Deep sky dusk gradient
  const sky = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
  sky.addColorStop(0, "#04080b");
  sky.addColorStop(0.28, "#0a1e21");
  sky.addColorStop(0.38, "#14382f");
  sky.addColorStop(1, "#050908");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // Twinkling stars
  for (const st of STARS) {
    if (st.y > horizonY - 8) continue;
    const alpha = prefersReduced ? 0.45 : 0.25 + 0.45 * Math.abs(Math.sin(tick * 0.35 + st.phase));
    ctx.fillStyle = `rgba(226, 252, 239, ${alpha})`;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Volumetric horizon sun / wellness energy orb
  const sunGlow = ctx.createRadialGradient(
    LOGICAL_W / 2,
    horizonY,
    8,
    LOGICAL_W / 2,
    horizonY,
    240,
  );
  sunGlow.addColorStop(0, "rgba(163, 255, 18, 0.35)");
  sunGlow.addColorStop(0.35, "rgba(52, 211, 153, 0.16)");
  sunGlow.addColorStop(1, "rgba(52, 211, 153, 0)");
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, LOGICAL_W, horizonY + 80);

  ctx.fillStyle = "rgba(236, 253, 245, 0.85)";
  ctx.beginPath();
  ctx.arc(LOGICAL_W / 2, horizonY - 2, 22, Math.PI, 0);
  ctx.fill();

  // Distant mountain range silhouette
  ctx.fillStyle = "#081713";
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(0, horizonY - 34);
  ctx.lineTo(110, horizonY - 62);
  ctx.lineTo(220, horizonY - 26);
  ctx.lineTo(310, horizonY - 46);
  ctx.lineTo(380, horizonY - 12);
  ctx.lineTo(450, horizonY - 42);
  ctx.lineTo(545, horizonY - 22);
  ctx.lineTo(655, horizonY - 66);
  ctx.lineTo(LOGICAL_W, horizonY - 30);
  ctx.lineTo(LOGICAL_W, horizonY);
  ctx.closePath();
  ctx.fill();

  // Futuristic lit skyline towers flanking the track vanishing point
  for (const tw of SKYLINE_TOWERS) {
    const cx = LOGICAL_W / 2 + tw.side * (tw.dist * (LOGICAL_W / 2 - 20));
    const tx = cx - tw.w / 2;
    const ty = horizonY - tw.h;
    ctx.fillStyle = "#0c1e1a";
    ctx.fillRect(tx, ty, tw.w, tw.h);
    ctx.fillStyle = "rgba(52, 211, 153, 0.18)";
    ctx.fillRect(tx, ty, tw.w, 2);

    // Subtle building windows
    ctx.fillStyle = "rgba(163, 255, 18, 0.35)";
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < tw.lights; col++) {
        const wy = ty + 8 + row * 12;
        if (wy > horizonY - 6) continue;
        ctx.fillRect(tx + 6 + col * 11, wy, 5, 4);
      }
    }
  }
}

function drawRoadsideBeacon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  side: -1 | 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Ground shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Post + lush stylized canopy / lamp
  ctx.fillStyle = "#162c24";
  ctx.fillRect(-3, -44, 6, 44);
  ctx.fillStyle = "#065F46";
  ctx.beginPath();
  ctx.arc(0, -52, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#10B981";
  ctx.beginPath();
  ctx.arc(-3 * side, -56, 11, 0, Math.PI * 2);
  ctx.fill();

  // Glowing curb light reflector
  ctx.fillStyle = "#A3FF12";
  ctx.fillRect(side * -5, -18, 4, 9);
  ctx.restore();
}

function drawBobParallaxWorld(
  ctx: CanvasRenderingContext2D,
  groundY: number,
  scrollTick: number,
  animTick: number,
  prefersReduced: boolean,
) {
  // Aurora twilight sky
  const sky = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
  sky.addColorStop(0, "#050d1a");
  sky.addColorStop(0.55, "#0d2633");
  sky.addColorStop(1, "#091819");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // Stars
  for (const st of STARS) {
    if (st.y > groundY - 40) continue;
    const alpha = prefersReduced ? 0.5 : 0.3 + 0.5 * Math.abs(Math.sin(animTick * 0.35 + st.phase));
    ctx.fillStyle = `rgba(224, 242, 254, ${alpha})`;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crescent / glowing moon orb
  const moonGlow = ctx.createRadialGradient(635, 76, 8, 635, 76, 88);
  moonGlow.addColorStop(0, "rgba(186, 230, 253, 0.38)");
  moonGlow.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(635, 76, 88, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#E0F2FE";
  ctx.beginPath();
  ctx.arc(635, 76, 20, 0, Math.PI * 2);
  ctx.fill();

  // Soft aurora band
  const auroraGrad = ctx.createLinearGradient(0, 40, 0, 170);
  auroraGrad.addColorStop(0, "rgba(52, 211, 153, 0)");
  auroraGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.14)");
  auroraGrad.addColorStop(1, "rgba(163, 255, 18, 0)");
  ctx.fillStyle = auroraGrad;
  ctx.fillRect(0, 40, LOGICAL_W, 130);

  // Far parallax mountain ridges
  ctx.fillStyle = "#0e222b";
  for (let i = 0; i < 6; i++) {
    const mx = ((i * 195 - scrollTick * 7) % (LOGICAL_W + 200)) - 100;
    ctx.beginPath();
    ctx.moveTo(mx - 110, groundY);
    ctx.lineTo(mx, groundY - 125 - (i % 2) * 28);
    ctx.lineTo(mx + 125, groundY);
    ctx.closePath();
    ctx.fill();
  }

  // Mid parallax rolling hills
  ctx.fillStyle = "#112f2a";
  for (let i = 0; i < 6; i++) {
    const hx = ((i * 180 - scrollTick * 18) % (LOGICAL_W + 180)) - 90;
    ctx.beginPath();
    ctx.arc(hx, groundY, 108, Math.PI, 0);
    ctx.fill();
  }

  // Ground deck with layered turf bevel & scrolling stone ribs
  ctx.fillStyle = "#0f1c18";
  ctx.fillRect(0, groundY, LOGICAL_W, LOGICAL_H - groundY);

  // Diagonal ground strata bars for crisp forward motion feedback
  ctx.fillStyle = "#162a23";
  for (let i = 0; i < 16; i++) {
    const rx = ((i * 64 - scrollTick * 34) % (LOGICAL_W + 64)) - 32;
    ctx.beginPath();
    ctx.moveTo(rx, groundY + 12);
    ctx.lineTo(rx + 26, groundY + 12);
    ctx.lineTo(rx + 6, LOGICAL_H);
    ctx.lineTo(rx - 20, LOGICAL_H);
    ctx.closePath();
    ctx.fill();
  }

  // Mossy turf rim + specular neon line
  const turfGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 14);
  turfGrad.addColorStop(0, "#34D399");
  turfGrad.addColorStop(1, "#065F46");
  ctx.fillStyle = turfGrad;
  ctx.fillRect(0, groundY, LOGICAL_W, 12);
  ctx.fillStyle = "#A3FF12";
  ctx.fillRect(0, groundY, LOGICAL_W, 2.5);

  // 3D beveled elevated sky platforms
  for (let i = 0; i < 3; i++) {
    const platX = ((i * 290 - scrollTick * 38) % (LOGICAL_W + 220)) - 80;
    const platY = 236;

    // Platform drop shadow & hover thruster beam
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    drawRoundedRect(ctx, platX + 6, platY + 15, 114, 7, 3);
    ctx.fill();

    // Platform slate body
    const pGrad = ctx.createLinearGradient(platX, platY, platX, platY + 18);
    pGrad.addColorStop(0, "#234036");
    pGrad.addColorStop(1, "#12211c");
    ctx.fillStyle = pGrad;
    drawRoundedRect(ctx, platX, platY, 124, 17, 6);
    ctx.fill();

    // Neon top rim
    ctx.fillStyle = "#A3FF12";
    drawRoundedRect(ctx, platX + 2, platY, 120, 4, 2);
    ctx.fill();

    // Rivet highlights
    ctx.fillStyle = "rgba(56, 189, 248, 0.65)";
    ctx.fillRect(platX + 12, platY + 8, 8, 4);
    ctx.fillRect(platX + 104, platY + 8, 8, 4);
  }
}

function drawArticulatedRunner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shadowY: number,
  elevation: number,
  lean: number,
  hasSolarSkin: boolean,
  tick: number,
  isRunning: boolean,
) {
  // Ground shadow shrinking softly as player jumps higher
  const shadowFactor = Math.max(0.45, 1 - elevation / 180);
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${0.48 * shadowFactor})`;
  ctx.beginPath();
  ctx.ellipse(x, shadowY, 22 * shadowFactor, 6.5 * shadowFactor, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  const stride = isRunning ? Math.sin(tick * 1.9) : 0.25;
  const airborne = elevation > 6;
  const bounce = isRunning && !airborne ? Math.abs(Math.sin(tick * 1.9)) * -3.5 : 0;

  ctx.translate(x, y + bounce);
  ctx.rotate(lean * 0.14);

  // Equipped Solar Skin aura halo
  if (hasSolarSkin) {
    const aura = ctx.createRadialGradient(0, -6, 6, 0, -6, 36);
    aura.addColorStop(0, "rgba(163, 255, 18, 0.35)");
    aura.addColorStop(1, "rgba(163, 255, 18, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -6, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(163, 255, 18, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -6, 28, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Fluttering windbreaker scarf tail
  ctx.strokeStyle = hasSolarSkin ? "#FEF08A" : "#38BDF8";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, -15);
  ctx.quadraticCurveTo(-18, -16 + stride * 4, -26, -10 - stride * 3);
  ctx.stroke();

  // Back leg
  const backLegAngle = airborne ? -0.35 : -stride * 0.65;
  ctx.save();
  ctx.translate(-4, 12);
  ctx.rotate(backLegAngle);
  ctx.fillStyle = "#065F46";
  drawRoundedRect(ctx, -4, 0, 8, 15, 3);
  ctx.fill();
  ctx.fillStyle = "#CBD5E1";
  drawRoundedRect(ctx, -4, 12, 11, 5, 2);
  ctx.fill();
  ctx.restore();

  // Front leg
  const frontLegAngle = airborne ? 0.45 : stride * 0.65;
  ctx.save();
  ctx.translate(4, 12);
  ctx.rotate(frontLegAngle);
  ctx.fillStyle = "#10B981";
  drawRoundedRect(ctx, -4, 0, 8, 15, 3);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  drawRoundedRect(ctx, -4, 12, 12, 5, 2);
  ctx.fill();
  ctx.fillStyle = "#A3FF12";
  ctx.fillRect(-3, 15, 10, 2);
  ctx.restore();

  // Back arm
  ctx.save();
  ctx.translate(-10, -8);
  ctx.rotate(stride * 0.6);
  ctx.fillStyle = "#047857";
  drawRoundedRect(ctx, -3, 0, 6, 14, 3);
  ctx.fill();
  ctx.restore();

  // Torso jacket with shaded gradient & glowing chest NutriCore
  const bodyGrad = ctx.createLinearGradient(-13, -14, 13, 14);
  if (hasSolarSkin) {
    bodyGrad.addColorStop(0, "#A3FF12");
    bodyGrad.addColorStop(1, "#4D7C0F");
  } else {
    bodyGrad.addColorStop(0, "#34D399");
    bodyGrad.addColorStop(1, "#047857");
  }
  ctx.fillStyle = bodyGrad;
  drawRoundedRect(ctx, -13, -13, 26, 27, 9);
  ctx.fill();

  // Jacket zipper & glowing NutriCore emblem
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(-1, -11, 2, 22);
  ctx.fillStyle = "#A3FF12";
  ctx.beginPath();
  ctx.arc(0, -2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Front arm + glowing cyan smart-band
  ctx.save();
  ctx.translate(10, -8);
  ctx.rotate(-stride * 0.6);
  ctx.fillStyle = hasSolarSkin ? "#BEF264" : "#6EE7B7";
  drawRoundedRect(ctx, -3, 0, 6, 14, 3);
  ctx.fill();
  ctx.fillStyle = "#38BDF8";
  ctx.fillRect(-3, 9, 6, 3);
  ctx.restore();

  // Sculpted Aero Helmet & Sport Visor
  const headGrad = ctx.createRadialGradient(-3, -27, 2, 0, -23, 13);
  headGrad.addColorStop(0, "#FFFFFF");
  headGrad.addColorStop(1, "#CBD5E1");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, -23, 12, 0, Math.PI * 2);
  ctx.fill();

  // Visor glass
  ctx.fillStyle = "#0F172A";
  drawRoundedRect(ctx, -8, -27, 16, 7, 3);
  ctx.fill();

  // Crisp white specular gleam on visor
  ctx.fillStyle = "rgba(56, 189, 248, 0.75)";
  ctx.fillRect(-6, -26, 7, 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillRect(3, -26, 3, 2);

  ctx.restore();
}

function drawPickup3D(
  ctx: CanvasRenderingContext2D,
  kind: CanvasPickupType,
  x: number,
  y: number,
  scale: number,
  hasAuroraPortal: boolean,
  tick: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Ground shadow directly beneath pickup
  ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
  ctx.beginPath();
  ctx.ellipse(0, 4, kind === "portal" ? 36 : 14, kind === "portal" ? 8 : 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (kind === "coin") {
    const hover = Math.sin(tick * 1.4 + x * 0.05) * 3;
    const spinCos = Math.cos(tick * 1.7 + x * 0.04);
    const rx = Math.max(3.5, Math.abs(spinCos) * 13);

    // 3D depth rim behind gold coin face
    ctx.fillStyle = "#92400E";
    ctx.beginPath();
    ctx.ellipse(spinCos >= 0 ? -2.2 : 2.2, -14 + hover, rx, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rich radial metallic gold gradient
    const goldGrad = ctx.createRadialGradient(-3, -18 + hover, 2, 0, -14 + hover, 13);
    goldGrad.addColorStop(0, "#FEF9C3");
    goldGrad.addColorStop(0.55, "#FBBF24");
    goldGrad.addColorStop(1, "#D97706");
    ctx.fillStyle = goldGrad;
    ctx.strokeStyle = "#FEF08A";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, -14 + hover, rx, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (rx > 7) {
      ctx.fillStyle = "#78350F";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("N", 0, -10 + hover);
    }
  } else if (kind === "fact") {
    const hover = Math.sin(tick * 1.2) * 3.5;

    // Upward vertical light beam
    const beam = ctx.createLinearGradient(0, 0, 0, -56);
    beam.addColorStop(0, "rgba(52, 211, 153, 0.25)");
    beam.addColorStop(1, "rgba(52, 211, 153, 0)");
    ctx.fillStyle = beam;
    ctx.fillRect(-16, -56, 32, 56);

    // 3D isometric green tech crate
    const boxGrad = ctx.createLinearGradient(-19, -36 + hover, 19, -4 + hover);
    boxGrad.addColorStop(0, "rgba(16, 185, 129, 0.92)");
    boxGrad.addColorStop(1, "rgba(6, 78, 59, 0.95)");
    ctx.fillStyle = boxGrad;
    ctx.strokeStyle = "#A3FF12";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, -19, -36 + hover, 38, 30, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ECFDF5";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HACK", 0, -17 + hover);
  } else if (kind === "quiz") {
    const hover = Math.sin(tick * 1.25) * 3.5;

    const beam = ctx.createLinearGradient(0, 0, 0, -60);
    beam.addColorStop(0, "rgba(244, 114, 182, 0.28)");
    beam.addColorStop(1, "rgba(244, 114, 182, 0)");
    ctx.fillStyle = beam;
    ctx.fillRect(-18, -60, 36, 60);

    const quizGrad = ctx.createLinearGradient(-21, -38 + hover, 21, -6 + hover);
    quizGrad.addColorStop(0, "rgba(236, 72, 153, 0.92)");
    quizGrad.addColorStop(1, "rgba(131, 24, 67, 0.95)");
    ctx.fillStyle = quizGrad;
    ctx.strokeStyle = "#F9A8D4";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, -21, -38 + hover, 42, 32, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FDF2F8";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("QUIZ ?", 0, -18 + hover);
  } else if (kind === "portal") {
    const pulse = 1 + Math.sin(tick * 1.1) * 0.05;
    const primary = hasAuroraPortal ? "#38BDF8" : "#A3FF12";
    const secondary = hasAuroraPortal ? "#A78BFA" : "#34D399";

    ctx.save();
    ctx.scale(pulse, pulse);

    // Metallic anchor pads on road/ground
    ctx.fillStyle = "#1E293B";
    drawRoundedRect(ctx, -46, -6, 18, 8, 3);
    ctx.fill();
    drawRoundedRect(ctx, 28, -6, 18, 8, 3);
    ctx.fill();

    // Inner swirling energy vortex
    const vortex = ctx.createRadialGradient(0, -38, 4, 0, -38, 46);
    vortex.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    vortex.addColorStop(0.35, hasAuroraPortal ? "rgba(56, 189, 248, 0.55)" : "rgba(163, 255, 18, 0.45)");
    vortex.addColorStop(0.75, hasAuroraPortal ? "rgba(167, 139, 250, 0.25)" : "rgba(16, 185, 129, 0.2)");
    vortex.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = vortex;
    ctx.beginPath();
    ctx.ellipse(0, -38, 44, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing outer portal arch ring
    ctx.strokeStyle = primary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -38, 44, 36, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Counter-rotating dashed inner energy ring
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -tick * 14;
    ctx.beginPath();
    ctx.ellipse(0, -38, 34, 27, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Orbiting energy sparkles around the ring
    for (let i = 0; i < 4; i++) {
      const a = tick * 1.4 + (Math.PI / 2) * i;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 44, -38 + Math.sin(a) * 36, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Readable top crown pill
    ctx.fillStyle = "rgba(5, 7, 6, 0.82)";
    drawRoundedRect(ctx, -46, -86, 92, 16, 8);
    ctx.fill();
    ctx.strokeStyle = primary;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SWITCH PORTAL", 0, -75);

    ctx.restore();
  }

  ctx.restore();
}
