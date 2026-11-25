import React, { useEffect, useRef, useCallback } from 'react';
import {
  DaNangLandmark,
  FallingPiece,
  FloatingScorePopup,
  GameMode,
  GameState,
  Language,
  MovingBlock,
  PerfectRipple,
  SparkParticle,
  TowerBlock,
} from '../types/game';
import { DANANG_LANDMARKS } from '../data/landmarks';
import { drawDaNangLandmarkOnCanvas, StickerHitBox } from '../canvas/landmarkArt';
import { dragonMascotRenderer } from '../three/DragonMascotRenderer';

const GOOGLE_COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853'];

export interface DropOutcome {
  floor: number;
  pointsEarned: number;
  isPerfect: boolean;
  wasAutoCorrected: boolean;
  comboStreak: number;
  blockWidthRatio: number;
  reachedLandmark: DaNangLandmark | null;
  gameOver: boolean;
}

interface TowerCanvasProps {
  gameState: GameState;
  gameMode: GameMode;
  language: Language;
  isIncognito: boolean;
  isPaused: boolean;
  didYouMeanArmed: boolean;
  onConsumeDidYouMean: () => void;
  onDropOutcome: (outcome: DropOutcome) => void;
  onSelectLandmark: (landmark: DaNangLandmark) => void;
  onSelectMascot: () => void;
  onStartGame: () => void;
  dropSignal: number;
  resetSignal: number;
  rescueSignal?: number;
}

const INITIAL_SIZE = 164;
const BLOCK_HEIGHT = 22;
const SWING_BOUND = 195;
const BASE_TOLERANCE = 7.5;

function getBlockColor(index: number): { hue: number; saturation: number; lightness: number } {
  const hue = (98 - index * 7.2 + 720) % 360;
  return {
    hue,
    saturation: 60,
    lightness: 65,
  };
}

