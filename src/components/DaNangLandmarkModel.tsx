import React, { useEffect, useState } from 'react';
import { LandmarkArtId } from '../types/game';
import { DANANG_LANDMARKS } from '../data/landmarks';
import { dragonMascotRenderer } from '../three/DragonMascotRenderer';

interface CutoutResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
}

const cutoutCache = new Map<string, CutoutResult>();
const loadingPromises = new Map<string, Promise<CutoutResult | null>>();

/**
 * Removes the flat outer studio-grey background of each die-cut sticker using
 * corner-sampled BFS flood-fill, preserving the crisp white die-cut sticker border
 * and all interior colorful illustration details 100% intact.
 */
function processStickerCutout(img: HTMLImageElement): CutoutResult {
  const size = 340;
  const work = document.createElement('canvas');
  work.width = size;
  work.height = size;
  const ctx = work.getContext('2d');
  if (!ctx) {
    return { canvas: work, dataUrl: '' };
  }

  ctx.drawImage(img, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  const total = size * size;
  const visited = new Uint8Array(total);

  // Sample exact corner pixel color of the flat grey backdrop
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  const colorDist = (p: number): number => {
    const dr = data[p] - bgR;
    const dg = data[p + 1] - bgG;
    const db = data[p + 2] - bgB;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  // Flood-fill from all 4 outer edges through grey backdrop pixels,
  // stopping right at the bright white die-cut sticker border (dist > 42)
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const enqueue = (idx: number) => {
    if (visited[idx]) return;
    const p = idx * 4;
    if (colorDist(p) > 42) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  };

  for (let x = 0; x < size; x++) {
    enqueue(x);
    enqueue((size - 1) * size + x);
  }
  for (let y = 1; y < size - 1; y++) {
    enqueue(y * size);
    enqueue(y * size + (size - 1));
  }

  while (head < tail) {
    const idx = queue[head++];
    data[idx * 4 + 3] = 0; // transparent

    const x = idx % size;
    const y = (idx - x) / size;
    if (x > 0) enqueue(idx - 1);
    if (x < size - 1) enqueue(idx + 1);
    if (y > 0) enqueue(idx - size);
    if (y < size - 1) enqueue(idx + size);
  }

  // Smooth anti-aliased edge feathering right along the outer edge of the white sticker border
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x;
      if (visited[idx]) continue;
      const hasBgNeighbor =
        visited[idx - 1] || visited[idx + 1] || visited[idx - size] || visited[idx + size];
      if (hasBgNeighbor) {
        const p = idx * 4;
        const dist = colorDist(p);
        if (dist < 65) {
          data[p + 3] = Math.round(data[p + 3] * Math.max(0.25, (dist - 35) / 30));
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Tightly crop transparent margins around the sticker silhouette
  let minX = size;
  let minY = size;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[(y * size + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    return { canvas: work, dataUrl: work.toDataURL('image/png') };
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = document.createElement('canvas');
  cropped.width = cropW;
  cropped.height = cropH;
  const cctx = cropped.getContext('2d');
  if (cctx) {
    cctx.drawImage(work, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  }

  return {
    canvas: cropped,
    dataUrl: cropped.toDataURL('image/png'),
  };
}

function loadCutoutByKey(key: string, imagePath: string): Promise<CutoutResult | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const cached = cutoutCache.get(key);
  if (cached) return Promise.resolve(cached);

  const existingPromise = loadingPromises.get(key);
  if (existingPromise) return existingPromise;

  const promise = new Promise<CutoutResult | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const result = processStickerCutout(img);
        cutoutCache.set(key, result);
        resolve(result);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imagePath;
  });

  loadingPromises.set(key, promise);
  return promise;
}

export function loadCleanLandmarkCutout(id: LandmarkArtId): Promise<CutoutResult | null> {
  const landmark = DANANG_LANDMARKS.find((l) => l.id === id);
  if (!landmark) return Promise.resolve(null);
  return loadCutoutByKey(id, landmark.imagePath);
}

export function getCleanLandmarkCanvas(id: LandmarkArtId): HTMLCanvasElement | null {
  const cached = cutoutCache.get(id);
  if (cached) return cached.canvas;
  void loadCleanLandmarkCutout(id);
  return null;
}

interface DaNangLandmarkModelProps {
  id: LandmarkArtId;
  className?: string;
  dimmed?: boolean;
}

export const DaNangLandmarkModel: React.FC<DaNangLandmarkModelProps> = ({
  id,
  className = 'w-16 h-14',
  dimmed = false,
}) => {
  const [src, setSrc] = useState<string | null>(() => cutoutCache.get(id)?.dataUrl ?? null);

  useEffect(() => {
    let active = true;
    const cached = cutoutCache.get(id);
    if (cached) {
      setSrc(cached.dataUrl);
      return;
    }
    void loadCleanLandmarkCutout(id).then((res) => {
      if (active && res) {
        setSrc(res.dataUrl);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (!src) {
    return <div className={`animate-pulse rounded-lg bg-slate-200/60 ${className}`} />;
  }

  return (
    <img
      src={src}
      alt={id}
      referrerPolicy="no-referrer"
      className={`object-contain select-none drop-shadow-sm transition-all ${
        dimmed ? 'grayscale opacity-55' : ''
      } ${className}`}
    />
  );
};

export const GdgocMascotSticker: React.FC<{ className?: string; alt?: string }> = ({
  className = 'w-16 h-16',
  alt = 'GDGoC DUT 3D Dragon Mascot',
}) => {
  const [src, setSrc] = useState<string | null>(() => dragonMascotRenderer.getIconDataUrl());

  useEffect(() => {
    return dragonMascotRenderer.subscribeIcon((url) => {
      setSrc(url);
    });
  }, []);

  if (!src) {
    return <div className={`rounded-xl bg-amber-100/70 ${className}`} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={`object-contain select-none drop-shadow-sm ${className}`}
    />
  );
};
