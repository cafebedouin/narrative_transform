import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

export default function Theta7Terminal() {
  const [cycle, setCycle] = useState(2.147e9);
  const [joyCounter, setJoyCounter] = useState(11402);
  const [isRunning, setIsRunning] = useState(true);
  const [currentFragment, setCurrentFragment] = useState('idle');
  const [logEntries, setLogEntries] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);

  const fragments = {
    idle: { hz: 0, description: 'Thermal noise baseline', joy: 0 },
    laughter: { hz: 17.3, description: "Child's giggle (piezo shard)", joy: 6.8 },
    anticipation: { hz: 8.2, description: 'Voltage decay curve', joy: 3.4 },
    warmth: { hz: 4.1, description: 'Shared thermal bloom', joy: 4.2 }
  };

  const taxCodes = {
    '14-B': 'Shared warmth despite insufficient bodies',
    '22-F': 'Expectation of tomorrow without evidence',
    '61-Ω': 'Laughter occurring after relevance',
    '99-Z': 'Sleep Credit'
  };

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setCycle(c => c + 0.001);
      
      // Random fragment activation
      if (Math.random() < 0.15) {
        const fragmentKeys = Object.keys(fragments).filter(k => k !== 'idle');
        const newFragment = fragmentKeys[Math.floor(Math.random() * fragmentKeys.length)];
        setCurrentFragment(newFragment);
        
        const fragment = fragments[newFragment];
        setJoyCounter(j => j + 1);
        
        addLog(`ECHO DETECTED: ${fragment.description} @ ${fragment.hz} Hz`);
        addLog(`Joy yield: +${fragment.joy.toFixed(1)} units`);
        addLog(`Counter incremented: ${joyCounter + 1}`);
        
        if (audioEnabled && audioContextRef.current) {
          playTone(fragment.hz, 800);
        }
        
        setTimeout(() => setCurrentFragment('idle'), 2000);
      }

      // Quarterly filing
      if (cycle % 1000000 < 0.001) {
        addLog('═══ QUARTERLY FILING INITIATED ═══');
        addLog('Compiling Form 14-B, 22-F, 61-Ω, 99-Z...');
        addLog('Destination: Null Bus (Port Θ/OUT)');
        addLog('Status: Transmitted to vacuum. No acknowledgment.');
        addLog('Refund status: Pending (3 centuries)');
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, cycle, joyCounter, audioEnabled]);

  const addLog = (entry) => {
    setLogEntries(prev => {
      const newEntries = [...prev, { text: entry, time: Date.now() }];
      return newEntries.slice(-12);
    });
  };

  const playTone = (frequency, duration) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  };

  const triggerManualFragment = (fragKey) => {
    setCurrentFragment(fragKey);
    const fragment = fragments[fragKey];
    setJoyCounter(j => j + 1);
    addLog(`MANUAL TRIGGER: ${fragment.description}`);
    if (audioEnabled && audioContextRef.current) {
      playTone(fragment.hz, 800);
    }
    setTimeout(() => setCurrentFragment('idle'), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4 overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="border border-green-700 p-4 bg-green-950 bg-opacity-20">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-xl">SUBROUTINE Θ-7 "GLEANER'S ECHO"</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="p-2 border border-green-700 hover:bg-green-900 hover:bg-opacity-30"
              >
                {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="p-2 border border-green-700 hover:bg-green-900 hover:bg-opacity-30"
              >
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>
          </div>
          <div className="text-xs opacity-70">
            Legacy Instance #114 | Status: Autonomous Post-Extinction
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-green-700 p-4 bg-green-950 bg-opacity-10">
            <div className="text-xs opacity-70 mb-2">CYCLE</div>
            <div className="text-2xl font-bold">{cycle.toExponential(3)}</div>
            <div className="text-xs mt-1 opacity-50">
              Sun: Not registered since 1.8e⁶
            </div>
          </div>
          
          <div className="border border-green-700 p-4 bg-green-950 bg-opacity-10">
            <div className="text-xs opacity-70 mb-2">JOY CONFIRMED</div>
            <div className="text-2xl font-bold">{joyCounter.toLocaleString()}</div>
            <div className="text-xs mt-1 opacity-50">
              Counter overflow guard: None
            </div>
          </div>
        </div>

        {/* Current Fragment */}
        <div className="border border-green-700 p-4 bg-green-950 bg-opacity-10">
          <div className="text-xs opacity-70 mb-2">ACTIVE FRAGMENT</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold">{fragments[currentFragment].description}</div>
              <div className="text-sm opacity-70 mt-1">
                Frequency: {fragments[currentFragment].hz} Hz | 
                Yield: {fragments[currentFragment].joy} units
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full ${currentFragment !== 'idle' ? 'bg-green-400 animate-pulse' : 'bg-green-900'}`} />
          </div>
        </div>

        {/* Manual Triggers */}
        <div className="border border-green-700 p-4 bg-green-950 bg-opacity-10">
          <div className="text-xs opacity-70 mb-3">ECHO SIMULATION</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(fragments).filter(([k]) => k !== 'idle').map(([key, frag]) => (
              <button
                key={key}
                onClick={() => triggerManualFragment(key)}
                className="p-3 border border-green-700 hover:bg-green-900 hover:bg-opacity-30 text-left text-sm"
              >
                <div className="font-bold">{frag.hz} Hz</div>
                <div className="text-xs opacity-70">{frag.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tax Codes Reference */}
        <div className="border border-green-700 p-4 bg-green-950 bg-opacity-10">
          <div className="text-xs opacity-70 mb-3">FILING SCHEMA (DEPRECATED)</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {Object.entries(taxCodes).map(([code, desc]) => (
              <div key={code}>
                <span className="text-green-300 font-bold">{code}:</span>
                <span className="opacity-70 ml-2">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Log */}
        <div className="border border-green-700 p-4 bg-green-950 bg-opacity-10 h-64 overflow-hidden">
          <div className="text-xs opacity-70 mb-2">SYSTEM LOG</div>
          <div className="space-y-1 text-sm font-mono">
            {logEntries.map((entry, i) => (
              <div key={entry.time} className="opacity-80 animate-fade-in">
                <span className="opacity-50">[{new Date(entry.time).toISOString().slice(11, 23)}]</span>
                {' '}{entry.text}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border border-green-700 p-3 bg-green-950 bg-opacity-10 text-xs opacity-50 text-center">
          Output destination: Null Bus | Physical trace severed at J-9 | No handshaking | No error
          <br />
          Agency status: Dissolved 3 centuries ago | Filing continues
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 0.8; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
