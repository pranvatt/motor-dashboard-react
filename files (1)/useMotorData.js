import { useCallback, useEffect, useRef, useState } from "react";
import { PARAMS, HISTORY_LEN, statusFor } from "../lib/params.js";
import { createSimulator } from "../lib/simulate.js";
import { connectSerial, isWebSerialSupported } from "../lib/serial.js";

function emptyHistory() {
  const h = {};
  PARAMS.forEach((p) => {
    h[p.key] = [];
  });
  return h;
}

function emptyStatus() {
  const s = {};
  PARAMS.forEach((p) => {
    s[p.key] = "ok";
  });
  return s;
}

export function useMotorData() {
  const [mode, setMode] = useState("sim"); // "sim" | "live"
  const [selected, setSelected] = useState("C");
  const [history, setHistory] = useState(emptyHistory);
  const [status, setStatus] = useState(emptyStatus);
  const [logEntries, setLogEntries] = useState([]);
  const [serialError, setSerialError] = useState(null);
  const [connecting, setConnecting] = useState(false);
  // null until the board actually reports a BULB field; then true/false.
  const [bulb, setBulb] = useState(null);

  const simulatorRef = useRef(null);
  const simTimerRef = useRef(null);
  const serialConnRef = useRef(null);
  const statusRef = useRef(emptyStatus());
  const bulbRef = useRef(null);
  const lastValuesRef = useRef({});
  const logIdRef = useRef(0);
  const mountedRef = useRef(true);

  const addLog = useCallback((level, text) => {
    logIdRef.current += 1;
    const entry = {
      id: logIdRef.current,
      level,
      text,
      time: new Date().toTimeString().slice(0, 8)
    };
    setLogEntries((prev) => [entry, ...prev].slice(0, 60));
  }, []);

  const ingest = useCallback(
    (values, tLabel) => {
      const label = tLabel || new Date().toTimeString().slice(0, 8);

      // A live board can drop a field on any given line. Append a point for
      // every parameter on every tick — holding the previous reading when a
      // field is missing — so the per-parameter arrays stay index-aligned.
      // Without this the CSV export and the charts silently drift apart.
      const resolved = {};
      let sawAny = false;
      PARAMS.forEach((p) => {
        const v = p.key in values ? values[p.key] : lastValuesRef.current[p.key];
        if (typeof v !== "number" || Number.isNaN(v)) return;
        resolved[p.key] = v;
        if (p.key in values) sawAny = true;
      });
      if (!sawAny) return;
      lastValuesRef.current = { ...lastValuesRef.current, ...resolved };

      setHistory((prev) => {
        const next = { ...prev };
        PARAMS.forEach((p) => {
          if (!(p.key in resolved)) return;
          const arr = next[p.key].concat([{ t: label, v: resolved[p.key] }]);
          if (arr.length > HISTORY_LEN) arr.shift();
          next[p.key] = arr;
        });
        return next;
      });

      const nextStatus = { ...statusRef.current };
      PARAMS.forEach((p) => {
        if (!(p.key in values)) return; // only judge on freshly reported values
        const v = resolved[p.key];
        const s = statusFor(p, v);
        const prev = statusRef.current[p.key];
        nextStatus[p.key] = s;
        if (s !== prev && s !== "ok") {
          addLog(s, `${p.name} ${v.toFixed(p.decimals)} ${p.unit} crossed the ${s} threshold`);
        } else if (s === "ok" && prev !== "ok") {
          addLog("info", `${p.name} back within normal range (${v.toFixed(p.decimals)} ${p.unit})`);
        }
      });
      statusRef.current = nextStatus;
      setStatus(nextStatus);

      // BULB is the firmware's LDR "is the test bulb lit" flag — not a charted
      // parameter, but the whole point of the demo wiring, so surface it.
      if ("BULB" in values) {
        const on = values.BULB >= 0.5;
        if (bulbRef.current !== on) {
          if (bulbRef.current !== null) {
            addLog("info", `Test bulb ${on ? "ON" : "OFF"} (LDR)`);
          }
          bulbRef.current = on;
          setBulb(on);
        }
      }
    },
    [addLog]
  );

  const stopSim = useCallback(() => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, []);

  const startSim = useCallback(() => {
    stopSim();
    if (!simulatorRef.current) simulatorRef.current = createSimulator();
    setMode("sim");
    const tick = () => {
      const values = simulatorRef.current.tick();
      ingest(values);
    };
    simTimerRef.current = setInterval(tick, 1000);
    tick();
  }, [ingest, stopSim]);

  const closePort = useCallback(async () => {
    const conn = serialConnRef.current;
    serialConnRef.current = null;
    if (conn) {
      try {
        await conn.disconnect();
      } catch (e) {
        /* the port may already be gone — nothing useful to do */
      }
    }
  }, []);

  const useSimulated = useCallback(async () => {
    await closePort();
    setBulb(null);
    bulbRef.current = null;
    setSerialError(null);
    startSim();
  }, [closePort, startSim]);

  const connectLive = useCallback(async () => {
    if (!isWebSerialSupported() || connecting) return;
    setConnecting(true);
    try {
      // Always release any previous port first, otherwise reconnecting leaks
      // the old reader and the board ends up with two open handles.
      await closePort();
      stopSim();
      const conn = await connectSerial(
        (values) => ingest(values),
        (err) => {
          if (!mountedRef.current) return;
          serialConnRef.current = null;
          setSerialError(err.message || String(err));
          addLog("warn", `Serial link dropped: ${err.message || err}`);
          startSim();
        }
      );
      serialConnRef.current = conn;
      setMode("live");
      setSerialError(null);
      addLog("info", "ESP32 connected over USB serial");
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      // NotFoundError is the user dismissing the port picker — not a failure.
      if (err && err.name === "NotFoundError") {
        addLog("info", "Serial port selection cancelled — staying on simulated data");
      } else {
        setSerialError(msg);
        addLog("warn", `Serial connection failed: ${msg}`);
      }
      startSim();
    } finally {
      setConnecting(false);
    }
  }, [addLog, closePort, connecting, ingest, startSim, stopSim]);

  const disconnectLive = useCallback(async () => {
    await closePort();
    setBulb(null);
    bulbRef.current = null;
    addLog("info", "ESP32 disconnected — back on simulated data");
    startSim();
  }, [addLog, closePort, startSim]);

  const triggerDemoFault = useCallback(() => {
    if (mode === "live") {
      addLog("info", "Demo faults only apply to simulated data — switch off live mode first");
      return;
    }
    if (!simulatorRef.current) simulatorRef.current = createSimulator();
    simulatorRef.current.triggerFault(selected, 6000);
    const p = PARAMS.find((x) => x.key === selected);
    addLog("info", `Demo fault triggered on ${p.name} for ~6s`);
  }, [addLog, mode, selected]);

  useEffect(() => {
    mountedRef.current = true;
    startSim();
    return () => {
      mountedRef.current = false;
      stopSim();
      const conn = serialConnRef.current;
      serialConnRef.current = null;
      if (conn) Promise.resolve(conn.disconnect()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overallStatus = (() => {
    let worst = "ok";
    Object.values(status).forEach((s) => {
      if (s === "fault") worst = "fault";
      else if (s === "warn" && worst !== "fault") worst = "warn";
    });
    return worst;
  })();

  return {
    mode,
    selected,
    setSelected,
    history,
    status,
    overallStatus,
    logEntries,
    serialError,
    connecting,
    bulb,
    serialSupported: isWebSerialSupported(),
    useSimulated,
    connectLive,
    disconnectLive,
    triggerDemoFault
  };
}
