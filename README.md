# COAL-MINE-SAFTY-SYSTEM
A smart mine safety monitoring system designed to track critical environmental parameters inside mining areas in real time. The project helps improve worker safety by continuously monitoring hazardous conditions and generating instant alerts during emergencies.

✨ Features
🔥 Gas Level Monitoring
Detects hazardous gases:
Methane (CH₄)
Carbon Monoxide (CO)
Displays live gas concentration levels
Threshold-based warning alerts
🌡️ Temperature & Humidity Tracking
Real-time environmental monitoring
Live temperature and humidity graphs
Abnormal condition detection
🚨 Emergency Alert System
Instant alerts when dangerous conditions are detected
Visual warning indicators
Alarm/notification support
📊 Live Dashboard
Real-time sensor updates
Dynamic charts and analytics
User-friendly responsive interface
🤖 Risk Prediction Alerts
Predicts unsafe conditions using predefined logic or ML models
Early warning system for mine workers
🛠️ Tech Stack
Frontend
React.js / HTML / CSS
JavaScript
Chart.js / Recharts
Backend
Python (Flask/Django) or Java (Spring Boot)
Database
MySQL / Firebase
Hardware (Optional)
MQ Gas Sensors
DHT11/DHT22 Temperature & Humidity Sensors
ESP32 / Arduino / Raspberry Pi
🏗️ System Architecture
IoT Sensors → Microcontroller → Backend Server → Database → Web Dashboard
⚙️ Installation & Setup
1️⃣ Clone Repository
git clone https://github.com/your-username/mine-safety-dashboard.git
cd mine-safety-dashboard
🚀 Frontend Setup
cd frontend
npm install
npm start

Runs on:

http://localhost:3000
🚀 Backend Setup (Python)
Install Dependencies
pip install -r requirements.txt
Run Server
python app.py
🚀 Backend Setup (Java - Optional)
mvn spring-boot:run
🗄️ Database Configuration
MySQL

Update database credentials in:

backend/config.py

OR

Firebase

Add Firebase configuration keys in:

frontend/firebase-config.js
📡 IoT Sensor Integration

Supported Sensors:

MQ-2 / MQ-7 Gas Sensors
DHT11/DHT22
ESP32 / Arduino

Sensor data can be sent using:

HTTP APIs
MQTT Protocol
Firebase Realtime Database
📈 Dashboard Functionalities
Live sensor cards
Real-time charts
Alert notifications
Risk status indicators
Historical data logs
🧠 Risk Prediction Logic

The system predicts dangerous situations based on:

Gas concentration thresholds
Temperature spikes
Combined environmental conditions

Example:

if methane > threshold and temperature > limit:
    risk = "HIGH"
🔒 Safety Features
Real-time alerts
Emergency warning system
Continuous monitoring
Hazard prediction
Data logging for analysis
📸 Screenshots
Dashboard

Sensor Monitoring

Emergency Alerts


🔮 Future Enhancements
AI-based accident prediction
Mobile application support
SMS/Email emergency alerts
GPS-based worker tracking
Cloud deployment
Voice alert system

⭐ Acknowledgements
IoT Community
Open Source Libraries
Mining Safety Research References
📬 Contact

For suggestions or collaboration:

Email: your-verma.preeti.eng@gmail.com
GitHub: your-Git-Code2511
