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

  // Latest callbacks in refs so requestAnimationFrame never tears down mid-run
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
    playerY: 0,
    vy: 0,
    bobX: 150,
    bobVx: 0,
    distanceKm: initialDistanceKm,
    score: 0,
    coins: 0,
    spawnTimer: 0.4,
    nextFactAtKm: initialDistanceKm + 1.15,
    nextQuizAtKm: initialDistanceKm + 2.35,
    nextPortalAtKm: initialDistanceKm + 3.4,
    nextId: 1,
    entities: [] as TrackEntity[],
    trail: [] as { x: number; y: number; alpha: number }[],
    frameTick: 0,
    lastReportedStep: 0,
  });

  // Sync starting distance ONLY when starting a fresh run
  useEffect(() => {
    if (!running) {
      stateRef.current.distanceKm = initialDistanceKm;
      stateRef.current.score = 0;
      stateRef.current.coins = 0;
      stateRef.current.entities = [];
      stateRef.current.lane = 1;
      stateRef.current.visualLaneX = 1;
      stateRef.current.playerY = 0;
      stateRef.current.vy = 0;
      stateRef.current.nextFactAtKm = initialDistanceKm + 1.15;
      stateRef.current.nextQuizAtKm = initialDistanceKm + 2.35;
      stateRef.current.nextPortalAtKm = initialDistanceKm + 3.4;
    }
  }, [running, initialDistanceKm]);

  const triggerAction = (action: "left" | "right" | "jump") => {
    const s = stateRef.current;
    if (universe === "runner_3lane") {
      if (action === "left") {
        s.lane = Math.max(0, s.lane - 1) as 0 | 1 | 2;
      } else if (action === "right") {
        s.lane = Math.min(2, s.lane + 1) as 0 | 1 | 2;
      } else if (action === "jump" && s.playerY === 0) {
        s.vy = 14.5;
      }
    } else {
      if (action === "left") {
        s.bobVx = -210;
      } else if (action === "right") {
        s.bobVx = 210;
      } else if (action === "jump" && s.playerY <= 1) {
        s.vy = 16.5;
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

    let rafId = 0;
    let lastTs = performance.now();

    const spawnItem = (s: typeof stateRef.current) => {
      let kind: CanvasPickupType = "coin";
      if (s.distanceKm >= s.nextPortalAtKm) {
        kind = "portal";
        s.nextPortalAtKm = s.distanceKm + 3.6;
      } else if (s.distanceKm >= s.nextQuizAtKm) {
        kind = "quiz";
        s.nextQuizAtKm = s.distanceKm + 2.5;
      } else if (s.distanceKm >= s.nextFactAtKm) {
        kind = "fact";
        s.nextFactAtKm = s.distanceKm + 1.65;
      }

      const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
      const yLevel = kind === "coin" && universe === "platform_bob" && Math.random() > 0.45 ? 1 : 0;

      s.entities.push({
        id: s.nextId++,
        kind,
        lane,
        progress: universe === "runner_3lane" ? 0.02 : LOGICAL_W + 40,
        yLevel,
        collected: false,
      });
    };

    const drawRunnerFrame = (dt: number) => {
      const s = stateRef.current;
      const hasSolarSkin = equippedCosmetics.skin === "skin_solar_runner";
      const hasTrail = equippedCosmetics.trail === "trail_mint_comet";
      const hasAuroraPortal = equippedCosmetics.portal === "portal_aurora_ring";

      if (running && !paused) {
        const kmRate = 0.14 + Math.min(level - 1, 3) * 0.025;
        s.distanceKm += kmRate * dt;
        s.score = Math.floor(s.distanceKm * 100 + s.coins * 15);
        s.frameTick += dt * 8;

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
          s.visualLaneX += (s.lane - s.visualLaneX) * Math.min(1, dt * 14);
        } else {
          s.bobX = Math.max(70, Math.min(LOGICAL_W - 140, s.bobX + s.bobVx * dt));
          s.bobVx *= Math.pow(0.02, dt);
        }

        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
          spawnItem(s);
          s.spawnTimer = 0.72;
        }

        // Report live telemetry cleanly ~10 times per second
        const stepBucket = Math.floor(s.distanceKm * 20);
        if (stepBucket > s.lastReportedStep) {
          s.lastReportedStep = stepBucket;
          callbacksRef.current.onDistanceTick(s.distanceKm, s.score, s.coins);
        }
      }

      // Clear background
      ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

      if (universe === "runner_3lane") {
        // Sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
        sky.addColorStop(0, "#050907");
        sky.addColorStop(0.45, "#0d1a14");
        sky.addColorStop(1, "#070b09");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

        // Horizon glow
        const horizonY = 128;
        ctx.fillStyle = "rgba(163, 255, 18, 0.08)";
        ctx.beginPath();
        ctx.ellipse(LOGICAL_W / 2, horizonY, 260, 44, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3-lane trapezoid road
        const topLeft = LOGICAL_W / 2 - 75;
        const topRight = LOGICAL_W / 2 + 75;
        const botLeft = 90;
        const botRight = LOGICAL_W - 90;

        ctx.fillStyle = "#101713";
        ctx.beginPath();
        ctx.moveTo(topLeft, horizonY);
        ctx.lineTo(topRight, horizonY);
        ctx.lineTo(botRight, LOGICAL_H);
        ctx.lineTo(botLeft, LOGICAL_H);
        ctx.closePath();
        ctx.fill();

        // Outer neon rails
        ctx.strokeStyle = "#34D399";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(topLeft, horizonY);
        ctx.lineTo(botLeft, LOGICAL_H);
        ctx.moveTo(topRight, horizonY);
        ctx.lineTo(botRight, LOGICAL_H);
        ctx.stroke();

        // Dashed lane dividers
        const t1Top = topLeft + (topRight - topLeft) / 3;
        const t1Bot = botLeft + (botRight - botLeft) / 3;
        const t2Top = topLeft + ((topRight - topLeft) * 2) / 3;
        const t2Bot = botLeft + ((botRight - botLeft) * 2) / 3;

        ctx.strokeStyle = "rgba(163, 255, 18, 0.35)";
        ctx.setLineDash([14, 16]);
        ctx.lineDashOffset = -s.frameTick * 18;
        ctx.beginPath();
        ctx.moveTo(t1Top, horizonY);
        ctx.lineTo(t1Bot, LOGICAL_H);
        ctx.moveTo(t2Top, horizonY);
        ctx.lineTo(t2Bot, LOGICAL_H);
        ctx.stroke();
        ctx.setLineDash([]);

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
            ent.progress += 0.65 * dt;
          }
          if (ent.progress > 1.06 || ent.collected) continue;

          const p = ent.progress;
          const y = horizonY + (LOGICAL_H - horizonY) * Math.pow(p, 1.35);
          const x = ent.kind === "portal" ? LOGICAL_W / 2 : laneCenterX(ent.lane, Math.pow(p, 1.35));
          const scale = 0.35 + p * 0.85;

          // Collision check near player zone (0.78 .. 0.94)
          if (running && !paused && p >= 0.78 && p <= 0.94) {
            const laneHit = ent.kind === "portal" || Math.abs(s.visualLaneX - ent.lane) < 0.48;
            if (laneHit) {
              ent.collected = true;
              if (ent.kind === "coin") {
                s.coins += 2;
                callbacksRef.current.onPickupCoin(2);
              } else if (ent.kind === "fact") {
                callbacksRef.current.onPickupFact();
              } else if (ent.kind === "quiz") {
                callbacksRef.current.onPickupQuiz();
              } else if (ent.kind === "portal") {
                callbacksRef.current.onPortalReached();
              }
              continue;
            }
          }

          activeEntities.push(ent);
          drawPickup3Lane(ctx, ent.kind, x, y, scale, hasAuroraPortal, s.frameTick);
        }
        s.entities = activeEntities;

        // Player trail & character
        const px = laneCenterX(s.visualLaneX, 0.86);
        const py = LOGICAL_H - 52 - s.playerY;
        if (hasTrail && !prefersReduced) {
          s.trail.push({ x: px, y: py + 12, alpha: 0.75 });
          if (s.trail.length > 10) s.trail.shift();
          for (let i = 0; i < s.trail.length; i++) {
            const tr = s.trail[i];
            ctx.fillStyle = `rgba(52, 211, 153, ${(i / s.trail.length) * 0.45})`;
            ctx.beginPath();
            ctx.arc(tr.x, tr.y + (s.trail.length - i) * 3.5, 9 * (i / s.trail.length), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        drawPlayerAvatar(ctx, px, py, hasSolarSkin, s.frameTick);
      } else {
        // Universe 2: Bob Run Side-Scrolling Platform World
        const sky = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
        sky.addColorStop(0, "#0b111a");
        sky.addColorStop(0.65, "#112229");
        sky.addColorStop(1, "#091215");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

        // Background floating stars/hills
        ctx.fillStyle = "rgba(56, 189, 248, 0.14)";
        for (let i = 0; i < 6; i++) {
          const hx = ((i * 180 - s.frameTick * 18) % (LOGICAL_W + 180)) - 90;
          ctx.beginPath();
          ctx.arc(hx, 340, 120, Math.PI, 0);
          ctx.fill();
        }

        // Ground deck
        const groundY = 344;
        ctx.fillStyle = "#162922";
        ctx.fillRect(0, groundY, LOGICAL_W, LOGICAL_H - groundY);
        ctx.fillStyle = "#34D399";
        ctx.fillRect(0, groundY, LOGICAL_W, 4);

        // Moving elevated platform bars
        ctx.fillStyle = "#1F372E";
        ctx.strokeStyle = "#A3FF12";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const platX = ((i * 290 - s.frameTick * 38) % (LOGICAL_W + 220)) - 80;
          const platY = 236;
          ctx.fillRect(platX, platY, 120, 14);
          ctx.strokeRect(platX, platY, 120, 14);
        }

        const px = s.bobX;
        const py = groundY - 24 - s.playerY;

        if (hasTrail && !prefersReduced) {
          s.trail.push({ x: px - 14, y: py, alpha: 0.7 });
          if (s.trail.length > 9) s.trail.shift();
          for (let i = 0; i < s.trail.length; i++) {
            const tr = s.trail[i];
            ctx.fillStyle = `rgba(52, 211, 153, ${(i / s.trail.length) * 0.45})`;
            ctx.beginPath();
            ctx.arc(tr.x - (s.trail.length - i) * 5, tr.y, 7 * (i / s.trail.length), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        const activeEntities: TrackEntity[] = [];
        for (const ent of s.entities) {
          if (running && !paused) {
            ent.progress -= 270 * dt;
          }
          if (ent.progress < -50 || ent.collected) continue;

          const ex = ent.progress;
          const ey = ent.kind === "portal" ? groundY - 40 : ent.yLevel > 0 ? 208 : groundY - 26;

          const dx = Math.abs(ex - px);
          const dy = Math.abs(ey - py);
          if (running && !paused && dx < 32 && dy < 38) {
            ent.collected = true;
            if (ent.kind === "coin") {
              s.coins += 2;
              callbacksRef.current.onPickupCoin(2);
            } else if (ent.kind === "fact") {
              callbacksRef.current.onPickupFact();
            } else if (ent.kind === "quiz") {
              callbacksRef.current.onPickupQuiz();
            } else if (ent.kind === "portal") {
              callbacksRef.current.onPortalReached();
            }
            continue;
          }

          activeEntities.push(ent);
          drawPickup3Lane(ctx, ent.kind, ex, ey, 1.0, hasAuroraPortal, s.frameTick);
        }
        s.entities = activeEntities;

        drawPlayerAvatar(ctx, px, py, hasSolarSkin, s.frameTick);
      }
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
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#050706]">
      <canvas
        ref={canvasRef}
        width={LOGICAL_W}
        height={LOGICAL_H}
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

function drawPlayerAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hasSolarSkin: boolean,
  tick: number,
) {
  ctx.save();
  const bob = Math.sin(tick * 1.4) * 2.5;

  // Aura if solar skin unlocked & equipped
  if (hasSolarSkin) {
    ctx.strokeStyle = "rgba(163, 255, 18, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y + bob, 24, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Body capsule
  ctx.fillStyle = hasSolarSkin ? "#A3FF12" : "#34D399";
  ctx.beginPath();
  ctx.roundRect(x - 14, y - 10 + bob, 28, 30, 10);
  ctx.fill();

  // Head
  ctx.fillStyle = "#F8FAFC";
  ctx.beginPath();
  ctx.arc(x, y - 20 + bob, 11, 0, Math.PI * 2);
  ctx.fill();

  // Visor
  ctx.fillStyle = "#050706";
  ctx.fillRect(x - 7, y - 23 + bob, 14, 5);
  ctx.restore();
}

function drawPickup3Lane(
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

  if (kind === "coin") {
    ctx.fillStyle = "#FBBF24";
    ctx.strokeStyle = "#FEF08A";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -10, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#78350F";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("C", 0, -6);
  } else if (kind === "fact") {
    ctx.fillStyle = "rgba(52, 211, 153, 0.25)";
    ctx.strokeStyle = "#34D399";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-18, -28, 36, 28, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ECFDF5";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HACK", 0, -10);
  } else if (kind === "quiz") {
    ctx.fillStyle = "rgba(244, 114, 182, 0.25)";
    ctx.strokeStyle = "#F472B6";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-20, -30, 40, 30, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#FDF2F8";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("QUIZ ?", 0, -11);
  } else if (kind === "portal") {
    const pulse = 1 + Math.sin(tick * 0.9) * 0.06;
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = hasAuroraPortal ? "#38BDF8" : "#A3FF12";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -34, 48, 36, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = hasAuroraPortal
      ? "rgba(56, 189, 248, 0.16)"
      : "rgba(163, 255, 18, 0.14)";
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PORTAL GATE", 0, -31);
  }

  ctx.restore();
}
