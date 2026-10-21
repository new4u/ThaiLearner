import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Maximize2, Minimize2, ExternalLink, 
  Volume2, Download, Sparkles, Video, Play, RefreshCw, Share2 
} from 'lucide-react';
import { thaiAudio } from '../utils/thaiAudioSynthesizer';

interface ZenLectureSlidesViewProps {
  onGoToDualSyncPlayer?: () => void;
  onGoToCourseStudy?: () => void;
}

interface SlideData {
  id: number;
  tag: string;
  title?: string;
  sub?: string;
  thai?: string[];
  zh?: string;
  audioText?: string;
  svg: React.ReactNode;
  speakerTip?: string; // 讲课者临场发挥提示 (私密备课提示，可一键展开/隐藏)
}

export const ZenLectureSlidesView: React.FC<ZenLectureSlidesViewProps> = ({
  onGoToDualSyncPlayer,
  onGoToCourseStudy
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeakerTip, setShowSpeakerTip] = useState(false);

  const slides: SlideData[] = [
    {
      id: 1,
      tag: '轻松泰语互助共学',
      thai: ['ฟังธรรมหลวงปู่'],
      zh: '听隆波法谈，顺便学会听泰语',
      audioText: 'ฟังธรรมหลวงปู่',
      speakerTip: '开场先破冰：欢迎大家来到共学！今天不讲高深语法，只要放松坐着，就像喝一杯茶，听听泰国森林派大德的声音。',
      svg: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="26" fill="none" stroke="#b58940" strokeWidth="3" />
          <circle cx="50" cy="50" r="6" fill="#b58940" />
          <path d="M50 20 Q68 45 50 70 Q32 45 50 20" fill="none" stroke="#d9c8a9" strokeWidth="2" />
          <path d="M25 35 Q45 40 50 55 Q45 75 25 70" fill="none" stroke="#e6d3ac" strokeWidth="2" />
          <path d="M75 35 Q55 40 50 55 Q55 75 75 70" fill="none" stroke="#e6d3ac" strokeWidth="2" />
        </svg>
      )
    },
    {
      id: 2,
      tag: '心法',
      title: '小时候，你是怎么学会说话的？',
      sub: '先听 → 猜意思 → 跟着说 → 说错也没关系',
      speakerTip: '启发学员：没有一个一岁小宝宝是一开始背语法单词的。全靠耳根泡进去。',
      svg: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="38" cy="50" r="18" fill="none" stroke="#b58940" strokeWidth="3" />
          <circle cx="68" cy="50" r="18" fill="none" stroke="#d9c8a9" strokeWidth="3" />
          <path d="M24 44 h28 M24 56 h20" stroke="#b58940" strokeWidth="3" />
          <circle cx="66" cy="44" r="2" fill="#d9c8a9" />
          <circle cx="72" cy="44" r="2" fill="#d9c8a9" />
          <path d="M64 54 q5 4 10 0" stroke="#d9c8a9" strokeWidth="2" />
        </svg>
      )
    },
    {
      id: 3,
      tag: '引一引',
      title: '学语言，靠耳朵',
      sub: '用耳朵听原声\n抓短语，不抠单字\n允许模糊，多听自然懂',
      speakerTip: '三原则：耳根优先、整句抓韵律、放下完美主义。模糊才是顿悟的温床。',
      svg: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M25 55 a15 15 0 0 1 30 0" fill="none" stroke="#b58940" strokeWidth="3" />
          <path d="M20 55 a20 20 0 0 1 40 0" fill="none" stroke="#d9c8a9" strokeWidth="2" />
          <circle cx="40" cy="55" r="3" fill="#b58940" />
          <path d="M58 30 h15 a6 6 0 0 1 0 12 h-15" fill="none" stroke="#d9c8a9" strokeWidth="3" />
          <circle cx="80" cy="75" r="8" fill="none" stroke="#e6d3ac" strokeWidth="3" />
        </svg>
      )
    },
    {
      id: 4,
      tag: '试试看',
      title: '今天先试一件事：\n把背单词放一放',
      sub: '先泡着听，让大脑自己拼',
      speakerTip: '给学员卸下心理包袱：千万不要一边听一边紧张地翻字典记笔记，先把注意力收回耳根。',
      svg: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <rect x="22" y="45" width="20" height="28" rx="4" fill="none" stroke="#b58940" strokeWidth="3" />
          <line x1="35" y1="18" x2="35" y2="45" stroke="#b58940" strokeWidth="3" />
          <path d="M60 30 a18 18 0 0 1 0 40" fill="none" stroke="#d9c8a9" strokeWidth="3" />
          <line x1="55" y1="50" x2="72" y2="50" stroke="#e6d3ac" strokeWidth="3" />
          <line x1="55" y1="50" x2="50" y2="30" stroke="#e6d3ac" strokeWidth="2" />
        </svg>
      )
    },
    {
      id: 5,
      tag: '节奏',
      title: '今晚，我们慢慢来',
      sub: '听一段 → 聊一下 → 拆一句 → 愿意就跟读',
      speakerTip: '四步节奏走：学员心里有数就不会慌，每一步都舒舒服服的。',
      svg: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="20" cy="25" r="10" fill="#e6d3ac" />
          <circle cx="50" cy="25" r="10" fill="none" stroke="#b58940" strokeWidth="2" />
          <circle cx="80" cy="25" r="10" fill="none" stroke="#b58940" strokeWidth="2" />
          <path d="M30 25 h10 M60 25 h10" stroke="#d9c8a9" strokeWidth="2" />
          <path d="M20 25 v20 M50 25 v20 M80 25 v20" stroke="#d9c8a9" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="20" cy="55" r="6" fill="#b58940" />
          <circle cx="50" cy="55" r="6" fill="#b58940" />
          <circle cx="80" cy="55" r="6" fill="#b58940" />
        </svg>
      )
    },
    {
      id: 6,
      tag: '第一段：听感',
      title: '先听泰文\n停一下\n再听中文\n再听一遍泰文',
      speakerTip: '这就是我们【泰中双视频同步放映机】的核心法则！泰文先入耳 ➔ 停顿消化 ➔ 中文印证 ➔ 泰文回扣。',
      svg: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <rect x="10" y="40" width="25" height="20" rx="4" fill="#b58940" />
          <rect x="42" y="45" width="13" height="10" rx="2" fill="#d9c8a9" />
          <rect x="60" y="40" width="25" height="20" rx="4" fill="none" stroke="#b58940" strokeWidth="3" />
          <rect x="20" y="70" width="20" height="10" rx="2" fill="none" stroke="#d9c8a9" strokeWidth="2" />
          <path d="M35 50 h7 M55 50 h5" stroke="#7a6f5f" strokeWidth="2" />
        </svg>
      )
    },
    {
      id: 7,
      tag: '今天这一句',
      thai: ['มีสติ รู้กาย รู้ใจ', 'ด้วยจิตที่ตั้งมั่นและเป็นกลาง'],
      zh: '有觉性，知身知心\n以安住且中立的心',
      audioText: 'มีสติ รู้กาย รู้ใจ ด้วยจิตที่ตั้งมั่นและเป็นกลาง',
      speakerTip: '隆波全盘修行的最核心纲领！有觉性（有Sati），知身知心，以安住且中立的心。读这一句功德无量。',
      svg: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="30" fill="none" stroke="#b58940" strokeWidth="3" />
          <line x1="50" y1="20" x2="50" y2="80" stroke="#d9c8a9" strokeWidth="2" />
          <line x1="20" y1="50" x2="80" y2="50" stroke="#d9c8a9" strokeWidth="2" />
          <circle cx="50" cy="50" r="8" fill="#e6d3ac" />
          <circle cx="50" cy="50" r="3" fill="#b58940" />
        </svg>
      )
    },
    {
      id: 8,
      tag: '拆一拆',
      title: '抓三个高频词',
      sub: '有觉性 · 知道 · 心神',
      speakerTip: '拆解高频词：มีสติ (mii sà-tì) 有觉性；รู้ (rúu) 知道；จิต (cìt) 心。只要听懂这三个，隆波开示就能听懂大半。',
      svg: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <rect x="15" y="30" width="22" height="40" rx="6" fill="#e6d3ac" />
          <rect x="42" y="20" width="22" height="50" rx="6" fill="#d9c8a9" />
          <rect x="69" y="35" width="22" height="35" rx="6" fill="none" stroke="#b58940" strokeWidth="3" />
          <circle cx="26" cy="50" r="4" fill="#b58940" />
          <circle cx="53" cy="45" r="4" fill="#5b3f1e" />
          <circle cx="80" cy="52" r="4" fill="#b58940" />
        </svg>
      )
    },
    {
      id: 9,
      tag: '愿意就开口',
      title: '轻轻松松，跟读一遍',
      sub: '不用力，像小孩模仿声音\n读不准没关系，嘴型动动就有感觉',
      speakerTip: '鼓励大家开麦或静音跟读，就像小鸭子学游泳，不用苛求音准，嘴部肌肉唤醒就足够了。',
      svg: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M30 40 Q40 30 50 40 Q60 50 70 40" fill="none" stroke="#b58940" strokeWidth="3" />
          <path d="M35 55 Q50 70 65 55" fill="none" stroke="#b58940" strokeWidth="3" />
          <circle cx="50" cy="50" r="28" fill="none" stroke="#d9c8a9" strokeWidth="2" />
          <path d="M72 35 C78 40 78 60 72 65" fill="none" stroke="#e6d3ac" strokeWidth="2.5" />
          <path d="M80 28 C90 38 90 62 80 72" fill="none" stroke="#e6d3ac" strokeWidth="2.5" />
        </svg>
      )
    },
    {
      id: 10,
      tag: '今天到这里',
      title: '今天先体验到这儿',
      sub: '不着急，明天继续泡 5 分钟\n耳根慢慢醒过来，随喜大家的善法！',
      speakerTip: '圆满结束：感谢大家的陪伴与精进，随喜所有学员功德，回向一切众生。',
      svg: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="32" fill="none" stroke="#b58940" strokeWidth="3" strokeDasharray="4 4" />
          <circle cx="50" cy="50" r="14" fill="#e6d3ac" />
          <circle cx="50" cy="50" r="4" fill="#b58940" />
          <path d="M30 80 Q50 65 70 80" fill="none" stroke="#d9c8a9" strokeWidth="3" />
        </svg>
      )
    }
  ];

  const cur = slides[currentIdx];

  const handleNext = useCallback(() => {
    setCurrentIdx(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setCurrentIdx(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNext, handlePrev]);

  // Toggle browser fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handlePlayAudio = (text: string) => {
    thaiAudio.speakWord(text);
  };

  return (
    <div className={`relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 shadow-2xl border border-[#d9c8a9]/60 ${
      isFullscreen 
        ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' 
        : 'w-full min-h-[580px] lg:min-h-[640px]'
    }`} style={{ backgroundColor: '#faf7f2', color: '#2d2a26' }}>
      
      {/* Top Functional Bar */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-3.5 border-b border-[#e6d3ac]/60 bg-[#f7f2ea]/80 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-sm sm:text-base text-[#5b3f1e] flex items-center gap-1.5">
            <span>🎴</span>
            <span>轻松泰语互助共学 · Zoom 讲义</span>
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#e6d3ac] text-[#5b3f1e]">
            左侧大字 + 右侧 SVG 禅意讲义
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick link to Dual Video Sync Player */}
          {onGoToDualSyncPlayer && (
            <button
              onClick={onGoToDualSyncPlayer}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              title="前往泰中双视频同步对齐放映机"
            >
              <Video className="w-3.5 h-3.5" />
              <span>泰中双视频同步</span>
            </button>
          )}

          {/* Speaker notes toggle */}
          <button
            onClick={() => setShowSpeakerTip(!showSpeakerTip)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
              showSpeakerTip 
                ? 'bg-[#5b3f1e] text-white border-[#5b3f1e]' 
                : 'bg-white/80 text-[#7a6f5f] border-[#d9c8a9] hover:bg-white'
            }`}
            title="显示/隐藏临场发挥提示"
          >
            {showSpeakerTip ? '收起备课提示' : '备课提示'}
          </button>

          {/* Open in new tab (standalone slides.html) */}
          <a
            href="/slides.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-[#5b3f1e] border border-[#d9c8a9] text-xs font-semibold shadow-sm transition"
            title="在新标签页打开独立 slides.html，Zoom 会议直接共享该网页即可"
          >
            <span>Zoom 共享网页</span>
            <ExternalLink className="w-3 h-3 text-[#b58940]" />
          </a>

          {/* Toggle Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-white/90 hover:bg-white text-[#5b3f1e] border border-[#d9c8a9] transition cursor-pointer"
            title="切换全屏放映"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Slide Body (Left Big Typography + Right SVG) */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-between p-6 sm:p-10 lg:p-14 gap-8 select-none overflow-hidden">
        
        {/* Left Column (Big Typography) */}
        <div className="flex-1 w-full md:max-w-[60%] flex flex-col justify-center space-y-4 sm:space-y-6">
          <div>
            <span className="inline-block bg-[#e6d3ac] text-[#5b3f1e] px-4 py-1.5 rounded-full text-base sm:text-lg font-bold tracking-wide shadow-sm">
              {cur.tag}
            </span>
          </div>

          {/* Thai big characters */}
          {cur.thai && (
            <div className="space-y-1">
              {cur.thai.map((th, i) => (
                <div 
                  key={i} 
                  className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#b58940] leading-tight tracking-wide flex items-center gap-3"
                  style={{ fontFamily: "'Noto Sans Thai', Sarabun, sans-serif" }}
                >
                  <span>{th}</span>
                  {i === 0 && cur.audioText && (
                    <button
                      onClick={() => handlePlayAudio(cur.audioText!)}
                      className="w-10 h-10 rounded-full bg-[#e6d3ac]/80 hover:bg-[#b58940] text-[#5b3f1e] hover:text-white flex items-center justify-center transition shadow-sm cursor-pointer shrink-0"
                      title="点击试听真人原声发音"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Main Title */}
          {cur.title && (
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#2d2a26] leading-snug whitespace-pre-line tracking-tight">
              {cur.title}
            </div>
          )}

          {/* Sub / Chinese */}
          {cur.sub && (
            <div className="text-xl sm:text-2xl lg:text-3xl text-[#7a6f5f] leading-relaxed whitespace-pre-line font-medium">
              {cur.sub}
            </div>
          )}

          {cur.zh && (
            <div className="text-xl sm:text-2xl lg:text-3xl text-[#7a6f5f] leading-relaxed whitespace-pre-line font-medium">
              {cur.zh}
            </div>
          )}

          {/* Slide 8 Word cards specifically */}
          {cur.id === 8 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {[
                { thai: 'มีสติ', ipa: 'mii sà-tì', zh: '有觉性' },
                { thai: 'รู้', ipa: 'rúu', zh: '知道 / 了知' },
                { thai: 'จิต', ipa: 'cìt', zh: '心 / 意' }
              ].map(item => (
                <div 
                  key={item.thai}
                  onClick={() => handlePlayAudio(item.thai)}
                  className="p-3.5 rounded-2xl bg-white/90 border border-[#d9c8a9] shadow-sm hover:border-[#b58940] hover:scale-105 transition cursor-pointer flex flex-col"
                >
                  <div className="text-xl font-black text-[#b58940] flex items-center justify-between">
                    <span>{item.thai}</span>
                    <Volume2 className="w-4 h-4 text-[#a08a5c]" />
                  </div>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">/{item.ipa}/</div>
                  <div className="text-sm font-semibold text-[#5b3f1e] mt-1">{item.zh}</div>
                </div>
              ))}
            </div>
          )}

          {/* Slide 6 Quick Jump to Dual Video Player */}
          {cur.id === 6 && onGoToDualSyncPlayer && (
            <div className="pt-2">
              <button
                onClick={onGoToDualSyncPlayer}
                className="px-5 py-2.5 rounded-2xl bg-[#b58940] hover:bg-[#9c7330] text-white font-bold text-sm shadow-md flex items-center gap-2 transition cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>立即打开泰中双视频同步放映机（实操练习）</span>
              </button>
            </div>
          )}

          {/* Speaker private cue banner */}
          {showSpeakerTip && cur.speakerTip && (
            <div className="mt-4 p-3.5 rounded-2xl bg-[#e6d3ac]/50 border border-[#b58940]/40 text-xs text-[#5b3f1e] leading-relaxed animate-in fade-in slide-in-from-top-1">
              <strong className="font-bold flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#b58940]" />
                带读者临场发挥提示：
              </strong>
              {cur.speakerTip}
            </div>
          )}
        </div>

        {/* Right Column (SVG Visual Anchor) */}
        <div className="flex-1 w-full md:w-auto flex items-center justify-center p-4">
          <div className="w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 flex items-center justify-center p-4 rounded-3xl bg-white/40 border border-[#e6d3ac]/80 shadow-inner">
            {cur.svg}
          </div>
        </div>

      </div>

      {/* Bottom Floating Control Bar */}
      <div className="px-6 py-4 border-t border-[#e6d3ac]/60 bg-[#f7f2ea]/90 backdrop-blur-md flex items-center justify-between">
        
        {/* Navigation buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white hover:bg-[#e6d3ac]/50 text-[#5b3f1e] border border-[#d9c8a9] text-xs font-bold transition shadow-sm cursor-pointer"
            title="按 ← 键翻到上一页"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>上一页</span>
          </button>

          <span className="font-mono text-xs sm:text-sm font-bold text-[#5b3f1e] px-3 py-1 rounded-lg bg-[#e6d3ac]/50">
            {currentIdx + 1} / {slides.length}
          </span>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-[#b58940] hover:bg-[#9c7330] text-white text-xs font-bold transition shadow-md shadow-amber-900/10 cursor-pointer"
            title="按 → 键或空格翻到下一页"
          >
            <span>下一页</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Pagination Dots */}
        <div className="hidden sm:flex items-center gap-1.5">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentIdx(idx)}
              className={`transition-all rounded-full cursor-pointer ${
                idx === currentIdx
                  ? 'w-6 h-2 bg-[#b58940]'
                  : 'w-2 h-2 bg-[#d9c8a9] hover:bg-[#b58940]/60'
              }`}
              title={`跳转到第 ${idx + 1} 页：${s.tag}`}
            />
          ))}
        </div>

        {/* Key Shortcut Tip */}
        <div className="text-[11px] text-[#a08a5c] hidden md:flex items-center gap-2">
          <span>按 ← → 箭头或空格翻页</span>
          <span>|</span>
          <a
            href="/slides.html"
            download="轻松泰语互助共学_隆波法谈听解法讲义.html"
            className="flex items-center gap-1 text-[#b58940] hover:underline"
            title="下载 slides.html 保存到本地"
          >
            <Download className="w-3 h-3" />
            <span>下载 HTML 课件</span>
          </a>
        </div>

      </div>

    </div>
  );
};
