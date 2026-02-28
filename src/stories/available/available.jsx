import { useReducer, useEffect, useState } from "react";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

const INDEX_MODIFIERS = {
  miller: { power: -0.5, scale: 1.5, position: 0.8 },
  onlooker: { power: 0.8, scale: -0.2, position: 0.8 },
};

function computeChi(epsilon, indexPosition, agencyLevel) {
  const mod = INDEX_MODIFIERS[indexPosition] || INDEX_MODIFIERS.miller;
  // Chi rises as agency drops (for miller), stays low for onlooker
  const base = epsilon * mod.scale * mod.position;
  const agencyEffect = indexPosition === "miller" ? (1 - agencyLevel) * 0.3 : 0;
  return Math.max(-1, Math.min(1, base + agencyEffect));
}

// ============================================================================
// INITIAL STATE
// ============================================================================

function createInitialState() {
  return {
    constraints: {
      C1: {
        value: 0.0,
        epsilon: 0.8,
        chi: null, // derived per-render, not stored
        support: 0.4,
        type: "snare",
        phase: "pre_TR2",
        ucz: {
          mechanism: "index_dependent",
          params: {
            advicePool: ["both_walk", "miller_rides", "son_rides", "both_ride", "carry_ass"],
            previousAdvice: [],
            contradictionRequired: true,
          },
        },
      },
    },
    transformationRules: {
      TR1: { id: "compliance_escalation", fired: 0, progress: 0.0, threshold: 1.0, reversible: false, lastFired: null },
      TR2: { id: "terminal_extraction", fired: false, progress: 0.0, threshold: 0.2, reversible: false, lastFired: null },
      TR3: { id: "onlooker_refresh", fired: 0, progress: 0.0, threshold: 1.0, reversible: true, lastFired: null },
    },
    couplings: {
      C1_1: { id: "advice_to_compliance", source: "onlookers.advice", target: "miller.action", strength: 0.9, direction: "unidirectional", active: true, fireCount: 0 },
      C1_2: { id: "compliance_to_confusion", source: "miller.action", target: "miller.confusion", strength: 0.7, direction: "unidirectional", active: true, fireCount: 0 },
      C1_3: { id: "confusion_to_agency", source: "miller.confusion", target: "miller.agency", strength: 0.8, direction: "unidirectional", active: true, fireCount: 0 },
      C1_4: { id: "agency_to_property", source: "miller.agency", target: "miller.property", strength: 1.0, direction: "unidirectional", active: false, fireCount: 0 },
      C1_5: { id: "location_to_advice", source: "miller.location", target: "onlookers.advice", strength: 1.0, direction: "unidirectional", active: true, fireCount: 0 },
    },
    system: {
      attractorProximity: 0.0,
      hysteresisFlags: {
        perspective_shift_occurred: false,
        onlooker_view_seen: false,
        bridge_activated: false,
        structural_view_accessed: false,
      },
      terminalReached: false,
      cycleCount: 0,
      startTime: Date.now(),
      currentIndex: "miller",
    },
    agents: {
      miller: { agency: 1.0, confusion: 0.0, property: 1.0, dignity: 1.0, location: "start", action: null, actionHistory: [] },
      son: { agency: 0.0, dignity: 1.0, visible: true },
      onlookers: { currentAdvice: null, previousAdvice: [], satisfaction: 0.0, groupId: 0, groupSize: 3 },
      user: { anxiety: 0.0, control: 1.0, reputation: 1.0, access: 1.0, postCount: 0, engagement: 0.0, commentHistory: [] },
    },
  };
}

// ============================================================================
// UCZ GENERATORS
// ============================================================================

function adviceGenerator(previousAdvice, advicePool) {
  const available = advicePool.filter((x) => x !== previousAdvice);
  return available[Math.floor(Math.random() * available.length)];
}

function agencyDepletionRate() {
  return 0.2 + (Math.random() * 2 - 1) * 0.05;
}

// ============================================================================
// DEEP CLONE HELPER
// ============================================================================

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================================
// PURE REDUCER
// ============================================================================

