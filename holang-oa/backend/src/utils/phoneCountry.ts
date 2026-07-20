/**
 * 电话号码 → 国家识别工具
 *
 * 用途：外销（RETAIL/EXTERNAL）客户没有填写地址，但联系人表中存有国际电话。
 * 通过国际区号识别国家，作为「国家标签」与「世界地图统计」的数据来源。
 * 内销（INDUSTRIAL）客户统一归为「中国」。
 *
 * 识别结果为 best-effort：无法识别时返回 null，由用户在 OA 中手动补全。
 */

export interface CountryInfo {
  /** 中文显示名（存入 DB country 字段） */
  zh: string;
  /** 英文名（用于 ECharts 世界地图 region 匹配） */
  en: string;
  /** 大致中心点 [lng, lat]，用于气泡定位 */
  centroid: [number, number];
}

// 国际区号 → 国家信息（仅收录 HOLANG 客户实际出现/可能出海的国家）
const COUNTRY_BY_CODE: Record<string, CountryInfo> = {
  '1':   { zh: '美国/加拿大', en: 'United States', centroid: [-100, 40] },
  '44':  { zh: '英国', en: 'United Kingdom', centroid: [-2, 54] },
  '33':  { zh: '法国', en: 'France', centroid: [2, 46] },
  '49':  { zh: '德国', en: 'Germany', centroid: [10, 51] },
  '81':  { zh: '日本', en: 'Japan', centroid: [138, 36] },
  '82':  { zh: '韩国', en: 'Korea', centroid: [128, 36] },
  '86':  { zh: '中国', en: 'China', centroid: [104, 35] },
  '886': { zh: '中国台湾', en: 'Taiwan', centroid: [121, 24] },
  '65':  { zh: '新加坡', en: 'Singapore', centroid: [104, 1] },
  '60':  { zh: '马来西亚', en: 'Malaysia', centroid: [109, 4] },
  '91':  { zh: '印度', en: 'India', centroid: [79, 22] },
  '55':  { zh: '巴西', en: 'Brazil', centroid: [-52, -10] },
  '57':  { zh: '哥伦比亚', en: 'Colombia', centroid: [-73, 4] },
  '92':  { zh: '巴基斯坦', en: 'Pakistan', centroid: [70, 30] },
  '971': { zh: '阿联酋', en: 'United Arab Emirates', centroid: [54, 24] },
  '966': { zh: '沙特阿拉伯', en: 'Saudi Arabia', centroid: [45, 24] },
  '62':  { zh: '印度尼西亚', en: 'Indonesia', centroid: [113, -2] },
  '84':  { zh: '越南', en: 'Vietnam', centroid: [106, 16] },
  '66':  { zh: '泰国', en: 'Thailand', centroid: [101, 15] },
  '63':  { zh: '菲律宾', en: 'Philippines', centroid: [122, 13] },
  '52':  { zh: '墨西哥', en: 'Mexico', centroid: [-102, 23] },
  '61':  { zh: '澳大利亚', en: 'Australia', centroid: [134, -25] },
  '39':  { zh: '意大利', en: 'Italy', centroid: [12, 42] },
  '34':  { zh: '西班牙', en: 'Spain', centroid: [-4, 40] },
  '31':  { zh: '荷兰', en: 'Netherlands', centroid: [5, 52] },
  '90':  { zh: '土耳其', en: 'Turkey', centroid: [35, 39] },
  '27':  { zh: '南非', en: 'South Africa', centroid: [24, -29] },
  '7':   { zh: '俄罗斯', en: 'Russia', centroid: [90, 62] },
  '351': { zh: '葡萄牙', en: 'Portugal', centroid: [-8, 39] },
  '592': { zh: '圭亚那', en: 'Guyana', centroid: [-59, 5] },
  '40':  { zh: '罗马尼亚', en: 'Romania', centroid: [25, 46] },
  '234': { zh: '尼日利亚', en: 'Nigeria', centroid: [8, 9] },
  '20':  { zh: '埃及', en: 'Egypt', centroid: [30, 26] },
  '212': { zh: '摩洛哥', en: 'Morocco', centroid: [-7, 32] },
  '262': { zh: '留尼汪', en: 'Reunion', centroid: [55, -21] },
  '32':   { zh: '比利时', en: 'Belgium', centroid: [4, 51] },
  '380':  { zh: '乌克兰', en: 'Ukraine', centroid: [31, 49] },
  '358':  { zh: '芬兰', en: 'Finland', centroid: [26, 64] },
  '48':   { zh: '波兰', en: 'Poland', centroid: [19, 52] },
  '64':   { zh: '新西兰', en: 'New Zealand', centroid: [174, -41] },
};

/**
 * 从单条电话号码识别国家
 * @returns CountryInfo | null
 */
export function detectCountryFromPhone(phone: string | null | undefined): CountryInfo | null {
  if (!phone) return null;
  // 归一化：去掉空格、横线、括号、点
  let s = phone.replace(/[\s\-().]/g, '');
  if (s.startsWith('+')) {
    s = s.slice(1);
  } else if (s.startsWith('00')) {
    s = s.slice(2);
  }
  // 部分号码带国内长途前缀 0（如巴基斯坦 0923...），尝试去掉首位 0
  const s2 = s.startsWith('0') ? s.slice(1) : s;

  // 长码优先匹配（如 971 先于 97）
  const codes = Object.keys(COUNTRY_BY_CODE).sort((a, b) => b.length - a.length);
  for (const code of codes) {
    if (s.startsWith(code) || s2.startsWith(code)) {
      return COUNTRY_BY_CODE[code];
    }
  }
  return null;
}

/**
 * 从一组电话号码中推断客户国家：取首个可识别的（多数情况下联系人同属一国）
 * @returns CountryInfo | null
 */
export function detectCountryFromPhones(phones: (string | null | undefined)[]): CountryInfo | null {
  for (const p of phones) {
    const info = detectCountryFromPhone(p);
    if (info) return info;
  }
  return null;
}

/** 内销客户固定国家 */
export const DOMESTIC_COUNTRY: CountryInfo = COUNTRY_BY_CODE['86'];

/** 全部国家映射（供前端/地图使用） */
export { COUNTRY_BY_CODE };
