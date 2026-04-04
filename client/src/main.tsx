import { createRoot } from "react-dom/client";
import "./index.css";

if (!window.location.hash) {
  window.location.hash = "#/";
}

const root = document.getElementById("root")!;

async function boot() {
  try {
    const { default: App } = await import("./App");
    createRoot(root).render(<App />);
  } catch (err: any) {
    root.innerHTML = `<div style="padding:24px;font-family:system-ui">
      <h2 style="color:red;font-size:16px">Error Report</h2>
      <p style="font-size:13px;color:#666">Screenshot this and send it</p>
      <pre style="white-space:pre-wrap;word-break:break-all;font-size:11px;background:#f5f5f5;padding:12px;border-radius:8px;margin-top:8px;max-height:60vh;overflow:auto">${String(err?.message || err)}\n\n${String(err?.stack || "no stack")}</pre>
    </div>`;
  }
}

boot();
