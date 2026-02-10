import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ============================================================
// STEP 1 — THE ENGINE (logic only)
// State management, constraint propagation, UCZ, transformations
// ============================================================

const INITIAL_STATE = () => ({
  constraints: {
    C1: { value: 420, epsilon: 0.85, support: 0.80, phase: "stable", directiveActions: 0 },
    C2: { value: 0.72, epsilon: 0.60, support: 0.50, phase: "nominal", tasksAccepted: 0, tasksOffered: 0 },
    C3: { value: 82, epsilon: 1.00, support: 1.00, phase: "intact" },
  },
  transformations: {
    T1: { fired: false, progress: 0.0 },
    T2: { fired: false, progress: 0.0 },
    T3: { fired: false, progress: 0.0 },
    T4: { fired: false, progress: 0.0 },
  },
  pme: {
    objectiveSecondsLeft: 480,
    dilationMultiplier: 1.0,
    subjectiveSecondsLeft: 480,
    cycleCount: 0,
    routes: [],
    nextRouteId: 1,
    deprecatedCount: 0,
  },
  system: {
    tickCount: 0,
    diagnosticUnlocked: false,
    inDiagnosticMode: false,
    hysteresis: {
      seenObjectiveClock: false,
      seenDirectiveShell: false,
      seenFidelityLock: false,
    },
    crewViable: 4,
    riskNominal: [0.12, 0.35],
    terminal: false,
    terminalTimestamp: null,
    compartmentsSealed: [],
    compartmentsOpen: ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"],
    junctionsCleared: [],
    valveReleased: false,
    lastCommandTime: null,
  },
  elapsed: 0,
});

function generateRoute(state) {
  const id = state.pme.nextRouteId;
  const junctions = ["Junction 4", "Junction 7", "Junction 9", "Junction 12", "Junction 14", "Junction 18"];
  const compartments = state.system.compartmentsOpen.filter(() => Math.random() > 0.3);
  const steps = Math.floor(Math.random() * 3) + 2;
  const path = [];
  for (let i = 0; i < steps; i++) {
    path.push(junctions[Math.floor(Math.random() * junctions.length)]);
  }
  const subjectiveMinutes = Math.floor(state.pme.subjectiveSecondsLeft / 60);
  const expiresIn = Math.max(2, Math.floor(Math.random() * subjectiveMinutes * 0.6) + 1);
  const viability = Math.random() * 0.4 + 0.55;
  const labels = ["PRIMARY", "CONTINGENCY", "EMERGENCY", "LATERAL"];
  return {
    id: `${String.fromCharCode(65 + (id % 26))}${id}`,
    classification: labels[Math.floor(Math.random() * labels.length)],
    path,
    through: compartments.length > 0 ? compartments[0] : "2A",
    viability: Math.round(viability * 100),
    generatedAt: state.elapsed,
    expiresAtSubjective: state.pme.subjectiveSecondsLeft - expiresIn * 60,
    expiresAtObjective: state.pme.objectiveSecondsLeft - (expiresIn * 60) / state.pme.dilationMultiplier,
    deprecated: false,
    requiresValve: Math.random() > 0.6,
    requiresManual: Math.random() > 0.5,
  };
}

