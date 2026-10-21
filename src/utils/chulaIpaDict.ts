// 朱拉隆功大学标准音标与高频泰汉对照词典
// Chulalongkorn University Adapted IPA & Interlinear Gloss Dict

export interface ChulaDictEntry {
  ipa: string;
  cn: string;
  tip?: string;
  isCore?: boolean;
  root?: string;
}

export const CHULA_IPA_DICTIONARY: Record<string, ChulaDictEntry> = {
  // === 核心佛教专有名词 (Core Buddhist Terms) ===
  "แก้มิจฉาทิฏฐิด้วยสติปัฏฐาน": { ipa: "kɛ̂ɛ mít-cʰǎa-tʰít-tʰì dûaj sà-tì-pàt-tʰǎan", cn: "以四念处对治邪见", isCore: true },
  "แก้มิจฉาทิฏฐิ": { ipa: "kɛ̂ɛ mít-cʰǎa-tʰít-tʰì", cn: "对治邪见", isCore: true },
  "มิจฉาทิฏฐิ": { ipa: "mít-cʰǎa-tʰít-tʰì", cn: "邪见/倒见", isCore: true, root: "巴利语 Micchādiṭṭhi" },
  "สัมมาทิฏฐิ": { ipa: "sǎm-maa-tʰít-tʰì", cn: "正见", isCore: true, root: "巴利语 Sammādiṭṭhi" },
  "นิยตมิจฉาทิฏฐิ": { ipa: "ní-já-táʔ-mít-cʰǎa-tʰít-tʰì", cn: "定邪见(极重难拔)", isCore: true },
  "นิยตะมิจฉาทิฏฐิ": { ipa: "ní-já-táʔ-mít-cʰǎa-tʰít-tʰì", cn: "定邪见", isCore: true },
  "นิยตะ": { ipa: "ní-já-táʔ", cn: "决定义/定性", isCore: true },
  "อเหตุกทิฏฐิ": { ipa: "ʔà-hèe-tù-kàʔ-tʰít-tʰì", cn: "无因见(拨无因果)", isCore: true },
  "อเหตุกะทิฏฐิ": { ipa: "ʔà-hèe-tù-kàʔ-tʰít-tʰì", cn: "无因见", isCore: true },
  "อเหตุกกะทิฏฐิ": { ipa: "ʔà-hèe-tù-kàʔ-tʰít-tʰì", cn: "无因见", isCore: true },
  "อเหตุกกะ": { ipa: "ʔà-hèe-tù-kàʔ", cn: "无因", isCore: true },
  "อเหตุกะ": { ipa: "ʔà-hèe-tù-kàʔ", cn: "无因论", isCore: true },
  "อกิริยทิฏฐิ": { ipa: "ʔà-kì-rí-jáʔ-tʰít-tʰì", cn: "无作见(否定业用)", isCore: true },
  "อกิริยา": { ipa: "ʔà-kì-rí-jaa", cn: "无作论者", isCore: true },
  "อากิริยทิฏฐิ": { ipa: "ʔaa-kì-rí-jáʔ-tʰít-tʰì", cn: "无作见", isCore: true },
  "สัสสตทิฏฐิ": { ipa: "sàt-sà-táʔ-tʰít-tʰì", cn: "常见(执神我恒常)", isCore: true },
  "สักกายทิฏฐิ": { ipa: "sàk-kaa-jáʔ-tʰít-tʰì", cn: "萨迦耶见(身见)", isCore: true },
  "อุจเฉททิฏฐิ": { ipa: "ʔùt-cʰèe-tʰáʔ-tʰít-tʰì", cn: "断见(执死后断灭)", isCore: true },
  "ตายแล้วสูญ": { ipa: "taaj lɛ́ɛw sǔun", cn: "死后断灭", isCore: true },
  "สติปัฏฐาน": { ipa: "sà-tì-pàt-tʰǎan", cn: "四念处", isCore: true, root: "巴利语 Satipaṭṭhāna" },
  "สติปัฏฐาน สี่": { ipa: "sà-tì-pàt-tʰǎan sìi", cn: "四念处", isCore: true },
  "สติปัฏฐาน 4": { ipa: "sà-tì-pàt-tʰǎan sìi", cn: "四念处", isCore: true },
  "เจริญสติปัฏฐาน": { ipa: "cà-rəən sà-tì-pàt-tʰǎan", cn: "修习四念处", isCore: true },
  "สัมมาสติ": { ipa: "sǎm-maa-sà-tì", cn: "正念", isCore: true, root: "巴利语 Sammāsati" },
  "สัมมาสมาธิ": { ipa: "sǎm-maa-sà-maa-tʰí", cn: "正定", isCore: true, root: "巴利语 Sammāsamādhi" },
  "มิจฉาสมาธิ": { ipa: "mít-cʰǎa-sà-maa-tʰí", cn: "邪定", isCore: true },
  "สมาธิ": { ipa: "sà-maa-tʰí", cn: "禅定/心安住", isCore: true, root: "巴利语 Samādhi" },
  "สติ": { ipa: "sà-tì", cn: "正念/觉性", isCore: true, root: "巴利语 Sati" },
  "มีสติ": { ipa: "mii sà-tì", cn: "拥有觉性", isCore: true },
  "ขาดสติ": { ipa: "kʰàat sà-tì", cn: "失念/无觉性", isCore: true },
  "ผู้รู้": { ipa: "pʰûu-rúu", cn: "知者(知者心)", isCore: true },
  "ผู้ตื่น": { ipa: "pʰûu-tɯ̀ɯn", cn: "觉醒者", isCore: true },
  "ผู้เบิกบาน": { ipa: "pʰûu-bə̀ək-baan", cn: "喜乐者", isCore: true },
  "ผู้เห็น": { ipa: "pʰûu hěn", cn: "见者/旁观者", isCore: true },
  "รู้สึกตัว": { ipa: "rúu-sɯ̀k-tua", cn: "觉知身心/自知", isCore: true },
  "ความรู้สึกตัว": { ipa: "kʰwaam-rúu-sɯ̀k-tua", cn: "觉知力", isCore: true },
  "รู้เนื้อรู้ตัว": { ipa: "rúu nɯ́a rúu tua", cn: "自知自觉", isCore: true },
  "ลืมเนื้อลืมตัว": { ipa: "lɯɯm nɯ́a lɯɯm tua", cn: "忘失身心/失念", isCore: true },
  "ลืมตัว": { ipa: "lɯɯm tua", cn: "忘失自我", isCore: true },
  "โสดาบัน": { ipa: "sǒo-daa-ban", cn: "须陀洹/初果", isCore: true, root: "巴利语 Sotāpanna" },
  "พระโสดาบัน": { ipa: "pʰráʔ sǒo-daa-ban", cn: "初果圣者", isCore: true },
  "สกทาคามี": { ipa: "sà-kà-tʰaa-kʰaa-mii", cn: "斯陀含/二果", isCore: true, root: "巴利语 Sakadāgāmī" },
  "พระสกทาคามี": { ipa: "pʰráʔ sà-kà-tʰaa-kʰaa-mii", cn: "二果圣者", isCore: true },
  "อนาคามี": { ipa: "ʔà-naa-kʰaa-mii", cn: "阿那含/三果", isCore: true, root: "巴利语 Anāgāmī" },
  "พระอนาคามี": { ipa: "pʰráʔ ʔà-naa-kʰaa-mii", cn: "三果圣者", isCore: true },
  "พระอรหันต์": { ipa: "pʰráʔ ʔɔɔ-ráʔ-hǎn", cn: "阿罗汉", isCore: true, root: "巴利语 Arahant" },
  "อรหันต์": { ipa: "ʔɔɔ-ráʔ-hǎn", cn: "阿罗汉", isCore: true },
  "พระอริยบุคคล": { ipa: "pʰráʔ ʔà-rí-jáʔ-bùk-kʰon", cn: "圣者", isCore: true },
  "อริยบุคคล": { ipa: "ʔà-rí-jáʔ-bùk-kʰon", cn: "圣者", isCore: true },
  "นิพพาน": { ipa: "níp-pʰaan", cn: "涅槃", isCore: true, root: "巴利语 Nibbāna" },
  "พระนิพพาน": { ipa: "pʰráʔ níp-pʰaan", cn: "究竟涅槃", isCore: true },
  "สังสารวัฏ": { ipa: "sǎŋ-sǎan-ráʔ-wát", cn: "轮回/生死海", isCore: true, root: "巴利语 Saṃsāra" },
  "อวิชชา": { ipa: "ʔà-wít-cʰaa", cn: "无明", isCore: true, root: "巴利语 Avijjā" },
  "ตัณหา": { ipa: "tan-hǎa", cn: "渴爱/贪欲", isCore: true, root: "巴利语 Taṇhā" },
  "ราคะ": { ipa: "raa-kʰáʔ", cn: "贪欲", isCore: true, root: "巴利语 Rāga" },
  "โทสะ": { ipa: "tʰoo-sàʔ", cn: "嗔恚/怒气", isCore: true, root: "巴利语 Dosa" },
  "โมหะ": { ipa: "moo-hàʔ", cn: "愚痴/迷蒙", isCore: true, root: "巴利语 Moha" },
  "กิเลส": { ipa: "kì-lèet", cn: "烦恼", isCore: true, root: "巴利语 Kilesa" },
  "อนุสัย": { ipa: "ʔà-nú-sǎj", cn: "随眠烦恼", isCore: true, root: "巴利语 Anusaya" },
  "อนุสัยกิเลส": { ipa: "ʔà-nú-sǎj kì-lèet", cn: "随眠烦恼", isCore: true },
  "ขันธ์ ห้า": { ipa: "kʰǎn hâa", cn: "五蕴", isCore: true, root: "巴利语 Pañcakhandha" },
  "ขันธ์ 5": { ipa: "kʰǎn hâa", cn: "五蕴", isCore: true },
  "ขันธ์": { ipa: "kʰǎn", cn: "蕴", isCore: true, root: "巴利语 Khandha" },
  "รูป": { ipa: "rûup", cn: "色蕴/色相", isCore: true, root: "巴利语 Rūpa" },
  "รูปธรรม": { ipa: "rûup-páʔ-tʰam", cn: "色法", isCore: true },
  "นามธรรม": { ipa: "naam-máʔ-tʰam", cn: "名法", isCore: true },
  "นาม": { ipa: "naam", cn: "名/名法", isCore: true, root: "巴利语 Nāma" },
  "เวทนา": { ipa: "wee-tʰáʔ-naa", cn: "受蕴/感受", isCore: true, root: "巴利语 Vedanā" },
  "สัญญา": { ipa: "sǎn-jaa", cn: "想蕴/辨识", isCore: true, root: "巴利语 Saññā" },
  "สังขาร": { ipa: "sǎŋ-kʰǎan", cn: "行蕴/造作", isCore: true, root: "巴利语 Saṅkhāra" },
  "วิญญาณ": { ipa: "win-jaan", cn: "识蕴/心识", isCore: true, root: "巴利语 Viññāṇa" },
  "จิต": { ipa: "cìt", cn: "心/意识", isCore: true, root: "巴利语 Citta" },
  "ใจ": { ipa: "caj", cn: "心/自心", isCore: true },
  "จิตใจ": { ipa: "cìt-caj", cn: "心灵/内心", isCore: true },
  "กาย": { ipa: "kaaj", cn: "身体/色身", isCore: true, root: "巴利语 Kāya" },
  "ร่างกาย": { ipa: "râaŋ-kaaj", cn: "肉体/身体", isCore: true },
  "ร่าง": { ipa: "râaŋ", cn: "身躯/肉体", isCore: true },
  "อริยสัจ สี่": { ipa: "ʔà-rí-jáʔ-sàt sìi", cn: "四圣谛", isCore: true, root: "巴利语 Ariyasacca" },
  "อริยสัจ 4": { ipa: "ʔà-rí-jáʔ-sàt sìi", cn: "四圣谛", isCore: true },
  "อริยสัจ": { ipa: "ʔà-rí-jáʔ-sàt", cn: "圣谛", isCore: true },
  "ทุกข์": { ipa: "tʰúk", cn: "苦谛/痛苦", isCore: true, root: "巴利语 Dukkha" },
  "ความทุกข์": { ipa: "kʰwaam tʰúk", cn: "苦受/苦难", isCore: true },
  "สมุทัย": { ipa: "sà-mú-tʰaj", cn: "集谛/苦因", isCore: true, root: "巴利语 Samudaya" },
  "นิโรธ": { ipa: "ní-rôot", cn: "灭谛/苦灭", isCore: true, root: "巴利语 Nirodha" },
  "มรรค": { ipa: "mák", cn: "道谛/八圣道", isCore: true, root: "巴利语 Magga" },
  "อริยมรรค": { ipa: "ʔà-rí-jáʔ-mák", cn: "八圣道", isCore: true },
  "อริยผล": { ipa: "ʔà-rí-jáʔ-pʰǒn", cn: "圣果", isCore: true },
  "มรรคผล": { ipa: "mák-pʰǒn", cn: "道果", isCore: true },
  "พระอัสสชิ": { ipa: "pʰráʔ ʔàt-sà-cʰí", cn: "阿说示尊者(马胜)", isCore: true },
  "พระอัสชิ": { ipa: "pʰráʔ ʔàt-sà-cʰí", cn: "阿说示尊者", isCore: true },
  "อุปติสสะ": { ipa: "ʔù-pà-tìt-sàʔ", cn: "优波提舍(舍利弗尊者)", isCore: true },
  "พระโมคคัลลา": { ipa: "pʰráʔ moo-kʰan-laa", cn: "目犍连尊者", isCore: true },
  "พระมหาโมคคัลลา": { ipa: "pʰráʔ má-hǎa moo-kʰan-laa", cn: "大目犍连尊者", isCore: true },
  "พระพุทธเจ้า": { ipa: "pʰráʔ-pʰút-tʰáʔ-câaw", cn: "佛陀/世尊", isCore: true },
  "พุทธเจ้า": { ipa: "pʰút-tʰáʔ-câaw", cn: "佛陀", isCore: true },
  "พระเจ้า": { ipa: "pʰráʔ-câaw", cn: "造物神/主宰", isCore: true },
  "พระเจ้าข้า": { ipa: "pʰráʔ-câaw kʰâa", cn: "世尊尊前(尊称)", isCore: true },
  "พระธรรม": { ipa: "pʰráʔ tʰam", cn: "正法", isCore: true },
  "พระสงฆ์": { ipa: "pʰráʔ sǒŋ", cn: "僧伽", isCore: true },
  "ธรรมะ": { ipa: "tʰam-máʔ", cn: "佛法/法", isCore: true, root: "巴利语 Dhamma" },
  "ธรรม": { ipa: "tʰam", cn: "法/法则", isCore: true },
  "หลวงพ่อ": { ipa: "lǔaŋ-pʰɔ̂ɔ", cn: "隆波(尊者)", isCore: true },
  "หลวงปู่": { ipa: "lǔaŋ-pùu", cn: "隆普(长老)", isCore: true },
  "หลวงปู่ดูลย์": { ipa: "lǔaŋ-pùu dùun", cn: "隆普敦长老", isCore: true },
  "หลวงตามหาบัว": { ipa: "lǔaŋ-taa má-hǎa bua", cn: "隆达摩诃布瓦", isCore: true },
  "หลวงปู่เกษม": { ipa: "lǔaŋ-pùu kà-sěem", cn: "隆普卡贤长老", isCore: true },
  "หลวงพี่กิม": { ipa: "lǔaŋ-pʰîi kim", cn: "金法师/金师兄", isCore: true },
  "หลวงปู่บุญจันทร์": { ipa: "lǔaŋ-pùu bun-can", cn: "隆普布占长老", isCore: true },
  "บุญจันทร์": { ipa: "bun-can", cn: "布占长老名", isCore: true },
  "ครูบาอาจารย์": { ipa: "kʰruu-baa-ʔaa-caan", cn: "传承恩师/导师", isCore: true },
  "ครูบาเจ้า": { ipa: "kʰruu-baa câaw", cn: "圣僧大德", isCore: true },
  "ครูบา": { ipa: "kʰruu-baa", cn: "大德宗师", isCore: true },
  "อาจารย์": { ipa: "ʔaa-caan", cn: "亲教师/老师", isCore: true },
  "วิหารธรรม": { ipa: "wí-hǎan-ráʔ-tʰam", cn: "法住(安住处)", isCore: true },
  "กายในกาย": { ipa: "kaaj naj kaaj", cn: "身中观身", isCore: true },
  "เวทนาในเวทนา": { ipa: "wee-tʰáʔ-naa naj wee-tʰáʔ-naa", cn: "受中观受", isCore: true },
  "จิตในจิต": { ipa: "cìt naj cìt", cn: "心中观心", isCore: true },
  "ธรรมในธรรม": { ipa: "tʰam naj tʰam", cn: "法中观法", isCore: true },
  "จิตประภัสสร": { ipa: "cìt pràʔ-pʰàt-sɔ̌ɔn", cn: "光明心/自性清净心", isCore: true },
  "ประภัสสร": { ipa: "pràʔ-pʰàt-sɔ̌ɔn", cn: "光明清净", isCore: true },
  "อนัตตา": { ipa: "ʔà-nát-taa", cn: "无我", isCore: true, root: "巴利语 Anattā" },
  "อนิจจัง": { ipa: "ʔà-nít-caŋ", cn: "无常", isCore: true, root: "巴利语 Anicca" },
  "ทุกขัง": { ipa: "tʰúk-kʰǎŋ", cn: "苦", isCore: true, root: "巴利语 Dukkha" },
  "ไม่เที่ยง": { ipa: "mâj tʰîaŋ", cn: "无常/非恒常", isCore: true },
  "เที่ยง": { ipa: "tʰîaŋ", cn: "常/恒常", isCore: true },
  "สมถะ": { ipa: "sà-mà-tʰàʔ", cn: "奢摩他/止禅", isCore: true, root: "巴利语 Samatha" },
  "วิปัสสนา": { ipa: "wí-pàt-sà-naa", cn: "毗婆舍那/观禅", isCore: true, root: "巴利语 Vipassanā" },
  "ปัญญา": { ipa: "pan-jaa", cn: "智慧", isCore: true, root: "巴利语 Paññā" },
  "สติปัญญา": { ipa: "sà-tì pan-jaa", cn: "正念与智慧", isCore: true },
  "ศีล": { ipa: "sǐin", cn: "戒律", isCore: true, root: "巴利语 Sīla" },
  "ศีล ห้า": { ipa: "sǐin hâa", cn: "五戒", isCore: true },
  "ศีล 5": { ipa: "sǐin hâa", cn: "五戒", isCore: true },
  "ขณิกสมาธิ": { ipa: "kʰà-nì-kàʔ-sà-maa-tʰí", cn: "刹那定", isCore: true },
  "อุปจารสมาธิ": { ipa: "ʔù-pà-caa-ráʔ-sà-maa-tʰí", cn: "近行定", isCore: true },
  "อัปปนาสมาธิ": { ipa: "ʔàp-pà-naa-sà-maa-tʰí", cn: "安止定", isCore: true },
  "รูปฌาน": { ipa: "rûup-pʰáʔ-cʰaan", cn: "色界定", isCore: true },
  "อรูปฌาน": { ipa: "ʔà-rûup-pʰáʔ-cʰaan", cn: "无色界定", isCore: true },
  "ฌาน": { ipa: "cʰaan", cn: "禅那", isCore: true, root: "巴利语 Jhāna" },
  "อิริยาบถ": { ipa: "ʔì-rí-jaa-bòt", cn: "威仪/身姿", isCore: true },
  "อิริยาบถ สี่": { ipa: "ʔì-rí-jaa-bòt sìi", cn: "四威仪", isCore: true },
  "กรรมฐาน": { ipa: "kam-máʔ-tʰǎan", cn: "业处/禅修所缘", isCore: true },
  "อารมณ์กรรมฐาน": { ipa: "ʔaa-rom kam-máʔ-tʰǎan", cn: "禅修所缘", isCore: true },
  "อารมณ์": { ipa: "ʔaa-rom", cn: "所缘/境界", isCore: true },
  "พุทโธ": { ipa: "pʰút-tʰoo", cn: "佛陀(圣号)", isCore: true },
  "กุศล": { ipa: "kù-sǒn", cn: "善法/善", isCore: true, root: "巴利语 Kusala" },
  "อกุศล": { ipa: "ʔà-kù-sǒn", cn: "不善法/恶", isCore: true, root: "巴利语 Akusala" },
  "สัมปชัญญะ": { ipa: "sǎm-pà-can-jáʔ", cn: "正知", isCore: true, root: "巴利语 Sampajañña" },
  "ปีติ": { ipa: "pii-tì", cn: "喜悦/喜", isCore: true, root: "巴利语 Pīti" },
  "ปราโมทย์": { ipa: "praa-môot", cn: "极喜/尊者名", isCore: true, root: "巴利语 Pāmojja" },
  "ดับ": { ipa: "dàp", cn: "灭/灭去", isCore: true },
  "เกิด": { ipa: "kə̀ət", cn: "生/生起", isCore: true },
  "เกิดดับ": { ipa: "kə̀ət dàp", cn: "生灭", isCore: true },
  "เกิดแล้ว": { ipa: "kə̀ət lɛ́ɛw", cn: "生起之后", isCore: true },
  "ความจริง": { ipa: "kʰwaam ciŋ", cn: "实相/真相", isCore: true },
  "ตามความเป็นจริง": { ipa: "taam kʰwaam pen ciŋ", cn: "如实/如其本来", isCore: true },
  "เห็นความจริง": { ipa: "hěn kʰwaam ciŋ", cn: "照见实相", isCore: true },
  "สภาวะ": { ipa: "sà-pʰaa-wáʔ", cn: "状态/境界", isCore: true },
  "สภาวธรรม": { ipa: "sà-pʰaa-wáʔ-tʰam", cn: "实相法/自然实相", isCore: true },
  "จำสภาวะ": { ipa: "cam sà-pʰaa-wáʔ", cn: "铭记实相/识得状态", isCore: true },
  "ทวารทั้ง หก": { ipa: "tʰá-waan tʰáŋ hòk", cn: "六根门头", isCore: true },
  "ทวารทั้ง 6": { ipa: "tʰá-waan tʰáŋ hòk", cn: "六根门头", isCore: true },
  "ทวาร": { ipa: "tʰá-waan", cn: "根门", isCore: true },
  "หก": { ipa: "hòk", cn: "六", isCore: true },
  "สิ่งทั้งหลาย": { ipa: "sìŋ tʰáŋ-lǎaj", cn: "诸法/万物", isCore: true },
  "ทั้งหลายทั้งปวง": { ipa: "tʰáŋ-lǎaj tʰáŋ-puaŋ", cn: "一切所有", isCore: true },
  "ทั้งหลาย": { ipa: "tʰáŋ-lǎaj", cn: "一切/诸般", isCore: true },
  "ปุถุชน": { ipa: "pù-tʰù-cʰon", cn: "凡夫", isCore: true, root: "巴利语 Puthujjana" },
  "พระไตรปิฎก": { ipa: "pʰráʔ traj-pì-dòk", cn: "三藏经典", isCore: true, root: "巴利语 Tipiṭaka" },
  "ปริยัติ": { ipa: "pà-rí-ját", cn: "教理经教", isCore: true, root: "巴利语 Pariyatti" },
  "พระปริยัติ": { ipa: "pʰráʔ pà-rí-ját", cn: "三藏教理", isCore: true },
  "ปฏิเสธ": { ipa: "pà-tì-sèet", cn: "否定/拨无", isCore: true },
  "การกระทำ": { ipa: "kaan krà-tʰam", cn: "作为/造业", isCore: true },
  "กระทำ": { ipa: "krà-tʰam", cn: "做/行", isCore: true },
  "กรรม": { ipa: "kam", cn: "业/造作", isCore: true, root: "巴利语 Kamma" },
  "ผล": { ipa: "pʰǒn", cn: "果报/结果", isCore: true },
  "วิบาก": { ipa: "wí-bàak", cn: "异熟果报", isCore: true, root: "巴利语 Vipāka" },
  "บุญ": { ipa: "bun", cn: "福德/善业", isCore: true, root: "巴利语 Puñña" },
  "บาป": { ipa: "bàap", cn: "恶业/罪业", isCore: true, root: "巴利语 Pāpa" },
  "ปัจจัย": { ipa: "pàt-caj", cn: "缘/助缘", isCore: true, root: "巴利语 Paccaya" },
  "ปรุงแต่ง": { ipa: "pruŋ tɛ̀ŋ", cn: "造作/行和合", isCore: true },
  "ปรุง": { ipa: "pruŋ", cn: "和合造作", isCore: true },
  "อธิษฐาน": { ipa: "ʔà-tʰít-tʰǎan", cn: "发愿/愿力", isCore: true, root: "巴利语 Adhiṭṭhāna" },
  "อภิญญา": { ipa: "ʔà-pʰin-jaa", cn: "神通力", isCore: true, root: "巴利语 Abhiññā" },
  "ทรงอภิญญา": { ipa: "soŋ ʔà-pʰin-jaa", cn: "具足神通", isCore: true },
  "สมมติ": { ipa: "sǒm-mút", cn: "假名/世俗", isCore: true, root: "巴利语 Sammuti" },
  "บัญญัติ": { ipa: "ban-jàt", cn: "概念施设", isCore: true, root: "巴利语 Paññatti" },
  "สมมติบัญญัติ": { ipa: "sǒm-mút ban-jàt", cn: "假名概念", isCore: true },
  "อัตโนมัติ": { ipa: "ʔàt-tà-noo-mát", cn: "自动/自然运转", isCore: true },
  "สืบต่อ": { ipa: "sɯ̀ɯp-tɔ̀ɔ", cn: "相续/延续", isCore: true },
  "ขาดช่วง": { ipa: "kʰàat cʰûaŋ", cn: "断裂间断", isCore: true },
  "พ้น": { ipa: "pʰón", cn: "出离/解脱", isCore: true },
  "หลุดพ้น": { ipa: "lùt-pʰón", cn: "解脱漏尽", isCore: true },
  "บรรลุ": { ipa: "ban-lú", cn: "证悟/达成", isCore: true },
  "แจ่มแจ้ง": { ipa: "cɛ̀m-cɛ̂ɛŋ", cn: "明晰通达", isCore: true },
  "ทำให้แจ้ง": { ipa: "tʰam hâj cɛ̂ɛŋ", cn: "现量作证", isCore: true },
  "แจ้ง": { ipa: "cɛ̂ɛŋ", cn: "了彻作证", isCore: true },
  "รู้แจ้ง": { ipa: "rúu cɛ̂ɛŋ", cn: "彻悟了知", isCore: true },
  "รู้แจ้งเห็นจริง": { ipa: "rúu cɛ̂ɛŋ hěn ciŋ", cn: "如实知见", isCore: true },
  "ถ่องแท้": { ipa: "tʰɔ̀ɔŋ-tʰɛ́ɛ", cn: "透彻洞明", isCore: true },
  "อัศจรรย์": { ipa: "ʔàt-sà-can", cn: "不可思议", isCore: true },
  "อนุโมทนา": { ipa: "ʔà-nú-moo-tʰá-naa", cn: "随喜赞叹", isCore: true, root: "巴利语 Anumodanā" },
  "อารัมมณูปนิชฌาน": { ipa: "ʔaa-ram-má-nú-pà-nít-cʰaan", cn: "所缘紧盯禅那", isCore: true },
  "อารัมมณูปนิช": { ipa: "ʔaa-ram-má-nú-pà-nít", cn: "专注所缘", isCore: true },
  "ลักขณูปนิชฌาน": { ipa: "lák-kʰà-nú-pà-nít-cʰaan", cn: "三相观照禅那", isCore: true },
  "กิริยาวาที": { ipa: "kì-rí-jaa waa-tʰii", cn: "有作论者", isCore: true },
  "กรรมวาที": { ipa: "kam-máʔ waa-tʰii", cn: "业用论者", isCore: true },
  "วาที": { ipa: "waa-tʰii", cn: "论见/宗派", isCore: true },
  "ส่งจิตออกนอก": { ipa: "sòŋ cìt ʔɔ̀ɔk nɔ̂ɔk", cn: "心驰外求", isCore: true },
  "พิจารณา": { ipa: "pʰí-caa-rá-naa", cn: "如理作意/审思", isCore: true },
  "สว่าง": { ipa: "sà-wàaŋ", cn: "大放光明", isCore: true },
  "สว่างไสว": { ipa: "sà-wàaŋ sà-wǎj", cn: "朗照通明", isCore: true },
  "จวก": { ipa: "cùak", cn: "棒喝叱责", isCore: true },
  "จวกให้": { ipa: "cùak hâj", cn: "当头棒喝", isCore: true },
  "จับ": { ipa: "càp", cn: "执取攀缘", isCore: true },
  "จับทั้ง": { ipa: "càp tʰáŋ", cn: "执持两端", isCore: true },
  "สิ่งที่ถูกรู้": { ipa: "sìŋ tʰîi tʰùuk rúu", cn: "所知境/被知对象", isCore: true },
  "ถูกรู้": { ipa: "tʰùuk rúu", cn: "被觉知", isCore: true },
  "สิ่งที่": { ipa: "sìŋ tʰîi", cn: "所……之法", isCore: true },
  "สิ่งนี้": { ipa: "sìŋ níi", cn: "此事/此法", isCore: true },
  "สิ่งนั้น": { ipa: "sìŋ nán", cn: "彼法/彼物", isCore: true },
  "สิ่งเหล่านี้": { ipa: "sìŋ làw níi", cn: "诸般境况", isCore: true },
  "สิ่ง": { ipa: "sìŋ", cn: "事物/所对", isCore: true },
  "สุข": { ipa: "sùk", cn: "安乐/乐受", isCore: true, root: "巴利语 Sukha" },
  "ความสุข": { ipa: "kʰwaam sùk", cn: "妙乐幸福", isCore: true },
  "ถูก": { ipa: "tʰùuk", cn: "正当/蒙受", isCore: true },
  "ถูกต้อง": { ipa: "tʰùuk-tɔ̂ŋ", cn: "中道确当", isCore: true },

  // === 常用动词、虚词与对话构件 ===
  "เวลา": { ipa: "weː-laa", cn: "时间" },
  "หมดเวลา": { ipa: "mòt weː-laa", cn: "时间到了" },
  "ของ": { ipa: "kʰɔ̌ɔŋ", cn: "的/属于" },
  "พวกเรา": { ipa: "pʰûak-raw", cn: "我们" },
  "พวกนั้น": { ipa: "pʰûak nán", cn: "那些人/外道" },
  "แต่ละคน": { ipa: "tɛ̀ɛ-láʔ-kʰon", cn: "每个人" },
  "ทุกคน": { ipa: "tʰúk-kʰon", cn: "所有人" },
  "มี": { ipa: "mii", cn: "有" },
  "ไม่มี": { ipa: "mâj mii", cn: "没有" },
  "ไม่มาก": { ipa: "mâj mâak", cn: "不多" },
  "มีโอกาส": { ipa: "mii ʔoo-kàat", cn: "有机会" },
  "โอกาส": { ipa: "ʔoo-kàat", cn: "机会" },
  "เรียน": { ipa: "rian", cn: "学习" },
  "รีบเรียน": { ipa: "rîip rian", cn: "抓紧学" },
  "รีบ": { ipa: "rîip", cn: "急忙/赶紧" },
  "ฟัง": { ipa: "faŋ", cn: "听/闻" },
  "ฟังธรรมะ": { ipa: "faŋ tʰam-máʔ", cn: "听法" },
  "ให้รู้": { ipa: "hâj rúu", cn: "以明白" },
  "วิธี": { ipa: "wí-tʰii", cn: "方法" },
  "วิธีปฏิบัติ": { ipa: "wí-tʰii pà-tì-bàt", cn: "修行方法" },
  "ปฏิบัติ": { ipa: "pà-tì-bàt", cn: "修行实践" },
  "แล้ว": { ipa: "lɛ́ɛw", cn: "然后/已经" },
  "ลงมือ": { ipa: "loŋ mɯɯ", cn: "动手付诸" },
  "ทำให้ได้": { ipa: "tʰam hâj dâaj", cn: "付诸实行" },
  "ทำให้": { ipa: "tʰam hâj", cn: "使得/致使" },
  "ทำ": { ipa: "tʰam", cn: "做/行" },
  "ถ้า": { ipa: "tʰâa", cn: "如果" },
  "เรา": { ipa: "raw", cn: "我们" },
  "เข้าใจ": { ipa: "kʰâw-caj", cn: "领悟理解" },
  "ในเบื้องต้น": { ipa: "naj bɯ̂aŋ-tɔ̂n", cn: "在最初/初步" },
  "เบื้องต้น": { ipa: "bɯ̂aŋ-tɔ̂n", cn: "初步起点" },
  "ล้าง": { ipa: "láaŋ", cn: "清洗消除" },
  "ความเห็นผิด": { ipa: "kʰwaam hěn pʰìt", cn: "错误见解" },
  "เห็นผิด": { ipa: "hěn pʰìt", cn: "见解颠倒" },
  "ว่า": { ipa: "wâa", cn: "谓/说" },
  "เป็น": { ipa: "pen", cn: "是/作为" },
  "ตัวเรา": { ipa: "tua raw", cn: "自我/我们自己" },
  "ตัว": { ipa: "tua", cn: "自身/自身" },
  "ก็": { ipa: "kɔ̂ɔ", cn: "便/就" },
  "จะ": { ipa: "càʔ", cn: "将要/会" },
  "เข้าสู่": { ipa: "kʰâw sùu", cn: "进入至" },
  "สู่": { ipa: "sùu", cn: "通往/向" },
  "จุด": { ipa: "cùt", cn: "要点/境地" },
  "ที่": { ipa: "tʰîi", cn: "所/在/处" },
  "ปลอดภัย": { ipa: "pà-lɔ̀ɔt-pʰaj", cn: "安全" },
  "ที่ปลอดภัย": { ipa: "tʰîi pà-lɔ̀ɔt-pʰaj", cn: "安全地界" },
  "ใน": { ipa: "naj", cn: "在……内" },
  "ตราบใด": { ipa: "tràap daj", cn: "只要/倘若" },
  "ตราบใดที่": { ipa: "tràap daj tʰîi", cn: "只要" },
  "ยังไม่ได้": { ipa: "jaŋ mâj dâaj", cn: "尚未获证" },
  "ยัง": { ipa: "jaŋ", cn: "依然/还" },
  "อยู่": { ipa: "jùu", cn: "处于/在" },
  "ท่ามกลาง": { ipa: "tʰâam-klaaŋ", cn: "处于……之中" },
  "ความไม่แน่นอน": { ipa: "kʰwaam mâj nɛ̂ɛ-nɔɔn", cn: "无常变数" },
  "แน่นอน": { ipa: "nɛ̂ɛ-nɔɔn", cn: "确定无疑" },
  "อาจจะ": { ipa: "ʔàat càʔ", cn: "或许可能" },
  "เวียนว่ายตายเกิด": { ipa: "wian wâaj taaj kə̀ət", cn: "生死轮回" },
  "ไป": { ipa: "paj", cn: "前去/转动" },
  "ไม่รู้จัก": { ipa: "mâj rúu-càk", cn: "不知" },
  "จบจักสิ้น": { ipa: "còp càk sîn", cn: "无休无止" },
  "จบ": { ipa: "còp", cn: "终了/完毕" },
  "สิ้น": { ipa: "sîn", cn: "断绝/穷尽" },
  "แล้วก็": { ipa: "lɛ́ɛw kɔ̂ɔ", cn: "然后就" },
  "ทุกข์แล้วทุกข์อีก": { ipa: "tʰúk lɛ́ɛw tʰúk ʔìik", cn: "苦受重重" },
  "ทุกคราว": { ipa: "tʰúk kʰraaw", cn: "每次每回" },
  "คราว": { ipa: "kʰraaw", cn: "时次/回" },
  "ล้วนแต่": { ipa: "lúan tɛ̀ɛ", cn: "全都是" },
  "ทั้งสิ้น": { ipa: "tʰáŋ-sîn", cn: "毫无例外" },
  "ที่ว่า": { ipa: "tʰîi wâa", cn: "所谓" },
  "ไม่ทุกข์": { ipa: "mâj tʰúk", cn: "不苦" },
  "ลอง": { ipa: "lɔɔŋ", cn: "试着" },
  "นึกย้อนดู": { ipa: "nɯ́k jɔ́ɔn duu", cn: "回溯审视" },
  "นึก": { ipa: "nɯ́k", cn: "思量忆及" },
  "ตั้งแต่": { ipa: "tâŋ-tɛ̀ɛ", cn: "从……开始" },
  "เด็กๆ": { ipa: "dèk dèk", cn: "幼童时期" },
  "มา": { ipa: "maa", cn: "来到/以往" },
  "ผ่าน": { ipa: "pʰàan", cn: "阅历/度过" },
  "ตั้งเท่าไหร่": { ipa: "tâŋ tʰâw-rài", cn: "何其多" },
  "ไม่ชอบ": { ipa: "mâj cʰɔ̂ɔp", cn: "不喜/厌恶" },
  "พยายาม": { ipa: "pʰá-jaa-jaam", cn: "设法努力" },
  "ลืม": { ipa: "lɯɯm", cn: "遗忘/忘记" },
  "มัน": { ipa: "man", cn: "它" },
  "พอ": { ipa: "pʰɔɔ", cn: "一旦/足够" },
  "ผ่านไป": { ipa: "pʰàan paj", cn: "逝去走过" },
  "ทำเป็น": { ipa: "tʰam pen", cn: "佯作/装作" },
  "ก็เลย": { ipa: "kɔ̂ɔ ləəj", cn: "于是便" },
  "บางคน": { ipa: "baaŋ kʰon", cn: "某些人" },
  "เขา": { ipa: "kʰǎw", cn: "他人/彼等" },
  "เรียก": { ipa: "rîak", cn: "称之为" },
  "พวก": { ipa: "pʰûak", cn: "派流/辈" },
  "แบบ": { ipa: "bɛ̀ɛp", cn: "样式/范式" },
  "มั่นคง": { ipa: "mân-kʰoŋ", cn: "坚不可拔" },
  "แข็งแรง": { ipa: "kʰɛ̌ŋ-rɛɛŋ", cn: "顽强坚实" },
  "ตาย": { ipa: "taaj", cn: "身亡/死" },
  "ตายแล้วตายอีก": { ipa: "taaj lɛ́ɛw taaj ʔìik", cn: "死死生生" },
  "อีก": { ipa: "ʔìik", cn: "再度/且" },
  "ชาวพุทธ": { ipa: "cʰaaw-pʰút", cn: "佛弟子" },
  "ภาวนา": { ipa: "pʰaa-wáʔ-naa", cn: "禅修开显" },
  "ให้ได้": { ipa: "hâj dâaj", cn: "达成获得" },
  "บอกว่า": { ipa: "bɔ̀ɔk wâa", cn: "开示道" },
  "บอก": { ipa: "bɔ̀ɔk", cn: "讲述告谕" },
  "อะไร": { ipa: "ʔà-raj", cn: "何物/什么" },
  "ดีเลิศ": { ipa: "dii lə̂ət", cn: "殊胜极好" },
  "เท่ากับ": { ipa: "tʰâw kàp", cn: "等同相较" },
  "เป็นพิษ": { ipa: "pen pʰít", cn: "剧烈剧毒" },
  "เป็นภัย": { ipa: "pen pʰaj", cn: "深重祸患" },
  "มาก": { ipa: "mâak", cn: "极多深厚" },
  "ทุกวันนี้": { ipa: "tʰúk wan níi", cn: "当今世道" },
  "เต็มไปด้วย": { ipa: "tem paj dûaj", cn: "充盈遍布" },
  "ตัวหลักๆ": { ipa: "tua làk làk", cn: "纲领门类" },
  "สาม": { ipa: "sǎam", cn: "三" },
  "กลุ่ม": { ipa: "klùm", cn: "部类/门派" },
  "ใหญ่ๆ": { ipa: "jài jài", cn: "广大显要" },
  "กลุ่มใหญ่ๆ": { ipa: "klùm jài jài", cn: "三大宗流" },
  "พวกหนึ่ง": { ipa: "pʰûak nɯ̀ŋ", cn: "有一派" },
  "ไม่ยอมรับ": { ipa: "mâj jɔɔm-ráp", cn: "拒不承认" },
  "เรื่องเหตุ": { ipa: "rɯ̂aŋ hèet", cn: "因由之事" },
  "เรื่อง": { ipa: "rɯ̂aŋ", cn: "事由/关于" },
  "เหตุ": { ipa: "hèet", cn: "起因/因" },
  "คิดว่า": { ipa: "kʰít wâa", cn: "以为/作想" },
  "คิด": { ipa: "kʰít", cn: "思量作意" },
  "ก็คิด": { ipa: "kɔ̂ɔ kʰít", cn: "便如是想" },
  "ทุกสิ่งทุกอย่าง": { ipa: "tʰúk sìŋ tʰúk jàaŋ", cn: "诸法万有" },
  "ทุกสิ่ง": { ipa: "tʰúk sìŋ", cn: "一切事物" },
  "ที่เราเจอ": { ipa: "tʰîi raw cəə", cn: "吾等所逢" },
  "เจอ": { ipa: "cəə", cn: "遭遇碰触" },
  "ฟลุ๊คๆ": { ipa: "flúk flúk", cn: "碰巧侥幸" },
  "ฟลุกๆ": { ipa: "flúk flúk", cn: "纯属巧合" },
  "ฟลุกเอา": { ipa: "flúk ʔaw", cn: "侥幸得之" },
  "ฟลุก": { ipa: "flúk", cn: "侥幸偶然" },
  "ไม่มีเหตุ": { ipa: "mâj mii hèet", cn: "无因而起" },
  "ไม่เหมือน": { ipa: "mâj mɯ̌an", cn: "殊不相同" },
  "รุ่นก่อนๆ": { ipa: "rûn kɔ̀ɔn kɔ̀ɔn", cn: "往昔前贤" },
  "รุ่น": { ipa: "rûn", cn: "世代辈" },
  "ก่อนๆ": { ipa: "kɔ̀ɔn kɔ̀ɔn", cn: "往昔早先" },
  "ก่อน": { ipa: "kɔ̀ɔn", cn: "预先/首先" },
  "ถือว่า": { ipa: "tʰɯ̌ɯ wâa", cn: "认定为" },
  "กำหนด": { ipa: "kam-nòt", cn: "主宰定规" },
  "ทุกอย่าง": { ipa: "tʰúk jàaŋ", cn: "一应万物" },
  "แต่": { ipa: "tɛ̀ɛ", cn: "然而/但是" },
  "ปฏิวัติ": { ipa: "pà-tì-wát", cn: "彻底革新" },
  "ความเชื่อ": { ipa: "kʰwaam cʰɯ̂a", cn: "信仰观念" },
  "เรื่องนี้": { ipa: "rɯ̂aŋ níi", cn: "此一节事" },
  "หรือเปล่า": { ipa: "rɯ̌ɯ plàaw", cn: "是否如此" },
  "ไม่สำคัญ": { ipa: "mâj sǎm-kʰan", cn: "无关紧要" },
  "แต่ว่า": { ipa: "tɛ̀ɛ wâa", cn: "然则" },
  "ชีวิตเรา": { ipa: "chii-wít raw", cn: "吾人性命" },
  "ชีวิต": { ipa: "chii-wít", cn: "生机/生命" },
  "เป็นไปตาม": { ipa: "pen paj taam", cn: "循依契合" },
  "ตาม": { ipa: "taam", cn: "依循顺从" },
  "ตามเหตุ": { ipa: "taam hèet", cn: "从因所生" },
  "ตามปัจจัย": { ipa: "taam pàt-caj", cn: "随顺诸缘" },
  "ที่มา": { ipa: "tʰîi maa", cn: "所聚会处" },
  "ที่เป็นบุญ": { ipa: "tʰîi pen bun", cn: "属乎福德" },
  "มีผล": { ipa: "mii pʰǒn", cn: "感应成果" },
  "มีความสุข": { ipa: "mii kʰwaam sùk", cn: "享得安乐" },
  "ได้": { ipa: "dâaj", cn: "能够/得证" },
  "ที่เป็นบาป": { ipa: "tʰîi pen bàap", cn: "招致恶报" },
  "ก็มีผล": { ipa: "kɔ̂ɔ mii pʰǒn", cn: "自有果克" },
  "ไม่มีใคร": { ipa: "mâj mii kʰraj", cn: "绝无他人" },
  "ใคร": { ipa: "kʰraj", cn: "何人" },
  "ทำให้เรา": { ipa: "tʰam hâj raw", cn: "代吾造作" },
  "ตัวเราเอง": { ipa: "tua raw ʔeeŋ", cn: "唯我自身" },
  "เอง": { ipa: "ʔeeŋ", cn: "独自/自身" },
  "ไม่ว่า": { ipa: "mâj wâa", cn: "不论是" },
  "ทางดี": { ipa: "tʰaaŋ dii", cn: "善趣之途" },
  "หรือ": { ipa: "rɯ̌ɯ", cn: "抑或" },
  "ทางชั่ว": { ipa: "tʰaaŋ cʰûa", cn: "恶劣道途" },
  "ทาง": { ipa: "tʰaaŋ", cn: "道路方位" },
  "ดี": { ipa: "dii", cn: "良善美好" },
  "ชั่ว": { ipa: "cʰûa", cn: "卑劣过恶" },
  "ท่าน": { ipa: "tʰâan", cn: "尊长/师父" },
  "สอน": { ipa: "sɔ̌ɔn", cn: "示教训诫" },
  "รู้": { ipa: "rúu", cn: "觉了明知" },
  "ไม่": { ipa: "mâj", cn: "非/不" },
  "ไม่ใช่": { ipa: "mâj cʰâj", cn: "绝非" },
  "คือ": { ipa: "kʰɯɯ", cn: "即是" },
  "ให้": { ipa: "hâj", cn: "予以/致令" },
  "นี้": { ipa: "níi", cn: "当此/这" },
  "นั้น": { ipa: "nán", cn: "彼处/那" },
  "ฉะนั้น": { ipa: "cʰàʔ-nán", cn: "有鉴于此" },
  "เพราะฉะนั้น": { ipa: "pʰrɔ́ʔ cʰàʔ-nán", cn: "缘是之故" },
  "เพราะ": { ipa: "pʰrɔ́ʔ", cn: "以……缘故" },
  "เพื่อ": { ipa: "pʰɯ̂a", cn: "志在/为了" },
  "หาย": { ipa: "hǎaj", cn: "寂止隐灭" },
  "ต้อง": { ipa: "tɔ̂ŋ", cn: "务必应当" },
  "ขึ้น": { ipa: "kʰɯ̂n", cn: "升发上起" },
  "กับ": { ipa: "kàp", cn: "并与" },
  "อย่าง": { ipa: "jàaŋ", cn: "这般/样式" },
  "เห็น": { ipa: "hěn", cn: "睹见观照" },
  "การ": { ipa: "kaan", cn: "作务行为" },
  "ดู": { ipa: "duu", cn: "觉观注视" },
  "เอา": { ipa: "ʔaw", cn: "取受/要" },
  "บ้าง": { ipa: "bâaŋ", cn: "或多或寡" },
  "เรื่อยๆ": { ipa: "rɯ̂aj rɯ̂aj", cn: "绵延相续" },
  "เข้า": { ipa: "kʰâw", cn: "潜入/进" },
  "ออก": { ipa: "ʔɔ̀ɔk", cn: "散出/离" },
  "นี่": { ipa: "nîi", cn: "此处即是" },
  "ไหน": { ipa: "nǎj", cn: "何方何许" },
  "ยาว": { ipa: "jaaw", cn: "悠长" },
  "สั้น": { ipa: "sân", cn: "促短" },
  "คน": { ipa: "kʰon", cn: "世人" },
  "แถม": { ipa: "tʰɛ̌ɛm", cn: "复兼有之" },
  "ผม": { ipa: "pʰǒm", cn: "贫僧/弟子" },
  "ไม่รู้": { ipa: "mâj rúu", cn: "未曾了知" },
  "ตอนนี้": { ipa: "tɔɔn níi", cn: "当即眼下" },
  "ตอน": { ipa: "tɔɔn", cn: "时际/当此" },
  "ความ": { ipa: "kʰwaam", cn: "体态境界" },
  "อย่างไร": { ipa: "jàaŋ raj", cn: "如何何似" },
  "ด้วย": { ipa: "dûaj", cn: "藉由兼具" },
  "ฝึก": { ipa: "fɯ̀k", cn: "习练修磨" },
  "ทันที": { ipa: "tʰan tʰii", cn: "当下立显" },
  "ไม่กลัว": { ipa: "mâj klua", cn: "无有怯惧" },
  "หนึ่ง": { ipa: "nɯ̀ŋ", cn: "其一" },
  "สอง": { ipa: "sɔ̌ɔŋ", cn: "其二" },
  "สี่": { ipa: "sìi", cn: "其四" },
  "ห้า": { ipa: "hâa", cn: "其五" },
  "อย่างนี้": { ipa: "jàaŋ níi", cn: "如是这般" },
  "ตรง": { ipa: "troŋ", cn: "端直纯一" },
  "หรอก": { ipa: "rɔ̀ɔk", cn: "断语助词" },
  "ไว้": { ipa: "wáj", cn: "置放安顿" },
  "แค่": { ipa: "kʰɛ̂ɛ", cn: "仅仅/止于" },
  "คำ": { ipa: "kʰam", cn: "句读名言" },
  "กำลัง": { ipa: "kam-laŋ", cn: "方当其冲" },
  "ใช้": { ipa: "cʰáj", cn: "用以借假" },
  "บังคับ": { ipa: "baŋ-kʰáp", cn: "强造压服" },
  "เลย": { ipa: "ləəj", cn: "究竟直下" },
  "จริงๆ": { ipa: "ciŋ ciŋ", cn: "真切确乎" },
  "จริง": { ipa: "ciŋ", cn: "真实" },
  "ตน": { ipa: "ton", cn: "自已自身" },
  "สงสัย": { ipa: "sǒŋ-sǎj", cn: "犹疑不决" },
  "ตลอด": { ipa: "tàʔ-lɔ̀ɔt", cn: "终始不息" },
  "ผิด": { ipa: "pʰìt", cn: "违背正见" },
  "ลง": { ipa: "loŋ", cn: "沉降收敛" },
  "ต่อ": { ipa: "tɔ̀ɔ", cn: "针对接续" },
  "นั่ง": { ipa: "nâŋ", cn: "端坐" },
  "เดิน": { ipa: "dəən", cn: "经行步履" },
  "อื่น": { ipa: "ʔɯ̀ɯn", cn: "余外诸般" },
  "รู้สึก": { ipa: "rúu-sɯ̀k", cn: "觉照省思" },
  "หัน": { ipa: "hǎn", cn: "转首回顾" },
  "ทำงาน": { ipa: "tʰam ŋaan", cn: "造作成务" },
  "ถาม": { ipa: "tʰǎam", cn: "问讯探求" },
  "สุดเลย": { ipa: "sùt ləəj", cn: "造极之至" },
  "สุด": { ipa: "sùt", cn: "终极巅峰" },
  "ใหม่": { ipa: "màj", cn: "初开更始" },
  "เครื่อง": { ipa: "kʰrɯ̂aŋ", cn: "机括法具" },
  "บ้าน": { ipa: "bâan", cn: "庐舍归处" },
  "เช่น": { ipa: "cʰên", cn: "诸如例若" },
  "มุ่ง": { ipa: "mûŋ", cn: "心向往之" },
  "ถึง": { ipa: "tʰɯ̌ŋ", cn: "契达亲证" },
  "แปล": { ipa: "plɛɛ", cn: "传译阐明" },
  "ตำรา": { ipa: "tam-raa", cn: "经论典册" },
  "กัน": { ipa: "kan", cn: "相与共同" },
  "โดย": { ipa: "dooj", cn: "凭仗依照" },
  "ส่วนใหญ่": { ipa: "sùan jài", cn: "大半大端" },
  "ส่วน": { ipa: "sùan", cn: "条块支节" },
  "ไหม": { ipa: "mǎj", cn: "疑问语助" },
  "เมื่อไร": { ipa: "mɯ̂a-raj", cn: "几时几岁" },
  "เมื่อ": { ipa: "mɯ̂a", cn: "及至……时" },
  "เดียวกัน": { ipa: "diaw kan", cn: "同一相貌" },
  "ไว้ก่อน": { ipa: "wáj kɔ̀ɔn", cn: "暂且按纳" },
  "หนี": { ipa: "nǐi", cn: "奔逸避逃" },
  "ถลำลง": { ipa: "tʰà-lǎm loŋ", cn: "堕陷陷足" },
  "ถลำ": { ipa: "tʰà-lǎm", cn: "倾跌陷入" },
  "จ้อง": { ipa: "cɔ̂ŋ", cn: "凝眸固视" },
  "ปกติ": { ipa: "pà-kà-tì", cn: "常住平常" },
  "สบาย": { ipa: "sà-baaj", cn: "无碍舒安" },
  "เดี๋ยว": { ipa: "dǐaw", cn: "瞬息俄顷" },
  "บางที": { ipa: "baaŋ tʰii", cn: "偶或时见" },
  "ถ่ายทอด": { ipa: "tʰàaj tʰɔ̂ɔt", cn: "脉脉授受" },
  "ผู้": { ipa: "pʰûu", cn: "行者之人" },
  "ละ": { ipa: "láʔ", cn: "断舍涤除" },
  "ความอยาก": { ipa: "kʰwaam jàak", cn: "贪求爱欲" },
  "อยาก": { ipa: "jàak", cn: "贪欲起念" },
  "ลม": { ipa: "lom", cn: "风气命息" },
  "เร็ว": { ipa: "rew", cn: "捷疾流奔" },
  "เตลิดเปิดเปิง": { ipa: "tà-lə̀ət pə̀ət pəəŋ", cn: "狂乱不羁" },
  "สำคัญ": { ipa: "sǎm-kʰan", cn: "重关法要" },
  "แรก": { ipa: "rɛ̂ɛk", cn: "初地起点" },
  "ตั้งต้น": { ipa: "tâŋ tôn", cn: "发仞肇造" },
  "นิ่ง": { ipa: "nîŋ", cn: "寂寂不动" },
  "ธรรมชาติ": { ipa: "tʰam-máʔ-cʰâat", cn: "自然法尔" },
  "ธรรมดา": { ipa: "tʰam-máʔ-daa", cn: "平常寻常" },
  "ทีแรก": { ipa: "tʰii rɛ̂ɛk", cn: "初开之刻" },
  "อย่า": { ipa: "jàa", cn: "万勿戒绝" },
  "พลัง": { ipa: "pʰá-laŋ", cn: "威德胜力" },
  "พบ": { ipa: "pʰóp", cn: "目触交涉" },
  "เริ่มต้น": { ipa: "rə̂əm tôn", cn: "动念起始" },
  "ไม่เห็น": { ipa: "mâj hěn", cn: "蔽而未睹" },
  "ด่า": { ipa: "dàa", cn: "詈骂加辱" },
  "กลัว": { ipa: "klua", cn: "畏途畏怖" },
  "สังเกต": { ipa: "sǎŋ-kèet", cn: "省察体究" },
  "ยิ่ง": { ipa: "jîŋ", cn: "尤胜倍进" },
  "ทุกวัน": { ipa: "tʰúk wan", cn: "旦暮日日" },
  "จาก": { ipa: "càak", cn: "从此由彼" },
  "ทัน": { ipa: "tʰan", cn: "并驾齐追" },
  "ง่าย": { ipa: "ŋâaj", cn: "坦荡易行" },
  "เฉยๆ": { ipa: "cʰə̌əj cʰə̌əj", cn: "舍受淡然" },
  "ปุ๊บ": { ipa: "púp", cn: "刹那立发" },
  "นอนหลับ": { ipa: "nɔɔn làp", cn: "入梦沉睡" },
  "เจริญ": { ipa: "cà-rəən", cn: "勤勇增益" },
  "ขณะนั้น": { ipa: "kʰà-nàʔ nán", cn: "当是时" },
  "กระบวนการ": { ipa: "krà-buan-kaan", cn: "机理机制" },
  "ตกตะกอน": { ipa: "tòk tà-kɔɔn", cn: "沉淀澄清" },
  "แสดงให้ดู": { ipa: "sà-dɛɛŋ hâj duu", cn: "表露垂范" },
  "ภาษามนุษย์": { ipa: "pʰaa-sǎa má-nút", cn: "人境语言" },
  "ครับ": { ipa: "kʰráp", cn: "敬白助词" },
  "เบิกบาน": { ipa: "bə̀ək-baan", cn: "花开颜舒" },
  "กิจ": { ipa: "kìt", cn: "当尽事务" },
  "นี่ล่ะ": { ipa: "nîi lâʔ", cn: "此即是" },
  "นั่นล่ะ": { ipa: "nân lâʔ", cn: "彼便是" }
};

