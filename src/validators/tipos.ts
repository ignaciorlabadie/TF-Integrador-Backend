export type ResultadoValidacion<T> =
    { ok: true; datos: T } | { ok: false; mensaje: string }