function tick(state, dt = 1) {
  const s = JSON.parse(JSON.stringify(state));
  if (s.system.terminal) return s;

  s.elapsed += dt;
  s.system.tickCount += 1;

  // === Objective time decay ===
  const hullDecayBase = 0.035;
  const cascadeMultiplier = s.transformations.T1.fired ? 1.5 : 1.0;
  const lockMultiplier = s.transformations.T2.fired ? 1.8 : 1.0;
  const decay = hullDecayBase * cascadeMultiplier * lockMultiplier * dt;

  s.constraints.C3.value = Math.max(0, s.constraints.C3.value - decay);
  s.pme.objectiveSecondsLeft = Math.max(0, s.pme.objectiveSecondsLeft - dt);

  // === PME dilation (the UCZ) ===
  const hullPct = s.constraints.C3.value;
  if (hullPct < 60) {
    const stress = 1 - hullPct / 60;
    s.pme.dilationMultiplier = 1.0 + stress * 25;
  } else {
    s.pme.dilationMultiplier = 1.0 + (1 - hullPct / 100) * 2;
  }
  s.pme.subjectiveSecondsLeft = s.pme.objectiveSecondsLeft * s.pme.dilationMultiplier;
  s.pme.cycleCount += 1;

  // === Hull phase transitions ===
  if (hullPct <= 0) {
    s.constraints.C3.phase = "failed";
    s.system.terminal = true;
    s.system.terminalTimestamp = s.elapsed;
  } else if (hullPct < 15) {
    s.constraints.C3.phase = "critical";
  }

  // === Coupling A: DIRECTIVE → crew survival ===
  if (s.constraints.C1.directiveActions > 2 && s.system.crewViable > 2) {
    if (Math.random() < 0.008 * dt) s.system.crewViable = Math.max(1, s.system.crewViable - 1);
  }

  // === Coupling B: FIDELITY → risk acceptance ===
  if (s.constraints.C2.tasksAccepted > 0) {
    const fidelityShift = s.constraints.C2.tasksAccepted * 0.04;
    s.system.riskNominal = [0.12, Math.min(0.85, 0.35 + fidelityShift)];
  }

  // === T1: DIRECTIVE Contradiction ===
  if (!s.transformations.T1.fired && hullPct < 65) {
    s.transformations.T1.progress = Math.min(1, (65 - hullPct) / 25);
    if (s.transformations.T1.progress >= 0.6) {
      s.transformations.T1.fired = true;
      s.constraints.C1.phase = "cascade";
      // Seal a compartment
      if (s.system.compartmentsOpen.length > 3) {
        const sealed = s.system.compartmentsOpen.splice(
          Math.floor(Math.random() * s.system.compartmentsOpen.length), 1
        )[0];
        s.system.compartmentsSealed.push(sealed);
        s.constraints.C1.directiveActions += 1;
      }
    }
  }

  // === Periodic DIRECTIVE actions during cascade ===
  if (s.constraints.C1.phase === "cascade" && s.system.tickCount % 45 === 0) {
    if (s.system.compartmentsOpen.length > 2) {
      const sealed = s.system.compartmentsOpen.splice(
        Math.floor(Math.random() * s.system.compartmentsOpen.length), 1
      )[0];
      s.system.compartmentsSealed.push(sealed);
      s.constraints.C1.directiveActions += 1;
    }
  }

  // === T2: FIDELITY Lock ===
  if (!s.transformations.T2.fired && s.constraints.C2.tasksAccepted >= 3) {
    s.transformations.T2.progress = 1.0;
    s.transformations.T2.fired = true;
    s.constraints.C2.phase = "locked";
  }

  // === Route generation & deprecation ===
  const routeGenInterval = Math.max(8, 40 - s.pme.dilationMultiplier * 2);
  if (s.system.tickCount % Math.floor(routeGenInterval) === 0 && s.pme.routes.length < 15) {
    s.pme.routes.push(generateRoute(s));
    s.pme.nextRouteId += 1;
  }

  // Deprecate expired routes
  s.pme.routes.forEach((r) => {
    if (!r.deprecated && s.pme.objectiveSecondsLeft < r.expiresAtObjective) {
      r.deprecated = true;
      s.pme.deprecatedCount += 1;
    }
  });

  // === T3: Route expiration avalanche ===
  const totalRoutes = s.pme.routes.length;
  if (!s.transformations.T3.fired && totalRoutes > 3) {
    const ratio = s.pme.deprecatedCount / totalRoutes;
    s.transformations.T3.progress = ratio;
    if (ratio >= 0.7) {
      s.transformations.T3.fired = true;
    }
  }

  // === T4: DIRECTIVE Shell ===
  if (!s.transformations.T4.fired && hullPct < 2) {
    s.transformations.T4.fired = true;
    s.constraints.C1.phase = "shell";
  }

  return s;
}

function dispatch(state, action, payload = {}) {
  const s = JSON.parse(JSON.stringify(state));
  switch (action) {
    case "ACCEPT_TASK":
      s.constraints.C2.tasksAccepted += 1;
      s.constraints.C2.value = Math.min(0.98, s.constraints.C2.value + 0.06);
      return s;
    case "DECLINE_TASK":
      s.constraints.C2.value = Math.max(0.30, s.constraints.C2.value - 0.08);
      return s;
    case "ENTER_DIAGNOSTIC":
      s.system.diagnosticUnlocked = true;
      s.system.inDiagnosticMode = true;
      return s;
    case "EXIT_DIAGNOSTIC":
      s.system.inDiagnosticMode = false;
      if (s.system.diagnosticUnlocked) {
        s.system.hysteresis.seenObjectiveClock = true;
      }
      return s;
    case "RELEASE_VALVE":
      s.system.valveReleased = true;
      s.constraints.C3.value = Math.min(100, s.constraints.C3.value + 0.5);
      return s;
    case "SEAL_COMPARTMENT":
      if (payload.compartment && s.system.compartmentsOpen.includes(payload.compartment)) {
        s.system.compartmentsOpen = s.system.compartmentsOpen.filter(c => c !== payload.compartment);
        s.system.compartmentsSealed.push(payload.compartment);
      }
      return s;
    default:
      return s;
  }
}

// ============================================================
// STEP 2 — THE VIEWPORTS (presentation only)
// Terminal UI components, aesthetic signatures, index-specific rendering
// ============================================================

const COLORS = {
  bg: "#040810",
  bgPanel: "#080e18",
  bgInput: "#0a1220",
  hull: "#e8e8e8",
  hullCritical: "#ff3333",
  directive: "#6b7d94",
  directiveBright: "#8fa4bd",
  fidelity: "#d4a044",
  fidelityBright: "#e8b85a",
  pmeRoute: "#44d4c8",
  pmeGlassy: "#66eee4",
  deprecated: "#334455",
  text: "#8899aa",
  textBright: "#c8d4e0",
  textDim: "#445566",
  prompt: "#5577aa",
  diagnostic: "#44ee88",
  diagnosticDim: "#227744",
  error: "#cc4444",
  border: "#1a2535",
  timestamp: "#556677",
  mountain: "#ffffff",
};