function constraintReducer(state, action) {
  switch (action.type) {
    case "COMPLY": {
      if (state.system.terminalReached) return state;
      if (state.agents.miller.agency <= 0.2) return state;

      const next = deepClone(state);
      const depletionRate = agencyDepletionRate();

      // Coupling chain: advice → compliance → confusion → agency loss
      next.agents.miller.agency = Math.max(0, next.agents.miller.agency - depletionRate);
      next.agents.miller.confusion = next.agents.miller.confusion + 0.3;
      next.agents.miller.dignity = Math.max(0, next.agents.miller.dignity - 0.1);
      next.agents.miller.action = next.agents.onlookers.currentAdvice;
      next.agents.miller.actionHistory.push(next.agents.onlookers.currentAdvice || "comply");

      next.agents.onlookers.satisfaction = Math.min(1, next.agents.onlookers.satisfaction + 0.1);
      next.agents.onlookers.previousAdvice.push(next.agents.onlookers.currentAdvice || "");

      next.agents.user.control = Math.max(0, next.agents.user.control - depletionRate);
      next.agents.user.anxiety = next.agents.user.anxiety + 0.3;
      next.agents.user.reputation = Math.max(0, next.agents.user.reputation - 0.1);
      next.agents.user.engagement = Math.min(1, next.agents.user.engagement + 0.1);
      next.agents.user.commentHistory.push(next.agents.onlookers.currentAdvice || "feedback");

      // TR1: Compliance escalation counter
      next.transformationRules.TR1.fired = next.transformationRules.TR1.fired + 1;
      next.transformationRules.TR1.lastFired = Date.now();

      // Coupling fire counts
      next.couplings.C1_1.fireCount += 1;
      next.couplings.C1_2.fireCount += 1;
      next.couplings.C1_3.fireCount += 1;

      next.system.cycleCount += 1;
      next.system.attractorProximity = 1 - next.agents.miller.agency;

      // Update constraint value to reflect degradation
      next.constraints.C1.value = next.system.attractorProximity;

      // TR2: Terminal extraction check
      if (next.agents.miller.agency <= 0.2) {
        next.agents.miller.property = 0;
        next.agents.miller.dignity = 0;
        next.agents.miller.agency = 0;
        next.agents.user.access = 0;
        next.agents.user.reputation = 0;
        next.agents.user.control = 0;
        next.system.terminalReached = true;
        next.constraints.C1.phase = "terminal";
        next.transformationRules.TR2.fired = true;
        next.transformationRules.TR2.lastFired = Date.now();
        next.couplings.C1_4.active = true;
        next.couplings.C1_4.fireCount = 1;
      }

      // Auto-refresh onlookers for next cycle
      if (!next.system.terminalReached) {
        next.agents.onlookers.currentAdvice = adviceGenerator(
          next.agents.onlookers.currentAdvice,
          next.constraints.C1.ucz.params.advicePool
        );
        next.agents.onlookers.groupId += 1;
        next.agents.onlookers.groupSize = Math.floor(Math.random() * 4) + 2;
        next.agents.user.postCount += 1;
        next.transformationRules.TR3.fired = next.transformationRules.TR3.fired + 1;
        next.couplings.C1_5.fireCount += 1;
      }

      return next;
    }

    case "RESIST": {
      if (state.system.terminalReached) return state;
      if (state.agents.miller.agency <= 0.5) return state;

      const next = deepClone(state);

      // Resistance costs MORE — the snare tightens
      next.agents.miller.agency = Math.max(0, next.agents.miller.agency - 0.3);
      next.agents.miller.confusion = next.agents.miller.confusion + 0.5;
      next.agents.miller.dignity = Math.max(0, next.agents.miller.dignity - 0.2);
      next.agents.miller.actionHistory.push("resist");

      next.agents.onlookers.satisfaction = Math.min(1, next.agents.onlookers.satisfaction + 0.2);
      next.agents.onlookers.groupSize = next.agents.onlookers.groupSize * 2;

      next.agents.user.control = Math.max(0, next.agents.user.control - 0.3);
      next.agents.user.anxiety = next.agents.user.anxiety + 0.5;
      next.agents.user.reputation = Math.max(0, next.agents.user.reputation - 0.2);
      next.agents.user.engagement = Math.min(1, next.agents.user.engagement + 0.2);

      next.system.cycleCount += 1;
      next.system.attractorProximity = 1 - next.agents.miller.agency;
      next.constraints.C1.value = next.system.attractorProximity;

      // TR2 check
      if (next.agents.miller.agency <= 0.2) {
        next.agents.miller.property = 0;
        next.agents.miller.dignity = 0;
        next.agents.miller.agency = 0;
        next.agents.user.access = 0;
        next.agents.user.reputation = 0;
        next.agents.user.control = 0;
        next.system.terminalReached = true;
        next.constraints.C1.phase = "terminal";
        next.transformationRules.TR2.fired = true;
      }

      // Refresh onlookers even on resist
      if (!next.system.terminalReached) {
        next.agents.onlookers.currentAdvice = adviceGenerator(
          next.agents.onlookers.currentAdvice,
          next.constraints.C1.ucz.params.advicePool
        );
        next.agents.onlookers.groupId += 1;
        next.agents.user.postCount += 1;
      }

      return next;
    }

    case "SWITCH_INDEX": {
      const next = deepClone(state);
      const newIndex = next.system.currentIndex === "miller" ? "onlooker" : "miller";
      next.system.currentIndex = newIndex;
      next.system.hysteresisFlags.perspective_shift_occurred = true;
      if (newIndex === "onlooker") {
        next.system.hysteresisFlags.onlooker_view_seen = true;
      }
      return next;
    }

    case "ACTIVATE_BRIDGE": {
      const next = deepClone(state);
      next.system.hysteresisFlags.bridge_activated = true;
      next.system.hysteresisFlags.structural_view_accessed = true;
      return next;
    }

    case "REFRESH_ONLOOKERS": {
      if (state.system.terminalReached) return state;
      const next = deepClone(state);
      next.agents.onlookers.currentAdvice = adviceGenerator(
        next.agents.onlookers.currentAdvice,
        next.constraints.C1.ucz.params.advicePool
      );
      next.agents.onlookers.groupId += 1;
      next.agents.onlookers.groupSize = Math.floor(Math.random() * 4) + 2;
      next.agents.miller.location = `location_${next.system.cycleCount + 1}`;
      next.agents.user.postCount += 1;
      next.transformationRules.TR3.fired = next.transformationRules.TR3.fired + 1;
      return next;
    }

    case "RESTART": {
      return createInitialState();
    }

    default:
      return state;
  }
}

