import { useState, useEffect } from "react";

// ============================================================================
// CONSTRAINT ENGINE - Pure State Management
// ============================================================================

interface UCZParams {
  memoryIntensity?: number;
  contrastAmplification?: number;
  attractorStrength?: number;
  louiseThreshold?: number;
  sensitivity?: number;
  currentBurden?: number;
  emotionalState?: string;
}

interface UCZ {
  mechanism: string;
  params: UCZParams;
}

interface Constraint {
  value: number;
  epsilon: number;
  support: number;
  type: string;
  phase: string;
  ucz: UCZ | null;
}

interface TransformationRule {
  fired: boolean;
  progress: number;
  threshold: number;
  reversible: boolean;
}

interface Coupling {
  source: string;
  target: string;
  strength: number;
  direction: string;
  active: boolean;
}

interface EngineState {
  constraints: {
    C1_athletic_performance: Constraint;
    C2_marital_partnership: Constraint;
    C3_cultural_sphere: Constraint;
  };
  transformationRules: Record<string, TransformationRule>;
  couplings: Record<string, Coupling>;
  system: {
    attractorProximity: number;
    hysteresisFlags: {
      power_inversion_seen: boolean;
      louise_threshold_crossed: boolean;
      memory_attractor_recognized: boolean;
    };
    terminalReached: boolean;
    currentTimestamp: number;
  };
  userState: {
    indexPosition: string;
    explorationsCount: number;
    patternsRecognized: string[];
    advancedModeUnlocked: boolean;
  };
}

class ConstraintEngine {
  state: EngineState;
  listeners: Array<(state: EngineState) => void>;

  constructor() {
    this.state = this.initializeState();
    this.listeners = [];
  }

  initializeState(): EngineState {
    return {
      constraints: {
        C1_athletic_performance: {
          value: 0.0,
          epsilon: 0.55,
          support: 0.8,
          type: "hybrid",
          phase: "pre_TR1.3",
          ucz: {
            mechanism: "temporal",
            params: {
              memoryIntensity: 1.0,
              contrastAmplification: 1.0,
              attractorStrength: 0.0,
            },
          },
        },
        C2_marital_partnership: {
          value: 0.0,
          epsilon: 0.2,
          support: 0.3,
          type: "rope",
          phase: "pre_TR2.1",
          ucz: {
            mechanism: "threshold_chaotic",
            params: {
              louiseThreshold: 0.65,
              sensitivity: 0.05,
              currentBurden: 0.0,
              emotionalState: "engaged_support",
            },
          },
        },
        C3_cultural_sphere: {
          value: 0.0,
          epsilon: 0.4,
          support: 0.6,
          type: "hybrid",
          phase: "pre_TR3.3",
          ucz: null,
        },
      },
      transformationRules: {
        TR1_3_system_exit: { fired: false, progress: 0.0, threshold: 0.8, reversible: false },
        TR2_1_power_inversion: { fired: false, progress: 0.0, threshold: 0.9, reversible: false },
        TR2_2_exit_cost_escalation: { fired: false, progress: 0.0, threshold: 0.7, reversible: false },
        TR2_3_resentment_accumulation: { fired: false, progress: 0.0, threshold: 0.65, reversible: false },
        TR3_3_alienation: { fired: false, progress: 0.0, threshold: 0.6, reversible: false },
      },
      couplings: {
        C1_C2_status_loss: {
          source: "C1_athletic_performance",
          target: "C2_marital_partnership",
          strength: 0.8,
          direction: "unidirectional",
          active: false,
        },
        C2_C3_forced_participation: {
          source: "C2_marital_partnership",
          target: "C3_cultural_sphere",
          strength: 0.6,
          direction: "unidirectional",
          active: false,
        },
        C1_memory_C3_rejection: {
          source: "C1_athletic_performance",
          target: "C3_cultural_sphere",
          strength: 0.5,
          direction: "unidirectional",
          active: false,
        },
      },
      system: {
        attractorProximity: 0.0,
        hysteresisFlags: {
          power_inversion_seen: false,
          louise_threshold_crossed: false,
          memory_attractor_recognized: false,
        },
        terminalReached: false,
        currentTimestamp: 1941,
      },
      userState: {
        indexPosition: "darling_early",
        explorationsCount: 0,
        patternsRecognized: [],
        advancedModeUnlocked: false,
      },
    };
  }

  getState(): EngineState {
    return JSON.parse(JSON.stringify(this.state));
  }

