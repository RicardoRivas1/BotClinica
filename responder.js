/**
 * Motor de respuestas del bot.
 * Detecta palabras clave, arma respuestas múltiples y aplica el formato de WhatsApp.
 */

const { clinica, servicios, especialidades, config } = require('./database');

/** Quita tildes, signos y pasa a minúsculas para comparar sin errores. */
function normalizar(texto = '') {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Busca una palabra clave completa dentro del texto (evita falsos positivos). */
function contiene(texto, palabra) {
  const clave = normalizar(palabra).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!clave) return false;
  return new RegExp(`(^|\\s)${clave}($|\\s)`).test(texto);
}

function coincide(texto, palabrasClave = []) {
  return palabrasClave.some((p) => contiene(texto, p));
}

// ---------- FORMATOS ----------
function bloqueServicio(s) {
  const lineas = [
    `🩺 *${s.nombre}*`,
    `💵 Precio: *${s.precio}*`,
    `📞 Agendar: ${s.telefono}`,
  ];
  if (s.nota) lineas.push(`ℹ️ ${s.nota}`);
  return lineas.join('\n');
}

function bloqueEspecialidad(e) {
  const lineas = [
    `👨‍⚕️ *${e.nombre}* – ${e.doctor}`,
    `📍 ${e.ubicacion}`,
    `💵 Consulta: *${e.precio}*`,
    `📞 Citas: ${e.telefono}`,
  ];
  if (e.horario) lineas.push(`🕒 ${e.horario}`);
  return lineas.join('\n');
}

function listaCompleta() {
  const partes = [];
  if (servicios.length) {
    partes.push(
      `🏥 *Estudios disponibles*\n` +
        servicios.map((s) => `• ${s.nombre} — *${s.precio}*`).join('\n')
    );
  }
  if (especialidades.length) {
    partes.push(
      `👨‍⚕️ *Especialidades*\n` +
        especialidades.map((e) => `• ${e.nombre} (${e.doctor}) — *${e.precio}*`).join('\n')
    );
  }
  partes.push('Escríbeme el nombre del estudio o la especialidad y te doy los detalles. 📲');
  return partes.join('\n\n');
}

// ---------- INTENCIONES GENERALES ----------
const SALUDOS = ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos', 'hey', 'alo'];
const GRACIAS = ['gracias', 'muchas gracias', 'ok gracias', 'listo gracias', 'perfecto gracias'];
const DESPEDIDAS = ['adios', 'chao', 'hasta luego', 'bye', 'nos vemos'];
const MENU = ['menu', 'servicios', 'estudios', 'precios', 'lista', 'informacion', 'info', 'especialidades', 'doctores', 'que tienen'];
const HORARIO = ['horario', 'horarios', 'a que hora', 'hasta que hora', 'abren', 'cierran', 'atienden'];
const UBICACION = ['ubicacion', 'direccion', 'donde quedan', 'donde estan', 'como llego', 'mapa'];
const HUMANO = ['persona', 'humano', 'asesor', 'operador', 'hablar con alguien', 'recepcion', 'secretaria'];

/**
 * Genera la respuesta para un mensaje del paciente.
 * @returns {{ texto: string, resuelto: boolean }}
 *  resuelto=false  -> la consulta debe quedar registrada para el personal.
 */
function generarRespuesta(mensajeUsuario, opciones = {}) {
  const { saludar = false } = opciones;
  const texto = normalizar(mensajeUsuario);
  const bloques = [];
  let resuelto = false;

  // 1) Coincidencias en SERVICIOS (puede haber varias en un mismo mensaje)
  for (const s of servicios) {
    if (coincide(texto, s.palabrasClave)) {
      bloques.push(bloqueServicio(s));
      resuelto = true;
    }
  }

  // 2) Coincidencias en ESPECIALIDADES
  for (const e of especialidades) {
    if (coincide(texto, e.palabrasClave)) {
      bloques.push(bloqueEspecialidad(e));
      resuelto = true;
    }
  }

  // 3) Consultas generales (se suman a lo anterior si aplica)
  if (coincide(texto, HORARIO) && clinica.horario) {
    bloques.push(`🕒 *Horario de atención*\n${clinica.horario}`);
    resuelto = true;
  }

  if (coincide(texto, UBICACION) && clinica.direccion) {
    bloques.push(`📍 *Ubicación*\n${clinica.direccion}`);
    resuelto = true;
  }

  if (!resuelto && coincide(texto, MENU)) {
    bloques.push(listaCompleta());
    resuelto = true;
  }

  if (!resuelto && coincide(texto, HUMANO)) {
    return {
      texto: armar(
        saludar,
        '👩‍💼 Con gusto. Ya le paso tu mensaje a una persona del equipo para que te atienda directamente.'
      ),
      resuelto: false,
    };
  }

  // 4) Solo saludo, sin consulta concreta
  if (!resuelto && coincide(texto, SALUDOS)) {
    return {
      texto:
        `¡Hola! 👋 Bienvenido(a) a *${clinica.nombre}*.\n\n` +
        `${listaCompleta()}\n\n${config.CIERRE}`,
      resuelto: true,
    };
  }

  // 5) Agradecimientos / despedidas
  if (!resuelto && (coincide(texto, GRACIAS) || coincide(texto, DESPEDIDAS))) {
    return {
      texto: `¡Con gusto! 😊 Que estés muy bien. 🏥\n\n${config.CIERRE}`,
      resuelto: true,
    };
  }

  // 6) Caso desconocido -> se deriva al personal
  if (!resuelto) {
    return {
      texto: armar(
        saludar,
        '🙏 Gracias por escribirnos. Esa consulta en particular la debe responder nuestro personal.\n\n' +
          '📝 Ya dejé tu mensaje registrado para que lo revisen y te contacten a la brevedad.'
      ),
      resuelto: false,
    };
  }

  return { texto: armar(saludar, bloques.join('\n\n')), resuelto: true };
}

/** Agrega saludo inicial (si corresponde) y la frase de cierre obligatoria. */
function armar(saludar, cuerpo) {
  const encabezado = saludar ? `¡Hola! 👋 Bienvenido(a) a *${clinica.nombre}*.\n\n` : '';
  return `${encabezado}${cuerpo}\n\n${config.CIERRE}`;
}

module.exports = { generarRespuesta, normalizar, listaCompleta };