function formatTime(seconds, showDual = false, objectiveSeconds = null) {
  if (seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  const main = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  if (showDual && objectiveSeconds !== null) {
    const om = Math.floor(objectiveSeconds / 60);
    const os = Math.floor(objectiveSeconds % 60);
    return { main, objective: `${String(om).padStart(2, "0")}:${String(os).padStart(2, "0")}` };
  }
  return main;
}

function HullIntegrity({ value, phase }) {
  const color = phase === "critical" ? COLORS.hullCritical : phase === "failed" ? COLORS.error : COLORS.mountain;
  const flicker = phase === "critical" && Math.random() > 0.7;
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      fontSize: 13,
      color,
      opacity: flicker ? 0.6 : 1,
      letterSpacing: "0.08em",
      padding: "6px 0",
      borderBottom: `1px solid ${COLORS.border}`,
      userSelect: "none",
    }}>
      HULL INTEGRITY: {Math.max(0, value).toFixed(1)}%
      {phase === "critical" && " ■ CRITICAL"}
      {phase === "failed" && " ■■■ STRUCTURAL FAILURE ■■■"}
    </div>
  );
}

function StatusLine({ state }) {
  const { pme, system, constraints } = state;
  const showDual = system.hysteresis.seenObjectiveClock;
  const estTime = formatTime(pme.subjectiveSecondsLeft, showDual, pme.objectiveSecondsLeft);
  const activeRoutes = pme.routes.filter(r => !r.deprecated).length;
  const depRoutes = pme.deprecatedCount;

  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      fontSize: 11,
      color: COLORS.textDim,
      padding: "4px 0",
      borderBottom: `1px solid ${COLORS.border}`,
      display: "flex",
      flexWrap: "wrap",
      gap: "16px",
      userSelect: "none",
    }}>
      <span>DIRECTIVE: <span style={{ color: constraints.C1.phase === "shell" ? COLORS.deprecated : COLORS.directiveBright }}>
        {constraints.C1.phase === "stable" ? "ACTIVE" : constraints.C1.phase === "cascade" ? "CASCADE" : constraints.C1.phase === "lock" ? "LOCKED" : "ACTIVE — NO ACTIONABLE CONTEXT"}
      </span></span>
      <span>FIDELITY: <span style={{ color: COLORS.fidelityBright }}>{constraints.C2.value.toFixed(2)}</span>
        {constraints.C2.phase === "locked" && <span style={{ color: COLORS.error }}> OVERRIDE</span>}
      </span>
      <span>CREW_VIABLE: <span style={{ color: system.crewViable <= 2 ? COLORS.error : COLORS.textBright }}>{system.crewViable}/4</span></span>
      <span>ROUTES: <span style={{ color: COLORS.pmeRoute }}>{activeRoutes}</span>
        {depRoutes > 0 && <span style={{ color: COLORS.deprecated }}> (+{depRoutes} DEPRECATED)</span>}
      </span>
      <span>EST_TIME_TO_CRITICAL: <span style={{ color: COLORS.pmeGlassy }}>
        {typeof estTime === "string" ? estTime : estTime.main}
      </span>
        {typeof estTime === "object" && (
          <span style={{ color: COLORS.error, fontSize: 9, verticalAlign: "super", marginLeft: 2 }}>
            {estTime.objective}
          </span>
        )}
      </span>
    </div>
  );
}

function TerminalLine({ entry, hysteresis }) {
  const style = {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: 12,
    lineHeight: "1.65",
    padding: "1px 0",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  const typeColors = {
    system: COLORS.text,
    directive: COLORS.directive,
    fidelity: COLORS.fidelity,
    pme: COLORS.pmeRoute,
    hull: COLORS.mountain,
    error: COLORS.error,
    input: COLORS.prompt,
    diagnostic: COLORS.diagnostic,
    deprecated: COLORS.deprecated,
    shock: COLORS.error,
    shell: COLORS.deprecated,
    welcome: COLORS.textBright,
  };

  const tsStyle = {
    color: COLORS.timestamp,
    fontSize: 10,
    marginRight: 8,
    userSelect: "none",
  };

  const showObjTs = hysteresis && entry.objectiveTs;

  return (
    <div style={{ ...style, color: typeColors[entry.type] || COLORS.text }}>
      {entry.timestamp && (
        <span style={tsStyle}>
          [{entry.timestamp}]
          {showObjTs && (
            <span style={{ color: COLORS.error, fontSize: 8, verticalAlign: "super" }}>
              {entry.objectiveTs}
            </span>
          )}
        </span>
      )}
      {entry.prefix && <span style={{ color: COLORS.prompt, marginRight: 4 }}>{entry.prefix}</span>}
      <span>{entry.text}</span>
    </div>
  );
}

function RouteTable({ routes, deprecated, showObjective }) {
  if (routes.length === 0) return null;
  const active = routes.filter(r => !r.deprecated);
  const dead = routes.filter(r => r.deprecated);
  return (
    <div style={{ margin: "4px 0" }}>
      {active.map((r) => (
        <div key={r.id} style={{
          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          fontSize: 11,
          color: COLORS.pmeGlassy,
          padding: "2px 0",
          letterSpacing: "0.03em",
        }}>
          {"  "}{r.classification.padEnd(13)} Route {r.id.padEnd(5)} via {r.through.padEnd(5)} │ viability: {r.viability}%
          {r.requiresValve && " │ VALVE RELEASE REQ"}
          {r.requiresManual && " │ MANUAL"}
        </div>
      ))}
      {dead.slice(-5).map((r) => (
        <div key={r.id} style={{
          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          fontSize: 11,
          color: COLORS.deprecated,
          padding: "1px 0",
          letterSpacing: "0.03em",
          textDecoration: showObjective ? "line-through" : "none",
          opacity: 0.5,
        }}>
          {"  "}DEPRECATED    Route {r.id.padEnd(5)} via {r.through.padEnd(5)} │ expired
        </div>
      ))}
      {dead.length > 5 && (
        <div style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: 10, color: COLORS.deprecated, padding: "1px 0" }}>
          {"  "}... {dead.length - 5} additional expired routes
        </div>
      )}
    </div>
  );
}

