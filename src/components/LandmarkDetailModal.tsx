import React from 'react';
import { X, MapPin, CheckCircle2, Lock } from 'lucide-react';
import { DaNangLandmark, Language } from '../types/game';
import { DaNangLandmarkModel } from './DaNangLandmarkModel';

interface LandmarkDetailModalProps {
  landmark: DaNangLandmark | null;
  onClose: () => void;
  onOpenAtlas?: () => void;
  isUnlocked: boolean;
  language: Language;
  isIncognito: boolean;
}

export const LandmarkDetailModal: React.FC<LandmarkDetailModalProps> = ({
  landmark,
  onClose,
  onOpenAtlas,
  isUnlocked,
  language,
  isIncognito,
}) => {
  if (!landmark) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 p-0 sm:p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="landmark-detail-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border p-5 sm:p-6 shadow-xl transition-transform ${
          isIncognito
            ? 'border-slate-700 bg-[#20232A] text-slate-100'
            : 'border-slate-200 bg-white text-slate-900'
        }`}
      >
        {/* Mobile sheet drag handle */}
        <div className="mx-auto mb-3.5 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-display font-bold tabular-nums">
            <MapPin className="h-4 w-4 shrink-0" style={{ color: landmark.accentHex }} />
            <span className="font-bold" style={{ color: landmark.accentHex }}>
              F{landmark.floor} · {landmark.altitudeMeters}m
            </span>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            {isUnlocked ? (
              <span className="inline-flex items-center gap-1 font-sans font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{language === 'vi' ? 'Đã mở khóa' : 'Unlocked'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-sans font-medium text-slate-400">
                <Lock className="h-3.5 w-3.5" />
                <span>{language === 'vi' ? 'Chưa đạt' : 'Locked'}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl transition-colors ${
              isIncognito
                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
            aria-label={language === 'vi' ? 'Đóng' : 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Large Sticker Showcase */}
        <div
          className={`mt-2 flex items-center justify-center rounded-2xl border py-5 px-4 ${
            isIncognito ? 'border-slate-700/70 bg-slate-900/50' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <DaNangLandmarkModel id={landmark.id} className="h-36 sm:h-44 w-48 sm:w-56" />
        </div>

        <div className="mt-4">
          <h3 id="landmark-detail-title" className="font-display text-xl font-extrabold tracking-tight">
            {language === 'vi' ? landmark.nameVi : landmark.nameEn}
          </h3>
          <p
            className={`mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs ${
              isIncognito ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span className="font-medium">{language === 'vi' ? landmark.districtVi : landmark.districtEn}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular whitespace-nowrap">{landmark.coordinates}</span>
          </p>
          <p
            className={`mt-3 text-sm leading-relaxed ${
              isIncognito ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {language === 'vi' ? landmark.factVi : landmark.factEn}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2.5">
          {onOpenAtlas && (
            <button
              type="button"
              onClick={onOpenAtlas}
              className={`game-btn-secondary min-h-[44px] flex-1 rounded-xl border px-3.5 py-2.5 font-display text-sm font-bold cursor-pointer ${
                isIncognito
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {language === 'vi' ? 'Tất cả 7 địa danh' : 'All 7 Landmarks'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="game-btn-primary min-h-[44px] flex-1 rounded-xl bg-blue-600 px-4 py-2.5 font-display text-sm font-bold text-white hover:bg-blue-700 cursor-pointer"
          >
            {language === 'vi' ? 'Tiếp tục chơi' : 'Back to Tower'}
          </button>
        </div>
      </div>
    </div>
  );
};
