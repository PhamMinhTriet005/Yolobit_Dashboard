from flask import Flask, jsonify, request
from flask_cors import CORS
import serial
from serial.tools import list_ports
import json
import threading
import time
import os
from collections import deque

app = Flask(__name__)
CORS(app)

# Configuration
SERIAL_PORT = 'COM6'  # Change to your Yolobit COM port (COM3, COM4, etc. on Windows)
BAUD_RATE = 115200
TIMEOUT = 2

# Sensor data storage
sensor_data = {
    'V1': 0,  # RT (Temperature)
    'V2': 0,  # RH (Humidity)
    'V3': 0,  # SM (Soil Moisture)
    'V4': 0,  # LUX (Light)
    'V5': 0,  # GDD
    'V6': 0,  # Status
    'V7': 0,  # Mode
    'V10': 0,  # Pump
    'V11': 0,  # Pump 2
}

ser = None
running = False
last_update = {}

def detect_connection_type(port):
    """Detect if port is USB or Bluetooth"""
    for port_info in list_ports.comports():
        if port_info.device == port:
            description = port_info.description.lower()
            if 'bluetooth' in description:
                return 'BLUETOOTH'
            elif 'usb' in description or 'ch340' in description or 'ftdi' in description:
                return 'USB'
            return 'UNKNOWN'
    return None

def get_available_ports():
    """List all available COM ports"""
    ports = []
    for port_info in list_ports.comports():
        desc = port_info.description.lower()
        # Look for likely Yolobit ports
        if any(chip in desc for chip in ['ch340', 'ftdi', 'usb', 'bluetooth']):
            conn_type = detect_connection_type(port_info.device)
            ports.append({
                'port': port_info.device,
                'type': conn_type or 'UNKNOWN',
                'description': port_info.description
            })
    return ports

def connect_yolobit():
    """Connect to Yolobit via USB/Serial"""
    global ser
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=TIMEOUT)
        print(f"Connected to Yolobit on {SERIAL_PORT}")
        return True
    except Exception as e:
        print(f"Failed to connect: {e}")
        return False

def upload_code_to_yolobit():
    """Upload Python code to Yolobit via serial"""
    global ser, running
    
    old_running = False
    
    if not ser or not ser.is_open:
        print("Serial connection not available")
        return False
    
    try:
        # Get the directory of this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        code_file = os.path.join(script_dir, 'yolobit_code.py')
        
        # Read the yolobit code
        if not os.path.exists(code_file):
            print(f"Code file not found: {code_file}")
            return False
        
        print(f"Reading code from: {code_file}")
        with open(code_file, 'r') as f:
            code = f.read()
        
        print(f"Code length: {len(code)} bytes")
        
        # Stop the sensor reading thread temporarily
        print("Stopping sensor reader...")
        old_running = running
        running = False
        time.sleep(0.5)
        
        # Close and re-open connection fresh
        print("Reopening connection...")
        if ser and ser.is_open:
            ser.close()
            time.sleep(0.5)
        
        try:
            ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=TIMEOUT, write_timeout=2)
            # Explicitly set flow control
            ser.rtscts = False
            ser.dsrdtr = False
            ser.setRTS(False)
            ser.setDTR(True)
            print(f"Connection reopened: {SERIAL_PORT}")
        except Exception as e:
            print(f"Failed to reopen connection: {e}")
            return False
        
        # Clear any pending data
        ser.reset_input_buffer()
        ser.reset_output_buffer()
        time.sleep(0.5)
        
        # Try to send code directly without control characters
        print("Uploading code...")
        lines = code.split('\n')
        success_count = 0
        
        # Try to read any initial data from device
        print("Reading any initial data from device...")
        time.sleep(0.5)
        try:
            if ser.in_waiting > 0:
                init_data = ser.readline()
                print(f"Device sent: {init_data}")
        except:
            pass
        
        time.sleep(0.5)
        
        for i, line in enumerate(lines):
            try:
                if line.strip():  # Only send non-empty lines
                    ser.write((line + '\n').encode())
                    success_count += 1
                time.sleep(0.1)  # Slower transmission
            except Exception as e:
                print(f"Warning: Error writing line {i+1}: {e}")
                # Continue anyway
        
        print(f"Successfully wrote {success_count}/{len(lines)} lines")
        time.sleep(1)
        
        print("Code upload completed!")
        return True
        
    except Exception as e:
        print(f"Upload failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Resume sensor thread if it was running
        if old_running:
            print("Resuming sensor reader...")
            running = old_running

def read_sensor_data():
    """Read sensor data from Yolobit serial output"""
    global ser, sensor_data
    
    if not ser:
        return
    
    try:
        while running:
            if ser.in_waiting > 0:
                line = ser.readline().decode().strip()
                
                # Try JSON format first: {"V1": 23.5}
                if line.startswith('{') and line.endswith('}'):
                    try:
                        data = json.loads(line)
                        for key, value in data.items():
                            if key in sensor_data:
                                sensor_data[key] = value
                                last_update[key] = time.time()
                        print(f"[SENSOR] Updated (JSON): {data}")
                    except json.JSONDecodeError:
                        pass
                
                # Try comma-separated format: T:25.5,H:65.0,S:45.2,L:800
                # This is used by the reference project (lamelihuynh/smart-farm)
                elif ':' in line and ',' in line:
                    try:
                        parts = line.split(',')
                        data = {}
                        for p in parts:
                            if ':' in p:
                                k, v = p.split(':', 1)
                                k = k.strip()
                                v = float(v.strip())
                                data[k] = v
                        
                        # Map reference format (T,H,S,L) to our format (V1-V4)
                        format_map = {'T': 'V1', 'H': 'V2', 'S': 'V3', 'L': 'V4'}
                        for src, dst in format_map.items():
                            if src in data and dst in sensor_data:
                                sensor_data[dst] = data[src]
                                last_update[dst] = time.time()
                        
                        print(f"[SENSOR] Updated (CSV): {data}")
                    except Exception as e:
                        print(f"[SENSOR] Parse error: {e}")
            
            time.sleep(0.1)
    except Exception as e:
        print(f"[SENSOR] Read error: {e}")

def start_sensor_thread():
    """Start background thread to read sensors"""
    global running
    running = True
    thread = threading.Thread(target=read_sensor_data, daemon=True)
    thread.start()

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'ok': True,
        'connected': ser is not None and ser.is_open,
        'port': SERIAL_PORT
    })