export const TowerCanvas: React.FC<TowerCanvasProps> = ({
  gameState,
  gameMode,
  language,
  isIncognito,
  isPaused,
  didYouMeanArmed,
  onConsumeDidYouMean,
  onDropOutcome,
  onSelectLandmark,
  onSelectMascot,
  onStartGame,
  dropSignal,
  resetSignal,
  rescueSignal = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stackRef = useRef<TowerBlock[]>([]);
  const movingRef = useRef<MovingBlock | null>(null);
  const fallingRef = useRef<FallingPiece[]>([]);
  const ripplesRef = useRef<PerfectRipple[]>([]);
  const particlesRef = useRef<SparkParticle[]>([]);
  const popupsRef = useRef<FloatingScorePopup[]>([]);
  const stickerHitBoxesRef = useRef<StickerHitBox[]>([]);
  const mascotHitBoxRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const mascotJumpRef = useRef<{
    active: boolean;
    life: number;
    duration: number;
    peak: number;
    isPerfect: boolean;
    isMilestone?: boolean;
  }>({ active: false, life: 0, duration: 0.3, peak: 34, isPerfect: false, isMilestone: false });
  const milestoneBurstRef = useRef<{
    active: boolean;
    life: number;
    duration: number;
    landmarkId: string | null;
  }>({ active: false, life: 0, duration: 0.75, landmarkId: null });
  const mascotFloorYRef = useRef<number>(0);
  const cameraYRef = useRef<number>(0);
  const targetCameraYRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const gameStateRef = useRef(gameState);
  const gameModeRef = useRef(gameMode);
  const langRef = useRef(language);
  const incognitoRef = useRef(isIncognito);
  const pausedRef = useRef(isPaused);
  const didYouMeanRef = useRef(didYouMeanArmed);

  gameStateRef.current = gameState;
  gameModeRef.current = gameMode;
  langRef.current = language;
  incognitoRef.current = isIncognito;
  pausedRef.current = isPaused;
  didYouMeanRef.current = didYouMeanArmed;

  const initTower = useCallback(() => {
    const baseColor = getBlockColor(0);
    stackRef.current = [
      {
        index: 0,
        x: 0,
        z: 0,
        width: INITIAL_SIZE,
        depth: INITIAL_SIZE,
        ...baseColor,
        isPerfect: true,
      },
    ];
    fallingRef.current = [];
    ripplesRef.current = [];
    particlesRef.current = [];
    popupsRef.current = [];
    mascotJumpRef.current = {
      active: false,
      life: 0,
      duration: 0.3,
      peak: 34,
      isPerfect: false,
      isMilestone: false,
    };
    milestoneBurstRef.current = { active: false, life: 0, duration: 0.75, landmarkId: null };
    mascotFloorYRef.current = 0;
    cameraYRef.current = 0;
    targetCameraYRef.current = 0;
    comboRef.current = 0;

    const firstColor = getBlockColor(1);
    movingRef.current = {
      x: -SWING_BOUND,
      z: 0,
      width: INITIAL_SIZE,
      depth: INITIAL_SIZE,
      axis: 'x',
      direction: 1,
      speed: 225,
      ...firstColor,
    };
  }, []);

  useEffect(() => {
    initTower();
  }, [initTower, resetSignal]);

  const spawnNextMovingBlock = useCallback((topBlock: TowerBlock) => {
    const nextIndex = topBlock.index + 1;
    const axis: 'x' | 'z' = nextIndex % 2 === 1 ? 'x' : 'z';
    const startSign: 1 | -1 = nextIndex % 4 < 2 ? -1 : 1;
    const color = getBlockColor(nextIndex);
    const speed = 225 + Math.min(nextIndex * 6.5, 255);

    movingRef.current = {
      x: axis === 'x' ? startSign * SWING_BOUND : topBlock.x,
      z: axis === 'z' ? startSign * SWING_BOUND : topBlock.z,
      width: topBlock.width,
      depth: topBlock.depth,
      axis,
      direction: startSign === -1 ? 1 : -1,
      speed,
      ...color,
    };
  }, []);

  const performDrop = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING' || pausedRef.current) return;
    const moving = movingRef.current;
    const stack = stackRef.current;
    if (!moving || stack.length === 0) return;

    const prev = stack[stack.length - 1];
    const axis = moving.axis;
    const delta = axis === 'x' ? moving.x - prev.x : moving.z - prev.z;
    const currentDim = axis === 'x' ? prev.width : prev.depth;
    const overlap = currentDim - Math.abs(delta);

    const tolerance = incognitoRef.current ? BASE_TOLERANCE * 1.55 : BASE_TOLERANCE;
    const isNaturalPerfect = Math.abs(delta) <= tolerance;
    const canAutoCorrect = !isNaturalPerfect && didYouMeanRef.current;

    if (overlap <= 0 && !canAutoCorrect) {
      fallingRef.current.push({
        x: moving.x,
        z: moving.z,
        y: prev.index + 1,
        width: moving.width,
        depth: moving.depth,
        vy: 0,
        vx: axis === 'x' ? Math.sign(delta || 1) * 55 : 0,
        vz: axis === 'z' ? Math.sign(delta || 1) * 55 : 0,
        rot: 0,
        vrot: (Math.random() - 0.5) * 3.5,
        alpha: 1,
        hue: moving.hue,
        saturation: moving.saturation,
        lightness: moving.lightness,
      });
      movingRef.current = null;
      comboRef.current = 0;

      onDropOutcome({
        floor: prev.index,
        pointsEarned: 0,
        isPerfect: false,
        wasAutoCorrected: false,
        comboStreak: 0,
        blockWidthRatio: (prev.width * prev.depth) / (INITIAL_SIZE * INITIAL_SIZE),
        reachedLandmark: null,
        gameOver: true,
      });
      return;
    }

    const nextIndex = prev.index + 1;
    let newX = prev.x;
    let newZ = prev.z;
    let newWidth = moving.width;
    let newDepth = moving.depth;
    let isPerfect = false;
    let wasAutoCorrected = false;
    let didExpandSize = false;

    if (isNaturalPerfect || canAutoCorrect) {
      isPerfect = true;
      comboRef.current += 1;
      newX = prev.x;
      newZ = prev.z;

      if (canAutoCorrect) {
        wasAutoCorrected = true;
        onConsumeDidYouMean();
        newWidth = Math.min(INITIAL_SIZE, prev.width + 14);
        newDepth = Math.min(INITIAL_SIZE, prev.depth + 14);
        didExpandSize = newWidth > prev.width || newDepth > prev.depth;
      } else if (comboRef.current >= 3) {
        newWidth = Math.min(INITIAL_SIZE, prev.width + 6);
        newDepth = Math.min(INITIAL_SIZE, prev.depth + 6);
        didExpandSize = newWidth > prev.width || newDepth > prev.depth;
      }

      ripplesRef.current.push({
        x: newX,
        z: newZ,
        yIndex: nextIndex,
        width: newWidth,
        depth: newDepth,
        progress: 0,
        color: canAutoCorrect
          ? '#4285F4'
          : didExpandSize
            ? '#10B981'
            : incognitoRef.current
              ? '#38BDF8'
              : '#FFFFFF',
      });
    } else {
      comboRef.current = 0;
      if (axis === 'x') {
        newWidth = overlap;
        newX = prev.x + delta / 2;
        const cutWidth = prev.width - overlap;
        const cutSign = Math.sign(delta);
        const cutX = newX + cutSign * (overlap / 2 + cutWidth / 2);
        fallingRef.current.push({
          x: cutX,
          z: newZ,
          y: nextIndex,
          width: cutWidth,
          depth: newDepth,
          vy: -20,
          vx: cutSign * 70,
          vz: 0,
          rot: 0,
          vrot: cutSign * 2.6,
          alpha: 1,
          hue: moving.hue,
          saturation: moving.saturation,
          lightness: moving.lightness,
        });
      } else {
        newDepth = overlap;
        newZ = prev.z + delta / 2;
        const cutDepth = prev.depth - overlap;
        const cutSign = Math.sign(delta);
        const cutZ = newZ + cutSign * (overlap / 2 + cutDepth / 2);
        fallingRef.current.push({
          x: newX,
          z: cutZ,
          y: nextIndex,
          width: newWidth,
          depth: cutDepth,
          vy: -20,
          vx: 0,
          vz: cutSign * 70,
          rot: 0,
          vrot: cutSign * 2.6,
          alpha: 1,
          hue: moving.hue,
          saturation: moving.saturation,
          lightness: moving.lightness,
        });
      }
    }

    // Score calculation: Perfect grants significantly higher points than normal
    let basePoints = 1;
    if (isPerfect) {
      if (comboRef.current >= 5) basePoints = 6;
      else if (comboRef.current >= 3) basePoints = 5;
      else if (comboRef.current === 2) basePoints = 4;
      else basePoints = 3;
    }
    const totalPoints = basePoints * (incognitoRef.current ? 2 : 1);

    const placedBlock: TowerBlock = {
      index: nextIndex,
      x: newX,
      z: newZ,
      width: newWidth,
      depth: newDepth,
      hue: moving.hue,
      saturation: moving.saturation,
      lightness: moving.lightness,
      isPerfect,
      wasAutoCorrected,
    };

    stack.push(placedBlock);
    targetCameraYRef.current = Math.max(0, (nextIndex - 3) * BLOCK_HEIGHT);

    const reachedLandmark =
      gameModeRef.current === 'DANANG'
        ? (DANANG_LANDMARKS.find((lm) => lm.floor === nextIndex) ?? null)
        : null;
    const isTenFloorMilestone = nextIndex > 0 && nextIndex % 10 === 0 && !reachedLandmark;
    const isMilestone = Boolean(reachedLandmark || isTenFloorMilestone);
    const milestoneColor = reachedLandmark ? reachedLandmark.accentHex : '#F59E0B';

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const isoScale = Math.min(1, Math.max(0.56, Math.min((rect.width - 28) / 480, (rect.height - 32) / 570)));
      const originX = rect.width * 0.5;
      const originY = rect.height < 560 ? rect.height * 0.70 : rect.height * 0.72;
      const isoX = originX + (newX - newZ) * 0.9 * isoScale;
      const isoY =
        originY +
        (newX + newZ) * 0.45 * isoScale -
        (nextIndex + 4.3) * BLOCK_HEIGHT * isoScale +
        cameraYRef.current * isoScale;

      popupsRef.current.push({
        x: isoX,
        y: isoY,
        text: isPerfect
          ? `+${totalPoints} PERFECT${comboRef.current > 1 ? ` ${comboRef.current}x` : '!'}${didExpandSize ? ' · +SIZE' : ''}`
          : `+${totalPoints}`,
        color: isPerfect
          ? wasAutoCorrected
            ? '#2563EB'
            : didExpandSize
              ? '#059669'
              : incognitoRef.current
                ? '#38BDF8'
                : '#D97706'
          : incognitoRef.current
            ? '#CBD5E1'
            : '#475569',
        life: 0,
        maxLife: 0.85,
      });
    }

    // Trigger 3D GDGoC DUT Dragon jump arc (snappy single 360 celebratory hop on milestones)
    mascotJumpRef.current = {
      active: true,
      life: 0,
      duration: isMilestone ? 0.38 : isPerfect ? 0.32 : 0.22,
      peak: isMilestone ? 26 : isPerfect ? 25 : 16,
      isPerfect,
      isMilestone,
    };

    if (isMilestone) {
      milestoneBurstRef.current = {
        active: true,
        life: 0,
        duration: 0.75,
        landmarkId: reachedLandmark ? reachedLandmark.id : null,
      };

      // Single crisp isometric edge ripple on the milestone block
      ripplesRef.current.push({
        x: newX,
        z: newZ,
        yIndex: nextIndex,
        width: newWidth,
        depth: newDepth,
        progress: 0,
        color: milestoneColor,
      });
    }

    if (canvasRef.current && (isPerfect || isMilestone)) {
      const rect = canvasRef.current.getBoundingClientRect();
      const isoScale = Math.min(1, Math.max(0.56, Math.min((rect.width - 28) / 480, (rect.height - 32) / 570)));
      const originX = rect.width * 0.5;
      const originY = rect.height < 560 ? rect.height * 0.70 : rect.height * 0.72;
      const mX = originX + (newX - newZ) * 0.9 * isoScale;
      const mY =
        originY +
        ((newX + newZ) * 0.45 - (nextIndex + 1) * BLOCK_HEIGHT + cameraYRef.current) * isoScale;

      const count = isMilestone ? 8 : 7;
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const spread = 0.25 + (i / count) * 0.95;
        const spd = 48 + Math.random() * 52;
        particlesRef.current.push({
          x: mX + side * 14,
          y: mY - 10,
          vx: side * Math.cos(spread) * spd,
          vy: -Math.sin(spread) * spd - 18,
          size: 1.8 + Math.random() * 1.1,
          color: isMilestone && i % 2 === 0 ? milestoneColor : GOOGLE_COLORS[i % GOOGLE_COLORS.length],
          alpha: 1,
          life: 0,
          maxLife: 0.42 + Math.random() * 0.14,
        });
      }
    }

    spawnNextMovingBlock(placedBlock);

    onDropOutcome({
      floor: nextIndex,
      pointsEarned: totalPoints,
      isPerfect,
      wasAutoCorrected,
      comboStreak: comboRef.current,
      blockWidthRatio: (newWidth * newDepth) / (INITIAL_SIZE * INITIAL_SIZE),
      reachedLandmark,
      gameOver: false,
    });
  }, [onConsumeDidYouMean, onDropOutcome, spawnNextMovingBlock]);

  const lastDropSignalRef = useRef<number>(0);
  useEffect(() => {
    if (dropSignal > 0 && dropSignal !== lastDropSignalRef.current) {
      lastDropSignalRef.current = dropSignal;
      performDrop();
    }
  }, [dropSignal, performDrop]);

  const lastRescueRef = useRef<number>(0);
  useEffect(() => {
    if (rescueSignal <= 0 || rescueSignal === lastRescueRef.current) return;
    lastRescueRef.current = rescueSignal;

    const stack = stackRef.current;
    if (stack.length === 0) return;

    const prev = stack[stack.length - 1];
    const nextIndex = prev.index + 1;
    const color = getBlockColor(nextIndex);
    const newWidth = Math.min(INITIAL_SIZE, prev.width + 14);
    const newDepth = Math.min(INITIAL_SIZE, prev.depth + 14);
    const didExpandSize = newWidth > prev.width || newDepth > prev.depth;

    fallingRef.current = [];
    comboRef.current = Math.max(1, comboRef.current + 1);
    const basePoints = comboRef.current >= 5 ? 6 : comboRef.current >= 3 ? 5 : comboRef.current === 2 ? 4 : 3;
    const totalPoints = basePoints * (incognitoRef.current ? 2 : 1);

    const rescuedBlock: TowerBlock = {
      index: nextIndex,
      x: prev.x,
      z: prev.z,
      width: newWidth,
      depth: newDepth,
      hue: color.hue,
      saturation: color.saturation,
      lightness: color.lightness,
      isPerfect: true,
      wasAutoCorrected: true,
    };

    stack.push(rescuedBlock);
    targetCameraYRef.current = Math.max(0, (nextIndex - 3) * BLOCK_HEIGHT);

    ripplesRef.current.push({
      x: rescuedBlock.x,
      z: rescuedBlock.z,
      yIndex: nextIndex,
      width: newWidth,
      depth: newDepth,
      progress: 0,
      color: '#2563EB',
    });

    const reachedLandmark =
      gameModeRef.current === 'DANANG'
        ? (DANANG_LANDMARKS.find((lm) => lm.floor === nextIndex) ?? null)
        : null;
    const isTenFloorMilestone = nextIndex > 0 && nextIndex % 10 === 0 && !reachedLandmark;
    const isMilestone = Boolean(reachedLandmark || isTenFloorMilestone);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const isoScale = Math.min(1, Math.max(0.56, Math.min((rect.width - 28) / 480, (rect.height - 32) / 570)));
      const originX = rect.width * 0.5;
      const originY = rect.height < 560 ? rect.height * 0.70 : rect.height * 0.72;
      const isoX = originX + (rescuedBlock.x - rescuedBlock.z) * 0.9 * isoScale;
      const isoY =
        originY +
        (rescuedBlock.x + rescuedBlock.z) * 0.45 * isoScale -
        (nextIndex + 4.3) * BLOCK_HEIGHT * isoScale +
        cameraYRef.current * isoScale;

      popupsRef.current.push({
        x: isoX,
        y: isoY,
        text: `+${totalPoints} AUTO-CORRECT!${didExpandSize ? ' · +SIZE' : ''}`,
        color: '#2563EB',
        life: 0,
        maxLife: 0.95,
      });

      const mX = originX + (rescuedBlock.x - rescuedBlock.z) * 0.9 * isoScale;
      const mY =
        originY +
        ((rescuedBlock.x + rescuedBlock.z) * 0.45 - (nextIndex + 1) * BLOCK_HEIGHT + cameraYRef.current) * isoScale;
      for (let i = 0; i < 8; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const spread = 0.25 + (i / 8) * 0.95;
        const spd = 48 + Math.random() * 52;
        particlesRef.current.push({
          x: mX + side * 14,
          y: mY - 10,
          vx: side * Math.cos(spread) * spd,
          vy: -Math.sin(spread) * spd - 18,
          size: 1.9 + Math.random() * 1.1,
          color: GOOGLE_COLORS[i % GOOGLE_COLORS.length],
          alpha: 1,
          life: 0,
          maxLife: 0.46 + Math.random() * 0.14,
        });
      }
    }

    mascotJumpRef.current = {
      active: true,
      life: 0,
      duration: 0.36,
      peak: 26,
      isPerfect: true,
      isMilestone,
    };

    if (isMilestone) {
      milestoneBurstRef.current = {
        active: true,
        life: 0,
        duration: 0.75,
        landmarkId: reachedLandmark ? reachedLandmark.id : null,
      };
    }

    spawnNextMovingBlock(rescuedBlock);

    onDropOutcome({
      floor: nextIndex,
      pointsEarned: totalPoints,
      isPerfect: true,
      wasAutoCorrected: true,
      comboStreak: comboRef.current,
      blockWidthRatio: (newWidth * newDepth) / (INITIAL_SIZE * INITIAL_SIZE),
      reachedLandmark,
      gameOver: false,
    });
  }, [rescueSignal, onDropOutcome, spawnNextMovingBlock]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // During active gameplay, every tap on the canvas strictly drops the block
    // so players never accidentally open mascot/sticker popups mid-run.
    if (gameStateRef.current === 'PLAYING') {
      if (!pausedRef.current) {
        performDrop();
      }
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const pad = 10;

      // Check if user tapped directly on the GDGoC DUT chibi mascot
      const mBox = mascotHitBoxRef.current;
      if (
        mBox &&
        px >= mBox.x - pad &&
        px <= mBox.x + mBox.width + pad &&
        py >= mBox.y - pad &&
        py <= mBox.y + mBox.height + pad
      ) {
        onSelectMascot();
        return;
      }

      if (gameModeRef.current === 'DANANG') {
        // Check if user tapped directly on any Da Nang sticker to inspect it
        for (const box of stickerHitBoxesRef.current) {
          if (
            px >= box.x - pad &&
            px <= box.x + box.width + pad &&
            py >= box.y - pad &&
            py <= box.y + box.height + pad
          ) {
            onSelectLandmark(box.landmark);
            return;
          }
        }
      }
    }

    if (gameStateRef.current === 'TITLE_MENU') {
      onStartGame();
    }
  };

  useEffect(() => {
    let rafId = 0;

    let frameWindStrength = 0;
    let frameWindWave = 0;

    const getWindSwayOffset = (wyUnits: number, isoScale: number) => {
      if (frameWindStrength <= 0.005 || wyUnits <= 3) return 0;
      const heightRatio = Math.min(1.45, Math.max(0, wyUnits - 3) / 24);
      return frameWindWave * frameWindStrength * Math.pow(heightRatio, 1.18) * 15 * isoScale;
    };

    const toIso = (
      wx: number,
      wz: number,
      wyUnits: number,
      originX: number,
      originY: number,
      camY: number,
      isoScale: number
    ) => {
      const swayX = getWindSwayOffset(wyUnits, isoScale);
      return {
        x: originX + (wx - wz) * 0.9 * isoScale + swayX,
        y: originY + ((wx + wz) * 0.45 - wyUnits * BLOCK_HEIGHT + camY) * isoScale,
      };
    };

    const drawIsoPrism = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cz: number,
      yBase: number,
      heightUnits: number,
      w: number,
      d: number,
      hue: number,
      sat: number,
      light: number,
      originX: number,
      originY: number,
      camY: number,
      isoScale: number,
      alpha = 1,
      highlightAutoCorrect = false
    ) => {
      const hw = w / 2;
      const hd = d / 2;
      const yTop = yBase + heightUnits;

      const tBack = toIso(cx - hw, cz - hd, yTop, originX, originY, camY, isoScale);
      const tRight = toIso(cx + hw, cz - hd, yTop, originX, originY, camY, isoScale);
      const tFront = toIso(cx + hw, cz + hd, yTop, originX, originY, camY, isoScale);
      const tLeft = toIso(cx - hw, cz + hd, yTop, originX, originY, camY, isoScale);

      const bRight = toIso(cx + hw, cz - hd, yBase, originX, originY, camY, isoScale);
      const bFront = toIso(cx + hw, cz + hd, yBase, originX, originY, camY, isoScale);
      const bLeft = toIso(cx - hw, cz + hd, yBase, originX, originY, camY, isoScale);

      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.moveTo(tBack.x, tBack.y);
      ctx.lineTo(tRight.x, tRight.y);
      ctx.lineTo(tFront.x, tFront.y);
      ctx.lineTo(tLeft.x, tLeft.y);
      ctx.closePath();
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${Math.min(82, light + 4)}%)`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(tLeft.x, tLeft.y);
      ctx.lineTo(tFront.x, tFront.y);
      ctx.lineTo(bFront.x, bFront.y);
      ctx.lineTo(bLeft.x, bLeft.y);
      ctx.closePath();
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${Math.max(25, light - 8)}%)`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(tFront.x, tFront.y);
      ctx.lineTo(tRight.x, tRight.y);
      ctx.lineTo(bRight.x, bRight.y);
      ctx.lineTo(bFront.x, bFront.y);
      ctx.closePath();
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${Math.max(20, light - 16)}%)`;
      ctx.fill();

      ctx.strokeStyle = highlightAutoCorrect
        ? 'rgba(66, 133, 244, 0.7)'
        : 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = highlightAutoCorrect ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(tLeft.x, tLeft.y);
      ctx.lineTo(tFront.x, tFront.y);
      ctx.lineTo(tRight.x, tRight.y);
      ctx.stroke();

      ctx.restore();
    };

    const drawBlueprintGear = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      radius: number,
      isDark: boolean,
      angle: number
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.06)' : 'rgba(147, 197, 253, 0.26)';
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(147, 197, 253, 0.38)';
      ctx.lineWidth = 1.5;

      const teeth = 6;
      const outerR = radius;
      const innerR = radius * 0.72;
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a0 = (i / teeth) * Math.PI * 2;
        const a1 = a0 + 0.22;
        const a2 = a0 + 0.52;
        const a3 = a0 + 0.74;
        if (i === 0) ctx.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
        else ctx.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
        ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
        ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
        ctx.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDark ? '#181A20' : '#FBFDFF';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    const render = (timeMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      const w = rect.width;
      const h = rect.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const dt = lastTimeRef.current ? Math.min((timeMs - lastTimeRef.current) / 1000, 0.05) : 0.016;
      lastTimeRef.current = timeMs;

      const incognito = incognitoRef.current;
      const stack = stackRef.current;
      const currentFloors = stack.length > 0 ? stack[stack.length - 1].index : 0;

      // Responsive isometric scale so narrow & short mobile phones fit plinth + swing range cleanly
      const isoScale = Math.min(1, Math.max(0.56, Math.min((w - 28) / 480, (h - 32) / 570)));

      cameraYRef.current += (targetCameraYRef.current - cameraYRef.current) * Math.min(1, dt * 8.5);
      const camY = cameraYRef.current;

      // High-altitude wind strength + gust envelope (activates from Floor 20 onward)
      frameWindStrength =
        currentFloors >= 20 ? Math.min(1, 0.22 + (currentFloors - 20) / 20) : 0;
      const visualWindStrength =
        currentFloors >= 20 ? Math.min(1, 0.28 + (currentFloors - 20) / 15) : 0;
      const gustEnvelope = 0.62 + 0.38 * Math.sin(timeMs * 0.00095);
      frameWindWave =
        (Math.sin(timeMs * 0.0019) * 0.7 + Math.sin(timeMs * 0.0044 + 1.1) * 0.3) *
        (0.78 + gustEnvelope * 0.42);

      if (incognito) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, visualWindStrength > 0.2 ? '#121826' : '#181A20');
        grad.addColorStop(1, '#181A20');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else {
        const skyProgress =
          currentFloors >= 20 ? Math.min(1, 0.18 + (currentFloors - 20) / 20) : 0;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, skyProgress > 0.42 ? '#D6EBFF' : skyProgress > 0.1 ? '#EBF5FF' : '#FBFDFF');
        grad.addColorStop(0.55, skyProgress > 0.42 ? '#ECF5FF' : '#F8FAFC');
        grad.addColorStop(1, '#F8FAFC');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      const gridSize = w < 520 ? 36 : 44;
      const gridOffsetY = (camY * isoScale) % gridSize;
      ctx.strokeStyle = incognito ? 'rgba(148, 163, 184, 0.08)' : 'rgba(191, 219, 254, 0.46)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = (w * 0.5) % gridSize; gx < w; gx += gridSize) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
      }
      for (let gy = gridOffsetY; gy < h; gy += gridSize) {
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
      }
      ctx.stroke();

      drawBlueprintGear(
        ctx,
        w - (w < 520 ? 54 : 86),
        h - (w < 520 ? 54 : 84),
        w < 520 ? 38 : 54,
        incognito,
        timeMs * 0.00018
      );

      const originX = w * 0.5;
      const originY = h < 560 ? h * 0.70 : h * 0.72;
      const isPlaying = gameStateRef.current === 'PLAYING';

      // Graphical high-altitude wind atmosphere: parallax cloud wisps + aerodynamic wind ribbons + breeze flecks
      if (visualWindStrength > 0.04) {
        ctx.save();

        // 1. Soft drifting high-altitude cloud wisps in the upper sky
        if (visualWindStrength > 0.08) {
          const cloudCount = 4;
          for (let c = 0; c < cloudCount; c++) {
            const cSpeed = (28 + c * 10) * (0.7 + visualWindStrength * 0.7);
            const span = w + 260;
            const cx = ((timeMs * 0.001 * cSpeed + c * 215) % span) - 130;
            const cy = h * (0.14 + c * 0.13) + Math.sin(timeMs * 0.0008 + c) * 6;
            const cw = 88 + (c % 2) * 44;
            const ch = 17 + (c % 2) * 6;
            const cAlpha = (0.2 + (c % 2) * 0.08) * visualWindStrength;
            ctx.fillStyle = incognito
              ? `rgba(148, 163, 184, ${(cAlpha * 0.35).toFixed(3)})`
              : `rgba(255, 255, 255, ${Math.min(0.85, cAlpha * 1.6).toFixed(3)})`;
            ctx.beginPath();
            ctx.ellipse(cx, cy, cw * 0.5, ch * 0.5, 0, 0, Math.PI * 2);
            ctx.ellipse(cx - cw * 0.22, cy + 3, cw * 0.28, ch * 0.38, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + cw * 0.24, cy + 2, cw * 0.3, ch * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 2. Stylized tapered aerodynamic wind ribbons with tangent curl-swirl tips
        const ribbonCount = 8;
        ctx.lineCap = 'round';
        for (let i = 0; i < ribbonCount; i++) {
          const speed = (145 + (i % 3) * 52) * (0.65 + visualWindStrength * 0.9) * (0.85 + gustEnvelope * 0.35);
          const span = w + 260;
          const sx = ((timeMs * 0.001 * speed + i * 181) % span) - 160;
          const sy =
            ((i * 0.105 + 0.08) * h + Math.sin(timeMs * 0.0017 + i * 2.1) * 14) % (h * 0.8);
          const len = (62 + (i % 3) * 30) * (0.72 + visualWindStrength * 0.65);
          const waveY = Math.sin(timeMs * 0.0034 + i * 1.3) * 7.5 * (0.4 + visualWindStrength * 0.6);
          const alpha = (0.24 + (i % 3) * 0.07) * visualWindStrength * (0.78 + gustEnvelope * 0.32);

          const grad = ctx.createLinearGradient(sx, sy, sx + len, sy);
          const rgb = incognito ? '125, 211, 252' : '59, 130, 246';
          grad.addColorStop(0, `rgba(${rgb}, 0)`);
          grad.addColorStop(0.32, `rgba(${rgb}, ${(alpha * 0.8).toFixed(3)})`);
          grad.addColorStop(0.82, `rgba(${rgb}, ${alpha.toFixed(3)})`);
          grad.addColorStop(1, `rgba(${rgb}, 0.08)`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.8 + (i % 2) * 0.8;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.bezierCurveTo(
            sx + len * 0.33,
            sy + waveY,
            sx + len * 0.68,
            sy - waveY * 0.85,
            sx + len,
            sy - 2
          );
          ctx.stroke();

          // Soft white/cyan inner wind sheen for crisp illustrated look
          ctx.strokeStyle = incognito
            ? `rgba(224, 242, 254, ${(alpha * 0.38).toFixed(3)})`
            : `rgba(255, 255, 255, ${(alpha * 0.72).toFixed(3)})`;
          ctx.lineWidth = 0.85;
          ctx.beginPath();
          ctx.moveTo(sx + len * 0.18, sy - 1);
          ctx.quadraticCurveTo(sx + len * 0.56, sy - waveY * 0.45 - 1, sx + len * 0.94, sy - 3);
          ctx.stroke();

          // Stylized wind-curl spiral tip tangent to ribbon end
          if (i % 2 === 0 && visualWindStrength > 0.16) {
            const curlR = 4.5 + visualWindStrength * 3.8;
            ctx.strokeStyle = `rgba(${rgb}, ${(alpha * 0.78).toFixed(3)})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(sx + len, sy - 2);
            ctx.arc(sx + len, sy - 2 - curlR, curlR, Math.PI * 0.5, -Math.PI * 0.95, true);
            ctx.stroke();
          }
        }

        // 3. Drifting sunlit breeze flecks
        const fleckCount = 12;
        for (let f = 0; f < fleckCount; f++) {
          const fSpeed = (170 + (f % 4) * 38) * (0.7 + visualWindStrength * 0.8);
          const fx = ((timeMs * 0.001 * fSpeed + f * 129) % (w + 60)) - 30;
          const fy = ((f * 0.075 + 0.06) * h + Math.sin(timeMs * 0.0028 + f * 1.7) * 16) % (h * 0.84);
          const fAlpha = (0.26 + (f % 3) * 0.09) * visualWindStrength;
          ctx.fillStyle = incognito
            ? `rgba(186, 230, 253, ${fAlpha.toFixed(3)})`
            : `rgba(59, 130, 246, ${fAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.ellipse(fx, fy, 3.6, 1.3, -0.14, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      const burst = milestoneBurstRef.current;
      let burstT = 0;
      if (burst.active) {
        burst.life += dt;
        burstT = burst.life / burst.duration;
        if (burstT >= 1) {
          burst.active = false;
          burstT = 0;
        }
      }

      const nextHitBoxes: StickerHitBox[] = [];
      if (gameModeRef.current === 'DANANG') {
        DANANG_LANDMARKS.forEach((landmark) => {
          const screenY = originY + (-landmark.floor * BLOCK_HEIGHT + camY) * isoScale;
          if (screenY > -90 && screenY < h + 90) {
            const isReached = currentFloors >= landmark.floor;
            const unlockPulse = burst.active && burst.landmarkId === landmark.id ? burstT : 0;
            const hitBox = drawDaNangLandmarkOnCanvas(
              ctx,
              landmark,
              screenY,
              w,
              isReached,
              incognito,
              langRef.current,
              timeMs,
              isPlaying,
              unlockPulse
            );
            if (hitBox) {
              nextHitBoxes.push(hitBox);
            }
          }
        });
      }
      stickerHitBoxesRef.current = nextHitBoxes;

      const baseColor = stack[0] ?? getBlockColor(0);
      drawIsoPrism(
        ctx,
        0,
        0,
        -7,
        7,
        INITIAL_SIZE,
        INITIAL_SIZE,
        baseColor.hue,
        Math.max(25, baseColor.saturation - 16),
        Math.max(42, baseColor.lightness - 8),
        originX,
        originY,
        camY,
        isoScale,
        0.92
      );

      for (let i = 0; i < stack.length; i++) {
        const b = stack[i];
        const approxY = originY + (-b.index * BLOCK_HEIGHT + camY) * isoScale;
        if (approxY < -140 || approxY > h + 180) continue;
        drawIsoPrism(
          ctx,
          b.x,
          b.z,
          b.index,
          1,
          b.width,
          b.depth,
          b.hue,
          b.saturation,
          b.lightness,
          originX,
          originY,
          camY,
          isoScale,
          1,
          b.wasAutoCorrected
        );
      }

      const moving = movingRef.current;
      if (moving && gameStateRef.current === 'PLAYING') {
        if (!pausedRef.current) {
          const speedFactor = incognito ? 0.65 : 1;
          const stepDist = moving.speed * speedFactor * dt * moving.direction;
          if (moving.axis === 'x') {
            moving.x += stepDist;
            if (moving.x > SWING_BOUND) {
              moving.x = SWING_BOUND;
              moving.direction = -1;
            } else if (moving.x < -SWING_BOUND) {
              moving.x = -SWING_BOUND;
              moving.direction = 1;
            }
          } else {
            moving.z += stepDist;
            if (moving.z > SWING_BOUND) {
              moving.z = SWING_BOUND;
              moving.direction = -1;
            } else if (moving.z < -SWING_BOUND) {
              moving.z = -SWING_BOUND;
              moving.direction = 1;
            }
          }
        }

        const topYIndex = stack.length;
        if (didYouMeanRef.current && stack.length > 0) {
          const prev = stack[stack.length - 1];
          const p0 = toIso(prev.x - prev.width / 2, prev.z - prev.depth / 2, topYIndex + 1, originX, originY, camY, isoScale);
          const p1 = toIso(prev.x + prev.width / 2, prev.z - prev.depth / 2, topYIndex + 1, originX, originY, camY, isoScale);
          const p2 = toIso(prev.x + prev.width / 2, prev.z + prev.depth / 2, topYIndex + 1, originX, originY, camY, isoScale);
          const p3 = toIso(prev.x - prev.width / 2, prev.z + prev.depth / 2, topYIndex + 1, originX, originY, camY, isoScale);
          ctx.save();
          ctx.strokeStyle = 'rgba(66, 133, 244, 0.55)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }

        drawIsoPrism(
          ctx,
          moving.x,
          moving.z,
          topYIndex,
          1,
          moving.width,
          moving.depth,
          moving.hue,
          moving.saturation,
          moving.lightness,
          originX,
          originY,
          camY,
          isoScale,
          0.97
        );
      }

      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const rp = ripplesRef.current[i];
        rp.progress += dt * 1.9;
        if (rp.progress < 0) continue;
        if (rp.progress >= 1) {
          ripplesRef.current.splice(i, 1);
          continue;
        }
        const expand = rp.progress * 38;
        const hw = rp.width / 2 + expand;
        const hd = rp.depth / 2 + expand;
        const p0 = toIso(rp.x - hw, rp.z - hd, rp.yIndex, originX, originY, camY, isoScale);
        const p1 = toIso(rp.x + hw, rp.z - hd, rp.yIndex, originX, originY, camY, isoScale);
        const p2 = toIso(rp.x + hw, rp.z + hd, rp.yIndex, originX, originY, camY, isoScale);
        const p3 = toIso(rp.x - hw, rp.z + hd, rp.yIndex, originX, originY, camY, isoScale);

        ctx.save();
        ctx.globalAlpha = (1 - rp.progress) * 0.85;
        ctx.strokeStyle = rp.color;
        ctx.lineWidth = 2.5 * (1 - rp.progress) + 0.5;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      for (let i = fallingRef.current.length - 1; i >= 0; i--) {
        const fp = fallingRef.current[i];
        fp.vy -= 18 * dt;
        fp.y += fp.vy * dt * 0.45;
        fp.x += fp.vx * dt;
        fp.z += fp.vz * dt;
        fp.alpha -= dt * 1.15;

        if (fp.alpha <= 0) {
          fallingRef.current.splice(i, 1);
          continue;
        }

        drawIsoPrism(
          ctx,
          fp.x,
          fp.z,
          fp.y,
          1,
          fp.width,
          fp.depth,
          fp.hue,
          fp.saturation,
          fp.lightness,
          originX,
          originY,
          camY,
          isoScale,
          Math.max(0, fp.alpha)
        );
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.life += dt;
        if (pt.life >= pt.maxLife) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        pt.vy += 260 * dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        const alpha = 1 - pt.life / pt.maxLife;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw 3D Golden Chibi Dragon Mascot standing & jumping onto each newly stacked block
      const topPlaced = stack[stack.length - 1];
      if (topPlaced) {
        mascotFloorYRef.current += (currentFloors - mascotFloorYRef.current) * Math.min(1, dt * 12);

        let jumpOffset = 0;
        let jumpProgress: number | null = null;

        const jump = mascotJumpRef.current;
        if (jump.active) {
          jump.life += dt;
          const p = Math.min(1, jump.life / jump.duration);
          if (p >= 1) {
            jump.active = false;
            jump.isMilestone = false;
          } else {
            jumpProgress = p;
            jumpOffset = Math.sin(p * Math.PI) * jump.peak;
          }
        }

        const mascot3DCanvas = dragonMascotRenderer.getCanvasForFrame(
          timeMs,
          jumpProgress,
          jump.isPerfect,
          Boolean(jump.isMilestone),
          frameWindStrength
        );

        if (mascot3DCanvas && mascot3DCanvas.width > 0) {
          const isTitle = gameStateRef.current === 'TITLE_MENU';
          const minBlockDim = Math.min(topPlaced.width, topPlaced.depth);
          const dimFactor = Math.min(1, Math.max(0.68, minBlockDim / 110));
          const drawSize = (w < 520 ? (isTitle ? 94 : 74) : isTitle ? 114 : 90) * dimFactor;

          const topCenter = toIso(
            topPlaced.x,
            topPlaced.z,
            mascotFloorYRef.current + 1,
            originX,
            originY,
            camY,
            isoScale
          );
          const anchorX = topCenter.x;
          const anchorY = topCenter.y;
          const feetNormY = dragonMascotRenderer.getFeetAnchorY();

          ctx.save();
          if (jumpOffset > 1) {
            const shadowScale = Math.max(0.55, 1 - jumpOffset / 65);
            ctx.fillStyle = incognito ? 'rgba(15, 23, 42, 0.36)' : 'rgba(15, 23, 42, 0.16)';
            ctx.beginPath();
            ctx.ellipse(
              anchorX,
              anchorY,
              drawSize * 0.24 * shadowScale,
              drawSize * 0.12 * shadowScale,
              0,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }

          const drawX = anchorX - drawSize * 0.5;
          const drawY = anchorY - drawSize * feetNormY - jumpOffset;
          ctx.drawImage(mascot3DCanvas, drawX, drawY, drawSize, drawSize);
          ctx.restore();

          mascotHitBoxRef.current = {
            x: anchorX - drawSize * 0.34,
            y: drawY + drawSize * 0.1,
            width: drawSize * 0.68,
            height: drawSize * 0.78,
          };
        } else {
          mascotHitBoxRef.current = null;
        }
      } else {
        mascotHitBoxRef.current = null;
      }

      for (let i = popupsRef.current.length - 1; i >= 0; i--) {
        const pop = popupsRef.current[i];
        pop.life += dt;
        if (pop.life >= pop.maxLife) {
          popupsRef.current.splice(i, 1);
          continue;
        }
        const t = pop.life / pop.maxLife;
        const floatY = pop.y - t * 36;
        const alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.textAlign = 'center';
        ctx.font = '800 15px "Bricolage Grotesque", "Plus Jakarta Sans", sans-serif';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = incognito ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)';
        ctx.strokeText(pop.text, pop.x, floatY);
        ctx.fillStyle = incognito ? 'rgba(15, 23, 42, 0.55)' : 'rgba(15, 23, 42, 0.16)';
        ctx.fillText(pop.text, pop.x, floatY + 1.5);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x, floatY);
        ctx.restore();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      className="h-full w-full block cursor-pointer touch-none select-none"
      aria-label={language === 'vi' ? 'Khu vực chơi xếp tháp isometric' : 'Isometric tower builder canvas'}
    />
  );
};
