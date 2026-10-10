const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const GROUPS = ['', 'nghìn', 'triệu'];

function readGroup(value: number, full: boolean): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const units = value % 10;
  const words: string[] = [];

  if (hundreds > 0 || full) words.push(DIGITS[hundreds]!, 'trăm');

  if (tens === 0) {
    if (units > 0 && words.length > 0) words.push('linh');
  } else if (tens === 1) {
    words.push('mười');
  } else {
    words.push(DIGITS[tens]!, 'mươi');
  }

  if (units > 0) {
    if (units === 5 && tens > 0) words.push('lăm');
    else if (units === 1 && tens > 1) words.push('mốt');
    else words.push(DIGITS[units]!);
  }
  return words.join(' ');
}

function readBelowBillion(value: number, full: boolean): string {
  const groups = [value % 1000, Math.floor(value / 1000) % 1000, Math.floor(value / 1_000_000)];
  const words: string[] = [];
  let spoken = full;
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index]!;
    if (group === 0) continue;
    words.push(readGroup(group, spoken), GROUPS[index]!);
    spoken = true;
  }
  return words.filter(Boolean).join(' ');
}

function readWhole(value: number): string {
  if (value < 1_000_000_000) return readBelowBillion(value, false);
  const billions = Math.floor(value / 1_000_000_000);
  const rest = value % 1_000_000_000;
  const head = `${readWhole(billions)} tỷ`;
  return rest === 0 ? head : `${head} ${readBelowBillion(rest, true)}`;
}

export function vndInWords(amount: number): string {
  const whole = Math.trunc(amount);
  if (whole === 0) return 'Không đồng';
  const text = `${whole < 0 ? 'âm ' : ''}${readWhole(Math.abs(whole))} đồng`;
  return text.charAt(0).toLocaleUpperCase('vi') + text.slice(1);
}

const vndFormat = new Intl.NumberFormat('vi-VN');

export function formatVnd(amount: number): string {
  return `${vndFormat.format(amount)} ₫`;
}

export function formatAmountInput(digits: string): string {
  const clean = digits.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return clean ? vndFormat.format(Number(clean)) : '';
}
