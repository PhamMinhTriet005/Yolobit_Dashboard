import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import './App.css';

const BACKEND_URL = 'http://localhost:3000';
const DEFAULT_PORT = 'COM6';
const LAST_PORT_KEY = 'yolobit:lastPort';

function App() {
  const [connected, setConnected] = useState(false);
  const [lastSensorUpdate, setLastSensorUpdate] = useState(0);
  const [sensors, setSensors] = useState({ V1: 0, V2: 0, V3: 0, V4: 0, V5: 0, V6: 0 });
  const [controls, setControls] = useState({ V7: 0, V10: 0, V11: 0 });
  const [manualPump1, setManualPump1] = useState(null); 
  const [manualPump2, setManualPump2] = useState(null); 
  const [lightHistory, setLightHistory] = useState([]);
  const [smHistory, setSmHistory] = useState([]);
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState(() => localStorage.getItem(LAST_PORT_KEY) || DEFAULT_PORT);
  const [showConnectModal, setShowConnectModal] = useState(true);
  const [isLoadingPorts, setIsLoadingPorts] = useState(false);

  // Fetch sensor data periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/sensors`);
        if (response.ok) {
          const data = await response.json();
          const now = Date.now();
          setLastSensorUpdate(now);
          setConnected(true);
          setShowConnectModal(false);
          setSensors(prev => ({...data.data, V6: 0}));
          
          const deviceV10 = Number(data.data?.V10);
          const deviceV11 = Number(data.data?.V11);
          setControls(prev => {
            setManualPump1(current => (current !== null && Number(current) === deviceV10) ? null : current);
            setManualPump2(current => (current !== null && Number(current) === deviceV11) ? null : current);
            
            return {
              ...prev,
              V7: Number(data.data?.V7 ?? prev.V7),
              V10: deviceV10 ?? prev.V10,
              V11: deviceV11 ?? prev.V11,
            };
          });
          
          // Add to history
          setLightHistory(prev => [...prev, { time: new Date().toLocaleTimeString(), value: data.data.V4 }].slice(-20));
          setSmHistory(prev => [...prev, { time: new Date().toLocaleTimeString(), value: data.data.V3 }].slice(-20));
        }
      } catch (error) {
        console.error('Fetch error:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Automatic Pump 1 Control Logic
  useEffect(() => {
    // Only auto-control in Mode 1 or Mode 2
    if (controls.V7 === 1 || controls.V7 === 2) {
      const sm = Number(sensors.V3 || 0);
      const pumpState = Number(controls.V10 || 0);

      if (sm < 50 && pumpState === 0) {
        console.log('[AUTO] SM < 50%, turning PUMP 1 ON');
        sendCommand('V10', 1);
      } else if (sm > 80 && pumpState === 1) {
        console.log('[AUTO] SM > 80%, turning PUMP 1 OFF');
        sendCommand('V10', 0);
      }
    }
  }, [sensors.V3, controls.V7, controls.V10]);

  useEffect(() => {
    fetchAvailablePorts();
  }, []);

  // Check backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/health`);
        if (response.ok) {
          const data = await response.json();
          const now = Date.now();
          const hasRecentTelemetry = now - lastSensorUpdate < 8000;
          const isOnline = data.connected || hasRecentTelemetry;

          setConnected(isOnline);
          if (!isOnline) {
            setShowConnectModal(true);
            fetchAvailablePorts();
          } else {
            setShowConnectModal(false);
          }
        }
      } catch (error) {
        setConnected(false);
        setShowConnectModal(true);
        fetchAvailablePorts();
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendCommand = async (feed, value) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feed, value }),
      });
      if (response.ok) {
        setControls(prev => ({ ...prev, [feed]: value }));
        if (feed === 'V10') setManualPump1(Number(value));
        if (feed === 'V11') setManualPump2(Number(value));
      }
    } catch (error) {
      console.error('Command error:', error);
    }
  };

  const fetchAvailablePorts = async () => {
    setIsLoadingPorts(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ports`);
      if (response.ok) {
        const data = await response.json();
        const ports = data.ports || [];
        setAvailablePorts(ports);

        const savedPort = localStorage.getItem(LAST_PORT_KEY);
        const savedPortStillAvailable = savedPort && ports.some((port) => port.port === savedPort);
        const defaultPortStillAvailable = ports.some((port) => port.port === DEFAULT_PORT);

        if (savedPortStillAvailable) {
          setSelectedPort(savedPort);
        } else if (defaultPortStillAvailable) {
          setSelectedPort(DEFAULT_PORT);
        } else if (ports.length > 0) {
          setSelectedPort(ports[0].port);
        }
      }
    } catch (error) {
      console.error('Error fetching ports:', error);
    } finally {
      setIsLoadingPorts(false);
    }
  };

  const connectToPort = async () => {
    if (!selectedPort) {
      alert('Please select a port');
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: selectedPort }),
      });
      if (response.ok) {
        localStorage.setItem(LAST_PORT_KEY, selectedPort);
        setConnected(true);
        setShowConnectModal(false);
      } else {
        alert('Failed to connect to port');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const boundedSM = Math.min(Math.max(sensors.V3 || 0, 0), 100);
  const gaugeRotation = (boundedSM / 100) * 180 - 90;
  
  const pump1State = (manualPump1 !== null) ? Number(manualPump1) : Number(controls.V10);
  const pump2State = (manualPump2 !== null) ? Number(manualPump2) : Number(controls.V11);
  const pump1SwitchChecked = pump1State === 1;
  const pump2SwitchChecked = pump2State === 1;

  const getModeColor = () => {
    const mode = Number(controls.V7);
    if (mode === 0) return '#38ef7d'; // green
    if (mode === 1) return '#f2c94c'; // yellow
    if (mode === 2) return '#ff4b2b'; // red
    return '#666';
  };

  return (
    <div className="dashboard-container">
      {showConnectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Connect to Yolobit</h2>
            <p>{connected ? 'Backend is live. Choose the board port to attach.' : 'Select a COM port to connect:'}</p>
            <div className="modal-help">
              COM6 is the verified board port in this workspace.
            </div>
            <select 
              value={selectedPort} 
              onChange={(e) => setSelectedPort(e.target.value)}
              className="port-select"
              disabled={isLoadingPorts}
            >
              <option value="">{isLoadingPorts ? '-- Loading ports --' : '-- Select Port --'}</option>
              {availablePorts.map((port) => (
                <option key={port.port} value={port.port}>
                  {port.port} ({port.type}) - {port.description}
                </option>
              ))}
            </select>
            <button onClick={connectToPort} className="connect-btn" disabled={!selectedPort || isLoadingPorts}>Connect</button>
            <button onClick={fetchAvailablePorts} className="refresh-btn">Refresh Ports</button>
          </div>
        </div>
      )}
      
      <div className="dashboard">
        <div className="connection-status">
          <span className={`status-pill ${connected ? 'status-on' : 'status-off'}`}>
            {connected ? 'Device connected' : 'Device disconnected'}
          </span>
          <span className="status-text">Backend: {connected ? 'online' : 'online, waiting for device'}</span>
          <span className="status-text">Port: {selectedPort || 'none selected'}</span>
        </div>
        
        <div className="top-row">
          <div className="metric-box bg-red">
            <div className="metric-title">RT</div>
            <div className="metric-value">{sensors.V1}°C</div>
          </div>
          <div className="metric-box bg-blue">
            <div className="metric-title">RH</div>
            <div className="metric-value">{sensors.V2}%</div>
          </div>
          <div className="metric-box bg-orange">
            <div className="metric-title">STATUS</div>
            <div className="metric-value">{sensors.V6}</div>
          </div>
          <div className="metric-box bg-green">
            <div className="metric-title">GDD</div>
            <div className="metric-value">{sensors.V5}</div>
          </div>
          
          <div className="gauge-section">
            <div className="gauge-title">SM</div>
            <div className="gauge-wrapper">
              <svg viewBox="0 0 200 120" className="gauge-svg">
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#ff4b2b" strokeWidth="18" />
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#f2c94c" strokeWidth="18" strokeDasharray="201 251.3" />
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#38ef7d" strokeWidth="18" strokeDasharray="125.6 251.3" />
                
                <g transform={`translate(100, 100) rotate(${gaugeRotation})`}>
                    <polygon points="-4,0 4,0 0,-70" fill="#fff" />
                    <circle cx="0" cy="0" r="7" fill="#fff" />
                </g>
                <text x="100" y="85" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="bold">
                  {boundedSM}%
                </text>
              </svg>
            </div>
          </div>
        </div>

        <div className="middle-row">
          <div className="chart-box">
            <div className="chart-title">Light</div>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={lightHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#12d8fa" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#12d8fa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" hide />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a0aab5', fontSize: 12}} />
                <Tooltip contentStyle={{ backgroundColor: '#1a2634', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="value" stroke="#12d8fa" fillOpacity={1} fill="url(#colorLight)" strokeWidth={3} isAnimationActive={true} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="chart-box">
            <div className="chart-title">SM</div>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={smHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38ef7d" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#38ef7d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" hide />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a0aab5', fontSize: 12}} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#1a2634', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="value" stroke="#38ef7d" fillOpacity={1} fill="url(#colorSM)" strokeWidth={3} isAnimationActive={true} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pumps-column">
            <div className="pump-card">
              <div className="pump-title">Pump 1</div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={pump1SwitchChecked} 
                  onChange={(e) => sendCommand('V10', e.target.checked ? 1 : 0)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
            
            <div className="pump-card">
              <div className="pump-title">Pump 2</div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={pump2SwitchChecked} 
                  onChange={(e) => sendCommand('V11', e.target.checked ? 1 : 0)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="bottom-row">
          <div className="slider-box">
              <div className="slider-header">
                  <span>MODE</span>
                  <span>{controls.V7}</span>
              </div>
              <div className="slider-track-container" style={{ backgroundColor: getModeColor(), border: 'none', transition: 'background-color 0.3s' }}>
                <input 
                    type="range" 
                    min="0" max="2" 
                    value={Number(controls.V7)} 
                    onChange={(e) => sendCommand('V7', parseInt(e.target.value))} 
                    className="range-slider"
                    style={{ background: getModeColor() }}
                />
              </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
