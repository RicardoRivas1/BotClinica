/**
 * ============================================================
 *  BASE DE DATOS DE LA CLÍNICA
 *  >>> ESTE ES EL ÚNICO ARCHIVO QUE NECESITAS EDITAR <<<
 * ============================================================
 *  Reglas:
 *   - "palabrasClave" son las palabras que el paciente puede escribir.
 *     Escríbelas en minúscula y sin tildes (el bot normaliza el texto).
 *   - Si un dato no existe, NO lo inventes: déjalo fuera y el bot
 *     derivará la consulta al personal automáticamente.
 * ============================================================
 */

// ---------- DATOS GENERALES ----------
const clinica = {
  nombre: 'Clínica Médica',
  horario: 'Lunes a Viernes de 8:00 am a 5:00 pm | Sábados de 8:00 am a 12:00 m',
  direccion: null, // Ej: 'Av. Principal, Torre Médica, Piso 1'
  telefonoGeneral: null, // Ej: '+58 212-XXXXXXX'
};

// ---------- 1. SERVICIOS Y ESTUDIOS ----------
const servicios = [
  {
    nombre: 'ECO (Ecografía)',
    precio: '$40',
    telefono: '+58 424-2128645',
    palabrasClave: ['eco', 'ecografia', 'ecograma', 'ultrasonido', 'eco abdominal'],
    nota: null, // Ej: 'Debe venir en ayunas de 6 horas'
  },

  /* ---- PLANTILLA: copia este bloque para agregar más servicios ----
  {
    nombre: 'RAYOS X',
    precio: '$35',
    telefono: '+58 412-XXXXXXX',
    palabrasClave: ['rayos x', 'radiografia', 'placa'],
    nota: null,
  },
  ------------------------------------------------------------------ */
];

// ---------- 2. ESPECIALIDADES Y DOCTORES ----------
const especialidades = [
  {
    nombre: 'RADIOLOGÍA',
    doctor: 'Dr. Pérez',
    telefono: '+58 424-2128645',
    ubicacion: 'Piso 3, Consultorio 315',
    precio: '$50',
    palabrasClave: ['radiologia', 'radiologo', 'perez', 'dr perez'],
    horario: null, // Ej: 'Martes y Jueves de 9:00 am a 1:00 pm'
  },

  /* ---- PLANTILLA: copia este bloque para agregar más doctores ----
  {
    nombre: 'PEDIATRÍA',
    doctor: 'Dra. Ejemplo',
    telefono: '+58 414-XXXXXXX',
    ubicacion: 'Piso 2, Consultorio 210',
    precio: '$45',
    palabrasClave: ['pediatria', 'pediatra', 'ninos'],
    horario: null,
  },
  ----------------------------------------------------------------- */
];

// ---------- 3. CONFIGURACIÓN DEL BOT ----------
const config = {
  // Número del personal que recibirá las consultas NO resueltas.
  // Formato internacional SIN "+", sin espacios ni guiones. null = desactivado.
  NUMERO_PERSONAL: null, // Ej: '584141234567'

  // Minutos tras los cuales se vuelve a saludar al mismo paciente.
  MINUTOS_PARA_SALUDAR_DE_NUEVO: 120,

  // Ignorar mensajes de grupos.
  IGNORAR_GRUPOS: true,

  // Frase de cierre (regla: siempre preguntar si se puede ayudar en algo más).
  CIERRE: '¿Puedo ayudarte con algo más? 😊',
};

module.exports = { clinica, servicios, especialidades, config };
