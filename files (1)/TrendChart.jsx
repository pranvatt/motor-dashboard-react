import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { statusFor } from "../lib/params.js";

// Shades the warn/fault bands behind the line so thresholds are readable at a
// glance. Written inline to avoid pulling in chartjs-plugin-annotation.
const thresholdBands = {
  id: "thresholdBands",
  beforeDatasetsDraw(chart, args, opts) {
    const p = opts && opts.param;
    if (!p) return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales.y) return;
    const y = scales.y;
    const { left, right, top, bottom } = chartArea;

    const band = (from, to, color) => {
      if (from === null || to === null) return;
      const y1 = Math.max(top, Math.min(bottom, y.getPixelForValue(to)));
      const y2 = Math.max(top, Math.min(bottom, y.getPixelForValue(from)));
      const hi = Math.min(y1, y2);
      const lo = Math.max(y1, y2);
      if (lo - hi < 0.5) return;
      ctx.save();
      ctx.fillStyle = color;
      ctx.fillRect(left, hi, right - left, lo - hi);
      ctx.restore();
    };

    const min = y.min;
    const max = y.max;
    const warnFill = opts.warnFill;
    const faultFill = opts.faultFill;

    // Warn zones sit between the warn and fault thresholds on each side.
    band(Math.max(min, p.faultHigh), max, faultFill);
    band(min, Math.min(max, p.faultLow), faultFill);
    band(Math.max(min, p.warnHigh), Math.min(max, p.faultHigh), warnFill);
    band(Math.max(min, p.faultLow), Math.min(max, p.warnLow), warnFill);
  }
};

export default function TrendChart({ param, data, theme }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const textDim = styles.getPropertyValue("--text-dim").trim();
    const border = styles.getPropertyValue("--border").trim();
    const liveColor = styles.getPropertyValue("--live").trim();
    const warnColor = styles.getPropertyValue("--warn").trim();
    const faultColor = styles.getPropertyValue("--fault").trim();
    const panel = styles.getPropertyValue("--panel").trim();
    const text = styles.getPropertyValue("--text").trim();
    const warnFill = styles.getPropertyValue("--warn-fill").trim();
    const faultFill = styles.getPropertyValue("--fault-fill").trim();

    const labels = data.map((d) => d.t);
    const values = data.map((d) => d.v);

    function segmentColor(ctx) {
      const v = ctx.p1.parsed.y;
      const s = statusFor(param, v);
      if (s === "fault") return faultColor;
      if (s === "warn") return warnColor;
      return liveColor;
    }

    if (!chartRef.current) {
      chartRef.current = new Chart(canvasRef.current, {
        type: "line",
        plugins: [thresholdBands],
        data: {
          labels,
          datasets: [
            {
              label: `${param.name} (${param.unit})`,
              data: values,
              borderColor: liveColor,
              segment: { borderColor: segmentColor },
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBackgroundColor: liveColor,
              pointHoverBorderColor: panel,
              pointHoverBorderWidth: 2,
              tension: 0.25,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { display: false },
            y: {
              grid: { color: border, drawTicks: false },
              border: { display: false },
              ticks: {
                color: textDim,
                padding: 8,
                font: { family: "IBM Plex Mono", size: 11 }
              }
            }
          },
          plugins: {
            legend: { display: false },
            thresholdBands: { param, warnFill, faultFill },
            tooltip: {
              enabled: true,
              displayColors: false,
              backgroundColor: panel,
              titleColor: textDim,
              bodyColor: text,
              borderColor: border,
              borderWidth: 1,
              padding: 10,
              titleFont: { family: "IBM Plex Mono", size: 11, weight: "400" },
              bodyFont: { family: "IBM Plex Mono", size: 12, weight: "600" },
              callbacks: {
                label: (item) => `${item.parsed.y.toFixed(param.decimals)} ${param.unit}`
              }
            }
          }
        }
      });
    } else {
      const chart = chartRef.current;
      chart.data.labels = labels;
      chart.data.datasets[0].label = `${param.name} (${param.unit})`;
      chart.data.datasets[0].data = values;
      chart.data.datasets[0].segment.borderColor = segmentColor;
      chart.data.datasets[0].borderColor = liveColor;
      chart.data.datasets[0].pointHoverBackgroundColor = liveColor;
      chart.data.datasets[0].pointHoverBorderColor = panel;
      chart.options.scales.y.grid.color = border;
      chart.options.scales.y.ticks.color = textDim;
      chart.options.plugins.thresholdBands = { param, warnFill, faultFill };
      const tt = chart.options.plugins.tooltip;
      tt.backgroundColor = panel;
      tt.titleColor = textDim;
      tt.bodyColor = text;
      tt.borderColor = border;
      tt.callbacks.label = (item) =>
        `${item.parsed.y.toFixed(param.decimals)} ${param.unit}`;
      chart.update("none");
    }
  }, [param, data, theme]);

  // Rebuild fully when the selected parameter changes so scales reset cleanly.
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [param]);

  return (
    <div className="chart-holder">
      <canvas ref={canvasRef} aria-label={`${param.name} trend chart`} role="img" />
    </div>
  );
}
