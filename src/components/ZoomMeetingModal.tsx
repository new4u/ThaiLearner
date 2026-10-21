import React, { useState } from 'react';
import { ZoomMeetingInfo } from '../types';
import { 
  Video, Copy, Check, ExternalLink, X, Settings2, 
  Clock, Users, Headphones, Sparkles, MessageSquare 
} from 'lucide-react';

interface ZoomMeetingModalProps {
  zoomInfo: ZoomMeetingInfo;
  onUpdateZoomInfo: (newInfo: ZoomMeetingInfo) => void;
  onClose: () => void;
}

export const ZoomMeetingModal: React.FC<ZoomMeetingModalProps> = ({
  zoomInfo,
  onUpdateZoomInfo,
  onClose
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [meetingTopic, setMeetingTopic] = useState(zoomInfo.meetingTopic);
  const [meetingId, setMeetingId] = useState(zoomInfo.meetingId);
  const [passcode, setPasscode] = useState(zoomInfo.passcode);
  const [joinUrl, setJoinUrl] = useState(zoomInfo.joinUrl);
  const [practiceRoomUrl, setPracticeRoomUrl] = useState(zoomInfo.practiceRoomUrl);
  const [scheduleNotice, setScheduleNotice] = useState(zoomInfo.scheduleNotice);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateZoomInfo({
      meetingTopic: meetingTopic.trim(),
      meetingId: meetingId.trim(),
      passcode: passcode.trim(),
      joinUrl: joinUrl.trim(),
      practiceRoomUrl: practiceRoomUrl.trim(),
      scheduleNotice: scheduleNotice.trim()
    });
    setIsEditing(false);
  };

  const handleCopyNotice = () => {
    const text = `AC邀请你参加已安排的Zoom会议。\n\n` +
      `主题: ${zoomInfo.meetingTopic}\n\n` +
      `加入Zoom会议\n` +
      `${zoomInfo.joinUrl}\n\n` +
      `会议号: ${zoomInfo.meetingId}\n` +
      `密码: ${zoomInfo.passcode}\n\n` +
      `—— 泰法语声闻共学工作台 · 把隆波的殊胜法语映入日常生活 ——`;

    navigator.clipboard.writeText(text);
    setCopiedType('notice');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyCredentials = () => {
    const text = `Zoom 会议号: ${zoomInfo.meetingId}\n密码: ${zoomInfo.passcode}\n直达链接: ${zoomInfo.joinUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedType('creds');
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5" />
            Zoom 共学课堂与练习室专属通道
          </span>
          <span className="text-xs text-slate-400">
            预留专属链接与会议室
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          Zoom 现场直播间 & 学员日常跟读练习房
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          此处已为空出 Zoom 链接，供主讲带读、学员上课抓耳互动，以及课后平时自由连麦练习跟读与泰语打字使用。
        </p>

        {/* Action button to toggle edit mode */}
        <div className="flex items-center justify-between mt-4 pb-2 border-b border-slate-800">
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {zoomInfo.scheduleNotice}
          </span>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{isEditing ? '取消编辑' : '自定义修改 Zoom 链接'}</span>
          </button>
        </div>

        {/* Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="my-5 p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">共学主题</label>
                <input
                  type="text"
                  value={meetingTopic}
                  onChange={e => setMeetingTopic(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">开课时间提醒</label>
                <input
                  type="text"
                  value={scheduleNotice}
                  onChange={e => setScheduleNotice(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Zoom 会议号</label>
                <input
                  type="text"
                  value={meetingId}
                  onChange={e => setMeetingId(e.target.value)}
                  placeholder="如: 892 3741 5568"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">会议密码</label>
                <input
                  type="text"
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  placeholder="如: 888888"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">正式课堂直达链接 (URL)</label>
              <input
                type="text"
                value={joinUrl}
                onChange={e => setJoinUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">平时学员练习房链接 (URL)</label>
              <input
                type="text"
                value={practiceRoomUrl}
                onChange={e => setPracticeRoomUrl(e.target.value)}
                placeholder="https://zoom.us/j/... (练习房)"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
              >
                保存配置
              </button>
            </div>
          </form>
        ) : (
          /* Cards view */
          <div className="my-5 space-y-4">
            {/* Room 1: Official Live Session */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-blue-500/30 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500 text-white flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  正式共学课堂直播间
                </span>
                <span className="text-xs font-mono text-slate-400">1小时沉浸共修</span>
              </div>

              <h3 className="text-base font-bold text-white mb-2">{zoomInfo.meetingTopic}</h3>

              <div className="grid grid-cols-2 gap-3 my-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Zoom 会议号</span>
                  <span className="font-mono text-sm font-bold text-amber-400">{zoomInfo.meetingId}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">会议密码</span>
                  <span className="font-mono text-sm font-bold text-slate-200">{zoomInfo.passcode}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={zoomInfo.joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 flex items-center gap-2 transition hover:scale-105 active:scale-95"
                >
                  <span>立即直达 Zoom 课堂</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={handleCopyCredentials}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  {copiedType === 'creds' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'creds' ? '已复制号密' : '复制会议号与密码'}</span>
                </button>

                <button
                  onClick={handleCopyNotice}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  {copiedType === 'notice' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'notice' ? '已复制群邀请' : '一键复制完整邀请'}</span>
                </button>
              </div>
            </div>

            {/* Room 2: Practice Room (24h Daily Free Practice) */}
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/40">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-indigo-200">
                    学员日常跟读与打字练习房
                  </span>
                </div>
                <span className="text-[11px] text-cyan-400 font-medium">随时开麦 · 自由结对</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                平时供同修自由进入连麦，借助工作台练习影子跟读、互相考 Kedmanee 泰语键盘打字与生活词（如双条车“掰聊”）。
              </p>

              <a
                href={zoomInfo.practiceRoomUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition"
              >
                <span>进入自由练习房间</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>带读前请提前 5 分钟进入测试麦克风与快捷键</span>
          <span className="text-amber-400/90 font-medium">把隆波的殊胜法语映入日常生活</span>
        </div>
      </div>
    </div>
  );
};
