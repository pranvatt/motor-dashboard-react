export default function TopBar({
  mode,
  overallStatus,
  bulb,
  theme,
  onToggleTheme,
  user,
  onSignOut
}) {
  const dotClass = overallStatus === "ok" ? "live" : overallStatus;
  const label = mode === "live" ? "ESP32 — live via USB" : "Simulated data";
  const statusText =
    overallStatus === "fault" ? "Fault" : overallStatus === "warn" ? "Warning" : "Healthy";

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>Single-Phase Induction Motor — Health Monitor</h1>
        <div className="sub">
          1 HP · 230 V / 50 Hz / 1440 RPM — real-time condition monitoring &amp;
          predictive alerts
        </div>
      </div>
      <div className="status-cluster">
        <span className={"pill pill-" + dotClass} title={`Overall status: ${statusText}`}>
          <span className={"dot " + dotClass} />
          <span>{label}</span>
        </span>
        {bulb !== null && (
          <span className={"pill" + (bulb ? " pill-bulb-on" : "")} title="LDR test-bulb flag from the ESP32">
            <span className={"dot " + (bulb ? "live" : "")} />
            <span>Bulb {bulb ? "ON" : "OFF"}</span>
          </span>
        )}
        <button
          className="ghost icon-btn"
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? "☀" : "☾"}
          <span className="icon-btn-label">Theme</span>
        </button>
        {user && (
          <button
            className="ghost icon-btn"
            type="button"
            onClick={onSignOut}
            title={`Signed in as ${user.name}`}
          >
            <span className="user-chip" aria-hidden="true">
              {user.name.slice(0, 1)}
            </span>
            <span className="icon-btn-label">Sign out</span>
          </button>
        )}
      </div>
    </header>
  );
}
