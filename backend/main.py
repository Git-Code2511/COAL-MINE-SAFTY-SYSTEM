from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any
import json
from datetime import datetime
from database import init_db, get_db, Config, Telemetry, Alert

init_db()

app = FastAPI(title="Coal Mine Safety API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Silently handle disconnected websockets
                pass

manager = ConnectionManager()

# Pydantic Schemas
class TelemetryCreate(BaseModel):
    node_id: str
    node_name: str
    methane: float
    co: float
    temperature: float
    humidity: float

class ConfigUpdate(BaseModel):
    parameter: str
    value: float

class PanicAlert(BaseModel):
    message: str
    node_id: str = "SYSTEM"
    node_name: str = "Control Room"

# Helper function to get safety thresholds
def get_thresholds(db: Session) -> Dict[str, float]:
    configs = db.query(Config).all()
    return {c.parameter: c.value for c in configs}

# Risk evaluation algorithm
def calculate_risk(methane: float, co: float, temp: float, humidity: float, thresholds: Dict[str, float]) -> tuple[float, str]:
    m_warn = thresholds.get("methane_warning", 1.0)
    m_crit = thresholds.get("methane_critical", 1.5)
    co_warn = thresholds.get("co_warning", 35.0)
    co_crit = thresholds.get("co_critical", 50.0)
    t_warn = thresholds.get("temp_warning", 35.0)
    t_crit = thresholds.get("temp_critical", 40.0)
    h_warn = thresholds.get("humidity_warning", 85.0)
    h_crit = thresholds.get("humidity_critical", 95.0)

    # Sub-indices relative to critical thresholds (0 - 100)
    m_idx = min(100.0, (methane / m_crit) * 100)
    co_idx = min(100.0, (co / co_crit) * 100)
    t_idx = min(100.0, (temp / t_crit) * 100)
    h_idx = min(100.0, (humidity / h_crit) * 100)

    # Weightage formula: Methane is highest threat (45%), CO toxic gas (25%), Temp (20%), Humidity (10%)
    risk_index = (m_idx * 0.45) + (co_idx * 0.25) + (t_idx * 0.20) + (h_idx * 0.10)

    # Direct threshold overrides
    is_critical = (
        methane >= m_crit or
        co >= co_crit or
        temp >= t_crit or
        humidity >= h_crit
    )
    is_warning = (
        methane >= m_warn or
        co >= co_warn or
        temp >= t_warn or
        humidity >= h_warn
    )

    if is_critical:
        risk_level = "CRITICAL"
        risk_index = max(risk_index, 85.0)
    elif is_warning:
        risk_level = "WARNING"
        risk_index = max(risk_index, 50.0)
    else:
        risk_level = "SAFE"

    return round(risk_index, 1), risk_level

@app.get("/api/config")
def get_config(db: Session = Depends(get_db)):
    return db.query(Config).all()

@app.post("/api/config")
def update_config(configs: List[ConfigUpdate], db: Session = Depends(get_db)):
    for conf in configs:
        db_config = db.query(Config).filter(Config.parameter == conf.parameter).first()
        if db_config:
            db_config.value = conf.value
    db.commit()
    return {"status": "success"}

@app.get("/api/alerts")
def get_alerts(resolved: bool = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(Alert)
    if resolved is not None:
        query = query.filter(Alert.resolved == resolved)
    return query.order_by(Alert.timestamp.desc()).limit(limit).all()

@app.post("/api/alerts/resolve/{alert_id}")
async def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved = True
    db.commit()

    await manager.broadcast({
        "type": "ALERT_RESOLVED",
        "data": {"id": alert.id}
    })
    return {"status": "success"}

@app.post("/api/alerts/panic")
async def trigger_panic(payload: PanicAlert, db: Session = Depends(get_db)):
    alert = Alert(
        node_id=payload.node_id,
        node_name=payload.node_name,
        parameter="panic",
        value=1.0,
        threshold=0.0,
        message=f"EMERGENCY EVACUATION ORDER: {payload.message}",
        severity="CRITICAL",
        resolved=False
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    alert_payload = {
        "type": "ALERT",
        "data": {
            "id": alert.id,
            "node_id": alert.node_id,
            "node_name": alert.node_name,
            "parameter": alert.parameter,
            "value": alert.value,
            "threshold": alert.threshold,
            "message": alert.message,
            "severity": alert.severity,
            "timestamp": alert.timestamp.isoformat(),
            "resolved": alert.resolved
        }
    }
    await manager.broadcast(alert_payload)
    return {"status": "success", "alert_id": alert.id}

@app.get("/api/telemetry/history")
def get_history(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Telemetry).order_by(Telemetry.timestamp.desc()).limit(limit).all()

@app.post("/api/telemetry")
async def post_telemetry(payload: TelemetryCreate, db: Session = Depends(get_db)):
    thresholds = get_thresholds(db)
    risk_index, risk_level = calculate_risk(
        payload.methane, payload.co, payload.temperature, payload.humidity, thresholds
    )

    db_telemetry = Telemetry(
        node_id=payload.node_id,
        node_name=payload.node_name,
        methane=payload.methane,
        co=payload.co,
        temperature=payload.temperature,
        humidity=payload.humidity,
        risk_index=risk_index,
        risk_level=risk_level
    )
    db.add(db_telemetry)
    db.commit()
    db.refresh(db_telemetry)

    # Alert triggering evaluation
    alerts_triggered = []
    params = [
        ("methane", payload.methane, "methane_warning", "methane_critical", "%"),
        ("co", payload.co, "co_warning", "co_critical", "ppm"),
        ("temperature", payload.temperature, "temp_warning", "temp_critical", "°C"),
        ("humidity", payload.humidity, "humidity_warning", "humidity_critical", "%")
    ]

    for param_name, val, warn_key, crit_key, unit in params:
        warn_val = thresholds.get(warn_key)
        crit_val = thresholds.get(crit_key)

        if val >= crit_val:
            # Check if unresolved alert already exists to prevent spamming
            existing = db.query(Alert).filter(
                Alert.node_id == payload.node_id,
                Alert.parameter == param_name,
                Alert.severity == "CRITICAL",
                Alert.resolved == False
            ).first()
            if not existing:
                new_alert = Alert(
                    node_id=payload.node_id,
                    node_name=payload.node_name,
                    parameter=param_name,
                    value=val,
                    threshold=crit_val,
                    message=f"CRITICAL: {param_name.capitalize()} reached {val}{unit} (Limit: {crit_val}{unit}) in {payload.node_name}!",
                    severity="CRITICAL"
                )
                db.add(new_alert)
                alerts_triggered.append(new_alert)
        elif val >= warn_val:
            existing = db.query(Alert).filter(
                Alert.node_id == payload.node_id,
                Alert.parameter == param_name,
                Alert.severity == "WARNING",
                Alert.resolved == False
            ).first()
            if not existing:
                new_alert = Alert(
                    node_id=payload.node_id,
                    node_name=payload.node_name,
                    parameter=param_name,
                    value=val,
                    threshold=warn_val,
                    message=f"WARNING: {param_name.capitalize()} is elevated at {val}{unit} (Limit: {warn_val}{unit}) in {payload.node_name}.",
                    severity="WARNING"
                )
                db.add(new_alert)
                alerts_triggered.append(new_alert)

    if alerts_triggered:
        db.commit()
        for alert in alerts_triggered:
            alert_payload = {
                "type": "ALERT",
                "data": {
                    "id": alert.id,
                    "node_id": alert.node_id,
                    "node_name": alert.node_name,
                    "parameter": alert.parameter,
                    "value": alert.value,
                    "threshold": alert.threshold,
                    "message": alert.message,
                    "severity": alert.severity,
                    "timestamp": alert.timestamp.isoformat(),
                    "resolved": alert.resolved
                }
            }
            await manager.broadcast(alert_payload)

    # Broadcast updated telemetry to connected dashboards
    telemetry_payload = {
        "type": "TELEMETRY",
        "data": {
            "id": db_telemetry.id,
            "node_id": db_telemetry.node_id,
            "node_name": db_telemetry.node_name,
            "methane": db_telemetry.methane,
            "co": db_telemetry.co,
            "temperature": db_telemetry.temperature,
            "humidity": db_telemetry.humidity,
            "risk_index": db_telemetry.risk_index,
            "risk_level": db_telemetry.risk_level,
            "timestamp": db_telemetry.timestamp.isoformat()
        }
    }
    await manager.broadcast(telemetry_payload)

    return {"status": "success", "risk_index": risk_index, "risk_level": risk_level}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep socket alive; client can send pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
