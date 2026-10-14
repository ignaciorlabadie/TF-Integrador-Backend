const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/

export function esEmailValido(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

export function esPasswordValida(password: string): boolean {
  return password.length >= 8
}

export function esFechaValida(fecha: string): boolean {
  if (!FECHA_REGEX.test(fecha)) {
    return false
  }

  const fechaParseada = new Date(`${fecha}T00:00:00Z`)

  if (Number.isNaN(fechaParseada.getTime())) {
    return false
  }

  return fechaParseada.toISOString().slice(0, 10) === fecha
}

export function esUrlValida(url: unknown): url is string {
  if (typeof url !== 'string' || url.trim().length === 0) {
    return false
  }

  try {
    const urlParseada = new URL(url)

    return (
      urlParseada.protocol === 'http:' ||
      urlParseada.protocol === 'https:'
    )
  } catch {
    return false
  }
}