  subscribe(callback: (state: EngineState) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  checkTransformationRules() {
    const { constraints, transformationRules, couplings } = this.state;

    if (!transformationRules.TR1_3_system_exit.fired) {
      if (constraints.C1_athletic_performance.value >= 0.8) {
        this.fireTransformationRule("TR1_3_system_exit");
        constraints.C1_athletic_performance.phase = "post_TR1.3";
        constraints.C1_athletic_performance.type = "snare";
        couplings.C1_C2_status_loss.active = true;
      }
    }

    if (!transformationRules.TR2_1_power_inversion.fired) {
      if (couplings.C1_C2_status_loss.active && constraints.C2_marital_partnership.value >= 0.9) {
        this.fireTransformationRule("TR2_1_power_inversion");
        constraints.C2_marital_partnership.phase = "post_TR2.1";
        constraints.C2_marital_partnership.epsilon = 0.65;
        constraints.C2_marital_partnership.support = 0.7;
        constraints.C2_marital_partnership.type = "snare";
        this.state.system.hysteresisFlags.power_inversion_seen = true;
        couplings.C2_C3_forced_participation.active = true;
      }
    }

    if (!transformationRules.TR2_2_exit_cost_escalation.fired) {
      if (constraints.C2_marital_partnership.value >= 0.7) {
        this.fireTransformationRule("TR2_2_exit_cost_escalation");
      }
    }

    if (!transformationRules.TR2_3_resentment_accumulation.fired) {
      const burden = constraints.C2_marital_partnership.ucz!.params.currentBurden!;
      const threshold = constraints.C2_marital_partnership.ucz!.params.louiseThreshold!;

      if (burden >= threshold) {
        const sensitivity = constraints.C2_marital_partnership.ucz!.params.sensitivity!;
        const noise = (Math.random() * 2 - 1) * sensitivity;

        if (burden + noise > threshold) {
          this.fireTransformationRule("TR2_3_resentment_accumulation");
          constraints.C2_marital_partnership.ucz!.params.emotionalState =
            "patient_kindly_remote_boredom";
          this.state.system.hysteresisFlags.louise_threshold_crossed = true;
        }
      }
    }

    if (!transformationRules.TR3_3_alienation.fired) {
      if (couplings.C2_C3_forced_participation.active && constraints.C3_cultural_sphere.value >= 0.6) {
        this.fireTransformationRule("TR3_3_alienation");
        constraints.C3_cultural_sphere.phase = "post_TR3.3";
        constraints.C3_cultural_sphere.type = "snare";
      }
    }

    if (
      transformationRules.TR1_3_system_exit.fired &&
      transformationRules.TR2_1_power_inversion.fired &&
      transformationRules.TR2_3_resentment_accumulation.fired &&
      transformationRules.TR3_3_alienation.fired
    ) {
      this.state.system.terminalReached = true;
      this.state.system.attractorProximity = 1.0;
    }
  }

  fireTransformationRule(ruleId: string) {
    this.state.transformationRules[ruleId].fired = true;
    this.state.transformationRules[ruleId].progress = 1.0;
  }

  propagateCouplings() {
    const { constraints, couplings } = this.state;

    if (couplings.C1_C2_status_loss.active) {
      const c1Value = constraints.C1_athletic_performance.value;
      const strength = couplings.C1_C2_status_loss.strength;
      constraints.C2_marital_partnership.value += c1Value * strength * 0.01;
      constraints.C2_marital_partnership.value = Math.min(1.0, constraints.C2_marital_partnership.value);
    }

    if (couplings.C2_C3_forced_participation.active) {
      const c2Value = constraints.C2_marital_partnership.value;
      const strength = couplings.C2_C3_forced_participation.strength;
      constraints.C3_cultural_sphere.value += c2Value * strength * 0.01;
      constraints.C3_cultural_sphere.value = Math.min(1.0, constraints.C3_cultural_sphere.value);
    }

    if (couplings.C1_memory_C3_rejection.active) {
      const attractorStrength = constraints.C1_athletic_performance.ucz!.params.attractorStrength!;
      const strength = couplings.C1_memory_C3_rejection.strength;
      if (attractorStrength > 0.5) {
        constraints.C3_cultural_sphere.value += attractorStrength * strength * 0.005;
        constraints.C3_cultural_sphere.value = Math.min(1.0, constraints.C3_cultural_sphere.value);
      }
    }
  }

  updateUCZs(_dt: number) {
    const { constraints, system } = this.state;

    const c1 = constraints.C1_athletic_performance;
    const yearsElapsed = system.currentTimestamp - 1941;
    const currentSatisfaction =
      1.0 - (c1.value + constraints.C2_marital_partnership.value + constraints.C3_cultural_sphere.value) / 3.0;

    const contrastEffect = (1.0 - currentSatisfaction) * 2.0;
    const timeIntensification = 1.0 + yearsElapsed * 0.1;

    c1.ucz!.params.memoryIntensity = timeIntensification * contrastEffect;
    c1.ucz!.params.attractorStrength = Math.min(1.0, c1.ucz!.params.memoryIntensity! * c1.value);

    if (c1.ucz!.params.attractorStrength! > 0.5) {
      this.state.couplings.C1_memory_C3_rejection.active = true;
      this.state.system.hysteresisFlags.memory_attractor_recognized = true;
    }

    const c2 = constraints.C2_marital_partnership;
    const c1Contribution = c1.value * 0.3;
    const c2Contribution = c2.value * 0.5;
    const timeContribution = (system.currentTimestamp - 1941) * 0.01;

    c2.ucz!.params.currentBurden = Math.min(1.0, c1Contribution + c2Contribution + timeContribution);
  }

  tick(dt: number) {
    this.updateUCZs(dt);
    this.propagateCouplings();
    this.checkTransformationRules();
    this.updateAttractorProximity();
    this.notifyListeners();
  }

  updateAttractorProximity() {
    const { constraints, transformationRules } = this.state;

    const rulesFired =
      Object.values(transformationRules).filter((r) => r.fired).length /
      Object.keys(transformationRules).length;

    const avgConstraintValue =
      (constraints.C1_athletic_performance.value +
        constraints.C2_marital_partnership.value +
        constraints.C3_cultural_sphere.value) /
      3.0;

    const memoryAttractor = constraints.C1_athletic_performance.ucz!.params.attractorStrength!;

    this.state.system.attractorProximity = Math.min(
      1.0,
      rulesFired * 0.4 + avgConstraintValue * 0.4 + memoryAttractor * 0.2
    );
  }

  dispatch(action: string, payload: Record<string, any>) {
    switch (action) {
      case "scrubTimeline":
        this.handleTimelineScrub(payload.year);
        break;
      case "switchIndex":
        this.handleIndexSwitch(payload.indexPosition);
        break;
      case "exploreLiterarySegment":
        this.handleLiteraryExploration(payload.segmentId);
        break;
      case "exploreDataPoint":
        this.handleDataExploration(payload.dataId);
        break;
      case "unlockAdvancedMode":
        this.handleAdvancedModeUnlock();
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
    this.notifyListeners();
  }

  handleTimelineScrub(year: number) {
    const { constraints, system } = this.state;
    year = Math.max(1941, Math.min(2024, year));
    system.currentTimestamp = year;

    if (year <= 1956) {
      const storyProgress = (year - 1941) / 15.0;
      constraints.C1_athletic_performance.value = storyProgress;
      constraints.C2_marital_partnership.value = storyProgress * 0.8;
      constraints.C3_cultural_sphere.value = storyProgress * 0.6;
    } else {
      constraints.C1_athletic_performance.value = 1.0;
      constraints.C2_marital_partnership.value = 1.0;
      constraints.C3_cultural_sphere.value = 0.8;
    }

    const dt = year - 1941;
    this.tick(dt);
  }

  handleIndexSwitch(indexPosition: string) {
    if (
      this.state.userState.indexPosition === "darling_late" &&
      this.state.transformationRules.TR2_1_power_inversion.fired
    ) {
      return;
    }
    this.state.userState.indexPosition = indexPosition;
  }

  handleLiteraryExploration(segmentId: string) {
    this.state.userState.explorationsCount++;
    if (!this.state.userState.patternsRecognized.includes(segmentId)) {
      this.state.userState.patternsRecognized.push(segmentId);
    }
    if (this.state.userState.explorationsCount >= 3) {
      this.state.userState.advancedModeUnlocked = true;
    }
  }

  handleDataExploration(dataId: string) {
    this.state.userState.explorationsCount++;
    if (!this.state.userState.patternsRecognized.includes(dataId)) {
      this.state.userState.patternsRecognized.push(dataId);
    }
    if (this.state.userState.explorationsCount >= 3) {
      this.state.userState.advancedModeUnlocked = true;
    }
  }

  handleAdvancedModeUnlock() {
    this.state.userState.advancedModeUnlocked = true;
  }
}

// ============================================================================
// INDEX VIEW DERIVATION
// ============================================================================

const INDEX_MODIFIERS: Record<string, { C1: number; C2: number; C3: number }> = {
  darling_early: { C1: -0.7, C2: -0.2, C3: 0.0 },
  darling_late: { C1: 0.3, C2: 0.58, C3: 0.32 },
  louise_early: { C1: 0.0, C2: -0.2, C3: 0.0 },
  louise_late: { C1: 0.0, C2: 0.35, C3: -0.08 },
  flaherty: { C1: 0.0, C2: 0.0, C3: -0.48 },
};

// FIX: Original had `constraint === 'C1'` comparing object to string — never matched.
// Now takes a separate constraintKey parameter.
function calculateChi(constraint: Constraint, constraintKey: string, indexPosition: string): number {
  const baseEpsilon = constraint.epsilon;
  const modifiers = INDEX_MODIFIERS[indexPosition];
  if (!modifiers) return baseEpsilon;
  const key = constraintKey as "C1" | "C2" | "C3";
  const modifier = modifiers[key] ?? 0;
  return baseEpsilon + modifier;
}

interface InterfaceFeel {
  style: string;
  latency: number;
  friction: number;
  viewport: string;
  colorGradient: string;
}

function getInterfaceFeel(_indexPosition: string, chi: number): InterfaceFeel {
  if (chi < 0.3) {
    return {
      style: "glassy",
      latency: 0,
      friction: 0.1,
      viewport: "expansive",
      colorGradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    };
  } else if (chi < 0.6) {
    return {
      style: "standard",
      latency: 50,
      friction: 0.5,
      viewport: "standard",
      colorGradient: "linear-gradient(135deg, #667eea 0%, #f093fb 50%, #feca57 100%)",
    };
  } else {
    return {
      style: "viscous",
      latency: 150,
      friction: 0.9,
      viewport: "constrained",
      colorGradient: "linear-gradient(135deg, #d31027 0%, #1a1a1a 100%)",
    };
  }
}

// ============================================================================
// LITERARY PANEL
// ============================================================================

const LiteraryPanel = ({
  state,
  onSegmentClick,
}: {
  state: EngineState;
  onSegmentClick: (id: string) => void;
}) => {
  const { currentTimestamp, hysteresisFlags } = state.system;
  const { indexPosition } = state.userState;
  const { C1_athletic_performance, C2_marital_partnership, C3_cultural_sphere } = state.constraints;

  const c1Chi = calculateChi(C1_athletic_performance, "C1", indexPosition);
  const c2Chi = calculateChi(C2_marital_partnership, "C2", indexPosition);
  const c3Chi = calculateChi(C3_cultural_sphere, "C3", indexPosition);

  const avgChi = (c1Chi + c2Chi + c3Chi) / 3.0;
  const feel = getInterfaceFeel(indexPosition, avgChi);

  const segments = [
    {
      id: "eighty_yard_run",
      year: 1941,
      text: `He was running now, cutting back toward the sideline, his shoes drumming loud on the turf, grass and sky and stadium whirling dizzily around him. The first halfback came at him and he fed him his leg, then swung at the last moment, took the shock of the man's shoulder without breaking stride, ran right through him, his cleats biting securely into the turf. There was only the safety man now, coming warily at him, his arms crooked, hands spread. Christian feinted with his leg, then cut back sharply, and the safety man was left diving at the empty air. Christian ran, the ball cradled in his arms, ran toward the goal line fifty yards away, the crowd roaring, his teammates' voices lost in the general uproar, ran easily, feeling the wind against his face, feeling the exhilaration of the perfect play, the perfect moment.`,
      constraintMapping: "C1",
      visible: currentTimestamp >= 1941,
    },
    {
      id: "fifteen_years_later",
      year: 1956,
      text: `Fifteen years. Married, getting a little fat, standing on the fringe of other people's conversations, thinking about the run he had made one autumn afternoon when he was twenty years old. Everything since had been a decline.`,
      constraintMapping: "C1",
      visible: currentTimestamp >= 1956,
    },
    {
      id: "louise_working",
      year: 1948,
      text: `Louise was working now, editing manuscripts for a publisher. She came home tired every evening, her face drawn, and Christian would have dinner ready, the apartment cleaned. He tried to make himself useful, tried not to think about the fact that his wife was supporting him.`,
      constraintMapping: "C2",
      visible: currentTimestamp >= 1948,
    },
    {
      id: "patient_boredom",
      year: 1954,
      text: `She looked at him with patient, kindly, remote boredom. The look you give a stranger who has stopped you on the street to ask directions.`,
      constraintMapping: "C2",
      visible: currentTimestamp >= 1954,
    },
    {
      id: "flaherty_party",
      year: 1950,
      text: `Flaherty was talking about Klee and Picasso and somebody named Odets. Louise was nodding, her eyes bright with interest. Christian stood on the edge of the group, holding his drink, understanding nothing. When he tried to contribute—mentioned he'd seen a nice painting of horses at a gallery—Flaherty smiled politely and changed the subject. Christian felt the familiar sensation of being on the outside, looking in through a window at a world he would never enter.`,
      constraintMapping: "C3",
      visible: currentTimestamp >= 1950,
    },
  ];

  return (
    <div
      className="literary-panel"
      style={{
        background: feel.colorGradient,
        transition: `all ${feel.latency}ms ease-out`,
        maxWidth: feel.viewport === "constrained" ? "600px" : "800px",
        opacity: feel.viewport === "constrained" ? 0.85 : 1.0,
        filter: feel.style === "viscous" ? "saturate(0.7)" : "none",
      }}
    >
      <h2>The Eighty-Yard Run (1941)</h2>
      <p className="author">Irwin Shaw</p>

      <div className="timeline-indicator">
        <span>Year: {currentTimestamp}</span>
      </div>

      <div className="segments">
        {segments
          .filter((s) => s.visible)
          .map((segment) => (
            <div
              key={segment.id}
              className={`segment ${segment.constraintMapping.toLowerCase()}`}
              onClick={() => onSegmentClick(segment.id)}
              style={{
                cursor: feel.style === "viscous" ? "not-allowed" : "pointer",
                opacity: feel.style === "viscous" && segment.constraintMapping === "C3" ? 0.6 : 1.0,
                transition: `all ${feel.latency}ms`,
                animation:
                  hysteresisFlags.memory_attractor_recognized && segment.id === "eighty_yard_run"
                    ? "pulse 2s infinite"
                    : "none",
              }}
            >
              <p>{segment.text}</p>

              {hysteresisFlags.power_inversion_seen && segment.id === "louise_working" && (
                <div className="hysteresis-marker" style={{ color: "#d31027" }}>
                  ⚠ Power inversion recognized
                </div>
              )}

              {hysteresisFlags.memory_attractor_recognized && segment.id === "eighty_yard_run" && (
                <div className="hysteresis-marker" style={{ color: "#feca57" }}>
                  ⚠ Terminal attractor
                </div>
              )}
            </div>
          ))}
      </div>

      <div className="index-indicator">
        <span>Viewing as: {indexPosition.replace(/_/g, " ")}</span>
      </div>
    </div>
  );
};

// ============================================================================
// DATA PANEL
// ============================================================================

const DataPanel = ({
  state,
  onDataClick,
}: {
  state: EngineState;
  onDataClick: (id: string) => void;
}) => {
  const { currentTimestamp } = state.system;
  const { indexPosition } = state.userState;
  const { C1_athletic_performance, C2_marital_partnership, C3_cultural_sphere } = state.constraints;

  const c1Chi = calculateChi(C1_athletic_performance, "C1", indexPosition);
  const c2Chi = calculateChi(C2_marital_partnership, "C2", indexPosition);
  const c3Chi = calculateChi(C3_cultural_sphere, "C3", indexPosition);

  const avgChi = (c1Chi + c2Chi + c3Chi) / 3.0;
  const feel = getInterfaceFeel(indexPosition, avgChi);

  const datasets = [
    {
      id: "prime_age_male_lfp",
      title: "Prime-Age Male Labor Force Participation",
      constraintMapping: "C1",
      data: [
        { year: 1950, value: 97.1, status: "peak" },
        { year: 1970, value: 96.4, status: "stable" },
        { year: 1990, value: 93.4, status: "declining" },
        { year: 2010, value: 90.2, status: "crisis" },
        { year: 2024, value: 88.5, status: "crisis" },
      ],
      source: "Bureau of Labor Statistics",
    },
    {
      id: "relationship_economics",
      title: "Economic Dependency in Partnerships",
      constraintMapping: "C2",
      data: [
        { scenario: "Dual Income", powerBalance: 0.5, satisfaction: 0.7, chi: 0.3 },
        { scenario: "Single Earner (Voluntary)", powerBalance: 0.65, satisfaction: 0.55, chi: 0.5 },
        { scenario: "Single Earner (Forced)", powerBalance: 0.85, satisfaction: 0.25, chi: 0.85 },
      ],
      source: "Pew Research Center, 2000-2024",
    },
    {
      id: "cultural_capital_access",
      title: "Arts Participation by Education Level",
      constraintMapping: "C3",
      data: [
        { education: "Graduate Degree", participation: 0.72, chi: 0.25 },
        { education: "Bachelor's", participation: 0.48, chi: 0.5 },
        { education: "High School", participation: 0.18, chi: 0.75 },
      ],
      source: "National Endowment for the Arts",
    },
  ];

  return (
    <div
      className="data-panel"
      style={{
        background: feel.colorGradient,
        transition: `all ${feel.latency}ms ease-out`,
        maxWidth: feel.viewport === "constrained" ? "600px" : "800px",
        opacity: feel.viewport === "constrained" ? 0.85 : 1.0,
      }}
    >
      <h2>Real-World Topology (2024)</h2>

      <div className="timeline-indicator">
        <span>Year: {currentTimestamp}</span>
      </div>

      <div className="datasets">
        {datasets.map((dataset) => (
          <div
            key={dataset.id}
            className={`dataset ${dataset.constraintMapping.toLowerCase()}`}
            onClick={() => onDataClick(dataset.id)}
            style={{
              cursor: feel.style === "viscous" ? "not-allowed" : "pointer",
              transition: `all ${feel.latency}ms`,
            }}
          >
            <h3>{dataset.title}</h3>
            <p className="source">Source: {dataset.source}</p>

            {dataset.id === "prime_age_male_lfp" && (
              <div className="line-chart">
                {(dataset.data as any[]).map((point: any) => (
                  <div
                    key={point.year}
                    className="data-point"
                    style={{
                      opacity: currentTimestamp >= point.year ? 1.0 : 0.3,
                      color: point.status === "crisis" ? "#d31027" : "#4facfe",
                    }}
                  >
                    <span>
                      {point.year}: {point.value}%
                    </span>
                  </div>
                ))}
                {currentTimestamp >= 2024 && (
                  <div className="projection" style={{ opacity: 0.5 }}>
                    <span>2050 (projected): 85.0% ± 3%</span>
                    <p style={{ fontSize: "0.8em", fontStyle: "italic" }}>
                      Will this trend reverse? (Unresolved)
                    </p>
                  </div>
                )}
              </div>
            )}

            {dataset.id === "relationship_economics" && (
              <div className="bar-chart">
                {(dataset.data as any[]).map((scenario: any) => (
                  <div
                    key={scenario.scenario}
                    className="bar"
                    style={{
                      background: getInterfaceFeel(indexPosition, scenario.chi).colorGradient,
                      height: `${scenario.satisfaction * 100}px`,
                    }}
                  >
                    <span>{scenario.scenario}</span>
                    <span>Satisfaction: {(scenario.satisfaction * 100).toFixed(0)}%</span>
                    <span>Power Balance: {scenario.powerBalance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {dataset.id === "cultural_capital_access" && (
              <div className="scatter-plot">
                {(dataset.data as any[]).map((point: any) => (
                  <div
                    key={point.education}
                    className="scatter-point"
                    style={{
                      background: getInterfaceFeel(indexPosition, point.chi).colorGradient,
                      width: `${point.participation * 200}px`,
                      opacity: indexPosition.includes("darling") && point.chi > 0.6 ? 0.6 : 1.0,
                    }}
                  >
                    <span>{point.education}</span>
                    <span>Participation: {(point.participation * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// BRIDGE CONTROLS
// ============================================================================

const BridgeControls = ({
  state,
  onTimelineScrub,
  onIndexSwitch,
}: {
  state: EngineState;
  onTimelineScrub: (year: number) => void;
  onIndexSwitch: (pos: string) => void;
}) => {
  const { currentTimestamp, hysteresisFlags, terminalReached } = state.system;
  const { indexPosition, advancedModeUnlocked } = state.userState;

  const canSwitchIndex = !(
    indexPosition === "darling_late" && state.transformationRules.TR2_1_power_inversion.fired
  );

  return (
    <div className="bridge-controls">
      <div className="timeline-scrubber">
        <label>Timeline: {currentTimestamp}</label>
        <input
          type="range"
          min="1941"
          max="2024"
          value={currentTimestamp}
          onChange={(e) => onTimelineScrub(parseInt(e.target.value))}
          style={{
            background: terminalReached
              ? "linear-gradient(to right, #4facfe, #d31027)"
              : "linear-gradient(to right, #4facfe, #667eea)",
          }}
        />
        <div className="timeline-markers">
          <span>1941 (Peak)</span>
          <span>1956 (Decline)</span>
          <span>2024 (Present)</span>
        </div>
      </div>

      <div className="index-switcher">
        <label>Perspective:</label>
        <select
          value={indexPosition}
          onChange={(e) => onIndexSwitch(e.target.value)}
          disabled={!canSwitchIndex}
          style={{
            opacity: canSwitchIndex ? 1.0 : 0.5,
            cursor: canSwitchIndex ? "pointer" : "not-allowed",
          }}
        >
          <option value="darling_early">Darling (Early - 1941)</option>
          <option value="darling_late">Darling (Late - 1956)</option>
          <option value="louise_early">Louise (Early - 1941)</option>
          <option value="louise_late">Louise (Late - 1956)</option>
          {advancedModeUnlocked && <option value="flaherty">Flaherty (Insider)</option>}
        </select>

        {!canSwitchIndex && (
          <p style={{ color: "#d31027", fontSize: "0.8em" }}>⚠ Perspective switch blocked (trapped)</p>
        )}
      </div>

      {hysteresisFlags.power_inversion_seen && (
        <div className="hysteresis-alert" style={{ color: "#d31027" }}>
          ⚠ Power inversion recognized - cannot unsee trap
        </div>
      )}

      {hysteresisFlags.louise_threshold_crossed && (
        <div className="hysteresis-alert" style={{ color: "#feca57" }}>
          ⚠ Emotional threshold crossed - distance is permanent
        </div>
      )}

      {hysteresisFlags.memory_attractor_recognized && (
        <div className="hysteresis-alert" style={{ color: "#667eea" }}>
          ⚠ Memory attractor recognized - peak becomes prison
        </div>
      )}

      {terminalReached && (
        <div className="terminal-alert" style={{ color: "#1a1a1a", background: "#d31027", padding: "10px" }}>
          ⚠ TERMINAL STATE REACHED
          <p>Mutual imprisonment - no exit path visible</p>
        </div>
      )}

      {advancedModeUnlocked && (
        <div className="advanced-mode-indicator" style={{ color: "#4facfe" }}>
          ✓ Advanced Mode Unlocked (Framework layer available)
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

const EightyYardRunApp = () => {
  const [engine] = useState(() => new ConstraintEngine());
  const [state, setState] = useState<EngineState>(engine.getState());
  const [shockEventActive, setShockEventActive] = useState<string | null>(null);
  const [firedShocks, setFiredShocks] = useState<Set<string>>(new Set());

  // Inject styles once
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = CSS_STYLES;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // Subscribe to engine
  useEffect(() => {
    const unsubscribe = engine.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, [engine]);

  // Shock events — track which have already been shown to avoid re-firing
  useEffect(() => {
    const { transformationRules } = state;
    const shocks: [string, string][] = [
      ["TR1_3_system_exit", "TR1_3"],
      ["TR2_1_power_inversion", "TR2_1"],
      ["TR2_3_resentment_accumulation", "TR2_3"],
    ];

    for (const [ruleKey, shockKey] of shocks) {
      if (transformationRules[ruleKey]?.fired && !firedShocks.has(shockKey)) {
        setFiredShocks((prev) => new Set(prev).add(shockKey));
        setShockEventActive(shockKey);
        setTimeout(() => setShockEventActive(null), 3000);
        break;
      }
    }
  }, [state, firedShocks]);

  const handleSegmentClick = (segmentId: string) => {
    engine.dispatch("exploreLiterarySegment", { segmentId });
  };

  const handleDataClick = (dataId: string) => {
    engine.dispatch("exploreDataPoint", { dataId });
  };

  const handleTimelineScrub = (year: number) => {
    engine.dispatch("scrubTimeline", { year });
  };

  const handleIndexSwitch = (indexPosition: string) => {
    engine.dispatch("switchIndex", { indexPosition });
  };

  const renderHysteresisOverlay = () => {
    const { hysteresisFlags } = state.system;

    if (
      !hysteresisFlags.power_inversion_seen &&
      !hysteresisFlags.louise_threshold_crossed &&
      !hysteresisFlags.memory_attractor_recognized
    ) {
      return null;
    }

    return (
      <div className="hysteresis-overlay">
        <h3>Structural Recognition (Cannot Unsee)</h3>

        {hysteresisFlags.power_inversion_seen && (
          <div className="hysteresis-item">
            <span>⚠ Power Inversion</span>
            <p>Economic dependency is structural, not personal failure</p>
          </div>
        )}

        {hysteresisFlags.louise_threshold_crossed && (
          <div className="hysteresis-item">
            <span>⚠ Emotional Threshold</span>
            <p>Burden accumulation crossed threshold - distance is permanent</p>
          </div>
        )}

        {hysteresisFlags.memory_attractor_recognized && (
          <div className="hysteresis-item">
            <span>⚠ Memory Attractor</span>
            <p>Peak experience became terminal attractor - prevents adaptation</p>
          </div>
        )}
      </div>
    );
  };

  const renderShockEvent = () => {
    if (!shockEventActive) return null;

    const shockMessages: Record<string, { title: string; message: string; color: string }> = {
      TR1_3: { title: "SYSTEM EXIT", message: "Athletic identity lost - irreversible", color: "#d31027" },
      TR2_1: {
        title: "POWER INVERSION",
        message: "Economic dependency complete - exit impossible",
        color: "#d31027",
      },
      TR2_3: { title: "THRESHOLD CROSSED", message: "Emotional distance now permanent", color: "#feca57" },
    };

    const shock = shockMessages[shockEventActive];
    if (!shock) return null;

    return (
      <div
        className="shock-event-overlay"
        style={{
          background: shock.color,
          animation: "shockPulse 0.5s ease-out",
        }}
      >
        <h2>{shock.title}</h2>
        <p>{shock.message}</p>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header>
        <h1>The Eighty-Yard Run</h1>
        <p className="subtitle">A Parallel Resonance: Literary Source (1941) ⟷ Real-World Topology (2024)</p>
      </header>

      <div className="panels-container">
        <LiteraryPanel state={state} onSegmentClick={handleSegmentClick} />
        <DataPanel state={state} onDataClick={handleDataClick} />
      </div>

      <BridgeControls state={state} onTimelineScrub={handleTimelineScrub} onIndexSwitch={handleIndexSwitch} />

      {renderHysteresisOverlay()}
      {renderShockEvent()}

      {state.userState.advancedModeUnlocked && (
        <div className="advanced-mode-panel">
          <h3>Framework Layer (Advanced Mode)</h3>
          <div className="constraint-metrics">
            <div>
              <strong>C1 (Athletic Performance):</strong>
              <span>ε = {state.constraints.C1_athletic_performance.epsilon.toFixed(2)}</span>
              <span>value = {state.constraints.C1_athletic_performance.value.toFixed(2)}</span>
              <span>
                UCZ attractor = {state.constraints.C1_athletic_performance.ucz!.params.attractorStrength!.toFixed(2)}
              </span>
            </div>
            <div>
              <strong>C2 (Marital Partnership):</strong>
              <span>ε = {state.constraints.C2_marital_partnership.epsilon.toFixed(2)}</span>
              <span>value = {state.constraints.C2_marital_partnership.value.toFixed(2)}</span>
              <span>
                Louise burden = {state.constraints.C2_marital_partnership.ucz!.params.currentBurden!.toFixed(2)}
              </span>
            </div>
            <div>
              <strong>C3 (Cultural Sphere):</strong>
              <span>ε = {state.constraints.C3_cultural_sphere.epsilon.toFixed(2)}</span>
              <span>value = {state.constraints.C3_cultural_sphere.value.toFixed(2)}</span>
            </div>
          </div>

          <div className="coupling-status">
            <h4>Active Couplings:</h4>
            {Object.entries(state.couplings).map(
              ([id, coupling]) =>
                coupling.active && (
                  <div key={id}>
                    <span>
                      {id}: {coupling.source} → {coupling.target}
                    </span>
                    <span>strength = {coupling.strength}</span>
                  </div>
                )
            )}
          </div>

          <div className="attractor-proximity">
            <strong>Terminal Attractor Proximity:</strong>
            <span>{(state.system.attractorProximity * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CSS
// ============================================================================

const CSS_STYLES = `
.app-container {
  font-family: 'Georgia', serif;
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
}
header {
  text-align: center;
  margin-bottom: 40px;
}
header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
}
.subtitle {
  font-size: 1.2em;
  color: #666;
  font-style: italic;
}
.panels-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
}
.literary-panel, .data-panel {
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  min-height: 600px;
  color: #fff;
}
.author {
  font-style: italic;
  opacity: 0.8;
}
.timeline-indicator {
  font-size: 1.1em;
  font-weight: bold;
  margin-bottom: 20px;
  padding: 10px;
  background: rgba(255,255,255,0.2);
  border-radius: 5px;
}
.segments, .datasets {
  margin-top: 20px;
}
.segment, .dataset {
  padding: 20px;
  margin-bottom: 20px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}
.segment:hover, .dataset:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}
.hysteresis-marker {
  margin-top: 10px;
  padding: 5px;
  font-size: 0.9em;
  font-weight: bold;
  border-left: 3px solid currentColor;
  padding-left: 10px;
}
.index-indicator {
  margin-top: 20px;
  padding: 10px;
  background: rgba(0,0,0,0.2);
  border-radius: 5px;
  font-size: 0.9em;
  text-align: center;
}
.bridge-controls {
  padding: 30px;
  background: #f5f5f5;
  border-radius: 10px;
  margin-bottom: 20px;
}
.timeline-scrubber {
  margin-bottom: 20px;
}
.timeline-scrubber input[type="range"] {
  width: 100%;
  height: 8px;
  border-radius: 5px;
  outline: none;
  -webkit-appearance: none;
}
.timeline-scrubber input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4facfe;
  cursor: pointer;
}
.timeline-markers {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.9em;
  color: #666;
}
.index-switcher {
  margin-bottom: 20px;
}
.index-switcher select {
  width: 100%;
  padding: 10px;
  font-size: 1em;
  border-radius: 5px;
  border: 1px solid #ccc;
}
.hysteresis-alert, .terminal-alert {
  margin-top: 10px;
  padding: 10px;
  border-radius: 5px;
  font-weight: bold;
}
.hysteresis-overlay {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0,0,0,0.9);
  color: white;
  padding: 20px;
  border-radius: 10px;
  max-width: 300px;
  z-index: 1000;
}
.hysteresis-item {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
}
.hysteresis-item:last-child {
  border-bottom: none;
}
.shock-event-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 40px;
  border-radius: 10px;
  color: white;
  text-align: center;
  z-index: 2000;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.shock-event-overlay h2 {
  font-size: 2em;
  margin-bottom: 10px;
}
@keyframes shockPulse {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.advanced-mode-panel {
  background: #1a1a1a;
  color: #4facfe;
  padding: 30px;
  border-radius: 10px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  margin-top: 20px;
}
.constraint-metrics > div, .coupling-status > div {
  margin-bottom: 10px;
  padding: 10px;
  background: rgba(79, 172, 254, 0.1);
  border-radius: 5px;
}
.constraint-metrics span, .coupling-status span {
  display: block;
  margin-left: 20px;
  color: #00f2fe;
}
.attractor-proximity {
  margin-top: 20px;
  padding: 15px;
  background: rgba(211, 16, 39, 0.2);
  border-radius: 5px;
  text-align: center;
}
.attractor-proximity span {
  display: block;
  font-size: 2em;
  color: #d31027;
  margin-top: 10px;
}
.source {
  font-size: 0.85em;
  opacity: 0.7;
  font-style: italic;
}
.data-point {
  padding: 4px 0;
}
.bar {
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 5px;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 60px;
}
.bar span {
  display: block;
  font-size: 0.85em;
}
.scatter-point {
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 5px;
  color: white;
  min-height: 40px;
}
.scatter-point span {
  display: block;
  font-size: 0.85em;
}
.projection {
  padding: 8px;
  border-left: 2px dashed rgba(255,255,255,0.4);
  margin-top: 8px;
}
@media (max-width: 1200px) {
  .panels-container {
    grid-template-columns: 1fr;
  }
}
`;

export default EightyYardRunApp;
