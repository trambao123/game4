import React from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { AudioScale, Language } from '../types/game';

interface MusicLabPanelProps {
  language: Language;
  isMuted: boolean;
  onToggleMute: () => void;
  scale: AudioScale;
  onChangeScale: (scale: AudioScale) => void;
  comboStreak: number;
  lastNoteName: string;
  isIncognito: boolean;
}

export const MusicLabPanel: React.FC<MusicLabPanelProps> = ({
  language,
  isMuted,
  onToggleMute,
  scale,
  onChangeScale,
  comboStreak,
  lastNoteName,
  isIncognito,
}) => {
  const scales: { id: AudioScale; label: string }[] = [
    { id: 'pentatonic', label: 'Pentatonic' },
    { id: 'major', label: 'Major' },
    { id: 'lydian', label: 'Lydian' },
  ];

  const nextPerfectPoints =
    comboStreak >= 4 ? 6 : comboStreak >= 2 ? 5 : comboStreak === 1 ? 4 : 3;

  return (
    <section
      className={`rounded-xl border p-4 transition-colors ${
        isIncognito
          ? 'border-slate-700/80 bg-[#20232A] text-slate-100'
          : 'border-slate-200 bg-white text-slate-900'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className={`h-4 w-4 shrink-0 ${isIncognito ? 'text-sky-400' : 'text-blue-600'}`} />
          <h2 className="font-display text-sm font-bold tracking-tight truncate">
            {language === 'vi' ? 'Âm thanh Hiệu ứng (SFX)' : 'Sound Effects Studio'}
          </h2>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className={`game-btn-secondary min-h-[40px] flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
            isIncognito
              ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
          }`}
          aria-label={isMuted ? 'Unmute sound effects' : 'Mute sound effects'}
        >
          {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          <span>{isMuted ? (language === 'vi' ? 'Đã tắt' : 'Muted') : language === 'vi' ? 'Đang bật' : 'SFX On'}</span>
        </button>
      </div>

      <div
        className={`mt-2.5 flex items-center justify-between text-xs tabular-nums ${
          isIncognito ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        <span>
          {language === 'vi' ? 'Nốt Perfect' : 'Last chime'}:{' '}
          <strong className={`font-display font-bold ${isIncognito ? 'text-slate-100' : 'text-slate-900'}`}>
            {lastNoteName || '—'}
          </strong>
        </span>
        <span>
          {language === 'vi' ? 'Perfect tiếp' : 'Next Perfect'}:{' '}
          <strong className={`font-display font-bold ${isIncognito ? 'text-sky-400' : 'text-amber-600'}`}>
            +{isIncognito ? nextPerfectPoints * 2 : nextPerfectPoints}
          </strong>
        </span>
      </div>

      {/* Chrome Music Lab Perfect Combo Scale Selector */}
      <div
        className={`mt-3 grid grid-cols-3 gap-1 rounded-lg p-1 ${
          isIncognito ? 'bg-slate-900/70' : 'bg-slate-100'
        }`}
        role="group"
        aria-label={language === 'vi' ? 'Âm giai hiệu ứng Perfect' : 'Perfect chime scale'}
      >
        {scales.map((item) => {
          const active = scale === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeScale(item.id)}
              className={`min-h-[36px] rounded-md px-2 py-1 font-display text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? isIncognito
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-900 shadow-xs'
                  : isIncognito
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <p
        className={`mt-2.5 text-[11px] leading-relaxed ${
          isIncognito ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        {language === 'vi'
          ? 'Thả thường +1đ · Thả Perfect leo nốt nhạc +3 đến +6đ · Chạm trực tiếp vào sticker Đà Nẵng trên màn hình để xem thông tin.'
          : 'Normal drop +1 pt · Perfect climbs scale notes for +3 to +6 pts · Tap any Da Nang sticker on canvas to inspect.'}
      </p>
    </section>
  );
};
