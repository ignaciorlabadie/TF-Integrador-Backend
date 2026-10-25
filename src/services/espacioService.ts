import { Op } from 'sequelize'
import { Espacio, AsignacionEspacio, Profesional } from '../models/index.js'

const obtenerOcupacion = async (fechaInicio: string, fechaFin: string) => {
    const espacios = await Espacio.findAll({
        include: [
            {
                model: AsignacionEspacio,
                as: 'asignaciones',
                required: false, // Trae el espacio aunque este vacio
                where: {
                    [Op.or]: [
                        { tipo: 'FIJA' },
                        {
                            tipo: 'ESPECIFICA',
                            fecha: {
                                [Op.between]: [fechaInicio, fechaFin]
                            }
                        }
                    ]
                },
                include: [
                    {
                        model: Profesional,
                        as: 'profesional',
                        attributes: ['id', 'nombre', 'apellido'] 
                    }
                ]
            }
        ],
        order: [['id', 'ASC']]
    })

    return espacios
}
export default obtenerOcupacion