import type { Rol } from './Rol.js'

export interface CrearUsuario {
    email: string
    password: string
    rol: Rol
    activo?: boolean
}
