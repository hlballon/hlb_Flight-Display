# HLB Flight Display

Web-basierte Flight-Display-Anwendung für Heißluftballons  4

Migriert von Expo Go zu einer reinen React-App, betrieben auf einem reTerminal mit nginx und einem MQTT-Proxy.

## Architektur

```
Browser (iPad / PC)
    │
    ├── http://<reTerminal>:8080          ← React-App (nginx)
    │
    └── ws://<reTerminal>:51884/mqtt      ← MQTT-Proxy
                                              │
                                              └── wss://w471.gimmbh.com:8084/mqtt
                                                  (Credentials bleiben auf dem Server)
```

Lokale Datenquelle (ohne Internet):
```
http://172.20.10.7/readings   ← FlightController
```

## Voraussetzungen

- Node.js 20+
- nginx
- Git
- Zugriff auf den MQTT-Broker (über den Proxy)

## Installation auf dem reTerminal

### 1. Repository klonen

```bash
cd ~
git clone https://github.com/hlballon/hlb_Flight-Display.git
cd hlb_Flight-Display
```

### 2. MQTT-Proxy einrichten

```bash
cd mqtt-proxy
npm install
```

Manuell starten:
```bash
MQTT_USER=your_user MQTT_PASS=your_password PORT=51884 node mqtt-proxy.js
```

Dauerhaft (systemd):
```bash
sudo cp mqtt-proxy.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mqtt-proxy
```

### 3. React-App bauen

```bash
cd ~/hlb_Flight-Display
npm install
npm run build
```

### 4. nginx einrichten

```bash
sudo mkdir -p /var/www/flightdisplay
sudo cp -r dist/* /var/www/flightdisplay/
sudo chown -R www-data:www-data /var/www/flightdisplay

sudo cp nginx-flightdisplay.conf /etc/nginx/sites-available/flightdisplay
sudo ln -s /etc/nginx/sites-available/flightdisplay /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Die App ist dann erreichbar unter:
```
http://<IP-des-reTerminals>:8080
```

## Entwicklung

```bash
npm run dev -- --host
```

Erreichbar unter `http://<IP>:5173`.

Nach Änderungen:
```bash
npm run build
sudo cp -r dist/* /var/www/flightdisplay/
sudo systemctl reload nginx
```

## Datenquellen

| Quelle          | Beschreibung                              |
|-----------------|-------------------------------------------|
| Live MQTT       | Über Proxy (Credentials geschützt)        |
| Live HTTP       | `http://172.20.10.7/readings`             |
| Replay          | GitHub `replay.jsonl`                     |
| cSounding       | `temp_w.txt`                              |
| ICON H          | `latest_icon_sounding.geojson` + Status   |
| ICON D2         | Open-Meteo                                |
| Request Sounding| Publish an `balloon/request_sounding`     |

## Verhalten ohne Internet

- Die Webseite auf Port 8080 bleibt erreichbar (lokales Netz).
- Live HTTP vom FlightController läuft weiter.
- MQTT und externe Sounding-Quellen fallen aus.
- Charts zeigen weiterhin die lokalen Daten.

## Verzeichnisstruktur

```
hlb_Flight-Display/
├── src/                  # React-App
│   ├── App.jsx
│   ├── Charts.jsx
│   └── App.css
├── mqtt-proxy/           # Node.js MQTT-Proxy
│   └── mqtt-proxy.js
├── public/
├── dist/                 # Build-Ausgabe (nach npm run build)
├── package.json
└── README.md
```

## Lizenz

License: MIT  
Author: Hilmar Lorenz  
See also: https://hlballon.com
