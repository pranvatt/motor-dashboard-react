export default function ConnectionPanel({
  mode,
  serialSupported,
  serialError,
  connecting,
  bulb,
  onUseSimulated,
  onConnectLive,
  onDisconnect,
  onTriggerFault,
  onExportCsv
}) {
  const live = mode === "live";

  return (
    <div className="panel panel-flush">
      <div className="conn-grid">
        <div className="conn-col">
          <h3>Data source</h3>
          <p>
            Runs on simulated telemetry by default so the dashboard is useful before any
            hardware is wired up. Connect a real ESP32 over USB to switch to live
            readings.
          </p>
          <div className="btn-row">
            <button
              className={live ? "" : "chip-active"}
              type="button"
              onClick={onUseSimulated}
              disabled={!live}
            >
              {live ? "Use simulated data" : "Simulated data — active"}
            </button>
            {live ? (
              <button type="button" onClick={onDisconnect}>
                Disconnect ESP32
              </button>
            ) : (
              <button
                className="primary"
                type="button"
                onClick={onConnectLive}
                disabled={!serialSupported || connecting}
              >
                {connecting ? "Connecting…" : "Connect ESP32 (USB)"}
              </button>
            )}
            <button className="ghost" type="button" onClick={onTriggerFault} disabled={live}>
              Trigger demo fault
            </button>
          </div>

          {serialError && (
            <div className="notice notice-warn" role="status">
              Serial: {serialError}
            </div>
          )}

          <p className="hint">
            {serialSupported
              ? "Uses the Web Serial API — works in desktop Chrome / Edge over HTTPS. You'll be asked to pick the ESP32's serial port."
              : "Web Serial API not available in this browser — use desktop Chrome or Edge to connect real hardware."}
          </p>
        </div>

        <div className="conn-col">
          <h3>ESP32 serial format</h3>
          <p>The board should print one CSV line like this every 0.5–1 s at 115200 baud:</p>
          <div className="proto mono">C:4.82,V:231.4,T:42.1,VB:0.031,S:1439,BULB:1</div>
          <p>
            C = current (A) · V = voltage (V) · T = temperature (°C) · VB = vibration (g) ·
            S = speed (RPM) · BULB = LDR test-bulb flag. Matching Arduino firmware is in{" "}
            <code>firmware/esp32_motor_monitor.ino</code>.
          </p>
          <div className="bulb-readout">
            <span className="bulb-label">Test bulb</span>
            {bulb === null ? (
              <span className="bulb-state off">not reported</span>
            ) : (
              <span className={"bulb-state " + (bulb ? "on" : "off")}>
                <span className={"dot " + (bulb ? "live" : "")} />
                {bulb ? "lit" : "dark"}
              </span>
            )}
          </div>
          <div className="btn-row">
            <button type="button" onClick={onExportCsv}>
              Download session CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