// ============================================================================
// INDEX VIEW DERIVATION
// ============================================================================

function deriveIndexView(state, indexPosition) {
  const { agents, system, constraints } = state;
  const chi = computeChi(constraints.C1.epsilon, indexPosition, agents.miller.agency);

  if (indexPosition === "miller") {
    const latency = 200 + agents.miller.confusion * 600;
    const opacity = 1.0 - agents.miller.confusion * 0.3;
    const viewportScale = Math.max(0.6, agents.miller.agency);

    return {
      chi,
      metrics: {
        agency: {
          value: agents.miller.agency,
          label: "Control",
          color: agents.miller.agency > 0.5 ? "#10b981" : "#ef4444",
          visible: true,
          ghostValue: system.hysteresisFlags.perspective_shift_occurred ? agents.onlookers.satisfaction : null,
          ghostLabel: system.hysteresisFlags.perspective_shift_occurred ? "(Their Engagement)" : null,
        },
        confusion: {
          value: agents.miller.confusion,
          label: "Anxiety",
          color: "#f59e0b",
          visible: true,
          couplingVisible: system.hysteresisFlags.bridge_activated,
        },
        property: {
          value: agents.miller.property,
          label: agents.miller.property === 1 ? "Account Active" : "Account Suspended",
          color: agents.miller.property === 1 ? "#10b981" : "#ef4444",
          visible: true,
        },
        dignity: {
          value: agents.miller.dignity,
          label: "Reputation",
          color: agents.miller.dignity > 0.5 ? "#3b82f6" : "#6b7280",
          visible: true,
        },
      },
      interfaceFeel: { latency, opacity, viewportScale },
      availableActions: [
        {
          id: "comply",
          label: "Accept Feedback",
          enabled: agents.miller.agency > 0.2 && !system.terminalReached,
          cost: "Anxiety +30%, Control -20%",
          costAddendum: system.hysteresisFlags.perspective_shift_occurred ? " (Increases their engagement by 10%)" : "",
        },
        {
          id: "resist",
          label: "Ignore Comments",
          enabled: agents.miller.agency > 0.5 && !system.terminalReached,
          cost: "Anxiety +50%, Onlookers multiply",
        },
      ],
      narrativeFrame: "You are trying to satisfy everyone.",
      experiencedType: "inescapable_trap",
    };
  } else {
    return {
      chi,
      metrics: {
        satisfaction: {
          value: agents.onlookers.satisfaction,
          label: "Engagement",
          color: "#a855f7",
          visible: true,
          couplingVisible: system.hysteresisFlags.bridge_activated,
        },
        influence: {
          value: Math.min(1, system.cycleCount / 6),
          label: "Impact",
          color: "#3b82f6",
          visible: true,
        },
        entertainment: {
          value: Math.min(1, agents.miller.confusion * 0.5),
          label: "Thread Quality",
          color: "#10b981",
          visible: true,
        },
      },
      interfaceFeel: { latency: 100, opacity: 1.0, viewportScale: 1.2 },
      availableActions: [
        { id: "advise", label: "Leave Comment", enabled: !system.terminalReached, cost: "None" },
        { id: "move_on", label: "Next Thread", enabled: !system.terminalReached, cost: "None" },
      ],
      narrativeFrame: "You are helping correct bad behavior.",
      experiencedType: "coordination_tool",
    };
  }
}

