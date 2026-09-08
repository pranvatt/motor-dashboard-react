import TopBar from "./TopBar.jsx";
import InstrumentStrip from "./InstrumentStrip.jsx";
import TrendChart from "./TrendChart.jsx";
import FaultLog from "./FaultLog.jsx";
import ConnectionPanel from "./ConnectionPanel.jsx";
import { useMotorData } from "../hooks/useMotorData.js";
import { paramByKey } from "../lib/params.js";
import { historyToCsv, downloadCsv } from "../lib/csv.js";

export default function Dashboard({ user, onSignOut, theme, onToggleTheme }) {
  const {
    mode,
    selected,
    setSelected,
    history,
    status,
    overallStatus,
    logEntries,
    serialSupported,
    serialError,
    connecting,
    bulb,
    useSimulated,
    connectLive,
    disconnectLive,
    triggerDemoFault
  } = useMotorData();

  const selectedParam = paramByKey(selected);
  const series = history[selected] || [];

  function handleExport() {
    const csv = historyToCsv(history);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadCsv(`motor-session-${stamp}.csv`, csv);
  }

  return (
    <div className="wrap">
      <TopBar
        mode={mode}
        overallStatus={overallStatus}
        bulb={bulb}
        theme={theme}
        onToggleTheme={onToggleTheme}
        user={user}
        onSignOut={onSignOut}
      />

      <InstrumentStrip
        history={history}
        status={status}
        selected={selected}
        onSelect={setSelected}
      />

      <div
        className="panel"
        id={`panel-${selected}`}
        role="tabpanel"
        aria-labelledby={`tab-${selected}`}
      >
        <div className="panel-head-inline">
          <div>
            <h2>{selectedParam.name} — trend</h2>
            <div className="panel-sub">
              Last {series.length} readings · warn beyond {selectedParam.warnLow}–
              {selectedParam.warnHigh} {selectedParam.unit} · fault beyond{" "}
              {selectedParam.faultLow}–{selectedParam.faultHigh} {selectedParam.unit}
            </div>
          </div>
          <div className="legend" aria-hidden="true">
            <span className="legend-item">
              <i className="swatch ok" /> normal
            </span>
            <span className="legend-item">
              <i className="swatch warn" /> warning
            </span>
            <span className="legend-item">
              <i className="swatch fault" /> fault
            </span>
          </div>
        </div>
        <TrendChart param={selectedParam} data={series} theme={theme} />
      </div>

      <FaultLog entries={logEntries} />

      <ConnectionPanel
        mode={mode}
        serialSupported={serialSupported}
        serialError={serialError}
        connecting={connecting}
        bulb={bulb}
        onUseSimulated={useSimulated}
        onConnectLive={connectLive}
        onDisconnect={disconnectLive}
        onTriggerFault={triggerDemoFault}
        onExportCsv={handleExport}
      />

      <footer>
        Thresholds are placeholder values for a 1 HP / 230V single-phase motor — edit
        <code> src/lib/params.js</code> once you have real nameplate and sensor data.
      </footer>
    </div>
  );
}
