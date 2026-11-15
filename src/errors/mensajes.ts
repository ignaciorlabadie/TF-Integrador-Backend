export const MENSAJES = {
    // Autenticación y Usuarios
    AUTENTICACION_REQUERIDA: 'Autenticación requerida',
    SIN_PERMISOS: 'No tenés permisos para realizar esta acción',
    EMAIL_YA_REGISTRADO: 'El email ya está registrado',
    DNI_YA_REGISTRADO: 'El DNI ya está registrado',
    ALTA_PACIENTE_EN_PACIENTES:
        'El alta de pacientes se realiza en POST /pacientes (crea el usuario y su perfil)',
    USUARIO_NO_ENCONTRADO: 'Usuario no encontrado',
    RECUPERACION_SOLICITADA:
        'Si el email está registrado, vas a recibir un enlace de recuperación',
    TOKEN_RECUPERACION_INVALIDO: 'El enlace es inválido o expiró',
    PASSWORD_ACTUALIZADA: 'Contraseña actualizada correctamente',

    // Profesionales
    PROFESIONAL_NO_ENCONTRADO: 'Profesional no encontrado',
    ROL_PROFESIONAL_REQUERIDO: 'La cuenta debe tener el rol PROFESIONAL',
    MATRICULA_YA_REGISTRADA: 'La matrícula ya está registrada',
    PERFIL_YA_ASIGNADO: 'La cuenta ya tiene un perfil profesional asignado',

    // Turnos
    TURNO_YA_EXISTE_EN_ESA_FECHA_HORA:
        'Ya existe un turno para ese profesional en la fecha y hora seleccionada',

    // Validaciones de dominio compartidas
    DIA_SEMANA_INVALIDO: 'El día de la semana no es válido',
    HORA_INVALIDA: 'Las horas deben tener un formato válido HH:mm',
    HORARIO_INVALIDO:
        'La hora de inicio debe ser anterior a la hora de finalización',
    FECHA_INVALIDA: 'La fecha debe tener formato YYYY-MM-DD',
    FECHA_PASADA: 'La fecha de la asignación no puede ser pasada',
    FILTRO_ACTIVO_INVALIDO: 'El filtro activo debe ser true o false',
    SIN_DATOS_ACTUALIZAR: 'No hay datos para actualizar',
    DATOS_INVALIDOS: 'Datos inválidos',

    // Agendas
    AGENDA_NO_ENCONTRADA: 'Agenda no encontrada',
    DURACION_TURNO_INVALIDA:
        'La duración del turno debe ser un número entero positivo',
    DURACION_TURNO_INCOMPATIBLE:
        'La duración del turno debe ser menor o igual al intervalo horario',
    AGENDA_SUPERPUESTA:
        'Ya existe una agenda activa para el profesional en ese día y horario',
    TURNOS_FUTUROS_AFECTADOS:
        'La agenda tiene turnos futuros que quedarían fuera de la nueva disponibilidad',
    TURNOS_FUTUROS_PENDIENTES:
        'No se puede desactivar la agenda porque tiene turnos futuros registrados',

    // Asignaciones de espacio
    TIPO_ASIGNACION_INVALIDO: 'El tipo de asignación no es válido',
    ASIGNACION_NO_ENCONTRADA: 'Asignación no encontrada',
    ASIGNACION_DATOS_INVALIDOS: 'Datos de la asignación inválidos',
    ASIGNACION_FIJA_CON_FECHA: 'Una asignación FIJA no puede tener fecha',
    ASIGNACION_ESPECIFICA_CON_DIA:
        'Una asignación ESPECIFICA no puede tener día de semana',
    ASIGNACION_SUPERPUESTA:
        'La asignación se superpone con otra existente para el espacio y/o profesional',
    ESPACIO_NO_ENCONTRADO: 'Espacio no encontrado',
    ESPACIO_INACTIVO: 'No se puede asignar un espacio inactivo',

    // Espacios
    NOMBRE_ESPACIO_INVALIDO:
        'El nombre del espacio debe tener entre 1 y 100 caracteres',
    TIPO_ESPACIO_INVALIDO: 'El tipo de espacio no es válido',
    UBICACION_ESPACIO_INVALIDA: 'La ubicación del espacio no es válida',
    ESPACIO_DATOS_INVALIDOS: 'Datos del espacio inválidos',
    ESPACIO_FECHAS_INVALIDAS: 'Las fechas deben tener el formato YYYY-MM-DD',
    RANGO_FECHAS_INVALIDO:
        'La fecha de inicio no puede ser posterior a la fecha de fin',
    ESPACIO_CON_DEPENDENCIAS:
        'No se puede eliminar el espacio porque tiene asignaciones o tarifas asociadas. Podés desactivarlo en su lugar',
} as const
