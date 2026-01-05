import { useCallback } from "react";

const DEFAULT_BOUNDS = {
  lonMin: -11,
  lonMax: 31,
  latMin: 35,
  latMax: 71,
};

const DEFAULT_VIEW = { w: 1000, h: 800 };

export interface MapProjectionConfig {
  bounds?: typeof DEFAULT_BOUNDS;
  view?: typeof DEFAULT_VIEW;
}

export function useMapProjection(config: MapProjectionConfig = {}) {
  const bounds = config.bounds || DEFAULT_BOUNDS;
  const view = config.view || DEFAULT_VIEW;

  const project = useCallback(
    (lat: number, lon: number) => {
      const x =
        ((lon - bounds.lonMin) / (bounds.lonMax - bounds.lonMin)) * view.w;
      const y =
        ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * view.h;
      return { x, y };
    },
    [bounds, view],
  );

  const unproject = useCallback(
    (x: number, y: number) => {
      const lon =
        (x / view.w) * (bounds.lonMax - bounds.lonMin) + bounds.lonMin;
      const lat =
        bounds.latMax - (y / view.h) * (bounds.latMax - bounds.latMin);
      return { lat, lon };
    },
    [bounds, view],
  );

  return { project, unproject, bounds, view };
}
