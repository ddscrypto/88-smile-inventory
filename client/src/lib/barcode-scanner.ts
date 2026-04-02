/**
 * Camera-based barcode scanner using zxing-wasm (ZXing C++ compiled to WASM).
 * Handles getUserMedia, frame capture, and barcode detection in a loop.
 * Much more reliable for DataMatrix barcodes than html5-qrcode.
 */

import { readBarcodes, type ReadResult } from "zxing-wasm/reader";

export interface ScannerOptions {
  onResult: (text: string, format: string) => void;
  onError?: (err: string) => void;
  formats?: string[];
}

export class BarcodeScanner {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private animationId: number | null = null;
  private scanning = false;
  private container: HTMLElement | null = null;
  private onResult: (text: string, format: string) => void;
  private onError?: (err: string) => void;
  private lastResult = "";
  private frameCount = 0;

  constructor(opts: ScannerOptions) {
    this.onResult = opts.onResult;
    this.onError = opts.onError;
  }

  async start(container: HTMLElement): Promise<void> {
    this.container = container;
    this.scanning = true;

    // Create video element
    this.video = document.createElement("video");
    this.video.setAttribute("playsinline", "true");
    this.video.setAttribute("autoplay", "true");
    this.video.setAttribute("muted", "true");
    this.video.style.width = "100%";
    this.video.style.height = "100%";
    this.video.style.objectFit = "cover";
    this.video.style.borderRadius = "12px";

    // Create hidden canvas for frame capture
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "none";

    container.innerHTML = "";
    container.appendChild(this.video);
    container.appendChild(this.canvas);

    try {
      // Request camera with high resolution for better barcode detection
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      this.video.srcObject = this.stream;
      await this.video.play();

      // Set canvas size to match video
      const track = this.stream.getVideoTracks()[0];
      const settings = track.getSettings();
      this.canvas.width = settings.width || 1280;
      this.canvas.height = settings.height || 720;
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

      // Start scan loop
      this.scanLoop();
    } catch (err: any) {
      this.onError?.(err.message || "Could not access camera");
    }
  }

  private async scanLoop(): Promise<void> {
    if (!this.scanning || !this.video || !this.canvas || !this.ctx) return;

    this.frameCount++;

    // Process every 3rd frame (~10fps at 30fps camera) to reduce CPU load
    if (this.frameCount % 3 === 0) {
      try {
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        const results = await readBarcodes(imageData, {
          formats: ["DataMatrix", "QRCode"],
          tryHarder: true,
          tryRotate: true,
          tryInvert: true,
          tryDownscale: true,
          maxNumberOfSymbols: 1,
          textMode: "Escaped",
        });

        if (results.length > 0 && results[0].isValid) {
          const result = results[0];
          const text = result.text;

          // Avoid duplicate consecutive reads
          if (text && text !== this.lastResult) {
            this.lastResult = text;
            this.scanning = false;
            this.onResult(text, result.format);
            return; // Stop scanning after first result
          }
        }
      } catch (err) {
        // Silently continue on frame processing errors
      }
    }

    this.animationId = requestAnimationFrame(() => this.scanLoop());
  }

  stop(): void {
    this.scanning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
