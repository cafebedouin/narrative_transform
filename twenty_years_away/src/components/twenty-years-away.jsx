import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// STEP 1 — THE ENGINE (logic only)
// Pure state management. No UI. Constraint physics.
// ═══════════════════════════════════════════════════════════════

const INITIAL_STATE = {
  constraints: {
    C1: { value: 0.3, epsilon: 0.18, chi: 0.3, support: 0.85, type: "snare", phase: "pre_TR1" },
    C2: { value: 1.0, epsilon: 0, chi: 0, support: 0.95, type: "mountain", phase: "constant" },
    C3: { value: 0.85, epsilon: 0.05, chi: 0.15, support: 0.4, type: "rope", phase: "pre_TR2" },
  },
  uczF: {
    active: false,
    deltaT: 0,
    maxDeltaT: 22,
    persistent: true, // aesthetic betrayal: never fades
    engaged: false,
    visible: false,
  },
  transformationRules: {
    TR1: { fired: false, progress: 0, threshold: 0.80, reversible: false },
    TR2: { fired: false, progress: 0, threshold: 20, reversible: false },
    TR3: { fired: false, progress: 0, threshold: null, reversible: false },
    TR4: { fired: false, progress: 0, threshold: null, reversible: false },
  },
  system: {
    attractorProximity: 0,
    hysteresisFlags: {
      C1_perspective_shift: false,
      C3_piton_awareness: false,
      metric_trust_eroded: false,
    },
    terminalReached: false,
    scrubPosition: 0, // 0-100
    syncPoint: "SP1",
    omegaRevealed: [false, false, false],
    probeCount: 0,
    idleTicks: 0,
  },
};

function getSyncPoint(scrub) {
  if (scrub < 15) return "SP1";
  if (scrub < 30) return "SP2";
  if (scrub < 70) return "SP3";
  if (scrub < 88) return "SP4";
  return "SP5";
}

function propagateCouplings(state) {
  const next = JSON.parse(JSON.stringify(state));
  const { C1, C3 } = next.constraints;
  const uczF = next.uczF;
  const tr = next.transformationRules;
  const sys = next.system;
  const scrub = sys.scrubPosition;

  // Coupling 1: C1 → UCZ-F (χ ≥ 0.80 triggers escape seeking)
  if (C1.chi >= 0.80 && !tr.TR1.fired) {
    tr.TR1.fired = true;
    tr.TR1.progress = 1;
    uczF.visible = true;
    C1.phase = "post_TR1";
  }

  // Scrub drives deltaT
  uczF.deltaT = (scrub / 100) * uczF.maxDeltaT;

  // Coupling 2: UCZ-F → ΔT (once engaged)
  if (scrub >= 30 && !uczF.engaged) {
    uczF.engaged = true;
    uczF.active = true;
  }

  // Coupling 3: ΔT → C3.State (social contract degradation)
  if (uczF.deltaT >= 20 && !tr.TR2.fired) {
    tr.TR2.fired = true;
    tr.TR2.progress = 1;
    C3.phase = "piton";
    C3.type = "piton";
  }
  // Gradual degradation
  const degradation = Math.min(1, uczF.deltaT / uczF.maxDeltaT);
  C3.value = Math.max(0.08, 0.85 - degradation * 0.77);
  tr.TR2.progress = Math.min(1, uczF.deltaT / 20);

  // Coupling 4: ΔT → Index mismatch
  if (tr.TR2.fired && scrub >= 70) {
    C3.phase = "piton";
  }

  // TR3: Index mismatch (C3=piton AND post-return)
  if (C3.phase === "piton" && scrub >= 70 && !tr.TR3.fired) {
    tr.TR3.fired = true;
    tr.TR3.progress = 1;
  }

  // TR4: Misalignment enables exit
  if (tr.TR3.fired && scrub >= 88 && !tr.TR4.fired) {
    tr.TR4.fired = true;
    tr.TR4.progress = 1;
  }

  // C1 chi increases with scrub in early phase
  if (scrub < 30) {
    C1.chi = 0.3 + (scrub / 30) * 0.55;
    C1.value = C1.chi;
    tr.TR1.progress = Math.min(1, C1.chi / 0.80);
  }

  // Attractor proximity
  const trFired = [tr.TR1.fired, tr.TR2.fired, tr.TR3.fired, tr.TR4.fired].filter(Boolean).length;
  sys.attractorProximity = trFired / 4;
  sys.terminalReached = trFired === 4 && scrub >= 95;
  sys.syncPoint = getSyncPoint(scrub);

  // Hysteresis: once you've seen the piton, early metrics feel suspect
  if (scrub >= 75) {
    sys.hysteresisFlags.C3_piton_awareness = true;
  }
  if (scrub >= 88) {
    sys.hysteresisFlags.metric_trust_eroded = true;
  }
  if (C1.chi >= 0.80) {
    sys.hysteresisFlags.C1_perspective_shift = true;
  }

  // UCZ-F visibility: once visible, always visible (aesthetic betrayal)
  if (uczF.visible) uczF.persistent = true;

  return next;
}

