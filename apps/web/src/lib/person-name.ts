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

export function displayPersonTitle(person: { name: string; honorific: string | null }): string {
  const name = displayPersonName(person.name);
  const honorific = person.honorific?.trim();
  return honorific ? `${displayPersonName(honorific)} ${name}` : name;
}
