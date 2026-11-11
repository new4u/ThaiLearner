import React, { useState, useEffect } from 'react';
import { RegisteredStudent } from '../types';
import { studentStudyService } from '../services/studentStudyService';
import { 
  Heart, Sparkles, CheckCircle2, ShieldCheck, 
  HelpCircle, RefreshCw, X, UserCheck 
} from 'lucide-react';

interface StatementIdentityModalProps {
  currentStudent: RegisteredStudent | null;
  isOpen: boolean;
  onClose: () => void;
  onStudentUpdated: (student: RegisteredStudent) => void;
  initialMode?: 'set_statement' | 'claim_statement';
}

export const StatementIdentityModal: React.FC<StatementIdentityModalProps> = ({
  currentStudent,
  isOpen,
  onClose,
  onStudentUpdated,
  initialMode = 'set_statement'
}) => {
  const [mode, setMode] = useState<'set_statement' | 'claim_statement'>(initialMode);
  const [statementInput, setStatementInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 找回账号选择题状态
  const [challengeOptions, setChallengeOptions] = useState<Array<{ id: string; statement: string; isTarget?: boolean }>>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg(null);
      setSuccessMsg(null);
      if (currentStudent) {
        setNameInput(currentStudent.name.startsWith('新学友 ') ? '' : currentStudent.name);
        setStatementInput(currentStudent.learningGoal || '');
      }
      if (initialMode === 'claim_statement') {
        loadChallengeOptions();
      }
    }
  }, [isOpen, initialMode, currentStudent]);

  // 加载发心选项列表（用于做选择题认领）
  const loadChallengeOptions = async () => {
    setIsLoadingOptions(true);
    setSelectedStatement(null);
    setErrorMsg(null);
    try {
      const { options } = await studentStudyService.getIdentityChallengeOptions(currentStudent?.id);
      setChallengeOptions(options);
    } catch {
      setErrorMsg('拉取共学发心选项失败，请重试');
    } finally {
      setIsLoadingOptions(false);
    }
  };

  if (!isOpen) return null;

  // 提交写入/更新我的一段话
  const handleSaveStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementInput.trim()) {
      setErrorMsg('请写下您真实的发心或参加需求');
      return;
    }
    if (!currentStudent) {
      // 若当前尚未初始化，先自动依据指纹注号
      const created = await studentStudyService.autoEnsureFingerprintStudent();
      const updated = await studentStudyService.updateStudentIdentityStatement(
        created.id,
        statementInput,
        nameInput
      );
      if (updated) {
        onStudentUpdated(updated);
        setSuccessMsg('已成功记录，并同步至云端数据库！');
        setTimeout(() => onClose(), 1200);
      }
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const updated = await studentStudyService.updateStudentIdentityStatement(
        currentStudent.id,
        statementInput,
        nameInput
      );
      if (updated) {
        onStudentUpdated(updated);
        setSuccessMsg('已成功更新，数据已同步至云端数据库！');
        setTimeout(() => onClose(), 1200);
      } else {
        setErrorMsg('更新失败，请重试');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || '保存出现异常');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 通过点击选择题认领账号
  const handleClaimByChoice = async () => {
    if (!selectedStatement) {
      setErrorMsg('请点击选出哪一段是您当时写下的');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const student = await studentStudyService.claimAccountByStatement(selectedStatement);
      if (student) {
        onStudentUpdated(student);
        setSuccessMsg(`认领成功！欢迎回来，【${student.name}】！`);
        setTimeout(() => onClose(), 1200);
      } else {
        setErrorMsg('未找到匹配该发心语句的记录，请尝试其他选项或直接写一段新的');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || '认领验证失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl p-5 sm:p-7 text-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* 光影点缀 */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 顶部标题与关闭 */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>发心登录认证</span>
              </h3>
              <p className="text-[11px] text-stone-400">
                写一段发自内心、独一无二的发心作为身份标识，随时选择认领
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签栏：写发心 vs 点选发心找回账号 */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 my-3.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('set_statement');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'set_statement'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>写入我的发心</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('claim_statement');
              setErrorMsg(null);
              loadChallengeOptions();
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'claim_statement'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>选出我写的话找回</span>
          </button>
        </div>

        {/* 提示消息 */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 模式 1：填写一段话作为身份标识 */}
        {mode === 'set_statement' && (
          <form onSubmit={handleSaveStatement} className="space-y-3.5 overflow-y-auto pr-1">
            {/* 称呼 */}
            <div className="space-y-1">
              <label className="text-xs text-stone-300 font-semibold">
                称呼
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                maxLength={20}
                className="w-full px-3 py-2 bg-slate-950/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* 核心一段话 */}
            <div className="space-y-1">
              <label className="text-xs text-stone-300 font-semibold">
                参加活动的需求 / 真实发心
              </label>
              <textarea
                value={statementInput}
                onChange={e => setStatementInput(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 bg-slate-950/90 border border-amber-500/40 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed resize-none"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>{isSubmitting ? '正在同步...' : '保存并同步'}</span>
              </button>
            </div>
          </form>
        )}

        {/* 模式 2：选择题认领账号 */}
        {mode === 'claim_statement' && (
          <div className="space-y-3.5 overflow-y-auto pr-1">
            {isLoadingOptions ? (
              <div className="py-8 flex flex-col items-center justify-center text-xs text-stone-400 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                <span>正在提取...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {challengeOptions.length > 0 ? (
                  challengeOptions.map((opt, i) => {
                    const isSelected = selectedStatement === opt.statement;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedStatement(opt.statement)}
                        className={`p-3 rounded-2xl border transition cursor-pointer text-xs flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50 shadow-md'
                            : 'bg-slate-950/70 border-slate-800 text-stone-300 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold ${
                          isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-stone-400'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <div className="flex-1 leading-relaxed">
                          “{opt.statement}”
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs text-stone-500">
                    暂无可比对记录
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={loadChallengeOptions}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="换一批"
              >
                <RefreshCw className="w-3.5 h-3.5 text-stone-400" />
                <span>换一批</span>
              </button>

              <button
                type="button"
                onClick={handleClaimByChoice}
                disabled={!selectedStatement || isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                <span>{isSubmitting ? '正在验证...' : '确认并登录'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