// ═══════════════════════════════════════════════════════════════
// STEP 2 — THE VIEWPORTS (presentation only)
// Visual elements per constraint. Aesthetic signatures.
// ═══════════════════════════════════════════════════════════════

// --- Literary Panel Content (Rip Van Winkle) ---
const LITERARY_CONTENT = {
  SP1: {
    title: "The Village Below",
    excerpt: "In a village at the foot of the Kaatskill mountains, there lived a simple, good-natured fellow by the name of Rip Van Winkle. He was a great favourite among all the good wives of the village — but his own wife kept him under constant domestic tribulation.",
    c1Note: "Household Tension: Rising",
    c3Note: "Village Life: Familiar",
    mood: "The inn at the sign of King George is full and warm. Nicholas Vedder dozes on his bench. The world is small and known.",
  },
  SP2: {
    title: "Into the Mountains",
    excerpt: "He shouldered his fowling piece, and with a heart full of woe, whistled his dog to his side and strolled away into the mountains. A strange figure appeared, bearing a keg upon his shoulders, beckoning silently.",
    c1Note: "Escape Route: Found",
    c3Note: "Village Bonds: Stretching",
    mood: "The flagon passes. The liquor is excellent. One sip becomes many. The mountains close around.",
  },
  SP3: {
    title: "The Long Sleep",
    excerpt: "He looked round for his gun, but in place of the clean, well-oiled fowling piece, he found a rusty firelock lying by him. Wolf, too, had disappeared. His joints were stiff. His beard had grown a foot long.",
    c1Note: "Domestic Obligation: Suspended",
    c3Note: "Village Continuity: Unknown",
    mood: "Time is not passing. Time has passed.",
  },
  SP4: {
    title: "The Changed Village",
    excerpt: "The very village was altered: it was larger and more populous. Strange names were over the doors — strange faces at the windows — everything was strange. The very character of the people seemed changed. There was a busy, bustling, disputatious tone about it.",
    c1Note: "Former Bonds: Dissolved",
    c3Note: "Social Order: Unrecognizable",
    mood: "The inn is gone. In its place stands the Union Hotel. The portrait of King George has been repainted. The same face now wears a blue coat and holds a sword. Below it reads: GENERAL WASHINGTON.",
  },
  SP5: {
    title: "The Relic",
    excerpt: "He used to tell his story to every stranger that arrived. He was reverenced as one of the patriarchs of the village, and a chronicle of the old times 'before the war.' It was some time before he could be made to comprehend the strange events that had taken place during his torpor.",
    c1Note: "Petticoat Government: Ended by time",
    c3Note: "Social Standing: Ornamental",
    mood: "He has no duties, no expectations, no place in the machinery. The village keeps him as one keeps a portrait of someone else's grandfather.",
  },
};

