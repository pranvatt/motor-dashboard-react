export function isWebSerialSupported() {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export function parseLine(line) {
  const out = {};
  line.split(",").forEach((chunk) => {
    const idx = chunk.indexOf(":");
    if (idx === -1) return;
    const key = chunk.slice(0, idx).trim();
    const val = parseFloat(chunk.slice(idx + 1).trim());
    if (key && !Number.isNaN(val)) out[key] = val;
  });
  return out;
}

// Opens a serial port and calls onValues(parsedObject) for every complete
// line received. Returns a controller with a disconnect() method.
export async function connectSerial(onValues, onError) {
  if (!isWebSerialSupported()) {
    throw new Error("Web Serial API not supported in this browser.");
  }
  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: 115200 });

  let cancelled = false;

  const decoder = new TextDecoderStream();
  // pipeTo rejects when the port is closed or the board is unplugged. Attach
  // the handler at creation so it never surfaces as an unhandled rejection.
  const inputDone = port.readable.pipeTo(decoder.writable).catch(() => {});
  const reader = decoder.readable.getReader();

  let buffer = "";

  const handleUnplug = () => {
    if (cancelled) return;
    cancelled = true;
    if (onError) onError(new Error("device was unplugged"));
  };
  if (navigator.serial.addEventListener) {
    navigator.serial.addEventListener("disconnect", handleUnplug);
  }

  (async () => {
    try {
      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        // Guard against a board that never sends a newline.
        if (buffer.length > 64 * 1024) buffer = buffer.slice(-1024);
        const lines = buffer.split("\n");
        buffer = lines.pop();
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return;
          const values = parseLine(trimmed);
          if (Object.keys(values).length) onValues(values);
        });
      }
    } catch (err) {
      if (!cancelled && onError) onError(err);
    }
  })();

  return {
    disconnect: async () => {
      cancelled = true;
      if (navigator.serial.removeEventListener) {
        navigator.serial.removeEventListener("disconnect", handleUnplug);
      }
      try {
        await reader.cancel();
      } catch (e) {
        /* ignore */
      }
      try {
        reader.releaseLock();
      } catch (e) {
        /* ignore */
      }
      await inputDone;
      try {
        await port.close();
      } catch (e) {
        /* ignore */
      }
    }
  };
}
