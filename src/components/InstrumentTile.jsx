import Sparkline from "./Sparkline.jsx";

export default function InstrumentTile({ param, data, status, selected, onSelect }) {
  const last = data.length ? data[data.length - 1].v : null;
  const prev = data.length > 1 ? data[data.length - 2].v : null;
  const dotClass = status === "ok" ? "live" : status;

  let trend = "";
  if (last !== null && prev !== null) {
    const delta = last - prev;
    if (Math.abs(delta) > Math.abs(param.noise) * 0.4) trend = delta > 0 ? "▲" : "▼";
  }

  return (
    <button
      type="button"
      role="tab"
      id={`tab-${param.key}`}
      aria-selected={selected}
      aria-controls={`panel-${param.key}`}
      tabIndex={selected ? 0 : -1}
      className={"tile" + (selected ? " selected" : "") + (status !== "ok" ? " " + status : "")}
      onClick={() => onSelect(param.key)}
    >
      <div className="label">
        <span className={"dot " + dotClass} />
        {param.name}
      </div>
      <div className="reading">
        <span className="mono">{last === null ? "—" : last.toFixed(param.decimals)}</span>
        <span className="unit">{param.unit}</span>
        {trend && <span className={"trend " + (trend === "▲" ? "up" : "down")}>{trend}</span>}
      </div>
      <Sparkline data={data} status={status} />
    </button>
  );
}