// ============================================================================
// ADVICE DISPLAY
// ============================================================================

const adviceDisplay = {
  both_walk: { fable: "Make him walk, young lazybones!", social: "Why are you so entitled? Walk like everyone else." },
  miller_rides: { fable: "What a selfish old man, making the boy walk!", social: "This is exactly what's wrong with your generation." },
  son_rides: { fable: "How disrespectful to make your father walk!", social: "Show some respect. This is embarrassing." },
  both_ride: { fable: "Aren't you ashamed? You're crushing that poor animal!", social: "This is cruel and unnecessary. Do better." },
  carry_ass: { fable: "Did you ever see such a pair of fools?", social: "This is the most ridiculous thing I've ever seen." },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ParallelResonance() {
  const [state, dispatch] = useReducer(constraintReducer, null, createInitialState);
  const [showHistory, setShowHistory] = useState(false);

  const currentView = deriveIndexView(state, state.system.currentIndex);

  // Initialize first piece of advice
  useEffect(() => {
    if (state.agents.onlookers.currentAdvice === null && !state.system.terminalReached) {
      dispatch({ type: "REFRESH_ONLOOKERS" });
    }
  }, []);

  const handleComply = () => dispatch({ type: "COMPLY" });
  const handleResist = () => dispatch({ type: "RESIST" });
  const handleSwitchPerspective = () => dispatch({ type: "SWITCH_INDEX" });
  const handleActivateBridge = () => dispatch({ type: "ACTIVATE_BRIDGE" });
  const handleRestart = () => { dispatch({ type: "RESTART" }); setShowHistory(false); };

  const currentAdviceDisplay = state.agents.onlookers.currentAdvice
    ? adviceDisplay[state.agents.onlookers.currentAdvice]
    : null;

  const isMiller = state.system.currentIndex === "miller";
  const chi = currentView.chi;

  // Chi-driven palette
  const panelBg = chi > 0.5
    ? `linear-gradient(to bottom, #1f2937, #1a1015)`
    : `linear-gradient(to bottom, #1f2937, #111827)`;
  const accentColor = chi > 0.5 ? "#ef4444" : "#a855f7";

  // ── TERMINAL STATE ──
  if (state.system.terminalReached) {
    return (
      <div style={{
        minHeight: "100vh",
        background: panelBg,
        color: "#f3f4f6",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "2rem",
      }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {isMiller ? (
            <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
              <div style={{ fontSize: "3rem", fontWeight: "bold", marginBottom: "2rem", color: "#ef4444" }}>
                Account Suspended
              </div>
              <div style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#9ca3af" }}>
                You tried to satisfy everyone.
              </div>
              <div style={{ fontSize: "1.25rem", marginBottom: "3rem", color: "#6b7280" }}>
                You satisfied no one.
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
              <div style={{ fontSize: "3rem", fontWeight: "bold", marginBottom: "2rem", color: "#a855f7" }}>
                Thread Archived
              </div>
              <div style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#9ca3af" }}>
                The user has been suspended.
              </div>
              <div style={{ fontSize: "1.25rem", marginBottom: "3rem", color: "#6b7280" }}>
                Engagement metrics were excellent.
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <TerminalButton label="Start Over" color="#3b82f6" hoverColor="#2563eb" onClick={handleRestart} />
            <TerminalButton label={showHistory ? "Hide History" : "See What Happened"} color="#6b7280" hoverColor="#4b5563" onClick={() => setShowHistory(!showHistory)} />
            <TerminalButton label="See Their View" color="#a855f7" hoverColor="#9333ea" onClick={handleSwitchPerspective} />
            <TerminalButton label="See the Pattern" color="#f59e0b" hoverColor="#d97706" onClick={handleActivateBridge} />
          </div>

          {showHistory && (
            <div style={{ marginTop: "2rem", padding: "2rem", background: "#374151", borderRadius: "0.5rem", textAlign: "left" }}>
              <div style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "1rem" }}>Action History</div>
              {state.agents.miller.actionHistory.map((action, i) => {
                const display = adviceDisplay[action];
                return (
                  <div key={i} style={{ padding: "0.5rem 0", borderBottom: "1px solid #4b5563", fontSize: "0.875rem" }}>
                    <span style={{ color: "#9ca3af" }}>#{i + 1}</span>{" "}
                    <span style={{ color: action === "resist" ? "#ef4444" : "#3b82f6" }}>
                      {action === "resist" ? "Resisted" : "Complied"}
                    </span>
                    {display && (
                      <span style={{ color: "#6b7280", fontStyle: "italic" }}> — "{isMiller ? display.social : display.fable}"</span>
                    )}
                  </div>
                );
              })}
              <div style={{ marginTop: "1rem", padding: "1rem", background: "#1f2937", borderRadius: "0.25rem", fontSize: "0.875rem", color: "#9ca3af" }}>
                Cycles: {state.system.cycleCount} • Final agency: {Math.round(state.agents.miller.agency * 100)}% •
                Coupling fires: {state.couplings.C1_1.fireCount}
              </div>
            </div>
          )}

          {state.system.hysteresisFlags.bridge_activated && (
            <div style={{ marginTop: "2rem", padding: "2rem", background: "#1f2937", borderRadius: "0.5rem", border: "1px solid #f59e0b", textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#f59e0b", marginBottom: "1rem" }}>
                SAME CONSTRAINT
              </div>
              <div style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "1rem" }}>
                One side experienced an inescapable trap. The other experienced a coordination tool.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", maxWidth: "500px", margin: "0 auto" }}>
                <div style={{ padding: "1rem", background: "#374151", borderRadius: "0.25rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#ef4444", marginBottom: "0.25rem" }}>Miller / User</div>
                  <div style={{ fontSize: "0.875rem" }}>χ = {computeChi(state.constraints.C1.epsilon, "miller", state.agents.miller.agency).toFixed(2)}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Experienced as: trap</div>
                </div>
                <div style={{ padding: "1rem", background: "#374151", borderRadius: "0.25rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#a855f7", marginBottom: "0.25rem" }}>Onlooker / Commenter</div>
                  <div style={{ fontSize: "0.875rem" }}>χ = {computeChi(state.constraints.C1.epsilon, "onlooker", state.agents.miller.agency).toFixed(2)}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Experienced as: tool</div>
                </div>
              </div>
              <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#6b7280" }}>
                Coupling fires — Advice→Compliance: {state.couplings.C1_1.fireCount} •
                Compliance→Anxiety: {state.couplings.C1_2.fireCount} •
                Anxiety→Agency: {state.couplings.C1_3.fireCount}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ACTIVE STATE ──
  return (
    <div style={{
      minHeight: "100vh",
      background: panelBg,
      color: "#f3f4f6",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "2rem",
      transition: "background 1s ease",
    }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{
            fontSize: "2rem",
            fontWeight: "bold",
            marginBottom: "0.5rem",
            color: accentColor,
            transition: "color 0.5s",
          }}>
            {isMiller ? "Available" : "Engaging"}
          </h1>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            {isMiller ? "A social media experience" : "A community moderation tool"}
          </div>
        </div>

        {/* Perspective switch */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <button
            onClick={handleSwitchPerspective}
            style={{
              padding: "0.5rem 1.5rem",
              fontSize: "0.875rem",
              background: "transparent",
              color: "#9ca3af",
              border: "1px solid #4b5563",
              borderRadius: "0.25rem",
              cursor: "pointer",
            }}
          >
            {isMiller ? "Switch to Commenter View" : "Switch to User View"}
          </button>
          {state.system.cycleCount >= 2 && !state.system.hysteresisFlags.bridge_activated && (
            <button
              onClick={handleActivateBridge}
              style={{
                padding: "0.5rem 1.5rem",
                fontSize: "0.875rem",
                background: "transparent",
                color: "#f59e0b",
                border: "1px solid #f59e0b",
                borderRadius: "0.25rem",
                cursor: "pointer",
                marginLeft: "1rem",
              }}
            >
              See the Pattern
            </button>
          )}
        </div>

        {/* Main layout */}
        <div style={{
          display: "grid",
          gridTemplateColumns: state.system.hysteresisFlags.bridge_activated ? "1fr auto 1fr" : "1fr 1fr",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}>
          {/* Metrics panel */}
          <div style={{
            background: "#374151",
            padding: "1.5rem",
            borderRadius: "0.5rem",
            transform: `scale(${currentView.interfaceFeel.viewportScale})`,
            transition: `transform 0.5s, opacity ${currentView.interfaceFeel.latency}ms`,
            transformOrigin: "top left",
            opacity: currentView.interfaceFeel.opacity,
          }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: accentColor }}>
              {isMiller ? "Your Dashboard" : "Moderation Metrics"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {Object.values(currentView.metrics).filter((m) => m.visible).map((metric, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                    <span style={{ color: "#9ca3af" }}>{metric.label}</span>
                    <span style={{ color: metric.color, fontWeight: "bold" }}>
                      {typeof metric.value === "number" ? `${Math.round(Math.min(1, metric.value) * 100)}%` : metric.value}
                    </span>
                  </div>
                  <div style={{ height: "4px", background: "#1f2937", borderRadius: "2px" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, Math.round(metric.value * 100))}%`,
                      background: metric.color,
                      borderRadius: "2px",
                      transition: `width ${currentView.interfaceFeel.latency}ms ease`,
                    }} />
                  </div>
                  {metric.ghostValue != null && (
                    <div style={{ fontSize: "0.75rem", color: "#f59e0b", marginTop: "0.25rem", fontStyle: "italic" }}>
                      {metric.ghostLabel}: {Math.round(metric.ghostValue * 100)}%
                    </div>
                  )}
                  {metric.couplingVisible && (
                    <div style={{
                      position: "absolute",
                      top: "0.5rem",
                      right: "0.5rem",
                      width: "10px",
                      height: "10px",
                      background: "#f59e0b",
                      borderRadius: "50%",
                      animation: "pulse 2s infinite",
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bridge column */}
          {state.system.hysteresisFlags.bridge_activated && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
              background: "#1f2937",
              borderRadius: "0.5rem",
              borderLeft: "2px solid #f59e0b",
              borderRight: "2px solid #f59e0b",
              minWidth: "160px",
            }}>
              <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#f59e0b", textAlign: "center", marginBottom: "1rem" }}>
                SAME<br />CONSTRAINT
              </div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", textAlign: "center", marginBottom: "1rem" }}>
                Different indices,<br />different experiences
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                <div>χ(miller) = {computeChi(state.constraints.C1.epsilon, "miller", state.agents.miller.agency).toFixed(2)}</div>
                <div>χ(onlooker) = {computeChi(state.constraints.C1.epsilon, "onlooker", state.agents.miller.agency).toFixed(2)}</div>
              </div>
              <div style={{ marginTop: "1rem", fontSize: "0.625rem", color: "#4b5563", textAlign: "center" }}>
                Fires: {state.couplings.C1_1.fireCount}×
              </div>
            </div>
          )}

          {/* Narrative panel */}
          <div style={{
            background: "#374151",
            padding: "1.5rem",
            borderRadius: "0.5rem",
            transform: `scale(${currentView.interfaceFeel.viewportScale})`,
            transition: `transform 0.5s`,
            transformOrigin: "top right",
          }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: accentColor }}>
              {isMiller ? "The Timeline" : "The Feed"}
            </h2>
            <p style={{ fontSize: "1rem", lineHeight: 1.75, marginBottom: "1rem" }}>
              {isMiller
                ? "You've posted content online. The comments are pouring in, each with different expectations about what you should do."
                : "A user has posted something that needs correction. The community is responding with helpful feedback."}
            </p>
            {currentAdviceDisplay && (
              <div style={{
                padding: "1rem",
                background: "#4b5563",
                borderRadius: "0.25rem",
                borderLeft: `4px solid ${accentColor}`,
                marginBottom: "1rem",
              }}>
                <div style={{ fontWeight: "bold", marginBottom: "0.5rem", color: accentColor, fontSize: "0.875rem" }}>
                  {isMiller ? `Comment thread #${state.agents.user.postCount + 1}:` : `Thread #${state.agents.user.postCount + 1}:`}
                </div>
                <div style={{ fontSize: "1rem", fontStyle: "italic" }}>
                  "{isMiller ? currentAdviceDisplay.social : currentAdviceDisplay.fable}"
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {isMiller ? (
                <>
                  <StatBox label="Control" value={`${Math.round(state.agents.user.control * 100)}%`} color={state.agents.user.control > 0.5 ? "#10b981" : "#ef4444"} />
                  <StatBox label="Anxiety" value={`${Math.round(state.agents.user.anxiety * 100)}%`} color="#f59e0b" />
                  <StatBox label="Status" value={state.agents.user.access === 1 ? "Active" : "Suspended"} color={state.agents.user.access === 1 ? "#10b981" : "#ef4444"} />
                  <StatBox label="Reputation" value={`${Math.round(state.agents.user.reputation * 100)}%`} color={state.agents.user.reputation > 0.5 ? "#3b82f6" : "#6b7280"} />
                </>
              ) : (
                <>
                  <StatBox label="Engagement" value={`${Math.round(state.agents.user.engagement * 100)}%`} color="#a855f7" />
                  <StatBox label="Reach" value={`${state.agents.user.commentHistory.length}`} color="#3b82f6" />
                  <StatBox label="Thread Quality" value={"★".repeat(Math.min(5, Math.max(1, Math.ceil(state.agents.user.anxiety * 5))))} color="#10b981" />
                  <StatBox label="Community Health" value="Excellent" color="#10b981" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div style={{
          background: "#374151",
          padding: "1.5rem",
          borderRadius: "0.5rem",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1rem", marginBottom: "1rem", color: "#d1d5db" }}>
            {currentView.narrativeFrame}
          </div>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            {currentView.availableActions.map((action) => (
              <button
                key={action.id}
                onClick={
                  action.id === "comply" || action.id === "advise" ? handleComply
                  : action.id === "resist" ? handleResist
                  : action.id === "move_on" ? () => dispatch({ type: "REFRESH_ONLOOKERS" })
                  : undefined
                }
                disabled={!action.enabled}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  background: action.enabled ? (action.id === "resist" ? "#ef4444" : "#3b82f6") : "#4b5563",
                  color: action.enabled ? "white" : "#9ca3af",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: action.enabled ? "pointer" : "not-allowed",
                  transition: `all ${currentView.interfaceFeel.latency}ms`,
                  opacity: currentView.interfaceFeel.opacity,
                }}
                title={action.enabled ? `${action.cost}${action.costAddendum || ""}` : undefined}
              >
                {action.label}
              </button>
            ))}
          </div>
          {state.system.cycleCount > 0 && (
            <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#6b7280" }}>
              Cycle {state.system.cycleCount} • Attractor proximity: {Math.round(state.system.attractorProximity * 100)}%
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

function StatBox({ label, value, color }) {
  return (
    <div style={{ padding: "0.75rem", background: "#4b5563", borderRadius: "0.25rem" }}>
      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.25rem" }}>{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

function TerminalButton({ label, color, hoverColor, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: "1rem 2rem", fontSize: "1rem", background: color, color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = hoverColor)}
      onMouseLeave={(e) => (e.currentTarget.style.background = color)}
    >
      {label}
    </button>
  );
}
