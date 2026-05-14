# Yolobit Backend - Complete Setup

## Overview
This backend connects directly to your Yolobit device via USB/Serial, manages code uploads, and relays sensor data to the frontend dashboard.

## Architecture

```
Frontend (React)
    ↓ HTTP fetch
Backend (Python Flask)
    ↓ Serial (USB/COM)
Yolobit Device (runs uploaded code)
```

## Setup

### 1. Install Python Dependencies

```bash
cd yolo_backend
pip install -r requirements.txt
```

### 2. Find Your Yolobit COM Port

**Windows:**
- Open Device Manager
- Look for "USB Serial Device" or similar
- Note the COM port (e.g., COM3, COM4)

**Update in backend.py:**
```python
SERIAL_PORT = 'COM3'  # Change to your port
```

### 3. Run Backend

```bash
python backend.py
```

You should see:
```
Starting Yolobit backend...
Make sure Yolobit is connected on COM3
 * Running on http://0.0.0.0:3000
```

### 4. Connect and Upload Code

From frontend dashboard:
1. Click "Upload Code" button
2. Backend will:
   - Connect to Yolobit via USB
   - Upload `yolobit_code.py` 
   - Start sensor reading loop
3. Watch sensor data stream in dashboard

## API Endpoints

### Health Check
```
GET http://localhost:3000/api/health
Response: { ok: true, connected: true, port: "COM3" }
```

### Get Sensors
```
GET http://localhost:3000/api/sensors
Response: { 
  data: { 
    V1: 23.5,  // Temperature
    V2: 65,    // Humidity
    V3: 45,    // Soil Moisture
    V4: 2100,  // Light
    V5: 12,    // GDD
    V6: 1,     // Status/Mode
    V7: 1,     // Mode
    V10: 0,    // Pump 1
    V11: 0     // Pump 2
  },
  timestamp: 1715598123
}
```

### Send Command
```
POST http://localhost:3000/api/command
Content-Type: application/json
{
  "feed": "V7",
  "value": 1
}
```

### Upload Code
```
POST http://localhost:3000/api/upload
Response: { ok: true, message: "Code uploaded and running" }
```

### Connect to Port
```
POST http://localhost:3000/api/connect
Content-Type: application/json
{ "port": "COM3" }
```

## Serial Communication Protocol

**Device → Backend (JSON):**
```json
{"V1": 23.5, "V2": 65, "V3": 45, "V4": 2100}
```

**Backend → Device (Commands):**
```
COMMAND:V7:1    // Set MODE to 1
COMMAND:V10:1   // Turn pump 1 on
COMMAND:V11:0   // Turn pump 2 off
```

## Troubleshooting

### "Failed to connect"
- Check COM port is correct in `backend.py`
- Ensure Yolobit is connected via USB
- Try: `python -m serial.tools.list_ports` (list available ports)

### No sensor data
- Check code upload succeeded (look for messages in console)
- Verify Yolobit has DHT20 sensor connected
- Check Device Manager for COM port activity

### Upload hangs
- Try: Hold Yolobit Reset button while uploading
- Or disconnect/reconnect USB and retry

## Code Structure

- `backend.py` - Flask app with serial handling
- `yolobit_code.py` - Code uploaded to device
- `requirements.txt` - Python dependencies

## Next Steps

1. Modify `yolobit_code.py` to customize device behavior
2. Add persistence (database) for sensor history
3. Deploy backend on a Raspberry Pi or cloud server
4. Add authentication for production use

