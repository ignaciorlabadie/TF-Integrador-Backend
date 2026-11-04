export const MENSAJES = {
    AUTENTICACION_REQUERIDA: 'Autenticación requerida',
    SIN_PERMISOS: 'No tenés permisos para realizar esta acción',
    EMAIL_YA_REGISTRADO: 'El email ya está registrado',
    DNI_YA_REGISTRADO: 'El DNI ya está registrado',
    ALTA_PACIENTE_EN_PACIENTES:
        'El alta de pacientes se realiza en POST /pacientes (crea el usuario y su perfil)',
    USUARIO_NO_ENCONTRADO: 'Usuario no encontrado',
    PROFESIONAL_NO_ENCONTRADO: 'Profesional no encontrado',
    ROL_PROFESIONAL_REQUERIDO: 'La cuenta debe tener el rol PROFESIONAL',
    MATRICULA_YA_REGISTRADA: 'La matrícula ya está registrada',
    PERFIL_YA_ASIGNADO: 'La cuenta ya tiene un perfil profesional asignado',
    RECUPERACION_SOLICITADA:
        'Si el email está registrado, vas a recibir un enlace de recuperación',
    TOKEN_RECUPERACION_INVALIDO: 'El enlace es inválido o expiró',
    PASSWORD_ACTUALIZADA: 'Contraseña actualizada correctamente',
} as const
