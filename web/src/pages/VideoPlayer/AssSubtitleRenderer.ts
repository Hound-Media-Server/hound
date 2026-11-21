import type { Packet, SubtitleRenderer } from "movi-player/element";
import type JASSUB from "jassub";
import workerUrl from "jassub/dist/worker/worker.js?worker&url";
import wasmUrl from "jassub/dist/wasm/jassub-worker.wasm?url";
import wasmWorkerUrl from "jassub/dist/wasm/jassub-worker.js?url";
import modernWasmUrl from "jassub/dist/wasm/jassub-worker-modern.wasm?url";
import modernWasmWorkerUrl from "jassub/dist/wasm/jassub-worker-modern.js?url";
import defaultFontUrl from "jassub/dist/default.woff2?url";

const decoder = new TextDecoder();

// implement ass renderer for moviplayer to attach, ideally we want moviplayer to handle this
// or fork upstream directly if the project stops being maintained
export class AssSubtitleRenderer implements SubtitleRenderer {
  private container: HTMLElement | null = null;
  private jassub: JASSUB | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ready = false;
  private offset = 0;
  private generation = 0;

  async configure(_track: unknown, extradata?: Uint8Array) {
    this.release();
    const generation = this.generation;
    const { default: Jassub } = await import("jassub");
    if (generation !== this.generation) return;

    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "display:block;width:100%;height:100%;pointer-events:none";
    this.container?.append(canvas);
    const jassub = new Jassub({
      canvas,
      subContent: decoder.decode(extradata),
      timeOffset: this.offset,
      queryFonts: "local",
      availableFonts: { "liberation sans": defaultFontUrl },
      workerUrl,
      wasmUrl,
      wasmWorkerUrl,
      modernWasmUrl,
      modernWasmWorkerUrl,
    });
    this.jassub = jassub;
    this.canvas = canvas;
    await jassub.ready;
    this.ready = this.jassub === jassub;
  }

  mount(container: HTMLElement) {
    this.container = container;
    if (this.canvas) container.append(this.canvas);
  }

  pushPacket(packet: Packet) {
    const text = decoder.decode(packet.data);
    const start = Math.round(packet.timestamp * 1000);
    const duration = Math.round(packet.duration * 1000);
    this.run((jassub) => jassub.renderer.processChunk(text, start, duration));
  }

  render(mediaTime: number, videoWidth: number, videoHeight: number) {
    if (!this.ready || !videoWidth || !videoHeight) return;
    void this.jassub?.manualRender({
      mediaTime,
      width: videoWidth,
      height: videoHeight,
      expectedDisplayTime: performance.now(),
    });
  }

  setDelay(seconds: number) {
    this.offset = -seconds;
    if (this.jassub) this.jassub.timeOffset = this.offset;
  }

  clear() {
    this.run((jassub) => jassub.renderer.removeAllEvents());
  }

  destroy() {
    this.release();
  }

  private run(task: (jassub: JASSUB) => Promise<unknown>) {
    const jassub = this.jassub;
    if (!jassub) return;
    jassub.ready
      .then(() => task(jassub))
      .catch((err) => console.error("ASS subtitle renderer error:", err));
  }

  private release() {
    this.generation++;
    this.ready = false;
    this.jassub?.destroy().catch(() => {});
    this.jassub = null;
    this.canvas = null;
  }
}