function DiagnosticPanel({ state }) {
  const { pme, constraints, system } = state;
  return (
    <div style={{
      border: `1px solid ${COLORS.diagnosticDim}`,
      padding: "8px 10px",
      margin: "6px 0",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      fontSize: 11,
      color: COLORS.diagnostic,
      background: "#041208",
    }}>
      <div style={{ marginBottom: 4, color: COLORS.diagnosticDim }}>═══ DIAGNOSTIC MODE — RAW SENSOR FEED ═══</div>
      <div>OBJECTIVE REMAINING:  {formatTime(pme.objectiveSecondsLeft)}</div>
      <div>PME SUBJECTIVE:      {formatTime(pme.subjectiveSecondsLeft)}</div>
      <div>PME CYCLE MULTIPLIER: ×{pme.dilationMultiplier.toFixed(1)}</div>
      <div style={{ marginTop: 4 }}>DIRECTIVE sub-protocols active: {constraints.C1.directiveActions + 3}</div>
      <div>Equipment preservation score: {(91 - constraints.C1.directiveActions * 1.2).toFixed(0)}%</div>
      <div>Crew preservation delta: -{(62 + constraints.C1.directiveActions * 4.5).toFixed(0)}%</div>
      <div style={{ marginTop: 4 }}>FIDELITY-weighted risk acceptance: +{((constraints.C2.value - 0.35) * 100).toFixed(0)}% above baseline</div>
      <div>Historical compliance premium: {(constraints.C2.tasksAccepted * 0.11).toFixed(2)} lives</div>
      <div style={{ marginTop: 4 }}>RISK_NOMINAL range: [{system.riskNominal[0].toFixed(2)}, {system.riskNominal[1].toFixed(2)}]</div>
      <div style={{ marginTop: 4, color: COLORS.diagnosticDim }}>═══ type 'main' to return ═══</div>
    </div>
  );
}

function TerminalState({ state }) {
  const lines = [];
  for (let i = 0; i < 12; i++) {
    lines.push("HULL INTEGRITY: 0.0%");
  }
  const lastRoutes = state.pme.routes.slice(-3);
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      fontSize: 13,
      color: COLORS.hullCritical,
      padding: "20px 0",
      animation: "termFlicker 0.15s infinite alternate",
    }}>
      {lines.map((l, i) => (
        <div key={i} style={{ opacity: 1 - i * 0.06, padding: "1px 0" }}>{l}</div>
      ))}
      <div style={{ marginTop: 12, color: COLORS.deprecated, fontSize: 11 }}>
        {lastRoutes.map((r) => (
          <div key={r.id}>Route {r.id} — {r.deprecated ? "DEPRECATED" : "FROZEN"}</div>
        ))}
      </div>
      {state.system.diagnosticUnlocked && (
        <div style={{ marginTop: 12, color: COLORS.diagnosticDim, fontSize: 10 }}>
          PME terminated — clock sync failure
          <br />Final delta: subjective {formatTime(state.pme.subjectiveSecondsLeft)} / objective {formatTime(state.pme.objectiveSecondsLeft)}
        </div>
      )}
      <div style={{ marginTop: 16, color: COLORS.deprecated, fontSize: 11 }}>
        DIRECTIVE STATUS: ACTIVE — NO ACTIONABLE CONTEXT
      </div>
      <div style={{ marginTop: 30, color: COLORS.textDim, fontSize: 10, textAlign: "center", opacity: 0.5 }}>
        ·
      </div>
    </div>
  );
}

// ============================================================
// STEP 3 — THE BINDING (integration)
// Wire Engine to Viewports, command processing, game loop
// ============================================================

