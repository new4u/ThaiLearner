// ==UserScript==
// @name         泰学 · 隆波法谈 CC 字幕抓取器 (当前视频 + 选期单抓 + 共学互助直连版)
// @namespace    https://taixue.dhamma/userscripts
// @version      1.1.0
// @description  在 youtube.com 页面内零 Cookie 同源抓取隆波帕默尊者官方 CC 字幕：1) 一键抓当前视频（可选字幕轨）；2) 选期/多选精确抓取全库 1045 场；3) 输出标准 .srt 与完整关联 .linked.json，与共学互助中心/Colab/装载法谈完美对接。
// @match        https://www.youtube.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
(function () {
  'use strict';

  // ==================== 模式 1：同源 Embed 播放器实时 PoToken 拦截器 ====================
  if (window.self !== window.top) {
    if (!location.search.includes('taixue_cc=1')) return;
    const sp = new URLSearchParams(location.search);
    const targetVid = sp.get('taixue_vid') || '';
    const targetLang = sp.get('taixue_lang') || 'th';
    let sent = false;

    function reportPayload(url, payload) {
      if (sent || !payload || payload.trim().length < 20) return;
      const trimmed = payload.trim();
      if (trimmed.startsWith('{') || trimmed.includes('<text') || trimmed.includes('<p ')) {
        sent = true;
        window.parent.postMessage({
          type: 'TAIXUE_CC_CAPTURED',
          videoId: targetVid,
          url: String(url || ''),
          payload: payload,
        }, 'https://www.youtube.com');
      }
    }

    function reportUrl(url) {
      if (!url || !String(url).includes('/api/timedtext')) return;
      window.parent.postMessage({
        type: 'TAIXUE_TIMEDTEXT_URL',
        videoId: targetVid,
        url: String(url),
      }, 'https://www.youtube.com');
    }

    const origFetch = window.fetch;
    if (origFetch) {
      window.fetch = async function () {
        const res = await origFetch.apply(this, arguments);
        try {
          const reqUrl = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url) || '';
          if (reqUrl.includes('/api/timedtext')) {
            reportUrl(reqUrl);
            const txt = await res.clone().text();
            reportPayload(reqUrl, txt);
          }
        } catch {}
        return res;
      };
    }

    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__taixueUrl = typeof url === 'string' ? url : String(url || '');
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      if (this.__taixueUrl && this.__taixueUrl.includes('/api/timedtext')) {
        reportUrl(this.__taixueUrl);
        this.addEventListener('load', async () => {
          try {
            let txt = '';
            if (!this.responseType || this.responseType === 'text') {
              txt = this.responseText || '';
            } else if (this.responseType === 'json' && this.response) {
              txt = JSON.stringify(this.response);
            } else if (this.responseType === 'arraybuffer' && this.response) {
              txt = new TextDecoder('utf-8').decode(this.response);
            } else if (this.responseType === 'blob' && this.response && this.response.text) {
              txt = await this.response.text();
            }
            reportPayload(this.__taixueUrl, txt);
          } catch {}
        });
      }
      return origSend.apply(this, arguments);
    };

    const diag = { hasPlayer: false, subBtnClicked: false, playClicked: false, timedtextUrls: [] };
    const bootPoll = setInterval(() => {
      try {
        const entries = performance.getEntriesByType('resource') || [];
        for (const e of entries) {
          if (e.name && e.name.includes('/api/timedtext')) {
            if (!diag.timedtextUrls.includes(e.name)) diag.timedtextUrls.push(e.name);
            reportUrl(e.name);
          }
        }
        const vid = document.querySelector('video');
        if (vid) vid.muted = true;
        const player = document.getElementById('movie_player');
        if (player) {
          diag.hasPlayer = true;
          if (typeof player.mute === 'function') player.mute();
          if (typeof player.loadModule === 'function') {
            player.loadModule('captions');
            player.loadModule('cc');
          }
          if (typeof player.setOption === 'function') {
            player.setOption('captions', 'track', { languageCode: targetLang });
            player.setOption('cc', 'track', { languageCode: targetLang });
            player.setOption('captions', 'reload', true);
          }
          if (typeof player.playVideo === 'function') player.playVideo();
        }
        const subBtn = document.querySelector('.ytp-subtitles-button');
        if (subBtn && subBtn.getAttribute('aria-pressed') !== 'true') {
          subBtn.click();
          diag.subBtnClicked = true;
        }
        const bigPlay = document.querySelector('.ytp-large-play-button');
        if (bigPlay && vid && vid.paused) {
          bigPlay.click();
          diag.playClicked = true;
        }
        window.parent.postMessage({ type: 'TAIXUE_EMBED_DIAG', videoId: targetVid, diag }, 'https://www.youtube.com');
      } catch {}
      if (sent) clearInterval(bootPoll);
    }, 350);
    setTimeout(() => clearInterval(bootPoll), 18000);
    return;
  }

  // ==================== 模式 2：顶层页面抓取控制台 (v1.1.0) ====================
  if (window.__TAIXUE_CC_USERSCRIPT_LOADED__) return;
  window.__TAIXUE_CC_USERSCRIPT_LOADED__ = true;

  const SCRIPT_VERSION = '1.1.0';
  const CATALOG_ITEMS = [
    {"id":"039BPpzqYdc","d":"2026-11-22","t":"รีรัน l 22 พ.ย. 2569 ไลฟ์สดหลวงปู่ปราโมทย์ ปาโมชฺโช","sp":"lp","cnYt":"https://www.youtube.com/watch?v=KLurLPg8m1w","thMp3":"","cnMp3":""},
    {"id":"4j72ImUi_eY","d":"2026-11-21","t":"ต่อไปนี้อ่านจิตตนเอง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 21 พ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=VDO2XNA8YsM","thMp3":"","cnMp3":""},
    {"id":"JOyx5e2oJP8","d":"2026-11-15","t":"พื้นฐานของการปฏิบัติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 15 พ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=v3KsIwXjeq4","thMp3":"","cnMp3":"https://media.dhamma.cn/5/5b/D26.92%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B411%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"RrSkZnoUX1k","d":"2026-11-14","t":"สภาวะหลงและสภาวะเพ่งสำคัญมาก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 14 พ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=aC3JxurVek0","thMp3":"","cnMp3":"https://media.dhamma.cn/8/8c/D26.91%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B411%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"S7sRJTI27ZQ","d":"2026-11-14","t":"ชาวพุทธต้องไม่งมงาย :: หลวงปู่ปราโมทย์ ปาโมชฺโช 14 พ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=aC3JxurVek0","thMp3":"","cnMp3":"https://media.dhamma.cn/8/8c/D26.91%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B411%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"2FkVMAUcaoE","d":"2026-11-08","t":"สมาธิที่เห็นไตรลักษณ์ได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 8 พ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=UTWpguoj7Zo","thMp3":"","cnMp3":"https://media.dhamma.cn/7/77/D26.90%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B411%E6%9C%888%E6%97%A5.mp3"},
    {"id":"ue_RkSAgal4","d":"2026-11-07","t":"จิตเข้าสู่ความเป็นกลาง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 7 พ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=mOb-rO7f3wE","thMp3":"","cnMp3":"https://media.dhamma.cn/4/46/D26.89%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B411%E6%9C%887%E6%97%A5.mp3"},
    {"id":"rsHw7pQE0Qc","d":"2026-11-01","t":"ฟังธรรมให้เกิดสมาธิและปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 พ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=wKItc8GjIVs","thMp3":"https://media.dhamma.com/pramote/cd/2569/691101.mp3","cnMp3":"https://media.dhamma.cn/d/da/D26.88%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B411%E6%9C%881%E6%97%A5.mp3"},
    {"id":"Ydoxq7Hw-8Y","d":"2026-10-31","t":"อย่าพอใจอยู่แค่ความว่าง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 ต.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Zf07tYbYG9g","thMp3":"https://media.dhamma.com/pramote/cd/2569/691031.mp3","cnMp3":"https://media.dhamma.cn/0/09/D26.87%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"WdX3XFcCWIU","d":"2026-10-29","t":"ปฏิบัติเพื่อมุ่งสร้างสัมมาทิฏฐิ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 ต.ค. 2569","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/691029.mp3","cnMp3":""},
    {"id":"-u6K6NN53lI","d":"2026-10-27","t":"งานหลักคืองานล้างกิเลส :: หลวงปู่ปราโมทย์ ปาโมชฺโช 27 ต.ค. 2569","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/691027.mp3","cnMp3":""},
    {"id":"9xEhuuR8Dng","d":"2026-10-25","t":"จากสมถะสู่วิปัสสนา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 25 ต.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=pjOxRjXmMB4","thMp3":"https://media.dhamma.com/pramote/cd/2569/691025.mp3","cnMp3":"https://media.dhamma.cn/0/08/D26.86%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"QsK_SHOdO9E","d":"2026-10-24","t":"หน้าที่ต่อทุกข์คือรู้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 24 ต.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=c1FfnJBhdnc","thMp3":"https://media.dhamma.com/pramote/cd/2569/691024.mp3","cnMp3":"https://media.dhamma.cn/d/da/D26.85%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"F4-tJNYDpss","d":"2026-10-18","t":"แก้มิจฉาทิฏฐิด้วยสติปัฏฐาน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 18 ต.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=HR-O2XYifbI","thMp3":"https://media.dhamma.com/pramote/cd/2569/691018.mp3","cnMp3":"https://media.dhamma.cn/4/41/D26.84%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"zFYNiNBFHuk","d":"2026-10-18","t":"นิยตมิจฉาทิฎฐิ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 18 ต.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=HR-O2XYifbI","thMp3":"https://media.dhamma.com/pramote/cd/2569/691018.mp3","cnMp3":"https://media.dhamma.cn/4/41/D26.84%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"wx6pzQ9QltQ","d":"2026-10-17","t":"ปฏิบัติในที่ทุกสถานในกาลทุกเมื่อ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 17 ต.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=HfYrKhJh_SU","thMp3":"https://media.dhamma.com/pramote/cd/2569/691017.mp3","cnMp3":"https://media.dhamma.cn/6/6f/D26.83%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"ebqfZ4W4lQA","d":"2026-10-16","t":"ทำงานเผยแผ่ศาสนาควบคู่กับการภาวนา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 16 ต.ค. 2569","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/691016B.mp3","cnMp3":""},
    {"id":"LfvkA-42iDg","d":"2026-10-11","t":"วิภัชชวิธี :: หลวงปู่ปราโมทย์ ปาโมชฺโช 11 ต.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=XBGRV2WO6Ng","thMp3":"https://media.dhamma.com/pramote/cd/2569/691011.mp3","cnMp3":"https://media.dhamma.cn/9/9b/D26.82%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"s7-bO5Hki0E","d":"2026-10-10","t":"น้อมเข้ามาเรียนรู้ตัวเอง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 10 ต.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=IzSQSq2blzo","thMp3":"https://media.dhamma.com/pramote/cd/2569/691010.mp3","cnMp3":"https://media.dhamma.cn/7/76/D26.81%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"gQknwH_hz6Q","d":"2026-10-10","t":"ทำกรรมฐานตามระดับของตัวเอง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 10 ต.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=IzSQSq2blzo","thMp3":"https://media.dhamma.com/pramote/cd/2569/691010.mp3","cnMp3":"https://media.dhamma.cn/7/76/D26.81%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"a7Z67cyR5mg","d":"2026-10-04","t":"วิธีปฏิบัติที่ลัดสั้น :: หลวงปู่ปราโมทย์ ปาโมชฺโช 4 ต.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=iNxL87mL3ZM","thMp3":"https://media.dhamma.com/pramote/cd/2569/691004.mp3","cnMp3":"https://media.dhamma.cn/6/66/D26.80%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%884%E6%97%A5.mp3"},
    {"id":"t5eTaqu2eHE","d":"2026-10-04","t":"ทีแรกก็เพ่งทุกคน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 4 ต.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=iNxL87mL3ZM","thMp3":"https://media.dhamma.com/pramote/cd/2569/691004.mp3","cnMp3":"https://media.dhamma.cn/6/66/D26.80%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%884%E6%97%A5.mp3"},
    {"id":"DDwwesVzVpU","d":"2026-10-03","t":"ธรรมนิยาม :: หลวงปู่ปราโมทย์ ปาโมชฺโช 3 ต.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=xMAIuTmx73c","thMp3":"https://media.dhamma.com/pramote/cd/2569/691003.mp3","cnMp3":"https://media.dhamma.cn/6/68/D26.79%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%883%E6%97%A5.mp3"},
    {"id":"fDYyDiGk_Tg","d":"2026-09-27","t":"เข้าใจความเป็นจริงของโลก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 27 ก.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=_xq6h_aU69w","thMp3":"https://media.dhamma.com/pramote/cd/2569/690927.mp3","cnMp3":"https://media.dhamma.cn/d/df/D26.78%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B49%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"CcTkuVH7qa4","d":"2026-09-26","t":"รู้อารมณ์กรรมฐานเพื่อจะรู้ทันจิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 26 ก.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=cH1VZ09aXpg","thMp3":"https://media.dhamma.com/pramote/cd/2569/690926.mp3","cnMp3":"https://media.dhamma.cn/1/12/D26.77%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B49%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"L_GgfvvMBAo","d":"2026-09-25","t":"อดทนฝึกแล้วฝึกอีก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 25 ก.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=8Ji2ah2bYAQ","thMp3":"https://media.dhamma.com/pramote/cd/2569/690925.mp3","cnMp3":""},
    {"id":"8kLIZZ93Szs","d":"2026-09-21","t":"ปฏิบัติถูกต้องจะพ้นทุกข์ด้วยตัวเอง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 21 ก.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=dOfaZ4OveiA","thMp3":"https://media.dhamma.com/pramote/cd/2569/690921.mp3","cnMp3":"https://media.dhamma.cn/9/91/D26.76%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B49%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"cLjvFI1-Ez8","d":"2026-09-20","t":"ติดกระดุมเม็ดแรกให้ถูก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 20 ก.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=-MepJTzHR5Y","thMp3":"https://media.dhamma.com/pramote/cd/2569/690920.mp3","cnMp3":"https://media.dhamma.cn/4/42/D26.75%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B49%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"rZoQ2HJKMVk","d":"2026-09-20","t":"ตัวรู้เข้าใจยากที่สุด :: หลวงปู่ปราโมทย์ ปาโมชฺโช 20 ก.ย. 2569","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/690920.mp3","cnMp3":"https://media.dhamma.cn/4/42/D26.75%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B49%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"HO3p9thJtAQ","d":"2026-09-13","t":"เรียนรู้ทุกข์จนพ้นทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 ก.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=56n_7mGHunE","thMp3":"https://media.dhamma.com/pramote/cd/2569/690913.mp3","cnMp3":"https://media.dhamma.cn/0/08/D26.67%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B49%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"qkVYvc1g1u0","d":"2026-09-13","t":"ชาวพุทธที่แท้จริงไม่หวั่นไหว :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 ก.ย. 2569","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/690913.mp3","cnMp3":"https://media.dhamma.cn/0/08/D26.67%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B49%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"8msL_PlpyC0","d":"2026-09-12","t":"สิ่งที่เหนือดวงคือกรรม :: หลวงปู่ปราโมทย์ ปาโมชฺโช 12 ก.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=hpN8lKXsUDA","thMp3":"https://media.dhamma.com/pramote/cd/2569/690912.mp3","cnMp3":"https://media.dhamma.cn/9/9e/D26.66%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B49%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"YerofUSr7IE","d":"2026-09-05","t":"รูปธรรมนามธรรมเป็นไตรลักษณ์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 5 ก.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=QYDuN5pcptw","thMp3":"https://media.dhamma.com/pramote/cd/2569/690905.mp3","cnMp3":"https://media.dhamma.cn/5/5e/D26.65%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B49%E6%9C%885%E6%97%A5.mp3"},
    {"id":"SyyDow-kXrM","d":"2026-08-31","t":"ใจยอมรับความจริงได้ก็ไม่ทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 ส.ค. 2569","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/690831.mp3","cnMp3":""},
    {"id":"txP6hOB1f0E","d":"2026-08-30","t":"จิตบังคับไม่ได้แต่ฝึกได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=-2BHCpcUu9c","thMp3":"https://media.dhamma.com/pramote/cd/2569/690830.mp3","cnMp3":"https://media.dhamma.cn/a/a5/D26.71%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"K9bRfeBIw4o","d":"2026-08-29","t":"ฝึกใจให้เป็นพระ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=wq-oLSC6WBc","thMp3":"https://media.dhamma.com/pramote/cd/2569/690829.mp3","cnMp3":"https://media.dhamma.cn/b/be/D26.70%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"obTCysqgRhM","d":"2026-08-28","t":"บุญจากการภาวนา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 28 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=dtflisyISqM","thMp3":"https://media.dhamma.com/pramote/cd/2569/690828.mp3","cnMp3":"https://media.dhamma.cn/9/9e/D26.69%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%8828%E6%97%A5.mp3"},
    {"id":"GHyNWOoBRXo","d":"2026-08-23","t":"รู้สึกตัวเพื่อเห็นความจริงของกายของใจ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 23 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=c8OyhFa3LyU","thMp3":"https://media.dhamma.com/pramote/cd/2569/690823.mp3","cnMp3":"https://media.dhamma.cn/a/a1/D26.68%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"QmDwWvQdyww","d":"2026-08-22","t":"เข้าถึงพระนิพพานในปัจจุบัน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 22 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=o6oRc2bUs9c","thMp3":"https://media.dhamma.com/pramote/cd/2569/690822.mp3","cnMp3":"https://media.dhamma.cn/2/29/D26.67%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"2QO1ff_-sOs","d":"2026-08-16","t":"ทุกข์เพราะยึดว่าขันธ์เป็นตัวเรา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 16 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=o9GMKn5fTGo","thMp3":"https://media.dhamma.com/pramote/cd/2569/690816.mp3","cnMp3":"https://media.dhamma.cn/8/8f/D26.66%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"nCTv8tgcKos","d":"2026-08-15","t":"ใจเป็นคนรู้ได้ถึงจะทำสติปัฏฐานได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 15 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=2GTghYhza-k","thMp3":"https://media.dhamma.com/pramote/cd/2569/690815.mp3","cnMp3":"https://media.dhamma.cn/9/90/D26.65%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"CAZSNwB0_HQ","d":"2026-08-12","t":"พ่อแม่สำคัญเท่ากับพระอรหันต์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 12 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=D-rfqd8k8wU","thMp3":"https://media.dhamma.com/pramote/cd/2569/690812.mp3","cnMp3":"https://media.dhamma.cn/3/37/D26.64%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"rmdcNosvMvI","d":"2026-08-09","t":"สิ่งที่ผิดในการดูจิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 9 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=vt31iw1-3wE","thMp3":"https://media.dhamma.com/pramote/cd/2569/690809.mp3","cnMp3":"https://media.dhamma.cn/b/bc/D26.63%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%889%E6%97%A5.mp3"},
    {"id":"po2SOr_Kkcs","d":"2026-08-08","t":"พัฒนาสัมมาสมาธิด้วยสัมมาสติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 8 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=4hhiAo2Cdxc","thMp3":"https://media.dhamma.com/pramote/cd/2569/690808.mp3","cnMp3":"https://media.dhamma.cn/6/65/D26.62%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%888%E6%97%A5.mp3"},
    {"id":"2eEtrF43dsI","d":"2026-08-08","t":"จิตผู้รู้คล้ายจิตที่ดูละคร :: หลวงปู่ปราโมทย์ ปาโมชฺโช 8 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=4hhiAo2Cdxc","thMp3":"https://media.dhamma.com/pramote/cd/2569/690808.mp3","cnMp3":"https://media.dhamma.cn/6/65/D26.62%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%888%E6%97%A5.mp3"},
    {"id":"2PkVA_2mMTs","d":"2026-08-02","t":"เรียนรู้ทุกข์ผ่านขันธ์ 5 :: หลวงปู่ปราโมทย์ ปาโมชฺโช 2 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ux6sHr0FYxg","thMp3":"https://media.dhamma.com/pramote/cd/2569/690802.mp3","cnMp3":"https://media.dhamma.cn/b/b1/D26.61%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%882%E6%97%A5.mp3"},
    {"id":"_SnjhTcc3oA","d":"2026-08-01","t":"แบบฝึกหัดซ้อมดูจิตเคลื่อน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 ส.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=f5Vm71T78iM","thMp3":"https://media.dhamma.com/pramote/cd/2569/690801.mp3","cnMp3":"https://media.dhamma.cn/d/d2/D26.60%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B48%E6%9C%881%E6%97%A5.mp3"},
    {"id":"S2ytyEFVcoQ","d":"2026-07-30","t":"ธรรมะของฆราวาส :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 ก.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=FyB0Ij89qO8","thMp3":"https://media.dhamma.com/pramote/cd/2569/690730.mp3","cnMp3":""},
    {"id":"JwCoNID0INE","d":"2026-07-29","t":"เดินอยู่ในทางสายกลาง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 ก.ค. 2569 (ช่วงเช้า)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=yxSSamR_aE0","thMp3":"https://media.dhamma.com/pramote/cd/2569/690729B.mp3","cnMp3":"https://media.dhamma.cn/b/bc/D26.59%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B47%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"Ga20PMapo-o","d":"2026-07-29","t":"ปฏิบัติบูชาพระพุทธเจ้า :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 ก.ค. 2569 (ช่วงบ่าย)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=yxSSamR_aE0","thMp3":"https://media.dhamma.com/pramote/cd/2569/690729B.mp3","cnMp3":"https://media.dhamma.cn/b/bc/D26.59%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B47%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"ByZ7rhIZMYQ","d":"2026-07-29","t":"เดินตามรอยเท้าพระพุทธเจ้า :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 ก.ค. 2569 (บ่าย)","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/690729B.mp3","cnMp3":"https://media.dhamma.cn/b/bc/D26.59%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B47%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"Ht4xbO7hiHw","d":"2026-07-29","t":"ธรรมะที่ซ่อนอยู่ในพระพุทธรูป :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 ก.ค. 2569 (บ่าย)","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/690729B.mp3","cnMp3":"https://media.dhamma.cn/b/bc/D26.59%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B47%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"djILZrfgL8k","d":"2026-07-28","t":"การดูจิตเป็นวิธีปฏิบัติที่ลัดสั้นที่สุด :: หลวงปู่ปราโมทย์ ปาโมชฺโช 28 ก.ค. 2569","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/690728.mp3","cnMp3":""},
    {"id":"7VmwmA8i7dY","d":"2026-07-26","t":"หัวใจของการปฏิบัติคือการเจริญสติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 26 ก.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=OHdGgaMGnm8","thMp3":"https://media.dhamma.com/pramote/cd/2569/690726.mp3","cnMp3":"https://media.dhamma.cn/1/1b/D26.58%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B47%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"oxYRj7mnyc0","d":"2026-07-25","t":"นักปฏิบัติหลงเข้าไปปรุงแต่งจิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 25 ก.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=nBx2Nk9_VBg","thMp3":"https://media.dhamma.com/pramote/cd/2569/690725.mp3","cnMp3":"https://media.dhamma.cn/a/ae/D26.57%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B47%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"sQ-a3bbl6UU","d":"2026-07-25","t":"อย่าไปยินดียินร้ายกับนิมิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 25 ก.ค. 2569","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/690725.mp3","cnMp3":"https://media.dhamma.cn/a/ae/D26.57%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B47%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"wTZn8zkBBKM","d":"2026-07-19","t":"กฎของการดูจิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 19 ก.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=JG3IGdTVEKw","thMp3":"https://media.dhamma.com/pramote/cd/2569/690719.mp3","cnMp3":"https://media.dhamma.cn/3/3a/D26.56%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B47%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"tUctVoB3O1E","d":"2026-07-17","t":"หลักสูตรของฆราวาส :: หลวงปู่ปราโมทย์ ปาโมชฺโช 17 ก.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=gh2aDX4-7ho","thMp3":"https://media.dhamma.com/pramote/cd/2569/690717.mp3","cnMp3":""},
    {"id":"uoK2bRB2dwY","d":"2026-07-12","t":"กรรมเป็นเครื่องจำแนกสัตว์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 12 ก.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=kSq9B1XijCE","thMp3":"https://media.dhamma.com/pramote/cd/2569/690712.mp3","cnMp3":"https://media.dhamma.cn/a/a3/D26.55%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B47%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"OCOUGO3x3bA","d":"2026-07-11","t":"ทำอย่างไรเราจะไม่ยึดถือ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 11 ก.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=JO6pGNAybq4","thMp3":"https://media.dhamma.com/pramote/cd/2569/690711.mp3","cnMp3":"https://media.dhamma.cn/7/79/D26.54%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B47%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"APhSBwXcbVk","d":"2026-07-05","t":"คุณค่าของสติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 5 ก.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=EH15i1QGqDs","thMp3":"https://media.dhamma.com/pramote/cd/2569/690705.mp3","cnMp3":"https://media.dhamma.cn/1/1f/D26.53%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B47%E6%9C%885%E6%97%A5.mp3"},
    {"id":"PAUFWZyULcM","d":"2026-07-04","t":"ทำกรรมใดไว้ต้องได้รับผลของกรรมนั้น :: หลวงปู่ปราโมทย์ ปาโมชฺโช 4 ก.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=NkIjILpa8so","thMp3":"https://media.dhamma.com/pramote/cd/2569/690704.mp3","cnMp3":"https://media.dhamma.cn/2/25/D26.52%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B47%E6%9C%884%E6%97%A5.mp3"},
    {"id":"dSRj15bt9Gc","d":"2026-06-28","t":"ปฏิบัติธรรมเพื่อศึกษาความจริงของชีวิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 28 มิ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=wBvKgUlDIe8","thMp3":"https://media.dhamma.com/pramote/cd/2569/690628.mp3","cnMp3":"https://media.dhamma.cn/1/1b/D26.51%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B46%E6%9C%8828%E6%97%A5.mp3"},
    {"id":"70fUQLi2D8s","d":"2026-06-27","t":"ปัญญาเกิดจากการเห็นด้วยตัวเอง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 27 มิ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=W2vtIOPoN_E","thMp3":"https://media.dhamma.com/pramote/cd/2569/690627.mp3","cnMp3":"https://media.dhamma.cn/9/9d/D26.50%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B46%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"LMMt8XtxFkM","d":"2026-06-27","t":"ข่มนิวรณ์ด้วยความสงบ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 27 มิ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=W2vtIOPoN_E","thMp3":"https://media.dhamma.com/pramote/cd/2569/690627.mp3","cnMp3":"https://media.dhamma.cn/9/9d/D26.50%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B46%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"R1vzRiSpbMw","d":"2026-06-21","t":"ไม่ยึดมั่นถือมั่นเพราะเห็นความจริง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 21 มิ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=fh-P5D8adwE","thMp3":"https://media.dhamma.com/pramote/cd/2569/690621.mp3","cnMp3":"https://media.dhamma.cn/7/76/D26.49%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B46%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"8is_Fcv2phE","d":"2026-06-20","t":"รู้สึกตัวแล้วจะพัฒนาต่อได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 20 มิ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=7Tmxs3YgLKM","thMp3":"https://media.dhamma.com/pramote/cd/2569/690620.mp3","cnMp3":"https://media.dhamma.cn/2/25/D26.48%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B46%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"26w1MH7o0I4","d":"2026-06-19","t":"มีความเพียรอยู่กับกรรมฐาน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 19 มิ.ย. 2569","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/690619.mp3","cnMp3":""},
    {"id":"bIxdnF4HFhQ","d":"2026-06-14","t":"มีปัญญาเห็นจิตเป็นไตรลักษณ์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 14 มิ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=KnH5JOiRtUM","thMp3":"https://media.dhamma.com/pramote/cd/2569/690614.mp3","cnMp3":"https://media.dhamma.cn/7/74/D26.47%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B46%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"37jqlKGLMGY","d":"2026-06-13","t":"มรณสติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 มิ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=UfqLvPNPPs0","thMp3":"https://media.dhamma.com/pramote/cd/2569/690613.mp3","cnMp3":"https://media.dhamma.cn/b/b4/D26.46%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B46%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"7PPYJZIG0PU","d":"2026-06-07","t":"สิ่งใดเกิดสิ่งนั้นดับ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 7 มิ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=5o7xmmqswGA","thMp3":"https://media.dhamma.com/pramote/cd/2569/690607.mp3","cnMp3":"https://media.dhamma.cn/8/88/D26.45%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B46%E6%9C%887%E6%97%A5.mp3"},
    {"id":"LcMu03bLExo","d":"2026-06-06","t":"จุดเริ่มต้นคือความรู้สึกตัว :: หลวงปู่ปราโมทย์ ปาโมชฺโช 6 มิ.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=qdZFQrfSHyA","thMp3":"https://media.dhamma.com/pramote/cd/2569/690606.mp3","cnMp3":"https://media.dhamma.cn/8/82/D26.44%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B46%E6%9C%886%E6%97%A5.mp3"},
    {"id":"5dsy2xpdqRU","d":"2026-06-03","t":"รู้ทันใจตัวเองคือการปฏิบัติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 3 มิ.ย. 2569","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/690603.mp3","cnMp3":""},
    {"id":"hFVke2ktQlE","d":"2026-06-01","t":"มีสติตามรู้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 มิ.ย. 2569","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/690601.mp3","cnMp3":""},
    {"id":"gWD7ICVexTw","d":"2026-05-31","t":"ปัญญาคือการเห็นไตรลักษณ์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 พ.ค. 2569 (ช่วงบ่าย)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=OFmWlsy0qHE","thMp3":"https://media.dhamma.com/pramote/cd/2569/690531B.mp3","cnMp3":"https://media.dhamma.cn/6/69/D26.42%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B45%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"_hGeYWTqVVo","d":"2026-05-31","t":"วางได้เพราะเห็นไตรลักษณ์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 พ.ค. 2569 (ช่วงเช้า)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=OFmWlsy0qHE","thMp3":"https://media.dhamma.com/pramote/cd/2569/690531B.mp3","cnMp3":"https://media.dhamma.cn/6/69/D26.42%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B45%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"PEBWHDEMe8s","d":"2026-05-30","t":"ปฏิบัติตามหลักไตรสิกขา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 พ.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=DYbFv-k-fec","thMp3":"https://media.dhamma.com/pramote/cd/2569/690530.mp3","cnMp3":"https://media.dhamma.cn/9/93/D26.41%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B45%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"xVil-K_fCoY","d":"2026-05-24","t":"การเดินปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 24 พ.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=XyFEQI8LFzc","thMp3":"https://media.dhamma.com/pramote/cd/2569/690524.mp3","cnMp3":"https://media.dhamma.cn/0/01/D26.40%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B45%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"CkC13gxCsgU","d":"2026-05-23","t":"เจริญสติปัฏฐานจนเกิดปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 23 พ.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=_8tr4w9L86Q","thMp3":"https://media.dhamma.com/pramote/cd/2569/690523.mp3","cnMp3":"https://media.dhamma.cn/1/1b/D26.39%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B45%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"FZN4XiqP_90","d":"2026-05-17","t":"จิตตั้งมั่นแท้จริงแล้วถึงดูจิตได้ละเอียด :: หลวงปู่ปราโมทย์ ปาโมชฺโช 17 พ.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=R_sQm7Tysts","thMp3":"https://media.dhamma.com/pramote/cd/2569/690517.mp3","cnMp3":"https://media.dhamma.cn/8/81/D26.38%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B45%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"Z8EQcgRU62E","d":"2026-05-16","t":"วัตถุประสงค์ของการฝึกสมาธิ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 16 พ.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=FBpIildXUhU","thMp3":"https://media.dhamma.com/pramote/cd/2569/690516.mp3","cnMp3":"https://media.dhamma.cn/f/f7/D26.37%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B45%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"LuyxQ8rE_08","d":"2026-05-10","t":"ศาสนาพุทธไม่ได้มองโลกแง่ร้าย :: หลวงปู่ปราโมทย์ ปาโมชฺโช 10 พ.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=J8_x5heFi-I","thMp3":"https://media.dhamma.com/pramote/cd/2569/690510.mp3","cnMp3":"https://media.dhamma.cn/a/ac/D26.36%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B45%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"oWiX4T0Smw8","d":"2026-05-09","t":"กรรมแก้ไม่ได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 9 พ.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=wWQWDhgFATU","thMp3":"https://media.dhamma.com/pramote/cd/2569/690509.mp3","cnMp3":"https://media.dhamma.cn/f/f5/D26.35%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B45%E6%9C%889%E6%97%A5.mp3"},
    {"id":"-m2bSWSXDGA","d":"2026-05-03","t":"การเจริญปัญญา 3 ลักษณะ :: หลวงปู่ปราโมทย์ ปาโมชฺโช  3 พ.ค. 2569","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/690503.mp3","cnMp3":"https://media.dhamma.cn/b/b0/%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B45%E6%9C%883%E6%97%A5.mp3"},
    {"id":"xPxe1zeW7hE","d":"2026-05-02","t":"วิธีฝึกจิตให้สงบและตั้งมั่น :: หลวงปู่ปราโมทย์ ปาโมชฺโช 2 พ.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Day_Oqdbuyo","thMp3":"https://media.dhamma.com/pramote/cd/2569/690502.mp3","cnMp3":"https://media.dhamma.cn/7/7f/D26.34%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B45%E6%9C%882%E6%97%A5.mp3"},
    {"id":"13NBqdPwe5g","d":"2026-05-02","t":"ทางออกที่ดีในการแก้กรรม :: หลวงปู่ปราโมทย์ ปาโมชฺโช 2 พ.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Day_Oqdbuyo","thMp3":"https://media.dhamma.com/pramote/cd/2569/690502.mp3","cnMp3":"https://media.dhamma.cn/7/7f/D26.34%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B45%E6%9C%882%E6%97%A5.mp3"},
    {"id":"vxoBOtTAoOY","d":"2026-05-01","t":"ต้องซ้อมในรูปแบบถึงสู้กิเลสไหว :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 พ.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=lH3n08TULO8","thMp3":"https://media.dhamma.com/pramote/cd/2569/690501.mp3","cnMp3":""},
    {"id":"EAOjm3PtKKQ","d":"2026-04-25","t":"ถ้าไม่ยึดถือก็ไม่ทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 25 เม.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=IL5uGmGO0oY","thMp3":"https://media.dhamma.com/pramote/cd/2569/690425.mp3","cnMp3":"https://media.dhamma.cn/6/69/D26.33%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B44%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"klKTgh9jkHE","d":"2026-04-19","t":"การศึกษาธรรมะมีบทเรียน 3 บท :: หลวงปู่ปราโมทย์ ปาโมชฺโช 19 เม.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=udK7FfMvmzA","thMp3":"https://media.dhamma.com/pramote/cd/2569/690419.mp3","cnMp3":"https://media.dhamma.cn/b/b4/D26.32%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B44%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"45KZC0ruCQs","d":"2026-04-18","t":"เจริญสติปัฏฐานให้ถูกต้อง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 18 เม.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=x_vYZmC4PS8","thMp3":"https://media.dhamma.com/pramote/cd/2569/690418.mp3","cnMp3":"https://media.dhamma.cn/f/f7/D26.31%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B44%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"qXX2AgSOWa4","d":"2026-04-13","t":"วัตถุประสงค์ของสมถะและวิปัสสนา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 เม.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=PFr7_P95Yvg","thMp3":"https://media.dhamma.com/pramote/cd/2569/690413.mp3","cnMp3":""},
    {"id":"iA1VuFE8kIA","d":"2026-04-12","t":"12/04/2026 เห็นทุกข์จนไม่อยากไปเกิดแล้ว (Seeing Suffering and No Longer Wishing for Rebirth)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=JBT2nKNM_yo","thMp3":"https://media.dhamma.com/pramote/cd/2569/690412.mp3","cnMp3":"https://media.dhamma.cn/d/d3/D26.30%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B44%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"NfTRdVg0a5w","d":"2026-04-11","t":"นิโรธคือความดับทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 11 เม.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=QM-4zNITuV4","thMp3":"https://media.dhamma.com/pramote/cd/2569/690411.mp3","cnMp3":"https://media.dhamma.cn/4/40/D26.29%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B44%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"9Q_B1iGFrnU","d":"2026-04-05","t":"ความวิเวกเป็นเพื่อนที่ดีของเรา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 5 เม.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ROMrnImmxEI","thMp3":"https://media.dhamma.com/pramote/cd/2569/690405.mp3","cnMp3":"https://media.dhamma.cn/3/39/D26.28%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B44%E6%9C%885%E6%97%A5.mp3"},
    {"id":"WPe4sObGmWo","d":"2026-04-04","t":"กรรมฐานของแต่ละคนไม่เหมือนกัน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 4 เม.ย. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Qw74zfpJ8Ho","thMp3":"https://media.dhamma.com/pramote/cd/2569/690404.mp3","cnMp3":"https://media.dhamma.cn/8/8a/D26.27%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B44%E6%9C%884%E6%97%A5.mp3"},
    {"id":"yT-P_CG7mS0","d":"2026-03-29","t":"รากของตัณหาคือความไม่รู้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 มี.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=XoD9kl7M5dI","thMp3":"https://media.dhamma.com/pramote/cd/2569/690329.mp3","cnMp3":"https://media.dhamma.cn/9/9a/D26.26%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B43%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"CVaVUGK7ErU","d":"2026-03-22","t":"22/03/2026 นิพพานมีจริง (Nibbāna truly exists)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=1LTOdGtPBns","thMp3":"https://media.dhamma.com/pramote/cd/2569/690322.mp3","cnMp3":"https://media.dhamma.cn/2/2c/D26.25%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B43%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"eg-sHxjRYUk","d":"2026-03-21","t":"ธรรมะที่ควรเจริญด้วยปัญญาอันยิ่ง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 21 มี.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=AwwNN_p7ESM","thMp3":"https://media.dhamma.com/pramote/cd/2569/690321.mp3","cnMp3":"https://media.dhamma.cn/0/07/D26.24%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B43%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"qjseF770XZ4","d":"2026-03-20","t":"หมดอยากก็หมดทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 20 มี.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=J-dFCuqwORM","thMp3":"https://media.dhamma.com/pramote/cd/2569/690320.mp3","cnMp3":""},
    {"id":"luAbf0MQyMI","d":"2026-03-15","t":"จิตผู้รู้คือตัวทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 15 มี.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=SBtvanSB-hg","thMp3":"https://media.dhamma.com/pramote/cd/2569/690315.mp3","cnMp3":"https://media.dhamma.cn/d/d4/D26.23%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B43%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"cFK0zybthiw","d":"2026-03-14","t":"14/03/2026 จุดตั้งต้นคือความรู้สึกตัว (The starting point is awareness)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=49i2DYuNk3Y","thMp3":"https://media.dhamma.com/pramote/cd/2569/690314.mp3","cnMp3":"https://media.dhamma.cn/a/af/D26.22%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B43%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"7WCKa3fQ5D0","d":"2026-03-08","t":"ปัญญามี 2 ส่วน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 8 มี.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=CPcxkx05aNI","thMp3":"https://media.dhamma.com/pramote/cd/2569/690308.mp3","cnMp3":"https://media.dhamma.cn/1/18/D26.21%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B43%E6%9C%888%E6%97%A5.mp3"},
    {"id":"yLs0C4svZII","d":"2026-03-07","t":"ปัญญาตรัสรู้ของพระพุทธเจ้า :: หลวงปู่ปราโมทย์ ปาโมชฺโช 7 มี.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=oTrwTZPwyjc","thMp3":"https://media.dhamma.com/pramote/cd/2569/690307.mp3","cnMp3":"https://media.dhamma.cn/8/8e/D26.20%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B43%E6%9C%887%E6%97%A5.mp3"},
    {"id":"6tfFrEw9110","d":"2026-03-07","t":"นาทีทองในสังสารวัฏ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 7 มี.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=oTrwTZPwyjc","thMp3":"https://media.dhamma.com/pramote/cd/2569/690307.mp3","cnMp3":"https://media.dhamma.cn/8/8e/D26.20%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B43%E6%9C%887%E6%97%A5.mp3"},
    {"id":"9u2DQA96mZI","d":"2026-03-03","t":"พาจิตให้เรียนรู้ความจริง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 3 มี.ค. 2569 (ช่วงบ่าย)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Kw-67VktCMo","thMp3":"https://media.dhamma.com/pramote/cd/2569/690303B.mp3","cnMp3":"https://media.dhamma.cn/9/96/D26.19%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B43%E6%9C%883%E6%97%A5.mp3"},
    {"id":"h48LTHEAjiA","d":"2026-03-03","t":"03/03/2026 รูปแบบไหนไม่สำคัญเท่าเนื้อใน (The essence matters more than the method)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Kw-67VktCMo","thMp3":"https://media.dhamma.com/pramote/cd/2569/690303B.mp3","cnMp3":"https://media.dhamma.cn/9/96/D26.19%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B43%E6%9C%883%E6%97%A5.mp3"},
    {"id":"uKmvW8y6vxk","d":"2026-03-01","t":"เรียนธรรมะด้วยใจที่อ่อนโยน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 มี.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=YWntxfwtMhY","thMp3":"https://media.dhamma.com/pramote/cd/2569/690301.mp3","cnMp3":""},
    {"id":"e89f7Krxx5M","d":"2026-02-28","t":"ยอมรับความจริงได้ก็ไม่ทุกข์แล้ว :: หลวงปู่ปราโมทย์ ปาโมชฺโช 28 ก.พ. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Ff_L60AGQrU","thMp3":"https://media.dhamma.com/pramote/cd/2569/690228.mp3","cnMp3":"https://media.dhamma.cn/3/37/D26.18%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B42%E6%9C%8828%E6%97%A5.mp3"},
    {"id":"A-pWTa3mpr8","d":"2026-02-22","t":"อยู่กับวิหารธรรม :: หลวงปู่ปราโมทย์ ปาโมชฺโช 22 ก.พ. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Z1e3mgoGt6M","thMp3":"https://media.dhamma.com/pramote/cd/2569/690222.mp3","cnMp3":"https://media.dhamma.cn/0/01/D26.17%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B42%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"IRAcqLRRSsE","d":"2026-02-21","t":"ด่านที่ยากในการปฏิบัติ :: พระอาจารย์สมชาย กิตฺติญาโณ 21 ก.พ. 2569","sp":"other","cnYt":"https://www.youtube.com/watch?v=8dZ_UkZUHzw","thMp3":"https://media.dhamma.com/pramote/cd/2569/690221.mp3","cnMp3":"https://media.dhamma.cn/9/91/D26.16%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B42%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"vI0S1RXPIBA","d":"2026-02-21","t":"ถ้าลงมือปฏิบัติจะรู้ทุกข์แจ่มแจ้ง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 21 ก.พ. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=8dZ_UkZUHzw","thMp3":"https://media.dhamma.com/pramote/cd/2569/690221.mp3","cnMp3":"https://media.dhamma.cn/9/91/D26.16%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B42%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"OCn2vycBxhc","d":"2026-02-19","t":"ดูจนเห็นไตรลักษณ์ของขันธ์ 5 :: หลวงปู่ปราโมทย์ ปาโมชฺโช 19 ก.พ. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=6wbe1mUL8vA","thMp3":"https://media.dhamma.com/pramote/cd/2569/690219.mp3","cnMp3":""},
    {"id":"6y6yPKFh3Mg","d":"2026-02-15","t":"จิตประภัสสรคือจิตอวิชชา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 15 ก.พ. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=vJ5ANCxUNcg","thMp3":"https://media.dhamma.com/pramote/cd/2569/690215.mp3","cnMp3":"https://media.dhamma.cn/e/e8/D26.15%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B42%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"zJMHM8_KLoQ","d":"2026-02-14","t":"14/02/2026 ไม่ยึดถือจิตก็ไม่ยึดถือขันธ์ 5 (Not Clinging to the Mind, Not Clinging to Anything)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=TA07A57n1Ls","thMp3":"https://media.dhamma.com/pramote/cd/2569/690214.mp3","cnMp3":"https://media.dhamma.cn/a/a0/D26.14%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B42%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"mNMLI3k13dc","d":"2026-02-08","t":"08/02/2026 เริ่มจากจุดที่เราทำได้ (Begin with what you are able to do)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=B3ED9ddNCFM","thMp3":"https://media.dhamma.com/pramote/cd/2569/690208.mp3","cnMp3":"https://media.dhamma.cn/0/06/D26.13%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B42%E6%9C%888%E6%97%A5.mp3"},
    {"id":"fvSV87RyFrc","d":"2026-02-07","t":"วิญญาณไม่ใช่เรา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 7 ก.พ. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Fq3btBF--bk","thMp3":"https://media.dhamma.com/pramote/cd/2569/690207.mp3","cnMp3":"https://media.dhamma.cn/9/90/D26.12%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B42%E6%9C%887%E6%97%A5.mp3"},
    {"id":"t486Ltbju1Q","d":"2026-02-02","t":"จิตหยั่งลงในภพ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 2 ก.พ. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=dhK9JxQQqs8","thMp3":"","cnMp3":"https://media.dhamma.cn/e/e2/%E3%80%8A%E8%B6%8A%E4%BF%AE%E8%A1%8C%E8%B6%8A%E4%BC%9A%E8%B5%9E%E5%8F%B9%E4%BD%9B%E9%99%80%E7%9A%84%E6%99%BA%E6%85%A7%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2026%E5%B9%B42%E6%9C%882%E6%97%A5.mp3"},
    {"id":"btqRhez2fn4","d":"2026-02-01","t":"ประโยชน์ของสมาธิในทางโลก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 ก.พ. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=BKVoxON1Ixk","thMp3":"https://media.dhamma.com/pramote/cd/2569/690201.mp3","cnMp3":"https://media.dhamma.cn/d/d9/D26.11%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B42%E6%9C%881%E6%97%A5.mp3"},
    {"id":"FiTKm9E1-hc","d":"2026-01-31","t":"วิธีขจัดความเห็นผิดว่ามีตัวเรา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 ม.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=pQpK5WUaJMo","thMp3":"https://media.dhamma.com/pramote/cd/2569/690131.mp3","cnMp3":"https://media.dhamma.cn/b/b4/D26.10%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B41%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"Q-ft5oWWhQI","d":"2026-01-30","t":"วิธีเอาชนะความทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 ม.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=p-a42h6dyhs","thMp3":"https://media.dhamma.com/pramote/cd/2569/690130.mp3","cnMp3":"https://media.dhamma.cn/1/11/%E3%80%8A%E4%BD%9B%E6%95%99%E7%9A%84%E7%A5%9E%E5%A5%87%E4%B9%8B%E5%A4%84%EF%BC%9A%E6%8C%87%E5%87%BA%E9%97%AE%E9%A2%98%E4%B8%8E%E8%A7%A3%E5%86%B3%E4%B9%8B%E9%81%93%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2026%E5%B9%B41%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"gzensFpkXSA","d":"2026-01-27","t":"27/01/26 ทำอย่างไรใจจะไม่ทุกข์ (How Can the Mind Be Free from Suffering)","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2569/690127.mp3","cnMp3":""},
    {"id":"a76KM4fw8FU","d":"2026-01-25","t":"ยอมรับความจริงของโลก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 25 ม.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=s4i0YnTUtGo","thMp3":"https://media.dhamma.com/pramote/cd/2569/690125.mp3","cnMp3":"https://media.dhamma.cn/8/89/D26.9%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B41%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"cDOUao71wHc","d":"2026-01-24","t":"ข้อดีและข้อด้อยของกรรมฐานต่างๆ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 24 ม.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=RRwYYH5BC04","thMp3":"https://media.dhamma.com/pramote/cd/2569/690124.mp3","cnMp3":"https://media.dhamma.cn/6/62/D26.8%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B41%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"vejREa2_00k","d":"2026-01-18","t":"พัฒนาจิตให้กลับสู่ความเป็นประภัสสร :: หลวงปู่ปราโมทย์ ปาโมชฺโช 18 ม.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Z44Ky-EecaA","thMp3":"https://media.dhamma.com/pramote/cd/2569/690118.mp3","cnMp3":"https://media.dhamma.cn/5/51/D26.7%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B41%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"YFHluNceUUc","d":"2026-01-17","t":"ประโยชน์ของการทำสมถะ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 17 ม.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ssRDOylmMZE","thMp3":"https://media.dhamma.com/pramote/cd/2569/690117.mp3","cnMp3":"https://media.dhamma.cn/e/e9/D26.6%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B41%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"Vz1aK8hKM7k","d":"2026-01-11","t":"11/01/2026 วิธีสู้กิเลส (How to Fight Mental Impurities)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=b40y5QBm_hk","thMp3":"https://media.dhamma.com/pramote/cd/2569/690111.mp3","cnMp3":"https://media.dhamma.cn/c/c5/D26.5%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B41%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"k6VuLeMWFLw","d":"2026-01-10","t":"แผนที่การเดินทางในสังสารวัฏ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 10 ม.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=8icXmBfFAr4","thMp3":"https://media.dhamma.com/pramote/cd/2569/690110.mp3","cnMp3":"https://media.dhamma.cn/3/39/D26.4%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B41%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"aamZWEpai50","d":"2026-01-04","t":"ปลูกศรัทธาในใจเรา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 4 ม.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=jvNraxaTUbc","thMp3":"https://media.dhamma.com/pramote/cd/2569/690104.mp3","cnMp3":"https://media.dhamma.cn/e/ef/D26.3%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B41%E6%9C%884%E6%97%A5.mp3"},
    {"id":"no2m9InOjog","d":"2026-01-03","t":"ยอมรับความเป็นธรรมดา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 3 ม.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=YcOM1ws6BDs","thMp3":"https://media.dhamma.com/pramote/cd/2569/690103.mp3","cnMp3":"https://media.dhamma.cn/c/c7/D26.2%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B41%E6%9C%883%E6%97%A5.mp3"},
    {"id":"Dn5oQEor5jk","d":"2026-01-01","t":"การเห็นทุกข์คือการเห็นอริยสัจ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 ม.ค. 2569","sp":"lp","cnYt":"https://www.youtube.com/watch?v=RfYD-FVXbDk","thMp3":"https://media.dhamma.com/pramote/cd/2569/690101.mp3","cnMp3":"https://media.dhamma.cn/d/d0/D26.1%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B41%E6%9C%881%E6%97%A5.mp3"},
    {"id":"WSiwNH1Fkzg","d":"2025-12-31","t":"ทำกรรมฐานที่เราถนัด :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 ธ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=tOdYd3UEvy0","thMp3":"https://media.dhamma.com/pramote/cd/2568/681231.mp3","cnMp3":"https://media.dhamma.cn/1/1a/D25.112%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B412%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"rTzMK-tuGvI","d":"2025-12-29","t":"วิธีออกจากโลกของความคิด :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 ธ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=7LIVU2_xZN8","thMp3":"https://media.dhamma.com/pramote/cd/2568/681229.mp3","cnMp3":"https://media.dhamma.cn/f/f1/D25.111%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B412%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"GvNBa9yIX-M","d":"2025-12-28","t":"จากบุพพภาคมรรคสู่อริยมรรค :: หลวงปู่ปราโมทย์ ปาโมชฺโช 28 ธ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=knaMTuD04kg","thMp3":"https://media.dhamma.com/pramote/cd/2568/681228.mp3","cnMp3":"https://media.dhamma.cn/c/cb/D25.110%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B412%E6%9C%8828%E6%97%A5.mp3"},
    {"id":"sxve9kQafGM","d":"2025-12-27","t":"ทางสายกลางของแต่ละคน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 27 ธ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=1b1ftbhV9B0","thMp3":"https://media.dhamma.com/pramote/cd/2568/681227.mp3","cnMp3":"https://media.dhamma.cn/2/2b/D25.109%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B412%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"VUEWk3rUvlA","d":"2025-12-21","t":"อย่าทิ้งโอกาสในการปฏิบัติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 21 ธ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=kFW13kUeh6I","thMp3":"https://media.dhamma.com/pramote/cd/2568/681221.mp3","cnMp3":"https://media.dhamma.cn/2/21/D25.108%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B412%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"jUIdwlJGNWM","d":"2025-12-21","t":"สุขอื่นเสมอด้วยความสงบไม่มี :: หลวงปู่ปราโมทย์ ปาโมชฺโช 21 ธ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=kFW13kUeh6I","thMp3":"https://media.dhamma.com/pramote/cd/2568/681221.mp3","cnMp3":"https://media.dhamma.cn/2/21/D25.108%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B412%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"LfmzJ-Q4qek","d":"2025-12-20","t":"20/12/2025 วิเวก (Seclusion)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=eBzTA5X4pus","thMp3":"https://media.dhamma.com/pramote/cd/2568/681220.mp3","cnMp3":"https://media.dhamma.cn/b/b0/D25.107%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B412%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"Huac1MldQTo","d":"2025-12-13","t":"หัดเจริญสติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 ธ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=xaP3oaOsSJg","thMp3":"https://media.dhamma.com/pramote/cd/2568/681213.mp3","cnMp3":"https://media.dhamma.cn/b/bd/%E3%80%8A%E7%99%BE%E5%B2%81%E6%85%88%E6%AF%8D%EF%BC%8C%E7%A6%8F%E5%AF%BF%E5%9C%86%E6%BB%A1%EF%BC%9A%E4%BA%8E%E6%AF%8D%E4%BA%B2%E5%91%8A%E5%88%AB%E4%BB%AA%E5%BC%8F%E4%B8%8A%E7%9A%84%E5%BC%80%E7%A4%BA%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B412%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"PABhrziaULk","d":"2025-12-11","t":"วิธีละสักกายทิฏฐิ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 11 ธ.ค. 2568","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2568/681211.mp3","cnMp3":""},
    {"id":"LnjOX15k2WE","d":"2025-12-07","t":"07/12/2025 ความเผลอเพลินคือตัวร้าย (Being Lost in Indulgence is the Villain)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=3bXHc-qOLrk","thMp3":"https://media.dhamma.com/pramote/cd/2568/681207.mp3","cnMp3":"https://media.dhamma.cn/c/c1/D25.105%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B412%E6%9C%887%E6%97%A5.mp3"},
    {"id":"BIib2ZllBIk","d":"2025-12-06","t":"สิ่งที่หลวงปู่ดูลย์สอน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 6 ธ.ค. 2568 (ช่วงเช้า)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=AQePmJh0NoE","thMp3":"https://media.dhamma.com/pramote/cd/2568/681206B.mp3","cnMp3":"https://media.dhamma.cn/6/6e/D25.104%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B412%E6%9C%886%E6%97%A5.mp3"},
    {"id":"P7uPJFGGf0M","d":"2025-12-06","t":"รู้รูปธรรมกับนามธรรม :: หลวงปู่ปราโมทย์ ปาโมชฺโช 6 ธ.ค. 2568 (ช่วงเย็น)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=AQePmJh0NoE","thMp3":"https://media.dhamma.com/pramote/cd/2568/681206B.mp3","cnMp3":"https://media.dhamma.cn/6/6e/D25.104%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B412%E6%9C%886%E6%97%A5.mp3"},
    {"id":"NxmlyZ3H7-I","d":"2025-12-05","t":"ทาน ศีล ภาวนา ทำให้ครบ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 5 ธ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=lYCKfrA0k2M","thMp3":"https://media.dhamma.com/pramote/cd/2568/681205.mp3","cnMp3":"https://media.dhamma.cn/f/fc/%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B412%E6%9C%885%E6%97%A5.mp3"},
    {"id":"_Yg7CLq4SZI","d":"2025-12-04","t":"ภาวนาด้วยความมีสติ :: พระอาจารย์สมชาย กิตฺติญาโณ 4 ธ.ค. 2568","sp":"other","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"_4j4b3jQgr4","d":"2025-12-01","t":"เรื่องทานไม่ใช่เรื่องเล็ก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 ธ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=RNhbhKKLmoU","thMp3":"https://media.dhamma.com/pramote/cd/2568/681201.mp3","cnMp3":"https://media.dhamma.cn/0/03/%E3%80%8A%E5%AF%B9%E5%BF%83%E9%80%82%E4%B9%8B%E5%AE%B6%E4%B9%89%E5%B7%A5%E7%9A%84%E5%BC%80%E7%A4%BA%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B412%E6%9C%881%E6%97%A5.mp3"},
    {"id":"G9QRp9mFrtI","d":"2025-11-30","t":"ความอดทนเป็นจุดสำคัญ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 พ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=iF4kTgvY4AI","thMp3":"https://media.dhamma.com/pramote/cd/2568/681130.mp3","cnMp3":"https://media.dhamma.cn/f/ff/D25.103%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B411%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"qvceLF1Glxk","d":"2025-11-29","t":"29/11/2025 ความสนุกในการภาวนา (The Joy of Practice)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=N24_pp_9qiw","thMp3":"https://media.dhamma.com/pramote/cd/2568/681129.mp3","cnMp3":"https://media.dhamma.cn/a/aa/D25.102%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B411%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"B_YH0_04t4E","d":"2025-11-23","t":"23/11/2025 ฝึกความเคยชินที่จะรู้สึกตัว (Develop the habit of being mindful)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=6teEQkdj-lI","thMp3":"https://media.dhamma.com/pramote/cd/2568/681123.mp3","cnMp3":"https://media.dhamma.cn/6/68/D25.101%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B411%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"JcWdXQNSl1o","d":"2025-11-22","t":"หลวงปู่พาปฏิบัติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 22 พ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=27WaU69XHR8","thMp3":"https://media.dhamma.com/pramote/cd/2568/681122.mp3","cnMp3":"https://media.dhamma.cn/f/f3/D25.100%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B411%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"yX1TCs9Om7I","d":"2025-11-16","t":"16/11/2025 วิธียอมรับความจริง (How to accept reality)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=7hhpZKRlqVE","thMp3":"https://media.dhamma.com/pramote/cd/2568/681116.mp3","cnMp3":"https://media.dhamma.cn/0/05/D25.99%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B411%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"jHKCsusXjLY","d":"2025-11-15","t":"หลักการสำคัญของการปฏิบัติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 15 พ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=f2kRgPt_UvQ","thMp3":"https://media.dhamma.com/pramote/cd/2568/681115.mp3","cnMp3":"https://media.dhamma.cn/2/24/D25.98%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B411%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"OsgcG3QTohQ","d":"2025-11-09","t":"ถิรสัญญาเป็นเหตุใกล้ให้เกิดสติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 9 พ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=1y9j9OT2qs8","thMp3":"https://media.dhamma.com/pramote/cd/2568/681109.mp3","cnMp3":"https://media.dhamma.cn/0/05/D25.97%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B411%E6%9C%889%E6%97%A5.mp3"},
    {"id":"AzKkERhcsdo","d":"2025-11-08","t":"ไม่เห็นจิตก็ไม่เห็นธรรม :: หลวงปู่ปราโมทย์ ปาโมชฺโช 8 พ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=VSbBHMkAYMc","thMp3":"https://media.dhamma.com/pramote/cd/2568/681108.mp3","cnMp3":"https://media.dhamma.cn/2/27/D25.96%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B411%E6%9C%888%E6%97%A5.mp3"},
    {"id":"xrOmlI658ms","d":"2025-11-02","t":"อยากได้ของดีก็ต้องลงทุน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 2 พ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Lc1rLZ7lJcU","thMp3":"https://media.dhamma.com/pramote/cd/2568/681102.mp3","cnMp3":"https://media.dhamma.cn/d/d0/D25.95%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B411%E6%9C%882%E6%97%A5.mp3"},
    {"id":"aFU43Jvg7k4","d":"2025-11-01","t":"รู้กายรู้ใจตามความเป็นจริง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 พ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=mVKkgAtwLdo","thMp3":"https://media.dhamma.com/pramote/cd/2568/681101.mp3","cnMp3":"https://media.dhamma.cn/3/39/D25.94%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B411%E6%9C%881%E6%97%A5.mp3"},
    {"id":"vDTIkOQGH08","d":"2025-10-31","t":"วิธีฝึกให้จิตตั้งมั่น :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=fi3ggz39CXA","thMp3":"https://media.dhamma.com/pramote/cd/2568/681031.mp3","cnMp3":"https://media.dhamma.cn/b/b2/D25.93%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"XvEGVu5Wvt8","d":"2025-10-30","t":"จิตก็ไม่เที่ยง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=s-0bTbXgi0Y","thMp3":"https://media.dhamma.com/pramote/cd/2568/681030.mp3","cnMp3":"https://media.dhamma.cn/3/3f/D25.92%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"cknqdkBGyJE","d":"2025-10-26","t":"ทุกขสัจ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 26 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=IK0FGEqQEqM","thMp3":"https://media.dhamma.com/pramote/cd/2568/681026.mp3","cnMp3":"https://media.dhamma.cn/d/da/D25.91%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"51w5SvdegFY","d":"2025-10-25","t":"เห็นทุกขสัจ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 25 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ywAooZnrvP8","thMp3":"https://media.dhamma.com/pramote/cd/2568/681025.mp3","cnMp3":"https://media.dhamma.cn/c/c5/D25.90%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"ffBrYDxCy3c","d":"2025-10-24","t":"ทำสมาธิให้เป็น :: หลวงปู่ปราโมทย์ ปาโมชฺโช 24 ต.ค. 2568","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2568/681024.mp3","cnMp3":""},
    {"id":"8uwT7oIi8Mc","d":"2025-10-23","t":"สติปัฏฐาน 4 :: หลวงปู่ปราโมทย์ ปาโมชฺโช 23 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=cFAMiRXjriY","thMp3":"https://media.dhamma.com/pramote/cd/2568/681023.mp3","cnMp3":"https://media.dhamma.cn/0/0e/D25.89%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"LGw63Mhl0Hc","d":"2025-10-19","t":"เดินไปตามลำดับขององค์มรรค :: หลวงปู่ปราโมทย์ ปาโมชฺโช 19 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=sj9f0W9SHJA","thMp3":"https://media.dhamma.com/pramote/cd/2568/681019.mp3","cnMp3":"https://media.dhamma.cn/2/22/D25.88%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"UDL6-08zZUg","d":"2025-10-18","t":"ปลุกใจตัวเองให้กล้าหาญ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 18 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ii1lpEx6hnM","thMp3":"https://media.dhamma.com/pramote/cd/2568/681018.mp3","cnMp3":"https://media.dhamma.cn/8/8e/D25.87%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"ZDjcEBmjwFw","d":"2025-10-13","t":"เข้าใจธรรมะก็เข้าใจโลก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=esnfoBPIWnM","thMp3":"https://media.dhamma.com/pramote/cd/2568/681013.mp3","cnMp3":"https://media.dhamma.cn/c/ca/D25.86%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"F4qEjgJ-gWE","d":"2025-10-12","t":"ความสุขภายใน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 12 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Q8xZ2PB7PEY","thMp3":"https://media.dhamma.com/pramote/cd/2568/681012.mp3","cnMp3":"https://media.dhamma.cn/1/14/D25.84%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"Hxll-qAM_mU","d":"2025-10-11","t":"จิตหลงแล้วรู้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 11 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=jaFw97H6_8w","thMp3":"https://media.dhamma.com/pramote/cd/2568/681011.mp3","cnMp3":"https://media.dhamma.cn/a/a0/D25.83%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"XqIDo-_yQn0","d":"2025-10-07","t":"ลำบากเพื่อสู้กิเลส :: หลวงปู่ปราโมทย์ ปาโมชฺโช 7 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=h93fpAS3oHQ","thMp3":"https://media.dhamma.com/pramote/cd/2568/681007.mp3","cnMp3":"https://media.dhamma.cn/b/b6/D25.82%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%887%E6%97%A5.mp3"},
    {"id":"maAaNHGzj1Q","d":"2025-10-05","t":"อารมณ์ที่ใช้ทำสมถะและวิปัสสนา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 5 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=TWM4xdOReI8","thMp3":"https://media.dhamma.com/pramote/cd/2568/681005.mp3","cnMp3":"https://media.dhamma.cn/d/de/D25.81%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%885%E6%97%A5.mp3"},
    {"id":"_UkgyCRQbnY","d":"2025-10-04","t":"เลือกกรรมฐานที่เหมาะกับเรา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 4 ต.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=U5dA2olUaaU","thMp3":"https://media.dhamma.com/pramote/cd/2568/681004.mp3","cnMp3":"https://media.dhamma.cn/2/28/D25.80%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B410%E6%9C%884%E6%97%A5.mp3"},
    {"id":"hsa2cCvH3KQ","d":"2025-09-28","t":"ภาวะอันยอดเยี่ยม 6 ประการ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 28 ก.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=bJoN2i1q9UQ","thMp3":"https://media.dhamma.com/pramote/cd/2568/680928.mp3","cnMp3":"https://media.dhamma.cn/b/bc/D25.79%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B49%E6%9C%8828%E6%97%A5.mp3"},
    {"id":"tnz4Z9Ypqp4","d":"2025-09-27","t":"อนุตตริยสูตร :: หลวงปู่ปราโมทย์ ปาโมชฺโช 27 ก.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ItM0lUkJ41w","thMp3":"https://media.dhamma.com/pramote/cd/2568/680927.mp3","cnMp3":"https://media.dhamma.cn/5/5e/D25.78%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B49%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"hXNdw945LWw","d":"2025-09-21","t":"ตัดทอนพระไตรปิฎกตามใจชอบไม่ได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 21 ก.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=fNYItjKB1U4","thMp3":"https://media.dhamma.com/pramote/cd/2568/680921.mp3","cnMp3":"https://media.dhamma.cn/9/94/D25.77%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B49%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"ceHUAZ4Trcw","d":"2025-09-20","t":"ว่างไม่ใช่ว่างเปล่า :: หลวงปู่ปราโมทย์ ปาโมชฺโช 20 ก.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=64rfmrHlYtE","thMp3":"https://media.dhamma.com/pramote/cd/2568/680920.mp3","cnMp3":"https://media.dhamma.cn/6/63/D25.76%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B49%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"yVzQWH9wVuI","d":"2025-09-14","t":"อ่านใจของเราให้ชำนาญ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 14 ก.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=IRZjd9MwqoE","thMp3":"https://media.dhamma.com/pramote/cd/2568/680914.mp3","cnMp3":"https://media.dhamma.cn/3/34/D25.74%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B49%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"zItFX2G8fnM","d":"2025-09-14","t":"จิตเบื่อโลก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 14 ก.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=IRZjd9MwqoE","thMp3":"https://media.dhamma.com/pramote/cd/2568/680914.mp3","cnMp3":"https://media.dhamma.cn/3/34/D25.74%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B49%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"R_Ci6SJL-fQ","d":"2025-09-13","t":"การเตรียมตัวตาย :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 ก.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=_w4KP6LPptQ","thMp3":"https://media.dhamma.com/pramote/cd/2568/680913.mp3","cnMp3":"https://media.dhamma.cn/c/cd/D25.73%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B49%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"7gk_tfcGJSM","d":"2025-09-07","t":"หายนะเพราะไม่รักษาศีล :: หลวงปู่ปราโมทย์ ปาโมชฺโช 7 ก.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=NoGfEQlZBRg","thMp3":"https://media.dhamma.com/pramote/cd/2568/680907.mp3","cnMp3":"https://media.dhamma.cn/c/cd/D25.72%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B49%E6%9C%887%E6%97%A5.mp3"},
    {"id":"kkd414lAG08","d":"2025-09-06","t":"แก่นคำสอนที่แท้จริงในพระพุทธศาสนา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 6 ก.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=zNHq1bQsA2E","thMp3":"https://media.dhamma.com/pramote/cd/2568/680906.mp3","cnMp3":"https://media.dhamma.cn/5/5d/D25.71%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B49%E6%9C%886%E6%97%A5.mp3"},
    {"id":"Q4DO4uE1Yu4","d":"2025-08-31","t":"ซ้อมในรูปแบบแล้วออกมาอยู่ในชีวิตจริง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=83HZZhSHoLc","thMp3":"https://media.dhamma.com/pramote/cd/2568/680831.mp3","cnMp3":"https://media.dhamma.cn/0/06/D25.71%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B48%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"kJX6pfSKB7Y","d":"2025-08-30","t":"รู้ซื่อๆ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=XwmLupxvem4","thMp3":"https://media.dhamma.com/pramote/cd/2568/680830.mp3","cnMp3":"https://media.dhamma.cn/e/ed/D25.70%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B48%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"cUtbdnAxO4U","d":"2025-08-29","t":"รู้ไปตามธรรมชาติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=l7-Lkdq0LmU","thMp3":"https://media.dhamma.com/pramote/cd/2568/680829.mp3","cnMp3":"https://media.dhamma.cn/5/54/%E3%80%8A%E4%BD%93%E4%BC%9A%E5%BF%83%E7%9A%84%E8%87%AA%E7%84%B6%E4%B8%8E%E5%88%BB%E6%84%8F%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B48%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"-vSuou4ZtMc","d":"2025-08-27","t":"ตัวจิตเองก็ตกอยู่ใต้ไตรลักษณ์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 27 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=oZ0R32zetSY","thMp3":"https://media.dhamma.com/pramote/cd/2568/680827.mp3","cnMp3":"https://media.dhamma.cn/7/79/%E3%80%8A%E8%B8%8F%E4%B8%8A%E5%94%AF%E4%B8%80%E8%B7%AF%EF%BC%8C%E6%8A%B5%E8%BE%BE%E5%AE%89%E5%85%A8%E5%A4%84%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B48%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"2qhl02zrn-4","d":"2025-08-24","t":"ธรรมะกับการตัดกิเลส :: หลวงปู่ปราโมทย์ ปาโมชฺโช 24 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=BicK8K_AoXo","thMp3":"https://media.dhamma.com/pramote/cd/2568/680824.mp3","cnMp3":"https://media.dhamma.cn/4/45/%E3%80%8A%E4%BB%A5%E6%88%92%E5%BE%A1%E6%95%8C%EF%BC%8C%E4%BB%A5%E5%AE%9A%E9%80%80%E6%95%8C%EF%BC%8C%E4%BB%A5%E6%85%A7%E6%9D%80%E6%95%8C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B48%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"YKl9TelvaKQ","d":"2025-08-23","t":"รู้สึกตัวไว้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 23 ส.ค. 2568","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2568/680823.mp3","cnMp3":""},
    {"id":"4NfGSynCzNk","d":"2025-08-17","t":"การจำแนกขันธ์ 5 :: หลวงปู่ปราโมทย์ ปาโมชฺโช 17 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=oR4Xk4ZoHX8","thMp3":"https://media.dhamma.com/pramote/cd/2568/680817.mp3","cnMp3":"https://media.dhamma.cn/7/75/D25.69%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B48%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"jPGsDtMw3QQ","d":"2025-08-16","t":"ภูมิธรรมของพระอริยะ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 16 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=F3Zy0W5oBPc","thMp3":"https://media.dhamma.com/pramote/cd/2568/680816.mp3","cnMp3":"https://media.dhamma.cn/8/8f/D25.68%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B48%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"zZ8h17Li0O8","d":"2025-08-12","t":"ฝึกใจให้มีเมตตา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 12 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Ifv-mpbzL_s","thMp3":"https://media.dhamma.com/pramote/cd/2568/680812.mp3","cnMp3":"https://media.dhamma.cn/d/d0/D25.67%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B48%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"J4NsGxllFB4","d":"2025-08-10","t":"จุดสำคัญที่จะสู้กามราคะได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 10 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=5J715EjxDNA","thMp3":"https://media.dhamma.com/pramote/cd/2568/680810.mp3","cnMp3":"https://media.dhamma.cn/9/9c/D25.66%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B48%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"EaRv6MTBf-4","d":"2025-08-09","t":"ทำถูกแล้วต้องทำให้มาก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 9 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=SkLBK3ChxLA","thMp3":"https://media.dhamma.com/pramote/cd/2568/680809.mp3","cnMp3":"https://media.dhamma.cn/1/10/D25.65%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B48%E6%9C%889%E6%97%A5.mp3"},
    {"id":"NNp3cJGoklU","d":"2025-08-06","t":"06/08/2025 นาทีทองในสังสารวัฏ (The Golden Moment in Saṃsāra)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"iPC2cLXwH3Y","d":"2025-08-03","t":"ความอยากดีคือกับดักสำคัญ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 3 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ARZechML044","thMp3":"https://media.dhamma.com/pramote/cd/2568/680803.mp3","cnMp3":"https://media.dhamma.cn/7/73/D25.64%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B48%E6%9C%883%E6%97%A5.mp3"},
    {"id":"yiEPBxOoAjo","d":"2025-08-02","t":"รีบปฏิบัติเข้า :: หลวงปู่ปราโมทย์ ปาโมชฺโช 2 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=8nb6PWepgHQ","thMp3":"https://media.dhamma.com/pramote/cd/2568/680802.mp3","cnMp3":"https://media.dhamma.cn/6/60/D25.62%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B48%E6%9C%882%E6%97%A5.mp3"},
    {"id":"uMnYjm1H9Ew","d":"2025-08-01","t":"เร่งความเพียร :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 ส.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=XtYlxjsyeKg","thMp3":"https://media.dhamma.com/pramote/cd/2568/680801.mp3","cnMp3":"https://media.dhamma.cn/0/0b/D25.62%E3%80%8A%E6%9D%AF%E4%B8%AD%E5%86%B7%E6%9A%96%EF%BC%8C%E5%BF%83%E9%97%B4%E8%87%AA%E7%9F%A5%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%852025%E5%B9%B48%E6%9C%881%E6%97%A5.mp3"},
    {"id":"N1TYE1fjTd8","d":"2025-07-28","t":"รู้จักสภาวะเผลอกับเพ่งให้ดี :: หลวงปู่ปราโมทย์ ปาโมชฺโช 28 ก.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=0EkkmXvHZ7c","thMp3":"https://media.dhamma.com/pramote/cd/2568/680728.mp3","cnMp3":""},
    {"id":"XhugimE3a3I","d":"2025-07-27","t":"ต้องลงมือปฏิบัติถึงจะเข้าใจ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 27 ก.ค. 2568","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2568/680727.mp3","cnMp3":"https://media.dhamma.cn/7/7e/D25.61%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B47%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"jKW24G4RKdE","d":"2025-07-26","t":"จิตตั้งมั่นแล้วขันธ์แยกเอง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 26 ก.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=nmQ3jjJWLLo","thMp3":"https://media.dhamma.com/pramote/cd/2568/680726.mp3","cnMp3":"https://media.dhamma.cn/9/9a/D25.59%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B47%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"EJQCniNiRjM","d":"2025-07-23","t":"เจริญปัญญาได้เพราะจิตตั้งมั่น :: หลวงปู่ปราโมทย์ ปาโมชฺโช 23 ก.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=4nswDqVfk8M","thMp3":"https://media.dhamma.com/pramote/cd/2568/680723.mp3","cnMp3":"https://media.dhamma.cn/8/8a/D25.59%E3%80%8A%E9%82%A3%E9%81%93%E6%A7%9B%EF%BC%9A%E4%BF%AE%E8%A1%8C%E8%B7%83%E8%BF%81%E7%9A%84%E5%88%86%E6%B0%B4%E5%B2%AD%E6%97%B6%E5%88%BB%E4%B8%8E%E7%A0%B4%E5%85%B3%E8%AF%80%E7%AA%8D%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B47%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"EPgCZnRaYUU","d":"2025-07-20","t":"เรารักษาศีล ศีลรักษาเรา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 20 ก.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=-kT6D5Pjj1I","thMp3":"https://media.dhamma.com/pramote/cd/2568/680720.mp3","cnMp3":"https://media.dhamma.cn/e/e2/D25.58%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B47%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"vsPoJtZ9xtY","d":"2025-07-20","t":"เทวดาชอบคนถือศีล :: หลวงปู่ปราโมทย์ ปาโมชฺโช 20 ก.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=-kT6D5Pjj1I","thMp3":"https://media.dhamma.com/pramote/cd/2568/680720.mp3","cnMp3":"https://media.dhamma.cn/e/e2/D25.58%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B47%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"klQYLcCpRNg","d":"2025-07-19","t":"อยู่กับปัจจุบัน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 19 ก.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=We3Vr4Bg5zo","thMp3":"https://media.dhamma.com/pramote/cd/2568/680719.mp3","cnMp3":"https://media.dhamma.cn/c/c0/D25.56%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B47%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"8ev3Vdaoo8o","d":"2025-07-13","t":"จิตเป็นกลางด้วยปัญญาอันยิ่ง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 ก.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=FqAZvHX0wJc","thMp3":"https://media.dhamma.com/pramote/cd/2568/680713.mp3","cnMp3":"https://media.dhamma.cn/e/e4/D25.56%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B47%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"-FEFH8n4w60","d":"2025-07-12","t":"ขณะนี้มีโอกาสให้รีบปฏิบัติเสีย :: หลวงปู่ปราโมทย์ ปาโมชฺโช 12 ก.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=nerTb-0UUAI","thMp3":"https://media.dhamma.com/pramote/cd/2568/680712.mp3","cnMp3":"https://media.dhamma.cn/2/2d/D25.55%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B47%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"W-V4GyH6lhU","d":"2025-07-12","t":"อย่าไปซ้ำเติมคนหกล้ม :: หลวงปู่ปราโมทย์ ปาโมชฺโช 12 ก.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=nerTb-0UUAI","thMp3":"https://media.dhamma.com/pramote/cd/2568/680712.mp3","cnMp3":"https://media.dhamma.cn/2/2d/D25.55%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B47%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"y85NtOj88jc","d":"2025-07-11","t":"ครูบาอาจารย์สอนแล้วเรามีหน้าที่ทำ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 11 ก.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=LrefZjBsk0Q","thMp3":"https://media.dhamma.com/pramote/cd/2568/680711.mp3","cnMp3":""},
    {"id":"mdRJOYJN0EU","d":"2025-07-10","t":"เรียนแล้วไม่ทำก็ไม่ก้าวหน้า :: หลวงปู่ปราโมทย์ ปาโมชฺโช 10 ก.ค. 2568 (ช่วงเช้า)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=h9IybkykQUQ","thMp3":"https://media.dhamma.com/pramote/cd/2568/680710B.mp3","cnMp3":"https://media.dhamma.cn/e/e7/D25.54%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B47%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"ZzJmHstCs9E","d":"2025-07-10","t":"วิธีเจริญปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 10 ก.ค. 2568 (ช่วงบ่าย)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=h9IybkykQUQ","thMp3":"https://media.dhamma.com/pramote/cd/2568/680710B.mp3","cnMp3":"https://media.dhamma.cn/e/e7/D25.54%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B47%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"vmj3BeE4O0w","d":"2025-07-06","t":"เวลาภาวนาให้ดูตัวเอง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 6 ก.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=EYwLFH1XXjI","thMp3":"https://media.dhamma.com/pramote/cd/2568/680706.mp3","cnMp3":"https://media.dhamma.cn/3/33/D25.53%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B47%E6%9C%886%E6%97%A5.mp3"},
    {"id":"uKBss9WeSaM","d":"2025-07-05","t":"วิธีเข้าถึงภาวะที่พ้นทุกข์  :: หลวงปู่ปราโมทย์ ปาโมชฺโช 5 ก.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=hfICFyJ-qRQ","thMp3":"https://media.dhamma.com/pramote/cd/2568/680705.mp3","cnMp3":"https://media.dhamma.cn/8/86/D25.52%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B47%E6%9C%885%E6%97%A5.mp3"},
    {"id":"JbzI5emT6w8","d":"2025-06-29","t":"มีสติอยู่กับวิหารธรรม :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 มิ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ZHRlPngZvi0","thMp3":"https://media.dhamma.com/pramote/cd/2568/680629.mp3","cnMp3":"https://media.dhamma.cn/c/cd/D25.51%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B46%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"L6oKK6gVJa8","d":"2025-06-28","t":"28/06/2025 ไม่เผลอกับไม่เพ่งถึงมีสติตัวจริง (Not wandering off, not over-focusing: real mindfulness)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=gzLq9cgdzXw","thMp3":"https://media.dhamma.com/pramote/cd/2568/680628.mp3","cnMp3":"https://media.dhamma.cn/d/dd/D25.50%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B46%E6%9C%8828%E6%97%A5.mp3"},
    {"id":"jsKKBjL2Z8Y","d":"2025-06-25","t":"พัฒนาจิตเพื่อการดับทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 25 มิ.ย. 2568","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2568/680625.mp3","cnMp3":""},
    {"id":"gaMedY7sfes","d":"2025-06-25","t":"จุดหมายปลายทางของการปฏิบัติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 25 มิ.ย. 2568","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2568/680625.mp3","cnMp3":""},
    {"id":"m4sdJJ5mDrc","d":"2025-06-22","t":"3 สิ่งที่ต้องทำให้ได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 22 มิ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=t0mX6zTW7ME","thMp3":"https://media.dhamma.com/pramote/cd/2568/680622.mp3","cnMp3":"https://media.dhamma.cn/8/86/D25.49%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B46%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"artUG8L3Dk0","d":"2025-06-21","t":"แยกธาตุแยกขันธ์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 21 มิ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=owSY0VE9Yu8","thMp3":"https://media.dhamma.com/pramote/cd/2568/680621.mp3","cnMp3":"https://media.dhamma.cn/b/b7/D25.48%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B46%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"QMhsu2VQjgg","d":"2025-06-20","t":"ไม่เชื่อคำสอนอย่ามาอ้อนว่าเป็นลูกศิษย์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 20 มิ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=KapEL2pmqx0","thMp3":"https://media.dhamma.com/pramote/cd/2568/680620.mp3","cnMp3":"https://media.dhamma.cn/b/bb/D25.47%E3%80%8A%E7%A9%BA%E9%A1%B6%E5%B8%88%E5%90%8D%EF%BC%8C%E4%B8%8D%E8%A1%8C%E5%B8%88%E9%81%93%EF%BC%9A%E7%9A%86%E6%98%AF%E6%8A%95%E6%9C%BA%E5%AE%A2%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B46%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"6xE7YmPDqwk","d":"2025-06-15","t":"ฝึกสติปัฏฐานจนปล่อยวางจิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 15 มิ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=meteAzvkqEM","thMp3":"https://media.dhamma.com/pramote/cd/2568/680615.mp3","cnMp3":"https://media.dhamma.cn/e/e4/D25.46%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B46%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"zgKGOr62jFk","d":"2025-06-14","t":"จงทำญาณเห็นจิตให้เหมือนตาเห็นรูป :: หลวงปู่ปราโมทย์ ปาโมชฺโช 14 มิ.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=qEqXr64FEp8","thMp3":"https://media.dhamma.com/pramote/cd/2568/680614.mp3","cnMp3":"https://media.dhamma.cn/3/39/D25.45%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B46%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"mK-cGubJ7gg","d":"2025-05-31","t":"หลักสูตรที่ทำให้เรามีสติและปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 พ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=d-Kvz3P0_X8","thMp3":"https://media.dhamma.com/pramote/cd/2568/680531.mp3","cnMp3":"https://media.dhamma.cn/7/76/D25.41%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B45%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"hURVThgN7f4","d":"2025-05-25","t":"25/05/2025 ความดีมีโอกาสทำให้รีบทำ (Do Good While You Still Have the Chance)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=eHape2OuO1s","thMp3":"https://media.dhamma.com/pramote/cd/2568/680525.mp3","cnMp3":"https://media.dhamma.cn/0/00/D25.40%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B45%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"0gGSbDXjhS0","d":"2025-05-24","t":"ภาวนาในรูปแบบ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 24 พ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=P4JFDRpvXRA","thMp3":"https://media.dhamma.com/pramote/cd/2568/680524.mp3","cnMp3":"https://media.dhamma.cn/7/77/D25.39%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B45%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"iurxs1_AP2g","d":"2025-05-18","t":"18/05/2025 อย่าถลุงเวลาให้วอดวายไปเฉยๆ (Don't throw your time away in vain)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ZDNMJvfMYCM","thMp3":"https://media.dhamma.com/pramote/cd/2568/680518.mp3","cnMp3":"https://media.dhamma.cn/f/f8/%E3%80%8A%E4%B8%96%E9%97%B4%E7%94%9F%E4%BA%A7%E9%97%AE%E9%A2%98%EF%BC%8C%E5%BF%83%E7%94%9F%E4%BA%A7%E8%8B%A6%E3%80%8B-_%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B45%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"o6HMwVdv_SM","d":"2025-05-17","t":"สู้กิเลสด้วยการรู้ทัน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 17 พ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=N1kkxgzBbF0","thMp3":"https://media.dhamma.com/pramote/cd/2568/680517.mp3","cnMp3":"https://media.dhamma.cn/f/fe/D25.38%E3%80%8A%E6%AD%A3%E5%AE%9A%E7%A6%BB%E4%B8%8D%E5%BC%80%E8%A7%89%E6%80%A7%E3%80%8B-_%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B45%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"vpLpPsYzA1w","d":"2025-05-11","t":"วิธีทำสมาธิแบบง่าย :: หลวงปู่ปราโมทย์ ปาโมชฺโช 11 พ.ค. 2568 (ช่วงบ่าย)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=cVZklp3XnQw","thMp3":"https://media.dhamma.com/pramote/cd/2568/680511B.mp3","cnMp3":"https://media.dhamma.cn/6/62/D25.36%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B45%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"G8yHWi-0TG8","d":"2025-05-10","t":"ความสุขเป็นเหตุใกล้ให้เกิดสมาธิ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 10 พ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Fgf2sUgQnI4","thMp3":"https://media.dhamma.com/pramote/cd/2568/680510.mp3","cnMp3":"https://media.dhamma.cn/7/7a/D25.35%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B45%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"vgEc37LmEJ8","d":"2025-05-04","t":"เห็นความปรุงแต่งแล้วอย่าปรุงแต่งต่อ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 4 พ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=k76op4fhPu4","thMp3":"https://media.dhamma.com/pramote/cd/2568/680504.mp3","cnMp3":"https://media.dhamma.cn/9/90/%E3%80%8A%E5%81%9A%E5%9D%9A%E5%BC%BA%E7%9A%84%E4%BF%AE%E8%A1%8C%E4%BA%BA%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B45%E6%9C%884%E6%97%A5.mp3"},
    {"id":"DE9l9WScDjQ","d":"2025-05-03","t":"อยากได้ดีต้องเด็ดเดี่ยว :: หลวงปู่ปราโมทย์ ปาโมชฺโช 3 พ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=p1lhZqwCbN8","thMp3":"https://media.dhamma.com/pramote/cd/2568/680503.mp3","cnMp3":"https://media.dhamma.cn/a/a3/D25.34%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B45%E6%9C%883%E6%97%A5.mp3"},
    {"id":"3UBiDmDhuq4","d":"2025-05-03","t":"จิตต้นกำเนิด :: หลวงปู่ปราโมทย์ ปาโมชฺโช 3 พ.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=p1lhZqwCbN8","thMp3":"https://media.dhamma.com/pramote/cd/2568/680503.mp3","cnMp3":"https://media.dhamma.cn/a/a3/D25.34%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B45%E6%9C%883%E6%97%A5.mp3"},
    {"id":"tk_n5Q9XidM","d":"2025-04-27","t":"27/04/2025 ศีลไม่ดีภาวนาไม่ขึ้น (If Sīla is Not Good, Meditation Won't Progress)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=qJCtNrVrrEA","thMp3":"https://media.dhamma.com/pramote/cd/2568/680427B.mp3","cnMp3":"https://media.dhamma.cn/1/18/D25.33%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B44%E6%9C%8827%E6%97%A5-B.mp3"},
    {"id":"hB0StRxFgwY","d":"2025-04-26","t":"หลวงปู่พาดูจิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 26 เม.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Rb_lhuOcFPU","thMp3":"https://media.dhamma.com/pramote/cd/2568/680426.mp3","cnMp3":"https://media.dhamma.cn/b/b5/D25.32%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B44%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"-6bsAofX6FE","d":"2025-04-26","t":"เราจะใช้ชีวิตอย่างไรในโลกที่วุ่นวาย :: หลวงปู่ปราโมทย์ ปาโมชฺโช 26 เม.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Rb_lhuOcFPU","thMp3":"https://media.dhamma.com/pramote/cd/2568/680426.mp3","cnMp3":"https://media.dhamma.cn/b/b5/D25.32%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B44%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"V7SSe8_vNrI","d":"2025-04-20","t":"ภาพรวมของการปฏิบัติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 20 เม.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=37K8isXX_5w","thMp3":"https://media.dhamma.com/pramote/cd/2568/680420.mp3","cnMp3":"https://media.dhamma.cn/8/83/D25.30%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B44%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"KeVK9UL0YT0","d":"2025-04-19","t":"วิธีฝึกให้ได้ขณิกสมาธิ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 19 เม.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=fWBu0S5k-dE","thMp3":"https://media.dhamma.com/pramote/cd/2568/680419B.mp3","cnMp3":"https://media.dhamma.cn/b/bb/D25.31%E3%80%8A%E4%B8%9A%E6%9E%9C%E6%98%BE%E5%8C%96%E7%9A%84%E6%97%B6%E9%97%B4%E5%AF%86%E7%A0%81-%E8%91%AC%E7%A4%BC%E4%B8%8A%E7%9A%84%E5%BC%80%E7%A4%BA%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B44%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"S2TRTuVqBks","d":"2025-04-19","t":"19/04/2025 ลำดับการให้ผลของกรรม (The Sequence of Kamma's Fruition)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=fWBu0S5k-dE","thMp3":"https://media.dhamma.com/pramote/cd/2568/680419B.mp3","cnMp3":"https://media.dhamma.cn/b/bb/D25.31%E3%80%8A%E4%B8%9A%E6%9E%9C%E6%98%BE%E5%8C%96%E7%9A%84%E6%97%B6%E9%97%B4%E5%AF%86%E7%A0%81-%E8%91%AC%E7%A4%BC%E4%B8%8A%E7%9A%84%E5%BC%80%E7%A4%BA%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B44%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"tUSWRFdUfMM","d":"2025-04-13","t":"13/04/2025 รู้ความจริงว่าขันธ์ 5 เป็นตัวทุกข์(Know the truth that the five aggregates are suffering)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=cB0grly_zHE","thMp3":"https://media.dhamma.com/pramote/cd/2568/680413.mp3","cnMp3":"https://media.dhamma.cn/0/0f/D25.27%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B44%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"F8UFDpKDFZQ","d":"2025-04-12","t":"12/04/2025 ตัวรู้ที่ถูกต้อง (The Right Knower)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=BGrx1ETSa5M","thMp3":"https://media.dhamma.com/pramote/cd/2568/680412.mp3","cnMp3":"https://media.dhamma.cn/f/fe/D25.26%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B44%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"BXaQRcG2B7Y","d":"2025-04-07","t":"จิตเห็นทุกข์เห็นโทษได้จะพ้นทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 7 เม.ย. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=YBOby61FP_0","thMp3":"https://media.dhamma.com/pramote/cd/2568/680407.mp3","cnMp3":"https://media.dhamma.cn/d/d0/D25.25%E3%80%8A%E6%82%B2%E5%BF%83%E4%BC%A0%E6%B3%95%E7%81%AF%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2025%E5%B9%B44%E6%9C%887%E6%97%A5.mp3"},
    {"id":"NhBXUUcg7Xo","d":"2025-03-26","t":"วิธีไปสู่นิพพาน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 26 มี.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=3z2F8NfIupA","thMp3":"https://media.dhamma.com/pramote/cd/2568/680326.mp3","cnMp3":""},
    {"id":"8vrtZt129RU","d":"2025-03-22","t":"22/03/2025 จุดสำคัญอยู่ที่การรู้ทันจิตตัวเอง (The key lies in being aware of your own mind)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Ks0lR0QSndc","thMp3":"https://media.dhamma.com/pramote/cd/2568/680322.mp3","cnMp3":"https://media.dhamma.cn/4/47/D25.23%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B43%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"JQqZ9mVo1u4","d":"2025-03-22","t":"รู้สึกตัวได้ถึงจะปฏิบัติได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 22 มี.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Ks0lR0QSndc","thMp3":"https://media.dhamma.com/pramote/cd/2568/680322.mp3","cnMp3":"https://media.dhamma.cn/4/47/D25.23%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B43%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"K-iUh6Qr9EA","d":"2025-03-16","t":"16/03/2025 ขันธ์ 5 ล้วนตกอยู่ใต้ไตรลักษณ์ (The Five Aggregates fall under the Three Characteristics)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=jJDHRehPN9A","thMp3":"https://media.dhamma.com/pramote/cd/2568/680316.mp3","cnMp3":"https://media.dhamma.cn/f/fe/D25.22%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B43%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"uoA3DuI8oZU","d":"2025-02-23","t":"ตายแบบศิษย์มีครู :: หลวงปู่ปราโมทย์ ปาโมชฺโช 23 ก.พ. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=SB0XFAJaBPg","thMp3":"https://media.dhamma.com/pramote/cd/2568/680223.mp3","cnMp3":"https://media.dhamma.cn/0/0b/D25.17%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B42%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"7fgvFpN87MA","d":"2025-02-22","t":"อัปเกรดสมาธิ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 22 ก.พ. 2568 (เช้า)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=FBhuTjXWvYM","thMp3":"https://media.dhamma.com/pramote/cd/2568/680222B.mp3","cnMp3":"https://media.dhamma.cn/f/f8/D25.16%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B42%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"XmCuX4IooPM","d":"2025-02-22","t":"หนทางรู้ทุกข์อย่างแจ่มแจ้ง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 22 ก.พ. 2568 (ช่วงเย็น)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=FBhuTjXWvYM","thMp3":"https://media.dhamma.com/pramote/cd/2568/680222B.mp3","cnMp3":"https://media.dhamma.cn/f/f8/D25.16%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B42%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"Qt62s47-N4w","d":"2025-02-15","t":"ใช้อานาปานสติทำวิปัสสนา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 15 ก.พ. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=JAKIqHLBWhQ","thMp3":"https://media.dhamma.com/pramote/cd/2568/680215.mp3","cnMp3":"https://media.dhamma.cn/b/b9/D25.14%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B42%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"awRzubMgN_k","d":"2025-02-12","t":"สติปัฏฐานเริ่มจากฐานไหนก็ได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 12 ก.พ. 2568 (ช่วงเช้า)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=M3QggHaJdVM","thMp3":"https://media.dhamma.com/pramote/cd/2568/680212B.mp3","cnMp3":"https://media.dhamma.cn/e/ed/D25.13%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B42%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"-Ay3A98cTsA","d":"2025-02-12","t":"วิธีพัฒนากุศลให้เจริญ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 12 ก.พ. 2568 (ช่วงบ่าย)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=M3QggHaJdVM","thMp3":"https://media.dhamma.com/pramote/cd/2568/680212B.mp3","cnMp3":"https://media.dhamma.cn/e/ed/D25.13%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B42%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"egiLIA_sAiw","d":"2025-02-09","t":"09/02/2025 ทิ้งโยนิโสมนสิการไม่ได้ (Cannot Abandon Critical observation)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ogw4q8eLNP8","thMp3":"https://media.dhamma.com/pramote/cd/2568/680209.mp3","cnMp3":"https://media.dhamma.cn/8/8d/D25.12%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B42%E6%9C%889%E6%97%A5.mp3"},
    {"id":"JhJjQMTWzU4","d":"2025-02-08","t":"จิตที่ไม่หยั่งลงไปเกิด :: หลวงปู่ปราโมทย์ ปาโมชฺโช 8 ก.พ. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=jneLoHZuOT0","thMp3":"https://media.dhamma.com/pramote/cd/2568/680208.mp3","cnMp3":"https://media.dhamma.cn/5/52/D25.11%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B42%E6%9C%888%E6%97%A5.mp3"},
    {"id":"ZqyAVyf_cgQ","d":"2025-02-02","t":"การปฏิบัติธรรมกับการดำรงชีวิตเป็นอันเดียวกัน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 2 ก.พ. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=3Oid_Gc1gTI","thMp3":"https://media.dhamma.com/pramote/cd/2568/680202.mp3","cnMp3":"https://media.dhamma.cn/b/b1/D25.10%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B42%E6%9C%882%E6%97%A5.mp3"},
    {"id":"7OZypaLK8SU","d":"2025-02-01","t":"ศึกษาธรรมะอย่างระมัดระวัง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 ก.พ. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=J7Yf7OZMmPk","thMp3":"https://media.dhamma.com/pramote/cd/2568/680201.mp3","cnMp3":"https://media.dhamma.cn/5/5c/D25.9%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B42%E6%9C%881%E6%97%A5.mp3"},
    {"id":"uhtTNqIp-hU","d":"2025-01-26","t":"26/01/2025 เรียนรู้กายใจด้วยใจปกติ (Study the body and mind with an ordinary mind)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=3v770vqc5Rk","thMp3":"https://media.dhamma.com/pramote/cd/2568/680126.mp3","cnMp3":"https://media.dhamma.cn/0/08/D25.8%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B41%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"ilrnx7qWCgE","d":"2025-01-26","t":"Study the body and mind with an ordinary mind :: Luangpu Pramote Pamojjo 26 Jan 2025","sp":"lp","cnYt":"https://www.youtube.com/watch?v=3v770vqc5Rk","thMp3":"https://media.dhamma.com/pramote/cd/2568/680126.mp3","cnMp3":"https://media.dhamma.cn/0/08/D25.8%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B41%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"AsQMHgn13ho","d":"2025-01-19","t":"19/01/2025 ฝึกเพื่อยอมรับความเป็นธรรมดา (Practice to accept the nature of things)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=N-nkGNikx60","thMp3":"https://media.dhamma.com/pramote/cd/2568/680119.mp3","cnMp3":"https://media.dhamma.cn/0/04/D25.7%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B41%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"mZ7YpycVbVc","d":"2025-01-18","t":"หัดสังเกตใจตัวเอง :: หลวงปู่ปราโมทย์ ปาโมชฺโช  18 ม.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=fIj5xzEkZJQ","thMp3":"https://media.dhamma.com/pramote/cd/2568/680118.mp3","cnMp3":"https://media.dhamma.cn/6/61/D25.6%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B41%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"NxmdfYZDLKI","d":"2025-01-12","t":"คำสอนพระพุทธเจ้าเป็นเรื่องเหตุกับผล :: หลวงปู่ปราโมทย์ ปาโมชฺโช 12 ม.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=QQCYb_7aKnA","thMp3":"https://media.dhamma.com/pramote/cd/2568/680112.mp3","cnMp3":"https://media.dhamma.cn/a/af/D25.5%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B41%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"u9iRiwaGXB0","d":"2025-01-05","t":"เราทำอะไรก็ได้ผลอย่างนั้น :: หลวงปู่ปราโมทย์ ปาโมชฺโช 5 ม.ค. 2568","sp":"lp","cnYt":"https://www.youtube.com/watch?v=W6gOXI9jENA","thMp3":"https://media.dhamma.com/pramote/cd/2568/680105.mp3","cnMp3":"https://media.dhamma.cn/4/43/D25.3%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2025%E5%B9%B41%E6%9C%885%E6%97%A5.mp3"},
    {"id":"TavrJ7OliCw","d":"2024-12-31","t":"หลักการทำสมถกรรมฐาน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 ธ.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=C50jR9utpDE","thMp3":"https://media.dhamma.com/pramote/cd/2567/671231.mp3","cnMp3":""},
    {"id":"L4w391rz2k0","d":"2024-12-29","t":"พร้อมเผชิญทุกข์ด้วยการฝึกกรรมฐาน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 ธ.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=YRO9pHuUTlw","thMp3":"https://media.dhamma.com/pramote/cd/2567/671229.mp3","cnMp3":""},
    {"id":"SR1C7Q-aVJc","d":"2024-12-21","t":"บุคคลถึงความบริสุทธิ์ได้ด้วยปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 21 ธ.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=47Ux_84DsnM","thMp3":"https://media.dhamma.com/pramote/cd/2567/671221.mp3","cnMp3":"https://media.dhamma.cn/e/e9/D24.104%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B412%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"LzeX9S0qUjI","d":"2024-12-14","t":"สิ่งที่คุ้มครองเราได้ไม่ใช่วัตถุมงคล :: หลวงปู่ปราโมทย์ ปาโมชฺโช 14 ธ.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Nux1PyQcLwk","thMp3":"https://media.dhamma.com/pramote/cd/2567/671214.mp3","cnMp3":"https://media.dhamma.cn/a/a4/D24.104%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B412%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"1nOak23r8UU","d":"2024-12-10","t":"เทวดาสู้ความเพียรของมนุษย์ไม่ได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 10 ธ.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=qgg1lNY7zTI","thMp3":"https://media.dhamma.com/pramote/cd/2567/671210.mp3","cnMp3":"https://media.dhamma.cn/6/6e/D24.103%E3%80%8A%E4%BD%9B%E6%95%99%E4%B8%BA%E4%BB%80%E4%B9%88%E4%BF%A1%E4%BC%97%E5%B0%91%E7%9A%84%E5%8E%9F%E5%9B%A0%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2024%E5%B9%B412%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"tTDHpesaZz4","d":"2024-12-07","t":"07/12/2024 รู้จิตอย่างที่มันเป็น (Know the mind as it really is)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=sQ5uTo_57co","thMp3":"https://media.dhamma.com/pramote/cd/2567/671207.mp3","cnMp3":"https://media.dhamma.cn/e/e1/D24.100%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B412%E6%9C%887%E6%97%A5.mp3"},
    {"id":"6tCNLi-sCys","d":"2024-12-05","t":"อยู่กับธรรมะจนวันตาย :: หลวงปู่ปราโมทย์ ปาโมชฺโช 5 ธ.ค. 67","sp":"lp","cnYt":"https://www.youtube.com/watch?v=5E0gGi_cKpI","thMp3":"https://media.dhamma.com/pramote/cd/2567/671205.mp3","cnMp3":"https://media.dhamma.cn/f/fb/D24.100%E3%80%8A%E5%8F%AA%E6%9C%89%E6%B3%95%E6%89%8D%E6%98%AF%E6%88%91%E4%BB%AC%E7%94%9F%E5%91%BD%E7%9A%84%E7%9C%9F%E4%BC%B4%E4%BE%A3%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2024%E5%B9%B412%E6%9C%885%E6%97%A5.mp3"},
    {"id":"ZD_e-FNUMnU","d":"2024-12-01","t":"วิธีตรวจการบ้านตัวเอง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 ธ.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Trmdfy2wgr0","thMp3":"https://media.dhamma.com/pramote/cd/2567/671201.mp3","cnMp3":"https://media.dhamma.cn/7/7e/D24.99%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B412%E6%9C%881%E6%97%A5.mp3"},
    {"id":"BdaXklOr8gI","d":"2024-11-30","t":"การภาวนาที่ละเอียดเข้าไป :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 พ.ย. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=b3DurAJdZaQ","thMp3":"https://media.dhamma.com/pramote/cd/2567/671130.mp3","cnMp3":"https://media.dhamma.cn/d/d4/D24.98%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B411%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"4l89kYg1H8c","d":"2024-11-24","t":"การเจริญสติในชีวิตประจำวัน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 24 พ.ย. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=t2F9mLHW6uc","thMp3":"https://media.dhamma.com/pramote/cd/2567/671124.mp3","cnMp3":"https://media.dhamma.cn/d/da/D24.97%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B411%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"dU49ery5BnQ","d":"2024-11-23","t":"สัมมาสติเกิดจากการเจริญสติปัฏฐาน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 23 พ.ย. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=9SRki8qYfQA","thMp3":"https://media.dhamma.com/pramote/cd/2567/671123.mp3","cnMp3":"https://media.dhamma.cn/b/b4/D24.96%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B411%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"r2v_3rXoS5M","d":"2024-11-17","t":"17/11/2024 ดูสภาวะให้เป็น (Learn to observe phenomena as they are)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=O1kiSZQ_Jjc","thMp3":"https://media.dhamma.com/pramote/cd/2567/671117.mp3","cnMp3":"https://media.dhamma.cn/d/df/D24.95%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B411%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"cR3ggZHc9d0","d":"2024-11-03","t":"วางขันธ์ได้ก็คือวางโลกได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 3 พ.ย. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=gjOtlSPVGLw","thMp3":"https://media.dhamma.com/pramote/cd/2567/671103.mp3","cnMp3":"https://media.dhamma.cn/b/b4/D24.93%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B411%E6%9C%883%E6%97%A5.mp3"},
    {"id":"tVGkEsl03zY","d":"2024-10-26","t":"รู้สึกตัวได้แล้วก็เจริญปัญญา ::  หลวงปู่ปราโมทย์ ปาโมชฺโช 26 ต.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=zdaeVVbMm9s","thMp3":"https://media.dhamma.com/pramote/cd/2567/671026.mp3","cnMp3":""},
    {"id":"EREAIjCnfkQ","d":"2024-10-25","t":"กฎแห่งการรู้ทันความปรุงแต่งของจิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 25 ต.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=spdYrEMcYd4","thMp3":"https://media.dhamma.com/pramote/cd/2567/671025.mp3","cnMp3":""},
    {"id":"i1FN0ms-D14","d":"2024-10-20","t":"ลงมือปฏิบัติเสียแต่วันนี้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 20 ต.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=60PgBjSBDrA","thMp3":"https://media.dhamma.com/pramote/cd/2567/671020.mp3","cnMp3":"https://media.dhamma.cn/3/30/D24.91%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B410%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"AZFL12BmJTc","d":"2024-10-18","t":"สะสมคุณธรรมความดี :: หลวงปู่ปราโมทย์ ปาโมชฺโช 18 ต.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=KxbKeJpUsns","thMp3":"https://media.dhamma.com/pramote/cd/2567/671018.mp3","cnMp3":"https://media.dhamma.cn/4/44/D24.89%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B410%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"7XKbbUyV2bM","d":"2024-10-14","t":"จิตที่เป็นธรรมดา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 14 ต.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=OE8LOPVCXhs","thMp3":"https://media.dhamma.com/pramote/cd/2567/671014.mp3","cnMp3":"https://media.dhamma.cn/f/f1/D24.88%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B410%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"4rnzC619euc","d":"2024-10-13","t":"อย่าปรุงแต่งจิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 ต.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=m46OGWlJZIs","thMp3":"https://media.dhamma.com/pramote/cd/2567/671013.mp3","cnMp3":"https://media.dhamma.cn/c/c9/D24.87%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B410%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"jpXWuvhN9rw","d":"2024-10-12","t":"12/10/2024 ไม่มีใครภาวนาแล้วจิตเจริญตลอดเวลา (No one’s mind progresses nonstop in meditation)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=zHQJzPS3uNE","thMp3":"https://media.dhamma.com/pramote/cd/2567/671012.mp3","cnMp3":"https://media.dhamma.cn/f/fb/D24.86%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B410%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"JhZo44HWsHU","d":"2024-10-06","t":"ศีลจำเป็นสำหรับการภาวนา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 6 ต.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=WugK2O9uYUg","thMp3":"https://media.dhamma.com/pramote/cd/2567/671006.mp3","cnMp3":"https://media.dhamma.cn/a/a7/D24.85%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B410%E6%9C%886%E6%97%A5.mp3"},
    {"id":"gsdELob3y4g","d":"2024-10-05","t":"สติทำให้เกิดสมาธิและปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 5 ต.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=-Kefx2oG6DE","thMp3":"https://media.dhamma.com/pramote/cd/2567/671005.mp3","cnMp3":"https://media.dhamma.cn/0/03/D24.84%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B410%E6%9C%885%E6%97%A5.mp3"},
    {"id":"3OxJgbOGrno","d":"2024-09-29","t":"การมีสติทำให้สมาธิบริบูรณ์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 ก.ย. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=BXa2sjHhMT8","thMp3":"https://media.dhamma.com/pramote/cd/2567/670929.mp3","cnMp3":"https://media.dhamma.cn/a/ac/D24.83%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B49%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"GtNwwLj3zXc","d":"2024-09-22","t":"ร่างกายนี้คือตัวทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 22 ก.ย. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ZzMSO4vhlLI","thMp3":"https://media.dhamma.com/pramote/cd/2567/670922.mp3","cnMp3":"https://media.dhamma.cn/b/b2/D24.81%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B49%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"k0_4_uFMaDM","d":"2024-09-21","t":"21/09/2024 ร่างกายโดนความทุกข์ขย้ำอยู่ตลอดเวลา (The body is constantly being gnawed at by suffering)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=sebbQoOTI-k","thMp3":"https://media.dhamma.com/pramote/cd/2567/670921.mp3","cnMp3":"https://media.dhamma.cn/3/39/D24.80%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B49%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"FY0qsKzthXo","d":"2024-09-07","t":"ทำสมถะเพื่อให้จิตมีแรงและตั้งมั่น :: หลวงปู่ปราโมทย์ ปาโมชฺโช 7 ก.ย. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=6xQrH5w5btw","thMp3":"https://media.dhamma.com/pramote/cd/2567/670907.mp3","cnMp3":"https://media.dhamma.cn/7/7a/D24.76%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B49%E6%9C%887%E6%97%A5.mp3"},
    {"id":"R0VmO2fierE","d":"2024-09-01","t":"01/09/2024 พ้นทุกข์เพราะรู้ความจริง (Free from Suffering Through Knowing the Truth)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=czQywzFsx9A","thMp3":"https://media.dhamma.com/pramote/cd/2567/670901.mp3","cnMp3":"https://media.dhamma.cn/a/af/2024.09.01_%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E7%9B%B4%E6%92%AD-%E7%BD%91%E7%BB%9C%E7%89%88.mp3"},
    {"id":"7GueOakYaLE","d":"2024-08-31","t":"ความสุขที่เกิดจากปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 ส.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=hZ2HAaM_fjs","thMp3":"https://media.dhamma.com/pramote/cd/2567/670831.mp3","cnMp3":"https://media.dhamma.cn/7/7d/D24.71%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B48%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"TT4lfUVVW28","d":"2024-08-28","t":"รู้เท่าทันความปรุงแต่งของจิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 28 ส.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=tA5RJ_NzAOw","thMp3":"https://media.dhamma.com/pramote/cd/2567/670828.mp3","cnMp3":""},
    {"id":"GQwC25ukM5g","d":"2024-08-24","t":"ไม่มีอะไรมีโทษร้ายแรงเท่ามิจฉาทิฏฐิ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 24 ส.ค. 2567","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/3/3b/D24.71%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B48%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"3A-XpaL-Ru8","d":"2024-08-18","t":"มีสติรู้ทันจิตออกนอกคือการเจริญมรรค :: หลวงปู่ปราโมทย์ ปาโมชฺโช 18 ส.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=-AjfBdriGDs","thMp3":"https://media.dhamma.com/pramote/cd/2567/670818.mp3","cnMp3":"https://media.dhamma.cn/b/b2/D24.70%E3%80%8A%E2%80%9C%E5%88%AB%E6%8A%8A%E5%BF%83%E5%BE%80%E5%A4%96%E9%80%81%E2%80%9D%E7%9A%84%E6%84%8F%E6%80%9D%E6%98%AF%E4%BB%80%E4%B9%88%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2024%E5%B9%B48%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"-7IOkImOOcE","d":"2024-08-10","t":"จิตตั้งมั่นแล้วเดินปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 10 ส.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=kwhXtrzltDo","thMp3":"https://media.dhamma.com/pramote/cd/2567/670810.mp3","cnMp3":"https://media.dhamma.cn/8/84/D24.66%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B48%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"yMkA7kehld4","d":"2024-08-04","t":"สติปัฏฐาน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 4 ส.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=o0Iy_6qRdqM","thMp3":"https://media.dhamma.com/pramote/cd/2567/670804.mp3","cnMp3":"https://media.dhamma.cn/4/4c/D24.65%E3%80%8A%E8%A6%81%E5%B0%8F%E5%BF%83%E5%9B%A0%E7%A6%85%E5%AE%9A%E8%80%8C%E5%BC%95%E5%8F%91%E7%9A%84%E9%82%AA%E8%A7%81%E3%80%8B-_%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2024%E5%B9%B48%E6%9C%884%E6%97%A5.mp3"},
    {"id":"7oz3lxB02uM","d":"2024-07-29","t":"คาถาแก้ทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 ก.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=GcTTZPhVmeo","thMp3":"https://media.dhamma.com/pramote/cd/2567/670729.mp3","cnMp3":""},
    {"id":"Be0NZmmgUgc","d":"2024-07-29","t":"ของถูกรู้ถูกดูไม่ใช่ตัวเรา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 ก.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=GcTTZPhVmeo","thMp3":"https://media.dhamma.com/pramote/cd/2567/670729.mp3","cnMp3":""},
    {"id":"Y7GrdD5j25M","d":"2024-07-22","t":"เข้าใจความจริงจึงสิ้นอยาก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 22 ก.ค. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670722.mp3","cnMp3":""},
    {"id":"7S5V79a0cMg","d":"2024-07-13","t":"บวชแล้วอย่าให้เปลืองผ้าเหลือง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 ก.ค. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670713.mp3","cnMp3":""},
    {"id":"HnYLsxOcT2E","d":"2024-06-29","t":"ฝึกตนดีแล้วค่อยฝึกผู้อื่น :: หลวงปู่ปราโมทย์ ปาโมชฺโช 29 มิ.ย. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=-Pfu_kJaDMQ","thMp3":"https://media.dhamma.com/pramote/cd/2567/670629.mp3","cnMp3":"https://media.dhamma.cn/4/42/D24.55%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B46%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"XW08v57iH1M","d":"2024-06-15","t":"ธรรมะข้ามโลก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 15 มิ.ย. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=4ui0-tSA1sw","thMp3":"https://media.dhamma.com/pramote/cd/2567/670615.mp3","cnMp3":"https://media.dhamma.cn/e/e6/D24.51%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B46%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"E3Mf9ZW6elk","d":"2024-06-08","t":"ทดสอบพระอริยะ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 8 มิ.ย. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=qFK2gavyxZY","thMp3":"https://media.dhamma.com/pramote/cd/2567/670608.mp3","cnMp3":"https://media.dhamma.cn/0/09/D24.49%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B46%E6%9C%888%E6%97%A5.mp3"},
    {"id":"C6seC3tIBZ0","d":"2024-06-07","t":"07/06/2024 เรียนรู้ทุกข์เพื่อพ้นทุกข์ (Study Suffering to be Liberated from it)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=_aV9O6tccz4","thMp3":"https://media.dhamma.com/pramote/cd/2567/670607.mp3","cnMp3":"https://media.dhamma.cn/a/a3/D24.48%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B46%E6%9C%887%E6%97%A5.mp3"},
    {"id":"FRv5gG-zOME","d":"2024-05-26","t":"การทำสมาธิกับการเจริญปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 26 พ.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=oXq0QXOT1kQ","thMp3":"https://media.dhamma.com/pramote/cd/2567/670526.mp3","cnMp3":"https://media.dhamma.cn/6/6c/D24.45%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B45%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"GpUAkFLFIJw","d":"2024-05-25","t":"จิตตั้งมั่นทำให้เราเจริญปัญญาได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 25 พ.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=C25QqDA66xQ","thMp3":"https://media.dhamma.com/pramote/cd/2567/670525.mp3","cnMp3":"https://media.dhamma.cn/c/c3/D24.44%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B45%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"wWqwejIe1TY","d":"2024-05-22","t":"สัจฉิกิริยา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 22 พ.ค. 2567 (ช่วงบ่าย)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=p7vKViVefRc","thMp3":"https://media.dhamma.com/pramote/cd/2567/670522B.mp3","cnMp3":"https://media.dhamma.cn/7/74/D24.43%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B45%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"LT7MgUpE7co","d":"2024-05-12","t":"รถวินีตสูตร :: หลวงปู่ปราโมทย์ ปาโมชฺโช 12 พ.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=LkmsKbHh0Nc","thMp3":"https://media.dhamma.com/pramote/cd/2567/670512.mp3","cnMp3":"https://media.dhamma.cn/0/09/D24.40%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B45%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"ewmFih-V3cI","d":"2024-05-11","t":"สัมมาทิฏฐิ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 11 พ.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Jciq7dPpMV4","thMp3":"https://media.dhamma.com/pramote/cd/2567/670511.mp3","cnMp3":"https://media.dhamma.cn/b/b2/D24.39%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B45%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"0YHkzSckZqU","d":"2024-04-28","t":"รู้แจ้งแทงตลอดอริยสัจ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 28 เม.ย. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670428.mp3","cnMp3":"https://media.dhamma.cn/c/ca/D24.36%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B44%E6%9C%8828%E6%97%A5.mp3"},
    {"id":"wsxSks-ptI0","d":"2024-04-27","t":"27/04/2024 เราไม่ได้ภาวนาเพื่อสนองกิเลส (We did not practice meditation to cater to desires)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=uRqjkN7hnGs","thMp3":"https://media.dhamma.com/pramote/cd/2567/670427.mp3","cnMp3":"https://media.dhamma.cn/b/ba/D24.35%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B44%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"8RWG09W8L6U","d":"2024-04-21","t":"อุปาทาน 4 :: หลวงปู่ปราโมทย์ ปาโมชฺโช 21 เม.ย. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=aYYbYH9o4jI","thMp3":"https://media.dhamma.com/pramote/cd/2567/670421.mp3","cnMp3":"https://media.dhamma.cn/d/dc/D24.34%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B44%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"-YDFDuTuvng","d":"2024-04-20","t":"20/04/2024 ความอดทนในการภาวนา  (Patience in Practicing)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=rSTg74XNhBk","thMp3":"https://media.dhamma.com/pramote/cd/2567/670420.mp3","cnMp3":"https://media.dhamma.cn/a/a3/D24.33%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B44%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"595vJj_VYeE","d":"2024-04-14","t":"14/04/2024 เลิกหาความสุขแบบหมาขี้เรื้อน (Stop Seeking Happiness Like a Mangy Dog)","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670414.mp3","cnMp3":"https://media.dhamma.cn/2/2c/D24.32%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B44%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"MDLPPgTc1JI","d":"2024-04-06","t":"06/04/2024 เตรียมตัวตายอย่างคนมีปัญญา (Preparing for Death, Like those with Wisdom)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=xrtYwwHiWDQ","thMp3":"https://media.dhamma.com/pramote/cd/2567/670406B.mp3","cnMp3":"https://media.dhamma.cn/4/4a/D24.29%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B44%E6%9C%886%E6%97%A5.mp3"},
    {"id":"oUHbroKKsNo","d":"2024-03-31","t":"รู้ทันความปรุงแต่งจนหลุดพ้น :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 มี.ค. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=xRs_w_J-hOo","thMp3":"https://media.dhamma.com/pramote/cd/2567/670331.mp3","cnMp3":"https://media.dhamma.cn/a/a4/D24.28%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B43%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"SFVeie2PEzE","d":"2024-03-30","t":"การยกระดับความสุข :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 มี.ค. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670330.mp3","cnMp3":"https://media.dhamma.cn/8/86/D24.27%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B43%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"FbjEzAx1HgY","d":"2024-03-24","t":"24/03/2024 กฎแห่งกรรม (Law of Kamma)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=_rvNpFWjV8Q","thMp3":"https://media.dhamma.com/pramote/cd/2567/670324.mp3","cnMp3":"https://media.dhamma.cn/9/9e/D24.26%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B43%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"p3cRaDSY0dY","d":"2024-03-17","t":"วิธีปล่อยวาง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 17 มี.ค. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670317.mp3","cnMp3":"https://media.dhamma.cn/a/ae/D24.24%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B43%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"cjnvwW2OU2c","d":"2024-03-16","t":"ภาวนาเหมือนปลูกต้นไม้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 16 มี.ค. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670316.mp3","cnMp3":"https://media.dhamma.cn/6/68/D24.23%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B43%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"2fnp4xLM6f0","d":"2024-03-10","t":"10/03/2024 คอยรู้ทันความปรุงแต่ง (Be mindful of the mental formations)","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670310.mp3","cnMp3":"https://media.dhamma.cn/3/3b/D24.22%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B43%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"gBWtx2Mmmf0","d":"2024-03-06","t":"ธรรมะคือความจริง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 6 มี.ค. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670306.mp3","cnMp3":""},
    {"id":"9PxcO9sUH48","d":"2024-02-26","t":"การฝึกสติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 26 ก.พ. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670226.mp3","cnMp3":"https://media.dhamma.cn/d/d8/D24.18%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B42%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"VqC9u_tK4_U","d":"2024-02-19","t":"พระพุทธเจ้าให้รู้ทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 19 ก.พ. 2567","sp":"lp","cnYt":"https://www.youtube.com/watch?v=4cQw_lLZp6k","thMp3":"https://media.dhamma.com/pramote/cd/2567/670219.mp3","cnMp3":"https://media.dhamma.cn/4/40/%E3%80%8A%E4%BD%9B%E9%99%80%E6%95%99%E6%88%91%E4%BB%AC%E8%A6%81%E7%9F%A5%E8%8B%A6%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2024%E5%B9%B42%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"4s53SYEFZUk","d":"2024-02-18","t":"หลักสูตรการฝึกสติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 18 ก.พ. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670218.mp3","cnMp3":"https://media.dhamma.cn/d/d2/D24.15%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B42%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"Q9VDL2VrD8s","d":"2024-02-11","t":"11/02/2024 ฆราวาสธรรม (Dhamma for Laypeople)","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670211.mp3","cnMp3":"https://media.dhamma.cn/0/0d/D24.13%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B42%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"qw8X8DGYF3Q","d":"2024-02-10","t":"จิตที่เปิดรับธรรมะ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 10 ก.พ. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670210.mp3","cnMp3":"https://media.dhamma.cn/7/7e/D24.12%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B42%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"JkgkgXPHJEc","d":"2024-02-05","t":"อ่านจิตตัวเองได้จะเข้าใจจิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 5 ก.พ. 2567","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"1RFEJCS4E84","d":"2024-01-27","t":"27/01/2024 วิธีเข้าถึงความสงบอย่างแท้จริง (The way to reach an inner peace)","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670127.mp3","cnMp3":"https://media.dhamma.cn/b/b0/D24.8%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B41%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"B_n4lJUjP78","d":"2024-01-21","t":"การปฏิบัติเริ่มต้นที่จิตจบลงที่จิต :: หลวงปู่ปราโมทย์ ปาโมชฺโช 21 ม.ค. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670121.mp3","cnMp3":"https://media.dhamma.cn/4/49/D24.7%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B41%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"Egocz_zZlsE","d":"2024-01-20","t":"วิธีทดสอบเมื่อคิดว่าได้มรรคผล :: หลวงปู่ปราโมทย์ ปาโมชฺโช 20 ม.ค. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670120.mp3","cnMp3":"https://media.dhamma.cn/6/6c/D24.6%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B41%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"qdDkJko52Q8","d":"2024-01-13","t":"รู้ทุกข์ไว้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 ม.ค. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670113.mp3","cnMp3":"https://media.dhamma.cn/b/b7/D24.4%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B41%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"jYUO8NEiSqo","d":"2024-01-08","t":"08/01/2024 ทำบุญให้เป็น (The way to make merit)","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670108.mp3","cnMp3":""},
    {"id":"KB28CA0X-DY","d":"2024-01-07","t":"รูปนามคือตัวทุกข์ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 7 ม.ค. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670107.mp3","cnMp3":"https://media.dhamma.cn/f/f0/D24.3%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B41%E6%9C%887%E6%97%A5.mp3"},
    {"id":"yfKJXO3cpqM","d":"2024-01-07","t":"การวางจิตสำหรับคนทรงฌาน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 7 ม.ค. 2567","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2567/670107.mp3","cnMp3":"https://media.dhamma.cn/f/f0/D24.3%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2024%E5%B9%B41%E6%9C%887%E6%97%A5.mp3"},
    {"id":"1DyS9j67VeE","d":"2023-12-31","t":"ความว่างของธาตุทั้ง 6 :: หลวงปู่ปราโมทย์ ปาโมชฺโช 31 ธ.ค. 2566","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2566/661231.mp3","cnMp3":"https://media.dhamma.cn/3/3a/D23.99%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B412%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"tugYfco44-4","d":"2023-12-27","t":"บุคคลมาวัด 3 ประเภท :: หลวงปู่ปราโมทย์ ปาโมชฺโช 27 ธ.ค. 2566","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2566/661227.mp3","cnMp3":""},
    {"id":"WfKzjWNsFvo","d":"2023-12-17","t":"การปฏิบัติสู่อริยมรรคอริยผล :: หลวงปู่ปราโมทย์ ปาโมชฺโช 17 ธ.ค. 2566","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2566/661217.mp3","cnMp3":"https://media.dhamma.cn/4/4c/D23.95%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B412%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"BecxABd6lyo","d":"2023-12-03","t":"เดินทางเดียวไม่เหยียบรอยกัน ::  หลวงปู่ปราโมทย์ ปาโมชฺโช  3 ธ.ค. 2566","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2566/661203.mp3","cnMp3":"https://media.dhamma.cn/5/5f/D23.93%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B412%E6%9C%883%E6%97%A5.mp3"},
    {"id":"z2JfrGIo8bE","d":"2023-12-02","t":"การทำหน้าที่คือการปฏิบัติธรรม :: หลวงปู่ปราโมทย์ ปาโมชฺโช 2 ธ.ค. 2566","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2566/661202.mp3","cnMp3":"https://media.dhamma.cn/b/b5/D23.92%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B412%E6%9C%882%E6%97%A5.mp3"},
    {"id":"Yay9d1lMI40","d":"2023-11-18","t":"การปฏิบัติในชีวิตประจำวัน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 18 พ.ย. 2566","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2566/661118.mp3","cnMp3":"https://media.dhamma.cn/f/f7/D23.88%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B411%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"ScRjDO2PG2o","d":"2023-11-04","t":"บุพพภาคมรรค :: หลวงปู่ปราโมทย์ ปาโมชฺโช 4 พ.ย. 2566","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2566/661104.mp3","cnMp3":"https://media.dhamma.cn/b/b4/D23.84%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B411%E6%9C%884%E6%97%A5.mp3"},
    {"id":"E4rDWVJO2LM","d":"2023-10-24","t":"24/10/2023 ทุกอย่างเป็นของชั่วคราว (Everything is temporary)","sp":"lp","cnYt":"","thMp3":"https://media.dhamma.com/pramote/cd/2566/661024.mp3","cnMp3":""},
    {"id":"A29LewUB_3E","d":"2023-10-15","t":"ปรุงทีไรก็ทุกข์ทุกที :: หลวงปู่ปราโมทย์ ปาโมชฺโช 15 ตุลาคม 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/5/5b/D23.81%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B410%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"ZNVZ4GADGzU","d":"2023-10-14","t":"วิธีล้างความเห็นผิด :: หลวงปู่ปราโมทย์ ปาโมชฺโช 14 ต.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/d/de/D23.80%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B410%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"ZF4pevuT8Ug","d":"2023-10-13","t":"อ่านใจตัวเองให้ออก :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 ตุลาคม 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"RZ6BlXwf9u4","d":"2023-10-08","t":"08/10/2023 หลักการปฏิบัติ (Principles of practice)","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/c/c6/D23.79%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%B7%E8%80%81-2023%E5%B9%B410%E6%9C%888%E6%97%A5.mp3"},
    {"id":"ntnfVKqLppU","d":"2023-10-07","t":"ละความเห็นผิดแล้วจึงละความยึดถือ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 7 ต.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/d/da/D23.77%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%B7%E8%80%81-2023%E5%B9%B410%E6%9C%887%E6%97%A5.mp3"},
    {"id":"PmlHGL4V2bQ","d":"2023-10-01","t":"01/10/2023 ธรรม 10 ประการของนักปฏิบัติ (10 Qualities for Dhamma Apprenticeship)","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/5/51/D23.77%E3%80%8A%E5%9C%A8%E6%97%A5%E5%B8%B8%E7%9A%84%E7%94%9F%E6%B4%BB%E4%B8%AD%EF%BC%8C%E4%B9%9F%E6%9C%89%E5%BE%88%E5%A4%9A%E7%9A%84%E6%9C%BA%E4%BC%9A%E8%83%BD%E5%A4%9F%E4%BF%AE%E8%A1%8C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B410%E6%9C%881%E6%97%A5.mp3"},
    {"id":"wiNfrca2imw","d":"2023-09-30","t":"ความรู้สึกตัวเป็นเรื่องสำคัญ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 ก.ย. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/d/d9/D23.75%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B49%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"P1YjRPnboLM","d":"2023-09-30","t":"สัมมาสมาธิประกอบด้วยสติ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 ก.ย. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/d/d9/D23.75%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B49%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"eK4zdCfbA_0","d":"2023-09-23","t":"จิตเกิดดับสืบเนื่องกันอย่างรวดเร็ว ::  หลวงปู่ปราโมทย์ ปาโมชฺโช 23 ก.ย. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/e/ee/D23.73%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B49%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"W_SgpU_vuNU","d":"2023-09-23","t":"จิตที่ต้านรับธรรมะไม่ได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 23 ก.ย. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/e/ee/D23.73%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B49%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"WZdJNp00fp8","d":"2023-09-17","t":"วิมุตติเกิดเมื่อเห็นไตรลักษณ์มากพอ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 17 ก.ย. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/9/9d/D23.73%E3%80%8A%E4%B8%A4%E7%A7%8D%E4%B8%8D%E5%90%8C%E7%9A%84%E2%80%9C%E4%B8%AD%E7%AB%8B%E2%80%9D%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B49%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"EZgRD3nUqCE","d":"2023-09-10","t":"ธาตุ 6 :: หลวงปู่ปราโมทย์ ปาโมชฺโช 10 ก.ย. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/2/26/D23.70%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B49%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"9_QkgP1CLF8","d":"2023-09-09","t":"อ่านจิตตนเอง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 9 ก.ย. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/f/f6/D23.69%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B49%E6%9C%889%E6%97%A5.mp3"},
    {"id":"rZgmJ52UCN0","d":"2023-09-08","t":"ใจความทั้งหมดของพระพุทธศาสนา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 8 ก.ย. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/48/D23-%E4%B8%93%E5%9C%BA%E5%BC%80%E7%A4%BA%E3%80%8A%E6%B3%95%E4%B9%8B%E6%A0%B8%E5%BF%83%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B49%E6%9C%888%E6%97%A5.mp3"},
    {"id":"XU-KYAGTIa4","d":"2023-09-03","t":"สัมมาวายามะ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 3 กันยายน 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/9/9d/D23.68%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B49%E6%9C%883%E6%97%A5.mp3"},
    {"id":"4FXBSMRUsu0","d":"2023-09-02","t":"02/09/2023 เมื่อไรเห็นทุกข์จะวางทุกข์ (When you truely see suffereing, you then let go of it)","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/3/3c/D23.67%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B49%E6%9C%882%E6%97%A5.mp3"},
    {"id":"M2-SJjlO1RI","d":"2023-08-27","t":"ใช้จิตประภัสสรไปเจริญปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 27 สิงหาคม 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/1/18/D23.66%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B48%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"T60ZTUWCjrM","d":"2023-08-19","t":"อสุรกายเป็นที่พึ่งของเราไม่ได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 19 ส.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/2/2a/D23.63%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B48%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"YNUABYohgRQ","d":"2023-08-19","t":"พวกเล่นไสยศาสตร์สุดท้ายไม่มีดีสักคน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 19 ส.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/2/2a/D23.63%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B48%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"by3RQR7U-ro","d":"2023-08-13","t":"หน้าที่ของเราคือแหกคุกให้ได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 13 ส.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/b/bc/D23.61%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B48%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"AFtsB6-PQ_Y","d":"2023-08-11","t":"หลักของการเจริญปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 11 สิงหาคม 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"1Dxho5WwZ6c","d":"2023-08-06","t":"วิปัสสนาปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 6 ส.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/9/9b/D23.60%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B48%E6%9C%886%E6%97%A5.mp3"},
    {"id":"4uHBjlJam8c","d":"2023-08-01","t":"ธัมมจักกัปปวัตตนสูตร :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 ส.ค. 2566 (ช่วงเช้า)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"sgK2Zme9sK4","d":"2023-07-30","t":"จริตเพื่อการทำวิปัสสนา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 กรกฎาคม 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/d/de/D23.58%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B47%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"Ij1ssCshPWA","d":"2023-07-30","t":"อย่าดูถูกศีล :: หลวงปู่ปราโมทย์ ปาโมชฺโช 30 ก.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/d/de/D23.58%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B47%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"YfuvJ7SfOaw","d":"2023-07-16","t":"16/07/2023 วิ่งหาความสุข (Pursuit of Happiness)","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/1/19/D23.54%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B47%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"xjfJ_r9_G7c","d":"2023-07-16","t":"กิเลสก็เป็นครูของเราได้ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 16 ก.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/1/19/D23.54%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B47%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"SG1gwwE-J0U","d":"2023-07-15","t":"อย่าเอาแต่สะสมเสบียง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 15 ก.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/5/58/D23.53%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B47%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"2cjj7m_Bj0E","d":"2023-07-09","t":"รู้เข้ามาที่กายที่ใจของเรา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 9 กรกฎาคม 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/d/df/D23.52%E3%80%8A%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%B7%E8%80%81%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B47%E6%9C%889%E6%97%A5.mp3"},
    {"id":"Qrjp2WCgZR4","d":"2023-07-08","t":"เมื่อไรรู้เมื่อนั้นไม่หลง :: หลวงปู่ปราโมทย์ ปาโมชฺโช 8 ก.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"oUtur2cfNcc","d":"2023-07-02","t":"จะออกจากวัฏสงสารต้องเด็ดเดี่ยวอดทน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 2 กรกฎาคม 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/b/b0/D23.50%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B47%E6%9C%882%E6%97%A5.mp3"},
    {"id":"fYm4YUWZEss","d":"2023-07-01","t":"มรรค คือศีล สมาธิ ปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 กรกฎาคม 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/5/53/D23.49%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B47%E6%9C%881%E6%97%A5.mp3"},
    {"id":"11h1wvJd9lE","d":"2023-06-25","t":"เราจะควบคุมความโกรธอย่างไร :: หลวงปู่ปราโมทย์ ปาโมชฺโช 25 มิ.ย. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/9/9d/D23.48%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B46%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"8l-x2hxyTPY","d":"2023-06-24","t":"อย่าเป็นตุ่มรั่ว :: หลวงปู่ปราโมทย์ ปาโมชฺโช 24 มิถุนายน 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/d/d5/D23.47%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B46%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"qrl72VsRDrk","d":"2023-06-17","t":"เคล็ดวิชาการฝึกดูจิตดูใจตนเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 มิถุนายน 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/46/D23.45%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B46%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"8NlCYpOXtuY","d":"2023-06-11","t":"หลวงปู่ดูลย์สอนหลวงพ่อให้ดูจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 มิถุนายน 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/3/38/D23.44%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B46%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"LintZUMpdSY","d":"2023-06-05","t":"แก้ปัญหาที่สาเหตุ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 มิถุนายน 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"1TqoueyHb34","d":"2023-06-03","t":"แก่นกลางของการปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 3 มิถุนายน 2566 (ช่วงเช้า)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=_yuirFcYTBw","thMp3":"","cnMp3":"https://media.dhamma.cn/c/cc/D23.42%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B46%E6%9C%883%E6%97%A5.mp3"},
    {"id":"GuNPlijkzLU","d":"2023-05-20","t":"20/05/2023 ฝึกจนเป็นอัตโนมัติ (Practice until it becomes automatic)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=_ZSO42P93Uc","thMp3":"","cnMp3":"https://media.dhamma.cn/4/44/D23.40%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B45%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"qy6MPdFRXdQ","d":"2023-05-14","t":"ทำอย่างไรให้เมตตาออกมาจากใจจริงๆ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 พ.ค. 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=OieDm1rLJWE","thMp3":"","cnMp3":"https://media.dhamma.cn/3/31/E6.8%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B45%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"km8yzRTijCw","d":"2023-05-14","t":"บทเรียนชื่อจิตตสิกขา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 พฤษภาคม 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=OieDm1rLJWE","thMp3":"","cnMp3":"https://media.dhamma.cn/3/31/E6.8%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B45%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"y5bKtTYefYc","d":"2023-05-07","t":"วิธีทำความรู้สึกตัว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 พฤษภาคม 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=gLSJ9De-zJQ","thMp3":"","cnMp3":"https://media.dhamma.cn/e/ea/D23.37%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B45%E6%9C%887%E6%97%A5.MP3"},
    {"id":"VhOCV7y3nxI","d":"2023-05-06","t":"ฆราวาสมีหน้าที่ทั้งทางโลกทางธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 พฤษภาคม 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=bXL1HUx6j38","thMp3":"","cnMp3":"https://media.dhamma.cn/9/9d/D23.36%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B45%E6%9C%886%E6%97%A5.mp3"},
    {"id":"jqg0f5FJzAc","d":"2023-04-29","t":"29/04/2023 หมายรู้ให้ถูก (To know correctly)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=nIjQXlsu3kA","thMp3":"","cnMp3":"https://media.dhamma.cn/1/19/D23.34%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B44%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"f-QA1EuMqdQ","d":"2023-04-22","t":"จิตประภัสสร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 เมษายน 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/2/25/D23.32%E3%80%8A%E7%9F%A5%E8%80%85%E7%9A%84%E5%BF%83%E6%B8%85%E6%98%8E%E4%BD%86%E5%B9%B6%E4%B8%8D%E7%BA%AF%E5%87%80%E3%80%8B-%E9%9A%86%E5%B8%83%E5%B8%95%E9%BB%98%E9%95%BF%E8%80%81-2023%E5%B9%B44%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"MT9njj92FaI","d":"2023-04-16","t":"16/04/2023 ที่พักของจิต (The Mind’s Refuge)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ZAg3FlChpT8","thMp3":"","cnMp3":"https://media.dhamma.cn/8/81/D23.31%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B44%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"Dfx0cYjuY-4","d":"2023-04-09","t":"เส้นทางของคนจริง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 เมษายน 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=wxk42dWiJIU","thMp3":"","cnMp3":"https://media.dhamma.cn/c/c2/D23.29%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B44%E6%9C%889%E6%97%A5.mp3"},
    {"id":"NiXplk5cTD0","d":"2023-04-08","t":"หัวใจสำคัญของการปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 เมษายน 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=hM-TFpP8vMk","thMp3":"","cnMp3":"https://media.dhamma.cn/c/c9/D23.29%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B44%E6%9C%888%E6%97%A5.mp3"},
    {"id":"iLpYPrRhM-4","d":"2023-04-02","t":"จิตใจเราเปลี่ยนแปลงอยู่ตลอดเวลา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 2 เมษายน 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=8ftA5CEECzY","thMp3":"","cnMp3":"https://media.dhamma.cn/e/e8/D23.28%E3%80%8A%E8%8B%A6%E7%9A%84%E4%BA%A7%E7%94%9F%E5%88%B0%E8%8B%A6%E7%9A%84%E6%AD%A2%E6%81%AF%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B44%E6%9C%882%E6%97%A5.mp3"},
    {"id":"9rMvDAZeibg","d":"2023-04-01","t":"เพื่อนร่วมทางที่ดี :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 เมษายน 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ZS1IR5aeOVE","thMp3":"","cnMp3":"https://media.dhamma.cn/7/74/D23.27%E3%80%8A%E4%BF%AE%E8%A1%8C%E4%BB%A5%E5%90%8E%EF%BC%8C%E4%BD%A0%E7%9A%84%E7%83%A6%E6%81%BC%E4%B9%A0%E6%B0%94%E5%87%8F%E5%B0%91%E4%BA%86%E5%90%97%EF%BC%9F%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B44%E6%9C%881%E6%97%A5.mp3"},
    {"id":"GLv5Y9fv-TQ","d":"2023-03-18","t":"สติปัฏฐาน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 มีนาคม 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/af/D23.24%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B43%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"jdp5mLxJ7Zs","d":"2023-03-18","t":"เทวดาก็ยังมีความทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 มี.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/af/D23.24%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B43%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"6z8HfC7IQdM","d":"2023-03-05","t":"05/03/2023 จิตต้องมีกำลังของสมาธิ (The mind must possess the power of Samādhi)","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/d/dc/D23.19%E3%80%8A%E4%BF%AE%E8%A1%8C%E4%B8%89%E6%B3%95%EF%BC%9A%E6%8C%81%E6%88%92%E3%80%81%E5%9B%BA%E5%AE%9A%E7%BB%83%E4%B9%A0%E3%80%81%E5%9C%A8%E7%94%9F%E6%B4%BB%E4%B8%AD%E5%8F%91%E5%B1%95%E8%A7%89%E6%80%A7%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B43%E6%9C%885%E6%97%A5.mp3"},
    {"id":"8QL3EYiAsrQ","d":"2023-03-04","t":"สิ่งที่เรียกว่าทุกข์ก็คือขันธ์ 5 :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 มีนาคม 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/3/3e/D23.18%E3%80%8A%E8%A1%8C%E8%80%85%E5%A6%82%E4%BD%95%E2%80%9C%E7%94%B1%E5%87%A1%E5%85%A5%E5%9C%A3%E2%80%9D%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B43%E6%9C%884%E6%97%A5.mp3"},
    {"id":"O4oACbeOEnY","d":"2023-02-26","t":"ความเพียรชอบ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 กุมภาพันธ์ 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=bdFaGeEYRnM","thMp3":"","cnMp3":"https://media.dhamma.cn/c/cf/D23.16%E3%80%8A%E5%85%AB%E5%9C%A3%E9%81%93%E7%9A%84%E5%9B%A0%E4%B8%8E%E6%9E%9C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B42%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"FhBJY2nARig","d":"2023-02-25","t":"อุดมการณ์ของชาววัดสวนสันติธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 กุมภาพันธ์ 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/a0/D23.15%E3%80%8A%E5%BF%85%E9%A1%BB%E4%BB%A5%E5%AE%9E%E8%B7%B5%E7%A8%B3%E5%9B%BA%E4%BD%9B%E6%95%99%E4%BF%A1%E4%BB%B0%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B42%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"7O-rWhI76ec","d":"2023-02-25","t":"เห็นไตรลักษณ์วิเศษกว่าเห็นเทวดา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 ก.พ. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/a0/D23.15%E3%80%8A%E5%BF%85%E9%A1%BB%E4%BB%A5%E5%AE%9E%E8%B7%B5%E7%A8%B3%E5%9B%BA%E4%BD%9B%E6%95%99%E4%BF%A1%E4%BB%B0%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B42%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"xIPnRt9k_Qs","d":"2023-02-25","t":"คนที่ตายไปแล้วรับส่วนบุญของเราได้หรือไม่ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 ก.พ. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/a0/D23.15%E3%80%8A%E5%BF%85%E9%A1%BB%E4%BB%A5%E5%AE%9E%E8%B7%B5%E7%A8%B3%E5%9B%BA%E4%BD%9B%E6%95%99%E4%BF%A1%E4%BB%B0%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B42%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"UDIcb5FURU4","d":"2023-02-18","t":"อยากเป็นพระโสดาบัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 กุมภาพันธ์ 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=nqlF3pxHqQE","thMp3":"","cnMp3":"https://media.dhamma.cn/4/44/D23.13%E3%80%8A_%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B42%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"OFrJnALN0Xs","d":"2023-02-18","t":"แก่นของสมาธิ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ก.พ. 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=nqlF3pxHqQE","thMp3":"","cnMp3":"https://media.dhamma.cn/4/44/D23.13%E3%80%8A_%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B42%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"Zip5jUwBVCw","d":"2023-02-12","t":"จับหลักให้แม่น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 กุมภาพันธ์ 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ARHUrPZJvG4","thMp3":"","cnMp3":"https://media.dhamma.cn/0/0f/D23.12%E3%80%8A%E4%BF%AE%E8%A1%8C%EF%BC%8C%E7%9B%B4%E5%A5%91%E6%9C%AC%E8%B4%A8%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA-2023%E5%B9%B42%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"SkkSQjHCHPs","d":"2023-02-11","t":"คอยรู้เท่าทันความคิดของตัวเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 กุมภาพันธ์ 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/d/d9/D23.11%E3%80%8A%E8%A7%89%E6%80%A7%E8%B4%AF%E7%A9%BF%E5%85%AB%E6%AD%A3%E9%81%93%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA-2023%E5%B9%B42%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"mGSXgll_fGE","d":"2023-02-05","t":"ต่างเส้นทางตามจริตนิสัยสู่จุดหมายเดียว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 ก.พ. 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=AgWlnCXPrm4","thMp3":"","cnMp3":"https://media.dhamma.cn/b/bd/D23.10%E3%80%8A%E5%AF%B9%E8%8B%A6%E7%9A%84%E8%81%8C%E8%B4%A3%E6%98%AF%E2%80%9C%E7%9F%A5%E9%81%93%E2%80%9D%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B42%E6%9C%885%E6%97%A5.mp3"},
    {"id":"CHMeDmnI2yI","d":"2023-02-04","t":"GPS เส้นทางการปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 กุมภาพันธ์ 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=VNr9OVOHvn4","thMp3":"","cnMp3":"https://media.dhamma.cn/a/ae/D23.9%E3%80%8A%E5%A6%82%E4%BD%95%E8%AE%AD%E7%BB%83%E5%BF%83%E5%AE%89%E4%BD%8F%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA-2023%E5%B9%B42%E6%9C%884%E6%97%A5.mp3"},
    {"id":"BpTmluJ7sSk","d":"2023-01-29","t":"เราสามารถปฏิบัติธรรมได้ตลอดเวลา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 มกราคม 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=E7AhSwe4kuM","thMp3":"","cnMp3":"https://media.dhamma.cn/2/26/D23.8%E3%80%8A%E4%BC%9A%E7%94%A8%E5%BF%83%EF%BC%8C%E5%B0%B1%E8%83%BD%E4%B8%80%E7%9B%B4%E4%BF%AE%E8%A1%8C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA-2023%E5%B9%B41%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"ffcaFt7zPQQ","d":"2023-01-29","t":"หัดวางใจให้ถูก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 ม.ค. 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=E7AhSwe4kuM","thMp3":"","cnMp3":"https://media.dhamma.cn/2/26/D23.8%E3%80%8A%E4%BC%9A%E7%94%A8%E5%BF%83%EF%BC%8C%E5%B0%B1%E8%83%BD%E4%B8%80%E7%9B%B4%E4%BF%AE%E8%A1%8C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA-2023%E5%B9%B41%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"F4DlPfHlcQA","d":"2023-01-28","t":"กติกาการเผยแพร่ธรรมะของหลวงพ่อปราโมทย์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 ม.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/ad/D23.7%E3%80%8A%E5%9B%9B%E5%BF%B5%E5%A4%84%EF%BC%9A%E4%BB%8E%E5%85%A5%E9%97%A8%E5%88%B0%E7%B2%BE%E9%80%9A%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B41%E6%9C%8828%E6%97%A5.mp3"},
    {"id":"gDHqk3RnYpQ","d":"2023-01-28","t":"28/01/2023 ฝึกให้จิตมีแรงแล้วเดินปัญญา  (Train the mind to be powerful and then cultivate wisdom)","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/ad/D23.7%E3%80%8A%E5%9B%9B%E5%BF%B5%E5%A4%84%EF%BC%9A%E4%BB%8E%E5%85%A5%E9%97%A8%E5%88%B0%E7%B2%BE%E9%80%9A%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B41%E6%9C%8828%E6%97%A5.mp3"},
    {"id":"8MEEnPDmx34","d":"2023-01-15","t":"ประโยชน์ของสมาธิในทางโลก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 มกราคม 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/c/cf/D23.4%E3%80%8A%E7%A5%9E%E5%A5%87%E7%9A%84%E4%BD%9B%E6%B3%95%EF%BC%9A%E4%BB%8E%E9%86%92%E6%9D%A5%E5%88%B0%E8%A7%A3%E8%84%B1%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B41%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"-F4Rd3nJKYg","d":"2023-01-14","t":"อุบายฝึกจิตให้สงบ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 มกราคม 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/a4/D23.3%E3%80%8A%E7%A6%85%E5%AE%9A%E7%9A%84%E5%9B%A0%E5%92%8C%E6%9E%9C_%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B41%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"4g7EawxJ2AY","d":"2023-01-14","t":"ปรากฏการณ์ที่ไหลผ่านไป :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 ม.ค. 2566","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/a4/D23.3%E3%80%8A%E7%A6%85%E5%AE%9A%E7%9A%84%E5%9B%A0%E5%92%8C%E6%9E%9C_%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B41%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"sECrc7py_Vk","d":"2023-01-08","t":"ภาวนาไปตามลำดับ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 มกราคม 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ISUDWH68tJY","thMp3":"","cnMp3":"https://media.dhamma.cn/5/5b/D23.2%E3%80%8A%E4%BB%8E%E5%A7%8B%E8%87%B3%E7%BB%88%E7%9A%84%E5%AE%9E%E4%BF%AE%E6%8C%87%E5%BC%95%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B41%E6%9C%888%E6%97%A5.mp3"},
    {"id":"R3ZMnXhbK5Y","d":"2023-01-07","t":"07/01/2023 ทุกสิ่งเปลี่ยนแปลงตลอดเวลา (Everything is Changing All the Time)","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/2/2e/D23.2%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2023%E5%B9%B41%E6%9C%887%E6%97%A5.mp3"},
    {"id":"EgPBVN9_jN8","d":"2023-01-01","t":"ธรรมะช่วยเราได้สารพัด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 มกราคม 2566","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ZQJmm_ZhX1k","thMp3":"","cnMp3":"https://media.dhamma.cn/8/8c/D23.1%E3%80%8A%E6%9C%89%E5%9B%A0%E6%9C%89%E6%9E%9C%E5%9C%B0%E6%B4%BB%E5%9C%A8%E4%B8%96%E9%97%B4%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2023%E5%B9%B41%E6%9C%881%E6%97%A5.mp3"},
    {"id":"weBrpVTwfy8","d":"2022-12-31","t":"ปัญญาทำหน้าที่ล้างความเห็นผิด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ธันวาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=0JuELet9oeQ","thMp3":"","cnMp3":"https://media.dhamma.cn/d/d2/D22.110%E3%80%8A%E7%B4%AF%E7%A7%AF%E5%96%84%E6%B3%95%E6%98%AF%E6%9C%80%E5%A5%BD%E7%9A%84%E7%A5%9D%E7%A6%8F%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"Ovrp8kOAIiA","d":"2022-12-25","t":"ความไม่ทุกข์คือรางวัลอันยิ่งใหญ่ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 ธันวาคม 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/1/14/D22.109%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2022%E5%B9%B412%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"FFqDjREAbbE","d":"2022-12-23","t":"วิธีปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 ธันวาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=3a19StApVbk","thMp3":"","cnMp3":"https://media.dhamma.cn/5/5a/D22.108%E3%80%8A%E8%8B%A6%E5%AD%98%E5%9C%A8%EF%BC%8C%E7%A6%BB%E8%8B%A6%E4%B9%8B%E8%B7%AF%E4%B9%9F%E5%AD%98%E5%9C%A8%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"1gYb6WLSBUo","d":"2022-12-23","t":"วิธีการฝึกให้มีสติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 ธ.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=3a19StApVbk","thMp3":"","cnMp3":"https://media.dhamma.cn/5/5a/D22.108%E3%80%8A%E8%8B%A6%E5%AD%98%E5%9C%A8%EF%BC%8C%E7%A6%BB%E8%8B%A6%E4%B9%8B%E8%B7%AF%E4%B9%9F%E5%AD%98%E5%9C%A8%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"URVmH_tTums","d":"2022-12-23","t":"เหตุของความพ้นทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 ธ.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=3a19StApVbk","thMp3":"","cnMp3":"https://media.dhamma.cn/5/5a/D22.108%E3%80%8A%E8%8B%A6%E5%AD%98%E5%9C%A8%EF%BC%8C%E7%A6%BB%E8%8B%A6%E4%B9%8B%E8%B7%AF%E4%B9%9F%E5%AD%98%E5%9C%A8%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"vX5SiCWuWss","d":"2022-12-18","t":"ความเป็นปกติของจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ธันวาคม 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/0/0f/D22.107%E3%80%8A%E9%80%82%E5%90%88%E7%8E%B0%E4%BB%A3%E4%BA%BA%E7%9A%84%E7%A6%85%E5%AE%9A%E6%98%AF%E2%80%9C%E5%88%B9%E9%82%A3%E5%AE%9A%E2%80%9D%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"Bn2Nie6E0CI","d":"2022-12-18","t":"รู้ทันความโกรธแล้วทำไมไม่หายโกรธสักที :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ธ.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/0/0f/D22.107%E3%80%8A%E9%80%82%E5%90%88%E7%8E%B0%E4%BB%A3%E4%BA%BA%E7%9A%84%E7%A6%85%E5%AE%9A%E6%98%AF%E2%80%9C%E5%88%B9%E9%82%A3%E5%AE%9A%E2%80%9D%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"nha6sW0b9Tg","d":"2022-12-17","t":"หัดหมายรู้ให้ถูก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 ธ.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=mptvZOhXZUM","thMp3":"","cnMp3":"https://media.dhamma.cn/5/52/D22.106%E3%80%8A%E5%A6%82%E4%BD%95%E6%B8%85%E9%99%A4%E9%82%AA%E8%A7%81%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"hHNcZgHe4OU","d":"2022-12-17","t":"ล้างความเห็นผิด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 ธันวาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=mptvZOhXZUM","thMp3":"","cnMp3":"https://media.dhamma.cn/5/52/D22.106%E3%80%8A%E5%A6%82%E4%BD%95%E6%B8%85%E9%99%A4%E9%82%AA%E8%A7%81%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"ZNcxBd6lAMk","d":"2022-12-11","t":"ฝึกจิตให้มีกำลังตั้งมั่น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ธันวาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=_BpZXl9egoU","thMp3":"","cnMp3":"https://media.dhamma.cn/9/9d/D22.105%E3%80%8A%E8%B6%85%E8%BF%87%E2%80%9C%E7%9C%8B%E8%A7%81%E2%80%9D%E5%B0%B1%E4%B8%8D%E6%98%AF%E6%AF%97%E9%92%B5%E8%88%8D%E9%82%A3%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"lJVSPIylxUQ","d":"2022-12-11","t":"วิปัสสนาไม่มีการแก้อารมณ์ : หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ธ.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=_BpZXl9egoU","thMp3":"","cnMp3":"https://media.dhamma.cn/9/9d/D22.105%E3%80%8A%E8%B6%85%E8%BF%87%E2%80%9C%E7%9C%8B%E8%A7%81%E2%80%9D%E5%B0%B1%E4%B8%8D%E6%98%AF%E6%AF%97%E9%92%B5%E8%88%8D%E9%82%A3%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"urGKBdP-jMY","d":"2022-12-11","t":"เราต้องซ้อมรบ : หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ธ.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=_BpZXl9egoU","thMp3":"","cnMp3":"https://media.dhamma.cn/9/9d/D22.105%E3%80%8A%E8%B6%85%E8%BF%87%E2%80%9C%E7%9C%8B%E8%A7%81%E2%80%9D%E5%B0%B1%E4%B8%8D%E6%98%AF%E6%AF%97%E9%92%B5%E8%88%8D%E9%82%A3%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"Dmk4Yp3nH20","d":"2022-12-10","t":"สิ่งที่เราต้องทำ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 ธันวาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=chgHN7803tU","thMp3":"","cnMp3":"https://media.dhamma.cn/8/8e/D22.104%E3%80%8A%E6%AD%A3%E8%A7%A3%E8%84%B1%E4%B8%8E%E9%82%AA%E8%A7%A3%E8%84%B1%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"E7zZpf75_uo","d":"2022-12-10","t":"เป็นตัวอย่างที่ดีให้ลูกหลาน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 ธ.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=chgHN7803tU","thMp3":"","cnMp3":"https://media.dhamma.cn/8/8e/D22.104%E3%80%8A%E6%AD%A3%E8%A7%A3%E8%84%B1%E4%B8%8E%E9%82%AA%E8%A7%A3%E8%84%B1%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"BWMZszIVP9A","d":"2022-12-04","t":"ความรู้สึกตัวสำคัญที่สุด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 ธันวาคม 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/4a/D22.102%E3%80%8A%E8%A7%89%E7%9F%A5%E8%87%AA%E5%B7%B1%E6%98%AF%E4%BF%AE%E8%A1%8C%E7%9A%84%E8%B5%B7%E7%82%B9%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%884%E6%97%A5.mp3"},
    {"id":"NY62EpzKHVk","d":"2022-12-03","t":"คำสอนหลวงปู่ดูลย์ อตุโล :: หลวงพ่อปราโมทย์ ปาโมชฺโช 3 ธันวาคม 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/6/6d/D22.101%E3%80%8A%E9%9A%86%E5%B8%83%E6%95%A6%E9%95%BF%E8%80%81%E7%9A%84%E6%95%99%E5%AF%BC%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%883%E6%97%A5.mp3"},
    {"id":"b0fkROQ_C34","d":"2022-12-03","t":"เราต้องทำในรูปแบบทุกวัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 3 ธ.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/6/6d/D22.101%E3%80%8A%E9%9A%86%E5%B8%83%E6%95%A6%E9%95%BF%E8%80%81%E7%9A%84%E6%95%99%E5%AF%BC%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B412%E6%9C%883%E6%97%A5.mp3"},
    {"id":"adCBzsQAlAE","d":"2022-11-27","t":"ฝึกจิตเพื่ออนาคตที่สดใส :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 พฤศจิกายน 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=kr_-HLtB84M","thMp3":"","cnMp3":"https://media.dhamma.cn/c/c2/D22.100%E3%80%8A%E8%AE%A9%E2%80%9C%E4%B8%9A%E5%A4%84%E2%80%9D%E6%88%90%E4%B8%BA%E6%88%91%E4%BB%AC%E7%94%9F%E5%91%BD%E4%B8%AD%E7%9A%84%E4%BC%B4%E4%BE%A3%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B411%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"k5yiHn7lpf4","d":"2022-11-26","t":"เราต้องสู้กับตัณหาให้ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 พฤศจิกายน 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/7/76/D22.99%E3%80%8A%E8%AE%AD%E7%BB%83%E5%8E%BB%E5%8F%8A%E6%97%B6%E5%9C%B0%E7%9F%A5%E9%81%93%E8%87%AA%E5%B7%B1%E7%9A%84%E5%BF%83%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B411%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"wuNn6vZD5ZM","d":"2022-11-26","t":"สติเป็นตัวรู้ทัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 พ.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/7/76/D22.99%E3%80%8A%E8%AE%AD%E7%BB%83%E5%8E%BB%E5%8F%8A%E6%97%B6%E5%9C%B0%E7%9F%A5%E9%81%93%E8%87%AA%E5%B7%B1%E7%9A%84%E5%BF%83%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B411%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"daOyCXOLS9c","d":"2022-11-26","t":"กลัวตายมากต้องทำอย่างไร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 พ.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/7/76/D22.99%E3%80%8A%E8%AE%AD%E7%BB%83%E5%8E%BB%E5%8F%8A%E6%97%B6%E5%9C%B0%E7%9F%A5%E9%81%93%E8%87%AA%E5%B7%B1%E7%9A%84%E5%BF%83%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B411%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"w8kPAZ5YWPg","d":"2022-11-13","t":"หลักของการปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 พฤศจิกายน 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=LFye1feB6eA","thMp3":"","cnMp3":"https://media.dhamma.cn/b/b9/D22.96%E3%80%8A%E4%BF%AE%E8%A1%8C%E5%85%A8%E8%B2%8C%E5%9B%BE%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B411%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"QMO74QI3j9w","d":"2022-11-12","t":"รู้สภาวะที่เรารู้ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 พฤศจิกายน 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=l51ggE1voyw","thMp3":"","cnMp3":"https://media.dhamma.cn/e/ed/D22.95%E3%80%8A%E4%BF%AE%E8%A1%8C%E8%87%B3%E4%B8%AD%E7%AB%8B%EF%BC%8C%E6%8B%94%E9%99%A4%E5%AF%B9%E4%B8%96%E9%97%B4%E7%9A%84%E8%B4%AA%E4%B8%8E%E5%BF%A7%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B411%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"M9V6HFONW88","d":"2022-11-05","t":"ปล่อยวางจิตได้เพราะเข้าใจทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 พ.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/c/ca/D22.93%E3%80%8A%E7%9F%A5%E8%8B%A6%E6%98%AF%E4%B8%BA%E4%BA%86%E7%A6%BB%E8%8B%A6%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B411%E6%9C%8805%E6%97%A5.mp3"},
    {"id":"S3Qu6IhqRMg","d":"2022-10-30","t":"สันตติขาด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 ตุลาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=kxkPSxvUYAc","thMp3":"","cnMp3":"https://media.dhamma.cn/d/d4/D22.92%E3%80%8A%E7%9C%9F%E6%AD%A3%E7%9A%84%E6%B3%95%E4%BB%8E%E6%9C%AA%E9%80%80%E5%A4%B1%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B410%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"LY_veDIsZmw","d":"2022-10-29","t":"ปฏิบัติธรรมให้สมควรแก่ธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 ตุลาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=SCTmHRoQ-w8","thMp3":"","cnMp3":"https://media.dhamma.cn/8/85/D22.91%E3%80%8A%E5%8E%BB%E6%84%9F%E8%A7%89%E8%BA%AB%E5%BF%83%E7%9A%84%E5%AD%98%E5%9C%A8%E4%B8%8E%E5%8F%98%E5%8C%96%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B410%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"M4-MuL66vvY","d":"2022-10-23","t":"อดทนให้เด็ดเดี่ยวลงไป :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 ตุลาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=nvPdjbuT09o","thMp3":"","cnMp3":"https://media.dhamma.cn/b/b0/D22.90%E3%80%8A%E5%AF%B9%E4%BA%8E%E8%BA%AB%E4%BD%93%E5%92%8C%E5%BF%83%E7%9A%84%E5%9B%B0%E9%9A%BE%E8%A6%81%E5%BF%8D%E8%80%90%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B410%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"4K8UPIFzXfY","d":"2022-10-16","t":"ทำบุญให้เกิดกุศล :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ตุลาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=XhNHG6pDPqE","thMp3":"","cnMp3":"https://media.dhamma.cn/3/32/D22.88%E3%80%8A%E7%B4%AF%E7%A7%AF%E6%AD%A3%E7%A1%AE%E7%9A%84%E9%A2%86%E6%82%9F%E5%92%8C%E6%98%8E%E7%99%BD%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B410%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"tPbJH0Sf7gs","d":"2022-10-16","t":"รู้จักรักษาบุญที่ทำแล้ว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ต.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=XhNHG6pDPqE","thMp3":"","cnMp3":"https://media.dhamma.cn/3/32/D22.88%E3%80%8A%E7%B4%AF%E7%A7%AF%E6%AD%A3%E7%A1%AE%E7%9A%84%E9%A2%86%E6%82%9F%E5%92%8C%E6%98%8E%E7%99%BD%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B410%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"z4pID2tytGs","d":"2022-10-15","t":"บุญกิริยาวัตถุ 10 :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 ตุลาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=9A--NtUubY8","thMp3":"","cnMp3":"https://media.dhamma.cn/d/d3/D22.87%E3%80%8A%E5%8A%9F%E5%BE%B7%E7%9A%84%E7%9C%9F%E6%84%8F%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B410%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"RWSgJOTo6k0","d":"2022-10-15","t":"ภาวนาให้เป็น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 ต.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=9A--NtUubY8","thMp3":"","cnMp3":"https://media.dhamma.cn/d/d3/D22.87%E3%80%8A%E5%8A%9F%E5%BE%B7%E7%9A%84%E7%9C%9F%E6%84%8F%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B410%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"wo08P_Q9viI","d":"2022-10-09","t":"ขันธ์ 5 เป็นที่รองรับความทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 ตุลาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=qBmKpZbgzcI","thMp3":"","cnMp3":"https://media.dhamma.cn/b/b4/D22.86%E3%80%8A%E4%BA%94%E8%95%B4%E6%98%AF%E8%B4%9F%E6%8B%85%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B410%E6%9C%889%E6%97%A5.mp3"},
    {"id":"TYqklx8mxZk","d":"2022-10-08","t":"หลักสูตรสู่มรรคผลนิพพาน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 ตุลาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=M4kabLpIU3s","thMp3":"","cnMp3":""},
    {"id":"rwI2yOBFK8s","d":"2022-10-08","t":"ทำฆนะให้แตก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 ต.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=M4kabLpIU3s","thMp3":"","cnMp3":""},
    {"id":"zpNd73JcHNU","d":"2022-10-02","t":"รีบภาวนาเข้า :: หลวงพ่อปราโมทย์ ปาโมชฺโช 2 ต.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=sst5r2-yrdM","thMp3":"","cnMp3":"https://media.dhamma.cn/a/ad/D22.84-E5.5%E3%80%8A%E5%A2%83%E7%95%8C%E7%9A%84%E2%80%9C%E7%89%B9%E7%9B%B8%E2%80%9D%E4%B8%8E%E2%80%9C%E5%85%B1%E7%9B%B8%E2%80%9D%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B410%E6%9C%882%E6%97%A5.mp3"},
    {"id":"7qBXkpbQBoI","d":"2022-10-01","t":"วิธีพ้นจากความปรุงแต่ง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 ตุลาคม 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=F0Zd7iNPSGo","thMp3":"","cnMp3":"https://media.dhamma.cn/5/5d/D22.83-E5.3%E3%80%8A%E4%BD%9B%E6%95%99%E6%98%AF%E6%9C%89%E6%89%80%E4%B8%BA%E7%9A%84%E5%AE%97%E6%95%99%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B410%E6%9C%881%E6%97%A5.mp3"},
    {"id":"4cfbQcTunGc","d":"2022-10-01","t":"จิตเหมือนหม้อที่มีน้ำมันอยู่เต็มหม้อ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 ต.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=F0Zd7iNPSGo","thMp3":"","cnMp3":"https://media.dhamma.cn/5/5d/D22.83-E5.3%E3%80%8A%E4%BD%9B%E6%95%99%E6%98%AF%E6%9C%89%E6%89%80%E4%B8%BA%E7%9A%84%E5%AE%97%E6%95%99%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B410%E6%9C%881%E6%97%A5.mp3"},
    {"id":"mPykiUBykwc","d":"2022-09-25","t":"ธรรมะมีหลายระดับ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 กันยายน 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=bPIxWHUzfdg","thMp3":"","cnMp3":"https://media.dhamma.cn/8/89/D22.81%E3%80%8A%E5%87%BA%E4%B8%96%E4%BF%AE%E5%9B%9B%E8%B0%9B%EF%BC%8C%E5%85%A5%E4%B8%96%E7%A7%AF%E6%88%92%E5%BE%B7%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B49%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"zcF8Ic7Ilzg","d":"2022-09-24","t":"วิธีฝึกสติปัฏฐาน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 กันยายน 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/f/f0/D22.80%E3%80%8A%E7%94%A8%E5%B9%B3%E5%B8%B8%E5%BF%83%E5%8E%BB%E7%9F%A5%E9%81%93%E5%9B%9B%E5%BF%B5%E5%A4%84%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B49%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"-1HSiO_jC_M","d":"2022-09-17","t":"อุบายของครูบาอาจารย์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 กันยายน 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=jSdoDvY1IIY","thMp3":"","cnMp3":"https://media.dhamma.cn/a/a6/D22.78%E3%80%8A%E5%90%AC%E6%B3%95%E4%B9%8B%E5%90%8E%E5%8E%BB%E5%AE%9E%E8%B7%B5%EF%BC%8C%E6%89%8D%E4%BC%9A%E7%9C%9F%E6%AD%A3%E6%98%8E%E7%99%BD%E6%B3%95%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B49%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"mRTs5YO6S8c","d":"2022-09-17","t":"ทำอย่างไรจึงจะละความเป็นเราของจิตได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 ก.ย. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=jSdoDvY1IIY","thMp3":"","cnMp3":"https://media.dhamma.cn/a/a6/D22.78%E3%80%8A%E5%90%AC%E6%B3%95%E4%B9%8B%E5%90%8E%E5%8E%BB%E5%AE%9E%E8%B7%B5%EF%BC%8C%E6%89%8D%E4%BC%9A%E7%9C%9F%E6%AD%A3%E6%98%8E%E7%99%BD%E6%B3%95%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B49%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"MpVKONHyOaI","d":"2022-09-17","t":"เห็นทุกอย่างเท่าเทียมกันจิตจึงไม่แทรกแซง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 ก.ย. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=jSdoDvY1IIY","thMp3":"","cnMp3":"https://media.dhamma.cn/a/a6/D22.78%E3%80%8A%E5%90%AC%E6%B3%95%E4%B9%8B%E5%90%8E%E5%8E%BB%E5%AE%9E%E8%B7%B5%EF%BC%8C%E6%89%8D%E4%BC%9A%E7%9C%9F%E6%AD%A3%E6%98%8E%E7%99%BD%E6%B3%95%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B49%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"s58A3nffKeA","d":"2022-09-11","t":"ความอยากเป็นเจ้านายตัวร้ายกาจ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 กันยายน 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=hp-f10uHVDc","thMp3":"","cnMp3":"https://media.dhamma.cn/b/bb/D22.77%E3%80%8A%E4%BD%95%E6%97%B6%E6%9C%89%E6%83%B3%E8%A6%81%EF%BC%8C%E4%BD%95%E6%97%B6%E5%B0%B1%E6%9C%89%E8%8B%A6%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B49%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"AN_3Qj31dbM","d":"2022-09-10","t":"แหวกวงล้อมของมารออกไปให้ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 ก.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/5/52/D22.76%E3%80%8A%E4%B8%9A%E5%A4%84%E7%9A%84%E6%A0%B8%E5%BF%83%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B49%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"QDKbIAGITl4","d":"2022-09-10","t":"งานพัฒนาจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 กันยายน 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/5/52/D22.76%E3%80%8A%E4%B8%9A%E5%A4%84%E7%9A%84%E6%A0%B8%E5%BF%83%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B49%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"73vl6EKaprM","d":"2022-09-04","t":"ดับทุกข์ที่ตัวเหตุ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 กันยายน 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Ocy0KVixasY","thMp3":"","cnMp3":""},
    {"id":"MKMVPORXScM","d":"2022-09-04","t":"ชาวพุทธแก้ที่ต้นเหตุ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 ก.ย. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=Ocy0KVixasY","thMp3":"","cnMp3":""},
    {"id":"HIXxmLfUIzo","d":"2022-08-28","t":"รู้จักคำว่าหยุดเสียบ้าง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 ส.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=QnCmwmVCmxY","thMp3":"","cnMp3":"https://media.dhamma.cn/6/60/D22.74%E3%80%8A%E8%A6%81%E6%87%82%E5%BE%97%E2%80%9C%E5%81%9C%E4%B8%8B%E6%9D%A5%E2%80%9D_%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%8828%E6%97%A5.mp3"},
    {"id":"TeXrMa3aAQA","d":"2022-08-28","t":"วิธีแก้ปัญหาในชีวิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 ส.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=QnCmwmVCmxY","thMp3":"","cnMp3":"https://media.dhamma.cn/6/60/D22.74%E3%80%8A%E8%A6%81%E6%87%82%E5%BE%97%E2%80%9C%E5%81%9C%E4%B8%8B%E6%9D%A5%E2%80%9D_%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%8828%E6%97%A5.mp3"},
    {"id":"d6CjJxsr1Rk","d":"2022-08-27","t":"การสุ่มตัวอย่างมาเรียน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 ส.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=BaStdA-5qjw","thMp3":"","cnMp3":"https://media.dhamma.cn/f/f2/D22.73%E3%80%8A%E5%9B%9B%E5%BF%B5%E5%A4%84%E7%9A%84%E6%8A%BD%E6%A0%B7%E5%AD%A6%E4%B9%A0%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"0Aylvw8LB7M","d":"2022-08-21","t":"ทำบุญอย่างไรให้เกิดประโยชน์สูงสุด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 ส.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=GmJjEOXhgvA","thMp3":"","cnMp3":"https://media.dhamma.cn/2/2e/D22.72%E3%80%8A%E5%A6%82%E4%BD%95%E5%AF%B9%E8%87%AA%E5%B7%B1%E6%85%88%E6%82%B2%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"T7cux6t6tcE","d":"2022-08-21","t":"กระบวนการล้างกิเลส :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 ส.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=GmJjEOXhgvA","thMp3":"","cnMp3":"https://media.dhamma.cn/2/2e/D22.72%E3%80%8A%E5%A6%82%E4%BD%95%E5%AF%B9%E8%87%AA%E5%B7%B1%E6%85%88%E6%82%B2%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"dju_7xIprxY","d":"2022-08-20","t":"กรรมวาที กิริยวาที วิริยวาที :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 ส.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ac7MDRjH3nk","thMp3":"","cnMp3":"https://media.dhamma.cn/1/13/D22.71%E3%80%8A%E5%94%A4%E9%86%92%E5%BF%83%E4%B8%AD%E7%9A%84%E4%BD%9B%E9%99%80%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"JHn93VGb8bs","d":"2022-08-20","t":"สมาธิต้องประกอบด้วยสติเสมอ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 ส.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=ac7MDRjH3nk","thMp3":"","cnMp3":"https://media.dhamma.cn/1/13/D22.71%E3%80%8A%E5%94%A4%E9%86%92%E5%BF%83%E4%B8%AD%E7%9A%84%E4%BD%9B%E9%99%80%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"75ElWfMSdJU","d":"2022-08-14","t":"ใจที่อยากพ้นโลกจะมีความพากเพียร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 ส.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=PDMpvCRe2pw","thMp3":"","cnMp3":"https://media.dhamma.cn/7/7b/D22.70%E3%80%8A%E4%BD%A0%E6%98%AF%E6%83%B3%E8%A6%81%E7%A6%BB%E8%8B%A6%EF%BC%8C%E8%BF%98%E6%98%AF%E6%83%B3%E8%A6%81%E5%BF%AB%E4%B9%90%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"Wxy8yLt6dLo","d":"2022-08-14","t":"จิตถูกขังอยู่ในคุกที่มองไม่เห็น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 ส.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=PDMpvCRe2pw","thMp3":"","cnMp3":"https://media.dhamma.cn/7/7b/D22.70%E3%80%8A%E4%BD%A0%E6%98%AF%E6%83%B3%E8%A6%81%E7%A6%BB%E8%8B%A6%EF%BC%8C%E8%BF%98%E6%98%AF%E6%83%B3%E8%A6%81%E5%BF%AB%E4%B9%90%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%8814%E6%97%A5.mp3"},
    {"id":"VQZSorKzhWE","d":"2022-08-13","t":"13/08/2022 อยากได้ความสุขหรืออยากพ้นทุกข์ (What is your Life Purpose - Happiness or Liberation?)","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/f/fc/D22.69%E3%80%8A%E6%9C%80%E7%BB%9D%E9%A1%B6%E7%9A%84%E6%88%98%E8%83%9C%E5%B0%B1%E6%98%AF%E6%88%98%E8%83%9C%E8%87%AA%E6%88%91%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"O_fcAWE3_UM","d":"2022-08-13","t":"ร่างกายเหมือนเครื่องจักรตัวหนึ่งเท่านั้นเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 ส.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/f/fc/D22.69%E3%80%8A%E6%9C%80%E7%BB%9D%E9%A1%B6%E7%9A%84%E6%88%98%E8%83%9C%E5%B0%B1%E6%98%AF%E6%88%98%E8%83%9C%E8%87%AA%E6%88%91%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"NnHjpiaEmHg","d":"2022-08-07","t":"มีสติไปจนนาทีสุดท้ายของชีวิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 ส.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=58FwS7CWSOk","thMp3":"","cnMp3":"https://media.dhamma.cn/9/94/D22.68%E3%80%8A%E5%AD%A6%E4%B9%A0%E8%BF%87%E5%8E%BB%EF%BC%8C%E8%AE%A1%E5%88%92%E6%9C%AA%E6%9D%A5%EF%BC%8C%E6%B4%BB%E5%9C%A8%E5%BD%93%E4%B8%8B%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%887%E6%97%A5.mp3"},
    {"id":"R6eOf0TYlo8","d":"2022-08-07","t":"ขาดสติเมื่อไรก็คือประมาทเมื่อนั้น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 ส.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=58FwS7CWSOk","thMp3":"","cnMp3":"https://media.dhamma.cn/9/94/D22.68%E3%80%8A%E5%AD%A6%E4%B9%A0%E8%BF%87%E5%8E%BB%EF%BC%8C%E8%AE%A1%E5%88%92%E6%9C%AA%E6%9D%A5%EF%BC%8C%E6%B4%BB%E5%9C%A8%E5%BD%93%E4%B8%8B%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%887%E6%97%A5.mp3"},
    {"id":"SFwGcDtH7_E","d":"2022-08-06","t":"ผู้มีปัญญามีพระรัตนตรัยเป็นที่พึ่ง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 ส.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=4SImBgLYc80","thMp3":"","cnMp3":"https://media.dhamma.cn/d/d5/D22.67%E3%80%8A%E5%96%84%E7%94%A8%E4%B8%96%E9%97%B4%E6%B3%95%E6%9D%A5%E6%88%90%E5%B0%B1%E5%87%BA%E4%B8%96%E9%97%B4%E6%B3%95%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B48%E6%9C%886%E6%97%A5.mp3"},
    {"id":"pGTjhPhAik8","d":"2022-07-31","t":"ทำหน้าที่ทางโลกดีจะหนุนทางธรรมให้เจริญ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ก.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=XgS7G-IW52s","thMp3":"","cnMp3":"https://media.dhamma.cn/7/78/D22.66%E3%80%8A%E5%9C%A8%E5%AE%B6%E4%BA%BA%E4%BF%AE%E8%A1%8C%E7%9A%84%E2%80%9D%E5%BA%A6%E2%80%9C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%8831%E6%97%A5.mp3"},
    {"id":"WeMGdFaL18A","d":"2022-07-30","t":"จิตคือละครโรงใหญ่ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 ก.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=o9g42KVRnqs","thMp3":"","cnMp3":"https://media.dhamma.cn/a/a4/D22.65%E3%80%8A%E5%BF%83%E7%9A%84%E6%88%8F%E5%89%A7%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"dKAusGTtbNQ","d":"2022-07-30","t":"ศัตรูเบอร์หนึ่งของการปฏิบัติคือใจลอย :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 ก.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=o9g42KVRnqs","thMp3":"","cnMp3":"https://media.dhamma.cn/a/a4/D22.65%E3%80%8A%E5%BF%83%E7%9A%84%E6%88%8F%E5%89%A7%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"-8ytgcnwe24","d":"2022-07-24","t":"24/07/2022 โลกเหมือนงูพิษ (The World is like a Poisonous Snake)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=p0lz_nPAig4","thMp3":"","cnMp3":"https://media.dhamma.cn/d/dd/D22.64%E3%80%8A%E4%BF%AE%E4%B9%A0%E5%A5%A2%E6%91%A9%E4%BB%96%E7%9A%84%E8%AF%80%E7%AA%8D%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"SpQmMQo36u4","d":"2022-07-24","t":"อัตราเร่งในการปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 ก.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=p0lz_nPAig4","thMp3":"","cnMp3":"https://media.dhamma.cn/d/dd/D22.64%E3%80%8A%E4%BF%AE%E4%B9%A0%E5%A5%A2%E6%91%A9%E4%BB%96%E7%9A%84%E8%AF%80%E7%AA%8D%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"CeO995rMsCs","d":"2022-07-23","t":"มีปัญญารู้ทุกข์จะละกามได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 ก.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=tjQ4LqBys2w","thMp3":"","cnMp3":"https://media.dhamma.cn/d/d8/D22.63%E3%80%8A%E4%BB%8E%E8%B5%B7%E7%82%B9%E5%88%B0%E7%BB%88%E7%82%B9%E7%9A%84%E6%B3%95%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"Q0o5Qc5Rm9o","d":"2022-07-17","t":"สติ สมาธิ ปัญญาอัตโนมัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 ก.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/1/10/D22.62%E3%80%8A%E6%83%B3%E4%BB%80%E4%B9%88%E4%B8%8D%E9%87%8D%E8%A6%81%EF%BC%8C%E9%87%8D%E8%A6%81%E7%9A%84%E6%98%AF%E7%9F%A5%E9%81%93%E5%BF%83%E5%9C%A8%E6%83%B3%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"icELwQVCpXM","d":"2022-07-17","t":"อย่าไปพยายามทำจิตให้ว่าง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 ก.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/1/10/D22.62%E3%80%8A%E6%83%B3%E4%BB%80%E4%B9%88%E4%B8%8D%E9%87%8D%E8%A6%81%EF%BC%8C%E9%87%8D%E8%A6%81%E7%9A%84%E6%98%AF%E7%9F%A5%E9%81%93%E5%BF%83%E5%9C%A8%E6%83%B3%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"aPwnplWbyYg","d":"2022-07-16","t":"จิตไม่ใช่เรา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ก.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=d11a94_pTZs","thMp3":"","cnMp3":"https://media.dhamma.cn/1/1a/D22.61%E3%80%8A%E5%86%85%E5%9C%A8%E4%B8%8E%E5%A4%96%E5%9C%A8%E7%9A%84%E4%B8%96%E9%97%B4%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"FvRB6K4lin8","d":"2022-07-13","t":"โยนิโสมนสิการสำคัญมาก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 ก.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/8/80/D22.60%E3%80%8A%E8%AE%AD%E7%BB%83%E4%BB%8E%E4%B8%89%E6%B3%95%E5%8D%B0%E7%9A%84%E8%A7%92%E5%BA%A6%E5%8E%BB%E8%A7%82%E8%BA%AB%E5%BF%83%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"XqKvS4EcjuI","d":"2022-07-10","t":"10/07/2022 ความสุขในโลกเป็นน้ำตาลเคลือบยาพิษ (Worldly Happiness is Sugar-Coated Suffering)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=5kXYnf1rzzc","thMp3":"","cnMp3":"https://media.dhamma.cn/7/77/D22.59%E3%80%8A%E4%BA%94%E6%AC%B2%E7%9A%84%E5%BF%AB%E4%B9%90%EF%BC%8C%E5%A6%82%E5%90%8C%E5%8C%85%E8%A3%B9%E7%9D%80%E7%B3%96%E8%A1%A3%E7%9A%84%E6%AF%92%E8%8D%AF%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"CcHW7lF4sAQ","d":"2022-07-09","t":"เดินจิตในทางสายกลาง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 ก.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/d/d7/D22.58%E3%80%8A%E6%9C%89%E8%A7%89%E6%80%A7%E7%9F%A5%E9%81%93%E5%BF%83%EF%BC%8C%E5%85%AB%E6%94%AF%E5%9C%A3%E9%81%93%E5%B0%B1%E4%BC%9A%E5%BF%AB%E9%80%9F%E6%8F%90%E5%8D%87%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%889%E6%97%A5.mp3"},
    {"id":"sN4RjJz8r-c","d":"2022-07-03","t":"มงคลชีวิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 3 ก.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=yvAWvAqFxpM","thMp3":"","cnMp3":"https://media.dhamma.cn/d/da/D22.57%E3%80%8A%E5%88%AB%E6%89%94%E6%8E%89%E6%9C%80%E6%9C%89%E4%BB%B7%E5%80%BC%E7%9A%84%E5%BD%93%E4%B8%8B%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%883%E6%97%A5.mp3"},
    {"id":"oeIN6GhOhew","d":"2022-07-03","t":"ยมบาลทำหน้าที่อะไร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 3 ก.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=yvAWvAqFxpM","thMp3":"","cnMp3":"https://media.dhamma.cn/d/da/D22.57%E3%80%8A%E5%88%AB%E6%89%94%E6%8E%89%E6%9C%80%E6%9C%89%E4%BB%B7%E5%80%BC%E7%9A%84%E5%BD%93%E4%B8%8B%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%883%E6%97%A5.mp3"},
    {"id":"_1vCau8CiuU","d":"2022-07-02","t":"การเงินต้องมั่นคงขนาดไหนถึงจะออกมาปฏิบัติธรรมเต็มที่และทำงานอาสาได้ :: หลวงพ่อปราโมทย์ 2 ก.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=21IZZY5gf7w","thMp3":"","cnMp3":"https://media.dhamma.cn/4/47/D22.56%E3%80%8A%E5%AF%BB%E6%89%BE%E8%87%AA%E5%B7%B1%E7%9A%84%E6%B3%95%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%882%E6%97%A5.mp3"},
    {"id":"hsaXAywMcrg","d":"2022-07-02","t":"กระบวนการพัฒนาของจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 2 ก.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=21IZZY5gf7w","thMp3":"","cnMp3":"https://media.dhamma.cn/4/47/D22.56%E3%80%8A%E5%AF%BB%E6%89%BE%E8%87%AA%E5%B7%B1%E7%9A%84%E6%B3%95%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B47%E6%9C%882%E6%97%A5.mp3"},
    {"id":"lmXYYCVjhsg","d":"2022-06-26","t":"กายมีแต่ทุกข์ จิตมีแต่ภาระ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 มิ.ย. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=qL3BU-whJwk","thMp3":"","cnMp3":"https://media.dhamma.cn/e/eb/D22.55%E3%80%8A%E7%9C%8B%E5%88%B0%E8%8B%A6%E6%82%A3%EF%BC%8C%E6%96%B9%E8%83%BD%E6%94%BE%E4%B8%8B%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B46%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"SgGJjmTSdBA","d":"2022-06-26","t":"จิตเป็นคลังเก็บข้อมูลอันมหาศาล :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 มิ.ย. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=qL3BU-whJwk","thMp3":"","cnMp3":"https://media.dhamma.cn/e/eb/D22.55%E3%80%8A%E7%9C%8B%E5%88%B0%E8%8B%A6%E6%82%A3%EF%BC%8C%E6%96%B9%E8%83%BD%E6%94%BE%E4%B8%8B%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B46%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"eIRKlPW9khI","d":"2022-06-25","t":"การมีสติในชีวิตประจำวัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 มิ.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/1/11/D22.54%E3%80%8A%E6%9F%94%E8%BD%AF%E6%81%AD%E6%95%AC%E7%9A%84%E5%BF%83%EF%BC%8C%E6%89%8D%E8%83%BD%E6%8E%A5%E5%8F%97%E5%88%B0%E6%B3%95%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B46%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"flZLNLPLj7Y","d":"2022-06-19","t":"พัฒนาจิตให้เป็นผู้เห็น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 มิ.ย. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=IsTKEb-RyMQ","thMp3":"","cnMp3":"https://media.dhamma.cn/b/b5/D22.53-E4.6%E3%80%8A%E6%97%A0%E8%AE%BA%E4%BF%AE%E5%93%AA%E4%B8%80%E7%A7%8D%E5%BF%B5%E5%A4%84%EF%BC%8C%E9%83%BD%E5%BF%85%E9%A1%BB%E6%9C%89%E7%9F%A5%E8%80%85%E7%9A%84%E5%BF%83%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B46%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"44wbm4KXKcU","d":"2022-06-18","t":"ความสุขจากการปฏิบัติธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 มิ.ย. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=JqIPKkC6uF8","thMp3":"","cnMp3":"https://media.dhamma.cn/c/c2/D22.52-E4.4%E3%80%8A%E7%9C%9F%E6%AD%A3%E7%9A%84%E5%BF%AB%E4%B9%90%EF%BC%8C%E6%BA%90%E8%87%AA%E4%BA%8E%E6%AD%A3%E7%A1%AE%E7%9A%84%E4%BF%AE%E8%A1%8C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B46%E6%9C%8818%E6%97%A5.mp3"},
    {"id":"MDgDwnU7yZI","d":"2022-06-12","t":"การพัฒนาองค์มรรค :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 มิ.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/e/e3/D22.50%E3%80%8A%E5%85%AB%E6%94%AF%E5%9C%A3%E9%81%93%E4%B8%8E%E5%9B%9B%E5%9C%A3%E8%B0%9B%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B46%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"UrbXCM3W5as","d":"2022-06-11","t":"11/06/2022  เราไม่วุ่นวายไปกับโลก (The World is Chaotic, but We can Be at Peace)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=j3xVIn9dLKk","thMp3":"","cnMp3":"https://media.dhamma.cn/9/96/D22.49%E3%80%8A%E4%B8%8E%E4%BD%9B%E9%99%80%E7%9A%84%E6%B3%95%E5%90%8C%E8%A1%8C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B46%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"JiGJ-siI_1o","d":"2022-06-11","t":"สังเกตกฎแห่งกรรมด้วยตัวเองได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 มิ.ย. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=j3xVIn9dLKk","thMp3":"","cnMp3":"https://media.dhamma.cn/9/96/D22.49%E3%80%8A%E4%B8%8E%E4%BD%9B%E9%99%80%E7%9A%84%E6%B3%95%E5%90%8C%E8%A1%8C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B46%E6%9C%8811%E6%97%A5.mp3"},
    {"id":"iz7x3lwz-Sg","d":"2022-06-05","t":"พัฒนาเครื่องมือให้ดี :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 มิ.ย. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=vpds3JLpyig","thMp3":"","cnMp3":"https://media.dhamma.cn/4/4b/D22.48%E3%80%8A%E5%9C%A3%E8%80%85%E6%89%80%E8%B5%B0%E8%BF%87%E7%9A%84%E8%B7%AF%E7%BA%BF%E5%9B%BE%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B46%E6%9C%885%E6%97%A5.mp3"},
    {"id":"k2NxNmx1huM","d":"2022-06-04","t":"เรียนลงที่กายที่ใจ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 มิ.ย. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=QleAB8zmBZc","thMp3":"","cnMp3":"https://media.dhamma.cn/e/eb/D22.47%E3%80%8A%E4%BD%9B%E6%95%99%E4%B8%8E%E7%A7%91%E5%AD%A6%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B46%E6%9C%884%E6%97%A5.mp3"},
    {"id":"Da1WIrUZTHU","d":"2022-06-04","t":"วิทยาศาสตร์ยังตามนามธรรมไม่ทัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4  มิ.ย. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=QleAB8zmBZc","thMp3":"","cnMp3":"https://media.dhamma.cn/e/eb/D22.47%E3%80%8A%E4%BD%9B%E6%95%99%E4%B8%8E%E7%A7%91%E5%AD%A6%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B46%E6%9C%884%E6%97%A5.mp3"},
    {"id":"JX9MOYuENok","d":"2022-05-29","t":"จุดตั้งต้นของความเลว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 พ.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/8/88/D22.46%E3%80%8A%E2%80%9D%E4%B8%8D%E5%A6%84%E8%AF%AD%E2%80%9C%E6%88%92%E7%9A%84%E6%8C%81%E5%AE%88%E7%BB%86%E8%8A%82%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B45%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"nRlQzKDEj3M","d":"2022-05-29","t":"ศีล สมาธิ ปัญญา เป็นเรื่องใหญ่ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 พ.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/8/88/D22.46%E3%80%8A%E2%80%9D%E4%B8%8D%E5%A6%84%E8%AF%AD%E2%80%9C%E6%88%92%E7%9A%84%E6%8C%81%E5%AE%88%E7%BB%86%E8%8A%82%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B45%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"vsfMhCBA7Sg","d":"2022-05-22","t":"โลกนี้มีแต่ความกระเพื่อมไหว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 พ.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/6/6f/D22.44%E3%80%8A%E5%9B%9B%E5%BF%B5%E5%A4%84%EF%BC%8C%E5%94%AF%E4%B8%80%E8%B7%AF%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B45%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"OPUe3niWKMQ","d":"2022-05-21","t":"ศีล 5 มีประโยชน์มาก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 พ.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=PE2yTtHBn5s","thMp3":"","cnMp3":"https://media.dhamma.cn/7/77/D22.43%E3%80%8A%E5%BF%83%E6%84%8F%E5%9D%9A%E5%86%B3%E5%9C%B0%E6%8C%81%E6%88%92%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B45%E6%9C%8821%E6%97%A5.mp3"},
    {"id":"MkT7GiqAEJ0","d":"2022-05-15","t":"อริยสัจเป็นธรรมะที่สำคัญที่สุด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 พ.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=7L9KB_1DM8M","thMp3":"","cnMp3":"https://media.dhamma.cn/d/d7/D22.42%E3%80%8A%E4%BD%9B%E9%99%80%E7%9A%84%E8%AF%81%E6%82%9F%E4%B9%8B%E9%81%93%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B45%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"F-P-8BvJehE","d":"2022-05-08","t":"08/05/2022 บวชใจให้ได้ (Ordination of the mind)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=yzkidvbDxx8","thMp3":"","cnMp3":"https://media.dhamma.cn/f/f0/D22.40%E3%80%8A%E6%B8%85%E6%B4%97%E7%83%A6%E6%81%BC%E4%B9%A0%E6%B0%94%EF%BC%8C%E8%AE%A9%E5%BF%83%E5%87%BA%E5%AE%B6%E4%B8%BA%E2%80%9C%E5%83%A7%E2%80%9D_%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B45%E6%9C%888%E6%97%A5.mp3"},
    {"id":"XwegN1bSMZk","d":"2022-05-01","t":"กถาวัตถุ 10 :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 พ.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/8/8a/D22.38%E3%80%8A%E5%B0%91%E6%AC%B2%E7%9F%A5%E8%B6%B3%EF%BC%8C%E7%B2%BE%E5%8B%A4%E4%BA%8E%E5%96%84%E6%B3%95%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B45%E6%9C%881%E6%97%A5.mp3"},
    {"id":"m9Kl69v2YwQ","d":"2022-04-30","t":"การปฏิบัติตั้งแต่ต้นจนจบ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/c/c5/D22.37%E3%80%8A%E4%BA%94%E6%88%92%E5%8D%B3%E6%98%AF%E4%B8%8D%E4%BC%A4%E5%AE%B3_%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"namZ9SzGlj8","d":"2022-04-30","t":"ปัญญารวบยอด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/c/c5/D22.37%E3%80%8A%E4%BA%94%E6%88%92%E5%8D%B3%E6%98%AF%E4%B8%8D%E4%BC%A4%E5%AE%B3_%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8830%E6%97%A5.mp3"},
    {"id":"z1l9b5FD4kY","d":"2022-04-24","t":"สุดท้ายจะจบลงที่อริยสัจ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/6/6f/D22.36%E3%80%8A%E9%80%82%E5%90%88%E5%BD%93%E4%BB%A3%E4%BA%BA%E7%9A%84%E4%BF%AE%E8%A1%8C%E6%96%B9%E6%B3%95%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8824%E6%97%A5.mp3"},
    {"id":"J-Nzk6ic5kg","d":"2022-04-23","t":"น้ำหนักในใจคือดัชนีชี้วัด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/1/17/D22.35%E3%80%8A%E5%88%BB%E6%84%8F%E4%BF%AE%E8%A1%8C%EF%BC%8C%E5%BF%83%E5%B0%B1%E4%BC%9A%E6%9C%89%E6%B2%89%E9%87%8D%E6%84%9F%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"AbV3yrwkUn4","d":"2022-04-17","t":"การปฏิบัตินั้นไม่ยาก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/0/05/D22.34%E3%80%8A%E5%A2%9E%E9%95%BF%E5%96%84%E6%B3%95%E8%8E%B7%E5%BE%97%E6%99%BA%E6%85%A7%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"7cxHWL2JFSM","d":"2022-04-17","t":"ความสุขเป็นของไม่ยั่งยืน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 เม.ย.2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/0/05/D22.34%E3%80%8A%E5%A2%9E%E9%95%BF%E5%96%84%E6%B3%95%E8%8E%B7%E5%BE%97%E6%99%BA%E6%85%A7%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8817%E6%97%A5.mp3"},
    {"id":"hIAGGjdUMcs","d":"2022-04-16","t":"Be careful and responsible :: Luangpu Pramote Pamojjo 16 April 2022","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/40/D22.33%E3%80%8A%E6%9C%80%E5%90%8E%E7%9A%84%E6%B3%95%E8%8D%AF%EF%BC%9A%E6%AD%BB%E9%9A%8F%E5%BF%B5%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"bL3cdp_jk5I","d":"2022-04-16","t":"ทำอย่างไร ให้หายเพ่ง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/40/D22.33%E3%80%8A%E6%9C%80%E5%90%8E%E7%9A%84%E6%B3%95%E8%8D%AF%EF%BC%9A%E6%AD%BB%E9%9A%8F%E5%BF%B5%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"NrbTpe4LQtw","d":"2022-04-16","t":"16/04/2022 มีชีวิตด้วยความไม่ประมาท (Be careful and responsible)","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/40/D22.33%E3%80%8A%E6%9C%80%E5%90%8E%E7%9A%84%E6%B3%95%E8%8D%AF%EF%BC%9A%E6%AD%BB%E9%9A%8F%E5%BF%B5%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"tZAiHgNkpLQ","d":"2022-04-16","t":"พิจารณาความตาย :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/40/D22.33%E3%80%8A%E6%9C%80%E5%90%8E%E7%9A%84%E6%B3%95%E8%8D%AF%EF%BC%9A%E6%AD%BB%E9%9A%8F%E5%BF%B5%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"FGXbQULC4JA","d":"2022-04-16","t":"การเจริญปัญญาใช้เวลาไม่มาก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/40/D22.33%E3%80%8A%E6%9C%80%E5%90%8E%E7%9A%84%E6%B3%95%E8%8D%AF%EF%BC%9A%E6%AD%BB%E9%9A%8F%E5%BF%B5%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"77398zs9drw","d":"2022-04-16","t":"เราจะใช้กรรมฐานรักษาโรคได้อย่างไร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/40/D22.33%E3%80%8A%E6%9C%80%E5%90%8E%E7%9A%84%E6%B3%95%E8%8D%AF%EF%BC%9A%E6%AD%BB%E9%9A%8F%E5%BF%B5%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"QuO2K6MkJiY","d":"2022-04-10","t":"เรียนรู้อายตนะเพื่อละตัณหา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/0/01/D22.32%E3%80%8A%E8%AF%A6%E8%AF%B4%E2%80%9C%E8%B4%AA%E7%88%B1%E2%80%9D%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"eI68FgMIAQQ","d":"2022-04-10","t":"กระทบโลกภายนอกแล้วหงุดหงิดแก้ไขอย่างไร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/0/01/D22.32%E3%80%8A%E8%AF%A6%E8%AF%B4%E2%80%9C%E8%B4%AA%E7%88%B1%E2%80%9D%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%8810%E6%97%A5.mp3"},
    {"id":"wuLiToylIWE","d":"2022-04-09","t":"ธรรมทั้งหลายทั้งปวงไม่ควรยึดมั่น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/2/26/D22.31%E3%80%8A%E4%B8%8D%E6%89%A7%E7%9D%80%E4%B8%80%E5%88%87%EF%BC%8C%E7%BC%98%E4%BA%8E%E7%9F%A5%E8%8B%A6%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%889%E6%97%A5.mp3"},
    {"id":"--CacP5EhZU","d":"2022-04-03","t":"03/04/2022 นิโรธ 5 (The Five Cessations of Suffering (Nirodha))","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/9/99/D22.30%E3%80%8A%E4%BF%AE%E8%A1%8C%E4%B8%AD%E7%9A%84%E4%BA%94%E7%A7%8D%E2%80%9D%E7%81%AD%E2%80%9C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%883%E6%97%A5.mp3"},
    {"id":"ngSrmNJiJF8","d":"2022-04-02","t":"การปฏิบัติ 3 อย่างที่ต้องทำทุกวัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 2 เม.ย. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/ae/D22.29%E3%80%8A%E4%BF%AE%E8%A1%8C%E7%9A%84%E7%9B%AE%E6%A0%87%E4%B8%8D%E6%98%AF%E5%BE%97%E5%88%B0%EF%BC%8C%E8%80%8C%E6%98%AF%E6%94%BE%E4%B8%8B%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B44%E6%9C%882%E6%97%A5.mp3"},
    {"id":"kx1_yef13SA","d":"2022-03-27","t":"ศีลอัตโนมัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 มี.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/e/ec/D22.28%E3%80%8A%E4%BF%AE%E8%A1%8C%E4%BA%BA%E7%9A%84%E5%BC%B1%E7%82%B9%EF%BC%9A%E4%BF%AE%E8%A1%8C%E4%B8%8D%E6%8C%81%E7%BB%AD%E3%80%81%E7%A6%85%E5%AE%9A%E4%B8%8D%E6%AD%A3%E7%A1%AE%E3%80%8B%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B43%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"m7ghhshxmfY","d":"2022-03-27","t":"ศีล สมาธิ ปัญญาอัตโนมัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 มี.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/e/ec/D22.28%E3%80%8A%E4%BF%AE%E8%A1%8C%E4%BA%BA%E7%9A%84%E5%BC%B1%E7%82%B9%EF%BC%9A%E4%BF%AE%E8%A1%8C%E4%B8%8D%E6%8C%81%E7%BB%AD%E3%80%81%E7%A6%85%E5%AE%9A%E4%B8%8D%E6%AD%A3%E7%A1%AE%E3%80%8B%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B43%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"gbPbFZg4V8g","d":"2022-03-26","t":"การเจริญสติในชีวิตประจำวัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 มี.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/7/71/D22.27%E3%80%8A%E8%A7%82%E5%BF%83%EF%BC%8C%E7%8A%B9%E5%A6%82%E4%B8%80%E6%8A%8A%E5%BC%80%E5%90%AF%E4%BF%AE%E8%A1%8C%E7%9A%84%E9%92%A5%E5%8C%99%E3%80%8B%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B43%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"_YJUVUfYKuU","d":"2022-03-20","t":"กิเลสกลัวคนรู้ทัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 มี.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/42/D22.26%E3%80%8A%E7%83%A6%E6%81%BC%E4%B8%8D%E6%80%95%E7%B2%BE%E9%80%9A%E7%BB%8F%E8%97%8F%E8%80%85%EF%BC%8C%E4%BB%85%E7%95%8F%E6%83%A7%E5%8F%8A%E6%97%B6%E5%9C%B0%E7%85%A7%E8%A7%81%E5%AE%83%E3%80%8B-2022%E5%B9%B43%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"AWYTzR1qmO0","d":"2022-03-20","t":"กิเลสอยู่ที่ไหน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 มี.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/42/D22.26%E3%80%8A%E7%83%A6%E6%81%BC%E4%B8%8D%E6%80%95%E7%B2%BE%E9%80%9A%E7%BB%8F%E8%97%8F%E8%80%85%EF%BC%8C%E4%BB%85%E7%95%8F%E6%83%A7%E5%8F%8A%E6%97%B6%E5%9C%B0%E7%85%A7%E8%A7%81%E5%AE%83%E3%80%8B-2022%E5%B9%B43%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"5RIxpZpOgbw","d":"2022-03-13","t":"จิตคือหัวโจก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 มี.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/ac/D22.24%E3%80%8A%E5%8F%AA%E5%90%AC%E4%B8%8D%E7%BB%83%EF%BC%8C%E4%BF%AE%E8%A1%8C%E4%B8%8D%E5%8F%AF%E8%83%BD%E5%A6%82%E6%84%BF%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B43%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"cm4KrWMxO1Y","d":"2022-03-13","t":"มีวิธีดูอย่างไรว่าได้มรรคผลหรือยัง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 มี.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/ac/D22.24%E3%80%8A%E5%8F%AA%E5%90%AC%E4%B8%8D%E7%BB%83%EF%BC%8C%E4%BF%AE%E8%A1%8C%E4%B8%8D%E5%8F%AF%E8%83%BD%E5%A6%82%E6%84%BF%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B43%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"irri_gbFlQ4","d":"2022-03-12","t":"มรดกกรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 มี.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/f/f7/D22.23%E3%80%8A%E4%B8%BA%E5%BF%83%E5%82%A8%E5%AD%98%E8%A7%A3%E8%84%B1%E7%9A%84%E8%B5%84%E7%B2%AE%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B43%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"h78z9IUTovg","d":"2022-03-12","t":"อะไรที่ไม่คุ้นเคยก็ยากทั้งนั้น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 มี.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/f/f7/D22.23%E3%80%8A%E4%B8%BA%E5%BF%83%E5%82%A8%E5%AD%98%E8%A7%A3%E8%84%B1%E7%9A%84%E8%B5%84%E7%B2%AE%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B43%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"SnAQUx2AfJk","d":"2022-03-12","t":"ดูกิเลสละเอียดให้ออก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 มี.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/f/f7/D22.23%E3%80%8A%E4%B8%BA%E5%BF%83%E5%82%A8%E5%AD%98%E8%A7%A3%E8%84%B1%E7%9A%84%E8%B5%84%E7%B2%AE%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B43%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"FD0uxHVlgjc","d":"2022-03-05","t":"มาดูความจริงของขันธ์ 5 :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 มี.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=P9rjgM6uuHo","thMp3":"","cnMp3":"https://media.dhamma.cn/c/c5/D22.21%E3%80%8A%E6%9C%89%E6%AC%A1%E7%AC%AC%E5%9C%B0%E6%B8%85%E6%B4%97%E7%83%A6%E6%81%BC%E4%B9%A0%E6%B0%94%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B43%E6%9C%885%E6%97%A5.mp3"},
    {"id":"mHDBlAwwpXc","d":"2022-02-27","t":"ภาวนาเก็บเล็กเก็บน้อย :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/3/34/D22.20-E3.8%E3%80%8A%E6%92%95%E5%BC%80%E5%BF%83%E7%9A%84%E9%80%A0%E4%BD%9C%E4%BC%AA%E8%A3%85%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8827%E6%97%A5.mp3"},
    {"id":"fQNOMAAwO5M","d":"2022-02-26","t":"ทำกรรมฐานต้องมีวิหารธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/9/90/E3.6%E3%80%8A%E8%B5%B0%E7%A5%9E%E7%9C%8B%E4%B8%8D%E5%88%B0%E5%A2%83%E7%95%8C%EF%BC%8C%E7%B4%A7%E7%9B%AF%E7%9C%8B%E4%B8%8D%E5%88%B0%E4%B8%89%E6%B3%95%E5%8D%B0%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B402%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"zhKEMUVmzdU","d":"2022-02-26","t":"อารมณ์บัญญัติ – อารมณ์ปรมัตถ์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/9/90/E3.6%E3%80%8A%E8%B5%B0%E7%A5%9E%E7%9C%8B%E4%B8%8D%E5%88%B0%E5%A2%83%E7%95%8C%EF%BC%8C%E7%B4%A7%E7%9B%AF%E7%9C%8B%E4%B8%8D%E5%88%B0%E4%B8%89%E6%B3%95%E5%8D%B0%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B402%E6%9C%8826%E6%97%A5.mp3"},
    {"id":"SJhOg__wBtM","d":"2022-02-25","t":"เตรียมกองทัพของเราให้พร้อม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/7/73/D22.18-E3.2%E3%80%8A%E5%BF%83%E5%AE%89%E4%BD%8F%E7%9A%84%E7%8A%B6%E6%80%81%EF%BC%8C%E6%98%AF%E9%87%8D%E8%A6%81%E7%9A%84%E8%BD%AC%E6%8A%98%E7%82%B9%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8825%E6%97%A5.mp3"},
    {"id":"IVOPUchwjzs","d":"2022-02-20","t":"รู้ทันความปรุงแต่งของจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/c/c3/D22.17%E3%80%8A%E4%B8%8D%E5%81%9C%E5%9C%B0%E5%8F%8A%E6%97%B6%E7%9F%A5%E9%81%93%E9%80%A0%E4%BD%9C%EF%BC%8C%E6%9C%89%E4%B8%80%E5%A4%A9%E5%B0%B1%E5%8F%AF%E4%BB%A5%E6%91%86%E8%84%B1%E9%80%A0%E4%BD%9C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"EIFe_edp5tQ","d":"2022-02-20","t":"มารยาของนักปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/c/c3/D22.17%E3%80%8A%E4%B8%8D%E5%81%9C%E5%9C%B0%E5%8F%8A%E6%97%B6%E7%9F%A5%E9%81%93%E9%80%A0%E4%BD%9C%EF%BC%8C%E6%9C%89%E4%B8%80%E5%A4%A9%E5%B0%B1%E5%8F%AF%E4%BB%A5%E6%91%86%E8%84%B1%E9%80%A0%E4%BD%9C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8820%E6%97%A5.mp3"},
    {"id":"UH_yxJ5cKrM","d":"2022-02-19","t":"เรียนรู้ความจริงของโลก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/c/c1/D22.16%E3%80%8A%E6%97%A0%E5%B8%B8%E7%9A%84%E5%BF%AB%E4%B9%90%E4%B8%8D%E8%83%BD%E4%BD%9C%E4%B8%BA%E4%BF%AE%E8%A1%8C%E7%9A%84%E7%9B%AE%E6%A0%87%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"0aZZpDwFSXY","d":"2022-02-19","t":"วิ่งตะครุบเงาตัวเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/c/c1/D22.16%E3%80%8A%E6%97%A0%E5%B8%B8%E7%9A%84%E5%BF%AB%E4%B9%90%E4%B8%8D%E8%83%BD%E4%BD%9C%E4%B8%BA%E4%BF%AE%E8%A1%8C%E7%9A%84%E7%9B%AE%E6%A0%87%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8819%E6%97%A5.mp3"},
    {"id":"3lGeTjHqyco","d":"2022-02-16","t":"วิหารธรรมที่เหมาะกับเรา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/49/D22.15%E3%80%8A%E5%A6%82%E6%9E%9C%E6%B2%A1%E6%9C%89%E4%B8%B4%E6%97%B6%E7%9A%84%E5%AE%B6%EF%BC%8C%E5%B0%B1%E8%BF%98%E6%B2%A1%E6%9C%89%E5%BC%80%E5%A7%8B%E4%BF%AE%E8%A1%8C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"zI9B1zAtrXc","d":"2022-02-16","t":"ใช้ธรรมเป็นวิหารธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/49/D22.15%E3%80%8A%E5%A6%82%E6%9E%9C%E6%B2%A1%E6%9C%89%E4%B8%B4%E6%97%B6%E7%9A%84%E5%AE%B6%EF%BC%8C%E5%B0%B1%E8%BF%98%E6%B2%A1%E6%9C%89%E5%BC%80%E5%A7%8B%E4%BF%AE%E8%A1%8C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"qaHZfZQHh2Y","d":"2022-02-16","t":"ใช้จิตเป็นวิหารธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/49/D22.15%E3%80%8A%E5%A6%82%E6%9E%9C%E6%B2%A1%E6%9C%89%E4%B8%B4%E6%97%B6%E7%9A%84%E5%AE%B6%EF%BC%8C%E5%B0%B1%E8%BF%98%E6%B2%A1%E6%9C%89%E5%BC%80%E5%A7%8B%E4%BF%AE%E8%A1%8C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"VkWYbhwkHYQ","d":"2022-02-16","t":"ใช้กายเป็นวิหารธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/4/49/D22.15%E3%80%8A%E5%A6%82%E6%9E%9C%E6%B2%A1%E6%9C%89%E4%B8%B4%E6%97%B6%E7%9A%84%E5%AE%B6%EF%BC%8C%E5%B0%B1%E8%BF%98%E6%B2%A1%E6%9C%89%E5%BC%80%E5%A7%8B%E4%BF%AE%E8%A1%8C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"LU6HBYMz-n0","d":"2022-02-13","t":"พ้นทุกข์ด้วยอริยสัจ 4 :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/2/22/D22.14%E3%80%8A%E4%BD%9B%E6%95%99%E6%98%AF%E7%9C%9F%E6%AD%A3%E8%83%BD%E5%B8%A6%E9%A2%86%E6%88%91%E4%BB%AC%E7%A6%BB%E8%8B%A6%E7%9A%84%E5%AD%A6%E7%A7%91%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8813%E6%97%A5.mp3"},
    {"id":"3bqKGdwmPMY","d":"2022-02-12","t":"ต้องมีวิหารธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/3/3d/D22.13%E3%80%8A%E8%BF%B7%E4%BA%8E%E5%85%AD%E6%A0%B9%E9%97%A8%EF%BC%8C%E6%B5%81%E6%B5%AA%E6%97%A0%E6%AD%A2%E5%A2%83%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"KGQhoOCVDow","d":"2022-02-12","t":"อย่ามีเครื่องอยู่หลายอย่าง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/3/3d/D22.13%E3%80%8A%E8%BF%B7%E4%BA%8E%E5%85%AD%E6%A0%B9%E9%97%A8%EF%BC%8C%E6%B5%81%E6%B5%AA%E6%97%A0%E6%AD%A2%E5%A2%83%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"pWYGGu89JRg","d":"2022-02-12","t":"สัญญาวิปลาส :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/3/3d/D22.13%E3%80%8A%E8%BF%B7%E4%BA%8E%E5%85%AD%E6%A0%B9%E9%97%A8%EF%BC%8C%E6%B5%81%E6%B5%AA%E6%97%A0%E6%AD%A2%E5%A2%83%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%8812%E6%97%A5.mp3"},
    {"id":"2gROu1EWOgY","d":"2022-02-06","t":"สติ สมาธิ ปัญญาอัตโนมัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/0/03/D22.12%E3%80%8A%E6%9C%89%E6%AC%A1%E7%AC%AC%E7%9A%84%E5%AD%A6%E4%B9%A0%E4%BA%94%E8%95%B4%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%886%E6%97%A5.mp3"},
    {"id":"kpp_p9yK6Uk","d":"2022-02-05","t":"ธรรมะเป็นเรื่องธรรมดา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 ก.พ. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/e/e1/D22.11%E3%80%8A%E4%BD%95%E8%B0%93%E2%80%9C%E5%BE%80%E5%A4%96%E9%80%81%E7%9A%84%E5%BF%83%E2%80%9D%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B42%E6%9C%885%E6%97%A5.mp3"},
    {"id":"LHVCrG8T-Wo","d":"2022-01-29","t":"ทาน ศีล ภาวนาเพื่อพัฒนาจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 ม.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/2/2b/D22.9%E3%80%8A%E6%B3%95%E5%AE%BD%E5%B9%BF%E7%B9%81%E5%A4%9A%EF%BC%8C%E6%99%BA%E6%8B%A9%E9%80%82%E5%B7%B1%E8%80%8C%E8%A1%8C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%8829%E6%97%A5.mp3"},
    {"id":"kPTEzIEIdYk","d":"2022-01-23","t":"เป้าหมายสูงสุดคือความดับทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 ม.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/2/2f/D22.8%E3%80%8A%E4%BF%AE%E8%A1%8C%E5%85%A8%E8%B2%8C%E7%9A%84%E6%B5%93%E7%BC%A9%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"Py_bGEvYKkc","d":"2022-01-23","t":"จิตผู้รู้แสดงไตรลักษณ์ได้อย่างไร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 ม.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/2/2f/D22.8%E3%80%8A%E4%BF%AE%E8%A1%8C%E5%85%A8%E8%B2%8C%E7%9A%84%E6%B5%93%E7%BC%A9%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%8823%E6%97%A5.mp3"},
    {"id":"S5KEbt2v_RM","d":"2022-01-22","t":"กรรมฐานในยุควุ่นวาย :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 ม.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/aa/D22.7%E3%80%8A%E8%AF%B7%E5%BF%8D%E8%80%90%EF%BC%8C%E5%8F%8D%E5%A4%8D%E4%B8%8D%E6%96%AD%E7%9A%84%E5%8E%BB%E8%A7%82%E5%AF%9F%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"7gepNabXfWo","d":"2022-01-22","t":"ต้องอดทน  :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 ม.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/aa/D22.7%E3%80%8A%E8%AF%B7%E5%BF%8D%E8%80%90%EF%BC%8C%E5%8F%8D%E5%A4%8D%E4%B8%8D%E6%96%AD%E7%9A%84%E5%8E%BB%E8%A7%82%E5%AF%9F%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%8822%E6%97%A5.mp3"},
    {"id":"04JO-08TcFQ","d":"2022-01-16","t":"เชื้อเกิดที่แฝงอยู่ในจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ม.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/ae/D22.6%E3%80%8A%E5%8E%BB%E9%AA%8C%E8%AF%81%E9%AB%98%E5%83%A7%E5%A4%A7%E5%BE%B7%E7%9A%84%E6%95%99%E5%AF%BC%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%8816%E6%97%A5.mp3"},
    {"id":"R1XsZeWozqY","d":"2022-01-15","t":"15/01/2022 ภาวนาตั้งแต่ตื่นจนหลับ (Keep practicing upon arising until asleep)","sp":"lp","cnYt":"https://www.youtube.com/watch?v=eE9p2H2DZVU","thMp3":"","cnMp3":"https://media.dhamma.cn/c/cb/D22.5%E3%80%8A%E6%8C%81%E4%B9%8B%E4%BB%A5%E6%81%92%EF%BC%8C%E6%AD%A5%E5%B1%A5%E4%B8%8D%E5%81%9C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"T4NokrLRdCI","d":"2022-01-15","t":"เหตุที่ทำให้ภาวนาได้เร็ว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 ม.ค. 2565","sp":"lp","cnYt":"https://www.youtube.com/watch?v=eE9p2H2DZVU","thMp3":"","cnMp3":"https://media.dhamma.cn/c/cb/D22.5%E3%80%8A%E6%8C%81%E4%B9%8B%E4%BB%A5%E6%81%92%EF%BC%8C%E6%AD%A5%E5%B1%A5%E4%B8%8D%E5%81%9C%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%8815%E6%97%A5.mp3"},
    {"id":"KKADy-UV6Q8","d":"2022-01-09","t":"ความสม่ำเสมอสำคัญมาก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 ม.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/a8/D22.4%E3%80%8A%E4%BF%AE%E8%A1%8C%E7%9A%84%E4%B8%A4%E4%B8%AA%E6%9E%81%E7%AB%AF%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%889%E6%97%A5.mp3"},
    {"id":"o4_h7MPI6Wk","d":"2022-01-09","t":"ดูจิตใจได้ก็พัฒนาเร็ว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 ม.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/a/a8/D22.4%E3%80%8A%E4%BF%AE%E8%A1%8C%E7%9A%84%E4%B8%A4%E4%B8%AA%E6%9E%81%E7%AB%AF%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%889%E6%97%A5.mp3"},
    {"id":"UJRmGMw0vvI","d":"2022-01-08","t":"ความสุขในโลกไม่ยั่งยืน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 ม.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/b/ba/D22.3%E3%80%8A%E5%BF%AB%E4%B9%90%E4%B8%8E%E8%8D%86%E6%A3%98%E5%B9%B6%E5%AD%98%E4%B9%8B%E8%B7%AF%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%888%E6%97%A5.mp3"},
    {"id":"2yDIvi2VU_c","d":"2022-01-01","t":"เมตตาเป็นธรรมสำคัญมาก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 ม.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/1/12/D22.1%E3%80%8A%E4%BB%A5%E6%85%88%E6%82%B2%E7%9B%B8%E5%BE%85%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%881%E6%97%A5.mp3"},
    {"id":"HOj69JrHxvE","d":"2022-01-01","t":"เมตตาอัตโนมัติ  :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 ม.ค. 2565","sp":"lp","cnYt":"","thMp3":"","cnMp3":"https://media.dhamma.cn/1/12/D22.1%E3%80%8A%E4%BB%A5%E6%85%88%E6%82%B2%E7%9B%B8%E5%BE%85%E3%80%8B-%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85-2022%E5%B9%B41%E6%9C%881%E6%97%A5.mp3"},
    {"id":"It_5YGZHUF8","d":"2021-12-31","t":"แก้มิจฉาทิฏฐิด้วยวิปัสสนา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"xsoq27PcUfo","d":"2021-12-26","t":"เข้าใจธรรมดาของโลก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"pi9a47RlpsE","d":"2021-12-26","t":"ยอมรับได้ใจก็สงบ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"we6jNImjDOc","d":"2021-12-26","t":"ฝึกจนจิตมันเข้าถึงความเป็นธรรมดา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"-wDSQNY1_lo","d":"2021-12-25","t":"25/12/2021 ฝึกจิตให้คุ้นชินกับการภาวนา (Train the Mind - Get Accustomed to Meditating)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"NobpcL-6twU","d":"2021-12-25","t":"ม้างกาย :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"VEJZ9T8QDnE","d":"2021-12-19","t":"เข้าใจจิตก็เข้าใจโลก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"iSAvefLc0xw","d":"2021-12-19","t":"เรียนรู้จากภายใน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"nIpIt4NL2uE","d":"2021-12-19","t":"เรียนรู้จากตัวที่เกิดบ่อย  ๆ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"XXPYhcDMizw","d":"2021-12-18","t":"สู้แบบรู้กำลังตัวเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"5IsxhaxbedA","d":"2021-12-18","t":"ไม่หลีกเลี่ยงการกระทบอารมณ์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Yor8b9ZB3lk","d":"2021-12-12","t":"จิตเคลื่อนแล้วรู้  :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"VayJ0HEE5Ag","d":"2021-12-12","t":"หัดกรรมฐานเหมือนตกปลา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"OHwxK0atyHU","d":"2021-12-11","t":"สิ่งที่ควรทำคือความดี :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"hIJbyu7dMi8","d":"2021-12-11","t":"เหนือกว่าบุญคือตัวกุศล :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"_C_Wn0Ka6Fc","d":"2021-12-11","t":"อาจิณณกรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ธ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"LAG9A72Boy0","d":"2021-11-28","t":"วัดใจตัวเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 พ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"6CX7CKoHAJs","d":"2021-11-27","t":"ฉลาดรู้กรรมฐานที่ควรกับตัวเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 พ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"JvEmL1zDFqw","d":"2021-11-27","t":"ทำสมถะและวิปัสสนาด้วยปัญญาอันยิ่ง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 พ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"_vsmo5Ke1B4","d":"2021-11-21","t":"เห็นความเปลี่ยนแปลงจนเข้าใจ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 พ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Rp_ep_12LZE","d":"2021-11-20","t":"แนวรุกแนวรับในการภาวนา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 พ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ncojnlYEJ-8","d":"2021-11-14","t":"14/11/2021 เรามีสิทธิ์เลือกความสุขของตัวเอง (We are eligible to choose our own happiness)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"7cKLUs_JEB4","d":"2021-11-14","t":"เราต้องการความสุขระดับไหน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 พ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"EMi4XxpIn5o","d":"2021-11-13","t":"ของฟรีไม่มี ของฟลุกไม่มี :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 พ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"O5M752cVL2w","d":"2021-11-13","t":"ภาวนาแบบหมาขี้เรื้อน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 พ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"O3drXSFU6HA","d":"2021-11-07","t":"ขันธ์ทั้ง 5 ตกอยู่ใต้ไตรลักษณ์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 พ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"39a77VSkVXo","d":"2021-11-06","t":"อย่าถนอมรักษากิเลส :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 พ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"cs5HZTptujA","d":"2021-11-06","t":"ศีลต้องรักษา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 พ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"l87cNZ-1V1M","d":"2021-11-06","t":"สัมมาวายามะจำเป็นมากในการฝึกจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 พ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"gytVryXVCgA","d":"2021-10-31","t":"ไม่เห็นไตรลักษณไม่ใช่วิปัสสนา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"dQ4szXBBC94","d":"2021-10-31","t":"งานภาวนา 3 ขั้น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"POsJHXyOIt4","d":"2021-10-30","t":"อารัมมณูปนิชฌาน - ลักขณูปนิชฌาน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"CGzboZOBjiE","d":"2021-10-30","t":"สมถะเริ่มเมื่อหมดความจงใจ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"kYBw4NYcLl4","d":"2021-10-24","t":"วิธียกระดับจิตใจ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Ng6k2W1-zyA","d":"2021-10-24","t":"วิธียกตัวเองให้สูงขึ้น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"KaU1uV7mFfk","d":"2021-10-23","t":"23/10/2021 กรรมฐานไม่เลือกกาลและสถานที่ (Dhamma is ever-present)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"RUIHWR9BlIA","d":"2021-10-23","t":"สักแต่ว่าธาตุ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"NYBz-lig-ss","d":"2021-10-17","t":"ช่วงส่งการบ้าน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"hIFf00xWnYc","d":"2021-10-16","t":"อดทนและไม่ดื้อ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"fCNrca8xC1c","d":"2021-10-16","t":"ติดในทิฏฐิว่าโลกนี้ว่างเปล่า :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"3DBMFZ5NLSU","d":"2021-10-10","t":"องค์มรรคที่ตรงกับการพัฒนาจิตโดยตรง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"onDdGn6HbBo","d":"2021-10-10","t":"เริ่มต้นถึงรู้แจ้ง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"-vlvufiVvH8","d":"2021-10-10","t":"10/10/2021 เริ่มต้นจนถึงสัมมาวิมุตติ (From Start to Freedom)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"KXI7goh0elw","d":"2021-10-09","t":"มีสติอยู่กับปัจจุบัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"F467XTxDke4","d":"2021-10-09","t":"ระลึกชาติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"XoJzMqvfIN0","d":"2021-10-03","t":"ประตูของการบรรลุมรรคผล :: หลวงพ่อปราโมทย์ ปาโมชฺโช 3 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"x9-yWb72Xjc","d":"2021-10-03","t":"เราบังคับจิตไม่ได้แต่ฝึกได้  :: หลวงพ่อปราโมทย์ ปาโมชฺโช 3 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"FXeL_IXDvdQ","d":"2021-10-02","t":"การดูจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 2 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"A3B7v_JCuAg","d":"2021-10-02","t":"อย่ารอให้จิตหมดแรง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 2 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"rMRnfQATBH4","d":"2021-10-02","t":"ดูพฤติกรรมของจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 2 ต.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"EiH0e1zgkqc","d":"2021-09-26","t":"ป่วยหนักแล้วทำอย่างไร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"D0_VOnPA0BI","d":"2021-09-26","t":"การปฏิบัติผัดไม่ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"AmtcoJa_h2c","d":"2021-09-25","t":"ธรรมะมี 2 ระดับ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"bjMimfqvkWo","d":"2021-09-19","t":"เนิ่นช้าเพราะภาวนาผิด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Ty3KxLa3qF8","d":"2021-09-19","t":"การฝึกสมาธิให้ถูกต้องสำคัญมาก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"U_73EA1RuA8","d":"2021-09-18","t":"ใช้กรรมเก่าเป็นทรัพยากร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Y7XXSSuumj0","d":"2021-09-18","t":"ใช้ขันธ์ให้เกิดประโยชน์สูงสุด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"op6fEQPNxX4","d":"2021-09-18","t":"ใช้สติลดละความชั่ว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"KdY6RHR919s","d":"2021-09-12","t":"อย่ามัวแต่รอถามครูบาอาจารย์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"YBp4GlyaOw0","d":"2021-09-12","t":"สังเกตให้มาก จะมีคำถามน้อยลง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"hCWYnO2IuZA","d":"2021-09-11","t":"อยู่ให้เป็นแล้วเย็นสบาย :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"F0n4tLztIJU","d":"2021-09-11","t":"ต้องรู้จักปรับตัว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"DpXs7mMqpyY","d":"2021-09-11","t":"ทางออกจากทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"BFxBYlcaljM","d":"2021-09-05","t":"วิธีดับเหตุของทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"7YEL_JuYers","d":"2021-09-05","t":"โจรร้ายอยู่ที่จิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Aefq_cpETmc","d":"2021-09-04","t":"บ้านที่แท้จริง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 ก.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"LOKKkdRaKHo","d":"2021-08-29","t":"ทางสายกลาง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"70WpzslAa5I","d":"2021-08-28","t":"เข้าใจโลก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"pzgDuEUzDe8","d":"2021-08-28","t":"ความจริงทางโลกกับความจริงทางธรรม  :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"nZZ6oQqrTgk","d":"2021-08-28","t":"สถานการณ์เลวร้ายทำให้เราเติบโต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Z3FP7nllGqo","d":"2021-08-27","t":"การปฏิบัติธรรมเท่ากับการลงทุนกับชีวิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"nlmcaRQgnv8","d":"2021-08-22","t":"โลกิยธรรมและโลกุตตรธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"tS5DlDVX2RI","d":"2021-08-22","t":"การปฏิบัติธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"6SVViOlIdpU","d":"2021-08-21","t":"กรรมฐานที่เหมาะกับจริต  :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"3CXtv0KG8AA","d":"2021-08-21","t":"กรรมฐานที่เหมาะกับตัวเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"qgMuBCQquBY","d":"2021-08-15","t":"ร่างกายถูกความทุกข์บีบคั้นอยู่ตลอดเวลา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"m9Mi4zYyO64","d":"2021-08-15","t":"ใช้ร่างกายให้เป็นประโยชน์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ygK8v2Chf0Y","d":"2021-08-14","t":"ทุกข์ทางใจมาจากความคิด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"TCYXguq-0VQ","d":"2021-08-08","t":"สติปัฏฐานเป็นทางสายเอก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"D5Jaqk9ey7o","d":"2021-08-08","t":"หน้าที่ที่แท้จริงของจิตคือรู้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"8xw5z7Iwrrg","d":"2021-08-08","t":"อาศัยโยนิโสมนสิการให้มากไว้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"W-Zp5Bdk2Og","d":"2021-08-07","t":"ท่องเที่ยวอยู่ในกายในใจ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"xmPZ15wszIA","d":"2021-08-07","t":"มนุษย์เป็นภูมิที่ภาวนาได้ดีที่สุด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"7vlY-GjGnHU","d":"2021-08-07","t":"จิตเปลี่ยนภพอยู่ตลอดเวลา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Yz_ce2DiDwk","d":"2021-08-01","t":"เอาจิตให้รอด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 ส.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"MLAjxeVFmzk","d":"2021-07-31","t":"สมาธิมี 2 ชนิด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"qnvcMBXzlZs","d":"2021-07-31","t":"กรรมฐานสำหรับคนไม่ได้ฌาน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Ez_nNjGEQE4","d":"2021-07-25","t":"จิตตั้งมั่น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"_Tc2mGvRXYA","d":"2021-07-24","t":"เจริญเมตตาให้มากไว้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"VKonZLhswxk","d":"2021-07-24","t":"เชื้อโรคดื้อยา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"SIY7comlf8c","d":"2021-07-18","t":"18/07/2021 การดูจิตดูใจ (To See the mind)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"m7G-JrL_7A4","d":"2021-07-18","t":"ดูเวทนาทางกาย สมาธิต้องพอ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ye6cVGh7YbI","d":"2021-07-17","t":"วัฏฏะไม่มีความแน่นอน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"rSJRLVjKCtU","d":"2021-07-17","t":"คู่บารมี :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"1b1SV-SU7VM","d":"2021-07-17","t":"เล่นแต่อินเทอร์เน็ต ภาวนาไม่รอด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"1RN9P5ZAbSE","d":"2021-07-11","t":"จิตไม่ได้มีดวงเดียว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Iv_JKeSZGyg","d":"2021-07-11","t":"การเรียนรู้จิตทำได้ 2 แบบ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Sm9VSZD-0kw","d":"2021-07-10","t":"อินทรียสังวร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"K5VQmbJToIk","d":"2021-07-10","t":"อย่าเหลวไหล :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"EgAeccGzGJ4","d":"2021-07-04","t":"เหนือโลกไม่ใช่หนีโลก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"O306rCiwF3E","d":"2021-07-03","t":"ขึ้นบกให้ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 3 ก.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"qVvS1bnS-cM","d":"2021-06-27","t":"มีชีวิตอยู่กับความจริงในปัจจุบัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"VTH45depx3U","d":"2021-06-27","t":"ทำไมรู้ทันความโกรธแล้วไม่หายโกรธ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"usoYIqElwMI","d":"2021-06-27","t":"สอนจิตให้ยอมรับความจริง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"dyeEGV_AbWQ","d":"2021-06-26","t":"สติครอบคลุมองค์มรรคทั้งหมด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"4loQ6jBObXQ","d":"2021-06-26","t":"มีสติคือมีความเพียรชอบ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"h_3lFMl-6jg","d":"2021-06-26","t":"ตัวสติสำคัญมาก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"7sLjrzz5yQc","d":"2021-06-20","t":"สติปัฏฐาน 4 ทำที่สุดแห่งทุกข์ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"F5Hg-u8gk-s","d":"2021-06-20","t":"ขาดสมาธิไม่ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"pxHZwg4x5bc","d":"2021-06-19","t":"สมถะกับวิปัสสนาทิ้งกันไม่ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"lyqSrQMCgWQ","d":"2021-06-13","t":"ความเด็ดเดี่ยวมุ่งมั่นสำคัญมาก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"fgW5SkmEqKg","d":"2021-06-13","t":"13/06/2021 จิตเป็นกุญแจของการปฏิบัติ (The mind is the key to practice)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"F2rgCrfe45g","d":"2021-06-13","t":"เริ่มที่จิต จบที่จิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"vvvOrlOFZCk","d":"2021-06-12","t":"การเจริญเมตตา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"78F9oPnIMN0","d":"2021-06-12","t":"มงคลไม่ได้อยู่ที่วัตถุ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"w6iYNwB663I","d":"2021-06-12","t":"คนทะเลาะกันเพราะตัณหาและทิฏฐิ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"hIYJw0SL3wU","d":"2021-06-06","t":"ฟังธรรมะของจริงในใจเรา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"KMdXJ5Aj-gM","d":"2021-06-06","t":"วิธีฟังธรรมให้ถึงธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"4iMHOqCoVIM","d":"2021-06-06","t":"วิธีปฏิบัติธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"gWMC1HTUjAs","d":"2021-06-05","t":"กิเลส 3 ระดับ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 มิ.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"5syF_ksofbY","d":"2021-05-30","t":"ใช้สติใช้ปัญญาสอดส่องจิตใจตัวเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 พ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"b23bfMi71QQ","d":"2021-05-30","t":"30/05/2021 ฟังจิตตัวเองให้ดี (Listen to your mind)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"PFPxQmvB2B0","d":"2021-05-29","t":"The 8 Worldly Conditions :: Luangpor Pramote Pamojjo 29 May 21","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"DZYsBinawEk","d":"2021-05-23","t":"ถ้าทิ้งรูปแบบ จิตจะไม่มีแรง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 พ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"5VbYUuZYi9c","d":"2021-05-22","t":"มีสติรักษาจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 พ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"9Uxmxn3CzNY","d":"2021-05-22","t":"ศีลอัตโนมัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 พ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"0qyjQhIK2cw","d":"2021-05-16","t":"ทำอย่างไรจะไม่ทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 พ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"xYyfrWYQhSg","d":"2021-05-15","t":"ใจที่พร้อมรับธรรมะ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 พ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"1np6on2_Tro","d":"2021-05-15","t":"บ้านที่แท้จริง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 พ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ZnlHkZd0d7M","d":"2021-05-09","t":"The Mind and Object are a Pair :: Luangpor Pramote Pamojjo 9 May 2021","sp":"lp","cnYt":"https://www.youtube.com/watch?v=jUkafIMp8tE","thMp3":"","cnMp3":""},
    {"id":"_AWOBgZnxBA","d":"2021-05-09","t":"อย่าทิ้งเวลาให้ตายเปล่า :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 พ.ค. 2564","sp":"lp","cnYt":"https://www.youtube.com/watch?v=jUkafIMp8tE","thMp3":"","cnMp3":""},
    {"id":"3KRzd9k7944","d":"2021-05-08","t":"มีแรงแล้วรีบดู :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 พ.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"uhj_G1yHK64","d":"2021-04-30","t":"ธรรมะอยู่ที่ตัวเราเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Jzk1YBuycmU","d":"2021-04-30","t":"จิตติดสมาธิไม่ยอมเดินปัญญา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"W1G_fNAkZB0","d":"2021-04-25","t":"เรียนรู้ที่ตัววุ่นวาย :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"SknDFBtDTVw","d":"2021-04-25","t":"25/04/2021 จิตอยู่ที่ไหน (Where is the mind)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"LxF2KcTtBMc","d":"2021-04-24","t":"ฆ่าตัวตายอย่างไรก็บาป :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Zy5XH09S7OI","d":"2021-04-24","t":"ไม่ประมาทแต่ไม่กังวล :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"OlaI5mbDkfk","d":"2021-04-24","t":"ฆ่าตัวตายเป็นบาป :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"lD7Um3q9rM0","d":"2021-04-18","t":"ทำเหตุมากก็มีผลมาก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"j2YtzQ_1d8U","d":"2021-04-18","t":"สมาธิที่ไม่หลงอารมณ์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"MR8Y_H8T9V0","d":"2021-04-17","t":"ขาดสติคือขาดการปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"pi2RK3fyfAA","d":"2021-04-17","t":"ขาดสติคือขาดการปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"EgzwbtRMfvY","d":"2021-04-11","t":"ปัจจุบันขณะ – ปัจจุบันสันตติ :: หลวงพ่อปราโมทย์ 11 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Osc23Bu1dVA","d":"2021-04-11","t":"อยู่กับปัจจุบัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"AOrw_1cM4qc","d":"2021-04-11","t":"ปล่อยวางตามจริตนิสัย :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"bzBcJYgkP1w","d":"2021-04-10","t":"การปฏิบัติ 3 แนวทาง :: หลวงพ่อปราโมทย์ 10 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"z0TbZucwWyM","d":"2021-04-10","t":"ปัญญาและสมาธิควบกัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ZCVFU6I1EUY","d":"2021-04-10","t":"สมาธินำปัญญา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"78-2sON7EkQ","d":"2021-04-04","t":"อินทรีย์กล้าขึ้นจึงเดินปัญญาได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"j_Zf7wCR6EE","d":"2021-04-04","t":"ยาถูกโรค :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"0o8tDOOgr_w","d":"2021-04-03","t":"เลือกชัยภูมิให้เหมาะ :: หลวงพ่อปราโมทย์ 3 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Bfkmg1EwdWE","d":"2021-04-03","t":"เลือกชัยภูมิที่เราทำสงครามได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 3 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"6Qny08Q3DAA","d":"2021-04-03","t":"หัดว่ายน้ำก่อนตกน้ำ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 3 เม.ย. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ekdIREonNnE","d":"2021-03-28","t":"การปฏิบัติธรรมมี 2 ขั้นตอนเท่านั้น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"3fuhB3i8nSE","d":"2021-03-27","t":"ความเห็นผิดลดลง ทุกข์ก็ลดลง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"fdVc69Id-Uk","d":"2021-03-27","t":"ดูตัวเองดีกว่าคอยจับผิดคนอื่น :: หลวงพ่อปราโมทย์ 27 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"jj3DXU2yhEM","d":"2021-03-21","t":"สมถและวิปัสสนากรรมฐาน :: หลวงพ่อปราโมทย์ 21 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"U3DRCQt_mDA","d":"2021-03-21","t":"หัดทีแรกอะไรก็ยากทั้งนั้น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"iqQrqQIxgXs","d":"2021-03-21","t":"ไม่มีใครสั่งอริยมรรคให้เกิดได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"avRAyK_izyg","d":"2021-03-20","t":"ความสุขมีหลายระดับ :: หลวงพ่อปราโมทย์ 20 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"I2_iJPujY30","d":"2021-03-20","t":"ไม่เห็นไตรลักษณ์ยังไม่ได้ทำวิปัสสนา :: หลวงพ่อปราโมทย์ ปาโมชฺโช  20 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"qgmSgUxKNw0","d":"2021-03-14","t":"ยากเพราะไม่ยอมดูตัวเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"lQFCF5oVxoI","d":"2021-03-14","t":"14/03/2021 ไม่สนใจตัวเองคือไม่ได้ปฏิบัติ (Seeing Suffering)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"nrG2O9JfMHM","d":"2021-03-13","t":"ศีลไม่ดี สมาธิจะเสื่อม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"o3xV1EJZHZk","d":"2021-03-13","t":"การทำในรูปแบบสำคัญ  :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ROlJSQ9hNBY","d":"2021-03-07","t":"อยากมีความสุขต้องรู้จักพอ :: หลวงพ่อปราโมทย์ 7 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"yGeQnNWGsGA","d":"2021-03-07","t":"ยึดถือความคิดความเห็น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"8eZCBibWFoo","d":"2021-03-06","t":"06/03/2021 ใจดิ้นรนเพราะยึดถือ (The struggle of mind stems from attachment)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"PvmwNZFIlY4","d":"2021-03-06","t":"ตัดตรงที่ต้นตอ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 มี.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"pQJttHjHMHY","d":"2021-02-28","t":"28/02/2021 ยิ่งเห็นทุกข์ยิ่งมีความสุข (Suffering when Seen leads to Happiness)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Hik5vu3pOzs","d":"2021-02-28","t":"ตื่นจากความฝัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"U5YvHmubSWA","d":"2021-02-28","t":"เผชิญหน้ากับกิเลสของตัวเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Mno025hh214","d":"2021-02-27","t":"ธรรมเป็นของจริง ต้องทำจริง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"t0gOxxnnpfw","d":"2021-02-27","t":"27/02/2021 เห็นจิตเป็นทุกข์จึงปล่อยวางจิต (How to free ourself from suffering)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Gn3otojBxNk","d":"2021-02-26","t":"ฝึกจิตที่ผ่องใสให้ผ่องแผ้ว :: หลวงพ่อปราโมทย์ 26 ก.พ. 2564 (640226 ซีดี 89)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"OEjHP6b-XSk","d":"2021-02-26","t":"ใช้โยนิโสมนสิการสังเกตเอา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"_0wtH8yj3pc","d":"2021-02-21","t":"คนในโลกเต็มไปด้วยความเห็นผิด :: หลวงพ่อปราโมทย์ 21 ก.พ. 2564 (640221 ซีดี 89)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"htHZ1f9eyGU","d":"2021-02-21","t":"สัญญาวิปลาส :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"LO-WcgzuCmU","d":"2021-02-20","t":"จิตเป็นธรรมชาติที่บังคับไม่ได้แต่ฝึกได้ :: หลวงพ่อปราโมทย์ 20 ก.พ. 2564 (640220 ซีดี 89)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"9RO5gTdVV1U","d":"2021-02-20","t":"ฝึกให้จิตมีปัญญา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"DATWrE0xxpg","d":"2021-02-20","t":"เมื่อวางตัวทุกข์จึงพ้นทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"2h3QC-x3dgg","d":"2021-02-14","t":"ไหว้พระสวดมนต์อย่างชาวพุทธ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"-FiULJugrwk","d":"2021-02-14","t":"เรียนย่อลงมาที่กายกับใจ :: หลวงพ่อปราโมทย์ 14 ก.พ. 2564 (640214 ซีดี 89)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"FOYpaff60VY","d":"2021-02-13","t":"ประโยชน์ของสมาธิภาวนา :: หลวงพ่อปราโมทย์ 13 ก.พ. 2564 (640213 ซีดี 89)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"rv3DZ40Y3dQ","d":"2021-02-13","t":"ประโยชน์ที่ยิ่งใหญ่ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"sS0JvKnXaiU","d":"2021-02-07","t":"กุญแจไขตู้พระไตรปิฏก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"m3GeQEcq7pc","d":"2021-02-07","t":"อย่าทิ้งโอกาสอันได้มายากให้สูญเปล่า :: หลวงพ่อปราโมทย์ ปาโมชโชฺ 7 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"6Zu3vyONLJE","d":"2021-02-07","t":"07/02/2021 อย่าทิ้งโอกาสให้สูญเปล่าไป (Take this Rare Opportunity)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"8c2MFh13Nxs","d":"2021-02-06","t":"สังเกต และค่อยๆ ปรับ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"zpjg1ek4zSg","d":"2021-02-06","t":"จุดอ่อนของฆราวาส :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 ก.พ. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"DtXQ8dDp8wc","d":"2021-01-31","t":"31/01/2021 อินทรีย์แก่กล้าจึงสักว่ารู้ว่าเห็น (Impartiality)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"xA5meHNiY0Y","d":"2021-01-31","t":"ยอมรับความจริง จิตจึงเป็นกลาง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"iAc079Y_Ozw","d":"2021-01-31","t":"พาหิยสูตร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"N90-jqOfv8M","d":"2021-01-30","t":"วิธีฝึกสมาธิชั่วขณะ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"n_-2Qj3dGmw","d":"2021-01-30","t":"เอากิเลสมารีไซเคิล :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"WNjqJKC_UQE","d":"2021-01-24","t":"ฝึกลดละความเห็นแก่ตัว :: หลวงพ่อปราโมทย์ 24 ม.ค. 2564 (640124 ซีดี 88)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"-8btnk9DAh0","d":"2021-01-24","t":"แบ่งเวลาให้เป็น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"F8RsY9TMT_s","d":"2021-01-23","t":"มรรคมีองค์ 8 คือทางสายกลาง :: หลวงพ่อปราโมทย์ 23 ม.ค. 2564 (640123 ซีดี 88)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"0VBqk5b7ICQ","d":"2021-01-17","t":"ทุกอย่างต้องมีเหตุ :: หลวงพ่อปราโมทย์ ปาโมขฺโช 17 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Y2ABocEAo-Q","d":"2021-01-17","t":"กระบวนการตัดสินความรู้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"CBaSXpKZHUg","d":"2021-01-17","t":"17/01/21 รูปนามทั้งหมดตกอยู่ใต้ไตรลักษณ์ (All States Come and Go)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ji6F-qbj1vM","d":"2021-01-16","t":"หัดหมายรู้ให้ถูกต้อง :: หลวงพ่อปราโมทย์ 16 ม.ค. 2564 (640116 ซีดี 88)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"OP0WlJCxA5Y","d":"2021-01-16","t":"อินทรีย์ละเอียดก็ได้ของละเอียด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"-5u60683XRs","d":"2021-01-10","t":"อิทธิบาทคือธรรมะที่ทำให้ประสบความสำเร็จ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"cukff7X-oPM","d":"2021-01-10","t":"10/01/2021 มีฉันทะในการภาวนา (Satisfied by Practice, Not Results)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"jTHN2a3FBb4","d":"2021-01-09","t":"กรรมฐานช่วงโควิด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"e0GgQaqg3Ag","d":"2021-01-09","t":"ไม่มีเราที่ไหนเลย :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"X5nPTQt3Ne0","d":"2021-01-01","t":"01/01/2021 เราหลงโลกที่ว่างเปล่า (We indulge in the empty world)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"JPuJDPLeD2s","d":"2021-01-01","t":"สัมมาทิฏฐิ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"-5RUJHWXbEQ","d":"2021-01-01","t":"ชีวิตเหมือนความฝัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 ม.ค. 2564","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"8azdCqu095I","d":"2020-12-31","t":"พรปีใหม่ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"HIcIccaWteg","d":"2020-12-31","t":"ภาวนาไปแล้วชีวิตจะไม่ขาดทุน :: หลวงพ่อปราโมทย์ 31 ธ.ค. 2563 (ไฟล์ 631231 ซีดี 88)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"h2k_1Jage-g","d":"2020-12-27","t":"อยู่กับโลกแบบบัวไม่เปียกน้ำ :: หลวงพ่อปราโมทย์ 27 ธ.ค. 2563 (ไฟล์ 631227 ซีดี 88)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"rbQ5TCCTF-Q","d":"2020-12-27","t":"พ้นโลกได้เพราะเห็นจิตคือตัวทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"EtzURJpjtyk","d":"2020-12-27","t":"สิ่งที่โลกมีคือความทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"og5FLJogTPM","d":"2020-12-26","t":"ชาร์จพลังให้จิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"hzFaAeNv20U","d":"2020-12-26","t":"จิตผู้รู้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"iaqeyZzUKM8","d":"2020-12-20","t":"ไม่คิดจะสู้ ก็สู้ไม่ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"uzOzyW2qMcg","d":"2020-12-20","t":"แก้ที่ตัวเองก่อน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"KhxSVtlYO_A","d":"2020-12-19","t":"จิตเป็นตัวทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"RJoyzMC64Kg","d":"2020-12-19","t":"สมาธิที่ใช้เดินปัญญา :: หลวงพ่อปราโมทย์ 19 ธ.ค. 2563 (ไฟล์ 631219 ซีดี 88)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"1LmfT7qy9tQ","d":"2020-12-19","t":"สมาธิที่ถูกต้อง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"S4mlxjuaYyU","d":"2020-12-19","t":"ศีลเป็นเรื่องจำเป็น :: พระอาจารย์สมชาย 19 ธ.ค. 63 (sci631219)","sp":"other","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"QxhKnVwqJ5s","d":"2020-12-13","t":"เรียนกรรมฐานเหมือนทำงานวิจัย :: หลวงพ่อปราโมทย์ 13 ธ.ค. 2563 (ไฟล์ 631213 ซีดี 88)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"uFBBgaxhiS0","d":"2020-12-13","t":"ดูของจริงจะเห็นความจริง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"IVKZl5bvOVE","d":"2020-12-13","t":"เรียนแบบสุ่มตัวอย่าง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"eAfVYw47eoc","d":"2020-12-12","t":"เตรียมตัวตาย :: หลวงพ่อปราโมทย์ 12 ธ.ค. 2563 (ไฟล์ 631212 ซีดี 88)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"gBkCS6ZgsRs","d":"2020-12-12","t":"เตรียมตัวผ่านสงครามครั้งใหญ่ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"opmwsFs0bFY","d":"2020-12-12","t":"ความตายคือภาวะขันธ์แตก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"iYMpDZTPRj4","d":"2020-12-12","t":"ฝึกสัมมาสมาธิให้เกิดง่าย :: พระอาจารย์สมชาย  12 ธ.ค. 63 (sci631212)","sp":"other","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"LihHI6oAqd0","d":"2020-12-06","t":"ทุกข์ให้รู้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"eaWe7pNK4oM","d":"2020-12-06","t":"ถ้าไม่สู้ก็แพ้ตลอดกาล :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"z7V8biXFjtU","d":"2020-12-05","t":"รู้ทันตัณหา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"aPuV_iKTy8w","d":"2020-12-05","t":"ตายให้เป็น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 ธ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"1zyfEqEVvk0","d":"2020-11-29","t":"โลกไม่เคยสงบสุขจริง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"cur_0_cKQeY","d":"2020-11-29","t":"29/11/2020 โลกวุ่นวายไปตามธรรมดาของโลก (Naturally, The World is Chaotic)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"WQDpOkiG1MI","d":"2020-11-29","t":"การจัดการกับกรรมเก่า :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"SvTd2TXxtm8","d":"2020-11-28","t":"ผู้รู้ :: พระอาจารย์สมชาย 28 พ.ย. 2563 (sci631128)","sp":"other","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"j56oDDH1LS0","d":"2020-11-28","t":"ศัตรูอยู่ในใจเรา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"erCLygpWBbY","d":"2020-11-28","t":"อย่าไว้ใจกิเลส :: หลวงพ่อปราโมทย์ 28 พ.ย. 2563 (ไฟล์ 631128 ซีดี 88)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"M17eF7GgieM","d":"2020-11-28","t":"ฝึกความเคยชินใหม่ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"-tZjwIo486Q","d":"2020-11-26","t":"ไปตามทางที่เราเลือกของเราเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"fPJazrhJ6ro","d":"2020-11-22","t":"เกิดปัญญาจากการเห็นกายและใจ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"9dyhxf2ZDqY","d":"2020-11-21","t":"จิตเป็นผู้รู้อารมณ์ :: หลวงพ่อปราโมทย์ 21 พ.ย. 2563 (ไฟล์ 631121 ซีดี 88)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"lvPxY_G9CF0","d":"2020-11-21","t":"ไม่มีสัมมาสมาธิ ล้างกิเลสไม่ได้ :: พระอาจารย์สมชาย 21 พ.ย. 2563 (sci631121)","sp":"other","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"HMJcO4RL0n4","d":"2020-11-15","t":"พระพุทธเจ้าสอนให้เราหายโง่ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"FyWPgjhOk58","d":"2020-11-15","t":"เป็นกลางด้วยปัญญาอันยิ่ง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"MHeBqw0PoM8","d":"2020-11-14","t":"14/11/2020 เมตตาเป็น ชีวิตก็ร่มเย็นเป็นสุข (Loving kindness and a peaceful mind)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"8hJHBdfWQVw","d":"2020-11-14","t":"วิธีฝึกใจให้เมตตา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"58yRMnyVd5w","d":"2020-11-14","t":"ฝึกสมาธิที่ถูกต้อง :: พระอาจารย์สมชาย กิตฺติญาโณ 14 พ.ย. 2563 (sci631114)","sp":"other","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"NbnbeydB8jk","d":"2020-11-08","t":"ขันธ์ 5 ไม่ใช่เรา :: หลวงพ่อปราโมทย์ 8 พ.ย. 2563 (ไฟล์ 631108 ซีดี 88)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"M3Wzw_7zkV8","d":"2020-11-08","t":"ทำกรรมฐานเป็นเหยื่อล่อจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"aAsX-lFBLKo","d":"2020-11-08","t":"ผู้รู้และสิ่งที่ถูกรู้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"k9Gic0iL6Cg","d":"2020-11-07","t":"ทำไมต้องฝึกในรูปแบบก่อน ? :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"COtquGvGASg","d":"2020-11-07","t":"ความเพียรที่แท้จริง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"KhQvXkH2lbE","d":"2020-11-01","t":"ประตูเมือง 4 ทิศ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 พ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"GiDg8Vsh0uQ","d":"2020-10-31","t":"เริ่มต้นถึงรู้แจ้ง :: หลวงพ่อปราโมทย์ 31 ต.ค. 2563 (ไฟล์ 631031 ซีดี 87)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"AFc7HFBw9os","d":"2020-10-31","t":"รีบภาวนาก่อนศาสนาจะหมดไป :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"QhuYVD-gMTg","d":"2020-10-31","t":"เส้นทางที่พระอริยเจ้าเดินมา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"fjMNuxp7Q7U","d":"2020-10-25","t":"25/10/2020 ยึดถือมากก็ทุกข์มาก (Suffering worsens the tighter we cling)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"MnhOENdBnRw","d":"2020-10-25","t":"ต้องรีบปฏิบัติแล้ว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"9tozNZDRpVw","d":"2020-10-25","t":"ถ้าไม่แบกก็ไม่หนัก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"XBsH2Yewxk8","d":"2020-10-24","t":"สังขารุเปกขาญาณ :: หลวงพ่อปราโมทย์ 24 ต.ค. 2563 (ไฟล์ 631024 ซีดี 87)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"21BZTgvEHfM","d":"2020-10-18","t":"รู้กิเลสอย่างที่มันเป็น :: หลวงพ่อปราโมทย์ 18 ต.ค. 2563 (ไฟล์ 631018 ซีดี 87)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"9YmY8ukhIlU","d":"2020-10-18","t":"ทำอย่างไรเมื่อเผชิญวิกฤตชีวิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"qVhRe-mEzbo","d":"2020-10-18","t":"ไม่ต่อต้านและไม่คล้อยตามกิเลส :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"lqi6wUVbENo","d":"2020-10-17","t":"บริกรรมอย่างไรดีกว่ากัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช  17 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Ss3oddsvLmE","d":"2020-10-17","t":"อยากเห็นความจริงต้องอยู่กับปัจจุบันให้ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 17 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ASVAUv4admQ","d":"2020-10-13","t":"13/10/2020 อยู่บ้านให้เหมือนอยู่วัด (To Measure Your Mind)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"HL2alQahYiA","d":"2020-10-10","t":"10/10/2020 แยกจิตออกจากขันธ์ (Observe your body and its sensations)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"t8tQoLQy5fM","d":"2020-10-10","t":"สัญญาวิปลาส :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"RyyFU7aJc-k","d":"2020-10-10","t":"ร่างกายไม่ใช่เรา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"lvt8JH71n-4","d":"2020-10-04","t":"ทำบุญอย่างฉลาด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ZVYYo778rKU","d":"2020-10-04","t":"อะไรอยู่เบื้องหลังการกระทำ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"nZK97LEW2oA","d":"2020-10-03","t":"3/10/2020 จิตผู้รู้ (The knowing mind)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"c2qeJpqCt9I","d":"2020-10-03","t":"สั่งจิตให้ดีไม่ได้ แต่ฝึกให้ดีได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 3 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"K-aE4vGHHDI","d":"2020-10-03","t":"วิปัสสนาเริ่มเมื่อหมดความคิด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 3 ต.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"SQNwAh-Qkhw","d":"2020-09-27","t":"เสมอกันด้วยความเป็นไตรลักษณ์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 ก.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"8G4FWG2hxQM","d":"2020-09-27","t":"ทุกสิ่งมาแล้วไปทั้งสิ้น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 27 ก.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"2-QbJgKJdq8","d":"2020-09-26","t":"ทางสายกลาง :: หลวงพ่อปราโมทย์ ปาโมชฺโช  26 ก.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"4zJrCB1hWVs","d":"2020-09-20","t":"ทุกอย่างเปลี่ยนแปลงเป็นธรรมดา :: หลวงพ่อปราโมทย์ 20 ก.ย. 2563 (ไฟล์ 630920 ซีดี 87)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"5JAAZZG2V4k","d":"2020-09-20","t":"ธรรมดาของโลก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 ก.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"IKS6zH85Snc","d":"2020-09-19","t":"มีลมหายใจเป็นเพื่อนจนวันตาย :: หลวงพ่อปราโมทย์ 19 ก.ย. 2563 (ไฟล์ 630919 ซีดี 87)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Ev1YWvT6sFk","d":"2020-09-19","t":"รู้กายเพื่อให้เห็นจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 ก.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"DzfulKkJNwY","d":"2020-09-13","t":"13/09/2020 วิธีแยกขันธ์ (How to separate the 5 aggregates)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"iHwXXg5WMxQ","d":"2020-09-13","t":"แยกขันธ์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 ก.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"EJjaMa03M5E","d":"2020-09-13","t":"ขันธ์ 5 ไม่ใช่ของดี :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 ก.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"_H3B5pEwMPI","d":"2020-09-12","t":"12/09/20 เห็นทุกข์จึงละได้ :: Seeing Dukkha (suffering) allows us to let go","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"b9Wc0-5iaCQ","d":"2020-09-12","t":"งานหลักของชาวพุทธ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ก.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"jkoRvY2zj7w","d":"2020-09-12","t":"ปฏิจจสมุปบาท :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ก.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"bCrvqniavOk","d":"2020-09-06","t":"ช่วยเหลือคนอื่นแค่ไหนพอดี :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 ก.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Ky-QEKjD-z8","d":"2020-09-06","t":"6/09/2020 สู้กับตัณหาด้วยสติและปัญญา (The Desires that Cause Suffering)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"dIcCijjUWws","d":"2020-09-06","t":"ทำอย่างไรให้มีจิตที่ตั้งมั่น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 ก.ย 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"7JUb77znvHg","d":"2020-09-05","t":"05/09/2020 - ขันธ์ 5 ทั้งหมดไม่เที่ยง (The Five Aggregates Are Under the Three Characteristics)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"EykWw5Ibq_c","d":"2020-08-30","t":"ทางสายกลางคือรู้อย่างที่มันเป็น :: หลวงพ่อปราโมทย์ 30 ส.ค. 2563 (ไฟล์ 630830 ซีดี 87)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"SfecUec3R_4","d":"2020-08-30","t":"ทางสายกลางคือรู้อย่างที่มันเป็น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"5PrY2BmEqB4","d":"2020-08-29","t":"29/08/2020 สติคือสิ่งจำเป็นตลอดสายของการปฏิบัติ(Mindfulness is essential for all levels of practice)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"XoqPQH9G51Y","d":"2020-08-29","t":"ฝึกที่จะลดละกิเลส เจริญกุศล :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"GPtheUSQlzo","d":"2020-08-23","t":"23/08/2020 รู้ทุกข์แจ่มแจ้ง คือถึงที่สุดแห่งทุกข์ (Seeing dukkha will end the cycle of suffering)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Upow_634hGc","d":"2020-08-23","t":"ไม่รู้ทุกข์ ไม่รู้ธรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"2sSjt5Fjn5A","d":"2020-08-22","t":"เวลาภาวนาอย่าโลภ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"bGK4u9T8TnA","d":"2020-08-16","t":"ความวิตกกังวลขัดขวางการภาวนาไหม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"X6HAkbuDXa8","d":"2020-08-16","t":"สติจำเป็นในที่ทุกสถาน ในกาลทุกเมื่อ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"3QFzd7FzWW8","d":"2020-08-16","t":"หลักสูตรของหลวงพ่อ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"YcAUa2gg7Dc","d":"2020-08-15","t":"ถ้าปฏิบัติถูก ตัวกูจะเล็กลง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"RcjcuNqD5g0","d":"2020-08-15","t":"เล่นอินเทอร์เน็ต ผลาญสติ สมาธิ ปัญญา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"n-t93JkmU90","d":"2020-08-09","t":"เลือกกรรมฐานที่เหมาะกับตน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"PVritsRRTPI","d":"2020-08-08","t":"08/08/2020 ความขี้เกียจไม่เคยพาใครให้ได้ดี (Laziness never leads to anything good)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"jPQicylRSpY","d":"2020-08-02","t":"คำถามเป็นส่วนเกินของนักปฏิบัติ  :: หลวงพ่อปราโมทย์ ปาโมชฺโช 2 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"t4lYUcqMDlI","d":"2020-08-02","t":"2/8/2020 คำสอนหลวงปู่ - อย่าส่งจิตออกนอก (The Ways of The Great Masters)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"39vXlaZqeKQ","d":"2020-08-02","t":"ธรรมะเกิดที่จิตทั้งนั้น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 2 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"grOakfBVeWw","d":"2020-08-01","t":"01/08/2020 วิธีเรียนธรรมะทำอย่างไร (How to study Dhamma?)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"AMZIXEL21TE","d":"2020-08-01","t":"อายุเยอะขึ้นยิ่งภาวนายาก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 ส.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"QEJCL82ylXI","d":"2020-07-26","t":"เคล็ดลับทำสมาธิแบบรวดเร็ว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 ก.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"-0StMrl0tYg","d":"2020-07-25","t":"25/07/2020 มีต้นทุนแล้วต้องต่อยอดด้วยความพากเพียร (Develop diligently from your endowments)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"5_M_MihKuEk","d":"2020-06-13","t":"13/06/2020 ทำกรรมฐานที่เราทำได้ (Practice What Suits Oneself)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"sOzMGnEr49I","d":"2020-06-07","t":"จุดตั้งต้นทั้งหมดมาจากสติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 มิ.ย. 2563 (ไฟล์ 630607)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"oKPWnxWK21w","d":"2020-06-07","t":"จุดตั้งต้นทั้งหมดมาจากสติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 มิ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"eTCBXpD6lVQ","d":"2020-06-07","t":"หลักของการดูจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช  7 มิ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"m1U3cHpFHpQ","d":"2020-06-06","t":"ทำหน้าที่ให้ครบ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 มิ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Uuv93fkFHbI","d":"2020-06-06","t":"เป้าหมายคือปฏิบัติเพื่อความพ้นทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 มิ.ย. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"wzTRo3XqqDg","d":"2020-05-31","t":"ธรรมะเพื่ออยู่กับโลก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 พ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"RgXhc6tllf4","d":"2020-05-31","t":"31/05/2020 โลกธรรม 8 ประการ (Eight Worldly Certainties)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"pwuS1fnt9GA","d":"2020-05-30","t":"เรียนธรรมะ เพื่อให้ใจเข้าถึงความเป็นธรรมดา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 พ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"06IDaW25lQA","d":"2020-05-30","t":"ภาระทางใจคือตัวทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 พ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Qk-69FND0O8","d":"2020-05-24","t":"อย่าอ้างว่าไม่มีเวลา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 พ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"162HlZU0UnM","d":"2020-05-24","t":"24/05/2020 สมาธิชนิดสงบ สมาธิชนิดตั้งมั่น (Meditation for Relaxation, Meditation for Vipassana)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"JgMiMJ1d2T4","d":"2020-05-23","t":"ตั้งใจฟังธรรมเพื่อธรรมะ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 พ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"LTIZh0P51eM","d":"2020-05-23","t":"เรียนเพื่อให้เห็นความจริงของกายของใจ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 พ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"52j7_ht-avg","d":"2020-05-18","t":"เรียนจากงานศพ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 พ.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"BJ8J9FmRWBA","d":"2020-05-18","t":"18/05/2020 เรียนรู้จากงานศพ (Lesson from Funeral)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"hMRGPDyvCLU","d":"2020-02-23","t":"การภาวนาต้องทุ่มเท :: หลวงพ่อปราโมทย์ 23 ก.พ. 2563 (ไฟล์ 630223B ซีดี 86)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"xgx8RJmHelU","d":"2020-02-23","t":"การปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 ก.พ. 63","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"abtwTMBxrsM","d":"2020-02-22","t":"กวาดบ้านให้เป็นการปฏิบัติธรรม :: หลวงพ่อปราโมทย์ 22 ก.พ. 2563 (ไฟล์ 630222B ซีดี 86)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"xJM3b1wUa_8","d":"2020-02-22","t":"หลักปฏิบัติขั้นต้น :: หลวงพ่อปราโมทย์ 22 ก.พ. 2563 (ไฟล์ 630222A ซีดี 86)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"-stVj9omPQA","d":"2020-02-22","t":"วัฏฏะสงสารหมุนอยู่กลางอก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 ก.พ. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"3t1YjQV5_x4","d":"2020-02-22","t":"รู้ด้วยใจจะจำข้ามภพข้ามชาติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 ก.พ. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"h--TYIwnyTc","d":"2020-02-16","t":"วิธีจะออกจากวัฏฏะ :: หลวงพ่อปราโมทย์ 16 ก.พ. 2563 (ไฟล์ 630216 ซีดี 86)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"r9uJEd-6_Cc","d":"2020-02-16","t":"ภัยในวัฏฏะ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 16 ก.พ.2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"3SZRVgAj_fQ","d":"2020-02-15","t":"สภาวะจะสอนธรรมะเราเอง :: หลวงพ่อปราโมทย์ 15 ก.พ. 2563 (ไฟล์ 630215A ซีดี 86)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"cC36MYqYz6I","d":"2020-02-09","t":"สงบสุขท่ามกลางความวุ่นวาย :: หลวงพ่อปราโมทย์ ปาโมชฺโช  9 ก.พ. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"DZhdCjO2bB8","d":"2020-02-08","t":"พัฒนาการปฏิบัติของเราเป็นขั้นตอน :: หลวงพ่อปราโมทย์ 8 ก.พ. 2563 (ไฟล์ 630208A ซีดี 86)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"WlOknFDqKNo","d":"2020-02-08","t":"ติดความสงบต้องระวัง :: หลวงพ่อปราโมทย์ 8 ก.พ. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"sE4p8kVl18U","d":"2020-02-08","t":"หลงทางใจที่เกิดบ่อย คือหลงคิด :: หลวงพ่อปราโมทย์ ปาโมชฺโช  8 ก.พ. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"_GIp1U3RaLo","d":"2020-02-01","t":"คุ้มครองรักษาจิตได้ จะพ้นจากบ่วงแห่งมาร :: หลวงพ่อปราโมทย์ 1 ก.พ. 2563 (ไฟล์ 630201A ซีดี 86)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"1qjxI8TdZKQ","d":"2020-02-01","t":"สติ :: หลวงพ่อปราโมทย์ ปาโมชโช  1 ก.พ. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"AN4y2nWOzNc","d":"2020-01-26","t":"วิธีอยู่เหนือโลก-เข้าถึงโลกุตระ :: หลวงพ่อปราโมทย์ 26 ม.ค. 2563 (ไฟล์ 630126 ซีดี 86)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"sFaliD207Es","d":"2020-01-26","t":"อยู่เหนือโลกให้ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 26 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ErHSFGaZzTo","d":"2020-01-26","t":"กิเลสบงการใจ :: หลวงพ่อปราโมทย์ ปาโมชโช  26 ม.ค.2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"igpJVRbEchw","d":"2020-01-25","t":"ดูจิตไม่ได้ดูด้วยลูกตา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 25 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"XytKzrWUgAw","d":"2020-01-25","t":"เจริญสติคือหัดอ่านสภาวธรรม :: หลวงพ่อปราโมทย์ 25 ม.ค. 2563 (ไฟล์ 630125A ซีดี 85)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"5QMrZy2x-vA","d":"2020-01-23","t":"ธรรมะฝ่ายกุศลรวมลงที่จิตด้วยสัมมาสมาธิ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 มกราคม 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"YAFZPh_id-I","d":"2020-01-19","t":"หมาบ้างับไม้ค้อน :: หลวงพ่อปราโมทย์ 19 ม.ค. 2563 (ไฟล์ 630119B ซีดี 85)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"AMWq4UrdZYk","d":"2020-01-19","t":"สติมีเหตุ สติถึงเกิด :: หลวงพ่อปราโมทย์ ปาโมชโช 19 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"YdFgRhxrI5w","d":"2020-01-19","t":"เกรดของโมหะ :: หลวงพ่อปราโมทย์ ปาโมชโช 19 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"nWbS6_cdIJE","d":"2020-01-18","t":"รูปธรรม นามธรรมสอนไตรลักษณ์ :: หลวงพ่อปราโมทย์ 18 ม.ค. 2563 (ไฟล์ 630118A ซีดี 85)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ieEgLyRXh-c","d":"2020-01-18","t":"ทำอย่างไรศรัทธาถึงจะเกิด? :: หลวงพ่อปราโมทย์ ปาโมชโช 18 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"sp4FHvRwbw8","d":"2020-01-18","t":"เวทนาเกิดร่วมกับจิตทุกดวง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"47j_Z_Rc5iE","d":"2020-01-12","t":"ดูเวทนาทางใจ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"tm_wGSlM-no","d":"2020-01-12","t":"วิธีฝึกสมถกรรมฐาน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"fTh88845Ot8","d":"2020-01-11","t":"ฝึกทำกรรมฐานแล้วรู้ทันจิต :: หลวงพ่อปราโมทย์ 11 ม.ค. 2563 (ไฟล์ 630111A ซีดี 85)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"hY89wmzp5mo","d":"2020-01-11","t":"ลีลาของจิตไหล :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"pZbWQx_K3ow","d":"2020-01-11","t":"เลือกเปลือกให้พอดีกับตัวเอง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 11 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"C4eE2qX0qmM","d":"2020-01-11","t":"ตรวจสอบผลการปฏิบัติของตัวเอง :: หลวงพ่อปราโมทย์ 11 ม.ค. 2563 (ไฟล์ 630111B ซีดี 85)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"4oz5S8D8o1k","d":"2020-01-05","t":"รู้ทันความอยาก :: หลวงพ่อปราโมทย์ 5 ม.ค. 2563 (ไฟล์ 630105A ซีดี 85)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"xJt70o9s0L8","d":"2020-01-05","t":"พุทโธให้เป็น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ovyp1wU3-JM","d":"2020-01-05","t":"ธรรมะที่ทำให้เราประสบความสำเร็จ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"AKQU7sEHs7M","d":"2020-01-04","t":"ไม่มีคำว่าแก้ในวิปัสสนากรรมฐาน :: หลวงพ่อปราโมทย์ 4 ม.ค. 2563 (ไฟล์ 630104B ซีดี 85)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"zJjRRBFSpig","d":"2020-01-04","t":"ไม่มีสิ่งที่เรียกว่าตัวตนถาวร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 4 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"RxF4__HdHA8","d":"2020-01-04","t":"หัวใจของการปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชโช 4 ม.ค.2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"xlLF3Ijutc4","d":"2020-01-01","t":"เคล็ดลับของการปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"IDO_stTxprY","d":"2020-01-01","t":"ทุกขสัจ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 ม.ค. 2563","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"9lyDPQhqcdU","d":"2020-01-01","t":"01/01/20 เคล็ดลับอยู่ที่ต้องฝึกจิตให้ได้ก่อน(The key is practicing the mind to be a stable observer)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"sGCkRoyf3z0","d":"2019-12-31","t":"สิ่งที่ควรทำในวันสิ้นปี :: หลวงพ่อปราโมทย์ ปาโมชฺโช 31 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"3K9Fsk551i0","d":"2019-12-29","t":"สัมมาทิฏฐิคือตัวจริงของพระพุทธศาสนา :: หลวงพ่อปราโมทย์ 29 ธ.ค. 2562 (ไฟล์ 621229B ซีดี 85)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"IqczxlhJwrU","d":"2019-12-29","t":"วิธีฝึกจิตให้ตั้งมั่น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"av5uZgGk-wY","d":"2019-12-29","t":"คนตกน้ำ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Ov-qYlSrn2M","d":"2019-12-28","t":"อย่าเอาแต่กินบุญเก่า :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"YUATZDy2QxE","d":"2019-12-28","t":"อย่าทำบุญด้วยกิเลส :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"G6UiVF8SMto","d":"2019-12-22","t":"ทางออกจากทุกข์ :: หลวงพ่อปราโมทย์ 22 ธ.ค. 2562 (ไฟล์ 621222 ซีดี 85)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"E9kKrzS7fV8","d":"2019-12-22","t":"คนธรรมดาก็พ้นทุกข์ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ZDfSJkJYDaI","d":"2019-12-21","t":"โลกนี้กว้างใหญ่ เราเป็นแค่เศษธุลี :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"7ad6ZfrayC4","d":"2019-12-21","t":"นิพพานคิดเอาไม่ได้ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"90ysQtmbViE","d":"2019-12-15","t":"เตรียมพร้อมที่จะอยู่คนเดียวให้ได้ :: หลวงพ่อปราโมทย์ 15 ธ.ค. 2562 (ไฟล์ 621215B ซีดี 85)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"eIUxN6xLtBE","d":"2019-12-15","t":"กิเลสร้อนทุกตัว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"CFLM1Dxed68","d":"2019-12-14","t":"เห็นจิตไหล จิตจะเข้าฐาน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"GMTLvi44Gck","d":"2019-12-14","t":"อายุเยอะ ต้องเอากายมาช่วย :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"E7hfOabRimc","d":"2019-12-08","t":"ไม่มีโลภเจตนา ภพก็ไม่เกิด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"rDYqWnJrxQc","d":"2019-12-07","t":"ทุกอย่างในโลก เปลี่ยนตลอดเวลา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"j9Ne8Un_4mg","d":"2019-12-01","t":"อยากเกิดสติก็ต้องหัดรู้สภาวะ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"t78vcYCeluo","d":"2019-12-01","t":"วิธีช่วยเพิ่มพลังสมาธิ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 1 ธ.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"c_Hgzp8_6aA","d":"2019-11-30","t":"จิตที่หลง พาไปได้ทุกภพ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 30 พ.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"D1UK9RLJGVw","d":"2019-11-30","t":"จุดอ่อนของฆราวาสคือสมาธิไม่พอ :: หลวงพ่อปราโมทย์ ปาโมชฺโช  30 พ.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"5WTPJRqBGXs","d":"2019-11-24","t":"เครดิตของคนมีศีล :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 พ.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"wU0oTC1PcRw","d":"2019-11-24","t":"เล่นทางลัด ::  หลวงพ่อปราโมทย์ ปาโมชฺโช 24 พ.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"R603ZptwDe4","d":"2019-11-23","t":"ความรู้สึกตัวสำคัญที่สุด ::  หลวงพ่อปราโมทย์ ปาโมชฺโช 23 พ.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"x-GBgk4Rx3g","d":"2019-11-23","t":"ทำสมถะยากกว่าทำวิปัสสนา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 23 พ.ย.2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Xugw21j1reA","d":"2019-11-10","t":"กายวิเวก :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 พ.ย.2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"kP3hQQTKbjA","d":"2019-11-10","t":"สัปปายะ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 10 พ.ย.2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"hCLUy3KFhM0","d":"2019-11-09","t":"วิธีฝึกหลงแล้วรู้ได้ไว ::  หลวงพ่อปราโมทย์ ปาโมชฺโช 9 พ.ย.2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"v3QHtk9N6P0","d":"2019-11-09","t":"อริยสัจมี 2 ส่วน ::  หลวงพ่อปราโมทย์ ปาโมชฺโช 9 พ.ย.2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"K9kHmT-4JMY","d":"2019-11-03","t":"จิตก็ต้องพัก :: หลวงพ่อปราโมทย์ ปาโมชฺโช  3 พ.ย.2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"1Vee5UG14kM","d":"2019-11-03","t":"ทำไมการดูจิตจึงรุ่งเรืองในเมือง? :: หลวงพ่อปราโมทย์ ปาโมชฺโช  3 พ.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"sfarGhWDgf0","d":"2019-11-02","t":"สติปัฏฐาน 4 :: หลวงพ่อปราโมทย์ ปาโมชฺโช 2 พ.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"sAJQ8YhjMf4","d":"2019-11-02","t":"ขาดสติคือขาดการปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 2 พ.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"dDEoRA0atuw","d":"2019-10-27","t":"จิตไม่เที่ยง :: หลวงพ่อปราโมทย์ ปาโมชฺโช  27 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"JSAJo1PUp0Y","d":"2019-10-27","t":"เห็นอนัตตา :: หลวงพ่อปราโมทย์ ปาโมชฺโช  27 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"jCaVRtYNvIU","d":"2019-10-26","t":"มีสติรู้กายรู้ใจตามความเป็นจริง ด้วยจิตที่ตั้งมั่น และเป็นกลาง :: หลวงพ่อปราโมทย์  26 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"urzpGIxswmE","d":"2019-10-26","t":"เรียนจนเห็นว่าจิตรู้ก็เกิดดับ :: หลวงพ่อปราโมทย์ ปาโมชฺโช  26 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"pnL-S9IKYsI","d":"2019-10-20","t":"สิ่งทั้งหลายเป็นไปตามเหตุ ไม่ใช่ตามจินตนาการ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"v0vhQffHwHc","d":"2019-10-20","t":"ศีลสูงกว่าทาน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 20 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"zO9-rQCmEPA","d":"2019-10-19","t":"เอกายนมรรค  :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"C7ystcpNQxs","d":"2019-10-19","t":"เปลี่ยนทุกขณะ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 19 ต.ค.2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"2eJFEKciXUQ","d":"2019-10-13","t":"ธรรมชาติของจิต :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"glt6fgm0wNY","d":"2019-10-13","t":"ทางพ้นทุกข์  :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"NuhghI82JMQ","d":"2019-10-12","t":"โยนิโสมนสิการสำคัญที่สุด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"fvF0jkmUUVw","d":"2019-10-12","t":"รู้นิดเดียวพอ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 12 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"B9NPIil5CIo","d":"2019-10-06","t":"ต่อยอด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"vqCZRGEQ_6U","d":"2019-10-06","t":"ใช้ลมหายใจทำสมถะและวิปัสสนา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 6 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"j9gFeO0nZs8","d":"2019-10-05","t":"ภาวนาแล้วง่วง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 ต.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"XybXajrUa3A","d":"2019-10-05","t":"รู้จักดูไตรลักษณ์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 5 ต.ค.2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"1-iRL-ZZgP8","d":"2019-09-29","t":"พ้นความปรุงแต่งด้วยใจเป็นกลาง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 ก.ย.2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"hHYXf1_mi8Q","d":"2019-09-29","t":"ฝึกสมาธิ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 29 ก.ย.2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"YxbAAnGT2a8","d":"2019-09-28","t":"กฎแห่งกรรม :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 ก.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"bv-8Yy23K6Y","d":"2019-09-28","t":"ที่พึ่งที่อาศัยที่แท้จริง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 28 ก.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"0e-CYg0b_iM","d":"2019-09-22","t":"สัญญาวิปลาส :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 ก.ย.2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"dRcfTu5IQc4","d":"2019-09-22","t":"วิภัชวิธี :: หลวงพ่อปราโมทย์ ปาโมชฺโช 22 ก.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"430taJZRe3o","d":"2019-09-21","t":"เส้นทางนี้เดินคนเดียว :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 ก.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"dknbGtBD4as","d":"2019-09-21","t":"เรียนให้ได้แก่น :: หลวงพ่อปราโมทย์ ปาโมชฺโช 21 ก.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Ix6x6PVvkTY","d":"2019-09-15","t":"เปลี่ยนทุกขณะ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 ก.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"nO5vGXe6Vys","d":"2019-09-15","t":"ความคิดปิดบังความจริง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 15 ก.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"y5I2TPMqcKI","d":"2019-09-14","t":"ต้นทุนเท่ากัน ลงทุนไม่เหมือนกัน :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 ก.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"3qMW9VohQ5Q","d":"2019-09-14","t":"จุดหมายปลายทางสูงสุดของพระพุทธศาสนา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 14 ก.ย.2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"lGjN0_uheS8","d":"2019-09-08","t":"เข้าใจจิต คือเข้าใจทั้งหมด :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 ก.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"XkYKYdMM92o","d":"2019-09-08","t":"เข้าใจความจริง :: หลวงพ่อปราโมทย์ ปาโมชฺโช 8 ก.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"wIYGeafBiAc","d":"2019-09-07","t":"ศาสนาพุทธแท้ๆ เป็นเรื่องของปัญญา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 ก.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Rstxj8jutM0","d":"2019-09-07","t":"สัมมาสมาธิ เป็นเหตุใกล้ให้เกิดปัญญา :: หลวงพ่อปราโมทย์ ปาโมชฺโช 7 ก.ย. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"DlxH_PTMOzI","d":"2019-08-11","t":"รู้ทุกข์เมื่อไร ละสมุทัยเมื่อนั้น :: หลวงพ่อปราโมทย์ 11 ส.ค. 2562 (ไฟล์ 620811A ซีดี 83)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Tm8_FRj0oww","d":"2019-08-03","t":"มรรคมีองค์ ๘ เริ่มมาจากการมีสติ :: หลวงพ่อปราโมทย์ 3 ส.ค. 2562 (ไฟล์ 620803A ซีดี 83)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Xu548H34zQE","d":"2019-07-20","t":"ไม่มีธรรมะอื่นเสมอด้วยความรู้สึกตัว :: หลวงพ่อปราโมทย์ 20 ก.ค. 2562 (ไฟล์ 620720A ซีดี 83)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"DYgLPfiY6bU","d":"2019-07-13","t":"ดูจิตทำงานที่กลางหน้าอกอย่างไร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 ก.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"0QgUicJcrZw","d":"2019-07-13","t":"ดูจิตด้วยการทำอานาปานสติอย่างไร :: หลวงพ่อปราโมทย์ ปาโมชฺโช 13 ก.ค. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"qkJumU46LUs","d":"2019-06-15","t":"การปฏิบัติไม่ยาก :: หลวงพ่อปราโมทย์ 15 มิ.ย. 2562 (ไฟล์ 620615 ซีดี 82)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"q0FPww0lUsE","d":"2019-06-09","t":"สมาธิที่ถูกต้อง :: หลวงพ่อปราโมทย์ 9 มิ.ย. 2562 (ไฟล์ 620609A ซีดี 82)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"9XFYKsgL7yE","d":"2019-03-10","t":"เจริญปัญญาไม่เป็น ยังภูมิใจไม่ได้ :: หลวงพ่อปราโมทย์ 10 มี.ค. 2562 (ไฟล์ 620310 ซีดี 81)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"SxwYpjLA94o","d":"2019-03-09","t":"เรียนธรรมคู่ :: หลวงพ่อปราโมทย์ 9 มี.ค. 2562 (ไฟล์ 620309B ซีดี 81)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"djdP9ayVg74","d":"2019-03-09","t":"เส้นทางสู่ความพ้นทุกข์ :: หลวงพ่อปราโมทย์ 9 มี.ค. 2562 (ไฟล์ 620309A แผ่นที่ 81)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"UITypBezOFk","d":"2019-03-02","t":"พระวินัยช่วยให้พระมีสติ :: หลวงพ่อปราโมทย์ 2 มี.ค. 2562 (ไฟล์ 620302B ซีดี 80)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"q8fY8cq7Qis","d":"2019-02-19","t":"รู้อย่างที่มันเป็น :: หลวงพ่อปราโมทย์ 19 ก.พ. 2562 (ไฟล์ 620219B ซีดี 80)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"JOg0LmOasnA","d":"2019-02-17","t":"ชำระล้างกิเลสออกจากใจเรา :: หลวงพ่อปราโมทย์  17 ก.พ. 2562 (ไฟล์ 620217 ซีดี 80)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"tvgcPXAXPrg","d":"2019-02-10","t":"คำบริกรรมไม่ทำให้แน่น :: หลวงพ่อปราโมทย์ 10 ก.พ. 2562 (ไฟล์ 620210B ซีดี 80)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"LhZqDtMvxIE","d":"2019-02-09","t":"ทำอย่างไรจะไม่ทุกข์ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 ก.พ. 2562 (ไฟล์ 620209B ซีดี 80)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"a7AcfBHn9Bw","d":"2019-02-09","t":"ฆ่าตัวตาย ทุกข์นานกว่าเก่า :: หลวงพ่อปราโมทย์ ปาโมชฺโช 9 ก.พ. 2562","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"rQp4gXNyErQ","d":"2019-01-19","t":"คุณสมบัติของจิตผู้รู้ :: หลวงพ่อปราโมทย์ 19 ม.ค. 2562 (ไฟล์ 620119B ซีดี 80)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"B5mxTltRUYU","d":"2019-01-06","t":"เห็นตามความเป็นจริง จึงเบื่อหน่าย :: หลวงพ่อปราโมทย์ 6 ม.ค. 2562 (ไฟล์ 620106B ซีดี 80)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"cBP2O6imQYE","d":"2018-12-31","t":"ชีวิตเป็นของที่เราไม่รู้จัก :: หลวงพ่อปราโมทย์ ๓๑ ธ.ค. ๒๕๖๑ (ไฟล์ 611231A ซีดี ๘๐)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"AmvVrlOSSsk","d":"2018-12-01","t":"การภาวนาไม่ใช่เรื่องลึกลับ :: หลวงพ่อปราโมทย์ ๑ ธ.ค. ๒๕๖๑ (ไฟล์ 611201B ซีดี ๗๙)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ckrAcyF4ks4","d":"2018-11-24","t":"ทำไมออกจากสมาธิแล้วร้าย :: หลวงพ่อปราโมทย์ ปาโมชฺโช 24 พ.ย.  2561","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"zFXvXyiTqT4","d":"2018-11-18","t":"หลักคือการเรียนรู้ตัวเอง :: หลวงพ่อปราโมทย์ ๑๘ พ.ย. ๒๕๖๑ (ไฟล์ 611118B ซีดี ๗๙)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"FeWOYsgZMxY","d":"2018-11-11","t":"กรอบการปฏิบัติ :: หลวงพ่อปราโมทย์ ๑๑ พ.ย. ๒๕๖๑ (ไฟล์ 611111A ซีดี ๗๙)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"8bX62cBNI3Q","d":"2018-08-19","t":"เราเป็นลูกมีพ่อมีแม่ :: หลวงพ่อปราโมทย์ ๑๙ ส.ค. ๒๕๖๑ (ไฟล์ 610819B ซีดี ๗๗)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"kVPvlVkzLgo","d":"2018-07-27","t":"เจ็บป่วยที่กาย ใจไม่เจ็บ :: หลวงพ่อปราโมทย์ ๒๗ ก.ค. ๒๕๖๑ (ไฟล์ 610727B ซีดี ๗๗)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"iAMWxdKSmlo","d":"2018-06-03","t":"ทำดี ละชั่ว พัฒนาจิต :: หลวงพ่อปราโมทย์ ๓ มิ.ย. ๒๕๖๑ (ไฟล์ 610603A ซีดี ๗๖)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"TnWj0N6Clok","d":"2018-05-29","t":"ฉลาดในการทำบุญ :: หลวงพ่อปราโมทย์ ๒๙ พ.ค. ๒๕๖๑ (ไฟล์ 610529B ซีดี ๗๖)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"qY0Z25rRR2I","d":"2018-04-08","t":"ติดอยู่ในภพ :: หลวงพ่อปราโมทย์ ๘ เม.ย. ๒๕๖๑ (ไฟล์ 610408A ซีดี ๗๕)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"rcOd7_icrdg","d":"2018-04-01","t":"เรียนรู้ทุกข์ :: หลวงพ่อปราโมทย์ ๑ เม.ย. ๒๕๖๑ (ไฟล์ 610401A ซีดี ๗๕)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"s3Z0PwUDxMA","d":"2018-03-18","t":"กถาวัตถุ ๑๐ :: หลวงพ่อปราโมทย์ ๑๘ มี.ค. ๒๕๖๑ (ไฟล์ 610318 ซีดี ๗๕)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"I516-U3660g","d":"2018-03-11","t":"จิตทำหน้าที่เกินรู้ จะทุกข์ :: หลวงพ่อปราโมทย์ ๑๑ มี.ค. ๒๕๖๑ (610311A ซีดี ๗๕)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"QAhXkxF7Zho","d":"2018-03-11","t":"เรียนส่วนน้อย รู้ทั้งหมด : หลวงพ่อปราโมทย์ ๑๑ มี.ค. ๒๕๖๑ (610311B ซีดี ๗๕)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"b6me_1xvH_g","d":"2018-02-11","t":"11/02/2018 วิธีดูว่ากายใจคือตัวทุกข์ (Eliminating Desire)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"Yf16qTeg0aw","d":"2018-02-10","t":"10/02/2018 จิตหนึ่ง (The One Mind)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"42BDxDjOeiU","d":"2018-01-27","t":"ศีลที่พระอริยะชมเชย :: หลวงพ่อปราโมทย์  ๒๗ ม.ค. ๒๕๖๑ (610127A)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"hsSIuN0ehKI","d":"2017-12-24","t":"24/12/2017 มรรคมีองค์แปด (The Noble Eightfold Path)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ib1e2EYhVRA","d":"2017-07-15","t":"หลวงพ่อปราโมทย์ แสดงธรรม ณ วัดสวนสันติธรรม 15 ก.ค. 2560 ช่วงสาย","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"hONwtuKNeLI","d":"2013-07-21","t":"หลวงพ่อปราโมทย์ ศาลาลุงชิน 21 ก.ค. 2556 Full HD","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"g9p9zaHrxe8","d":"2013-05-03","t":"หลวงพ่อปราโมทย์ แสดงธรรม ณ โรงพยาบาลรามาธิบดี 3 พ.ค. 2556","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"4PNqtlOkKKY","d":"undated","t":"Dhamma Talk with English Subtitle by venerable Pramote Pamojjo teaching Vipassana Meditation","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"ahmOwY5Cl9M","d":"undated","t":"Dhamma Talk:  The Mindfulness for True Vipassana (English Subtitle)","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"lPoQkHajAeo","d":"undated","t":"Mindfulness Meditation for Everyday Life (English Subtitle) Dhamma Talk","sp":"lp","cnYt":"","thMp3":"","cnMp3":""},
    {"id":"DAw-dHdCk2A","d":"undated","t":"о Дхамме Развитие памятования в повседневной жизни","sp":"lp","cnYt":"","thMp3":"","cnMp3":""}
  ];

  const DB_NAME = 'TaixueYouTubeCCArchive';
  const DB_VERSION = 1;
  const STORE_SUBS = 'subtitles';
  const STORE_META = 'manifest';

  const CATALOG_BY_ID = new Map(CATALOG_ITEMS.map((it) => [it.id, it]));
  const CATALOG_BY_CN_ID = new Map();
  for (const it of CATALOG_ITEMS) {
    const cnId = extractYouTubeVideoId(it.cnYt || '');
    if (cnId && !CATALOG_BY_CN_ID.has(cnId)) {
      CATALOG_BY_CN_ID.set(cnId, it);
    }
  }

  let dbPromise = null;
  let isRunning = false;
  let shouldPause = false;
  let dirHandle = null;
  let debugTraces = [];

  function extractYouTubeVideoId(input) {
    if (!input) return '';
    const trimmed = String(input).trim();
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) return match[1];
    if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
    return '';
  }

  function inferDateFromTitle(title) {
    if (!title) return '';
    const iso = title.match(/(20\d{2})[-_/.](\d{1,2})[-_/.](\d{1,2})/);
    if (iso) {
      return iso[1] + '-' + String(Number(iso[2])).padStart(2, '0') + '-' + String(Number(iso[3])).padStart(2, '0');
    }
    const cnDate = title.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (cnDate) {
      return cnDate[1] + '-' + String(Number(cnDate[2])).padStart(2, '0') + '-' + String(Number(cnDate[3])).padStart(2, '0');
    }
    const thMonths = {
      'ม.ค.': 1, 'มกราคม': 1,
      'ก.พ.': 2, 'กุมภาพันธ์': 2,
      'มี.ค.': 3, 'มีนาคม': 3,
      'เม.ย.': 4, 'เมษายน': 4,
      'พ.ค.': 5, 'พฤษภาคม': 5,
      'มิ.ย.': 6, 'มิถุนายน': 6,
      'ก.ค.': 7, 'กรกฎาคม': 7,
      'ส.ค.': 8, 'สิงหาคม': 8,
      'ก.ย.': 9, 'กันยายน': 9,
      'ต.ค.': 10, 'ตุลาคม': 10,
      'พ.ย.': 11, 'พฤศจิกายน': 11,
      'ธ.ค.': 12, 'ธันวาคม': 12,
    };
    const thDigits = title.replace(/[๐-๙]/g, (ch) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(ch)));
    const mMatch = thDigits.match(/(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s+(25\d{2})/);
    if (mMatch && thMonths[mMatch[2]]) {
      const gYear = Number(mMatch[3]) - 543;
      const mo = String(thMonths[mMatch[2]]).padStart(2, '0');
      const da = String(Number(mMatch[1])).padStart(2, '0');
      return gYear + '-' + mo + '-' + da;
    }
    return '';
  }

  function findCatalogMatch(vid) {
    if (!vid) return null;
    if (CATALOG_BY_ID.has(vid)) return { item: CATALOG_BY_ID.get(vid), role: 'thai' };
    if (CATALOG_BY_CN_ID.has(vid)) return { item: CATALOG_BY_CN_ID.get(vid), role: 'chinese' };
    return null;
  }

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: 'videoId' });
        if (!db.objectStoreNames.contains(STORE_SUBS)) db.createObjectStore(STORE_SUBS, { keyPath: 'videoId' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function idbGetAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGetOne(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbPut(storeName, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function fmtSrtTs(sec) {
    const msTotal = Math.round(Math.max(0, sec) * 1000);
    const h = String(Math.floor(msTotal / 3600000)).padStart(2, '0');
    const m = String(Math.floor((msTotal % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((msTotal % 60000) / 1000)).padStart(2, '0');
    const ms = String(msTotal % 1000).padStart(3, '0');
    return h + ':' + m + ':' + s + ',' + ms;
  }

  function fmtMmSs(sec) {
    const secI = Math.round(Math.max(0, sec));
    const h = Math.floor(secI / 3600);
    const m = Math.floor((secI % 3600) / 60);
    const s = secI % 60;
    if (h > 0) return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function normalizeCaptionLines(rawLines) {
    if (!Array.isArray(rawLines) || !rawLines.length) return [];
    const cleaned = [];
    for (const ln of rawLines) {
      const txt = String(ln.thai || ln.text || '').replace(/\s+/g, ' ').trim();
      if (!txt) continue;
      const sSec = Math.max(0, Number(ln.secondsStart || 0));
      let eSec = Number(ln.secondsEnd || 0);
      if (!Number.isFinite(eSec) || eSec <= sSec + 0.25) eSec = sSec + 2.5;
      cleaned.push({ secondsStart: sSec, secondsEnd: eSec, thai: txt });
    }
    cleaned.sort((a, b) => a.secondsStart - b.secondsStart);
    for (let i = 0; i < cleaned.length - 1; i++) {
      const nextStart = cleaned[i + 1].secondsStart;
      if (cleaned[i].secondsEnd > nextStart && nextStart - cleaned[i].secondsStart >= 0.4) {
        cleaned[i].secondsEnd = Math.max(cleaned[i].secondsStart + 0.35, Number((nextStart - 0.04).toFixed(3)));
      }
    }
    return cleaned.map((ln, idx) => {
      const s = Number(ln.secondsStart.toFixed(3));
      const e = Number(Math.max(s + 0.3, ln.secondsEnd).toFixed(3));
      return {
        id: idx + 1,
        timeStart: fmtMmSs(s),
        timeEnd: fmtMmSs(e),
        secondsStart: s,
        secondsEnd: e,
        thai: ln.thai,
      };
    });
  }

  function buildStandardSrt(lines) {
    const norm = normalizeCaptionLines(lines);
    return norm
      .map((ln, idx) => (idx + 1) + '\n' + fmtSrtTs(ln.secondsStart) + ' --> ' + fmtSrtTs(ln.secondsEnd) + '\n' + ln.thai)
      .join('\n\n') + '\n';
  }

  function buildLinkedPayload(item, res) {
    const vid = item.id;
    const ytUrl = 'https://www.youtube.com/watch?v=' + vid;
    const normLines = normalizeCaptionLines(res.lines || []);
    return {
      schema: 'taixue.linked_subtitle.v1',
      videoId: vid,
      youtubeUrl: ytUrl,
      thaiVideoUrl: ytUrl,
      chineseYouTubeUrl: item.cnYt || '',
      chineseVideoUrl: item.cnYt || '',
      date: item.d || 'undated',
      title: item.t || ('YouTube 视频 ' + vid),
      thaiTitle: item.t || ('YouTube 视频 ' + vid),
      captionLang: res.lang || 'th',
      captionKind: res.kind || 'manual',
      isManualCC: res.isManualCC !== false,
      engineUsed: res.engineUsed || '',
      sentenceCount: normLines.length,
      thaiMp3Url: item.thMp3 || '',
      chineseMp3Url: item.cnMp3 || '',
      downloadedAt: res.downloadedAt || new Date().toISOString(),
      subtitles: normLines,
    };
  }

  function extractJsonAfterMarker(html, marker) {
    const idx = html.indexOf(marker);
    if (idx === -1) return null;
    const offset = marker.endsWith('{') ? marker.length - 1 : marker.length;
    const start = html.indexOf('{', idx + offset);
    if (start === -1) return null;
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < html.length; i++) {
      const ch = html[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (!inStr) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            try {
              return JSON.parse(html.slice(start, i + 1));
            } catch {
              return null;
            }
          }
        }
      }
    }
    return null;
  }

  function decodeXmlText(raw) {
    return raw
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseCaptionPayload(rawText) {
    const lines = [];
    if (!rawText) return lines;
    const trimmed = rawText.trim();

    if (trimmed.startsWith('{')) {
      try {
        const j3 = JSON.parse(trimmed);
        for (const ev of (j3.events || [])) {
          const txt = (ev.segs || []).map((s) => s.utf8 || '').join('').replace(/\s+/g, ' ').trim();
          if (!txt) continue;
          const sSec = Number(ev.tStartMs || 0) / 1000;
          const eSec = sSec + Math.max(0.5, Number(ev.dDurationMs || 3000) / 1000);
          lines.push({
            id: lines.length + 1,
            timeStart: fmtMmSs(sSec),
            timeEnd: fmtMmSs(eSec),
            secondsStart: Number(sSec.toFixed(3)),
            secondsEnd: Number(eSec.toFixed(3)),
            thai: txt,
          });
        }
        if (lines.length) return normalizeCaptionLines(lines);
      } catch {}
    }

    const reSrv1 = /<text\s+start="([^"]+)"(?:\s+dur="([^"]+)")?[^>]*>([\s\S]*?)<\/text>/g;
    let m;
    while ((m = reSrv1.exec(rawText)) !== null) {
      const sSec = Number(m[1] || 0);
      const eSec = sSec + Math.max(0.5, Number(m[2] || 3));
      const txt = decodeXmlText(m[3] || '');
      if (!txt) continue;
      lines.push({
        id: lines.length + 1,
        timeStart: fmtMmSs(sSec),
        timeEnd: fmtMmSs(eSec),
        secondsStart: Number(sSec.toFixed(3)),
        secondsEnd: Number(eSec.toFixed(3)),
        thai: txt,
      });
    }
    if (lines.length) return normalizeCaptionLines(lines);

    const reSrv3 = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g;
    while ((m = reSrv3.exec(rawText)) !== null) {
      const sSec = Number(m[1] || 0) / 1000;
      const eSec = sSec + Math.max(0.5, Number(m[2] || 3000) / 1000);
      const txt = decodeXmlText(m[3] || '');
      if (!txt) continue;
      lines.push({
        id: lines.length + 1,
        timeStart: fmtMmSs(sSec),
        timeEnd: fmtMmSs(eSec),
        secondsStart: Number(sSec.toFixed(3)),
        secondsEnd: Number(eSec.toFixed(3)),
        thai: txt,
      });
    }
    return normalizeCaptionLines(lines);
  }

  async function buildSapisidAuthHeader(origin) {
    try {
      const m = document.cookie.match(/(?:^|;\s*)(?:__Secure-3PAPISID|SAPISID|__Secure-1PAPISID)=([^;]+)/);
      if (!m || !window.crypto || !window.crypto.subtle) return null;
      const sapisid = decodeURIComponent(m[1]);
      const ts = Math.floor(Date.now() / 1000);
      const bytes = new TextEncoder().encode(ts + ' ' + sapisid + ' ' + origin);
      const digest = await window.crypto.subtle.digest('SHA-1', bytes);
      const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
      return 'SAPISIDHASH ' + ts + '_' + hex;
    } catch {
      return null;
    }
  }

  function findKeyDeep(obj, targetKey, maxDepth) {
    if (!obj || typeof obj !== 'object' || maxDepth <= 0) return null;
    if (Object.prototype.hasOwnProperty.call(obj, targetKey)) return obj[targetKey];
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const hit = findKeyDeep(item, targetKey, maxDepth - 1);
        if (hit !== null && hit !== undefined) return hit;
      }
    } else {
      for (const k of Object.keys(obj)) {
        const hit = findKeyDeep(obj[k], targetKey, maxDepth - 1);
        if (hit !== null && hit !== undefined) return hit;
      }
    }
    return null;
  }

  function collectTranscriptSegments(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.transcriptSegmentRenderer) {
      const seg = obj.transcriptSegmentRenderer;
      const txt = ((seg.snippet && seg.snippet.runs) || []).map((r) => r.text || '').join('').replace(/\s+/g, ' ').trim();
      if (txt) {
        const sSec = Number(seg.startMs || 0) / 1000;
        const eSecRaw = Number(seg.endMs || 0) / 1000;
        const eSec = eSecRaw > sSec ? eSecRaw : sSec + 2.5;
        out.push({
          id: out.length + 1,
          timeStart: fmtMmSs(sSec),
          timeEnd: fmtMmSs(eSec),
          secondsStart: Number(sSec.toFixed(3)),
          secondsEnd: Number(eSec.toFixed(3)),
          thai: txt,
        });
      }
      return;
    }
    if (Array.isArray(obj)) {
      for (const x of obj) collectTranscriptSegments(x, out);
    } else {
      for (const k of Object.keys(obj)) collectTranscriptSegments(obj[k], out);
    }
  }

  async function tryGetTranscriptApi(html, initialData, ytcfgObj, chosen, stepLogs) {
    try {
      let params = null;
      const epObj = initialData ? findKeyDeep(initialData, 'getTranscriptEndpoint', 10) : null;
      if (epObj && epObj.params) params = epObj.params;
      if (!params) {
        const m = html.match(/"getTranscriptEndpoint"\s*:\s*\{\s*"params"\s*:\s*"([^"]+)"/);
        if (m) params = m[1];
      }
      if (!params) {
        stepLogs.push({ engine: 'get_transcript', ok: false, reason: 'no_transcript_params' });
        return [];
      }

      const apiKey = (ytcfgObj && ytcfgObj.INNERTUBE_API_KEY) || '';
      const context = ytcfgObj && ytcfgObj.INNERTUBE_CONTEXT;
      if (!apiKey || !context) {
        stepLogs.push({ engine: 'get_transcript', ok: false, reason: 'missing_ytcfg' });
        return [];
      }

      const authHeader = await buildSapisidAuthHeader('https://www.youtube.com');
      const headers = {
        'Content-Type': 'application/json',
        'X-Origin': 'https://www.youtube.com',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': (context.client && context.client.clientVersion) || '',
      };
      if (context.client && context.client.visitorData) headers['X-Goog-Visitor-Id'] = context.client.visitorData;
      if (ytcfgObj.SESSION_INDEX !== undefined) headers['X-Goog-AuthUser'] = String(ytcfgObj.SESSION_INDEX);
      if (authHeader) headers['Authorization'] = authHeader;

      const callTranscript = async (reqParams) => {
        const r = await fetch('https://www.youtube.com/youtubei/v1/get_transcript?key=' + encodeURIComponent(apiKey) + '&prettyPrint=false', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ context, params: reqParams }),
        });
        const status = r.status;
        if (!r.ok) return { status, data: null };
        return { status, data: await r.json() };
      };

      let res1 = await callTranscript(params);
      if (!res1.data) {
        stepLogs.push({ engine: 'get_transcript', ok: false, status: res1.status });
        return [];
      }

      const subMenus = findKeyDeep(res1.data, 'subMenuItems', 14);
      if (Array.isArray(subMenus) && subMenus.length > 0) {
        const isAutoTitle = (t) => /\(auto|อัตโนมัติ|自动|自動/i.test(t || '');
        const selected = subMenus.find((it) => it.selected);
        const lang = String(chosen.languageCode || 'th').toLowerCase();
        const preferAsr = chosen.kind === 'asr';
        const matchLang = (title) => {
          const tl = String(title || '').toLowerCase();
          if (lang.startsWith('th')) return tl.includes('ไทย') || tl.includes('thai');
          if (lang.startsWith('en')) return tl.includes('english') || tl.includes('อังกฤษ') || tl.includes('英语');
          if (lang.startsWith('zh')) return tl.includes('中文') || tl.includes('chinese') || tl.includes('จีน');
          return true;
        };
        const needsSwitch = !selected || (!preferAsr && isAutoTitle(selected.title)) || !matchLang(selected.title);
        if (needsSwitch) {
          const better = subMenus.find((it) => matchLang(it.title) && (preferAsr ? isAutoTitle(it.title) : !isAutoTitle(it.title)))
            || subMenus.find((it) => matchLang(it.title));
          const cont = better && better.continuation && better.continuation.reloadContinuationData && better.continuation.reloadContinuationData.continuation;
          if (cont && (!selected || better !== selected)) {
            const res2 = await callTranscript(cont);
            if (res2.data) res1 = res2;
          }
        }
      }

      const lines = [];
      collectTranscriptSegments(res1.data, lines);
      const norm = normalizeCaptionLines(lines);
      stepLogs.push({ engine: 'get_transcript', ok: norm.length > 0, status: res1.status, count: norm.length });
      return norm;
    } catch (e) {
      stepLogs.push({ engine: 'get_transcript', ok: false, error: e && e.message ? e.message : String(e) });
      return [];
    }
  }

  async function fetchWithRetry(url, creds) {
    let lastStatus = 0;
    let lastText = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, attempt * 1100 + Math.random() * 500));
      }
      const r = await fetch(url, { credentials: creds || 'omit' });
      lastStatus = r.status;
      lastText = await r.text();
      if (r.ok && lastText.trim().length > 0) {
        return { status: lastStatus, text: lastText };
      }
      if (lastStatus !== 502 && lastStatus !== 503 && lastStatus !== 429 && lastStatus !== 500) {
        break;
      }
    }
    return { status: lastStatus, text: lastText };
  }

  async function tryTimedtextUrl(url, stepLogs, tag, preferCreds) {
    if (!url) return [];
    const cleanBase = url.replace(/([?&])fmt=[^&]+(&?)/, (_, p1, p2) => (p2 ? p1 : ''));
    const sep = cleanBase.includes('?') ? '&' : '?';

    const modes = preferCreds === 'include' ? ['include', 'omit'] : ['omit', 'include'];
    let lastJson3 = { status: 0, text: '' };
    let lastXml = { status: 0, text: '' };

    for (const creds of modes) {
      lastJson3 = await fetchWithRetry(cleanBase + sep + 'fmt=json3', creds);
      let lines = parseCaptionPayload(lastJson3.text);
      if (lines.length) {
        stepLogs.push({ engine: tag, ok: true, format: 'json3', creds, status: lastJson3.status, count: lines.length });
        return lines;
      }

      lastXml = await fetchWithRetry(cleanBase, creds);
      lines = parseCaptionPayload(lastXml.text);
      if (lines.length) {
        stepLogs.push({ engine: tag, ok: true, format: 'xml', creds, status: lastXml.status, count: lines.length });
        return lines;
      }

      if (lastJson3.status === 200 && lastJson3.text.length === 0 && lastXml.status === 200 && lastXml.text.length === 0) {
        break;
      }
    }

    stepLogs.push({
      engine: tag,
      ok: false,
      json3Status: lastJson3.status,
      json3Len: lastJson3.text.length,
      xmlStatus: lastXml.status,
      xmlLen: lastXml.text.length,
      count: 0,
    });
    return [];
  }

  async function tryAlternateClients(videoId, ytcfgObj, chosenTrack, stepLogs) {
    const apiKey = ytcfgObj && ytcfgObj.INNERTUBE_API_KEY;
    if (!apiKey) return { lines: [], clientName: '' };
    const visitorData = ytcfgObj.INNERTUBE_CONTEXT && ytcfgObj.INNERTUBE_CONTEXT.client && ytcfgObj.INNERTUBE_CONTEXT.client.visitorData;
    const targetLang = chosenTrack.languageCode || 'th';
    const wantAsr = chosenTrack.kind === 'asr';
    const clients = [
      {
        name: 'ANDROID_VR',
        idHeader: '28',
        credentials: 'omit',
        client: { clientName: 'ANDROID_VR', clientVersion: '1.65.10', androidSdkVersion: 32, deviceMake: 'Oculus', deviceModel: 'Quest 3', visitorData },
      },
      {
        name: 'IOS',
        idHeader: '5',
        credentials: 'omit',
        client: { clientName: 'IOS', clientVersion: '20.10.4', deviceMake: 'Apple', deviceModel: 'iPhone16,2', osName: 'iOS', osVersion: '18.3.0.22D63', visitorData },
      },
      {
        name: 'ANDROID',
        idHeader: '3',
        credentials: 'omit',
        client: { clientName: 'ANDROID', clientVersion: '21.03.36', androidSdkVersion: 36, visitorData },
      },
      {
        name: 'VISIONOS',
        idHeader: '101',
        credentials: 'omit',
        client: { clientName: 'VISIONOS', clientVersion: '1.02', deviceMake: 'Apple', deviceModel: 'RealityDevice17,1', osName: 'visionOS', osVersion: '26.5.23O471', visitorData },
      },
    ];
    for (const c of clients) {
      try {
        const r = await fetch('https://www.youtube.com/youtubei/v1/player?key=' + encodeURIComponent(apiKey) + '&prettyPrint=false', {
          method: 'POST',
          credentials: c.credentials,
          headers: {
            'Content-Type': 'application/json',
            'X-YouTube-Client-Name': c.idHeader,
            'X-YouTube-Client-Version': c.client.clientVersion,
          },
          body: JSON.stringify({ context: { client: c.client }, videoId }),
        });
        if (!r.ok) {
          stepLogs.push({ engine: 'client_' + c.name, ok: false, status: r.status });
          continue;
        }
        const pj = await r.json();
        const tracks = (pj.captions && pj.captions.playerCaptionsTracklistRenderer && pj.captions.playerCaptionsTracklistRenderer.captionTracks) || [];
        const manual = tracks.filter((t) => t.kind !== 'asr');
        const pool = wantAsr ? tracks.filter((t) => t.kind === 'asr') : manual;
        const picked =
          (chosenTrack.vssId && tracks.find((t) => t.vssId === chosenTrack.vssId)) ||
          pool.find((t) => t.languageCode === targetLang) ||
          pool.find((t) => t.languageCode && t.languageCode.startsWith(targetLang.split('-')[0])) ||
          (!wantAsr && (manual.find((t) => t.languageCode && t.languageCode.startsWith('th')) || manual.find((t) => t.languageCode && t.languageCode.startsWith('en')) || manual[0])) ||
          pool[0];
        if (!picked || !picked.baseUrl) {
          stepLogs.push({ engine: 'client_' + c.name, ok: false, tracks: tracks.length, playStatus: pj.playabilityStatus && pj.playabilityStatus.status });
          continue;
        }
        const lines = await tryTimedtextUrl(picked.baseUrl, stepLogs, 'client_' + c.name, c.credentials);
        if (lines.length) return { lines, clientName: 'client_' + c.name };
      } catch (e) {
        stepLogs.push({ engine: 'client_' + c.name, ok: false, error: e && e.message ? e.message : String(e) });
      }
    }
    return { lines: [], clientName: '' };
  }

  async function tryEmbedPlayerPotHook(videoId, targetLang, stepLogs) {
    return new Promise((resolve) => {
      let settled = false;
      let timer = null;
      let lastDiag = null;
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:4px;bottom:4px;width:160px;height:90px;opacity:0.005;pointer-events:none;border:0;z-index:1;';

      function cleanup(lines) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        window.removeEventListener('message', onMsg);
        try { iframe.remove(); } catch {}
        resolve(lines);
      }

      async function onMsg(ev) {
        if (ev.origin !== 'https://www.youtube.com' || !ev.data) return;
        if (ev.data.videoId !== videoId) return;
        if (ev.data.type === 'TAIXUE_EMBED_DIAG') {
          lastDiag = ev.data.diag;
        } else if (ev.data.type === 'TAIXUE_CC_CAPTURED' && ev.data.payload) {
          const lines = parseCaptionPayload(ev.data.payload);
          if (lines.length) {
            stepLogs.push({ engine: 'embed_pot_hook', ok: true, mode: 'intercepted_body', count: lines.length });
            cleanup(lines);
          }
        } else if (ev.data.type === 'TAIXUE_TIMEDTEXT_URL' && ev.data.url && ev.data.url.includes('pot=')) {
          try {
            const json3Url = ev.data.url.replace(/&fmt=[^&]+/g, '') + '&fmt=json3';
            const r = await fetchWithRetry(json3Url, 'include');
            const lines = parseCaptionPayload(r.text);
            if (lines.length) {
              stepLogs.push({ engine: 'embed_pot_hook', ok: true, mode: 'pot_url_refetch', status: r.status, count: lines.length });
              cleanup(lines);
            }
          } catch {}
        }
      }

      window.addEventListener('message', onMsg);
      timer = setTimeout(() => {
        stepLogs.push({ engine: 'embed_pot_hook', ok: false, reason: 'timeout_18s', diag: lastDiag });
        cleanup([]);
      }, 18000);

      const q = new URLSearchParams({
        autoplay: '1',
        mute: '1',
        cc_load_policy: '1',
        cc_lang_pref: targetLang || 'th',
        hl: 'th',
        taixue_cc: '1',
        taixue_vid: videoId,
        taixue_lang: targetLang || 'th',
      });
      iframe.src = 'https://www.youtube.com/embed/' + videoId + '?' + q.toString();
      document.body.appendChild(iframe);
    });
  }

  async function saveToFolder(filename, content) {
    if (!dirHandle) return;
    const fh = await dirHandle.getFileHandle(filename, { create: true });
    const w = await fh.createWritable();
    await w.write(content);
    await w.close();
  }

  function downloadBlob(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }

  function el(tag, styles, text) {
    const node = document.createElement(tag);
    if (styles) node.style.cssText = styles;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatTrackLabel(t) {
    const name = (t.name && (t.name.simpleText || (t.name.runs && t.name.runs.map((r) => r.text).join('')))) || t.languageCode || 'unknown';
    const kindLabel = t.kind === 'asr' ? '自动 ASR 备选' : '人工官方 CC ⭐';
    return (t.languageCode || '?') + ' · ' + name + ' (' + kindLabel + ')';
  }

  async function inspectVideoWatchPage(videoId) {
    const ytUrl = 'https://www.youtube.com/watch?v=' + videoId;
    const res = await fetch(ytUrl, { credentials: 'include' });
    if (!res.ok) throw new Error('watch_http_' + res.status);
    const html = await res.text();
    const player = extractJsonAfterMarker(html, 'ytInitialPlayerResponse =');
    if (!player) {
      throw new Error(html.includes('confirm you') || html.includes('Sign in') ? 'bot_check_or_login_required' : 'missing_player_response');
    }
    const playStatus = player.playabilityStatus && player.playabilityStatus.status ? player.playabilityStatus.status : 'OK';
    if (playStatus === 'LOGIN_REQUIRED') {
      throw new Error('LOGIN_REQUIRED: ' + (player.playabilityStatus.reason || 'bot check'));
    }

    const title = (player.videoDetails && player.videoDetails.title) || '';
    const tracksRaw = (player.captions && player.captions.playerCaptionsTracklistRenderer && player.captions.playerCaptionsTracklistRenderer.captionTracks) || [];
    const tracks = tracksRaw.map((t) => ({
      languageCode: t.languageCode || '',
      kind: t.kind || 'manual',
      isManual: t.kind !== 'asr',
      vssId: t.vssId || '',
      baseUrl: t.baseUrl || '',
      label: formatTrackLabel(t),
    }));

    return { videoId, title, date: inferDateFromTitle(title), playStatus, tracks, html, player };
  }

  function pickBestTrack(tracks, opts) {
    const o = opts || {};
    if (o.preferredVssId) {
      const exact = tracks.find((t) => t.vssId === o.preferredVssId);
      if (exact) return exact;
    }
    const manualTracks = tracks.filter((t) => t.isManual);
    if (o.preferredLang) {
      const target = String(o.preferredLang).toLowerCase();
      const hitManual = manualTracks.find((t) => t.languageCode.toLowerCase() === target) || manualTracks.find((t) => t.languageCode.toLowerCase().startsWith(target.split('-')[0]));
      if (hitManual) return hitManual;
      if (o.allowAsr) {
        const hitAny = tracks.find((t) => t.languageCode.toLowerCase() === target) || tracks.find((t) => t.languageCode.toLowerCase().startsWith(target.split('-')[0]));
        if (hitAny) return hitAny;
      }
    }
    const manualChoice = manualTracks.find((t) => t.languageCode === 'th' || t.languageCode === 'th-TH')
      || manualTracks.find((t) => t.languageCode && t.languageCode.startsWith('en'))
      || manualTracks.find((t) => t.languageCode && t.languageCode.startsWith('zh'))
      || manualTracks[0];
    if (manualChoice) return manualChoice;

    if (o.allowAsr && tracks.length) {
      return tracks.find((t) => t.languageCode === 'th' || t.languageCode === 'th-TH')
        || tracks.find((t) => t.languageCode && t.languageCode.startsWith('en'))
        || tracks[0];
    }
    return null;
  }

  async function fetchOneVideo(item, opts) {
    const o = opts || {};
    const inspected = o._preInspected || await inspectVideoWatchPage(item.id);
    const chosen = pickBestTrack(inspected.tracks, o);

    if (!chosen || !chosen.baseUrl) {
      return { status: 'no_manual_cc', totalTracks: inspected.tracks.length, playStatus: inspected.playStatus, tracks: inspected.tracks, title: inspected.title, date: inspected.date };
    }

    const html = inspected.html;
    const initialData = extractJsonAfterMarker(html, 'ytInitialData =');
    const ytcfgHtml = extractJsonAfterMarker(html, 'ytcfg.set({') || {};
    const liveYtcfg = (window.ytcfg && window.ytcfg.data_) || {};
    const ytcfgObj = Object.assign({}, ytcfgHtml, liveYtcfg);
    if (!ytcfgObj.INNERTUBE_CONTEXT && ytcfgHtml.INNERTUBE_CONTEXT) ytcfgObj.INNERTUBE_CONTEXT = ytcfgHtml.INNERTUBE_CONTEXT;

    const stepLogs = [];
    const alt = await tryAlternateClients(item.id, ytcfgObj, chosen, stepLogs);
    let lines = alt.lines;
    let engineUsed = alt.clientName || 'alternate_innertube_client';

    if (!lines.length) {
      lines = await tryEmbedPlayerPotHook(item.id, chosen.languageCode || 'th', stepLogs);
      engineUsed = 'embed_pot_hook';
    }

    if (!lines.length) {
      lines = await tryTimedtextUrl(chosen.baseUrl, stepLogs, 'direct_timedtext', 'include');
      engineUsed = 'direct_timedtext';
    }

    if (!lines.length) {
      lines = await tryGetTranscriptApi(html, initialData, ytcfgObj, chosen, stepLogs);
      engineUsed = 'get_transcript';
    }

    if (!lines.length) {
      const err = new Error('all_engines_empty: ' + JSON.stringify(stepLogs));
      err.stepLogs = stepLogs;
      throw err;
    }

    return {
      status: 'done',
      lang: chosen.languageCode || 'th',
      kind: chosen.kind || 'manual',
      isManualCC: Boolean(chosen.isManual),
      engineUsed,
      lines: normalizeCaptionLines(lines),
      totalTracks: inspected.tracks.length,
      tracks: inspected.tracks,
      title: item.t || inspected.title,
      date: item.d || inspected.date || 'undated',
      stepLogs,
    };
  }

  async function saveCapturedResult(item, res) {
    const resolvedItem = {
      id: item.id,
      d: item.d && item.d !== 'undated' ? item.d : (res.date || inferDateFromTitle(res.title || item.t) || 'undated'),
      t: item.t || res.title || ('YouTube ' + item.id),
      cnYt: item.cnYt || '',
      thMp3: item.thMp3 || '',
      cnMp3: item.cnMp3 || '',
    };
    const payload = buildLinkedPayload(resolvedItem, res);
    await idbPut(STORE_SUBS, payload);
    await idbPut(STORE_META, {
      videoId: resolvedItem.id,
      youtubeUrl: payload.youtubeUrl,
      date: payload.date,
      title: payload.title,
      status: 'done',
      captionLang: payload.captionLang,
      isManualCC: payload.isManualCC,
      engineUsed: payload.engineUsed,
      sentenceCount: payload.sentenceCount,
      updatedAt: payload.downloadedAt,
    });
    if (dirHandle) {
      const prefix = payload.date + '_' + payload.videoId;
      await saveToFolder(prefix + '.' + payload.captionLang + '.srt', buildStandardSrt(payload.subtitles));
      await saveToFolder(prefix + '.linked.json', JSON.stringify(payload, null, 2));
    }
    return payload;
  }

  function mountUI() {
    if (!document.body) return;
    if (document.getElementById('taixue-cc-root')) return;

    const root = el('div', 'position:fixed;right:18px;bottom:18px;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;');
    root.id = 'taixue-cc-root';

    const toggleBtn = el('button', 'background:#0f172a;color:#fcd34d;border:1px solid rgba(245,158,11,0.55);border-radius:9999px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 10px 25px rgba(0,0,0,0.45);display:flex;align-items:center;gap:8px;', '🪷 泰学 CC 抓取器 v' + SCRIPT_VERSION);
    const panel = el('div', 'display:none;width:476px;max-width:calc(100vw - 24px);max-height:calc(100vh - 36px);overflow-y:auto;background:#0f172a;color:#f1f5f9;border:1px solid rgba(245,158,11,0.45);border-radius:18px;padding:14px;box-shadow:0 20px 50px rgba(0,0,0,0.68);font-size:12px;line-height:1.45;');

    // Header
    const header = el('div', 'display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1e293b;padding-bottom:8px;margin-bottom:8px;');
    const titleEl = el('div', 'font-weight:800;font-size:13px;color:#fcd34d;', '🪷 泰学 CC 控制台 v' + SCRIPT_VERSION + ' (' + CATALOG_ITEMS.length + ' 场)');
    const closeBtn = el('button', 'background:#1e293b;color:#cbd5e1;border:none;border-radius:8px;padding:4px 9px;cursor:pointer;font-weight:700;', '收起');
    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    const statsEl = el('div', 'background:#020617;border:1px solid #1e293b;border-radius:10px;padding:7px 10px;margin-bottom:10px;font-family:monospace;font-size:11px;color:#94a3b8;', '正在读取本地断点记录...');

    // Tabs
    const tabBar = el('div', 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;background:#020617;padding:4px;border-radius:12px;border:1px solid #1e293b;');
    const tabCurrentBtn = el('button', '', '🎯 当前视频');
    const tabPickerBtn = el('button', '', '📚 选期抓取');
    const tabBatchBtn = el('button', '', '⚡ 批量队列');
    tabBar.appendChild(tabCurrentBtn);
    tabBar.appendChild(tabPickerBtn);
    tabBar.appendChild(tabBatchBtn);

    // ==================== TAB 1: 当前视频 ====================
    const tabCurrentView = el('div', 'display:block;');

    const customInputRow = el('div', 'display:flex;gap:6px;margin-bottom:8px;');
    const customVidInput = el('input', 'flex:1;background:#020617;color:#f8fafc;border:1px solid #334155;border-radius:8px;padding:6px 9px;font-size:11px;font-family:monospace;');
    customVidInput.placeholder = '当前页自动识别，或粘贴任意 YouTube 链接 / ID...';
    const loadCustomBtn = el('button', 'background:#1e293b;color:#38bdf8;border:1px solid rgba(56,189,248,0.4);border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;', '切换目标');
    const detectCurrentBtn = el('button', 'background:#1e293b;color:#fcd34d;border:1px solid #334155;border-radius:8px;padding:6px 9px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;', '🔄 识别本页');
    customInputRow.appendChild(customVidInput);
    customInputRow.appendChild(loadCustomBtn);
    customInputRow.appendChild(detectCurrentBtn);

    const curCard = el('div', 'background:#020617;border:1px solid #1e293b;border-radius:12px;padding:10px;margin-bottom:8px;');
    const curBadgeRow = el('div', 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px;');
    const curTitleEl = el('div', 'font-weight:700;font-size:12px;color:#f8fafc;margin-bottom:4px;', '未检测到视频页面，可切换到「选期抓取」或粘贴链接');
    const curMetaEl = el('div', 'font-size:11px;color:#94a3b8;font-family:monospace;', '');
    const switchToThaiBtn = el('button', 'display:none;margin-top:6px;background:#1e3a8a;color:#bfdbfe;border:1px solid #3b82f6;border-radius:8px;padding:4px 9px;font-size:11px;font-weight:700;cursor:pointer;');
    curCard.appendChild(curBadgeRow);
    curCard.appendChild(curTitleEl);
    curCard.appendChild(curMetaEl);
    curCard.appendChild(switchToThaiBtn);

    const trackRow = el('div', 'display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap;');
    const inspectTracksBtn = el('button', 'background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;', '🔍 检测可用音轨');
    const trackSelect = el('select', 'flex:1;min-width:160px;background:#1e293b;color:#f8fafc;border:1px solid #334155;border-radius:8px;padding:5px 8px;font-size:11px;');
    const autoOpt = document.createElement('option');
    autoOpt.value = '';
    autoOpt.textContent = '自动优先：泰语人工 CC > 英/中 CC';
    trackSelect.appendChild(autoOpt);
    trackRow.appendChild(inspectTracksBtn);
    trackRow.appendChild(trackSelect);

    const asrLabel = el('label', 'display:flex;align-items:center;gap:6px;font-size:11px;color:#cbd5e1;margin-bottom:8px;cursor:pointer;');
    const allowAsrCheckbox = document.createElement('input');
    allowAsrCheckbox.type = 'checkbox';
    asrLabel.appendChild(allowAsrCheckbox);
    asrLabel.appendChild(el('span', '', '若无人工 CC，允许抓自动识别字幕 (ASR 备选)'));

    const grabCurrentBtn = el('button', 'width:100%;background:#10b981;color:#022c22;border:none;border-radius:10px;padding:9px 12px;font-weight:800;font-size:12px;cursor:pointer;margin-bottom:8px;', '▶ 抓取当前视频字幕');

    const resultBox = el('div', 'display:none;background:#052e16;border:1px solid rgba(16,185,129,0.45);border-radius:12px;padding:10px;margin-bottom:8px;');
    const resultSummary = el('div', 'font-size:11px;font-weight:700;color:#6ee7b7;margin-bottom:8px;', '');
    const resultActions = el('div', 'display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;');
    const copySrtBtn = el('button', 'background:#f59e0b;color:#0f172a;border:none;border-radius:8px;padding:7px 8px;font-size:11px;font-weight:800;cursor:pointer;', '📋 复制标准 SRT');
    const copyLinkedBtn = el('button', 'background:#38bdf8;color:#082f49;border:none;border-radius:8px;padding:7px 8px;font-size:11px;font-weight:800;cursor:pointer;', '🔗 复制关联包 (.linked.json)');
    const dlSrtBtn = el('button', 'background:#1e293b;color:#fcd34d;border:1px solid #334155;border-radius:8px;padding:6px 8px;font-size:11px;font-weight:700;cursor:pointer;', '⬇ 下载 .srt');
    const dlLinkedBtn = el('button', 'background:#1e293b;color:#7dd3fc;border:1px solid #334155;border-radius:8px;padding:6px 8px;font-size:11px;font-weight:700;cursor:pointer;', '⬇ 下载 .linked.json');
    resultActions.appendChild(copySrtBtn);
    resultActions.appendChild(copyLinkedBtn);
    resultActions.appendChild(dlSrtBtn);
    resultActions.appendChild(dlLinkedBtn);
    const resultHint = el('div', 'font-size:10px;color:#a7f3d0;margin-bottom:6px;', '💡 共学互助无缝对接：复制/下载 .linked.json 拖入或粘贴进「共学互助校对 / 装载法谈」，将自动回填泰文与中文同传双链接、日期、标题与时间轴！');
    const previewBox = el('pre', 'margin:0;background:#020617;border:1px solid #1e293b;border-radius:8px;padding:7px;font-family:monospace;font-size:10px;color:#cbd5e1;max-height:90px;overflow-y:auto;white-space:pre-wrap;', '');
    resultBox.appendChild(resultSummary);
    resultBox.appendChild(resultActions);
    resultBox.appendChild(resultHint);
    resultBox.appendChild(previewBox);

    tabCurrentView.appendChild(customInputRow);
    tabCurrentView.appendChild(curCard);
    tabCurrentView.appendChild(trackRow);
    tabCurrentView.appendChild(asrLabel);
    tabCurrentView.appendChild(grabCurrentBtn);
    tabCurrentView.appendChild(resultBox);

    // ==================== TAB 2: 选期抓取 ====================
    const tabPickerView = el('div', 'display:none;');

    const pickerTopRow = el('div', 'display:flex;gap:6px;margin-bottom:8px;');
    const pickerSearchInput = el('input', 'flex:1;background:#020617;color:#f8fafc;border:1px solid #334155;border-radius:8px;padding:6px 9px;font-size:11px;');
    pickerSearchInput.placeholder = '搜索日期 (如 2026-11-21) / 泰文标题 / VideoID...';
    const pickerFilterSelect = el('select', 'background:#1e293b;color:#f8fafc;border:1px solid #334155;border-radius:8px;padding:5px 7px;font-size:11px;');
    for (const [val, lbl] of [['all', '全部'], ['pending', '待抓'], ['done', '已抓 ✅'], ['cn', '含中文同传 🇨🇳'], ['audio', '含MP3 🎧'], ['selected', '已勾选']]) {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = lbl;
      pickerFilterSelect.appendChild(o);
    }
    pickerTopRow.appendChild(pickerSearchInput);
    pickerTopRow.appendChild(pickerFilterSelect);

    const pickerSelBar = el('div', 'display:flex;gap:6px;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;');
    const pickerLeftBtns = el('div', 'display:flex;gap:6px;align-items:center;');
    const selectAllVisibleBtn = el('button', 'background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:7px;padding:4px 8px;font-size:11px;cursor:pointer;', '全选当前');
    const clearSelectedBtn = el('button', 'background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:7px;padding:4px 8px;font-size:11px;cursor:pointer;', '清空勾选');
    pickerLeftBtns.appendChild(selectAllVisibleBtn);
    pickerLeftBtns.appendChild(clearSelectedBtn);
    const runSelectedBtn = el('button', 'background:#10b981;color:#022c22;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:800;cursor:pointer;', '▶ 抓取已勾选 (0)');
    const pauseSelectedBtn = el('button', 'display:none;background:#f59e0b;color:#0f172a;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:800;cursor:pointer;', '⏸ 暂停');
    pickerSelBar.appendChild(pickerLeftBtns);
    const pickerRightBtns = el('div', 'display:flex;gap:6px;');
    pickerRightBtns.appendChild(runSelectedBtn);
    pickerRightBtns.appendChild(pauseSelectedBtn);
    pickerSelBar.appendChild(pickerRightBtns);

    const pickerListEl = el('div', 'background:#020617;border:1px solid #1e293b;border-radius:10px;padding:6px;max-height:245px;overflow-y:auto;margin-bottom:8px;display:flex;flex-direction:column;gap:6px;');

    tabPickerView.appendChild(pickerTopRow);
    tabPickerView.appendChild(pickerSelBar);
    tabPickerView.appendChild(pickerListEl);

    // ==================== TAB 3: 批量队列 ====================
    const tabBatchView = el('div', 'display:none;');

    const controlsRow = el('div', 'display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap;');
    const batchSelect = document.createElement('select');
    batchSelect.style.cssText = 'background:#1e293b;color:#f8fafc;border:1px solid #334155;border-radius:8px;padding:5px 8px;font-size:12px;';
    for (const [val, label] of [['20', '试跑 20 场'], ['50', '本批 50 场'], ['200', '本批 200 场'], ['0', '抓取全部剩余']]) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      batchSelect.appendChild(opt);
    }
    const folderBtn = el('button', 'background:#1e293b;color:#38bdf8;border:1px solid rgba(56,189,248,0.35);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;', '📁 选本地同步文件夹 (可选)');
    controlsRow.appendChild(batchSelect);
    controlsRow.appendChild(folderBtn);

    const btnRow = el('div', 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;');
    const startBtn = el('button', 'flex:1;background:#10b981;color:#022c22;border:none;border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer;', '▶ 开始批量抓取');
    const pauseBtn = el('button', 'background:#f59e0b;color:#0f172a;border:none;border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer;display:none;', '⏸ 暂停');
    const exportBtn = el('button', 'background:#334155;color:#fcd34d;border:none;border-radius:10px;padding:8px 10px;font-weight:700;cursor:pointer;', '📦 导出已抓全集');
    const traceBtn = el('button', 'background:#334155;color:#fda4af;border:none;border-radius:10px;padding:8px 10px;font-weight:700;cursor:pointer;', '🐞 复制调试日志');
    btnRow.appendChild(startBtn);
    btnRow.appendChild(pauseBtn);
    btnRow.appendChild(exportBtn);
    btnRow.appendChild(traceBtn);

    tabBatchView.appendChild(controlsRow);
    tabBatchView.appendChild(btnRow);

    // 共享日志框
    const logBox = el('div', 'background:#020617;border:1px solid #1e293b;border-radius:10px;padding:8px;height:125px;overflow-y:auto;font-family:monospace;font-size:11px;color:#cbd5e1;white-space:pre-wrap;word-break:break-all;', 'v' + SCRIPT_VERSION + ' 就绪：支持抓当前视频、选期单抓/多选、自动生成共学互助标准 SRT 与 .linked.json。\n');

    panel.appendChild(header);
    panel.appendChild(statsEl);
    panel.appendChild(tabBar);
    panel.appendChild(tabCurrentView);
    panel.appendChild(tabPickerView);
    panel.appendChild(tabBatchView);
    panel.appendChild(logBox);
    root.appendChild(toggleBtn);
    root.appendChild(panel);
    document.body.appendChild(root);

    // 状态变量
    let activeTab = 'current';
    let currentTargetVid = extractYouTubeVideoId(location.href);
    let currentInspected = null;
    let currentCapturedPayload = null;
    let metaCacheMap = new Map();
    let subsCacheMap = new Map();
    const selectedSet = new Set();
    let pickerLimit = 40;

    function setTabStyle(btn, active) {
      btn.style.cssText = active
        ? 'background:#f59e0b;color:#0f172a;border:none;border-radius:8px;padding:6px 4px;font-size:11px;font-weight:800;cursor:pointer;'
        : 'background:transparent;color:#94a3b8;border:none;border-radius:8px;padding:6px 4px;font-size:11px;font-weight:700;cursor:pointer;';
    }

    function switchTab(next) {
      activeTab = next;
      setTabStyle(tabCurrentBtn, next === 'current');
      setTabStyle(tabPickerBtn, next === 'picker');
      setTabStyle(tabBatchBtn, next === 'batch');
      tabCurrentView.style.display = next === 'current' ? 'block' : 'none';
      tabPickerView.style.display = next === 'picker' ? 'block' : 'none';
      tabBatchView.style.display = next === 'batch' ? 'block' : 'none';
      if (next === 'picker') renderPickerList();
      if (next === 'current') renderCurrentTarget();
    }
    switchTab('current');

    function appendLog(msg) {
      const ts = new Date().toLocaleTimeString();
      logBox.textContent += '[' + ts + '] ' + msg + '\n';
      logBox.scrollTop = logBox.scrollHeight;
    }

    async function refreshStats() {
      const allMeta = await idbGetAll(STORE_META);
      const allSubs = await idbGetAll(STORE_SUBS);
      metaCacheMap = new Map(allMeta.map((m) => [m.videoId, m]));
      subsCacheMap = new Map(allSubs.map((s) => [s.videoId, s]));
      let catalogDone = 0;
      let catalogNoCc = 0;
      for (const it of CATALOG_ITEMS) {
        const m = metaCacheMap.get(it.id);
        if (m && m.status === 'done') catalogDone++;
        else if (m && m.status === 'no_manual_cc') catalogNoCc++;
      }
      const extraDone = allMeta.filter((m) => m.status === 'done' && !CATALOG_BY_ID.has(m.videoId)).length;
      const remCount = Math.max(0, CATALOG_ITEMS.length - catalogDone - catalogNoCc);
      statsEl.textContent = '目录: ' + CATALOG_ITEMS.length + ' | 已抓: ' + (catalogDone + extraDone) + ' | 无手工CC: ' + catalogNoCc + ' | 待抓: ' + remCount + (dirHandle ? ' | 📁同步已绑定' : '');
      toggleBtn.textContent = '🪷 泰学 CC (' + (catalogDone + extraDone) + '/' + CATALOG_ITEMS.length + ')';
    }

    function makePill(text, bg, fg) {
      const s = el('span', 'font-size:10px;font-weight:700;padding:2px 6px;border-radius:9999px;background:' + bg + ';color:' + fg + ';', text);
      return s;
    }

    async function renderCurrentTarget() {
      curBadgeRow.replaceChildren();
      switchToThaiBtn.style.display = 'none';

      if (!currentTargetVid) {
        curBadgeRow.appendChild(makePill('未在视频页', '#334155', '#cbd5e1'));
        curTitleEl.textContent = '打开任意 YouTube 视频页，或在上方粘贴链接 / 切换到「选期抓取」';
        curMetaEl.textContent = '';
        resultBox.style.display = 'none';
        return;
      }

      const match = findCatalogMatch(currentTargetVid);
      const item = match ? match.item : null;
      const cachedSub = subsCacheMap.get(currentTargetVid) || await idbGetOne(STORE_SUBS, currentTargetVid);
      const cachedMeta = metaCacheMap.get(currentTargetVid) || await idbGetOne(STORE_META, currentTargetVid);

      curBadgeRow.appendChild(makePill('ID: ' + currentTargetVid, '#1e293b', '#fcd34d'));
      if (item && item.d) {
        curBadgeRow.appendChild(makePill('📅 ' + item.d, '#1e3a8a', '#93c5fd'));
      } else if (cachedSub && cachedSub.date) {
        curBadgeRow.appendChild(makePill('📅 ' + cachedSub.date, '#1e3a8a', '#93c5fd'));
      }

      if (match && match.role === 'chinese') {
        curBadgeRow.appendChild(makePill('🇨🇳 当前为中文同传视频', '#78350f', '#fde68a'));
        switchToThaiBtn.style.display = 'inline-block';
        switchToThaiBtn.textContent = '🔄 改为抓取关联泰文母带 (' + item.d + ' · ' + item.id + ')';
        switchToThaiBtn.onclick = () => {
          currentTargetVid = item.id;
          currentInspected = null;
          customVidInput.value = 'https://www.youtube.com/watch?v=' + item.id;
          resetTrackSelect();
          renderCurrentTarget();
        };
      } else if (item && item.cnYt) {
        curBadgeRow.appendChild(makePill('🇨🇳 已关联中文同传', '#064e3b', '#6ee7b7'));
      }
      if (item && (item.thMp3 || item.cnMp3)) {
        curBadgeRow.appendChild(makePill('🎧 已关联官方音频', '#312e81', '#c7d2fe'));
      }

      if (cachedSub) {
        curBadgeRow.appendChild(makePill('✅ 本地已抓 ' + (cachedSub.sentenceCount || (cachedSub.subtitles || []).length) + ' 句', '#065f46', '#a7f3d0'));
      } else if (cachedMeta && cachedMeta.status === 'no_manual_cc') {
        curBadgeRow.appendChild(makePill('⏭️ 上次检测无手工CC', '#451a03', '#fdba74'));
      }

      let domTitle = '';
      if (currentTargetVid === extractYouTubeVideoId(location.href)) {
        const h1 = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string');
        if (h1 && h1.textContent) domTitle = h1.textContent.trim();
      }
      const displayTitle = (match && match.role === 'thai' && item.t)
        || (currentInspected && currentInspected.title)
        || (cachedSub && cachedSub.title)
        || domTitle
        || ('YouTube 视频 ' + currentTargetVid);

      curTitleEl.textContent = displayTitle;
      const metaParts = [];
      if (item && item.cnYt) metaParts.push('中文同传: ' + extractYouTubeVideoId(item.cnYt));
      if (item && item.thMp3) metaParts.push('泰文MP3已配');
      if (item && item.cnMp3) metaParts.push('中文MP3已配');
      curMetaEl.textContent = metaParts.join(' | ') || '点击下方按钮即可立即抓词';

      if (cachedSub && Array.isArray(cachedSub.subtitles) && cachedSub.subtitles.length) {
        currentCapturedPayload = cachedSub;
        resultBox.style.display = 'block';
        resultSummary.textContent = '✅ 已就绪 ' + cachedSub.subtitles.length + ' 句 | 语种 ' + (cachedSub.captionLang || 'th') + (cachedSub.isManualCC === false ? ' (ASR自动)' : ' (人工CC)') + ' | ' + (cachedSub.engineUsed || 'IDB');
        const srtPreview = buildStandardSrt(cachedSub.subtitles.slice(0, 4));
        previewBox.textContent = srtPreview;
      } else {
        currentCapturedPayload = null;
        resultBox.style.display = 'none';
      }
    }

    function resetTrackSelect() {
      trackSelect.replaceChildren();
      const o = document.createElement('option');
      o.value = '';
      o.textContent = '自动优先：泰语人工 CC > 英/中 CC';
      trackSelect.appendChild(o);
    }

    async function inspectCurrentTracks() {
      if (!currentTargetVid) {
        appendLog('⚠️ 请先进入视频页或输入视频链接/ID。');
        return;
      }
      inspectTracksBtn.disabled = true;
      inspectTracksBtn.textContent = '检测中...';
      try {
        const info = await inspectVideoWatchPage(currentTargetVid);
        currentInspected = info;
        trackSelect.replaceChildren();
        const autoO = document.createElement('option');
        autoO.value = '';
        autoO.textContent = '自动优先（共检测到 ' + info.tracks.length + ' 条音轨）';
        trackSelect.appendChild(autoO);
        for (const t of info.tracks) {
          const opt = document.createElement('option');
          opt.value = t.vssId || (t.languageCode + ':' + t.kind);
          opt.textContent = t.label;
          trackSelect.appendChild(opt);
        }
        const firstManual = info.tracks.find((t) => t.isManual && t.languageCode.startsWith('th')) || info.tracks.find((t) => t.isManual);
        if (firstManual && firstManual.vssId) trackSelect.value = firstManual.vssId;
        appendLog('🔍 ' + currentTargetVid + ' 检测到 ' + info.tracks.length + ' 条字幕轨：人工CC ' + info.tracks.filter((t) => t.isManual).length + ' 条。');
        await renderCurrentTarget();
      } catch (e) {
        appendLog('❌ 检测音轨失败: ' + (e && e.message ? e.message : e));
      } finally {
        inspectTracksBtn.disabled = false;
        inspectTracksBtn.textContent = '🔍 检测可用音轨';
      }
    }

    async function grabSingleEpisode(item, opts) {
      const ytUrl = 'https://www.youtube.com/watch?v=' + item.id;
      const res = await fetchOneVideo(item, opts);
      if (res.status === 'no_manual_cc') {
        const rec = {
          videoId: item.id,
          youtubeUrl: ytUrl,
          date: item.d || res.date || 'undated',
          title: item.t || res.title || item.id,
          status: 'no_manual_cc',
          totalTracks: res.totalTracks,
          updatedAt: new Date().toISOString(),
        };
        await idbPut(STORE_META, rec);
        debugTraces.push(rec);
        appendLog('⏭️ ' + rec.date + ' | ' + item.id + ' 无手工 CC（共 ' + res.totalTracks + ' 条轨；可勾选 ASR 备选抓取自动字幕）');
        return { status: 'no_manual_cc', rec };
      }
      const payload = await saveCapturedResult(item, res);
      debugTraces.push({ videoId: item.id, status: 'done', engineUsed: res.engineUsed, sentenceCount: payload.sentenceCount, steps: res.stepLogs });
      appendLog('✅ ' + payload.date + ' | ' + item.id + ' (' + payload.sentenceCount + '句 ' + payload.captionLang + ' via ' + payload.engineUsed + ')');
      return { status: 'done', payload };
    }

    function getFilteredCatalogItems() {
      const q = (pickerSearchInput.value || '').trim().toLowerCase();
      const flt = pickerFilterSelect.value || 'all';
      return CATALOG_ITEMS.filter((it) => {
        const m = metaCacheMap.get(it.id);
        if (flt === 'done' && (!m || m.status !== 'done')) return false;
        if (flt === 'pending' && m && (m.status === 'done' || m.status === 'no_manual_cc')) return false;
        if (flt === 'cn' && !it.cnYt) return false;
        if (flt === 'audio' && !it.thMp3 && !it.cnMp3) return false;
        if (flt === 'selected' && !selectedSet.has(it.id)) return false;
        if (q) {
          const hay = (it.d + ' ' + it.t + ' ' + it.id + ' ' + (it.cnYt || '')).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }

    function updateSelectedRunLabel() {
      runSelectedBtn.textContent = '▶ 抓取已勾选 (' + selectedSet.size + ')';
      runSelectedBtn.disabled = isRunning || selectedSet.size === 0;
    }

    function renderPickerList() {
      pickerListEl.replaceChildren();
      const filtered = getFilteredCatalogItems();
      updateSelectedRunLabel();

      if (!filtered.length) {
        pickerListEl.appendChild(el('div', 'padding:16px;text-align:center;color:#64748b;', '没有符合条件的期数'));
        return;
      }

      const slice = filtered.slice(0, pickerLimit);
      for (const it of slice) {
        const row = el('div', 'background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:7px 8px;display:flex;flex-direction:column;gap:5px;');
        const top = el('div', 'display:flex;align-items:center;gap:6px;');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selectedSet.has(it.id);
        cb.addEventListener('change', () => {
          if (cb.checked) selectedSet.add(it.id);
          else selectedSet.delete(it.id);
          updateSelectedRunLabel();
        });
        top.appendChild(cb);
        top.appendChild(makePill(it.d, '#1e3a8a', '#bfdbfe'));

        const m = metaCacheMap.get(it.id);
        const sub = subsCacheMap.get(it.id);
        if (m && m.status === 'done') {
          top.appendChild(makePill('✅ ' + (m.sentenceCount || (sub && sub.subtitles && sub.subtitles.length) || 0) + '句', '#065f46', '#a7f3d0'));
        } else if (m && m.status === 'no_manual_cc') {
          top.appendChild(makePill('⏭ 无手工CC', '#451a03', '#fdba74'));
        } else {
          top.appendChild(makePill('待抓', '#1e293b', '#94a3b8'));
        }

        if (it.cnYt) top.appendChild(makePill('🇨🇳同传', '#064e3b', '#6ee7b7'));
        if (it.thMp3 || it.cnMp3) top.appendChild(makePill('🎧', '#312e81', '#c7d2fe'));

        const titleLine = el('div', 'font-size:11px;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;', it.t || it.id);
        titleLine.title = it.t || it.id;

        const actions = el('div', 'display:flex;gap:5px;flex-wrap:wrap;');
        const grabBtn = el('button', 'background:#10b981;color:#022c22;border:none;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;cursor:pointer;', (m && m.status === 'done') ? '🔄 重抓' : '▶ 抓这期');
        grabBtn.addEventListener('click', async () => {
          if (isRunning) return;
          isRunning = true;
          grabBtn.disabled = true;
          grabBtn.textContent = '抓取中...';
          try {
            await grabSingleEpisode(it, { allowAsr: allowAsrCheckbox.checked });
            await refreshStats();
            renderPickerList();
            if (currentTargetVid === it.id) await renderCurrentTarget();
          } catch (e) {
            appendLog('❌ ' + it.id + ' 失败: ' + (e && e.message ? e.message : e).slice(0, 140));
          } finally {
            isRunning = false;
            updateSelectedRunLabel();
          }
        });
        actions.appendChild(grabBtn);

        const targetTabBtn = el('button', 'background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:6px;padding:3px 7px;font-size:10px;cursor:pointer;', '🔍 设为当前目标');
        targetTabBtn.addEventListener('click', () => {
          currentTargetVid = it.id;
          currentInspected = null;
          customVidInput.value = 'https://www.youtube.com/watch?v=' + it.id;
          resetTrackSelect();
          switchTab('current');
        });
        actions.appendChild(targetTabBtn);

        if (sub && Array.isArray(sub.subtitles) && sub.subtitles.length) {
          const rCopySrt = el('button', 'background:#f59e0b;color:#0f172a;border:none;border-radius:6px;padding:3px 7px;font-size:10px;font-weight:800;cursor:pointer;', '📋 SRT');
          rCopySrt.addEventListener('click', async () => {
            await copyText(buildStandardSrt(sub.subtitles));
            appendLog('📋 已复制 ' + it.d + ' 标准 SRT（' + sub.subtitles.length + '句），可直接贴入共学互助中心！');
          });
          const rCopyJson = el('button', 'background:#38bdf8;color:#082f49;border:none;border-radius:6px;padding:3px 7px;font-size:10px;font-weight:800;cursor:pointer;', '🔗 JSON');
          rCopyJson.addEventListener('click', async () => {
            const linked = buildLinkedPayload(it, {
              lang: sub.captionLang,
              kind: sub.captionKind || 'manual',
              isManualCC: sub.isManualCC,
              engineUsed: sub.engineUsed,
              downloadedAt: sub.downloadedAt,
              lines: sub.subtitles,
            });
            await copyText(JSON.stringify(linked, null, 2));
            appendLog('🔗 已复制 ' + it.d + ' 关联数据包 (.linked.json)！');
          });
          const rDlSrt = el('button', 'background:#334155;color:#fcd34d;border:none;border-radius:6px;padding:3px 7px;font-size:10px;font-weight:700;cursor:pointer;', '⬇ SRT');
          rDlSrt.addEventListener('click', () => {
            downloadBlob(it.d + '_' + it.id + '.' + (sub.captionLang || 'th') + '.srt', buildStandardSrt(sub.subtitles));
          });
          actions.appendChild(rCopySrt);
          actions.appendChild(rCopyJson);
          actions.appendChild(rDlSrt);
        }

        row.appendChild(top);
        row.appendChild(titleLine);
        row.appendChild(actions);
        pickerListEl.appendChild(row);
      }

      if (filtered.length > pickerLimit) {
        const moreBtn = el('button', 'background:#1e293b;color:#38bdf8;border:1px solid #334155;border-radius:8px;padding:6px;font-size:11px;font-weight:700;cursor:pointer;', '显示更多 (' + slice.length + ' / ' + filtered.length + ')');
        moreBtn.addEventListener('click', () => {
          pickerLimit += 40;
          renderPickerList();
        });
        pickerListEl.appendChild(moreBtn);
      }
    }

    async function runQueue(queue, sourceTag) {
      if (isRunning || !queue.length) return;
      isRunning = true;
      shouldPause = false;
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-block';
      pauseSelectedBtn.style.display = 'inline-block';
      updateSelectedRunLabel();

      try {
        appendLog('🚀 [' + sourceTag + '] 开始抓取，目标: ' + queue.length + ' 场');
        let consecutiveErr = 0;

        for (let i = 0; i < queue.length; i++) {
          if (shouldPause) {
            appendLog('⏸ 已安全暂停。');
            break;
          }
          const item = queue[i];
          const ytUrl = 'https://www.youtube.com/watch?v=' + item.id;
          try {
            const out = await grabSingleEpisode(item, { allowAsr: allowAsrCheckbox.checked });
            if (out) consecutiveErr = 0;
          } catch (err) {
            consecutiveErr++;
            const msg = err && err.message ? err.message : String(err);
            debugTraces.push({ videoId: item.id, youtubeUrl: ytUrl, status: 'error', error: msg, steps: err && err.stepLogs ? err.stepLogs : [], ts: new Date().toISOString() });
            appendLog('[' + (i + 1) + '/' + queue.length + '] ❌ ' + item.id + ' 跳过: ' + msg.slice(0, 140));
            if (consecutiveErr >= 5) {
              appendLog('🛑 连续 5 次出错已触发熔断暂停，请点「🐞 复制调试日志」排查。');
              break;
            }
          }
          await refreshStats();
          if (activeTab === 'picker') renderPickerList();
          if (i + 1 < queue.length && !shouldPause) {
            if ((i + 1) % 40 === 0) {
              appendLog('☕ 已抓 40 场，冷却 25 秒防限流...');
              await new Promise((r) => setTimeout(r, 25000));
            } else {
              await new Promise((r) => setTimeout(r, 2200 + Math.random() * 2000));
            }
          }
        }

        if (dirHandle) {
          const allMeta = await idbGetAll(STORE_META);
          await saveToFolder('cc_manifest.json', JSON.stringify(allMeta, null, 2));
          await saveToFolder('cc_debug_trace.json', JSON.stringify(debugTraces, null, 2));
        }
        appendLog('🎉 本批流程结束。');
      } finally {
        isRunning = false;
        startBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'none';
        pauseSelectedBtn.style.display = 'none';
        await refreshStats();
        if (activeTab === 'picker') renderPickerList();
        if (activeTab === 'current') await renderCurrentTarget();
      }
    }

    // ==================== 事件绑定 ====================
    toggleBtn.addEventListener('click', async () => {
      toggleBtn.style.display = 'none';
      panel.style.display = 'block';
      const pageVid = extractYouTubeVideoId(location.href);
      if (pageVid && !customVidInput.value.trim()) {
        currentTargetVid = pageVid;
      }
      await refreshStats();
      await renderCurrentTarget();
      if (activeTab === 'picker') renderPickerList();
    });

    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
      toggleBtn.style.display = 'flex';
    });

    tabCurrentBtn.addEventListener('click', () => switchTab('current'));
    tabPickerBtn.addEventListener('click', () => switchTab('picker'));
    tabBatchBtn.addEventListener('click', () => switchTab('batch'));

    loadCustomBtn.addEventListener('click', () => {
      const vid = extractYouTubeVideoId(customVidInput.value);
      if (!vid) {
        appendLog('⚠️ 未能从输入识别 11 位 YouTube VideoID。');
        return;
      }
      currentTargetVid = vid;
      currentInspected = null;
      resetTrackSelect();
      renderCurrentTarget();
      appendLog('🎯 已切换当前抓取目标为: ' + vid);
    });

    detectCurrentBtn.addEventListener('click', () => {
      const vid = extractYouTubeVideoId(location.href);
      if (!vid) {
        appendLog('⚠️ 当前页面 URL 不包含 YouTube 视频 ID。');
        return;
      }
      currentTargetVid = vid;
      currentInspected = null;
      customVidInput.value = '';
      resetTrackSelect();
      renderCurrentTarget();
      appendLog('🔄 已识别当前页面视频: ' + vid);
    });

    inspectTracksBtn.addEventListener('click', inspectCurrentTracks);

    grabCurrentBtn.addEventListener('click', async () => {
      if (isRunning) return;
      if (!currentTargetVid) {
        appendLog('⚠️ 请先打开一个 YouTube 视频或输入链接/ID。');
        return;
      }
      isRunning = true;
      grabCurrentBtn.disabled = true;
      grabCurrentBtn.textContent = '⏳ 正在抓取当前视频字幕...';
      try {
        const match = findCatalogMatch(currentTargetVid);
        const item = (match && match.role === 'thai') ? match.item : {
          id: currentTargetVid,
          d: (currentInspected && currentInspected.date) || 'undated',
          t: (currentInspected && currentInspected.title) || '',
          cnYt: (match && match.item && match.item.cnYt) || '',
          thMp3: (match && match.item && match.item.thMp3) || '',
          cnMp3: (match && match.item && match.item.cnMp3) || '',
        };
        const selVal = trackSelect.value;
        const selTrack = currentInspected && currentInspected.tracks
          ? currentInspected.tracks.find((t) => (t.vssId || (t.languageCode + ':' + t.kind)) === selVal)
          : null;
        await grabSingleEpisode(item, {
          preferredVssId: selTrack ? selTrack.vssId : undefined,
          preferredLang: selTrack ? selTrack.languageCode : undefined,
          allowAsr: allowAsrCheckbox.checked || Boolean(selTrack && !selTrack.isManual),
          _preInspected: currentInspected && currentInspected.videoId === currentTargetVid ? currentInspected : undefined,
        });
        await refreshStats();
        await renderCurrentTarget();
      } catch (e) {
        appendLog('❌ 当前视频抓取失败: ' + (e && e.message ? e.message : e).slice(0, 160));
      } finally {
        isRunning = false;
        grabCurrentBtn.disabled = false;
        grabCurrentBtn.textContent = '▶ 抓取当前视频字幕';
        updateSelectedRunLabel();
      }
    });

    copySrtBtn.addEventListener('click', async () => {
      if (!currentCapturedPayload || !currentCapturedPayload.subtitles) return;
      const srt = buildStandardSrt(currentCapturedPayload.subtitles);
      const ok = await copyText(srt);
      appendLog(ok ? '📋 已复制标准 SRT（' + currentCapturedPayload.subtitles.length + ' 句），可直接粘贴到共学互助中心 / AI 提示词！' : '⚠️ 剪贴板写入受限，请点「⬇ 下载 .srt」');
    });

    copyLinkedBtn.addEventListener('click', async () => {
      if (!currentCapturedPayload) return;
      const ok = await copyText(JSON.stringify(currentCapturedPayload, null, 2));
      appendLog(ok ? '🔗 已复制完整关联包 (.linked.json)！粘贴到共学互助中心将自动回填泰/中视频链接+日期+标题+字幕。' : '⚠️ 剪贴板写入受限，请点「⬇ 下载 .linked.json」');
    });

    dlSrtBtn.addEventListener('click', () => {
      if (!currentCapturedPayload || !currentCapturedPayload.subtitles) return;
      const prefix = (currentCapturedPayload.date || 'undated') + '_' + currentCapturedPayload.videoId;
      downloadBlob(prefix + '.' + (currentCapturedPayload.captionLang || 'th') + '.srt', buildStandardSrt(currentCapturedPayload.subtitles));
      appendLog('⬇ 已下载 ' + prefix + '.' + (currentCapturedPayload.captionLang || 'th') + '.srt');
    });

    dlLinkedBtn.addEventListener('click', () => {
      if (!currentCapturedPayload) return;
      const prefix = (currentCapturedPayload.date || 'undated') + '_' + currentCapturedPayload.videoId;
      downloadBlob(prefix + '.linked.json', JSON.stringify(currentCapturedPayload, null, 2), 'application/json;charset=utf-8');
      appendLog('⬇ 已下载 ' + prefix + '.linked.json');
    });

    pickerSearchInput.addEventListener('input', () => { pickerLimit = 40; renderPickerList(); });
    pickerFilterSelect.addEventListener('change', () => { pickerLimit = 40; renderPickerList(); });

    selectAllVisibleBtn.addEventListener('click', () => {
      for (const it of getFilteredCatalogItems()) selectedSet.add(it.id);
      renderPickerList();
    });

    clearSelectedBtn.addEventListener('click', () => {
      selectedSet.clear();
      renderPickerList();
    });

    runSelectedBtn.addEventListener('click', async () => {
      const queue = CATALOG_ITEMS.filter((it) => selectedSet.has(it.id));
      await runQueue(queue, '选期抓取');
    });

    folderBtn.addEventListener('click', async () => {
      try {
        if (!window.showDirectoryPicker) {
          appendLog('⚠️ 当前浏览器不支持文件夹直写，可单期下载或点击「导出已抓全集」。');
          return;
        }
        dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        folderBtn.textContent = '📁 已绑定: ' + dirHandle.name;
        appendLog('✅ 已绑定本地文件夹: ' + dirHandle.name);
        await refreshStats();
      } catch (e) {
        appendLog('ℹ️ 取消选择文件夹: ' + (e && e.message ? e.message : e));
      }
    });

    const onPauseClick = () => {
      shouldPause = true;
      appendLog('⏸ 已请求暂停，将在当前场次保存后安全停止...');
    };
    pauseBtn.addEventListener('click', onPauseClick);
    pauseSelectedBtn.addEventListener('click', onPauseClick);

    exportBtn.addEventListener('click', async () => {
      const subs = await idbGetAll(STORE_SUBS);
      const meta = await idbGetAll(STORE_META);
      if (!subs.length) {
        appendLog('ℹ️ 当前暂无已抓取的字幕可导出。');
        return;
      }
      const bundle = {
        schema: 'taixue.cc_archive.v1',
        exportedAt: new Date().toISOString(),
        totalDone: subs.length,
        manifest: meta,
        items: subs,
      };
      downloadBlob('taixue-cc-archive-' + subs.length + '.json', JSON.stringify(bundle, null, 2), 'application/json;charset=utf-8');
      appendLog('📦 已打包下载 ' + subs.length + ' 场完整关联包 JSON！');
    });

    traceBtn.addEventListener('click', async () => {
      const text = JSON.stringify({
        version: SCRIPT_VERSION,
        url: location.href,
        userAgent: navigator.userAgent,
        traceCount: debugTraces.length,
        traces: debugTraces.slice(-50),
      }, null, 2);
      const ok = await copyText(text);
      if (ok) {
        appendLog('📋 已复制最近 ' + Math.min(50, debugTraces.length) + ' 条调试轨迹到剪贴板！');
      } else {
        downloadBlob('cc_debug_trace.json', text, 'application/json;charset=utf-8');
        appendLog('📥 剪贴板无权限，已改为下载 cc_debug_trace.json');
      }
    });

    startBtn.addEventListener('click', async () => {
      const allMeta = await idbGetAll(STORE_META);
      const metaMap = new Map(allMeta.map((m) => [m.videoId, m]));
      const limit = Number(batchSelect.value || 20);
      let queue = CATALOG_ITEMS.filter((it) => {
        const m = metaMap.get(it.id);
        return !m || (m.status !== 'done' && m.status !== 'no_manual_cc');
      });
      if (limit > 0) queue = queue.slice(0, limit);
      await runQueue(queue, '批量队列');
    });

    // 监听 YouTube SPA 页面切换，自动更新当前视频卡片
    let lastHref = location.href;
    function syncUrlChange() {
      if (location.href === lastHref) return;
      lastHref = location.href;
      if (customVidInput.value.trim()) return;
      const vid = extractYouTubeVideoId(location.href);
      if (vid !== currentTargetVid) {
        currentTargetVid = vid;
        currentInspected = null;
        resetTrackSelect();
        if (panel.style.display !== 'none' && activeTab === 'current') {
          renderCurrentTarget();
        }
      }
    }
    window.addEventListener('yt-navigate-finish', syncUrlChange);
    window.addEventListener('popstate', syncUrlChange);
    setInterval(syncUrlChange, 1200);

    refreshStats().then(() => renderCurrentTarget()).catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountUI, { once: true });
  } else {
    mountUI();
  }
})();
