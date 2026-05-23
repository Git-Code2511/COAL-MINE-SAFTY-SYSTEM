import React, { useState, useEffect } from 'react';

const SystemConfig = ({ thresholds, onSaveConfig }) => {
  const [localThresholds, setLocalThresholds] = useState([]);

  useEffect(() => {
    if (thresholds && thresholds.length > 0) {
      setLocalThresholds(JSON.parse(JSON.stringify(thresholds))); // deep copy
    }
  }, [thresholds]);

  const handleChange = (param, val) => {
    setLocalThresholds(prev => prev.map(t => {
      if (t.parameter === param) {
        return { ...t, value: parseFloat(val) || 0 };
      }
      return t;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveConfig(localThresholds.map(t => ({ parameter: t.parameter, value: t.value })));
  };

  // Group configurations by gas, climate, etc. for better UX
  const groupings = {
    "Methane Gas (%)": localThresholds.filter(t => t.parameter.includes('methane')),
    "Carbon Monoxide (ppm)": localThresholds.filter(t => t.parameter.includes('co')),
    "Climate Settings": localThresholds.filter(t => t.parameter.includes('temp') || t.parameter.includes('humidity'))
  };

  return (
    <div className="panel-card">
      <div className="panel-title">
        <span>System Safety Thresholds</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supervisor Control Panel</span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Object.entries(groupings).map(([groupName, items]) => (
          <div key={groupName} className="config-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-tech)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {groupName}
            </div>
            <div className="config-grid">
              {items.map(item => (
                <div key={item.id} className="config-item">
                  <div className="config-label-row">
                    <span className="config-name">{item.description}</span>
                  </div>
                  <div className="config-input-row" style={{ marginTop: '0.25rem' }}>
                    <input
                      type="number"
                      step="any"
                      className="config-val-input"
                      value={item.value}
                      onChange={(e) => handleChange(item.parameter, e.target.value)}
                    />
                    <span className="config-unit">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <button type="submit" className="config-save-btn" style={{ marginTop: '0.5rem' }}>
          Save Configuration
        </button>
      </form>
    </div>
  );
};

export default SystemConfig;
