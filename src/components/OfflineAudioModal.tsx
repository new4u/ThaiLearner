import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CuratedLesson } from '../types';
import {
  OfflineAudioMeta,
  OfflineTrackType,
  OFFICIAL_FREE_AUDIO_ARCHIVES,
  offlineAudioStorage,
  fetchOfficialAudioBlob,
  buildAudioProxyUrl,
  formatBytes,
  triggerBlobDownload,
} from '../services/offlineAudioStorage';
import {
  AudioRecorderSession,
  RecordedAudioResult,
  RecordingSourceMode,
} from '../utils/audioRecorder';
import {
  X,
  Headphones,
  Upload,
  Mic,
  MonitorSpeaker,
  Download,
  Play,
  Trash2,
  FileAudio,
  Check,
  AlertCircle,
  Globe,
  Square,
  Save,
} from 'lucide-react';

interface OfflineAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessons: CuratedLesson[];
  currentLesson: CuratedLesson;
  activeOfflineTracks: {
    thai?: { fileName: string; lessonId: string };
    chinese?: { fileName: string; lessonId: string };
  };
  onAudioActivated: (
    lessonId: string,
    trackType: OfflineTrackType,
    blob: Blob,
    meta: OfflineAudioMeta
  ) => void;
  onClearActiveTrack?: (trackType: 'thai_audio' | 'chinese_audio') => void;
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '--:--';
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getTrackLabel(trackType: OfflineTrackType): string {
  if (trackType === 'thai_audio') return '🇹🇭 泰语原声轨';
  if (trackType === 'chinese_audio') return '🇨🇳 中文同传轨';
  return '🎙️ 我的跟读录音';
}

function getSourceLabel(sourceKind: OfflineAudioMeta['sourceKind']): string {
  if (sourceKind === 'recording') return '浏览器纯音频录制';
  if (sourceKind === 'official_archive') return '官方公开 MP3 存档';
  return '本地导入音频';
}

