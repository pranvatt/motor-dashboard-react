# Single-Phase Motor Health Monitor (React + Vite)

Live dashboard for the single-phase induction motor health-monitoring project: current,
voltage, temperature, vibration and speed, with trend charts, threshold-based fault
alerts, and a live USB link to a real ESP32.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (**http://localhost:5173**) in your browser. It starts in
**simulated mode** — realistic-looking readings, updating every second — so the whole UI
works with zero hardware connected.

Other scripts:

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

## Project structure

```
├── index.html                        Vite entry HTML
├── package.json
├── vite.config.js
├── public/
│   └── favicon.svg
├── firmware/
│   └── esp32_motor_monitor.ino       ESP32 firmware — streams sensor data over USB
├── src/
│   ├── main.jsx                      React entry point
│   ├── App.jsx                       Theme + sign-in gate; picks login or dashboard
│   ├── index.css                     All styling (theme tokens, layout)
│   ├── components/
│   │   ├── LoginScreen.jsx           Sign-in form
│   │   ├── Dashboard.jsx             The monitoring view (shown once signed in)
│   │   ├── TopBar.jsx
│   │   ├── InstrumentStrip.jsx
│   │   ├── InstrumentTile.jsx
│   │   ├── Sparkline.jsx             Hand-rolled canvas sparkline
│   │   ├── TrendChart.jsx            Chart.js line chart with threshold coloring
│   │   ├── FaultLog.jsx
│   │   └── ConnectionPanel.jsx
│   ├── hooks/
│   │   └── useMotorData.js           All state: simulation, serial ingest, fault log
│   └── lib/
│       ├── auth.js                   Accounts + session storage (swap for a real API)
│       ├── params.js                 Parameter definitions & thresholds
│       ├── simulate.js               Demo-data random walk
│       ├── serial.js                 Web Serial connection handling
│       └── csv.js                    Session CSV export
└── README.md
```

## Signing in

The dashboard sits behind a sign-in screen. Two demo accounts ship in
`src/lib/auth.js`:

| Username   | Password    |
| ---------- | ----------- |
| `operator` | `motor@123` |
| `admin`    | `admin@123` |

A session lasts 12 hours. "Keep me signed in on this computer" stores it in
`localStorage` so it survives a browser restart; leaving it unchecked uses
`sessionStorage`, which clears when the tab closes. "Sign out" is in the top bar.

**This is a gate, not security.** The app is a static bundle with no server, so
those credentials are readable by anyone who opens devtools. That's fine for a
bench console on your own machine. If you ever put this on a network, replace the
body of `verify()` in `src/lib/auth.js` with a real `fetch` to a login endpoint —
that one function is the only place the rest of the app touches auth.

## Using the dashboard

- Click a parameter tile (Current / Voltage / Temperature / Vibration / Speed) to load
  its trend into the main chart.
- **Trigger demo fault** forces the selected parameter out of range for ~6s so you can
  see the alert log and threshold coloring fire without waiting.
- **Download session CSV** exports everything collected so far.
- **Theme** toggles light/dark (also follows your OS setting by default, and the choice
  is remembered).
- The trend chart shades the warning and fault bands behind the line, and hovering it
  shows the exact reading at that point.
- **Connect ESP32 (USB)** becomes **Disconnect ESP32** while a board is attached;
  disconnecting drops cleanly back to simulated data.

## Connecting a real ESP32 over USB

1. Flash `firmware/esp32_motor_monitor.ino` to your ESP32 using the Arduino IDE
   (Tools → Board → your ESP32 dev board; Tools → Port → the port it appears as once
   plugged in). Install the CP210x or CH340 USB driver first if your OS doesn't already
   see the board.
2. **Use a USB-C-to-USB-C (or USB-C-to-USB-A) *data* cable** — some cables are
   charge-only and won't carry the serial connection. If the board doesn't show up as a
   serial port, that's the first thing to check.
3. Run the dashboard (`npm run dev`) and open it in **desktop Chrome or Edge** — the Web
   Serial API the "Connect ESP32" button uses isn't supported in Safari, Firefox, or any
   mobile browser. `http://localhost` counts as a secure origin, so the local dev server
   works fine for this.
4. Click **Connect ESP32 (USB)**, pick the board's port in the picker that appears, and
   readings will start streaming in — the status pill switches to "ESP32 — live via USB".

The firmware defaults to `DEMO_MODE true`, so it runs with **nothing wired except the
USB cable** and generates its own realistic values — enough to prove the whole chain
(ESP32 → cable → browser → dashboard) works.

### The bulb test

`DEMO_MODE` also reads one real sensor: an LDR (light-dependent resistor) pointed at a
bulb, wired as a voltage divider —

```
3.3V ── LDR ── (GPIO34) ── 10kΩ resistor ── GND
```

Point the LDR at any lamp and flip it on/off. The dashboard reads the `BULB` field
directly: a **Bulb ON / OFF** pill appears in the header, the "Test bulb" readout in the
connection panel switches between *lit* and *dark*, and every change is written to the
alert log. This is deliberately a **low-voltage, no-contact** way to test the link — it
does not involve wiring the ESP32 to mains power.

**Do not wire an ESP32 GPIO directly into a 230V mains bulb circuit** — there's no
isolation, and it will either destroy the board or create a shock/fire hazard. If you
want the ESP32 to actually switch a mains bulb, use a proper relay module or
solid-state relay rated for mains voltage, wired by someone comfortable with mains
electrics.

### Wiring the real motor sensors

Once the bulb test confirms the link works, set `DEMO_MODE` to `false` in the firmware
and wire in the real sensors from the project's cost analysis — ACS758 (current),
ZMPT101B (voltage), a PT100 RTD with signal conditioner (temperature), ADXL345
(vibration, I2C), and an inductive proximity sensor (speed, pulse counting). Every
conversion in the firmware has a `TODO` comment marking the calibration constant you'll
need to set from your specific breakout board's datasheet and a bench test against a
multimeter — the values in the file are starting points, not calibrated numbers.

## Deploying

The app is a static Vite build, so any static host works:

```bash
npm run build     # outputs dist/
```

Serve `dist/` from Netlify, Vercel, GitHub Pages, or any web server. Web Serial needs a
secure origin, so the deployed site must be served over **HTTPS** for the
"Connect ESP32" button to work (`http://localhost` is exempt during development).

## Adjusting thresholds

All warning/fault thresholds live in `src/lib/params.js`. They're placeholders for a
1 HP / 230V single-phase motor — update `nominal`, `warnLow/High`, and
`faultLow/High` once you have real nameplate and sensor data.
