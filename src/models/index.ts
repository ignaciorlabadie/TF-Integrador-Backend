import Usuario from './Usuario.js'
import Paciente from './Paciente.js'
import Profesional from './Profesional.js'
import Espacio from './Espacio.js'
import AsignacionEspacio from './AsignacionEspacio.js'
import Turno from './Turno.js'
import Agenda from './Agenda.js'
import Estudio from './Estudio.js'
import AutorizacionEstudio from './AutorizacionEstudio.js'
import TarifaEspacios from './TarifaEspacio.js' 

// Restricciones de integridad referencial compartidas por todas las relaciones.
// Deben coincidir con los `references` de cada modelo y con las migraciones.
const FK_RESTRICT = { onUpdate: 'CASCADE', onDelete: 'RESTRICT' } as const

// --- Relaciones de perfiles (1 a 1) ---
Usuario.hasOne(Paciente, {
    foreignKey: 'usuarioId',
    as: 'paciente',
    ...FK_RESTRICT,
})
Paciente.belongsTo(Usuario, {
    foreignKey: 'usuarioId',
    as: 'usuario',
    ...FK_RESTRICT,
})

Usuario.hasOne(Profesional, {
    foreignKey: 'usuarioId',
    as: 'profesional',
    ...FK_RESTRICT,
})
Profesional.belongsTo(Usuario, {
    foreignKey: 'usuarioId',
    as: 'usuario',
    ...FK_RESTRICT,
})

// --- Relaciones de ocupacion de Espacios (1 a N) ---
// Un espacio tiene muchas asignaciones de horarios
Espacio.hasMany(AsignacionEspacio, {
    foreignKey: 'espacioId',
    as: 'asignaciones',
    ...FK_RESTRICT,
})
AsignacionEspacio.belongsTo(Espacio, {
    foreignKey: 'espacioId',
    as: 'espacio',
    ...FK_RESTRICT,
})

// Un profesional tiene muchas asignaciones de espacios
Profesional.hasMany(AsignacionEspacio, {
    foreignKey: 'profesionalId',
    as: 'asignacionesEspacios',
    ...FK_RESTRICT,
})
AsignacionEspacio.belongsTo(Profesional, {
    foreignKey: 'profesionalId',
    as: 'profesional',
    ...FK_RESTRICT,
})

// --- Relaciones de tarifas de espacios (1 a N) ---
// Un espacio tiene muchas tarifas
Espacio.hasMany(TarifaEspacios, {
    foreignKey: 'espacioId',
    as: 'tarifas',
    ...FK_RESTRICT,
})
TarifaEspacios.belongsTo(Espacio, {
    foreignKey: 'espacioId',
    as: 'espacio',
    ...FK_RESTRICT,
})

// --- Relaciones de turnos (1 a N) ---

// Un paciente tiene muchos turnos
Paciente.hasMany(Turno, {
    foreignKey: 'pacienteId',
    as: 'turnos',
    ...FK_RESTRICT,
})
Turno.belongsTo(Paciente, {
    foreignKey: 'pacienteId',
    as: 'paciente',
    ...FK_RESTRICT,
})

// Un profesional tiene muchos turnos
Profesional.hasMany(Turno, {
    foreignKey: 'profesionalId',
    as: 'turnos',
    ...FK_RESTRICT,
})
Turno.belongsTo(Profesional, {
    foreignKey: 'profesionalId',
    as: 'profesional',
    ...FK_RESTRICT,
})

// Una agenda tiene muchos turnos
Agenda.hasMany(Turno, {
    foreignKey: 'agendaId',
    as: 'turnos',
    ...FK_RESTRICT,
})
Turno.belongsTo(Agenda, {
    foreignKey: 'agendaId',
    as: 'agenda',
    ...FK_RESTRICT,
})

// --- Relaciones de agendas (1 a N) ---

// Un profesional tiene muchas agendas
Profesional.hasMany(Agenda, {
    foreignKey: 'profesionalId',
    as: 'agendas',
    ...FK_RESTRICT,
})
Agenda.belongsTo(Profesional, {
    foreignKey: 'profesionalId',
    as: 'profesional',
    ...FK_RESTRICT,
})

// --- Relaciones de estudios (1 a N) ---

// Un paciente tiene muchos estudios
Paciente.hasMany(Estudio, {
    foreignKey: 'pacienteId',
    as: 'estudios',
    ...FK_RESTRICT,
})
Estudio.belongsTo(Paciente, {
    foreignKey: 'pacienteId',
    as: 'paciente',
    ...FK_RESTRICT,
})

// --- Relaciones de autorizaciones de estudios (1 a N) ---

// Un estudio puede tener muchas autorizaciones
Estudio.hasMany(AutorizacionEstudio, {
    foreignKey: 'estudioId',
    as: 'autorizaciones',
    ...FK_RESTRICT,
})
AutorizacionEstudio.belongsTo(Estudio, {
    foreignKey: 'estudioId',
    as: 'estudio',
    ...FK_RESTRICT,
})

// Un profesional puede tener muchas autorizaciones
Profesional.hasMany(AutorizacionEstudio, {
    foreignKey: 'profesionalId',
    as: 'autorizacionesEstudio',
    ...FK_RESTRICT,
})
AutorizacionEstudio.belongsTo(Profesional, {
    foreignKey: 'profesionalId',
    as: 'profesional',
    ...FK_RESTRICT,
})

export {
    Usuario,
    Paciente,
    Profesional,
    Turno,
    Agenda,
    Estudio,
    AutorizacionEstudio,
    Espacio,
    AsignacionEspacio,
    TarifaEspacios 
}