export const OfflineAudioModal: React.FC<OfflineAudioModalProps> = ({
  isOpen,
  onClose,
  lessons,
  currentLesson,
  activeOfflineTracks,
  onAudioActivated,
  onClearActiveTrack,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'record'>('library');
  const [targetLessonId, setTargetLessonId] = useState<string>(currentLesson.id);
  const [targetTrackType, setTargetTrackType] = useState<OfflineTrackType>('thai_audio');
  const [cachedTracks, setCachedTracks] = useState<OfflineAudioMeta[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

  // Local file upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Official archive & custom MP3 proxy fetch
  const [customAudioUrl, setCustomAudioUrl] = useState('');
  const [fetchingArchiveId, setFetchingArchiveId] = useState<string | null>(null);
  const [fetchProgressText, setFetchProgressText] = useState('');

  // Recording state
  const recorderRef = useRef<AudioRecorderSession | null>(null);
  const [recordingSource, setRecordingSource] = useState<RecordingSourceMode>('tab_audio');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordedPreview, setRecordedPreview] = useState<{
    result: RecordedAudioResult;
    previewUrl: string;
  } | null>(null);

  // Inline feedback banner
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedLesson = useMemo(() => {
    return lessons.find(l => l.id === targetLessonId) || currentLesson;
  }, [lessons, targetLessonId, currentLesson]);

  const totalCacheBytes = useMemo(() => {
    return cachedTracks.reduce((acc, item) => acc + (item.sizeBytes || 0), 0);
  }, [cachedTracks]);

  const refreshCachedMeta = async () => {
    setIsLoadingMeta(true);
    try {
      const list = await offlineAudioStorage.getAllCachedMeta();
      setCachedTracks(list);
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || '读取本地离线音频库失败' });
    } finally {
      setIsLoadingMeta(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTargetLessonId(currentLesson.id);
      setNotice(null);
      refreshCachedMeta();
    } else {
      // Closing modal stops active recording cleanly to avoid dangling mic/tab handles
      if (recorderRef.current?.isRecording()) {
        recorderRef.current.cleanup();
        setIsRecording(false);
      }
    }
  }, [isOpen, currentLesson.id]);

  useEffect(() => {
    return () => {
      if (recordedPreview?.previewUrl) {
        URL.revokeObjectURL(recordedPreview.previewUrl);
      }
      recorderRef.current?.cleanup();
    };
  }, [recordedPreview]);

  if (!isOpen) return null;

  const showSuccess = (text: string) => setNotice({ type: 'success', text });
  const showError = (text: string) => setNotice({ type: 'error', text });

  // Handle local audio file selection or drag-drop
  const handleLocalAudioFile = async (file: File) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    const isVideoExt =
      lower.endsWith('.mp4') ||
      lower.endsWith('.mkv') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.avi') ||
      file.type.startsWith('video/');

    if (isVideoExt && !lower.endsWith('.webm')) {
      showError('本工作台仅支持纯音频文件（MP3 / M4A / WAV / WebM / OGG），暂不载入视频文件');
      return;
    }

    const isAllowedAudio =
      file.type.startsWith('audio/') ||
      /\.(mp3|m4a|wav|webm|ogg|aac|flac|opus)$/i.test(lower);
    if (!isAllowedAudio) {
      showError(`不支持的文件格式「${file.name}」，请选择 MP3、M4A、WAV、WebM 或 OGG 纯音频`);
      return;
    }

    try {
      const meta = await offlineAudioStorage.saveAudioTrack({
        lessonId: selectedLesson.id,
        trackType: targetTrackType,
        lessonTitle: selectedLesson.chineseTitle || selectedLesson.title,
        fileName: file.name,
        blob: file,
        sourceKind: 'local_file',
      });
      await refreshCachedMeta();
      onAudioActivated(selectedLesson.id, targetTrackType, file, meta);
      showSuccess(`已存入本地离线库并加载：${file.name} (${formatBytes(file.size)})`);
    } catch (err: any) {
      showError(err?.message || '保存本地音频失败');
    }
  };

  // Cache official public MP3 into IndexedDB and load immediately
  const handleCacheOfficialMp3 = async (
    itemId: string,
    mp3Url: string,
    fileName: string,
    lessonId: string,
    trackType: 'thai_audio' | 'chinese_audio'
  ) => {
    if (!mp3Url.trim()) {
      showError('请输入官方公开音频 MP3 直链');
      return;
    }
    setFetchingArchiveId(itemId);
    setFetchProgressText('正在建立纯音频安全通道...');
    setNotice(null);

    try {
      const { blob } = await fetchOfficialAudioBlob(mp3Url.trim(), (loaded, total) => {
        if (total && total > 0) {
          const pct = Math.min(100, Math.round((loaded / total) * 100));
          setFetchProgressText(`已缓存 ${formatBytes(loaded)} / ${formatBytes(total)} (${pct}%)`);
        } else {
          setFetchProgressText(`已拉取 ${formatBytes(loaded)}...`);
        }
      });

      const lessonObj = lessons.find(l => l.id === lessonId) || selectedLesson;
      const meta = await offlineAudioStorage.saveAudioTrack({
        lessonId: lessonObj.id,
        trackType,
        lessonTitle: lessonObj.chineseTitle || lessonObj.title,
        fileName,
        blob,
        sourceKind: 'official_archive',
      });

      await refreshCachedMeta();
      onAudioActivated(lessonObj.id, trackType, blob, meta);
      showSuccess(`官方纯音频已离线缓存并激活：${fileName} (${formatBytes(blob.size)})`);
    } catch (err: any) {
      showError(err?.message || '拉取官方 MP3 失败');
    } finally {
      setFetchingArchiveId(null);
      setFetchProgressText('');
    }
  };

  // Start recording
  const handleStartRecording = async () => {
    setNotice(null);
    if (recordedPreview?.previewUrl) {
      URL.revokeObjectURL(recordedPreview.previewUrl);
      setRecordedPreview(null);
    }

    const session = new AudioRecorderSession();
    recorderRef.current = session;
    setRecordingSec(0);
    setAudioLevel(0);

    const prefix =
      recordingSource === 'tab_audio'
        ? `${selectedLesson.id}_${targetTrackType}`
        : `${selectedLesson.id}_followup`;

    const callbacks = {
      onLevel: (rms: number) => setAudioLevel(rms),
      onTick: (sec: number) => setRecordingSec(sec),
      onAutoStop: (res: RecordedAudioResult) => {
        const previewUrl = URL.createObjectURL(res.blob);
        setRecordedPreview({ result: res, previewUrl });
        setIsRecording(false);
        showSuccess(`录制完成，共 ${formatDuration(res.durationSec)} (${formatBytes(res.blob.size)})`);
      },
      onEndedUnexpectedly: () => {
        setIsRecording(false);
        showError('浏览器停止了音频共享，请重新开始录制');
      },
    };

    try {
      if (recordingSource === 'tab_audio') {
        await session.startTabOrSystemAudio(prefix, callbacks);
      } else {
        await session.startMicrophone(prefix, callbacks);
      }
      setIsRecording(true);
    } catch (err: any) {
      session.cleanup();
      setIsRecording(false);
      showError(err?.message || '无法启动录音，请检查浏览器权限');
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current) return;
    try {
      const res = await recorderRef.current.stop();
      const previewUrl = URL.createObjectURL(res.blob);
      setRecordedPreview({ result: res, previewUrl });
      setIsRecording(false);
      showSuccess(`录制完成，时长 ${formatDuration(res.durationSec)} · ${formatBytes(res.blob.size)}`);
    } catch (err: any) {
      setIsRecording(false);
      showError(err?.message || '结束录音失败');
    }
  };

  const handleSaveRecordingToLibrary = async () => {
    if (!recordedPreview) return;
    try {
      const { result } = recordedPreview;
      const meta = await offlineAudioStorage.saveAudioTrack({
        lessonId: selectedLesson.id,
        trackType: targetTrackType,
        lessonTitle: selectedLesson.chineseTitle || selectedLesson.title,
        fileName: result.suggestedFileName,
        blob: result.blob,
        durationSec: result.durationSec,
        sourceKind: 'recording',
      });
      await refreshCachedMeta();
      onAudioActivated(selectedLesson.id, targetTrackType, result.blob, meta);
      showSuccess(`录音已存入「${selectedLesson.chineseTitle}」并立即加载到播放器！`);
    } catch (err: any) {
      showError(err?.message || '写入离线音频库失败');
    }
  };

  const handleActivateCachedTrack = async (meta: OfflineAudioMeta) => {
    try {
      const rec = await offlineAudioStorage.getAudioTrack(meta.lessonId, meta.trackType);
      if (!rec) {
        showError('未在本地库找到该音频文件，可能已被清理');
        await refreshCachedMeta();
        return;
      }
      onAudioActivated(rec.lessonId, rec.trackType, rec.blob, meta);
      showSuccess(`已加载至播放器：${meta.fileName}`);
    } catch (err: any) {
      showError(err?.message || '读取本地音频失败');
    }
  };

  const handleExportCachedTrack = async (meta: OfflineAudioMeta) => {
    try {
      const rec = await offlineAudioStorage.getAudioTrack(meta.lessonId, meta.trackType);
      if (!rec) {
        showError('音频文件不存在');
        return;
      }
      triggerBlobDownload(rec.blob, rec.fileName);
      showSuccess(`正在导出音频文件：${rec.fileName}`);
    } catch (err: any) {
      showError(err?.message || '导出失败');
    }
  };

  const handleDeleteCachedTrack = async (meta: OfflineAudioMeta) => {
    try {
      await offlineAudioStorage.deleteAudioTrack(meta.lessonId, meta.trackType);
      await refreshCachedMeta();
      if (meta.trackType === 'thai_audio' && activeOfflineTracks.thai?.lessonId === meta.lessonId) {
        onClearActiveTrack?.('thai_audio');
      }
      if (meta.trackType === 'chinese_audio' && activeOfflineTracks.chinese?.lessonId === meta.lessonId) {
        onClearActiveTrack?.('chinese_audio');
      }
      showSuccess(`已从本地缓存移除：${meta.fileName}`);
    } catch (err: any) {
      showError(err?.message || '删除失败');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">
                内地离线纯音频中心 · 录音与本地缓存
              </h3>
              <p className="text-xs text-slate-400 truncate">
                纯音频学习方案（不下载视频） · 浏览器 IndexedDB 离线缓存 · 配合全篇泰中字幕同步跟读
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs + Target Lesson & Track Bar */}
        <div className="px-5 py-3 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'library'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileAudio className="w-3.5 h-3.5" />
              <span>离线音频库与本地载入</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('record')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'record'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>音频录制与导出</span>
            </button>
          </div>

          {/* Target Lesson & Track Selector */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={targetLessonId}
              onChange={(e) => setTargetLessonId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400 max-w-[210px]"
            >
              {lessons.map(l => (
                <option key={l.id} value={l.id}>
                  {l.date} · {l.chineseTitle}
                </option>
              ))}
            </select>

            <select
              value={targetTrackType}
              onChange={(e) => setTargetTrackType(e.target.value as OfflineTrackType)}
              className="bg-slate-950 border border-slate-700 text-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-400"
            >
              <option value="thai_audio">🇹🇭 绑定泰语原声轨</option>
              <option value="chinese_audio">🇨🇳 绑定中文同传轨</option>
              <option value="user_recording">🎙️ 存为跟读录音</option>
            </select>
          </div>
        </div>

        {/* Status Feedback Banner */}
        {notice && (
          <div
            className={`mx-5 mt-3 px-3.5 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              notice.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{notice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'library' ? (
            <>
              {/* 1. Local Audio File Picker & Drag-Drop */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>1. 选取本地纯音频文件（自动存入浏览器离线库）</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    目标：{selectedLesson.date} · {getTrackLabel(targetTrackType)}
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.aac"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLocalAudioFile(f);
                    e.target.value = '';
                  }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleLocalAudioFile(f);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${
                    isDragging
                      ? 'border-amber-400 bg-amber-500/10'
                      : 'border-slate-700 bg-slate-950/60 hover:border-amber-500/50 hover:bg-slate-950'
                  }`}
                >
                  <Upload className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-200">
                    点击选取音频文件，或将 MP3 / M4A / WAV / WebM 录音文件拖入此处
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    存入 IndexedDB 后无需翻墙、刷新页面仍可自动加载并同步对齐字幕
                  </p>
                </div>
              </section>

              {/* 2. Official Public MP3 Archive Proxy */}
              <section className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>2. 寺院公开纯音频 MP3 存档（免跨域直连缓存 / 导出分享）</span>
                  </h4>
                  <span className="text-[11px] text-cyan-300/90 font-mono">
                    Audio-Only Policy · 仅限公开佛教 MP3 存档
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {OFFICIAL_FREE_AUDIO_ARCHIVES.map((item) => {
                    const isBusy = fetchingArchiveId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-amber-300">{item.title}</div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">{item.subtitle}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            来源：{item.sourceDomain} · {getTrackLabel(item.trackType)}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={Boolean(fetchingArchiveId)}
                            onClick={() =>
                              handleCacheOfficialMp3(
                                item.id,
                                item.mp3Url,
                                item.fileName,
                                targetLessonId,
                                item.trackType
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{isBusy ? fetchProgressText || '缓存中...' : '缓存并绑定本课'}</span>
                          </button>

                          <a
                            href={buildAudioProxyUrl(item.mp3Url, item.fileName)}
                            download={item.fileName}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          >
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                            <span>保存 MP3</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom official dhamma.com / zhdhamma MP3 URL */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={customAudioUrl}
                    onChange={(e) => setCustomAudioUrl(e.target.value)}
                    placeholder="粘贴寺院官方 MP3 直链 (如 media.dhamma.com / s3-ap-southeast-1.amazonaws.com/zhdhamma/*.mp3)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    disabled={Boolean(fetchingArchiveId) || !customAudioUrl.trim()}
                    onClick={() => {
                      const rawName = customAudioUrl.split('/').pop()?.split('?')[0] || `dhamma_audio_${Date.now()}.mp3`;
                      const safeTrack: 'thai_audio' | 'chinese_audio' =
                        targetTrackType === 'chinese_audio' ? 'chinese_audio' : 'thai_audio';
                      handleCacheOfficialMp3('custom_url', customAudioUrl, rawName, targetLessonId, safeTrack);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
                  >
                    {fetchingArchiveId === 'custom_url' ? fetchProgressText || '拉取中...' : '代理缓存入库'}
                  </button>
                </div>
              </section>

              {/* 3. Cached IndexedDB Tracks List */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-emerald-400" />
                    <span>3. 本机已缓存音频 ({cachedTracks.length} 条 · 共 {formatBytes(totalCacheBytes)})</span>
                  </h4>
                  {cachedTracks.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        await offlineAudioStorage.clearAllAudio();
                        await refreshCachedMeta();
                        onClearActiveTrack?.('thai_audio');
                        onClearActiveTrack?.('chinese_audio');
                        showSuccess('已清空全部本地离线音频缓存');
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      清空全部缓存
                    </button>
                  )}
                </div>

                {isLoadingMeta ? (
                  <div className="text-xs text-slate-400 py-6 text-center">正在读取本地离线音频库...</div>
                ) : cachedTracks.length === 0 ? (
                  <div className="text-xs text-slate-400 py-6 text-center bg-slate-950/40 rounded-xl border border-slate-800/80">
                    暂无本地离线音频。您可在上方拖入 MP3、缓存寺院公开 MP3，或切换至「音频录制与导出」直接采集纯净音频。
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cachedTracks.map((meta) => {
                      const isActive =
                        (meta.trackType === 'thai_audio' &&
                          activeOfflineTracks.thai?.lessonId === meta.lessonId &&
                          activeOfflineTracks.thai?.fileName === meta.fileName) ||
                        (meta.trackType === 'chinese_audio' &&
                          activeOfflineTracks.chinese?.lessonId === meta.lessonId &&
                          activeOfflineTracks.chinese?.fileName === meta.fileName);

                      return (
                        <div
                          key={meta.id}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isActive
                              ? 'bg-amber-500/10 border-amber-500/50'
                              : 'bg-slate-950/60 border-slate-800'
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-bold text-white truncate">{meta.fileName}</span>
                              {isActive && (
                                <span className="text-[11px] font-bold text-emerald-400">正在播放器中使用</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {meta.lessonTitle} · {getTrackLabel(meta.trackType)} · {formatBytes(meta.sizeBytes)} · 时长{' '}
                              {formatDuration(meta.durationSec)} · {getSourceLabel(meta.sourceKind)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleActivateCachedTrack(meta)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>加载播放</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExportCachedTrack(meta)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                              title="导出音频文件分享给内地学友"
                            >
                              <Download className="w-3.5 h-3.5 text-cyan-400" />
                              <span>导出</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCachedTrack(meta)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 transition cursor-pointer shrink-0"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          ) : (
            /* Tab 2: Pure Audio Recording & Export */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white">选择纯音频录制方式</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isRecording}
                    onClick={() => setRecordingSource('tab_audio')}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      recordingSource === 'tab_audio'
                        ? 'bg-amber-500/10 border-amber-500/60'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                      <MonitorSpeaker className="w-4 h-4" />
                      <span>采集网页 / 系统纯音频</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      在播放器或官网开示播放时内录清晰音频。弹窗时请务必勾选「同时共享标签页音频」，本工具会立即丢弃画面轨，只保留纯净音频。
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={isRecording}
                    onClick={() => setRecordingSource('microphone')}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      recordingSource === 'microphone'
                        ? 'bg-cyan-500/10 border-cyan-500/60'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                      <Mic className="w-4 h-4" />
                      <span>麦克风跟读录音</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      录制自己的泰语跟读发音、外放法谈声音或共学笔记语音，录完即可本地回听对照字幕或导出文件。
                    </p>
                  </button>
                </div>
              </div>

              {/* Live Meter & Control */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center gap-4 text-center">
                <div className="text-3xl font-mono font-bold text-amber-300 tracking-wider">
                  {formatDuration(recordingSec)}
                </div>

                {/* Real-time RMS meter bar */}
                <div className="w-full max-w-md h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 transition-all duration-75"
                    style={{ width: `${Math.round(audioLevel * 100)}%` }}
                  />
                </div>

                <div className="text-xs text-slate-400">
                  {isRecording
                    ? `正在纯音频录制（绑定目标：${selectedLesson.chineseTitle} · ${getTrackLabel(targetTrackType)}）`
                    : '准备就绪 · 点击下方按钮开始录制纯音频'}
                </div>

                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20 whitespace-nowrap shrink-0"
                  >
                    <Mic className="w-4 h-4" />
                    <span>
                      {recordingSource === 'tab_audio' ? '开始采集标签页音频' : '开始麦克风录音'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm transition cursor-pointer flex items-center gap-2 shadow-lg shadow-rose-500/20 whitespace-nowrap shrink-0"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>停止并生成纯音频</span>
                  </button>
                )}
              </div>

              {/* Recorded Audio Preview & Save/Export */}
              {recordedPreview && (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-emerald-300">
                      录制完成 · {recordedPreview.result.suggestedFileName}
                    </span>
                    <span className="font-mono text-slate-400">
                      {formatDuration(recordedPreview.result.durationSec)} ·{' '}
                      {formatBytes(recordedPreview.result.blob.size)}
                    </span>
                  </div>

                  <audio src={recordedPreview.previewUrl} controls className="w-full h-10" />

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveRecordingToLibrary}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>存入本课离线库并加载</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        triggerBlobDownload(
                          recordedPreview.result.blob,
                          recordedPreview.result.suggestedFileName
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>导出音频文件分享给内地学友</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
