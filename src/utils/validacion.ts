const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/

export function esEmailValido(email: string): boolean {
    return EMAIL_REGEX.test(email)
}

export function esPasswordValida(password: string): boolean {
    return password.length >= 8
}

export function esFechaValida(fecha: string): boolean {
  if (!FECHA_REGEX.test(fecha)) return false
  const date = new Date(fecha)
  return !isNaN(date.getTime())
}

export function esUrlValida(url: unknown): url is string {
  if (typeof url !== 'string' || url.trim().length === 0) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}