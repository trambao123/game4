import React from 'react';
import { X, MapPin, CheckCircle2, Lock, ChevronRight } from 'lucide-react';
import { DANANG_LANDMARKS } from '../data/landmarks';
import { DaNangLandmark, Language } from '../types/game';
import { DaNangLandmarkModel } from './DaNangLandmarkModel';

interface LandmarkAtlasModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedIds: string[];
  highestFloor: number;
  language: Language;
  isIncognito: boolean;
  onSelectLandmark: (landmark: DaNangLandmark) => void;
}

export const LandmarkAtlasModal: React.FC<LandmarkAtlasModalProps> = ({
  isOpen,
  onClose,
  unlockedIds,
  highestFloor,
  language,
  isIncognito,
  onSelectLandmark,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 p-0 sm:p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="atlas-modal-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full sm:max-w-2xl max-h-[88vh] overflow-hidden rounded-t-3xl sm:rounded-2xl border shadow-xl flex flex-col ${
          isIncognito
            ? 'border-slate-700 bg-[#20232A] text-slate-100'
            : 'border-slate-200 bg-white text-slate-900'
        }`}
      >
        <div
          className={`flex items-center justify-between border-b px-5 py-4 ${
            isIncognito ? 'border-slate-700/80' : 'border-slate-200'
          }`}
        >
          <div>
            <h2 id="atlas-modal-title" className="font-display text-base sm:text-lg font-bold">
              {language === 'vi'
                ? '7 Biểu tượng Đà Nẵng theo Độ cao'
                : '7 Da Nang Altitude Signatures'}
            </h2>
            <p className={`text-xs mt-0.5 ${isIncognito ? 'text-slate-400' : 'text-slate-500'}`}>
              {language === 'vi'
                ? `Mở khóa ${unlockedIds.length}/${DANANG_LANDMARKS.length} · Chạm từng sticker để phóng to`
                : `Unlocked ${unlockedIds.length}/${DANANG_LANDMARKS.length} · Tap any sticker to inspect`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors ${
              isIncognito
                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
            aria-label={language === 'vi' ? 'Đóng bản đồ' : 'Close atlas'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-3">
          {DANANG_LANDMARKS.map((landmark) => {
            const isUnlocked = unlockedIds.includes(landmark.id);
            return (
              <button
                key={landmark.id}
                type="button"
                onClick={() => onSelectLandmark(landmark)}
                className={`w-full text-left rounded-xl border p-3.5 transition-colors flex items-center gap-3.5 min-h-[72px] ${
                  isUnlocked
                    ? isIncognito
                      ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/80'
                    : isIncognito
                      ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/50'
                      : 'border-slate-200/80 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex h-16 w-20 shrink-0 items-center justify-center">
                  <DaNangLandmarkModel
                    id={landmark.id}
                    className="h-16 w-20"
                    dimmed={!isUnlocked}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: isUnlocked ? landmark.accentHex : '#94A3B8' }}
                      />
                      <h3 className="font-display text-sm font-bold truncate">
                        {language === 'vi' ? landmark.nameVi : landmark.nameEn}
                      </h3>
                    </div>

                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">
                          {language === 'vi' ? 'Đã đạt' : 'Reached'}
                        </span>
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium shrink-0 ${
                          isIncognito ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>F{landmark.floor}</span>
                      </span>
                    )}
                  </div>

                  <div
                    className={`mt-1 flex flex-col sm:flex-row sm:items-center sm:gap-2 text-xs tabular-nums ${
                      isIncognito ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    <span className="shrink-0 font-semibold">
                      F{landmark.floor} · {landmark.altitudeMeters}m
                    </span>
                    <span className="hidden sm:inline" aria-hidden="true">
                      ·
                    </span>
                    <span className="truncate">
                      {language === 'vi' ? landmark.districtVi : landmark.districtEn}
                    </span>
                  </div>
                </div>

                <ChevronRight
                  className={`h-4 w-4 shrink-0 ${
                    isIncognito ? 'text-slate-500' : 'text-slate-400'
                  }`}
                />
              </button>
            );
          })}
          <p className={`pt-1 text-center font-display text-xs font-semibold tabular-nums ${isIncognito ? 'text-slate-400' : 'text-slate-500'}`}>
            {language === 'vi' ? `Kỷ lục cao nhất: ${highestFloor} điểm` : `Best score: ${highestFloor}`}
          </p>
        </div>
      </div>
    </div>
  );
};
