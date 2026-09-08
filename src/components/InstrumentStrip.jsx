import { PARAMS } from "../lib/params.js";
import InstrumentTile from "./InstrumentTile.jsx";

export default function InstrumentStrip({ history, status, selected, onSelect }) {
  // Left/right arrows move between tiles, which is what role="tablist" promises.
  function handleKeyDown(e) {
    const i = PARAMS.findIndex((p) => p.key === selected);
    if (i === -1) return;
    let next = null;
    if (e.key === "ArrowRight") next = (i + 1) % PARAMS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + PARAMS.length) % PARAMS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = PARAMS.length - 1;
    if (next === null) return;
    e.preventDefault();
    onSelect(PARAMS[next].key);
    const el = document.getElementById(`tab-${PARAMS[next].key}`);
    if (el) el.focus();
  }

  return (
    <div
      className="strip"
      role="tablist"
      aria-label="Motor parameters"
      onKeyDown={handleKeyDown}
    >
      {PARAMS.map((p) => (
        <InstrumentTile
          key={p.key}
          param={p}
          data={history[p.key] || []}
          status={status[p.key]}
          selected={selected === p.key}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
