import React from 'react';

const SensorNodeMap = ({ nodesData, selectedNode, setSelectedNode }) => {
  // Coordinates for the mine shaft nodes on our 400x250 SVG grid
  const nodePositions = {
    shaft_a: { x: 100, y: 80, label: "Shaft A (Main Intake)" },
    shaft_b: { x: 200, y: 150, label: "Shaft B (Deep Seam)" },
    tunnel_c: { x: 300, y: 200, label: "Tunnel C (Gassy Seam)" }
  };

  const getStatusColor = (level) => {
    switch (level) {
      case 'CRITICAL': return '#ef4444';
      case 'WARNING': return '#f59e0b';
      case 'SAFE':
      default: return '#10b981';
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-title">
        <span>Mine Shaft Telemetry Map</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Interactive Schematic</span>
      </div>

      <div className="map-svg-container">
        <svg className="map-svg" viewBox="0 0 400 250">
          {/* Grid lines in background */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Dotted lines representing tunnels connecting shafts */}
          <path 
            d="M 50,80 L 100,80 L 200,150 L 300,200 L 350,200" 
            fill="none" 
            stroke="var(--color-tech)" 
            strokeWidth="3" 
            className="node-connection-line"
            opacity="0.3"
          />
          <path 
            d="M 200,50 L 200,150" 
            fill="none" 
            stroke="var(--color-tech)" 
            strokeWidth="3" 
            className="node-connection-line"
            opacity="0.3"
          />

          {/* Render tunnels label */}
          <text x="55" y="70" fill="var(--text-muted)" fontSize="8" letterSpacing="1">MAIN INTAKE SHAFT</text>
          <text x="210" y="110" fill="var(--text-muted)" fontSize="8" letterSpacing="1">DEEP EXTRACTION VENT</text>
          <text x="280" y="220" fill="var(--text-muted)" fontSize="8" letterSpacing="1">GASSY SEAM WORKING</text>

          {/* Render sensor nodes */}
          {Object.entries(nodePositions).map(([id, pos]) => {
            const data = nodesData[id] || { risk_level: 'SAFE', risk_index: 0, methane: 0, co: 0, temperature: 0, humidity: 0 };
            const statusColor = getStatusColor(data.risk_level);
            const isSelected = selectedNode === id;

            return (
              <g 
                key={id} 
                className="node-group" 
                onClick={() => setSelectedNode(id)}
              >
                {/* Active danger pulsating outer ring */}
                {data.risk_level !== 'SAFE' && (
                  <circle 
                    cx={pos.x} 
                    cy={pos.y} 
                    r={isSelected ? "22" : "16"} 
                    fill="none" 
                    stroke={statusColor} 
                    strokeWidth="2" 
                    className="pulsing-ring"
                  />
                )}

                {/* Outer halo */}
                <circle 
                  cx={pos.x} 
                  cy={pos.y} 
                  r={isSelected ? "14" : "10"} 
                  fill={statusColor} 
                  opacity="0.15" 
                  className="node-circle"
                />

                {/* Core node circle */}
                <circle 
                  cx={pos.x} 
                  cy={pos.y} 
                  r={isSelected ? "9" : "6"} 
                  fill={statusColor} 
                  stroke={isSelected ? "#fff" : "rgba(0,0,0,0.5)"} 
                  strokeWidth={isSelected ? "2" : "1.5"}
                  className="node-circle"
                />

                {/* Node details tooltip box on map */}
                <g transform={`translate(${pos.x - 50}, ${pos.y - 48})`}>
                  {/* Tooltip background */}
                  <rect 
                    width="100" 
                    height="32" 
                    rx="6" 
                    fill="rgba(14, 16, 20, 0.9)" 
                    stroke={isSelected ? "var(--color-tech)" : "rgba(255,255,255,0.08)"} 
                    strokeWidth="1"
                  />
                  {/* Tooltip content */}
                  <text x="6" y="12" fill="var(--text-primary)" fontSize="8" fontWeight="600">{pos.label}</text>
                  <text x="6" y="24" fill={statusColor} fontSize="8" fontWeight="700">
                    Risk: {data.risk_index}% ({data.risk_level})
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          display: 'flex',
          gap: '10px',
          fontSize: '0.65rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-safe)' }}></span>
            <span>Safe</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }}></span>
            <span>Warning</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-critical)' }}></span>
            <span>Critical</span>
          </div>
        </div>
      </div>
      
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
        💡 Click on any node on the map to focus telemetry charts on that shaft zone.
      </div>
    </div>
  );
};

export default SensorNodeMap;
