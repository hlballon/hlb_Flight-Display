/**
 * HLB Flight Display
 * Author: Hilmar Lorenz
 * Development assistance: Grok (xAI)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

// Proxy URL (credentials stay on the server)
const MQTT_BROKER = 'ws://w471.gimmbh.com:51884/mqtt'
const MQTT_TOPIC = 'balloon/readings'
const MQTT_TOPIC_REQUEST = 'balloon/request_sounding'

// Data source URLs (from original)
const LOG_FILE_URL = 'https://raw.githubusercontent.com/hlballon/B_DSound/refs/heads/main/replay.jsonl'
const WEATHER_FILE_URL = 'https://raw.githubusercontent.com/hlballon/hltemp/refs/heads/main/temp_w.txt'

function App() {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected')
  const [dataSource, setDataSource] = useState('mqtt') // 'mqtt' | 'replay'
  const [latestData, setLatestData] = useState(null)
  const [points, setPoints] = useState([])
  const [userAltMin, setUserAltMin] = useState(0)
  const [userAltMax, setUserAltMax] = useState(6000)
  const [fetchError, setFetchError] = useState(null)
  const [isPaused, setIsPaused] = useState(false)

  const wsRef = useRef(null)
  const requestWsRef = useRef(null)

  // Process incoming data point
  const processData = useCallback((data) => {
    if (!data) return
    setLatestData(data)
    setPoints(prev => {
      const next = [...prev, data]
      return next.slice(-2000) // keep last 2000 points
    })
  }, [])

  // Main data WebSocket
  useEffect(() => {
    if (dataSource !== 'mqtt') {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setConnectionStatus('Disconnected')
      return
    }

    setConnectionStatus('Connecting...')
    const ws = new WebSocket(MQTT_BROKER)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('Connected')
      setFetchError(null)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'message' && msg.topic === MQTT_TOPIC) {
          const data = JSON.parse(msg.payload)
          processData(data)
        } else if (msg.type === 'status') {
          setConnectionStatus(msg.connected ? 'Connected' : 'Disconnected')
        }
      } catch (e) {
        console.error('Message error', e)
      }
    }

    ws.onerror = () => {
      setFetchError('Proxy connection error')
      setConnectionStatus('Error')
    }

    ws.onclose = () => {
      setConnectionStatus('Disconnected')
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [dataSource, processData])

  // Request channel (for sounding requests)
  useEffect(() => {
    const ws = new WebSocket(MQTT_BROKER)
    requestWsRef.current = ws

    return () => {
      ws.close()
      requestWsRef.current = null
    }
  }, [])

  const requestLiveSounding = () => {
    const ws = requestWsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'publish',
        topic: MQTT_TOPIC_REQUEST,
        payload: JSON.stringify({ request: 'sounding', ts: Date.now() })
      }))
      console.log('Sounding requested')
    } else {
      setFetchError('Request channel not connected')
    }
  }

  // Simple altitude chart (SVG)
  const renderChart = () => {
    if (points.length < 2) return <p>Warte auf Daten…</p>

    const width = 600
    const height = 300
    const padding = 40

    const alts = points.map(p => p.altitude ?? 0)
    const minA = Math.min(...alts, userAltMin)
    const maxA = Math.max(...alts, userAltMax)
    const range = maxA - minA || 1

    const path = points.map((p, i) => {
      const x = padding + (i / (points.length - 1)) * (width - 2 * padding)
      const y = height - padding - ((p.altitude ?? 0) - minA) / range * (height - 2 * padding)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')

    return (
      <svg width={width} height={height} className="chart">
        <rect width={width} height={height} fill="#f8f9fa" />
        <path d={path} fill="none" stroke="#e74c3c" strokeWidth="2" />
        <text x={10} y={20} fontSize="12">Altitude (m)</text>
        <text x={width - 80} y={height - 10} fontSize="12">{points.length} Punkte</text>
      </svg>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>HLB Flight Display</h1>
        <div className="status">
          MQTT: <span className={connectionStatus === 'Connected' ? 'ok' : 'warn'}>{connectionStatus}</span>
        </div>
      </header>

      <div className="controls">
        <button onClick={() => setDataSource('mqtt')} className={dataSource === 'mqtt' ? 'active' : ''}>
          Live MQTT
        </button>
        <button onClick={() => setDataSource('replay')}>Replay</button>
        <button onClick={requestLiveSounding}>Request Sounding</button>
        <button onClick={() => setIsPaused(p => !p)}>{isPaused ? 'Resume' : 'Pause'}</button>
      </div>

      {fetchError && <div className="error">{fetchError}</div>}

      <div className="main">
        <div className="info">
          <h3>Aktuelle Werte</h3>
          {latestData ? (
            <ul>
              <li>Altitude: {latestData.altitude?.toFixed(1) ?? '–'} m</li>
              <li>Direction: {latestData.direction?.toFixed(0) ?? '–'}°</li>
              <li>Speed: {latestData.speed?.toFixed(1) ?? '–'}</li>
              <li>Runtime: {latestData.runtime ?? '–'}</li>
            </ul>
          ) : (
            <p>Keine Daten</p>
          )}
        </div>

        <div className="chart-area">
          {renderChart()}
        </div>
      </div>

      <div className="settings">
        <label>
          Alt Min:
          <input type="number" value={userAltMin} onChange={e => setUserAltMin(Number(e.target.value))} />
        </label>
        <label>
          Alt Max:
          <input type="number" value={userAltMax} onChange={e => setUserAltMax(Number(e.target.value))} />
        </label>
      </div>
    </div>
  )
}

export default App
