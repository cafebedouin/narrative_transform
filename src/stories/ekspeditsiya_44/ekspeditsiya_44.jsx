import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONSTRAINT ENGINE (invisible to reader) ───────────────────────────
const initState = () => ({
  E: 0.22, S: 0.50, T: 0.30, H: 0.65, R: 0.35, X: 0.10,
  phase: 0,
  authorListSeen: false,
  collapsed: false,
  perspective: "galina",
  textRevealed: 0,
});

function stepConstraints(s) {
  let { E, S, T, H, R, X } = s;
  // TR1: Hope-Driven Extraction
  if (H > 0.4) { E = Math.min(1, E + 0.1 * H); X = Math.max(0, X - 0.05 * H); }
  // TR2: Suppression-Theater Coupling
  if (S > 0.6) { T = Math.min(1, T + 0.15 * S); R = Math.min(1, R + 0.1 * T); }
  // TR4: Recipient Arbitrage
  if (R > 0.5) { S = Math.min(1, S + 0.05); }
  // TR3: Collapse Threshold
  let collapsed = s.collapsed;
  if (E > 0.75 || H < 0.2 || X > 0.6) { collapsed = true; }
  return { ...s, E, S, T, H, R, X, collapsed };
}

// ─── STORY CONTENT ─────────────────────────────────────────────────────
// Each phase has text for each perspective. Framework is INVISIBLE.
const phases = [
  {
    id: "embark",
    title: "September 1963 — Sea of Okhotsk",
    galina: [
      `The echo sounder's stylus scratched across the paper roll in a rhythm she'd learned to read like breathing. Twelve fathoms. Fourteen. A shelf drop at 47°12'N that nobody had charted before.`,
      `Galina Ivanovna pressed her thumb against the edge of the bathymetric plate, still damp with developing chemicals, and held it up to the overhead lamp. The Shantar Ridge contour was clean. Better than clean — the resolution was sharper than anything in the institute's archive from the '58 expedition.`,
      `The Akademik Vavilov rolled gently in the late-autumn swell. Below deck, the wardroom smelled of diesel, boiled buckwheat, and the particular metallic tang of the Okhotsk fog that crept in through the ventilation. She pulled her cardigan tighter and bent back over the depth corrections.`,
      `She had forty-three more stations to process before Volkov's briefing at 1900. The corrections had to be perfect. Not good — perfect. Volkov had said, at the expedition planning meeting in Leningrad, that the Okhotsk shelf data would form the centerpiece of the monograph. "Our contribution to Soviet oceanography," he'd called it, looking around the seminar room. His eyes had paused on her, or she thought they had. It was hard to tell with Viktor Andreevich. He had a way of distributing attention like rations — evenly, precisely, without excess.`,
    ],
    volkov: [
      `Viktor Andreevich Volkov reviewed the interim data summary at the wardroom table, a Belomorkanal cigarette turning to ash between his fingers. Forty-three stations completed. Sixteen remaining. The expedition was ahead of schedule, which meant the monograph could be submitted before the spring session of the Scientific Council.`,
      `The junior hydrographer's output was, he had to admit, exceptional. Kuznetsova's depth corrections showed a precision that made the '58 data look like rough sketching. He made a note in the margin of the interim report: "Data quality: superior. Shelf anomaly at 47°12'N merits dedicated section."`,
      `He wrote "expedition staff" in the column where the interim form asked for "contributing personnel." It was standard practice. Names were for the final monograph, and the final monograph was months away. No point in creating expectations.`,
      `The institute director, Grigory Pavlovich, had already expressed interest in co-authorship. Grigory Pavlovich had not been aboard the Vavilov and could not tell a bathymetric plate from a dinner plate, but he controlled the institute's publishing schedule. These were simply the arrangements that made science possible.`,
    ],
    petrov: [
      `Marat Yurevich adjusted the echo sounder's transducer coupling and listened to the ping cycle settle into rhythm. The PDR-3 unit was fifteen years old and temperamental in cold water, but he knew its moods. Today it sang cleanly — 12 kilohertz, steady return signal, no ghost echoes off the thermocline.`,
      `He watched Kuznetsova through the instrument room's open hatch. She was hunched over the plotting table, comparing the echo trace against her manual soundings, making corrections with a drafting pen so fine it might have been a surgical tool.`,
      `This was the fifth expedition Marat had worked. He'd watched three junior hydrographers do exactly what Kuznetsova was doing now. Zheltov in '57, who'd charted the Kuril Trench approaches and got a footnote. Berezin in '59 — no footnote. And Sychova, the only other woman, in '61, who'd produced the best tidal current measurements the Pacific Fleet had ever seen and was credited as "technical staff."`,
      `The echo sounder's stylus needed replacing. He pulled a spare from the parts cabinet and began the swap, keeping his hands steady against the ship's roll. The machine didn't care who got credit. It just measured depth.`,
    ],
  },
  {
    id: "routine",
    title: "October — Station 38",
    galina: [
      `The watch schedule said she was off at 0600. She stayed until 0800 because the depth anomaly at Station 38 was doing something she hadn't seen before — a 200-meter drop over less than a nautical mile, the continental shelf falling away like a broken staircase.`,
      `She ran the soundings three times to be sure. Checked the echo sounder's calibration against Petrov's maintenance log. Corrected for salinity and temperature using the CTD data from the morning cast. The numbers held.`,
      `At the evening briefing, Volkov asked her to present the anomaly. She stood at the wardroom chart table with forty-three crew and twelve scientific staff watching, and she said: "The expedition's findings at Station 38 indicate—"`,
      `Nash. Our. The expedition's. She had practiced the phrasing in her bunk, whispering it to the overhead pipes until it sounded natural. Not "my findings" — never my. That would be kar'yerizm, and she'd seen what happened to people branded as careerists. Zheltov, who'd asked about authorship too early, had been reassigned to a weather station in Norilsk.`,
      `Volkov nodded from the head of the table when she finished. "Remarkable work," he said. "This will be an important section of the monograph." He didn't say whose section. He didn't need to. The warmth in his voice was enough to carry her through the next fourteen-hour shift.`,
    ],
    volkov: [
      `Kuznetsova's Station 38 data was the find of the expedition. A previously uncharted submarine canyon at the edge of the Shantar Ridge shelf — 200-meter relief, clean bathymetric signature, significant for both the Pacific Fleet's submarine navigation and the Academy's continental shelf program.`,
      `He authorized her to present the findings at the evening briefing. A small gesture — she was the data collector, after all, and it was appropriate that she summarize the technical details. It also served a practical purpose: the crew needed to see that good work was recognized. Morale on a three-month cruise depended on such things.`,
      `He noted how she said "the expedition's findings." Correct formulation. No grandiosity. He had worried, briefly, that she might be the type to push for individual recognition, but she understood the conventions. This made everything simpler.`,
      `After the briefing, he wrote his weekly letter to the institute. "Significant shelf anomaly discovered at 47°12'N. Full analysis will constitute a major section of the monograph. I am personally overseeing the data verification." He signed it, sealed the envelope, and placed it in the radio officer's outgoing satchel.`,
    ],
    petrov: [
      `At the briefing, Kuznetsova's hands were steady and her voice was clear. She said "nash" five times in four minutes. Marat counted.`,
      `He'd heard that word do that particular kind of work before. Nash. Ours. The collective's. Zheltov used to say it, too, before he started saying "my." Zheltov had lasted two expeditions. Berezin, who never said "my" once, lasted three — and then simply stopped applying for berths.`,
      `After the briefing, Volkov clapped Kuznetsova on the shoulder and said something about "excellent fieldwork." The echo sounder was making a clicking noise in the upper register that suggested the transducer housing was developing a stress fracture. Marat made a note to check it in the morning.`,
      `People talked about the Vavilov as if it were a research vessel. It was a research vessel. But it was also a machine, and like any machine, it had inputs and outputs. Data went in through the echo sounder. Publications came out through the Academy. What happened in between was plumbing. Marat understood plumbing.`,
    ],
  },
  {
    id: "praise",
    title: "November — The Seminar Invitation",
    galina: [
      `Viktor Andreevich asked her to stay after the morning briefing. The wardroom was empty except for the steward clearing tea glasses.`,
      `"Galina Ivanovna," he said, "I'd like you to present the Shantar Ridge data at the institute seminar when we return. The full dataset. Your analysis."`,
      `She felt something loosen in her chest that she hadn't realized was tight. The institute seminar was not the monograph, but it was visible. Department heads attended. Visitors from Moscow sometimes sat in the back row. A good seminar presentation could lead to invitations, collaborations, a name that people recognized.`,
      `"Of course, Viktor Andreevich. I'd be honored to present the expedition's work."`,
      `Nash again. Ours. But he'd said "your analysis." Your. Had he said that? She replayed the sentence in her bunk that night, trying to hear it exactly. "Your analysis." Surely that meant something. Surely that was a signal about the monograph.`,
      `She started working on the seminar slides the next morning, pulling data from her personal notebook — the tetradka she kept separate from the official expedition log, with her own margin notes and preliminary interpretations. She worked through two watch rotations. Her wrists ached from the plotting pen. She didn't notice.`,
    ],
    volkov: [
      `The seminar presentation would serve multiple purposes. First, it established the expedition's significance before the monograph was even submitted — advance publicity. Second, it kept Kuznetsova productive during the return transit, when junior staff typically lost focus. Third, it demonstrated his mentorship capacity to the Scientific Council, which was evaluating his candidacy for Full Member.`,
      `He told Kuznetsova to present "her analysis." He was careful with pronouns. At this stage of a junior researcher's development, occasional personal attribution prevented the kind of disillusionment that led to transfer requests and awkward conversations with the personnel committee.`,
      `The seminar was not the monograph. The seminar would have no published proceedings. Her name on a seminar program was ephemeral — it existed for an afternoon and then became an entry in an institute bulletin that no one outside Leningrad would ever read. The monograph would be in libraries for decades.`,
      `A small investment. Reliable return.`,
    ],
    petrov: [
      `Kuznetsova came to the instrument room that evening with two glasses of tea and a look on her face that Marat recognized. Bright. Almost feverish. She asked him to run a full calibration check on the PDR-3 so she could verify the Shantar data against the instrument's known error margins.`,
      `"For the seminar," she said.`,
      `He ran the calibration. It took forty minutes. The PDR-3 was within spec, as he'd told her last week when she'd asked the same question. She thanked him and went back to the plotting table.`,
      `He almost said something. He'd rehearsed it once, two years ago, for Sychova. Something about how the seminar and the monograph were different things. How one was a window and the other was a door, and the door had a lock, and the lock had a particular shape.`,
      `He hadn't said it to Sychova. He didn't say it to Kuznetsova. His own berth on the next expedition depended on Volkov's assessment of the technical staff. He drank his tea and replaced the echo sounder's chart paper.`,
    ],
  },
  {
    id: "drift",
    title: "December — Return Transit",
    galina: [
      `The Vavilov turned south toward Vladivostok on the third of December. The Okhotsk winter was closing in — ice reports from the northern stations showed the shelf already freezing. They'd gotten everything they needed. Sixty-one stations. Four hundred and twelve individual soundings. A complete bathymetric map of the Shantar Ridge and its submarine canyon.`,
      `In the transit days, Galina refined the seminar presentation and finished the last of the depth corrections. Her tetradka was full — 147 pages of personal notes, preliminary calculations, alternative interpretations of the shelf anomaly. She'd started a second notebook.`,
      `She noticed, without quite registering it, that Volkov had stopped asking her opinion at briefings. The evening sessions grew shorter as they moved into known waters. The echo sounder ran on automatic, and there was less need for manual verification. She filled the empty hours by re-checking her own data, looking for errors that weren't there.`,
      `One evening she passed the radio room and heard Volkov dictating a message. She caught fragments: "... monograph structure finalized... three principal authors... Academy session deadline March fifteenth..."`,
      `Three. She counted the scientific staff who had published with the institute. Volkov. Grigory Pavlovich, the director. And who? Possibly Fedorov, the Moscow postdoctoral fellow who'd contributed the theoretical model of shelf sedimentation. Fedorov had been aboard for two weeks before transferring to a different vessel.`,
      `Three could include her. Three could exclude her. She went back to her data.`,
    ],
    volkov: [
      `The monograph structure was taking shape. Volkov drafted the outline during the return transit: eight chapters, three authors. Himself as lead. Grigory Pavlovich for institutional weight. Fedorov for the sedimentation model, which gave the monograph theoretical significance beyond mere cartography.`,
      `The data chapters would be the strongest section — the Shantar Ridge canyon was a genuine discovery. He would write those chapters himself, drawing from Kuznetsova's expedition logs and the station data. The bathymetric plates would be credited to "expedition technical staff" in the figure captions, following standard practice.`,
      `He reviewed the acknowledgments section. "The authors wish to thank the crew and scientific staff of the Akademik Vavilov, with particular gratitude to G.I. Kuznetsova for technical assistance in data collection." Technical assistance. It was accurate — she had collected the data. Collection was technical work. Interpretation, synthesis, framing — that was authorship.`,
      `He had built a career on this distinction. It was not, in his view, dishonest. It was the structure of Soviet science, and the structure existed for reasons. Junior researchers developed their skills. Senior scientists provided the intellectual framework. Credit reflected contribution to the field's architecture, not to its bricklaying.`,
    ],
    petrov: [
      `The PDR-3's transducer housing cracked on the second day of the return transit. Hairline fracture, probably from thermal cycling in the Okhotsk cold. Marat sealed it with marine epoxy and rerouted the coupling through the backup channel. It would hold until Vladivostok.`,
      `He filed the repair in the maintenance log and noted the parts he'd need for the full rebuild. Then he sat in the instrument room and listened to the sounder ping against the known bottom of the Tatar Strait. Familiar depths. Nothing to discover here.`,
      `Kuznetsova was still at the plotting table. She'd been there for nine hours. Her tea was cold. He could see, from the angle of her lamp, that she was re-checking Station 38 for the fourth time.`,
      `The machine was still running. It had that particular hum it made when all the components were aligned and the power draw was steady and everything functioned exactly as designed. He'd heard it on every expedition. It sounded like efficiency. It sounded like precision. It sounded, if you'd been listening long enough, like something winding down.`,
    ],
  },
  {
    id: "reveal",
    title: "January 1964 — Leningrad",
    galina: [
      `The monograph draft arrived in the institute's internal mail on a Tuesday. Carbon-copy paper, mimeograph ink, the purple-blue that smelled like the duplicating room in the basement. "Monograph 44-B: Bathymetric Survey of the Shantar Ridge Continental Shelf, Sea of Okhotsk."`,
      `She read the author list first. Everyone read the author list first.`,
      `V.A. Volkov. G.P. Ryazanov. A.M. Fedorov.`,
      `She turned to the acknowledgments. Fourth paragraph: "The authors wish to thank the crew and scientific staff of the Akademik Vavilov for their dedicated service during Expedition 44, with particular gratitude to G.I. Kuznetsova for technical assistance in data collection and processing."`,
      `Tekhnicheskaya. Technical.`,
      `She sat at her desk in the hydrographers' office and read the sentence again. The mimeograph ink was slightly blurred on the word "gratitude." She studied the blur for a long time. Then she turned to Chapter Four — the Shantar Ridge data — and recognized every number. Every correction. Every depth contour she'd drawn at 0300 in the instrument room with her wrists aching and the ship rolling and the smell of developing chemicals in her hair.`,
      `The chapter was credited to V.A. Volkov. There was no co-author line. In the methodology section, the echo sounder data was described as "collected by expedition technical staff using standard PDR-3 bathymetric procedures."`,
      `Standard. As if anyone could have done it. As if the 200-meter anomaly at Station 38 was standard. As if the four hundred and twelve soundings, each one manually verified, each one corrected for temperature and salinity and ship's drift, were standard.`,
      `She closed the monograph and put it in her desk drawer. Then she took out her tetradka — 147 pages of her own notes, her own analysis, her own interpretations that would never appear in any published volume — and she put that in the drawer too. She closed the drawer.`,
    ],
    volkov: [
      `The monograph was submitted to the Academy press on January 14th. Volkov reviewed the final proof in his office, satisfied with the structure. The Shantar Ridge data gave the volume genuine scientific weight. The sedimentation model from Fedorov provided theoretical framing. Grigory Pavlovich's name on the cover ensured priority review.`,
      `Kuznetsova had not said anything about the author list. He took this as confirmation that she understood the conventions. Some junior researchers made noise at this stage — requests for meetings, letters to the department head, occasional appeals to the Scientific Council. Kuznetsova had done none of these things. She was professional. Discreet.`,
      `He signed the recommendation form for her seminar presentation, scheduled for February. A good presentation would strengthen her position for future expeditions. In two or three years, with another major dataset, she might earn a co-authorship on a smaller publication. These things took time. He had waited nine years for his first lead authorship.`,
      `The system worked. It produced science. It maintained standards. It allocated credit to those who had demonstrated sustained contribution to the field. If individual contributions were occasionally absorbed into the collective effort, that was the nature of collective science. Nobody built a ship alone.`,
    ],
    petrov: [
      `Marat saw the monograph in the institute library on a Thursday. He didn't need to check the author list. He already knew.`,
      `He found Kuznetsova in the hydrographers' office at the end of the day. Her desk was clean. The plotting instruments she usually left out — the drafting pens, the parallel rulers, the magnifying loupe — were put away. Her tetradka was not visible.`,
      `"The PDR-3 needs a full overhaul before the spring expedition," he said. "If you have time, I could use someone who knows its error characteristics."`,
      `She looked at him. Something in her face reminded him of the echo sounder when the transducer coupling failed — still producing a signal, but shifted in frequency. Still measuring depth, but the numbers were wrong in ways that only showed up when you compared them to the truth.`,
      `"I'll check my schedule," she said.`,
      `She did not check her schedule. She did not work on the PDR-3 overhaul. In February, she gave the seminar presentation. It was, by all accounts, excellent. In March, she requested a transfer to the Murmansk branch. In April, she was gone.`,
      `The echo sounder got its overhaul. The Vavilov sailed again in June with a new junior hydrographer who collected good data and said nash at the appropriate moments and did not keep a personal notebook. The machine ran. The machine had always run.`,
    ],
  },
];