@app.route('/api/ports', methods=['GET'])
def list_ports_endpoint():
    """List available COM ports for Yolobit"""
    ports = get_available_ports()
    return jsonify({
        'ports': ports
    })

@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    """Fetch current sensor data"""
    return jsonify({
        'data': sensor_data,
        'timestamp': time.time()
    })

@app.route('/api/command', methods=['POST'])
def send_command():
    """Send command to Yolobit using correct protocol format"""
    data = request.json
    feed = data.get('feed')  # V7, V10, V11, etc.
    value = data.get('value')
    
    if not ser or not ser.is_open:
        return jsonify({'error': 'Not connected to Yolobit'}), 400
    
    try:
        # Map sensor keys to command prefixes (reference: lamelihuynh/smart-farm)
        # Command format: !{PREFIX}:{VALUE}#\n
        prefix_map = {
            'V7': 'MODE',      # Mode (0-2)
            'V10': 'PUMP',     # Pump 1
            'V11': 'LIGHT',    # Light control
        }
        
        prefix = prefix_map.get(feed, feed)
        command = f"!{prefix}:{int(value)}#\n"
        print(f"[COMMAND] Sending: {command.strip()}")
        ser.write(command.encode())
        
        # Update local state
        sensor_data[feed] = value
        
        return jsonify({'ok': True, 'feed': feed, 'value': value})
    except Exception as e:
        print(f"[ERROR] Command failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_code():
    """Code upload is not supported via raw serial writes.

    Use the VS Code mpremote task to upload yolo_backend/yolobit_code.py
    to the device as main.py.
    """
    return jsonify({
        'error': 'Code upload via /api/upload is not supported',
        'solution': 'Use the VS Code task "Upload Yolobit code via mpremote"',
    }), 501

@app.route('/api/connect', methods=['POST'])
def connect():
    """Connect to Yolobit"""
    global ser, SERIAL_PORT
    port = request.json.get('port') if request.json else SERIAL_PORT
    
    if not port:
        return jsonify({'error': 'No port specified'}), 400
    
    # Close existing connection if any
    if ser and ser.is_open:
        ser.close()
    
    # Update global port
    SERIAL_PORT = port
    
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=TIMEOUT)
        print(f"Connected to {SERIAL_PORT}")
        start_sensor_thread()
        return jsonify({'ok': True, 'message': f'Connected to {port}'})
    except Exception as e:
        print(f"Failed to connect: {e}")
        return jsonify({'error': f'Failed to connect to {port}: {str(e)}'}), 500

if __name__ == '__main__':
    try:
        print("Starting Yolobit backend...")
        print(f"Make sure Yolobit is connected on {SERIAL_PORT}")
        
        app.run(host='0.0.0.0', port=3000, debug=False)
    finally:
        running = False
        if ser:
            ser.close()
