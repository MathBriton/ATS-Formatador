/** Utilitários imutáveis para listas reordenáveis (up/down/remover). */

export function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function replaceItem<T>(list: T[], index: number, value: T): T[] {
  const next = [...list]
  next[index] = value
  return next
}

export function removeItem<T>(list: T[], index: number): T[] {
  return list.filter((_, i) => i !== index)
}