// ─── STYLING ───────────────────────────────────────────────────────────
const CRT_BG = "#0a0f0a";
const AMBER = "#d4a017";
const GREEN_DIM = "#2a5a2a";
const GREEN_BRIGHT = "#4adf4a";
const GREEN_MID = "#3a8a3a";
const PAPER = "#c8b88a";
const RUST = "#8b4513";

// ─── COMPONENT ─────────────────────────────────────────────────────────
export default function AkademikVavilov() {
  const [state, setState] = useState(initState);
  const [typing, setTyping] = useState(false);
  const [displayedParas, setDisplayedParas] = useState(0);
  const [scanlineY, setScanlineY] = useState(0);
  const [started, setStarted] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const contentRef = useRef(null);

  const currentPhase = phases[state.phase] || phases[phases.length - 1];
  const currentText = currentPhase[state.perspective] || currentPhase.galina;
  const totalParas = currentText.length;
  const isLastPhase = state.phase >= phases.length - 1;

  // Scanline animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScanlineY((y) => (y + 1) % 100);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Type-in effect for paragraphs
  useEffect(() => {
    setDisplayedParas(0);
    setTyping(true);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setDisplayedParas(count);
      if (count >= totalParas) {
        clearInterval(interval);
        setTyping(false);
      }
    }, 600);
    return () => clearInterval(interval);
  }, [state.phase, state.perspective, totalParas]);

  // Auto-scroll
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [displayedParas]);

  const advancePhase = useCallback(() => {
    if (typing || isLastPhase) return;
    setState((s) => {
      const next = { ...s, phase: s.phase + 1, textRevealed: 0 };
      // Step constraints forward
      return stepConstraints({
        ...next,
        H: Math.max(0.1, next.H - 0.08),
      });
    });
  }, [typing, isLastPhase]);

  const switchPerspective = useCallback(
    (p) => {
      setState((s) => {
        const next = { ...s, perspective: p };
        if (p === "volkov" && s.phase >= 4) {
          next.authorListSeen = true;
        }
        return next;
      });
    },
    []
  );

  // ─── TITLE SCREEN ───────────────────────────────────────────────────
  if (!started) {
    return (
      <div style={{
        background: CRT_BG,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Courier New', Courier, monospace",
        color: GREEN_BRIGHT,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Scanline overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)`,
          zIndex: 10,
        }} />
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)`,
          zIndex: 10,
        }} />

        <div style={{ zIndex: 20, textAlign: "center", padding: "0 2rem" }}>
          <div style={{
            fontSize: "0.65rem", letterSpacing: "0.4em", color: GREEN_MID,
            marginBottom: "2rem", textTransform: "uppercase",
          }}>
            Akademiya Nauk SSSR &bull; Institut Okeanologii
          </div>

          <h1 style={{
            fontSize: "clamp(1.2rem, 3.5vw, 2rem)",
            fontWeight: "normal",
            letterSpacing: "0.15em",
            margin: "0 0 0.5rem 0",
            textTransform: "uppercase",
            textShadow: `0 0 20px ${GREEN_DIM}, 0 0 40px rgba(74,223,74,0.2)`,
          }}>
            Ekspeditsiya 44
          </h1>

          <div style={{
            fontSize: "clamp(0.7rem, 2vw, 0.85rem)",
            color: GREEN_MID,
            letterSpacing: "0.2em",
            marginBottom: "3rem",
          }}>
            NIS «Akademik Vavilov» &mdash; Sea of Okhotsk, 1963
          </div>

          <div style={{
            width: "100%", maxWidth: 420, height: 1,
            background: `linear-gradient(90deg, transparent, ${GREEN_DIM}, transparent)`,
            margin: "0 auto 2rem",
          }} />

          <div style={{
            fontSize: "0.7rem", color: GREEN_DIM, lineHeight: 1.8,
            maxWidth: 380, margin: "0 auto 3rem",
          }}>
            <div>Bathymetric survey of the continental shelf</div>
            <div>61 stations &bull; 412 soundings &bull; 3 months</div>
            <div style={{ marginTop: "1rem", color: AMBER, fontSize: "0.6rem", letterSpacing: "0.3em" }}>
              THREE WORKSTATIONS &bull; ONE EXPEDITION
            </div>
          </div>

          <button
            onClick={() => setStarted(true)}
            style={{
              background: "transparent",
              border: `1px solid ${GREEN_MID}`,
              color: GREEN_BRIGHT,
              padding: "0.75rem 2.5rem",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "0.75rem",
              letterSpacing: "0.3em",
              cursor: "pointer",
              textTransform: "uppercase",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = GREEN_DIM;
              e.target.style.borderColor = GREEN_BRIGHT;
              e.target.style.boxShadow = `0 0 15px rgba(74,223,74,0.2)`;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.borderColor = GREEN_MID;
              e.target.style.boxShadow = "none";
            }}
          >
            Begin Expedition
          </button>
        </div>
      </div>
    );
  }

  // ─── PERSPECTIVE TAB LABELS ──────────────────────────────────────────
  const tabs = [
    { key: "galina", label: "Station Workstation", sublabel: "G.I. Kuznetsova — Gidrograf" },
    { key: "volkov", label: "Chief's Dossier", sublabel: "V.A. Volkov — Nachekspeditsii" },
    { key: "petrov", label: "Maintenance Oversight", sublabel: "M.Yu. Petrov — Starshiy Tekhnik" },
  ];

  // Ghost label after hysteresis
  const ghostLabel = state.authorListSeen && state.perspective === "galina";

  return (
    <div style={{
      background: CRT_BG,
      minHeight: "100vh",
      fontFamily: "'Courier New', Courier, monospace",
      color: GREEN_BRIGHT,
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Scanlines */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)`,
        zIndex: 100,
      }} />
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)`,
        zIndex: 100,
      }} />

      {/* Header bar */}
      <div style={{
        borderBottom: `1px solid ${GREEN_DIM}`,
        padding: "0.6rem 1rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
        flexWrap: "wrap",
        gap: "0.5rem",
      }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: GREEN_MID, textTransform: "uppercase" }}>
          NIS «Akademik Vavilov» — Ekspeditsiya 44
        </div>
        <div style={{ fontSize: "0.55rem", color: GREEN_DIM }}>
          {currentPhase.title}
        </div>
      </div>

      {/* Perspective tabs */}
      <div style={{
        display: "flex",
        borderBottom: `1px solid ${GREEN_DIM}`,
        flexShrink: 0,
        overflow: "hidden",
      }}>
        {tabs.map((tab) => {
          const active = state.perspective === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => switchPerspective(tab.key)}
              style={{
                flex: 1,
                background: active ? "rgba(42,90,42,0.25)" : "transparent",
                border: "none",
                borderBottom: active ? `2px solid ${GREEN_BRIGHT}` : `2px solid transparent`,
                borderRight: `1px solid ${GREEN_DIM}`,
                padding: "0.6rem 0.4rem",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
              }}
            >
              <div style={{
                fontSize: "0.55rem",
                letterSpacing: "0.15em",
                color: active ? GREEN_BRIGHT : GREEN_MID,
                textTransform: "uppercase",
                fontFamily: "'Courier New', Courier, monospace",
                marginBottom: "0.15rem",
              }}>
                {tab.label}
              </div>
              <div style={{
                fontSize: "0.5rem",
                color: active ? GREEN_MID : GREEN_DIM,
                fontFamily: "'Courier New', Courier, monospace",
              }}>
                {tab.sublabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Ghost audit overlay for post-hysteresis Galina view */}
      {ghostLabel && (
        <div style={{
          background: "rgba(139,69,19,0.12)",
          borderBottom: `1px solid rgba(139,69,19,0.3)`,
          padding: "0.4rem 1rem",
          fontSize: "0.5rem",
          color: RUST,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          textAlign: "center",
          animation: "pulse 3s ease-in-out infinite",
          flexShrink: 0,
        }}>
          ● Credit displacement detected — All submissions relabeled: "Volkov, V.A."
        </div>
      )}

      {/* Main story content */}
      <div
        ref={contentRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem",
          maxWidth: 700,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Phase indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          marginBottom: "1.5rem",
        }}>
          {phases.map((p, i) => (
            <div
              key={p.id}
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i < state.phase ? GREEN_BRIGHT
                  : i === state.phase ? AMBER
                  : GREEN_DIM,
                transition: "background 0.5s",
                boxShadow: i === state.phase ? `0 0 8px ${AMBER}` : "none",
              }}
            />
          ))}
          <span style={{
            fontSize: "0.5rem", color: GREEN_DIM, letterSpacing: "0.1em",
            marginLeft: "0.5rem",
          }}>
            {state.phase + 1} / {phases.length}
          </span>
        </div>

        {/* Story text */}
        <div style={{ lineHeight: 1.85, fontSize: "0.82rem" }}>
          {currentText.slice(0, displayedParas).map((para, i) => (
            <p
              key={`${state.phase}-${state.perspective}-${i}`}
              style={{
                margin: "0 0 1.2rem 0",
                color: ghostLabel ? "rgba(74,223,74,0.6)" : GREEN_BRIGHT,
                opacity: 0,
                animation: `fadeIn 0.8s ease ${i * 0.1}s forwards`,
                textIndent: i > 0 ? "2em" : 0,
              }}
            >
              {para}
            </p>
          ))}
        </div>

        {/* Typing indicator */}
        {typing && (
          <div style={{ color: GREEN_DIM, fontSize: "0.7rem" }}>
            <span style={{ animation: "blink 1s step-end infinite" }}>▊</span>
          </div>
        )}

        {/* Navigation */}
        {!typing && displayedParas >= totalParas && (
          <div style={{
            marginTop: "2rem",
            paddingTop: "1.5rem",
            borderTop: `1px solid ${GREEN_DIM}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}>
            {/* Perspective note */}
            {!showNote && state.phase === 0 && state.perspective === "galina" && (
              <div style={{
                fontSize: "0.55rem", color: AMBER, letterSpacing: "0.1em",
                width: "100%", textAlign: "center", marginBottom: "0.5rem",
              }}>
                ↑ Switch workstations above to see the same events from different positions
              </div>
            )}

            {isLastPhase ? (
              <div style={{
                width: "100%",
                textAlign: "center",
              }}>
                <div style={{
                  fontSize: "0.6rem", color: GREEN_DIM, letterSpacing: "0.2em",
                  textTransform: "uppercase", marginBottom: "1rem",
                }}>
                  {state.perspective === "petrov"
                    ? "End of maintenance log"
                    : state.perspective === "volkov"
                    ? "End of expedition dossier"
                    : "Station workstation powered down"
                  }
                </div>
                {state.perspective === "galina" && (
                  <div style={{
                    fontSize: "0.65rem", color: RUST, fontStyle: "italic",
                    maxWidth: 400, margin: "0 auto", lineHeight: 1.6,
                  }}>
                    Only the tetradka remains — 147 pages of soundings, corrections, and interpretations
                    that will never appear in any published volume.
                  </div>
                )}
                {state.perspective === "volkov" && (
                  <div style={{
                    fontSize: "0.55rem", color: AMBER, letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}>
                    ● Academy notification: Monograph 44-B accepted for publication
                  </div>
                )}
                {state.perspective === "petrov" && (
                  <div style={{
                    fontSize: "0.65rem", color: GREEN_DIM, fontStyle: "italic",
                    maxWidth: 400, margin: "0 auto", lineHeight: 1.6,
                  }}>
                    The machine ran. The machine had always run.
                  </div>
                )}
                <button
                  onClick={() => { setState(initState); setStarted(false); }}
                  style={{
                    marginTop: "2rem",
                    background: "transparent",
                    border: `1px solid ${GREEN_DIM}`,
                    color: GREEN_MID,
                    padding: "0.5rem 1.5rem",
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: "0.6rem",
                    letterSpacing: "0.2em",
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                  onMouseEnter={(e) => { e.target.style.borderColor = GREEN_BRIGHT; e.target.style.color = GREEN_BRIGHT; }}
                  onMouseLeave={(e) => { e.target.style.borderColor = GREEN_DIM; e.target.style.color = GREEN_MID; }}
                >
                  Disembark Vavilov
                </button>
              </div>
            ) : (
              <button
                onClick={advancePhase}
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: `1px solid ${GREEN_MID}`,
                  color: GREEN_BRIGHT,
                  padding: "0.5rem 1.5rem",
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: "0.6rem",
                  letterSpacing: "0.2em",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = GREEN_DIM;
                  e.target.style.boxShadow = `0 0 10px rgba(74,223,74,0.15)`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.boxShadow = "none";
                }}
              >
                Next Entry →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer status bar — constraint gauges, subtly presented */}
      <div style={{
        borderTop: `1px solid ${GREEN_DIM}`,
        padding: "0.4rem 1rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
        gap: "0.5rem",
        flexWrap: "wrap",
      }}>
        <StatusBar
          label={state.perspective === "galina" ? "Resolution" : state.perspective === "volkov" ? "Efficiency" : "Signal"}
          value={state.perspective === "galina" ? state.E : state.perspective === "volkov" ? state.R : state.E}
          color={state.E > 0.7 ? AMBER : GREEN_MID}
        />
        <StatusBar
          label={state.perspective === "galina" ? "Collective Spirit" : state.perspective === "volkov" ? "Discipline" : "Coupling"}
          value={state.S}
          color={GREEN_MID}
        />
        <StatusBar
          label={state.perspective === "galina" ? "Prospects" : state.perspective === "volkov" ? "Prestige" : "Drift"}
          value={state.perspective === "volkov" ? state.R : state.H}
          color={state.H < 0.3 ? RUST : GREEN_MID}
        />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${CRT_BG}; }
        ::-webkit-scrollbar-thumb { background: ${GREEN_DIM}; }
      `}</style>
    </div>
  );
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────
function StatusBar({ label, value, color }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ flex: 1, minWidth: 80 }}>
      <div style={{
        fontSize: "0.45rem",
        color: GREEN_DIM,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        marginBottom: "0.2rem",
      }}>
        {label}
      </div>
      <div style={{
        height: 3,
        background: "rgba(42,90,42,0.3)",
        borderRadius: 1,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          transition: "width 1s ease, background 0.5s",
          borderRadius: 1,
        }} />
      </div>
    </div>
  );
}
