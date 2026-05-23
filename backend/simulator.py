import time
import random
import requests

API_URL = "http://127.0.0.1:8000/api/telemetry"

nodes = {
    "shaft_a": {
        "name": "Shaft A (Main Intake)",
        "methane": 0.05,
        "co": 2.0,
        "temp": 23.5,
        "humidity": 60.0,
        "methane_drift": (-0.01, 0.01),
        "co_drift": (-0.3, 0.3),
        "temp_drift": (-0.2, 0.2),
        "humidity_drift": (-0.5, 0.5),
        "methane_bounds": (0.01, 0.3),
        "co_bounds": (0, 8),
        "temp_bounds": (20, 26),
        "humidity_bounds": (50, 70)
    },
    "shaft_b": {
        "name": "Shaft B (Deep Extraction)",
        "methane": 0.8,
        "co": 18.0,
        "temp": 32.0,
        "humidity": 80.0,
        "methane_drift": (-0.05, 0.05),
        "co_drift": (-1.0, 1.0),
        "temp_drift": (-0.4, 0.4),
        "humidity_drift": (-1.0, 1.0),
        "methane_bounds": (0.3, 1.4),
        "co_bounds": (5, 38),
        "temp_bounds": (27, 37),
        "humidity_bounds": (70, 90)
    },
    "tunnel_c": {
        "name": "Tunnel C (Gassy Seam)",
        "methane": 1.1,
        "co": 28.0,
        "temp": 36.0,
        "humidity": 88.0,
        "methane_drift": (-0.08, 0.08),
        "co_drift": (-2.0, 2.0),
        "temp_drift": (-0.5, 0.5),
        "humidity_drift": (-1.2, 1.2),
        "methane_bounds": (0.6, 2.3),
        "co_bounds": (10, 58),
        "temp_bounds": (30, 43),
        "humidity_bounds": (75, 98)
    }
}

def drift_value(val, drift_range, bounds):
    val += random.uniform(*drift_range)
    val = max(bounds[0], min(bounds[1], val))
    return round(val, 2)

print("Starting Coal Mine Telemetry Simulator...")
print(f"Targeting API Endpoint: {API_URL}")
print("Press Ctrl+C to stop.")

while True:
    for node_id, config in nodes.items():
        # Apply drift
        config["methane"] = drift_value(config["methane"], config["methane_drift"], config["methane_bounds"])
        config["co"] = drift_value(config["co"], config["co_drift"], config["co_bounds"])
        config["temp"] = drift_value(config["temp"], config["temp_drift"], config["temp_bounds"])
        config["humidity"] = drift_value(config["humidity"], config["humidity_drift"], config["humidity_bounds"])

        payload = {
            "node_id": node_id,
            "node_name": config["name"],
            "methane": config["methane"],
            "co": config["co"],
            "temperature": config["temp"],
            "humidity": config["humidity"]
        }

        try:
            res = requests.post(API_URL, json=payload, timeout=2)
            if res.status_code == 200:
                data = res.json()
                print(f"[{time.strftime('%H:%M:%S')}] Pushed {config['name']} -> Methane: {config['methane']}%, CO: {config['co']} ppm, Temp: {config['temp']}°C, Hum: {config['humidity']}% | Risk: {data.get('risk_level')} ({data.get('risk_index')})")
            else:
                print(f"Error pushing data for {node_id}: HTTP {res.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"Failed to connect to API server: {e}. Retrying in next cycle...")
    
    time.sleep(2.0)