// 通用朱拉隆功音标规则推导引擎 (Algorithmic Chulalongkorn IPA System)
export function transliterateThaiSyllableToChulaIPA(thai: string): string {
  const clean = thai.trim();
  if (!clean) return "";

  if (CHULA_IPA_DICTIONARY[clean]) return CHULA_IPA_DICTIONARY[clean].ipa;

  const consonants: Record<string, { sound: string; class: 'mid' | 'high' | 'low' }> = {
    'ก': { sound: 'k', class: 'mid' },
    'ข': { sound: 'kʰ', class: 'high' }, 'ฃ': { sound: 'kʰ', class: 'high' },
    'ค': { sound: 'kʰ', class: 'low' }, 'ฅ': { sound: 'kʰ', class: 'low' }, 'ฆ': { sound: 'kʰ', class: 'low' },
    'ง': { sound: 'ŋ', class: 'low' },
    'จ': { sound: 'c', class: 'mid' },
    'ฉ': { sound: 'cʰ', class: 'high' }, 'ช': { sound: 'cʰ', class: 'low' }, 'ฌ': { sound: 'cʰ', class: 'low' },
    'ซ': { sound: 's', class: 'low' },
    'ด': { sound: 'd', class: 'mid' }, 'ฎ': { sound: 'd', class: 'mid' },
    'ต': { sound: 't', class: 'mid' }, 'ฏ': { sound: 't', class: 'mid' },
    'ถ': { sound: 'tʰ', class: 'high' }, 'ฐ': { sound: 'tʰ', class: 'high' },
    'ท': { sound: 'tʰ', class: 'low' }, 'ธ': { sound: 'tʰ', class: 'low' }, 'ฑ': { sound: 'tʰ', class: 'low' }, 'ฒ': { sound: 'tʰ', class: 'low' },
    'น': { sound: 'n', class: 'low' }, 'ณ': { sound: 'n', class: 'low' },
    'บ': { sound: 'b', class: 'mid' },
    'ป': { sound: 'p', class: 'mid' },
    'ผ': { sound: 'pʰ', class: 'high' }, 'พ': { sound: 'pʰ', class: 'low' }, 'ภ': { sound: 'pʰ', class: 'low' },
    'ฝ': { sound: 'f', class: 'high' }, 'ฟ': { sound: 'f', class: 'low' },
    'ม': { sound: 'm', class: 'low' },
    'ย': { sound: 'j', class: 'low' }, 'ญ': { sound: 'j', class: 'low' },
    'ร': { sound: 'r', class: 'low' },
    'ล': { sound: 'l', class: 'low' }, 'ฬ': { sound: 'l', class: 'low' },
    'ว': { sound: 'w', class: 'low' },
    'ศ': { sound: 's', class: 'high' }, 'ษ': { sound: 's', class: 'high' }, 'ส': { sound: 's', class: 'high' },
    'ห': { sound: 'h', class: 'high' }, 'ฮ': { sound: 'h', class: 'low' },
    'อ': { sound: 'ʔ', class: 'mid' }
  };

  const finalMap: Record<string, string> = {
    'ก': 'k', 'ข': 'k', 'ค': 'k', 'ฆ': 'k',
    'ด': 't', 'ต': 't', 'ถ': 't', 'ท': 't', 'ธ': 't', 'จ': 't', 'ช': 't', 'ซ': 't', 'ศ': 't', 'ษ': 't', 'ส': 't', 'ฎ': 't', 'ฏ': 't', 'ฐ': 't', 'ฑ': 't', 'ฒ': 't',
    'บ': 'p', 'ป': 'p', 'พ': 'p', 'ฟ': 'p', 'ภ': 'p', 'ผ': 'p', 'ฝ': 'p',
    'ง': 'ŋ',
    'น': 'n', 'ณ': 'n', 'ญ': 'n', 'ร': 'n', 'ล': 'n', 'ฬ': 'n',
    'ม': 'm',
    'ย': 'j',
    'ว': 'w'
  };

  let initial = "";
  let initialClass: 'mid' | 'high' | 'low' = "mid";

  if (clean.startsWith('ห') && clean.length > 1 && consonants[clean[1]] && consonants[clean[1]].class === 'low') {
    initial = consonants[clean[1]].sound;
    initialClass = 'high';
  } else if (clean.startsWith('อ') && clean[1] === 'ย') {
    initial = 'j';
    initialClass = 'mid';
  } else {
    const firstCh = clean[0];
    const secondCh = clean[1];
    if (consonants[firstCh]) {
      if ((secondCh === 'ร' || secondCh === 'ล' || secondCh === 'ว') && clean.length > 2) {
        initial = consonants[firstCh].sound + secondCh;
        initialClass = consonants[firstCh].class;
      } else {
        initial = consonants[firstCh].sound;
        initialClass = consonants[firstCh].class;
      }
    }
  }

  let toneMark = 0;
  if (clean.includes('่')) toneMark = 1;
  else if (clean.includes('้')) toneMark = 2;
  else if (clean.includes('๊')) toneMark = 3;
  else if (clean.includes('๋')) toneMark = 4;

  let vowel = "a";
  let isDead = false;
  let finalSound = "";

  if (clean.includes('าย')) { vowel = "aaj"; }
  else if (clean.includes('า')) { vowel = "aa"; }
  else if (clean.includes('ิ')) { vowel = "i"; isDead = true; }
  else if (clean.includes('ี')) { vowel = "ii"; }
  else if (clean.includes('ึ')) { vowel = "ɯ"; isDead = true; }
  else if (clean.includes('ือ') || clean.includes('ื')) { vowel = "ɯɯ"; }
  else if (clean.includes('ุ')) { vowel = "u"; isDead = true; }
  else if (clean.includes('ู')) { vowel = "uu"; }
  else if (clean.startsWith('เ') && clean.includes('าะ')) { vowel = "ɔ"; isDead = true; }
  else if (clean.startsWith('เ') && clean.includes('ีย')) { vowel = "ia"; }
  else if (clean.startsWith('เ') && clean.includes('ือ')) { vowel = "ɯa"; }
  else if (clean.startsWith('เ') && clean.includes('อ')) { vowel = "əə"; }
  else if (clean.startsWith('เ')) { vowel = "ee"; }
  else if (clean.startsWith('แ')) { vowel = "ɛɛ"; }
  else if (clean.startsWith('โ')) { vowel = "oo"; }
  else if (clean.startsWith('ใ') || clean.startsWith('ไ') || clean.includes('ัย')) { vowel = "aj"; }
  else if (clean.startsWith('เ') && clean.includes('า')) { vowel = "aw"; }
  else if (clean.includes('ำ')) { vowel = "am"; }
  else if (clean.includes('ัว') || clean.includes('ว')) { vowel = "ua"; }
  else if (clean.includes('ะ')) { vowel = "aʔ"; isDead = true; }
  else if (clean.includes('ั')) { vowel = "a"; isDead = true; }
  else if (clean.includes('็')) { vowel = "e"; isDead = true; }
  else if (clean.includes('ฤๅ')) { vowel = "rɯɯ"; }
  else if (clean.includes('ฤ')) { vowel = "rɯ"; }
  else {
    vowel = "o";
  }

  const lastCh = clean[clean.length - 1];
  if (lastCh !== '์' && lastCh !== 'ะ' && lastCh !== 'า' && lastCh !== 'อ' && finalMap[lastCh]) {
    finalSound = finalMap[lastCh];
    if (finalSound === 'k' || finalSound === 't' || finalSound === 'p') {
      isDead = true;
    } else {
      isDead = false;
    }
  }

  let tone = 1;
  if (toneMark === 1) {
    if (initialClass === 'low') tone = 3;
    else tone = 2;
  } else if (toneMark === 2) {
    if (initialClass === 'low') tone = 4;
    else tone = 3;
  } else if (toneMark === 3) {
    tone = 4;
  } else if (toneMark === 4) {
    tone = 5;
  } else {
    if (isDead) {
      if (initialClass === 'low') tone = 4;
      else tone = 2;
    } else {
      if (initialClass === 'high') tone = 5;
      else tone = 1;
    }
  }

  const accents: Record<number, Record<string, string>> = {
    1: {},
    2: { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', ɯ: 'ɯ̀', ɛ: 'ɛ̀', ɔ: 'ɔ̀', ə: 'ə̀' },
    3: { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û', ɯ: 'ɯ̂', ɛ: 'ɛ̂', ɔ: 'ɔ̂', ə: 'ə̂' },
    4: { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', ɯ: 'ɯ́', ɛ: 'ɛ́', ɔ: 'ɔ́', ə: 'ə́' },
    5: { a: 'ǎ', e: 'ě', i: 'ǐ', o: 'ǒ', u: 'ǔ', ɯ: 'ɯ̌', ɛ: 'ɛ̌', ɔ: 'ɔ̌', ə: 'ə̌' },
  };

  let tonedVowel = vowel;
  const acc = accents[tone];
  if (tone !== 1 && acc) {
    for (let i = 0; i < vowel.length; i++) {
      const ch = vowel[i];
      if (acc[ch]) {
        tonedVowel = vowel.slice(0, i) + acc[ch] + vowel.slice(i + 1);
        break;
      }
    }
  }

  return `${initial || ''}${tonedVowel}${finalSound}`;
}
