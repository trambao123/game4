import { DaNangLandmark, Language } from '../types/game';
import { getCleanLandmarkCanvas } from '../components/DaNangLandmarkModel';

export interface StickerHitBox {
  landmark: DaNangLandmark;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Draws the die-cut illustrated Da Nang sticker and elevation label directly on
 * the blueprint skyline, adapting cleanly to mobile phone widths and returning
 * the sticker bounding box for tap-to-inspect popups.
 */
export function drawDaNangLandmarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  landmark: DaNangLandmark,
  screenY: number,
  canvasWidth: number,
  isReached: boolean,
  isIncognito: boolean,
  lang: Language,
  timeMs: number,
  isPlaying = true,
  unlockPulse = 0
): StickerHitBox | null {
  ctx.save();

  const isCompact = canvasWidth < 520;
  const overlayFade = isPlaying ? 1 : 0.45;
  const lineAlpha =
    (isReached ? (isIncognito ? 0.24 : 0.28) : isIncognito ? 0.08 : 0.12) * overlayFade;
  ctx.strokeStyle = isReached ? landmark.accentHex : isIncognito ? '#64748B' : '#94A3B8';
  ctx.globalAlpha = lineAlpha;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(14, screenY);
  ctx.lineTo(canvasWidth - 14, screenY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Left elevation tag & pin dot
  ctx.globalAlpha = (isReached ? 0.96 : 0.62) * overlayFade;
  const pinX = isCompact ? 16 : 24;
  ctx.fillStyle = isReached ? landmark.accentHex : isIncognito ? '#475569' : '#94A3B8';
  ctx.beginPath();
  ctx.arc(pinX, screenY, isReached ? 4.5 : 3, 0, Math.PI * 2);
  ctx.fill();

  if (isReached) {
    ctx.strokeStyle = hexToRgba(landmark.accentHex, 0.32);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(pinX, screenY, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (unlockPulse > 0 && unlockPulse < 1) {
    ctx.save();
    ctx.strokeStyle = hexToRgba(landmark.accentHex, (1 - unlockPulse) * 0.75);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pinX, screenY, 8 + unlockPulse * 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const name = lang === 'vi' ? landmark.nameVi : landmark.nameEn;
  ctx.font = `${isReached ? '800' : '700'} ${isCompact ? '10.5px' : '12px'} "Bricolage Grotesque", "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = isIncognito ? 'rgba(24, 26, 32, 0.85)' : 'rgba(251, 253, 255, 0.9)';
  ctx.strokeText(name, pinX + 10, screenY - 3);
  ctx.fillStyle = isReached
    ? isIncognito
      ? '#F8FAFC'
      : '#0F172A'
    : isIncognito
      ? '#94A3B8'
      : '#64748B';
  ctx.fillText(name, pinX + 10, screenY - 3);

  ctx.font = `700 ${isCompact ? '9.5px' : '10.5px'} "Plus Jakarta Sans", sans-serif`;
  ctx.strokeText(`F${landmark.floor} · ${landmark.altitudeMeters}m`, pinX + 10, screenY + 3);
  ctx.fillStyle = isReached ? landmark.accentHex : isIncognito ? '#64748B' : '#94A3B8';
  ctx.textBaseline = 'top';
  ctx.fillText(`F${landmark.floor} · ${landmark.altitudeMeters}m`, pinX + 10, screenY + 3);

  // Right die-cut illustrated sticker
  const cutout = getCleanLandmarkCanvas(landmark.id);
  let hitBox: StickerHitBox | null = null;

  if (cutout && cutout.width > 0 && cutout.height > 0) {
    const popScale = unlockPulse > 0 && unlockPulse < 1 ? 1 + Math.sin(unlockPulse * Math.PI) * 0.16 : 1;
    const maxBox = (isCompact ? (isReached ? 74 : 52) : isReached ? 120 : 82) * popScale;
    const scale = Math.min(maxBox / cutout.width, maxBox / cutout.height);
    const drawW = cutout.width * scale;
    const drawH = cutout.height * scale;

    const floatOffset = isReached ? Math.sin(timeMs * 0.0024 + landmark.floor) * 2.0 : 0;
    const drawX = canvasWidth - drawW - (isCompact ? 10 : 20);
    const drawY = screenY - drawH + (isCompact ? 8 : 10) + floatOffset;

    ctx.globalAlpha = (isReached ? 1 : isIncognito ? 0.45 : 0.52) * overlayFade;
    if (isReached && isPlaying) {
      ctx.shadowColor =
        unlockPulse > 0 && unlockPulse < 1
          ? hexToRgba(landmark.accentHex, 0.55)
          : isIncognito
            ? 'rgba(0, 0, 0, 0.55)'
            : 'rgba(15, 23, 42, 0.2)';
      ctx.shadowBlur = unlockPulse > 0 && unlockPulse < 1 ? 18 : 12;
      ctx.shadowOffsetY = 5;
    }
    ctx.drawImage(cutout, drawX, drawY, drawW, drawH);

    hitBox = {
      landmark,
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    };
  }

  ctx.restore();
  return hitBox;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
