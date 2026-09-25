import { useEffect, useRef } from 'react';
import { animate, motion } from 'motion/react';
import { geoDistance, geoGraticule10, geoOrthographic, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { FeatureCollection } from 'geojson';
import { getDashboard } from '../lib/api';
import { loadProvinces } from '../lib/provinces';

// Where the dashboard map opens (DataMap: center [-2.4, 118]).
const INDONESIA = { lon: 118, lat: -2.4 };
const SPIN_DEG_PER_SEC = 5;
const FLY_SECONDS = 1.8;
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const; // --ease-in-out

const COLORS = {
  sphere: '#1b1815',
  rim: 'rgb(242 238 232 / 0.12)',
  graticule: 'rgb(242 238 232 / 0.045)',
  land: 'rgb(242 238 232 / 0.07)',
  landEdge: 'rgb(242 238 232 / 0.16)',
  indonesia: 'rgb(163 180 107 / 0.28)', // moss
  indonesiaEdge: 'rgb(163 180 107 / 0.55)',
  fire: 'rgb(240 113 78 / 0.85)',
};

interface View {
  lambda: number; // rotation: -longitude at the centre
  phi: number; // rotation: -latitude at the centre
  scale: number; // globe radius in CSS px
}

interface GlobeProps {
  /** Start the fly-in to Indonesia */
  flying: boolean;
  /** Fly-in finished (or skipped) */
  onArrive: () => void;
  /** No spin, no fly: a still globe facing Indonesia */
  still: boolean;
}

// Globe radius while idle, and the zoom that makes Indonesia (~48° wide) fill the screen.
const idleScale = (w: number, h: number) => Math.min(w, h) * 0.36;
const arrivalScale = (w: number, h: number) => Math.min((0.46 * w) / Math.sin((24 * Math.PI) / 180), h * 2.2);

export default function Globe({ flying, onArrive, still }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0 });
  const view = useRef<View>({ lambda: -INDONESIA.lon - 70, phi: 8, scale: 0 });
  const layers = useRef<{ land?: GeoPermissibleObjects; indonesia?: FeatureCollection; fires: [number, number][] }>({ fires: [] });
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;

  // Load shapes and today's fires; each layer appears when it arrives.
  useEffect(() => {
    import('world-atlas/land-110m.json').then((m) => {
      const topo = m.default as unknown as Parameters<typeof feature>[0];
      layers.current.land = feature(topo, (topo as any).objects.land) as GeoPermissibleObjects;
    });
    loadProvinces()
      .then((fc) => (layers.current.indonesia = fc))
      .catch(() => {});
    const controller = new AbortController();
    getDashboard(1, controller.signal)
      .then((d) => (layers.current.fires = d.fires.points.map((p) => [p.lon, p.lat])))
      .catch(() => {}); // backend offline: a globe without fires
    return () => controller.abort();
  }, []);

  // Size the canvas to its box, at device resolution.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
      size.current = { w: width, h: height };
      if (!flying) view.current.scale = idleScale(width, height);
    };
    resize();
    if (still) Object.assign(view.current, { lambda: -INDONESIA.lon, phi: -INDONESIA.lat });
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  // One draw loop reads the current view; the idle spin and the fly-in only change `view`.
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!;
    const projection = geoOrthographic().precision(0.5);
    const path = geoPath(projection, ctx);
    const graticule = geoGraticule10();
    let frame = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000; // don't jump after a background tab
      last = now;
      if (!flying && !still) view.current.lambda -= SPIN_DEG_PER_SEC * dt;

      const { w, h } = size.current;
      const { lambda, phi, scale } = view.current;
      projection.translate([w / 2, h / 2]).scale(scale).rotate([lambda, phi]);
      ctx.clearRect(0, 0, w, h);

      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = COLORS.sphere;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = COLORS.rim;
      ctx.stroke();

      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = COLORS.graticule;
      ctx.stroke();

      const { land, indonesia, fires } = layers.current;
      if (land) {
        ctx.beginPath();
        path(land);
        ctx.fillStyle = COLORS.land;
        ctx.fill();
        ctx.strokeStyle = COLORS.landEdge;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      if (indonesia) {
        ctx.beginPath();
        path(indonesia);
        ctx.fillStyle = COLORS.indonesia;
        ctx.fill();
        ctx.strokeStyle = COLORS.indonesiaEdge;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      if (fires.length) {
        const centre: [number, number] = [-lambda, -phi];
        const r = Math.min(2.2, Math.max(0.7, scale / 700));
        ctx.fillStyle = COLORS.fire;
        ctx.globalCompositeOperation = 'lighter'; // overlapping hotspots glow
        for (const p of fires) {
          if (geoDistance(p, centre) > Math.PI / 2 - 0.02) continue; // far side of the globe
          const xy = projection(p);
          if (!xy) continue;
          ctx.fillRect(xy[0] - r / 2, xy[1] - r / 2, r, r);
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [flying, still]);

  // Fly: turn to Indonesia along the shortest way round while zooming in.
  useEffect(() => {
    if (!flying) return;
    if (still) {
      onArriveRef.current();
      return;
    }
    const from = { ...view.current };
    const toLambda = -INDONESIA.lon;
    const dLambda = ((((toLambda - from.lambda) % 360) + 540) % 360) - 180;
    const toPhi = -INDONESIA.lat;
    const { w, h } = size.current;
    const toScale = arrivalScale(w, h);

    const controls = animate(0, 1, {
      duration: FLY_SECONDS,
      ease: EASE_IN_OUT,
      onUpdate: (t) => {
        view.current.lambda = from.lambda + dLambda * t;
        view.current.phi = from.phi + (toPhi - from.phi) * t;
        // Zoom geometrically so each moment of the zoom feels the same speed
        view.current.scale = from.scale * Math.pow(toScale / from.scale, t);
      },
      onComplete: () => onArriveRef.current(),
    });
    return () => controls.stop();
  }, [flying, still]);

  return (
    <motion.canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
    />
  );
}
