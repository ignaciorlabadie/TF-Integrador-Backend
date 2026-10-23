import { randomUUID } from 'crypto'

import { supabase, SUPABASE_BUCKET, SUPABASE_SIGNED_URL_TTL } from '../config/supabase.js'
import { AppError } from '../errors/AppError.js'

const EXTENSIONES_POR_TIPO: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
}

function requireSupabase() {
    if (!supabase) {
        throw new AppError(503, 'Almacenamiento de archivos no disponible en este entorno')
    }
}

export async function subirArchivoEstudio(
    buffer: Buffer,
    contentType: string,
    pacienteId: number,
): Promise<string> {
    requireSupabase()

    const extension = EXTENSIONES_POR_TIPO[contentType]

    if (!extension) {
        throw new AppError(400, 'Tipo de archivo no permitido. Solo PDF, JPEG o PNG')
    }

    const path = `estudios/${pacienteId}/${randomUUID()}.${extension}`

    const { error } = await supabase!.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
        contentType,
    })

    if (error) {
        throw new AppError(502, 'No se pudo guardar el archivo')
    }

    return path
}

export async function eliminarArchivoEstudio(path: string | null): Promise<void> {
    if (!path || !supabase) return

    const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove([path])

    if (error) {
        console.error('No se pudo eliminar el archivo del storage:', error)
    }
}

export async function crearUrlFirmada(
    path: string,
    ttl: number = SUPABASE_SIGNED_URL_TTL,
): Promise<{ url: string; expiresIn: number }> {
    requireSupabase()

    const { data, error } = await supabase!.storage.from(SUPABASE_BUCKET).createSignedUrl(path, ttl)

    if (error || !data?.signedUrl) {
        throw new AppError(502, 'No se pudo generar la URL firmada')
    }

    return { url: data.signedUrl, expiresIn: ttl }
}