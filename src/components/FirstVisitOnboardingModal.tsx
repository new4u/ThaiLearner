import React, { useState, useEffect } from 'react';
import { RegisteredStudent } from '../types';
import { DeviceFingerprint } from '../utils/browserFingerprint';
import { studentStudyService } from '../services/studentStudyService';
import {
  Sparkles,
  Video,
  Headphones,
  ArrowRight,
  Fingerprint,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

interface FirstVisitOnboardingModalProps {
  isOpen: boolean;
  currentStudent: RegisteredStudent | null;
  fingerprint: DeviceFingerprint;
  onComplete: (params: {
    updatedStudent: RegisteredStudent;
    canUseYouTube: boolean;
  }) => void;
  onSwitchToClaimAccount: () => void;
}

export const FirstVisitOnboardingModal: React.FC<FirstVisitOnboardingModalProps> = ({
  isOpen,
  currentStudent,
  fingerprint,
  onComplete,
  onSwitchToClaimAccount,
}) => {
  const [nameInput, setNameInput] = useState('');
  const [intentionInput, setIntentionInput] = useState('');
  // 音频优先：默认推荐全球通用的「音频学习」，有需要再选「视频学习」
  const [canUseYouTube, setCanUseYouTube] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentStudent) {
      if (!currentStudent.name.startsWith('新学友 ')) {
        setNameInput(currentStudent.name);
      }
      if (currentStudent.learningGoal) {
        setIntentionInput(currentStudent.learningGoal);
      }
    }
  }, [isOpen, currentStudent]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    const trimmedIntention = intentionInput.trim();

    if (!trimmedName) {
      setErrorMsg('请先填写您的称呼或名字');
      return;
    }
    if (!trimmedIntention) {
      setErrorMsg('请写下您参加本次共学的发心，方便跨设备找回学习档案');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const targetStudent =
        currentStudent || (await studentStudyService.autoEnsureFingerprintStudent());
      const updated = await studentStudyService.updateStudentIdentityStatement(
        targetStudent.id,
        trimmedIntention,
        trimmedName
      );
      onComplete({
        updatedStudent: updated || {
          ...targetStudent,
          name: trimmedName,
          learningGoal: trimmedIntention,
        },
        canUseYouTube,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || '保存信息失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-xl bg-slate-900 border-t sm:border border-amber-500/30 rounded-t-3xl sm:rounded-3xl shadow-2xl text-slate-100 max-h-[94vh] overflow-y-auto flex flex-col">
        {/* Mobile grab handle */}
        <div className="sm:hidden w-10 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">
          {/* Header & Fingerprint Recognition Readout */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 font-mono">
                <Fingerprint className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>浏览器指纹已识读</span>
                <span aria-hidden="true">·</span>
                <span>{fingerprint.deviceLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{fingerprint.fingerprintId.slice(0, 11)}</span>
              </div>

              <button
                type="button"
                onClick={onSwitchToClaimAccount}
                className="text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 cursor-pointer min-h-[32px] whitespace-nowrap shrink-0"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>找回旧账号</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  欢迎来到「泰学」共学空间
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  无需注册密码 · 填写称呼与发心即可自动绑定本机学习进度
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: Name & Intention */}
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label htmlFor="onboarding-name" className="block text-xs font-semibold text-slate-200">
                1. 您的称呼 / 名字
              </label>
              <input
                id="onboarding-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={24}
                autoComplete="name"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="onboarding-intention" className="block text-xs font-semibold text-slate-200">
                2. 本次参与共学的发心
              </label>
              <textarea
                id="onboarding-intention"
                value={intentionInput}
                onChange={(e) => setIntentionInput(e.target.value)}
                rows={3}
                className="w-full min-h-[88px] px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400 leading-relaxed resize-none transition"
              />
            </div>
          </div>

          {/* Step 2: Two Learning Branches (Audio-First) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-200">
              3. 请选择初始学习方式（共用同一套字幕，随时可在页内滑块切换）
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCanUseYouTube(false)}
                className={`min-h-[76px] p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                  !canUseYouTube
                    ? 'bg-cyan-500/15 border-cyan-400 ring-1 ring-cyan-400/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    !canUseYouTube
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Headphones className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white">音频学习（推荐 · 全球通用）</div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                    海内外皆可用：听隆波开示 MP3、离线缓存与全套逐词字幕
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCanUseYouTube(true)}
                className={`min-h-[76px] p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                  canUseYouTube
                    ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    canUseYouTube
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Video className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white">视频学习（YouTube）</div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                    可用 YouTube 时：泰中双视频同步对照，共用同一套字幕
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Primary Submit CTA */}
          <div className="pt-1 pb-2 sm:pb-0">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.99] text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
            >
              <span>
                {isSubmitting
                  ? '正在保存...'
                  : canUseYouTube
                  ? '进入「视频学习」并开启导览'
                  : '进入「音频学习」并开启导览'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
