import { DomUtil, Layer, type Map as LeafletMap } from 'leaflet';
import type { FirePoint } from '../lib/api';

/**
 * Shared between the fire layer and the timelapse control, outside React state,
 * so playback can redraw every frame without re-rendering the map.
 */
export interface FireClock {
  /** Show fires detected up to this time (ms). null = the normal, static map */
  cursor: number | null;
  /** How long a fire stays bright after it appears, during playback (ms) */
  freshMs: number;
  /** 0 = timelapse look (fresh glow, dim embers); 1 = normal look. Eased at the end of playback */
  mix: number;
  /** Set by the layer while it's on the map */
  redraw: () => void;
}

export const newFireClock = (): FireClock => ({ cursor: null, freshMs: 0, mix: 1, redraw: () => {} });

const FIRE = '#f0714e';
const NORMAL_ALPHA = 0.65;
const EMBER_ALPHA = 0.18;
// Draw beyond the visible area so panning doesn't reveal blank edges before moveend
const PAD = 0.25;

/**
 * Thousands of fire dots on one canvas, drawn by hand. Leaflet's own circle
 * markers can't be restyled every frame at this count.
 */
export class FireCanvasLayer extends Layer {
  private canvas = DomUtil.create('canvas', 'leaflet-zoom-hide') as HTMLCanvasElement;
  private lmap: LeafletMap | null = null;
  private xy = new Float32Array(0);
  private readonly times: Float64Array;
  private readonly radii: Float32Array;

  constructor(
    private readonly points: FirePoint[],
    private readonly clock: FireClock,
    private readonly grow: boolean,
  ) {
    super();
    this.times = Float64Array.from(points, (p) => Date.parse(p.timestamp));
    this.radii = Float32Array.from(points, (p) => Math.min(4, 1.5 + Math.sqrt(p.frp ?? 1) / 4));
  }

  onAdd(map: LeafletMap) {
    this.lmap = map;
    map.getPanes().overlayPane.appendChild(this.canvas);
    map.on('moveend zoomend resize viewreset', this.reset, this);
    this.reset();
    return this;
  }

  onRemove(map: LeafletMap) {
    map.off('moveend zoomend resize viewreset', this.reset, this);
    this.canvas.remove();
    this.lmap = null;
    return this;
  }

  // Re-project every point for the current view, then draw
  private reset() {
    const map = this.lmap;
    if (!map) return;
    const size = map.getSize();
    const padX = size.x * PAD;
    const padY = size.y * PAD;
    const w = size.x + padX * 2;
    const h = size.y + padY * 2;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    DomUtil.setPosition(this.canvas, map.containerPointToLayerPoint([-padX, -padY]));
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);

    const xy = new Float32Array(this.points.length * 2);
    this.points.forEach((p, i) => {
      const pt = map.latLngToContainerPoint([p.lat, p.lon]);
      xy[i * 2] = pt.x + padX;
      xy[i * 2 + 1] = pt.y + padY;
    });
    this.xy = xy;
    this.draw();
  }

  draw() {
    const ctx = this.canvas.getContext('2d')!;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = FIRE;

    const { cursor, freshMs, mix } = this.clock;
    const { xy, times, radii } = this;

    for (let i = 0; i < times.length; i++) {
      let alpha = NORMAL_ALPHA;
      let r = radii[i];

      if (cursor !== null) {
        const age = cursor - times[i];
        if (age < 0) continue; // not detected yet at this point in the playback
        // Fresh fires glow and swell, then settle into dim embers
        const fresh = freshMs > 0 && age < freshMs ? 1 - age / freshMs : 0;
        const playAlpha = fresh > 0 ? 0.4 + 0.6 * fresh : EMBER_ALPHA;
        const playScale = this.grow ? 1 + 0.7 * fresh : 1;
        alpha = playAlpha + (NORMAL_ALPHA - playAlpha) * mix;
        r *= playScale + (1 - playScale) * mix;
      }

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(xy[i * 2], xy[i * 2 + 1], r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
