import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { Language } from '../types/game';
import { DragonMascot3DViewer } from './DragonMascot3DViewer';

interface MascotDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  isIncognito: boolean;
}

export const MascotDetailModal: React.FC<MascotDetailModalProps> = ({
  isOpen,
  onClose,
  language,
  isIncognito,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mascot-detail-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border p-5 sm:p-6 shadow-xl ${
          isIncognito
            ? 'border-slate-700 bg-[#20232A] text-slate-100'
            : 'border-slate-200 bg-white text-slate-900'
        }`}
      >
        <div className="mx-auto mb-3.5 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 font-display text-xs font-bold">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400">
              DevFest · GDGoC DUT 3D Mascot
            </span>
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

        <DragonMascot3DViewer language={language} isIncognito={isIncognito} />

        <div className="mt-4">
          <h3 id="mascot-detail-title" className="font-display text-xl font-extrabold tracking-tight">
            {language === 'vi'
              ? 'Linh vật Rồng Vàng 3D · GDGoC DUT'
              : '3D Golden Dragon Mascot · GDGoC DUT'}
          </h3>
          <p
            className={`mt-1 text-xs font-medium ${
              isIncognito ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Google Developer Group on Campus · Đại học Bách khoa Đà Nẵng (DUT)
          </p>
          <p
            className={`mt-3 text-sm leading-relaxed ${
              isIncognito ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {language === 'vi'
              ? 'Bé rồng vàng chibi đội mũ đầu rồng đặc trưng, khoác áo thun GDGoC DUT được dựng 3D sống động! Bạn có thể kéo xoay 360° để ngắm từ mọi góc và xem bé rồng nhảy xoay người qua từng tầng tháp.'
              : 'Your golden chibi dragon mascot wearing the iconic dragon hood and a crisp GDGoC DUT tee in interactive 3D! Drag to orbit 360° here and watch it hop and spin up every tower floor.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="game-btn-primary mt-5 w-full min-h-[44px] rounded-xl bg-blue-600 px-4 py-2.5 font-display text-sm font-bold text-white hover:bg-blue-700 cursor-pointer"
        >
          {language === 'vi' ? 'Tiếp tục nhảy tháp' : 'Keep Stacking'}
        </button>
      </div>
    </div>
  );
};
