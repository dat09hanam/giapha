/** Chữ Hán of common Vietnamese surnames, for the "{họ}族" seal on a book cover. */
const SURNAME_HAN: Record<string, string> = {
  'âu': '歐',
  'bùi': '裴',
  'cao': '高',
  'châu': '周',
  'chu': '朱',
  'doãn': '尹',
  'dương': '楊',
  'đàm': '譚',
  'đào': '陶',
  'đặng': '鄧',
  'đinh': '丁',
  'đoàn': '段',
  'đỗ': '杜',
  'giang': '江',
  'hà': '何',
  'hàn': '韓',
  'hồ': '胡',
  'hoàng': '黃',
  'huỳnh': '黃',
  'hứa': '許',
  'khúc': '曲',
  'khương': '姜',
  'kiều': '喬',
  'lã': '呂',
  'lại': '賴',
  'lâm': '林',
  'lê': '黎',
  'lữ': '呂',
  'lưu': '劉',
  'lương': '梁',
  'lý': '李',
  'mạc': '莫',
  'mai': '梅',
  'ngô': '吳',
  'nghiêm': '嚴',
  'nguyễn': '阮',
  'nông': '農',
  'phạm': '范',
  'phan': '潘',
  'phùng': '馮',
  'quách': '郭',
  'tạ': '謝',
  'tăng': '曾',
  'thái': '蔡',
  'thân': '申',
  'tô': '蘇',
  'tôn': '孫',
  'trần': '陳',
  'triệu': '趙',
  'trịnh': '鄭',
  'trương': '張',
  'từ': '徐',
  'văn': '文',
  'võ': '武',
  'vũ': '武',
  'vương': '王',
};

/** "范" for Phạm; null for a surname not in the list. */
export function surnameHan(surname: string): string | null {
  return SURNAME_HAN[surname.normalize('NFC').trim().toLocaleLowerCase('vi')] ?? null;
}

const STEMS = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
const BRANCHES = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];

/**
 * The Can Chi name of a year: 2015 → "Ất Mùi". Counted by the solar year, so the weeks
 * before Tết carry the coming year's name.
 */
export function canChiYear(year: number): string {
  return `${STEMS[year % 10]} ${BRANCHES[year % 12]}`;
}

/**
 * The clan's surname. The family's own name says it best ("Gia phả họ Nguyễn thôn Vũ Xá" →
 * "Nguyễn"); failing that, the surname most of the men carry, counting only real surnames so
 * placeholder names such as "Thành Viên Thứ 20" are not taken for one. Null when neither tells.
 */
export function clanSurname(familyName: string, menNames: readonly string[]): string | null {
  const named = /(?:^|\s)họ\s+(\p{L}+)/iu.exec(familyName.normalize('NFC'))?.[1];
  if (named) return capitalize(named);

  const counts = new Map<string, number>();
  menNames.forEach((name) => {
    const first = name.normalize('NFC').trim().split(/\s+/)[0];
    if (!first || !surnameHan(first)) return;
    const surname = capitalize(first);
    counts.set(surname, (counts.get(surname) ?? 0) + 1);
  });
  return [...counts].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function capitalize(word: string): string {
  const [first = '', ...rest] = [...word.toLocaleLowerCase('vi')];
  return first.toLocaleUpperCase('vi') + rest.join('');
}
