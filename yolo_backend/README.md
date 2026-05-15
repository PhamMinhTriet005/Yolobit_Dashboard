# Yolobit Dashboard Backend

Flask-based REST API server for the Yolobit smart farming dashboard. Handles serial communication with Yolobit devices and provides real-time sensor data + command control.

## Features

- **Real-time Serial Communication**: 115200 baud rate with 50ms polling for responsive updates
- **REST API**: JSON endpoints for sensors, health checks, and device commands
- **COM Port Auto-Detection**: Scans and identifies available USB/Bluetooth ports
- **Automatic Telemetry**: 2-second publish cycle for sensor updates
- **Command Protocol**: `!PREFIX:VALUE#` format for device control
- **MQTT Integration**: Publishes sensor data and subscribes to control messages
- **Error Handling**: Graceful fallbacks and detailed logging

## Installation

### 1. Virtual Environment (Recommended)

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configuration

Edit `backend.py` to set your COM port:
```python
SERIAL_PORT = 'COM6'  # Change to your device's port
BAUD_RATE = 115200
TIMEOUT = 2
```

## Running the Server

```bash
python backend.py
```

Server starts on `http://localhost:3000`

## API Endpoints

### Health & Connection
```
GET /api/health
```
Returns connection status and active COM port.

**Response:**
```json
{
  "ok": true,
  "connected": true,
  "port": "COM6"
}
```

### Available Ports
```
GET /api/ports
```
Lists all detected COM ports (USB/Bluetooth).

**Response:**
```json
{
  "ports": [
    {
      "port": "COM6",
      "type": "USB",
      "description": "USB Serial Device"
    }
  ]
}
```

### Sensor Data
```
GET /api/sensors
```
Fetches latest sensor readings from the device.

**Response:**
```json
{
  "data": {
    "V1": 26.3,
    "V2": 51.5,
    "V3": 0,
    "V4": 4000,
    "V5": 4,
    "V6": 0,
    "V7": 0,
    "V10": 0,
    "V11": 0
  },
  "timestamp": 1715689121.345
}
```

### Connect to Device
```
POST /api/connect
```
Connects to a specific COM port.

**Request:**
```json
{
  "port": "COM6"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Connected to COM6"
}
```

### Send Command
```
POST /api/command
```
Sends a control command to the device.

**Request:**
```json
{
  "feed": "V10",
  "value": 1
}
```

**Response:**
```json
{
  "ok": true,
  "feed": "V10",
  "value": 1
}
```

## Command Protocol

Commands are sent in format: `!PREFIX:VALUE#`

### Supported Commands

| Feed | Prefix | Value Range | Description |
|------|--------|-------------|-------------|
| V7 | MODE | 0-2 | Operating mode (0=Manual, 1=Auto, 2=Auto) |
| V10 | PUMP | 0/1 | Pump 1 (0=off, 1=on) |
| V11 | PUMP2 | 0/1 | Pump 2 (0=off, 1=on) |

**Example:**
```
!PUMP:1#    → Turns Pump 1 ON
!MODE:2#    → Sets device to Mode 2
```

## Sensor Variables

| Variable | Code | Description | Range |
|----------|------|-------------|-------|
| Temperature | V1 | Room Temperature | °C |
| Humidity | V2 | Relative Humidity | 0-100% |
| Soil Moisture | V3 | Soil moisture level | 0-100% |
| Light | V4 | Light intensity | LUX |
| GDD | V5 | Growing Degree Days | Integer |
| Status | V6 | System status | Integer |
| Mode | V7 | Operating mode | 0/1/2 |
| Pump 1 State | V10 | Pump 1 status | 0/1 |
| Pump 2 State | V11 | Pump 2 status | 0/1 |

## Hardware Setup

1. **Connect Yolobit via USB** to your computer
2. **Upload Device Code**:
   ```bash
   cd yolo_backend
   mpremote connect /dev/ttyUSB0 fs cp yolobit_code.py :main.py
   ```
3. **Identify COM Port**:
   - Windows: Device Manager → COM & LPT Ports
   - macOS/Linux: `ls /dev/tty*`
4. **Update backend.py** with correct port

## Device Code (`yolobit_code.py`)

Runs on the Yolobit microcontroller and:
- Reads DHT20 temperature/humidity sensor
- Reads analog soil moisture sensor
- Reads light sensor (LUX)
- Controls GPIO pins 10 & 13 for pumps
- Publishes sensor data every 2 seconds
- Subscribes to MQTT commands
- Responds to serial commands

### Auto Control Logic (Modes 1 & 2)
- **Pump ON** when Soil Moisture < 50%
- **Pump OFF** when Soil Moisture > 80%
- Evaluated every 2 seconds

## Troubleshooting

### "Failed to connect" Error

**Solution:**
1. Check port number in `backend.py`
2. Verify device appears in Device Manager
3. Try restarting the device

### Serial Port Permission Denied (Linux/macOS)

**Solution:**
```bash
sudo chmod a+rw /dev/ttyUSB0
```

### Sensors Reading Zero

**Possible Causes:**
- Device code not uploaded correctly
- Sensors not connected to correct GPIO pins
- DHT20 sensor malfunction

**Debug:**
1. Connect to device REPL: `mpremote connect /dev/ttyUSB0 repl`
2. Check sensor readings manually

### Commands Not Working

**Check:**
- Device is in correct MODE (1 or 2 for auto)
- Pump is connected to GPIO 10 or 13
- Backend logs show command received
- Serial connection is active

## Performance Tuning

### Polling Frequency
Backend polls sensors every **50ms** for responsive updates.
Frontend fetches data every **500ms** to reduce network overhead.

### Auto-Control Speed
Device evaluates pump rules every **2 seconds** for stability.

## MQTT Integration

Backend publishes to MQTT broker:
- **Server**: mqtt.ohstem.vn:1883
- **Username**: Final_Boss
- **Topics**: V1, V2, V3, V4, V5, V10, V11

## Docker (Optional)

```bash
docker-compose up
```

Starts Flask backend + MQTT broker in containers.

## Logs

Check console output for:
- `[SENSOR]` - Sensor data updates
- `[COMMAND]` - Commands received
- `[ERROR]` - Connection or parsing errors

## File Structure

```
yolo_backend/
├── backend.py           # Flask REST API
├── yolobit_code.py      # Device firmware
├── requirements.txt     # Python dependencies
├── docker-compose.yml   # Docker config
├── Dockerfile          # Docker image
├── README.md           # This file
└── mosquitto/          # MQTT broker config
    ├── config/
    ├── data/
    └── log/
```

## Dependencies

- **flask**: REST API framework
- **flask-cors**: Cross-origin requests
- **pyserial**: Serial communication
- **json**: Data serialization

See `requirements.txt` for versions.

## License

MIT

## Support

For issues:
1. Check the troubleshooting section
2. Review console logs for error messages
3. Verify device connection and COM port
4. Restart both backend and device

