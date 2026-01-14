export function createId(prefix: string = 'id') {
  const ts = Date.now().toString(36);
  const rand1 = Math.random().toString(36).slice(2, 10);
  const rand2 = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${ts}_${rand1}${rand2}`;
}

export function ensureUniqueIds<T extends { id: string }>(items: T[], prefix: string = 'id') {
  const seen = new Set<string>();
  let changed = false;

  const next = items.map((item) => {
    if (!item?.id) {
      changed = true;
      const id = createId(prefix);
      seen.add(id);
      return { ...item, id };
    }

    if (!seen.has(item.id)) {
      seen.add(item.id);
      return item;
    }

    changed = true;
    const id = createId(prefix);
    seen.add(id);
    return { ...item, id };
  });

  return { items: next, changed };
}







