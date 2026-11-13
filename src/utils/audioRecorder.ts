export type RecordingSourceMode = 'tab_audio' | 'microphone';

export interface RecordedAudioResult {
  blob: Blob;
  mimeType: string;
  durationSec: number;
  suggestedFileName: string;
}

export interface RecorderCallbacks {
  onLevel?: (rms: number) => void;
  onTick?: (elapsedSec: number) => void;
  onEndedUnexpectedly?: () => void;
  onAutoStop?: (res: RecordedAudioResult) => void;
}

function negotiateAudioMimeType(): { mimeType: string; extension: string } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'audio/webm', extension: 'webm' };
  }
  const candidates = [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
    { mimeType: 'audio/mp4', extension: 'm4a' },
    { mimeType: 'audio/webm', extension: 'webm' },
    { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
    { mimeType: 'audio/ogg', extension: 'ogg' },
  ];
  for (const item of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(item.mimeType)) {
        return item;
      }
    } catch {
      // continue checking
    }
  }
  return { mimeType: '', extension: 'webm' };
}

export class AudioRecorderSession {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private rafId: number | null = null;
  private tickTimerId: number | null = null;
  private chunks: BlobPart[] = [];
  private startTimeMs = 0;
  private negotiated = negotiateAudioMimeType();
  private isStopping = false;
  private callbacks: RecorderCallbacks = {};
  private stopResolver: ((res: RecordedAudioResult) => void) | null = null;
  private stopRejecter: ((err: Error) => void) | null = null;
  private labelPrefix = 'taixue_audio';

  public isRecording(): boolean {
    return Boolean(this.mediaRecorder && this.mediaRecorder.state === 'recording');
  }

  public async startTabOrSystemAudio(labelPrefix = 'taixue_tab', callbacks: RecorderCallbacks = {}): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('当前浏览器不支持网页/系统标签页音频采集，请使用最新版桌面 Chrome / Edge');
    }
    this.cleanup();
    this.labelPrefix = labelPrefix;
    this.callbacks = callbacks;

    const rawStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      } as any,
    });

    // 严守纯音频策略：立即停止并销毁所有视频轨，绝不采集或保留任何视频画面
    const videoTracks = rawStream.getVideoTracks();
    for (const vTrack of videoTracks) {
      try {
        vTrack.stop();
        rawStream.removeTrack(vTrack);
      } catch {
        // ignore
      }
    }

    const audioTracks = rawStream.getAudioTracks();
    if (audioTracks.length === 0) {
      rawStream.getTracks().forEach(t => t.stop());
      throw new Error('未检测到音频轨，请在浏览器弹窗中勾选「同时共享标签页音频 / Share tab audio」后重试');
    }

    const pureAudioStream = new MediaStream(audioTracks);
    this.beginRecorder(pureAudioStream);
  }

  public async startMicrophone(labelPrefix = 'taixue_mic', callbacks: RecorderCallbacks = {}): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前浏览器不支持麦克风录音，请在安全连接 (HTTPS) 下使用');
    }
    this.cleanup();
    this.labelPrefix = labelPrefix;
    this.callbacks = callbacks;

    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    this.beginRecorder(micStream);
  }

  private beginRecorder(stream: MediaStream): void {
    this.audioStream = stream;
    this.chunks = [];
    this.isStopping = false;
    this.negotiated = negotiateAudioMimeType();

    const options: MediaRecorderOptions = this.negotiated.mimeType
      ? { mimeType: this.negotiated.mimeType, audioBitsPerSecond: 128000 }
      : { audioBitsPerSecond: 128000 };

    const recorder = new MediaRecorder(stream, options);
    this.mediaRecorder = recorder;
    this.startTimeMs = Date.now();

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      const err = new Error('录音过程中发生错误，已安全终止');
      this.cleanup();
      if (this.stopRejecter) {
        const rej = this.stopRejecter;
        this.stopResolver = null;
        this.stopRejecter = null;
        rej(err);
      }
    };

    recorder.onstop = () => {
      const durationSec = Math.max(0.1, (Date.now() - this.startTimeMs) / 1000);
      const finalMime = recorder.mimeType || this.negotiated.mimeType || 'audio/webm';
      const ext = finalMime.includes('mp4') || finalMime.includes('aac')
        ? 'm4a'
        : finalMime.includes('ogg')
        ? 'ogg'
        : 'webm';
      const blob = new Blob(this.chunks, { type: finalMime });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const suggestedFileName = `${this.labelPrefix}_${stamp}.${ext}`;

      const result: RecordedAudioResult = {
        blob,
        mimeType: finalMime,
        durationSec,
        suggestedFileName,
      };

      const wasManualStop = this.isStopping;
      const resFn = this.stopResolver;
      this.stopResolver = null;
      this.stopRejecter = null;
      this.cleanup();

      if (resFn) {
        resFn(result);
      } else if (!wasManualStop) {
        this.callbacks.onEndedUnexpectedly?.();
      }
    };

    // 如果用户从浏览器顶部栏点击“停止共享”，自动安全收尾并保留已录音频
    for (const track of stream.getAudioTracks()) {
      track.onended = () => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording' && !this.isStopping) {
          this.stop()
            .then((res) => {
              this.callbacks.onAutoStop?.(res);
            })
            .catch(() => {
              this.callbacks.onEndedUnexpectedly?.();
            });
        }
      };
    }

    this.setupAudioLevelMeter(stream);

    recorder.start(500);
    this.tickTimerId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTimeMs) / 1000);
      this.callbacks.onTick?.(elapsed);
    }, 250);
  }

  private setupAudioLevelMeter(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      this.audioContext = ctx;
      this.analyser = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const sample = () => {
        if (!this.analyser) return;
        this.analyser.getByteTimeDomainData(data);
        let sumSq = 0;
        for (let i = 0; i < data.length; i++) {
          const norm = (data[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.min(1, Math.sqrt(sumSq / data.length) * 3.2);
        this.callbacks.onLevel?.(rms);
        this.rafId = window.requestAnimationFrame(sample);
      };
      this.rafId = window.requestAnimationFrame(sample);
    } catch {
      // meter is optional
    }
  }

  public stop(): Promise<RecordedAudioResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        reject(new Error('当前没有正在进行的录音'));
        return;
      }
      this.isStopping = true;
      this.stopResolver = resolve;
      this.stopRejecter = reject;
      try {
        this.mediaRecorder.stop();
      } catch (err: any) {
        this.cleanup();
        reject(new Error(err?.message || '停止录音失败'));
      }
    });
  }

  public cleanup(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.tickTimerId !== null) {
      window.clearInterval(this.tickTimerId);
      this.tickTimerId = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(t => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      this.audioStream = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
    this.callbacks.onLevel?.(0);
  }
}
