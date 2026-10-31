import type { CSSProperties } from "react";
import type { Mood } from "./model";
import { RunnerFace } from "./runner-face";

// Joint positions in SVG units. Limbs hang straight down from their joint, and
// the run cycle in globals.css rotates them about it. The viewBox starts at
// y=28 (just above the shoulders); the head is an HTML element on top.
const SHOULDER = { x: 30, y: 36 };
const ELBOW_Y = 50;
const HIP = { x: 30, y: 60 };
const KNEE_Y = 78;
const ANKLE_Y = 95;

const SKIN = "#e8b98a";
const LEGS = "#e2e8f0";
// Darker than the shirt so the arm swing reads against the torso.
const SLEEVE = "color-mix(in srgb, var(--team-accent) 60%, #000)";

function origin(x: number, y: number): CSSProperties {
  return { transformOrigin: `${x}px ${y}px` };
}

/** Thigh → knee → shin → foot, as nested groups so the shin swings with the thigh. */
function Leg({ far }: { far: boolean }) {
  return (
    <g className={far ? "runner-far" : undefined} opacity={far ? 0.55 : 1}>
      <g className="runner-limb runner-thigh" style={origin(HIP.x, HIP.y)}>
        <line x1={HIP.x} y1={HIP.y} x2={HIP.x} y2={KNEE_Y} stroke={LEGS} strokeWidth={8} strokeLinecap="round" />
        <g className="runner-limb runner-shin" style={origin(HIP.x, KNEE_Y)}>
          <line x1={HIP.x} y1={KNEE_Y} x2={HIP.x} y2={ANKLE_Y} stroke={LEGS} strokeWidth={7} strokeLinecap="round" />
          <line
            x1={HIP.x - 1}
            y1={ANKLE_Y}
            x2={HIP.x + 8}
            y2={ANKLE_Y}
            stroke="var(--team-accent)"
            strokeWidth={6}
            strokeLinecap="round"
          />
        </g>
      </g>
    </g>
  );
}

/** Upper arm swings from the shoulder; the forearm stays bent forward, like a sprinter's. */
function Arm({ far }: { far: boolean }) {
  return (
    <g className={far ? "runner-far" : undefined} opacity={far ? 0.55 : 1}>
      <g className="runner-limb runner-upper-arm" style={origin(SHOULDER.x, SHOULDER.y)}>
        <line
          x1={SHOULDER.x}
          y1={SHOULDER.y}
          x2={SHOULDER.x}
          y2={ELBOW_Y}
          stroke={SLEEVE}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <g transform={`rotate(-80 ${SHOULDER.x} ${ELBOW_Y})`}>
          <line x1={SHOULDER.x} y1={ELBOW_Y} x2={SHOULDER.x} y2={ELBOW_Y + 12} stroke={SKIN} strokeWidth={5} strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}

/**
 * A side-on runner with the closer's bitmoji as the head. Runs (limbs cycle,
 * body bobs and leans) with a stride of `strideMs`; stands still when null.
 */
export function RunnerFigure({
  name,
  facePath,
  mood,
  strideMs,
}: {
  name: string;
  facePath: string | null;
  mood: Mood;
  strideMs: number | null;
}) {
  const isRunning = strideMs !== null;
  return (
    <div
      className={`runner relative h-[116px] w-[64px] ${isRunning ? "is-running" : ""}`}
      style={{ "--stride": `${strideMs ?? 0}ms` } as CSSProperties}
    >
      {isRunning && (
        <div aria-hidden className="absolute -left-5 top-[62px] flex flex-col gap-2">
          {[0, 1, 2].map((line) => (
            <span
              key={line}
              className="runner-speed-line block h-0.5 w-5 rounded-full bg-[var(--team-accent)]"
              style={{ animationDelay: `calc(var(--stride) * ${-line / 3})`, marginLeft: line * 4 }}
            />
          ))}
        </div>
      )}
      <div className="runner-bob absolute inset-0 origin-bottom">
        <svg viewBox="0 28 60 72" className="absolute bottom-0 left-0 h-[76px] w-full overflow-visible" aria-hidden>
          <Leg far />
          <Arm far />
          <line
            x1={SHOULDER.x}
            y1={SHOULDER.y - 4}
            x2={HIP.x}
            y2={HIP.y}
            stroke="var(--team-accent)"
            strokeWidth={12}
            strokeLinecap="round"
          />
          <Leg far={false} />
          <Arm far={false} />
        </svg>
        <div className="absolute left-1/2 top-[3px] -translate-x-1/2">
          <RunnerFace name={name} path={facePath} mood={mood} size={44} />
        </div>
      </div>
    </div>
  );
}