// --- Reentry Panel Content ---
const REENTRY_CONTENT = {
  SP1: {
    title: "Before",
    excerpt: "The conditions are documented in aggregate. Poverty rate in the neighborhood: 34%. Single-parent households: 58%. Arrests within a three-block radius in the prior year: 127. The individual's story begins inside statistics that precede them.",
    c1Note: "Environmental Pressure: Escalating",
    c3Note: "Community Programs: Active",
    metrics: { employment: 72, housing: 65, socialNet: 78, reintegration: 74 },
    mood: "There are services. There are caseworkers. There is a system that says it is designed to help.",
  },
  SP2: {
    title: "Sentencing",
    excerpt: "The sentence is handed down. Twenty-two years. The courtroom is quiet for a moment that does not feel like mercy. Outside, the buses run. Leases are signed. Children enter schools that will close and reopen under different names.",
    c1Note: "Precipitating Conditions: Recorded",
    c3Note: "Community Ties: Severing",
    metrics: { employment: 72, housing: 65, socialNet: 78, reintegration: 74 },
    mood: "A date is set. It is far enough away that the world will not be the same.",
  },
  SP3: {
    title: "Years Served",
    excerpt: "The facility has its own economy of time. Commissary prices adjust quarterly. Correspondence arrives, then thins. Children's handwriting changes between letters. Some letters stop. The neighborhood sends news, then silence. A pandemic comes and goes through a slot in the door.",
    c1Note: "Prior Conditions: Archived",
    c3Note: "External Networks: Degrading",
    metrics: { employment: 41, housing: 28, socialNet: 22, reintegration: 42 },
    mood: "Time is not passing. Time has passed.",
  },
  SP4: {
    title: "Reentry Day",
    excerpt: "The address on file no longer exists. The bus route has been rerouted twice. A phone is issued — touchscreen, no buttons. The parole office is in a building that used to be a hardware store. The hardware store is now a café that charges six dollars for coffee.",
    c1Note: "Prior Environment: Transformed",
    c3Note: "Reintegration Pathways: Obsolete",
    metrics: { employment: 23, housing: 14, socialNet: 11, reintegration: 18 },
    mood: "The system says: welcome back. The neighborhood says nothing. It has forgotten the shape of your absence.",
  },
  SP5: {
    title: "After",
    excerpt: "Recidivism statistics are collected at year one, year three, year five. Employment outcomes are tracked. Housing stability is measured. The individual becomes a data point in a longitudinal study that will be cited in a policy brief read by no one who was in that courtroom.",
    c1Note: "Former Pressures: Historically Noted",
    c3Note: "Social Standing: Peripheral",
    metrics: { employment: 19, housing: 12, socialNet: 8, reintegration: 11 },
    mood: "There are no duties, no expectations, no place in the machinery. The neighborhood keeps nothing. The record keeps everything.",
  },
};

const OMEGA_TEXTS = [
  "Ω₁ — Rip's twenty years were experienced as a single night of dreamless rest. A twenty-two year sentence is experienced as twenty-two years. Does the felt quality of displacement change what is lost, or only how the loss is carried?",
  "Ω₂ — Rip had no agency during his sleep. An incarcerated person reads, writes, learns, grieves, ages, adapts. Does agency within displacement slow the decay of the world outside — or only sharpen the recognition of how much has decayed?",
  "Ω₃ — Rip returned to benign curiosity. A returning citizen faces active exclusion — background checks, housing denials, social suspicion. Is Rip's 'freedom through irrelevance' available to someone whose irrelevance is enforced rather than granted? Or does stigma create a constraint the story never needed.",
];

const SYSTEM_MESSAGES = {
  idle: "The temporal scrubber advances on its own. Time passes whether you attend to it or not.",
  probe: "You have found a gap between the panels. The gap is real.",
  terminal: "Both stories have ended the same way. The question of whether they are the same story remains open.",
  welcome: "I am a bridge between two stories that share a skeleton.",
  hysteresis: "This figure reflects reported expectations, pre-return.",
};

// ═══════════════════════════════════════════════════════════════
// STEP 3 — THE BINDING (integration)
// Connect Engine to Viewports. Wire everything.
// ═══════════════════════════════════════════════════════════════

const MetricBar = ({ label, value, ghosted, hysteresisNote, betrayed }) => {
  const barColor = ghosted
    ? "rgba(120,115,105,0.25)"
    : betrayed
    ? "rgba(186,155,68,0.85)"
    : "rgba(120,115,105,0.7)";

  return (
    <div style={{ marginBottom: 10, opacity: ghosted ? 0.4 : 1, transition: "opacity 1.2s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em", color: ghosted ? "#8a8578" : "#5a554a", marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ position: "relative" }}>
          {value}%
          {hysteresisNote && (
            <span style={{ position: "absolute", top: -14, right: 0, fontSize: 9, color: "#a09070", fontStyle: "italic", whiteSpace: "nowrap" }}>
              {hysteresisNote}
            </span>
          )}
        </span>
      </div>
      <div style={{ height: 3, background: "rgba(120,115,105,0.12)", borderRadius: 1 }}>
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: barColor,
            borderRadius: 1,
            transition: "width 1.5s ease, background 1.5s ease",
            boxShadow: betrayed ? "0 0 8px rgba(186,155,68,0.4)" : "none",
          }}
        />
      </div>
    </div>
  );
};

