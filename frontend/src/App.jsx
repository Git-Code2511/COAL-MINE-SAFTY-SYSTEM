import React, { useState, useEffect, useRef } from 'react';
import SensorNodeMap from './components/SensorNodeMap';
import LiveTelemetry from './components/LiveTelemetry';
import AlertLog from './components/AlertLog';
import SystemConfig from './components/SystemConfig';

const API_BASE = "http://127.0.0.1:8000/api";
const WS_BASE = "ws://127.0.0.1:8000/ws";

function App() {
  const [selectedNode, setSelectedNode] = useState('shaft_a');
  const [nodesData, setNodesData] = useState({
    shaft_a: { node_id: 'shaft_a', node_name: 'Shaft A (Main Intake)', methane: 0.05, co: 2.0, temperature: 23.5, humidity: 60.0, risk_index: 2.0, risk_level: 'SAFE' },
    shaft_b: { node_id: 'shaft_b', node_name: 'Shaft B (Deep Seam)', methane: 0.8, co: 18.0, temperature: 32.0, humidity: 80.0, risk_index: 34.0, risk_level: 'SAFE' },
    tunnel_c: { node_id: 'tunnel_c', node_name: 'Tunnel C (Gassy Seam)', methane: 1.1, co: 28.0, temperature: 36.0, humidity: 88.0, risk_index: 54.0, risk_level: 'WARNING' }
  });
  
  const [nodeHistory, setNodeHistory] = useState({
    shaft_a: [],
    shaft_b: [],
    tunnel_c: []
  });

  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  // Audio Context synthesizer for emergency sirens
  const playAlarmSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.15);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
      
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Failed to play alarm audio", e);
    }
  };

  // Fetch initial REST data
  const fetchData = async () => {
    try {
      // Thresholds
      const resConfig = await fetch(`${API_BASE}/config`);
      if (resConfig.ok) {
        const data = await resConfig.json();
        setThresholds(data);
      }

      // Alerts
      const resAlerts = await fetch(`${API_BASE}/alerts`);
      if (resAlerts.ok) {
        const data = await resAlerts.json();
        setAlerts(data);
      }

      // Historical Telemetry to seed trend sparkline
      const resHist = await fetch(`${API_BASE}/telemetry/history`);
      if (resHist.ok) {
        const data = await resHist.json();
        // Group history by node
        const histGroup = { shaft_a: [], shaft_b: [], tunnel_c: [] };
        
        // Reverse array to push in chronological order to helper lists
        const sortedData = [...data].reverse();
        sortedData.forEach(item => {
          if (histGroup[item.node_id]) {
            histGroup[item.node_id].push(item);
          }
        });

        // Limit each array to the latest 20 items
        Object.keys(histGroup).forEach(k => {
          histGroup[k] = histGroup[k].slice(-20);
        });

        setNodeHistory(histGroup);

        // Set current state as the latest history item if available
        setNodesData(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(nid => {
            const nodeHist = histGroup[nid];
            if (nodeHist && nodeHist.length > 0) {
              updated[nid] = nodeHist[nodeHist.length - 1];
            }
          });
          return updated;
        });
      }
    } catch (e) {
      console.error("Error fetching REST data", e);
    }
  };

  useEffect(() => {
    fetchData();
    // Fallback polling for configs/active alarms
    const pollInterval = setInterval(fetchData, 4000);
    return () => clearInterval(pollInterval);
  }, []);

  // WebSockets setup
  useEffect(() => {
    const connectWS = () => {
      const socket = new WebSocket(WS_BASE);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
        console.log("WebSocket connected to safety system API");
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "TELEMETRY") {
            const t = payload.data;
            // Update node current values
            setNodesData(prev => ({
              ...prev,
              [t.node_id]: t
            }));
            // Update node history
            setNodeHistory(prev => {
              const currentHist = prev[t.node_id] || [];
              const newHist = [...currentHist, t].slice(-20); // Keep last 20
              return {
                ...prev,
                [t.node_id]: newHist
              };
            });
          } else if (payload.type === "ALERT") {
            const a = payload.data;
            setAlerts(prev => [a, ...prev]);
            
            // Audio alert trigger for critical levels
            if (a.severity === "CRITICAL") {
              playAlarmSound();
            }
          } else if (payload.type === "ALERT_RESOLVED") {
            const targetId = payload.data.id;
            setAlerts(prev => prev.map(a => a.id === targetId ? { ...a, resolved: true } : a));
          }
        } catch (e) {
          console.error("WS error parsing message", e);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        console.log("WebSocket disconnected. Reconnecting in 3s...");
        setTimeout(connectWS, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connectWS();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleResolveAlert = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/resolve/${id}`, { method: 'POST' });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
      }
    } catch (e) {
      console.error("Failed to resolve alert", e);
    }
  };

  const handleTriggerPanic = async (msg) => {
    try {
      await fetch(`${API_BASE}/alerts/panic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
    } catch (e) {
      console.error("Failed to broadcast panic alert", e);
    }
  };

  const handleSaveConfig = async (updatedConfigs) => {
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfigs)
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error("Failed to save config thresholds", e);
    }
  };

  // Determine Overall System Status
  const getSystemStatus = () => {
    const activeCritical = alerts.some(a => !a.resolved && a.severity === 'CRITICAL');
    const activeWarning = alerts.some(a => !a.resolved && a.severity === 'WARNING');
    if (activeCritical) return 'CRITICAL';
    if (activeWarning) return 'WARNING';
    return 'SAFE';
  };

  const sysStatus = getSystemStatus();

  return (
    <div className="app-container">
      {/* Control Room Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">B</div>
          <div className="logo-text">
            <h1>BCCL Safety Command</h1>
            <p>Coal Mine Live Telemetry System</p>
          </div>
        </div>

        <div className="system-status-indicator">
          {/* WS status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: wsConnected ? 'var(--color-safe)' : 'var(--color-critical)',
              display: 'inline-block'
            }}></span>
            <span>{wsConnected ? 'LIVE FEED ACTIVE' : 'API DISCONNECTED'}</span>
          </div>

          <div className={`status-badge ${sysStatus.toLowerCase()}`}>
            <span className="status-dot"></span>
            SYS STATUS: {sysStatus}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="dashboard-grid">
        {/* Left Column: Interactive Map & Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SensorNodeMap
            nodesData={nodesData}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
          />
          <SystemConfig
            thresholds={thresholds}
            onSaveConfig={handleSaveConfig}
          />
        </div>

        {/* Center Column: Live Dial Telemetry & Trends */}
        <LiveTelemetry
          nodeData={nodesData[selectedNode]}
          nodeHistory={nodeHistory}
          thresholds={thresholds}
        />

        {/* Right Column: Operations Room Alerts & Broadcast */}
        <AlertLog
          alerts={alerts}
          onResolveAlert={handleResolveAlert}
          onTriggerPanic={handleTriggerPanic}
        />
      </main>
    </div>
  );
}

export default App;
