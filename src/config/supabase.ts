import { createClient } from '@supabase/supabase-js'
import { AppError } from '../errors/AppError.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new AppError(500, 'Supabase no está configurado: faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
})

export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? 'estudios-medicos'

export const SUPABASE_SIGNED_URL_TTL = Number(process.env.SUPABASE_SIGNED_URL_TTL ?? 3600)

export default supabase