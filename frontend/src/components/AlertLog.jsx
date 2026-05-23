import React, { useState } from 'react';

const AlertLog = ({ alerts, onResolveAlert, onTriggerPanic }) => {
  const [broadcastMsg, setBroadcastMsg] = useState("");

  const activeAlerts = alerts.filter(a => !a.resolved);

  const handlePanicSubmit = (e) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    onTriggerPanic(broadcastMsg);
    setBroadcastMsg("");
  };

  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="panel-card" style={{ gap: '1rem' }}>
      <div className="panel-title">
        <span>Alert Operations Room</span>
        <span style={{
          padding: '2px 8px',
          borderRadius: '4px',
          background: activeAlerts.length > 0 ? 'var(--color-critical-glow)' : 'var(--color-safe-glow)',
          color: activeAlerts.length > 0 ? 'var(--color-critical)' : 'var(--color-safe)',
          fontSize: '0.75rem',
          fontWeight: '700'
        }}>
          {activeAlerts.length} Active Alarms
        </span>
      </div>

      {/* Manual Emergency Evacuation Console */}
      <form onSubmit={handlePanicSubmit} className="emergency-controls">
        <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-critical)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🚨 Dispatch Evacuation Order
        </div>
        <input
          type="text"
          placeholder="Enter emergency instructions..."
          className="panic-input"
          value={broadcastMsg}
          onChange={(e) => setBroadcastMsg(e.target.value)}
        />
        <button type="submit" className="panic-btn">
          Broadcast Panic Evac Sirens
        </button>
      </form>

      {/* Alarm History list */}
      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
        Active & Historical Log
      </div>
      
      <div className="alert-log-container">
        {alerts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1.5rem', textAlign: 'center' }}>
            No active alarms in system.
          </div>
        ) : (
          alerts.map(alert => (
            <div 
              key={alert.id} 
              className={`alert-item ${alert.resolved ? '' : alert.severity.toLowerCase()}`}
              style={{
                opacity: alert.resolved ? 0.5 : 1,
                borderLeft: alert.resolved ? '4px solid var(--text-muted)' : undefined
              }}
            >
              <div className="alert-item-header">
                <span>{alert.node_name}</span>
                <span style={{ display: 'flex', gap: '8px' }}>
                  <span className={`alert-severity-badge ${alert.resolved ? '' : alert.severity.toLowerCase()}`}>
                    {alert.resolved ? 'RESOLVED' : alert.severity}
                  </span>
                  <span>{formatTime(alert.timestamp)}</span>
                </span>
              </div>
              <div className="alert-message">{alert.message}</div>
              
              {!alert.resolved && (
                <div className="alert-actions">
                  <button 
                    className="resolve-btn"
                    onClick={() => onResolveAlert(alert.id)}
                  >
                    Acknowledge & Mute
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertLog;
