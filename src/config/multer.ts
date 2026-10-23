import multer from 'multer'
import { AppError } from '../errors/AppError.js'

const uploadEstudio = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png']

        if (tiposPermitidos.includes(file.mimetype)) {
            return cb(null, true)
        }

        return cb(new AppError(400, 'Tipo de archivo no permitido. Solo se aceptan PDF, JPEG o PNG'))
    },
})

export default uploadEstudio