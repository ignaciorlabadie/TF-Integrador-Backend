import { createClient } from '@supabase/supabase-js'
import { AppError } from '../errors/AppError.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const nodeEnv = process.env.NODE_ENV || 'development'

const configurado = Boolean(supabaseUrl && supabaseServiceRoleKey)

export const supabase = configurado
    ? createClient(supabaseUrl!, supabaseServiceRoleKey!, {
          auth: { persistSession: false, autoRefreshToken: false },
      })
    : null

export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? 'estudios-medicos'

export const SUPABASE_SIGNED_URL_TTL = Number(process.env.SUPABASE_SIGNED_URL_TTL ?? 3600)

export const SUPABASE_DISPONIBLE = configurado

if (!configurado && nodeEnv !== 'development') {
    throw new AppError(
        500,
        'Supabase no está configurado: faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY',
    )
}

export default supabase