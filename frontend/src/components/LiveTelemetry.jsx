import React, { useState } from 'react';

const CircularGauge = ({ value, maxVal, unit, label, color, warnVal, critVal }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, (value / maxVal) * 100));
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  let statusClass = 'safe';
  if (value >= critVal) statusClass = 'critical';
  else if (value >= warnVal) statusClass = 'warning';

  const getStatusColor = () => {
    if (statusClass === 'critical') return 'var(--color-critical)';
    if (statusClass === 'warning') return 'var(--color-warning)';
    return color;
  };

  return (
    <div className={`metric-widget ${statusClass}`}>
      <span className="metric-label">{label}</span>
      
      <div className="dial-container">
        <svg width="100" height="100" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            className="dial-circle-bg"
            cx="50"
            cy="50"
            r={radius}
            strokeWidth="8"
          />
          {/* Foreground progress circle */}
          <circle
            className="dial-circle-value"
            cx="50"
            cy="50"
            r={radius}
            strokeWidth="8"
            stroke={getStatusColor()}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
          />
          {/* Text in middle */}
          <text
            x="50"
            y="54"
            textAnchor="middle"
            fill="var(--text-primary)"
            fontSize="15"
            fontWeight="700"
          >
            {value.toFixed(value > 10 ? 0 : 2)}
          </text>
          <text
            x="50"
            y="70"
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="8"
            fontWeight="500"
          >
            {unit}
          </text>
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
        <span>Warn: {warnVal}{unit}</span>
        <span>Crit: {critVal}{unit}</span>
      </div>
    </div>
  );
};

const Sparkline = ({ data, label, color, unit }) => {
  if (!data || data.length === 0) return null;
  
  const width = 300;
  const height = 50;
  const minVal = Math.min(...data) * 0.9;
  const maxVal = Math.max(...data) * 1.1 || 1.0;
  const range = maxVal - minVal || 1.0;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 10) + 5;
    const y = height - ((d - minVal) / range) * (height - 10) - 5;
    return `${x},${y}`;
  }).join(' ');

  const currentVal = data[data.length - 1];

  return (
    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label} Trend (Last 20 updates)</span>
        <span style={{ fontWeight: '600', color: color }}>Current: {currentVal.toFixed(currentVal > 10 ? 0 : 2)} {unit}</span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
        {/* Shadow area under sparkline */}
        <path
          fill={`${color}10`}
          d={`M 5,${height} L ${points} L ${width - 5},${height} Z`}
        />
      </svg>
    </div>
  );
};

const LiveTelemetry = ({ nodeData, nodeHistory, thresholds }) => {
  const [activeTrendTab, setActiveTrendTab] = useState('methane');

  if (!nodeData) {
    return (
      <div className="panel-card" style={{ justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Select a sensor node to display telemetry</p>
      </div>
    );
  }

  // Get active history array for trend chart
  const historyList = nodeHistory[nodeData.node_id] || [];
  const getTrendData = () => {
    return historyList.map(h => h[activeTrendTab]).reverse();
  };

  const getTrendColor = () => {
    switch (activeTrendTab) {
      case 'methane': return '#ef4444';
      case 'co': return '#f59e0b';
      case 'temperature': return '#06b6d4';
      case 'humidity': return '#3b82f6';
      default: return 'var(--color-tech)';
    }
  };

  const getTrendUnit = () => {
    switch (activeTrendTab) {
      case 'methane': return '%';
      case 'co': return 'ppm';
      case 'temperature': return '°C';
      case 'humidity': return '%';
      default: return '';
    }
  };

  // Resolve thresholds
  const m_warn = thresholds.find(t => t.parameter === 'methane_warning')?.value || 1.0;
  const m_crit = thresholds.find(t => t.parameter === 'methane_critical')?.value || 1.5;
  const co_warn = thresholds.find(t => t.parameter === 'co_warning')?.value || 35.0;
  const co_crit = thresholds.find(t => t.parameter === 'co_critical')?.value || 50.0;
  const temp_warn = thresholds.find(t => t.parameter === 'temp_warning')?.value || 35.0;
  const temp_crit = thresholds.find(t => t.parameter === 'temp_critical')?.value || 40.0;
  const hum_warn = thresholds.find(t => t.parameter === 'humidity_warning')?.value || 85.0;
  const hum_crit = thresholds.find(t => t.parameter === 'humidity_critical')?.value || 95.0;

  return (
    <div className="panel-card">
      <div className="panel-title">
        <span>Live Telemetry - {nodeData.node_name}</span>
        <span className={`status-badge ${nodeData.risk_level?.toLowerCase()}`}>
          <span className="status-dot"></span>
          Risk Index: {nodeData.risk_index}%
        </span>
      </div>

      <div className="telemetry-metrics-grid">
        <CircularGauge
          value={nodeData.methane}
          maxVal={2.5}
          unit="%"
          label="Methane (CH4)"
          color="#ef4444"
          warnVal={m_warn}
          critVal={m_crit}
        />
        <CircularGauge
          value={nodeData.co}
          maxVal={80.0}
          unit="ppm"
          label="Carbon Monoxide (CO)"
          color="#f59e0b"
          warnVal={co_warn}
          critVal={co_crit}
        />
        <CircularGauge
          value={nodeData.temperature}
          maxVal={50.0}
          unit="°C"
          label="Temperature"
          color="#06b6d4"
          warnVal={temp_warn}
          critVal={temp_crit}
        />
        <CircularGauge
          value={nodeData.humidity}
          maxVal={100.0}
          unit="%"
          label="Relative Humidity"
          color="#3b82f6"
          warnVal={hum_warn}
          critVal={hum_crit}
        />
      </div>

      {/* Trend Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {['methane', 'co', 'temperature', 'humidity'].map(param => (
          <button
            key={param}
            onClick={() => setActiveTrendTab(param)}
            style={{
              background: activeTrendTab === param ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
              border: 'none',
              borderBottom: activeTrendTab === param ? '2px solid var(--color-tech)' : 'none',
              color: activeTrendTab === param ? 'var(--color-tech)' : 'var(--text-secondary)',
              padding: '0.4rem 0.8rem',
              borderRadius: '4px 4px 0 0',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {param === 'co' ? 'CO' : param.slice(0, 4)}
          </button>
        ))}
      </div>

      {historyList.length > 0 ? (
        <Sparkline
          data={getTrendData()}
          label={activeTrendTab.charAt(0).toUpperCase() + activeTrendTab.slice(1)}
          color={getTrendColor()}
          unit={getTrendUnit()}
        />
      ) : (
        <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Accumulating trend data...
        </div>
      )}
    </div>
  );
};

export default LiveTelemetry;
