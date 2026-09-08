export default function FaultLog({ entries }) {
  const alerts = entries.filter((e) => e.level === "warn" || e.level === "fault").length;

  return (
    <div className="log-panel">
      <div className="panel-head">
        <div>
          <h2>Fault &amp; alert log</h2>
          <p className="panel-sub">Threshold crossings, newest first</p>
        </div>
        {alerts > 0 && (
          <span className="count-badge">
            {alerts} alert{alerts === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="log-body" role="log" aria-live="polite">
        {entries.length === 0 ? (
          <div className="log-empty">No alerts yet — readings are within normal range.</div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className={"log-row " + e.level}>
              <span className="t mono">{e.time}</span>
              <span className="lvl">{e.level.toUpperCase()}</span>
              <span className="msg">{e.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
