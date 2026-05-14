# Yolobit Dashboard

A real-time monitoring and control dashboard for Yolobit smart farming devices. Control pumps, set modes, and monitor environmental sensors (temperature, humidity, soil moisture, light) through a modern web interface.

## Features

- **Real-time Monitoring**: Live sensor data display (RT, RH, SM, LUX, GDD)
- **Pump Control**: Manual on/off control for 2 pumps with visual toggle switches
- **Auto Mode**: Automatic pump activation based on soil moisture thresholds
- **Mode Selection**: 3 operating modes (0=Manual, 1=Auto Moisture, 2=Auto Moisture) with color indicators
- **Fast Updates**: 500ms refresh rate for responsive dashboard
- **Multi-port Support**: Automatic detection of available COM ports
- **Data Visualization**: Historical charts for light and soil moisture trends

## Project Structure

```
YolobitDashboard/
├── src/                    # React frontend
│   ├── App.jsx            # Main dashboard component
│   ├── App.css            # Dashboard styles
│   ├── main.jsx           # React entry point
│   └── index.css           # Global styles
├── yolo_backend/          # Python Flask backend
│   ├── backend.py         # Flask REST API server
│   ├── yolobit_code.py    # Yolobit device code
│   ├── requirements.txt    # Python dependencies
│   ├── docker-compose.yml # MQTT broker configuration
│   └── Dockerfile         # Docker setup
├── package.json           # Node dependencies
├── vite.config.js         # Vite configuration
└── index.html             # HTML entry point
```

## Quick Start

### Prerequisites
- Node.js 16+
- Python 3.7+
- Yolobit device connected via USB
- MQTT broker (optional, for MQTT features)

### Setup & Run

**1. Frontend Setup**
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

**2. Backend Setup**
```bash
cd yolo_backend
pip install -r requirements.txt
python backend.py
```
Backend runs on `http://localhost:3000`.

**3. Device Setup**
- Upload `yolobit_code.py` to your Yolobit device using mpremote
- Ensure device is connected on COM6 (or configure the correct port)

## Configuration

### Backend Port Selection
Edit `yolo_backend/backend.py`:
```python
SERIAL_PORT = 'COM6'  # Change to your device's COM port
BAUD_RATE = 115200
```

### Frontend API URL
Edit `src/App.jsx`:
```javascript
const BACKEND_URL = 'http://localhost:3000';
```

## API Reference

### Health & Ports
- `GET /api/health` - Check connection status
- `GET /api/ports` - List available COM ports

### Sensors
- `GET /api/sensors` - Get latest sensor values

### Commands
- `POST /api/command` - Send control command
  ```json
  {
    "feed": "V7",
    "value": 1
  }
  ```

## Control Mapping

| Feed | Device | Values | Description |
|------|--------|--------|-------------|
| V7 | MODE | 0-2 | Operating mode |
| V10 | PUMP 1 | 0/1 | Pump 1 control |
| V11 | PUMP 2 | 0/1 | Pump 2 control |

## Sensor Data

| Variable | Code | Type | Range |
|----------|------|------|-------|
| Temperature | V1 | float | °C |
| Humidity | V2 | float | % |
| Soil Moisture | V3 | int | 0-100 |
| Light | V4 | int | LUX |
| GDD | V5 | int | units |
| Status | V6 | int | - |

## Key Features

### MODE Colors
- 🟢 **Mode 0 (Green)**: Manual mode
- 🟡 **Mode 1 (Yellow)**: Auto moisture control
- 🔴 **Mode 2 (Red)**: Auto moisture control

### Auto Pump Control (Modes 1 & 2)
- Pump ON when soil moisture < 50%
- Pump OFF when soil moisture > 80%
- Evaluated every 2 seconds for fast response

### Pump Control Logic
- Button ON → Pump runs
- Button OFF → Pump stops
- UI state synchronized with device state (500ms updates)

## Troubleshooting

**Device not connecting?**
- Check COM port in backend configuration
- Verify Yolobit is powered and connected via USB
- Look for device in Device Manager (Windows)

**Pump not responding?**
- Verify pump is connected to correct GPIO pins (10, 13)
- Check MODE is set to 1 or 2 for auto control
- Ensure soil moisture sensor is calibrated

**Slow data updates?**
- Check network latency to backend
- Verify Flask server is running (`http://localhost:3000/api/health`)
- Backend telemetry interval is 2 seconds minimum

## License

MIT

## Contact

For issues or questions, check the GitHub repository or contact the development team.