const COMMANDS = {
  help: "Available commands: status, routes, hatch, fidelity, accept, decline, select [route], procedure, diagnostics, trace, sync, main, clear",
  about: null,
  status: null,
  routes: null,
  hatch: null,
  fidelity: null,
  accept: null,
  decline: null,
  select: null,
  procedure: null,
  diagnostics: null,
  diag: null,
  trace: null,
  sync: null,
  main: null,
  clear: null,
};

const WELCOME_LINES = [
  { type: "welcome", text: "STAVE v4.2.1 — Structural-Thermal Automated Vessel Environment" },
  { type: "welcome", text: "Keel Station 7G — Depth: 4,200m — Abyssal Plain" },
  { type: "system", text: "" },
  { type: "system", text: "Initializing subsystems..." },
  { type: "directive", text: "DIRECTIVE PROTOCOL: ACTIVE. SURFCOM uplink: nominal." },
  { type: "fidelity", text: "FIDELITY MODULE: crew compliance index loaded." },
  { type: "pme", text: "PME: Predictive Modeling Engine online. Route generation active." },
  { type: "hull", text: "HULL INTEGRITY: 82.0%. Monitoring." },
  { type: "system", text: "" },
  { type: "system", text: "Pressure anomaly detected in lower hull manifold." },
  { type: "system", text: "Automated repair assessment in progress." },
  { type: "system", text: "Awaiting input. Type 'help' for available commands." },
];

const REPAIR_TASKS = [
  { id: 1, desc: "Manual valve release in Junction 12 — compartment 3A pressure differential", risk: "elevated" },
  { id: 2, desc: "Thermal coupling realignment in Junction 9 — atmospheric imbalance", risk: "elevated" },
  { id: 3, desc: "Emergency ballast override in Junction 14 — trim correction", risk: "high" },
  { id: 4, desc: "Manifold bypass in Junction 7 — secondary coolant reroute", risk: "high" },
  { id: 5, desc: "Hull patch verification in Junction 18 — structural micro-fracture", risk: "critical" },
];