const OmegaCard = ({ text, revealed, onProbe }) => (
  <div
    onClick={onProbe}
    style={{
      padding: revealed ? "14px 16px" : "10px 16px",
      marginBottom: 8,
      background: revealed ? "rgba(60,55,45,0.06)" : "rgba(60,55,45,0.02)",
      border: `1px solid ${revealed ? "rgba(120,115,105,0.3)" : "rgba(120,115,105,0.1)"}`,
      borderRadius: 2,
      cursor: revealed ? "default" : "pointer",
      transition: "all 0.8s ease",
      fontFamily: "'Lora', serif",
      fontSize: revealed ? 13 : 12,
      lineHeight: 1.65,
      color: revealed ? "#4a453a" : "#9a9588",
      fontStyle: "italic",
    }}
  >
    {revealed ? text : "A gap between the panels. Press to look closer."}
  </div>
);

const ConstraintHighlight = ({ type, active, children }) => {
  const borders = {
    snare: "2px solid rgba(160,80,60,0.5)",
    mountain: "2px solid rgba(80,85,78,0.6)",
    rope: "2px solid rgba(100,120,80,0.4)",
    piton: "2px dashed rgba(120,115,105,0.25)",
    uczf: "2px solid rgba(186,155,68,0.7)",
  };

  return (
    <div
      style={{
        borderLeft: active ? borders[type] || borders.rope : "2px solid transparent",
        paddingLeft: active ? 12 : 0,
        transition: "all 0.6s ease",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
};

export default function TwentyYearsAway() {
  const [state, setState] = useState(INITIAL_STATE);
  const [hoveredConstraint, setHoveredConstraint] = useState(null);
  const [systemMessage, setSystemMessage] = useState(SYSTEM_MESSAGES.welcome);
  const [messageOpacity, setMessageOpacity] = useState(1);
  const [hasInteracted, setHasInteracted] = useState(false);
  const idleTimerRef = useRef(null);
  const scrubRef = useRef(null);

  // Engine dispatch
  const dispatch = useCallback((action, payload) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      switch (action) {
        case "setScrub": {
          next.system.scrubPosition = payload;
          break;
        }
        case "incrementChi": {
          next.constraints.C1.chi = Math.min(1, next.constraints.C1.chi + 0.05);
          next.constraints.C1.value = next.constraints.C1.chi;
          break;
        }
        case "revealOmega": {
          if (payload >= 0 && payload < 3 && !next.system.omegaRevealed[payload]) {
            next.system.omegaRevealed[payload] = true;
            next.system.probeCount += 1;
          }
          break;
        }
        case "idleTick": {
          next.system.idleTicks += 1;
          if (next.system.scrubPosition < 98) {
            next.system.scrubPosition = Math.min(98, next.system.scrubPosition + 0.3);
          }
          break;
        }
        default:
          break;
      }
      return propagateCouplings(next);
    });
  }, []);

  // Idle timer — time passes whether you attend to it
  useEffect(() => {
    if (hasInteracted) {
      clearInterval(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        const interval = setInterval(() => {
          dispatch("idleTick");
        }, 4000);
        idleTimerRef.current = interval;
      }, 12000);
    }
    return () => clearInterval(idleTimerRef.current);
  }, [hasInteracted, state.system.scrubPosition, dispatch]);

  // System messages — archival melancholy voice
  useEffect(() => {
    const sp = state.system.syncPoint;
    const tr = state.transformationRules;
    let msg = "";

    if (state.system.terminalReached) {
      msg = SYSTEM_MESSAGES.terminal;
    } else if (state.system.probeCount > 0 && !state.system.terminalReached) {
      msg = SYSTEM_MESSAGES.probe;
    } else if (tr.TR2.fired && !tr.TR3.fired) {
      msg = "The village has continued without you.";
    } else if (tr.TR1.fired && !tr.TR2.fired) {
      msg = "This reference is no longer current.";
    } else if (state.system.idleTicks > 2) {
      msg = SYSTEM_MESSAGES.idle;
    } else if (sp === "SP1") {
      msg = SYSTEM_MESSAGES.welcome;
    } else if (sp === "SP2") {
      msg = "You may return now, if you wish.";
    }

    if (msg && msg !== systemMessage) {
      setMessageOpacity(0);
      setTimeout(() => {
        setSystemMessage(msg);
        setMessageOpacity(1);
      }, 600);
    }
  }, [state.system.syncPoint, state.transformationRules, state.system.terminalReached, state.system.probeCount, state.system.idleTicks, systemMessage]);

  const scrub = state.system.scrubPosition;
  const sp = state.system.syncPoint;
  const litContent = LITERARY_CONTENT[sp];
  const realContent = REENTRY_CONTENT[sp];
  const isPiton = state.constraints.C3.phase === "piton";
  const isTerminal = state.system.terminalReached;
  const hysteresisActive = state.system.hysteresisFlags.metric_trust_eroded;
  const c3Degradation = 1 - (state.constraints.C3.value / 0.85);
  const snareIntensity = state.constraints.C1.chi;

  // Viewport narrowing (snare effect) — pre-displacement only
  const viewportNarrow = scrub < 30 ? Math.max(0, snareIntensity - 0.3) * 30 : 0;

  // Desaturation (piton effect)
  const desaturation = isPiton ? 65 : c3Degradation * 40;

  // UCZ-F glow intensity (aesthetic betrayal: persistent, never fades)
  const uczfGlow = state.uczF.visible ? 0.6 + Math.sin(Date.now() / 2000) * 0.15 : 0;

  // Metrics with hysteresis
  const getMetrics = () => {
    if (!realContent.metrics) return null;
    const m = realContent.metrics;
    return {
      employment: m.employment,
      housing: m.housing,
      socialNet: m.socialNet,
      reintegration: m.reintegration,
    };
  };

  const metrics = getMetrics();

  const handleScrub = (e) => {
    setHasInteracted(true);
    const rect = scrubRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    dispatch("setScrub", x * 100);
  };

  const handleScrubDrag = (e) => {
    if (e.buttons === 1) handleScrub(e);
  };

  // Attractor proximity ring color
  const attractorColor = `rgba(120,115,105,${0.1 + state.system.attractorProximity * 0.5})`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f0e8",
        fontFamily: "'Lora', serif",
        color: "#3a352c",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@300;400&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet" />

      {/* C2 — Mountain frame (immovable, always present) */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: "linear-gradient(90deg, #4a4840, #5a5850, #4a4840)",
          zIndex: 100,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          background: "linear-gradient(90deg, #4a4840, #5a5850, #4a4840)",
          zIndex: 100,
        }}
      />

      {/* Header — System Self-Description */}
      <div style={{ padding: "32px 24px 12px", textAlign: "center", position: "relative", zIndex: 10 }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: "0.08em",
            color: "#3a352c",
            margin: 0,
            opacity: isTerminal ? 0.4 : 0.85,
            transition: "opacity 2s ease",
          }}
        >
          TWENTY YEARS AWAY
        </h1>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            color: "#8a8578",
            marginTop: 6,
            textTransform: "uppercase",
          }}
        >
          A parallel reading
        </div>
      </div>

      {/* System Voice — archival melancholy */}
      <div
        style={{
          textAlign: "center",
          padding: "4px 24px 18px",
          fontStyle: "italic",
          fontSize: 13,
          color: "#7a756a",
          opacity: messageOpacity,
          transition: "opacity 0.6s ease",
          minHeight: 20,
          lineHeight: 1.5,
        }}
      >
        {systemMessage}
      </div>

      {/* ─── TEMPORAL SCRUBBER ─── */}
      <div style={{ padding: "0 24px 20px", position: "relative", zIndex: 20 }}>
        <div
          ref={scrubRef}
          onClick={handleScrub}
          onMouseMove={handleScrubDrag}
          style={{
            height: 32,
            background: "rgba(80,75,65,0.06)",
            borderRadius: 2,
            cursor: "ew-resize",
            position: "relative",
            border: "1px solid rgba(120,115,105,0.15)",
            userSelect: "none",
          }}
        >
          {/* Sync point markers */}
          {[15, 30, 70, 88].map((pos, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${pos}%`,
                top: 0,
                bottom: 0,
                width: 1,
                background: `rgba(120,115,105,${state.transformationRules[`TR${i + 1}`].fired ? 0.4 : 0.12})`,
              }}
            />
          ))}

          {/* UCZ-F persistent glow (aesthetic betrayal) */}
          {state.uczF.visible && (
            <div
              style={{
                position: "absolute",
                left: "28%",
                top: -2,
                bottom: -2,
                width: "6%",
                background: `rgba(186,155,68,${uczfGlow})`,
                borderRadius: 2,
                transition: "background 0.3s ease",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Progress fill */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${scrub}%`,
              background: `linear-gradient(90deg, rgba(160,140,100,0.15), rgba(120,115,105,${0.12 + c3Degradation * 0.15}))`,
              borderRadius: "2px 0 0 2px",
              transition: "width 0.3s ease",
            }}
          />

          {/* Scrubber handle */}
          <div
            style={{
              position: "absolute",
              left: `${scrub}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: isPiton ? "#8a8578" : "#5a554a",
              border: `2px solid ${isTerminal ? attractorColor : "#f5f0e8"}`,
              boxShadow: `0 1px 4px rgba(0,0,0,0.15)`,
              transition: "background 1s ease",
            }}
          />

          {/* Time label */}
          <div
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: "#a09a8e",
              letterSpacing: "0.05em",
            }}
          >
            ΔT ≈ {state.uczF.deltaT.toFixed(1)} years
          </div>
        </div>

        {/* Sync point labels */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#b0a898", letterSpacing: "0.04em" }}>
          <span>before</span>
          <span style={{ opacity: scrub > 25 ? 1 : 0.3 }}>departure</span>
          <span style={{ opacity: scrub > 45 ? 1 : 0.3 }}>displacement</span>
          <span style={{ opacity: scrub > 75 ? 1 : 0.3 }}>return</span>
          <span style={{ opacity: scrub > 90 ? 1 : 0.3 }}>after</span>
        </div>
      </div>

      {/* ─── SPLIT PANELS ─── */}
      <div
        style={{
          display: "flex",
          gap: 1,
          padding: `0 ${24 + viewportNarrow}px`,
          transition: "padding 1.5s ease",
          minHeight: 420,
        }}
      >
        {/* ═══ LITERARY PANEL (Left) ═══ */}
        <div
          style={{
            flex: 1,
            background: "rgba(235,225,205,0.5)",
            padding: "20px 22px",
            borderRadius: "2px 0 0 2px",
            position: "relative",
            filter: sp === "SP3" ? "saturate(0.3) brightness(0.97)" : `saturate(${1 - desaturation / 200})`,
            transition: "filter 2s ease, padding 1.5s ease",
            overflow: "hidden",
          }}
          onMouseEnter={() => setHoveredConstraint("literary")}
          onMouseLeave={() => setHoveredConstraint(null)}
        >
          {/* Panel label */}
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.15em",
              color: "#a09a8e",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Sleepy Hollow, 1790 — 1810
          </div>

          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20,
              fontWeight: 400,
              marginBottom: 14,
              color: "#4a453a",
              opacity: isPiton && sp !== "SP5" ? 0.5 : 1,
              transition: "opacity 1.5s ease",
            }}
          >
            {litContent.title}
          </h2>

          {/* C1 highlight zone */}
          <ConstraintHighlight type="snare" active={hoveredConstraint === "reentry" || hoveredConstraint === "c1"}>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: snareIntensity > 0.7 ? "#a06040" : "#8a8578",
                marginBottom: 10,
                transition: "color 1s ease",
              }}
            >
              {litContent.c1Note}
            </div>
          </ConstraintHighlight>

          {/* Main excerpt */}
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.75,
              color: "#4a453a",
              marginBottom: 16,
              opacity: sp === "SP3" ? 0.45 : isTerminal ? 0.55 : 1,
              transition: "opacity 2s ease",
            }}
          >
            {litContent.excerpt}
          </div>

          {/* C3 highlight zone */}
          <ConstraintHighlight type={isPiton ? "piton" : "rope"} active={hoveredConstraint === "reentry" || hoveredConstraint === "c3"}>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: isPiton ? "#a09a8e" : "#6a7a5a",
                marginBottom: 10,
                textDecoration: isPiton ? "line-through" : "none",
                opacity: isPiton ? 0.4 : 0.8,
                transition: "all 1.5s ease",
              }}
            >
              {litContent.c3Note}
            </div>
          </ConstraintHighlight>

          {/* Mood text — personality voice */}
          <div
            style={{
              fontStyle: "italic",
              fontSize: 12,
              lineHeight: 1.7,
              color: "#7a756a",
              borderTop: "1px solid rgba(120,115,105,0.12)",
              paddingTop: 12,
              marginTop: 12,
            }}
          >
            {litContent.mood}
          </div>

          {/* UCZ-F element — persistent (aesthetic betrayal: does NOT fade) */}
          {state.uczF.visible && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: `rgba(186,155,68,${0.15 + uczfGlow * 0.3})`,
                border: "1px solid rgba(186,155,68,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                transition: "background 0.5s ease",
                boxShadow: `0 0 ${12 + uczfGlow * 10}px rgba(186,155,68,${uczfGlow * 0.35})`,
              }}
              title=""
            >
              ⏳
            </div>
          )}
        </div>

        {/* ═══ BRIDGE SPINE ═══ */}
        <div
          style={{
            width: 3,
            background: `linear-gradient(180deg, rgba(120,115,105,0.08), ${attractorColor}, rgba(120,115,105,0.08))`,
            position: "relative",
            flexShrink: 0,
          }}
        >
          {/* Coupling indicators */}
          {[0.15, 0.3, 0.5, 0.7, 0.88].map((pos, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `${pos * 100}%`,
                left: -3,
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: scrub >= pos * 100 ? "rgba(120,115,105,0.35)" : "rgba(120,115,105,0.08)",
                transition: "background 1s ease",
              }}
            />
          ))}
        </div>

        {/* ═══ REENTRY PANEL (Right) ═══ */}
        <div
          style={{
            flex: 1,
            background: "rgba(225,228,232,0.4)",
            padding: "20px 22px",
            borderRadius: "0 2px 2px 0",
            position: "relative",
            filter: sp === "SP3" ? "saturate(0.2) brightness(0.96)" : `saturate(${1 - desaturation / 150})`,
            transition: "filter 2s ease",
            overflow: "hidden",
          }}
          onMouseEnter={() => setHoveredConstraint("reentry")}
          onMouseLeave={() => setHoveredConstraint(null)}
        >
          {/* Panel label */}
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.15em",
              color: "#8a8e95",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            United States, 2002 — 2024
          </div>

          <h2
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 17,
              fontWeight: 400,
              marginBottom: 14,
              color: "#3a3e45",
              letterSpacing: "0.02em",
              opacity: isPiton && sp !== "SP5" ? 0.55 : 1,
              transition: "opacity 1.5s ease",
            }}
          >
            {realContent.title}
          </h2>

          {/* C1 highlight zone */}
          <ConstraintHighlight type="snare" active={hoveredConstraint === "literary" || hoveredConstraint === "c1"}>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: snareIntensity > 0.7 ? "#a06040" : "#7a7e85",
                marginBottom: 10,
                transition: "color 1s ease",
              }}
            >
              {realContent.c1Note}
            </div>
          </ConstraintHighlight>

          {/* Main excerpt */}
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              lineHeight: 1.75,
              color: "#3a3e45",
              marginBottom: 16,
              opacity: sp === "SP3" ? 0.5 : isTerminal ? 0.55 : 1,
              transition: "opacity 2s ease",
              fontWeight: 300,
            }}
          >
            {realContent.excerpt}
          </div>

          {/* C3 highlight zone */}
          <ConstraintHighlight type={isPiton ? "piton" : "rope"} active={hoveredConstraint === "literary" || hoveredConstraint === "c3"}>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: isPiton ? "#8a8e95" : "#5a7a5a",
                marginBottom: 10,
                textDecoration: isPiton ? "line-through" : "none",
                opacity: isPiton ? 0.4 : 0.8,
                transition: "all 1.5s ease",
              }}
            >
              {realContent.c3Note}
            </div>
          </ConstraintHighlight>

          {/* Metrics — with hysteresis */}
          {metrics && (
            <div style={{ marginTop: 12 }}>
              <MetricBar
                label="Employment Pathways"
                value={metrics.employment}
                ghosted={isPiton && metrics.employment < 30}
                hysteresisNote={hysteresisActive && sp === "SP1" ? SYSTEM_MESSAGES.hysteresis : null}
              />
              <MetricBar
                label="Housing Access"
                value={metrics.housing}
                ghosted={isPiton && metrics.housing < 20}
                hysteresisNote={hysteresisActive && sp === "SP1" ? SYSTEM_MESSAGES.hysteresis : null}
              />
              <MetricBar
                label="Social Network"
                value={metrics.socialNet}
                ghosted={isPiton && metrics.socialNet < 15}
              />
              <MetricBar
                label="Reintegration Potential"
                value={metrics.reintegration}
                ghosted={isPiton && metrics.reintegration < 20}
                betrayed={state.uczF.visible && metrics.reintegration > 50}
              />
            </div>
          )}

          {/* Mood text — institutional voice */}
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontStyle: "italic",
              fontSize: 11,
              lineHeight: 1.7,
              color: "#6a6e75",
              borderTop: "1px solid rgba(100,105,115,0.12)",
              paddingTop: 12,
              marginTop: 12,
              fontWeight: 300,
            }}
          >
            {realContent.mood}
          </div>

          {/* UCZ-F echo — persistent on this side too */}
          {state.uczF.visible && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: `rgba(186,155,68,${0.1 + uczfGlow * 0.2})`,
                border: "1px solid rgba(186,155,68,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                transition: "background 0.5s ease",
                boxShadow: `0 0 ${8 + uczfGlow * 8}px rgba(186,155,68,${uczfGlow * 0.25})`,
              }}
            >
              ⏳
            </div>
          )}
        </div>
      </div>

      {/* ─── OMEGA VARIABLES ─── */}
      {scrub > 60 && (
        <div
          style={{
            padding: "24px 28px",
            opacity: Math.min(1, (scrub - 60) / 20),
            transition: "opacity 1s ease",
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.15em",
              color: "#a09a8e",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Where the bones do not align
          </div>
          {OMEGA_TEXTS.map((text, i) => (
            <OmegaCard
              key={i}
              text={text}
              revealed={state.system.omegaRevealed[i]}
              onProbe={() => dispatch("revealOmega", i)}
            />
          ))}
        </div>
      )}

      {/* ─── TRANSFORMATION RULE STATUS (subtle, archival) ─── */}
      <div style={{ padding: "16px 28px 32px", display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { key: "TR1", label: "Escape threshold", fired: state.transformationRules.TR1.fired },
          { key: "TR2", label: "Social contract obsolescence", fired: state.transformationRules.TR2.fired },
          { key: "TR3", label: "Index mismatch", fired: state.transformationRules.TR3.fired },
          { key: "TR4", label: "Misalignment as mobility", fired: state.transformationRules.TR4.fired },
        ].map((tr) => (
          <div
            key={tr.key}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.05em",
              color: tr.fired ? "#5a554a" : "#c0bab0",
              transition: "color 1.5s ease",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: tr.fired ? "#8a7a5a" : "rgba(120,115,105,0.15)",
                transition: "background 1.5s ease",
              }}
            />
            {tr.label}
          </div>
        ))}
      </div>

      {/* ─── ATTRACTOR CONVERGENCE INDICATOR ─── */}
      {state.system.attractorProximity > 0.5 && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: "#8a8578",
            letterSpacing: "0.08em",
            opacity: Math.min(1, (state.system.attractorProximity - 0.5) * 2),
            transition: "opacity 2s ease",
            zIndex: 50,
            background: "rgba(245,240,232,0.9)",
            padding: "6px 14px",
            borderRadius: 2,
          }}
        >
          {isTerminal
            ? "Both stories have ended. The question remains open."
            : `convergence: ${(state.system.attractorProximity * 100).toFixed(0)}%`}
        </div>
      )}
    </div>
  );
}
