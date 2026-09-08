import { useEffect, useRef } from "react";
import { SPARK_LEN } from "../lib/params.js";

export default function Sparkline({ data, status }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Size the backing store to the element's real CSS box at device pixel
    // ratio, otherwise the sparkline is stretched and blurry on retina.
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const hist = data.slice(-SPARK_LEN);
      if (hist.length < 2) return;

      const vals = hist.map((d) => d.v);
      let min = Math.min(...vals);
      let max = Math.max(...vals);
      if (max - min < 1e-6) {
        max += 1;
        min -= 1;
      }
      const pad = 3;

      const styles = getComputedStyle(document.documentElement);
      let lineColor = styles.getPropertyValue("--live").trim();
      if (status === "warn") lineColor = styles.getPropertyValue("--warn").trim();
      if (status === "fault") lineColor = styles.getPropertyValue("--fault").trim();

      ctx.beginPath();
      hist.forEach((d, i) => {
        const x = pad + (i / (hist.length - 1)) * (w - pad * 2);
        const y = h - pad - ((d.v - min) / (max - min)) * (h - pad * 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = "round";
      ctx.stroke();
    };

    draw();

    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [data, status]);

  return <canvas ref={canvasRef} className="spark" aria-hidden="true" />;
}