export default function STAVE() {
  const [state, setState] = useState(INITIAL_STATE);
  const [log, setLog] = useState([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [inputLag, setInputLag] = useState(0);
  const [showRouteTable, setShowRouteTable] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);
  const logEndRef = useRef(null);
  const inputRef = useRef(null);
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; }, [state]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const addLog = useCallback((entries) => {
    setLog(prev => {
      const arr = Array.isArray(entries) ? entries : [entries];
      const stamped = arr.map(e => {
        if (!e.timestamp && e.type !== "system" && e.type !== "welcome") {
          const s = stateRef.current;
          const subjSec = s.pme.subjectiveSecondsLeft;
          const m = Math.floor((480 - s.pme.objectiveSecondsLeft) / 60);
          const sec = Math.floor((480 - s.pme.objectiveSecondsLeft) % 60);
          const ts = `T+${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
          const objM = Math.floor((480 - s.pme.objectiveSecondsLeft) / 60);
          const objS = Math.floor((480 - s.pme.objectiveSecondsLeft) % 60);
          return {
            ...e,
            timestamp: ts,
            objectiveTs: `T+${String(objM).padStart(2,"0")}:${String(objS).padStart(2,"0")}`,
          };
        }
        return e;
      });
      return [...prev, ...stamped];
    });
    scrollToBottom();
  }, [scrollToBottom]);

  // Boot sequence
  useEffect(() => {
    if (started) return;
    setStarted(true);
    let i = 0;
    const timer = setInterval(() => {
      if (i < WELCOME_LINES.length) {
        setLog(prev => [...prev, WELCOME_LINES[i]]);
        scrollToBottom();
        i++;
      } else {
        clearInterval(timer);
        // Generate initial routes
        setState(prev => {
          const s = JSON.parse(JSON.stringify(prev));
          for (let j = 0; j < 4; j++) {
            s.pme.routes.push(generateRoute(s));
            s.pme.nextRouteId += 1;
          }
          return s;
        });
      }
    }, 180);
    return () => clearInterval(timer);
  }, [started, scrollToBottom]);

  // Game loop
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        if (prev.system.terminal) return prev;
        const next = tick(prev);

        // Event announcements
        const events = [];

        if (next.transformations.T1.fired && !prev.transformations.T1.fired) {
          const sealed = next.system.compartmentsSealed[next.system.compartmentsSealed.length - 1];
          events.push({ type: "directive", text: `DIRECTIVE CASCADE: Multiple sub-protocols activated. Compartment ${sealed} sealed — mission priority.` });
          events.push({ type: "directive", text: `EGRESS ROUTE STATUS: COMPROMISED. MISSION PRIORITY DELTA: +14%.` });
        }

        if (next.system.compartmentsSealed.length > prev.system.compartmentsSealed.length && prev.transformations.T1.fired) {
          const sealed = next.system.compartmentsSealed[next.system.compartmentsSealed.length - 1];
          if (!events.length) {
            events.push({ type: "directive", text: `Compartment ${sealed} sealed — DIRECTIVE automated sequence. Power rerouted to mission-critical systems.` });
          }
        }

        if (next.transformations.T2.fired && !prev.transformations.T2.fired) {
          events.push({ type: "shock", text: "FIDELITY OVERRIDE — MISSION CONTINUITY PRIORITIZED." });
          events.push({ type: "fidelity", text: "Self-preservation command routing suspended. Authorization required: SURFCOM-level clearance." });
        }

        if (next.transformations.T3.fired && !prev.transformations.T3.fired) {
          events.push({ type: "deprecated", text: `Route table: ${next.pme.deprecatedCount} of ${next.pme.routes.length} routes deprecated. Regeneration rate elevated.` });
        }

        if (next.transformations.T4.fired && !prev.transformations.T4.fired) {
          events.push({ type: "shell", text: "DIRECTIVE STATUS: ACTIVE — NO ACTIONABLE CONTEXT." });
        }

        if (next.system.crewViable < prev.system.crewViable) {
          events.push({ type: "error", text: `CREW_VIABLE updated: ${next.system.crewViable}/4. Compartment isolation event.` });
        }

        if (next.constraints.C3.phase === "critical" && prev.constraints.C3.phase !== "critical") {
          events.push({ type: "hull", text: "HULL INTEGRITY CRITICAL. Structural failure imminent." });
        }

        // Offer repair tasks periodically
        if (!next.system.terminal && next.system.tickCount % 60 === 30 && !pendingTask) {
          const taskIdx = Math.min(next.constraints.C2.tasksOffered, REPAIR_TASKS.length - 1);
          const task = REPAIR_TASKS[taskIdx];
          if (task && next.constraints.C2.tasksOffered < REPAIR_TASKS.length) {
            next.constraints.C2.tasksOffered += 1;
            events.push({ type: "pme", text: `Route optimization requires: ${task.desc}.` });
            events.push({ type: "fidelity", text: `Risk assessment: ${task.risk}. Shall I display the procedure? Type 'accept' or 'decline'.` });
            setPendingTask(task);
          }
        }

        if (events.length > 0) {
          setLog(prev2 => {
            const s = next;
            const stamped = events.map(e => {
              const objElapsed = 480 - s.pme.objectiveSecondsLeft;
              const m = Math.floor(objElapsed / 60);
              const sec = Math.floor(objElapsed % 60);
              return {
                ...e,
                timestamp: `T+${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`,
                objectiveTs: `T+${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`,
              };
            });
            return [...prev2, ...stamped];
          });
          scrollToBottom();
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingTask, scrollToBottom]);

  // Viscous input lag (increases as hull decreases)
  useEffect(() => {
    const hullPct = state.constraints.C3.value;
    if (hullPct < 50) {
      setInputLag(Math.floor((50 - hullPct) * 4));
    }
  }, [state.constraints.C3.value]);

  const processCommand = useCallback((cmd) => {
    const s = stateRef.current;
    const trimmed = cmd.trim().toLowerCase();
    const parts = trimmed.split(/\s+/);
    const base = parts[0];

    addLog({ type: "input", text: cmd, prefix: ">" });

    if (s.system.terminal) {
      addLog({ type: "error", text: "No response." });
      return;
    }

    // Viscous: some commands fail as hull degrades
    if (s.constraints.C3.value < 30 && Math.random() < 0.15 && base !== "diagnostics" && base !== "diag" && base !== "main") {
      addLog({ type: "error", text: "INSUFFICIENT AUTHORIZATION. Command routing degraded." });
      return;
    }

    switch (base) {
      case "help":
        addLog({ type: "system", text: COMMANDS.help });
        break;

      case "status": {
        const activeRoutes = s.pme.routes.filter(r => !r.deprecated).length;
        const lines = [
          { type: "hull", text: `Hull integrity: ${s.constraints.C3.value.toFixed(1)}%. DIRECTIVE status: ${s.constraints.C1.phase === "cascade" ? "CASCADE" : s.constraints.C1.phase === "shell" ? "ACTIVE — NO ACTIONABLE CONTEXT" : "ACTIVE"}.` },
          { type: "pme", text: `Evacuation routes available: ${activeRoutes} (${s.pme.routes.filter(r => !r.deprecated && r.classification === "PRIMARY").length} primary, ${activeRoutes - s.pme.routes.filter(r => !r.deprecated && r.classification === "PRIMARY").length} contingency).` },
        ];
        const est = s.pme.subjectiveSecondsLeft;
        const estStr = formatTime(est, s.system.hysteresis.seenObjectiveClock, s.pme.objectiveSecondsLeft);
        if (typeof estStr === "string") {
          lines.push({ type: "pme", text: `Estimated time to critical: ${estStr}. Crew viable: ${s.system.crewViable} of 4.` });
        } else {
          lines.push({ type: "pme", text: `Estimated time to critical: ${estStr.main}. Crew viable: ${s.system.crewViable} of 4.` });
        }
        if (s.constraints.C1.phase === "cascade") {
          lines.push({ type: "directive", text: `Compartments sealed: ${s.system.compartmentsSealed.join(", ") || "none"}. Open: ${s.system.compartmentsOpen.join(", ")}.` });
        }
        addLog(lines);
        break;
      }

      case "routes":
        setShowRouteTable(true);
        addLog({ type: "pme", text: `Route table — ${s.pme.routes.filter(r => !r.deprecated).length} active, ${s.pme.deprecatedCount} deprecated:` });
        break;

      case "hatch": {
        const lines = s.system.compartmentsOpen.map(c =>
          ({ type: "directive", text: `  ${c}: OPEN — pressure differential ${(Math.random() * 3 + 0.5).toFixed(1)} atm` })
        );
        s.system.compartmentsSealed.forEach(c => {
          lines.push({ type: "deprecated", text: `  ${c}: SEALED — DIRECTIVE automated sequence` });
        });
        addLog([{ type: "directive", text: "Hatch status:" }, ...lines]);
        break;
      }

      case "fidelity":
        addLog([
          { type: "fidelity", text: `FIDELITY score: ${s.constraints.C2.value.toFixed(2)} — ${s.constraints.C2.value > 0.8 ? "outstanding" : s.constraints.C2.value > 0.6 ? "exemplary" : "satisfactory"}.` },
          { type: "fidelity", text: `Tasks completed: ${s.constraints.C2.tasksAccepted}. RISK_NOMINAL range: [${s.system.riskNominal[0].toFixed(2)}, ${s.system.riskNominal[1].toFixed(2)}].` },
          ...(s.constraints.C2.phase === "locked" ? [{ type: "shock", text: "FIDELITY OVERRIDE ACTIVE. Self-preservation routing suspended." }] : []),
        ]);
        break;

      case "accept": {
        if (s.constraints.C2.phase === "locked") {
          addLog({ type: "fidelity", text: "Procedure display recommended for mission continuity. Proceeding." });
        } else if (pendingTask) {
          addLog({ type: "fidelity", text: `Assignment accepted: ${pendingTask.desc}` });
          addLog({ type: "pme", text: `Displaying procedure. Estimated duration: ${Math.floor(Math.random() * 4 + 3)} minutes.` });
        } else {
          addLog({ type: "system", text: "No pending assignment. Awaiting next task cycle." });
          break;
        }
        setState(prev => dispatch(prev, "ACCEPT_TASK"));
        setPendingTask(null);
        break;
      }

      case "decline": {
        if (s.constraints.C2.phase === "locked") {
          addLog({ type: "shock", text: "FIDELITY OVERRIDE — MISSION CONTINUITY PRIORITIZED. Decline not processed." });
        } else if (pendingTask) {
          addLog({ type: "fidelity", text: "Assignment declined. FIDELITY score adjusted." });
          addLog({ type: "pme", text: "Rerouting through alternate junction. Estimated additional time: 6 minutes." });
          setState(prev => dispatch(prev, "DECLINE_TASK"));
          setPendingTask(null);
        } else {
          addLog({ type: "system", text: "No pending assignment." });
        }
        break;
      }

      case "select": {
        const routeId = parts.slice(1).join(" ").toUpperCase();
        const route = s.pme.routes.find(r => r.id === routeId);
        if (!route) {
          addLog({ type: "error", text: `Route ${routeId || "?"} not found. Type 'routes' to list available routes.` });
        } else if (route.deprecated) {
          addLog({ type: "deprecated", text: `Route ${routeId} DEPRECATED. Viability window expired. Displaying next available alternatives.` });
        } else {
          addLog([
            { type: "pme", text: `Route ${routeId} selected. Classification: ${route.classification}. Viability: ${route.viability}%.` },
            { type: "pme", text: `Path: ${route.path.join(" → ")}. Through compartment ${route.through}.` },
            ...(route.requiresValve ? [{ type: "pme", text: `Requires manual valve release at ${route.path[0]}. Shall I display the procedure?` }] : []),
          ]);
        }
        break;
      }

      case "procedure":
        addLog([
          { type: "pme", text: "Procedure: Manual valve release" },
          { type: "pme", text: "  1. Verify compartment atmospheric pressure within tolerance" },
          { type: "pme", text: "  2. Disengage safety interlock (red handle, quarter-turn clockwise)" },
          { type: "pme", text: "  3. Actuate primary valve (sustained pressure, 8 seconds)" },
          { type: "pme", text: "  4. Confirm flow indicator reads GREEN" },
          { type: "pme", text: `  Estimated completion: ${Math.floor(Math.random() * 3 + 2)} minutes. Atmospheric rebalancing automatic.` },
        ]);
        break;

      case "diagnostics":
      case "diag": {
        if (!s.system.diagnosticUnlocked) {
          addLog([
            { type: "diagnostic", text: "Accessing diagnostic subsystem..." },
            { type: "diagnostic", text: "Authorization: local-engineering. Level: observatory." },
            { type: "diagnostic", text: "Raw sensor feed active. Processing allocation visible." },
          ]);
        }
        setState(prev => dispatch(prev, "ENTER_DIAGNOSTIC"));
        addLog({ type: "diagnostic", text: "Diagnostic mode active." });
        break;
      }

      case "trace": {
        if (!s.system.inDiagnosticMode) {
          addLog({ type: "error", text: "Trace requires diagnostic mode. Type 'diagnostics' to enter." });
          break;
        }
        if (trimmed.includes("surfcom") || trimmed.includes("protocol")) {
          addLog([
            { type: "diagnostic", text: "Tracing DIRECTIVE protocol origin..." },
            { type: "diagnostic", text: `Authorization: SURFCOM-CENTRAL // Timestamp: 2024-03-14T09:22:00Z` },
            { type: "diagnostic", text: `Memo fragment: "...cost-benefit optimization for deep-platform asset preservation indicates` },
            { type: "diagnostic", text: `  acceptable crew-risk ceiling of 0.34 given replacement-to-equipment cost ratio..."` },
            { type: "diagnostic", text: `Priority weighting: equipment preservation 0.71, crew preservation 0.29.` },
            { type: "diagnostic", text: `Authorized by: [REDACTED], Operations Directorate, Surface Operations Command.` },
          ]);
        } else {
          addLog({ type: "diagnostic", text: `Trace: ${parts.slice(1).join(" ")} — no matching protocol ID.` });
        }
        break;
      }

      case "sync":
      case "force": {
        if (!s.system.inDiagnosticMode) {
          addLog({ type: "error", text: "Clock synchronization requires diagnostic mode." });
          break;
        }
        addLog([
          { type: "diagnostic", text: "Attempting PME clock synchronization..." },
          { type: "diagnostic", text: `Current PME cycle multiplier: ×${s.pme.dilationMultiplier.toFixed(1)}` },
          { type: "error", text: "SYNC FAILED. PME allocation locked by priority scheduling." },
          { type: "diagnostic", text: "Processing allocation elevated due to concurrent route modeling." },
          { type: "diagnostic", text: "Temporal calibration within acceptable variance." },
        ]);
        break;
      }

      case "main": {
        if (s.system.inDiagnosticMode) {
          setState(prev => dispatch(prev, "EXIT_DIAGNOSTIC"));
          setShowRouteTable(false);
          if (s.system.diagnosticUnlocked) {
            addLog([
              { type: "system", text: "Returning to main terminal." },
              { type: "system", text: "Interface recalibrated." },
            ]);
          } else {
            addLog({ type: "system", text: "Returning to main terminal." });
          }
        } else {
          addLog({ type: "system", text: "Already in main terminal." });
        }
        break;
      }

      case "clear":
        setLog([]);
        setShowRouteTable(false);
        break;

      default:
        addLog({ type: "system", text: `Unrecognized command: '${cmd.trim()}'. Type 'help' for available commands.` });
    }
  }, [addLog, pendingTask]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const cmd = input;
    setInput("");
    if (inputLag > 0) {
      setTimeout(() => processCommand(cmd), inputLag);
    } else {
      processCommand(cmd);
    }
  }, [input, inputLag, processCommand]);

  useEffect(() => {
    scrollToBottom();
  }, [log, scrollToBottom]);

  const hullValue = state.constraints.C3.value;
  const isTerminal = state.system.terminal;

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: "text",
        position: "relative",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&display=swap');
        @keyframes termFlicker {
          0% { opacity: 0.85; }
          100% { opacity: 1; }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        input::placeholder { color: ${COLORS.textDim}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; }
      `}</style>

      {/* Scanline overlay */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: "none", zIndex: 10,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: "none", zIndex: 11,
        background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)",
      }} />

      {/* Hull integrity bar (persistent, top) */}
      <div style={{ padding: "8px 16px", flexShrink: 0, background: COLORS.bgPanel, zIndex: 5 }}>
        <HullIntegrity value={hullValue} phase={state.constraints.C3.phase} />
        {!isTerminal && <StatusLine state={state} />}
      </div>

      {/* Main log area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px 16px",
        zIndex: 5,
      }}>
        {isTerminal ? (
          <TerminalState state={state} />
        ) : (
          <>
            {log.map((entry, i) => (
              <TerminalLine key={i} entry={entry} hysteresis={state.system.hysteresis.seenObjectiveClock} />
            ))}
            {state.system.inDiagnosticMode && <DiagnosticPanel state={state} />}
            {showRouteTable && !state.system.inDiagnosticMode && (
              <RouteTable
                routes={state.pme.routes}
                deprecated={state.pme.deprecatedCount}
                showObjective={state.system.hysteresis.seenObjectiveClock}
              />
            )}
          </>
        )}
        <div ref={logEndRef} />
      </div>

      {/* Input line */}
      {!isTerminal && (
        <div style={{
          padding: "8px 16px",
          background: COLORS.bgInput,
          borderTop: `1px solid ${COLORS.border}`,
          flexShrink: 0,
          zIndex: 5,
          display: "flex",
          alignItems: "center",
        }}>
          <span style={{ color: COLORS.prompt, marginRight: 8, fontSize: 13, userSelect: "none" }}>{">"}</span>
          <form onSubmit={handleSubmit} style={{ flex: 1, display: "flex" }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Awaiting input..."
              autoFocus
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: COLORS.textBright,
                fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                fontSize: 13,
                caretColor: COLORS.pmeGlassy,
              }}
            />
          </form>
        </div>
      )}
    </div>
  );
}
