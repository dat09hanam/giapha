/**
 * A name as the family tree shows it: every word starts with a capital and
 * continues in lower case ("nguyễn trần quốc cường" → "Nguyễn Trần Quốc Cường"),
 * however it was typed. Display only; the stored name is unchanged.
 */
export function displayPersonName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      const [first = '', ...rest] = [...word.toLocaleLowerCase('vi')];
      return first.toLocaleUpperCase('vi') + rest.join('');
    })
    .join(' ');
}

/** The name with the person's honorific, if any, in front: "Cụ Tổ Nguyễn Văn An". */
export function displayPersonTitle(person: { name: string; honorific: string | null }): string {
  const name = displayPersonName(person.name);
  const honorific = person.honorific?.trim();
  return honorific ? `${displayPersonName(honorific)} ${name}` : name;
}
