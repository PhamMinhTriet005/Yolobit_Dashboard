import { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import './App.css';

const MQTT_BROKER = 'wss://mqtt.ohstem.vn:8084/mqtt';
const USERNAME = 'Final_Boss';
const PASSWORD = '';

function App() {
  const [client, setClient] = useState(null);
  const [sensors, setSensors] = useState({ V1: 0, V2: 0, V3: 0, V4: 0, V5: 0, V6: 0 });
  const [controls, setControls] = useState({ V7: '0', V10: '0', V11: '0' });
  const [lightHistory, setLightHistory] = useState([]);
  const [smHistory, setSmHistory] = useState([]);

  useEffect(() => {
    const mqttClient = mqtt.connect(MQTT_BROKER, {
      username: USERNAME,
      password: PASSWORD,
      clientId: `web_dashboard_${Math.random().toString(16).slice(3)}`,
    });

    mqttClient.on('connect', () => {
      ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V10', 'V11'].forEach(feed => {
        mqttClient.subscribe(`${USERNAME}/feeds/${feed}`);
      });
    });

    mqttClient.on('message', (topic, message) => {
      const payload = message.toString();
      const feed = topic.split('/').pop();

      if (['V1', 'V2', 'V3', 'V4', 'V5', 'V6'].includes(feed)) {
        const val = parseFloat(payload);
        setSensors(prev => ({ ...prev, [feed]: isNaN(val) ? 0 : val }));
        
        if (feed === 'V4') setLightHistory(prev => [...prev, { time: new Date().toLocaleTimeString(), value: val }].slice(-20));
        if (feed === 'V3') setSmHistory(prev => [...prev, { time: new Date().toLocaleTimeString(), value: val }].slice(-20));
      } else if (['V7', 'V10', 'V11'].includes(feed)) {
        setControls(prev => ({ ...prev, [feed]: payload }));
      }
    });

    setClient(mqttClient);
    return () => mqttClient.end();
  }, []);

  const publishControl = (feed, value) => {
    if (client) {
      client.publish(`${USERNAME}/feeds/${feed}`, value.toString());
      setControls(prev => ({ ...prev, [feed]: value.toString() }));
    }
  };

  const boundedSM = Math.min(Math.max(sensors.V3 || 0, 0), 100);
  const gaugeRotation = (boundedSM / 100) * 180 - 90;

  return (
    <div className="dashboard-container">
      <div className="dashboard">
        
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
                  checked={controls.V10 === '1'} 
                  onChange={(e) => publishControl('V10', e.target.checked ? '1' : '0')} 
                />
                <span className="slider round"></span>
              </label>
            </div>
            
            <div className="pump-card">
              <div className="pump-title">Pump 2</div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={controls.V11 === '1'} 
                  onChange={(e) => publishControl('V11', e.target.checked ? '1' : '0')} 
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
              <div className="slider-track-container">
                <input 
                    type="range" 
                    min="0" max="2" 
                    value={Number(controls.V7)} 
                    onChange={(e) => publishControl('V7', e.target.value)} 
                    className="range-slider"
                />
              </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
