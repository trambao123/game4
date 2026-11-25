export type GameState = 'TITLE_MENU' | 'PLAYING' | 'GAME_OVER';

export type GameMode = 'DANANG' | 'CLASSIC';

export type Language = 'vi' | 'en';

export type AudioScale = 'pentatonic' | 'major' | 'lydian';

export interface TowerBlock {
  index: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  hue: number;
  saturation: number;
  lightness: number;
  isPerfect: boolean;
  wasAutoCorrected?: boolean;
}

export interface MovingBlock {
  x: number;
  z: number;
  width: number;
  depth: number;
  axis: 'x' | 'z';
  direction: 1 | -1;
  speed: number;
  hue: number;
  saturation: number;
  lightness: number;
}

export interface FallingPiece {
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  vy: number;
  vx: number;
  vz: number;
  rot: number;
  vrot: number;
  alpha: number;
  hue: number;
  saturation: number;
  lightness: number;
}

export interface PerfectRipple {
  x: number;
  z: number;
  yIndex: number;
  width: number;
  depth: number;
  progress: number;
  color: string;
}

export interface FloatingScorePopup {
  x: number;
  y: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export type LandmarkArtId =
  | 'dragon_bridge'
  | 'han_bridge'
  | 'carp_dragon'
  | 'linh_ung'
  | 'admin_center'
  | 'golden_bridge'
  | 'ban_co_peak';

export interface DaNangLandmark {
  id: LandmarkArtId;
  floor: number;
  altitudeMeters: number;
  nameVi: string;
  nameEn: string;
  districtVi: string;
  districtEn: string;
  factVi: string;
  factEn: string;
  accentHex: string;
  coordinates: string;
  imagePath: string;
}
