# -*- coding: utf-8 -*-
import json
import re
import os

# 读取提取出的 1195 条字幕时间戳与泰文原句
with open('scripts_temp_31oct_extracted.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

# 读取朱拉隆功字典
with open('src/utils/chulaIpaDict.ts', 'r', encoding='utf-8') as f:
    dict_content = f.read()

dict_entries = {}
for m in re.finditer(r'\"([^\"]+)\":\s*\{\s*ipa:\s*\"([^\"]+)\",\s*cn:\s*\"([^\"]+)\"(?:,\s*tip:\s*\"([^\"]+)\")?(?:,\s*isCore:\s*(true|false))?', dict_content):
    thai_word = m.group(1)
    ipa = m.group(2)
    cn = m.group(3)
    is_core = m.group(5) == 'true'
    dict_entries[thai_word] = {
        'ipa': ipa,
        'cn': cn,
        'isCore': is_core
    }

sorted_dict_keys = sorted(dict_entries.keys(), key=lambda k: len(k), reverse=True)

# 动态朱拉隆功音标推导
CONSONANTS = {
    'ก': ('k', 'k'), 'ข': ('kʰ', 'k'), 'ฃ': ('kʰ', 'k'), 'ค': ('kʰ', 'k'), 'ฅ': ('kʰ', 'k'), 'ฆ': ('kʰ', 'k'),
    'ง': ('ŋ', 'ŋ'), 'จ': ('c', 't'), 'ฉ': ('cʰ', ''), 'ช': ('cʰ', 't'), 'ซ': ('s', 't'), 'ฌ': ('cʰ', 't'),
    'ญ': ('j', 'n'), 'ฎ': ('d', 't'), 'ฏ': ('t', 't'), 'ฐ': ('tʰ', 't'), 'ฑ': ('tʰ', 't'), 'ฒ': ('tʰ', 't'),
    'ณ': ('n', 'n'), 'ด': ('d', 't'), 'ต': ('t', 't'), 'ถ': ('tʰ', 't'), 'ท': ('tʰ', 't'), 'ธ': ('tʰ', 't'),
    'น': ('n', 'n'), 'บ': ('b', 'p'), 'ป': ('p', 'p'), 'ผ': ('pʰ', ''), 'ฝ': ('f', ''), 'พ': ('pʰ', 'p'),
    'ฟ': ('f', 'p'), 'ภ': ('pʰ', 'p'), 'ม': ('m', 'm'), 'ย': ('j', 'j'), 'ร': ('r', 'n'), 'ล': ('l', 'n'),
    'ว': ('w', 'w'), 'ศ': ('s', 't'), 'ษ': ('s', 't'), 'ส': ('s', 't'), 'ห': ('h', ''), 'ฬ': ('l', 'n'),
    'อ': ('ʔ', '')
}

TONE_MARKS = {'่': 1, '้': 2, '๊': 3, '๋': 4}

def transliterate_thai(syllable):
    if not syllable:
        return ''
    clean = syllable.strip()
    if clean in dict_entries:
        return dict_entries[clean]['ipa']
    
    # 简单拼读推导
    init_cons = ''
    fin_cons = ''
    vowel = 'a'
    tone = 0
    
    chars = list(clean)
    for c in chars:
        if c in TONE_MARKS:
            tone = TONE_MARKS[c]
        elif c in CONSONANTS:
            if not init_cons:
                init_cons = CONSONANTS[c][0]
            else:
                fin_cons = CONSONANTS[c][1]
        elif c in 'ะัาำ':
            vowel = 'aa' if c == 'า' else 'a'
        elif c in 'ิี':
            vowel = 'ii' if c == 'ี' else 'i'
        elif c in 'ึื':
            vowel = 'ɯɯ' if c == 'ื' else 'ɯ'
        elif c in 'ุู':
            vowel = 'uu' if c == 'ู' else 'u'
        elif c in 'เแ':
            vowel = 'ɛɛ' if c == 'แ' else 'ee'
        elif c == 'โ':
            vowel = 'oo'
    
    if not init_cons:
        init_cons = 'ʔ'
    
    # 声调符号修饰
    v = vowel
    if tone == 1: # 低调
        v = v[0] + '̀' + (v[1:] if len(v) > 1 else '')
    elif tone == 2: # 降调
        v = v[0] + '̂' + (v[1:] if len(v) > 1 else '')
    elif tone == 3: # 高调
        v = v[0] + '́' + (v[1:] if len(v) > 1 else '')
    elif tone == 4: # 升调
        v = v[0] + '̌' + (v[1:] if len(v) > 1 else '')
        
    return f"{init_cons}{v}{fin_cons}".strip()

def tokenize_thai(thai_text):
    clean = thai_text.strip()
    if not clean:
        return []
    
    tokens = []
    remaining = clean
    w_idx = 0
    
    while len(remaining) > 0:
        m_space = re.match(r'^[\s,，、.。!！?？:：;；\-]+', remaining)
        if m_space:
            remaining = remaining[len(m_space.group(0)):]
            continue
        
        matched_word = None
        for k in sorted_dict_keys:
            if remaining.startswith(k):
                matched_word = k
                break
        
        if matched_word:
            info = dict_entries[matched_word]
            tokens.append({
                'id': f'tok_{w_idx}',
                'thai': matched_word,
                'romanization': info['ipa'],
                'chinese': info['cn'],
                'isCore': info['isCore']
            })
            w_idx += 1
            remaining = remaining[len(matched_word):]
        else:
            m_char = re.match(r'^[ก-๙][ัิีึืฺุู็์่้๊๋]*[ก-๙]?', remaining)
            piece = m_char.group(0) if m_char else remaining[0]
            tokens.append({
                'id': f'tok_{w_idx}',
                'thai': piece,
                'romanization': transliterate_thai(piece),
                'chinese': '助词',
                'isCore': False
            })
            w_idx += 1
            remaining = remaining[len(piece):]
            
    return tokens

def format_time(sec):
    h = sec // 3600
    m = (sec % 3600) // 60
    s = sec % 60
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

print("Tokenization and pronunciation engine initialized.")
