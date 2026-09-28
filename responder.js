/**
 * Motor de respuestas del bot.
 * Detecta palabras clave, arma respuestas múltiples y aplica el formato de WhatsApp.
 */

const { clinica, servicios, especialidades, estudios, config, TELEFONO_RADIOLOGIA } = require('./database');

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

// ============================================================
//  BUSCADOR DE ESTUDIOS DE RADIOLOGÍA
//  El paciente escribe con sus palabras ("placa de la rodilla",
//  "cuanto cuesta un tac de craneo"), así que se comparan las
//  palabras SIGNIFICATIVAS de cada nombre contra las del mensaje.
// ============================================================

// Cómo llama la gente a cada tipo de estudio.
const TIPOS = {
  'Rayos X': ['rayos x', 'radiografia', 'radiografia simple', 'rx', 'rayo x', 'placa'],
  'Mamografía': ['mamografia', 'mamario', 'mamaria'],
  'Ecosonograma': ['eco', 'ecografia', 'ecograma', 'ultrasonido', 'ultrasonografico', 'sonografia'],
  'Tomografía': ['tomografia', 'tac', 'tomografo', 'scanner', 'tacscan', 'corte computado'],
  'Densitometría': ['densitometria', 'densitometrico', 'masa osea', 'osteoporosis'],
  'Paquete': ['paquete'],
  'Contrastes': ['contraste', 'medios de contraste'],
};

// Palabras que se descartan: no distinguen un estudio de otro.
const PALABRAS_VACIAS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'u', 'con', 'sin',
  'para', 'por', 'al', 'en', 'es', 'son', 'esta', 'estan', 'este', 'estas', 'se', 'me', 'mi', 'te',
  'tu', 'lo', 'que', 'cual', 'cuales', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'cuesta', 'cuestan',
  'precio', 'precios', 'valor', 'vale', 'sale', 'cobran', 'costo', 'dime', 'quiero', 'saber', 'dame',
  'tienen', 'tengo', 'hay', 'hacen', 'pueden', 'puede', 'necesito', 'quieren', 'cuanto', 'cual',
  'estudio', 'estudios', 'examen', 'examenes', 'radiologia', 'imagen', 'imagenes', 'cuanto',
]);

// Palabras técnicas que comparten casi todos los estudios de una familia.
const TOKENS_GENERICOS = new Set([
  'proyeccion', 'proyecciones', 'radiografia', 'radiografico', 'radiograficos', 'rayos', 'placa',
  'digital', 'digitalizacion', 'soporte', 'asistencial', 'simple', 'estudio', 'estudios', 'examen',
  'ecografia', 'ecografico', 'ecograficos', 'eco', 'tomografia', 'tomografico', 'tac',
  'mamografia', 'mamografico', 'densitometria', 'ultrasonido', 'ultrasonografico', 'scanner',
  'segun', 'imagen',
]);

// "bilateral", "ambos", "derecho"... diferencian un estudio de otro pero pesan
// menos: si el paciente solo dice "rodilla", igual le sirven las variantes.
const TOKENS_DE_VARIANTE = new Set([
  'bilaterales', 'bilateral', 'unilateral', 'ambos', 'ambas', 'derecho', 'derecha', 'izquierdo',
  'izquierda', 'unico', 'unica',
]);
const PESO_VARIANTE = 0.4;

// El paciente escribe de otra forma: se equipara a la palabra del estudio.
const SINONIMOS = {
  mama: 'mamario', mamas: 'mamario', mamaria: 'mamario',
  testiculo: 'testicular', testiculos: 'testicular',
  tiroides: 'tiroideo', tiroid: 'tiroideo', tiroidea: 'tiroideo',
  prostata: 'prostatico', prostatica: 'prostatico',
  rinnon: 'renal', rinones: 'renal',
  ovario: 'ovario', ovaries: 'ovario',
  higado: 'higado', pancreas: 'pancreas', bazo: 'bazo', vesicula: 'vesicula',
  craneo: 'craneo', pelvis: 'pelvis', femur: 'femur', humero: 'humero',
  tibia: 'tibia', cubito: 'cubito',
  senos: 'seno', seno: 'seno', paranasales: 'paranasal',
};

// Tipos que sí se buscan por nombre (los "Adicional" son recargos, no estudios).
const TIPOS_BUSCABLES = Object.keys(TIPOS).concat('Especiales');

// Tipos que el paciente puede pedir la lista completa.
const ORDEN_TIPOS = [
  'Rayos X', 'Ecosonograma', 'Tomografía', 'Mamografía', 'Densitometría', 'Paquete', 'Contrastes',
];

/** Quita la "s" final para que "rodillas" y "rodilla" se entiendan. */
function raiz(p) {
  return p.length >= 5 && p.endsWith('s') ? p.slice(0, -1) : p;
}

function palabrasUtiles(texto) {
  return normalizar(texto)
    .split(' ')
    .filter((p) => p.length >= 3 && !PALABRAS_VACIAS.has(p));
}

/** Dos palabras hablan del mismo sitio aunque estén escritas distinto. */
function mismaPalabra(a, b) {
  if (a === b) return true;
  if (SINONIMOS[a] === b) return true;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i >= 6; // comparten prefijo suficiente ("testiculo" ~ "testicular")
}

// Índice de palabras por estudio (se calcula una sola vez al arrancar).
for (const e of estudios) {
  const crudos = [...new Set(palabrasUtiles(e.nombre))].filter((p) => !TOKENS_GENERICOS.has(p));
  e._tokens = [...new Set(crudos.map(raiz))];
  e._peso = crudos.reduce((a, p) => a + (TOKENS_DE_VARIANTE.has(p) ? PESO_VARIANTE : 1), 0);
}

/** Tipos de estudio mencionados en el mensaje ("rayos x", "tac", "mamografia"...). */
function tiposMencionados(texto) {
  return ORDEN_TIPOS.filter((t) => TIPOS[t].some((a) => contiene(texto, a)));
}

/** Precios de una categoría, de menor a mayor, sin repetir. */
function preciosDe(tipo) {
  return [
    ...new Set(estudios.filter((e) => e.tipo === tipo && e.precio).map((e) => Number(e.precio.replace('$', '')))),
  ].sort((a, b) => a - b);
}

/**
 * Busca los estudios que el paciente está preguntando.
 * @returns {Array} todos los que coinciden, del más probable al menos.
 */
function buscarEstudios(texto) {
  const consulta = [...new Set(palabrasUtiles(texto).map(raiz))];
  if (!consulta.length) return [];

  const tiposPedidos = new Set(tiposMencionados(texto));
  const hallados = [];

  for (const e of estudios) {
    if (!TIPOS_BUSCABLES.includes(e.tipo)) continue;
    if (!e._tokens.length || !e._peso) continue;

    let pesoAcierto = 0;
    for (const t of e._tokens) {
      if (consulta.some((c) => mismaPalabra(c, t))) pesoAcierto += TOKENS_DE_VARIANTE.has(t) ? PESO_VARIANTE : 1;
    }
    if (!pesoAcierto) continue;
    // Con coincidencia parcial se exige la mayoría del nombre del estudio.
    if (pesoAcierto / e._peso < 0.6) continue;

    const puntaje = pesoAcierto / e._peso + (tiposPedidos.has(e.tipo) ? 5 : 0);
    hallados.push({ e, puntaje, largo: e._tokens.length });
  }

  hallados.sort(
    (a, b) => b.puntaje - a.puntaje || a.largo - b.largo || a.e.nombre.localeCompare(b.e.nombre, 'es')
  );
  return hallados.map((h) => h.e);
}

// Cuántos estudios se listan en una respuesta antes de resumir el resto.
const MAX_OPCIONES = 8;

// Recargos y extras: se piden por su nombre exacto ("digitalizacion", "placa").
const EXTRAS = new Map(
  estudios.filter((e) => e.tipo === 'Adicional').map((e) => [normalizar(e.nombre), e])
);

function buscarExtra(texto) {
  const limpio = normalizar(texto);
  if (EXTRAS.has(limpio)) return EXTRAS.get(limpio);
  for (const [nombre, e] of EXTRAS) {
    if (nombre.length >= 6 && limpio.includes(nombre)) return e;
  }
  return null;
}

// ---------- FORMATOS ----------
function bloqueServicio(s) {
  const lineas = [`🩺 *${s.nombre}*`];
  if (s.precio) lineas.push(`💵 Precio: *${s.precio}*`);
  if (s.telefono) lineas.push(`📞 Agendar: ${s.telefono}`);
  if (s.nota) lineas.push(`ℹ️ ${s.nota}`);
  return lineas.join('\n');
}

const ICONO_TIPO = {
  'Rayos X': '🩻',
  'Ecosonograma': '🩺',
  'Tomografía': '🖥️',
  'Mamografía': '🎗️',
  'Densitometría': '🦴',
  'Paquete': '🎁',
  'Contrastes': '💉',
  'Especiales': '🧪',
};

/** Un estudio con su precio. */
function bloqueEstudio(e) {
  const lineas = [
    `${ICONO_TIPO[e.tipo] || '🩺'} *${e.nombre}*`,
    `💵 Precio: *${e.precio || 'consultar en recepción'}*`,
  ];
  if (e.nota) lineas.push(`ℹ️ ${e.nota}`);
  lineas.push(`📞 Agendar: ${TELEFONO_RADIOLOGIA}`);
  return lineas.join('\n');
}

/** Varios estudios parecidos: lista compacta con el precio de cada uno. */
function bloqueLista(titulo, lista, sobrantes = 0) {
  const lineas = [`*${titulo}*`, ...lista.map((e) => `• ${e.nombre} — *${e.precio || 'consultar'}*`)];
  const notas = [...new Set(lista.filter((e) => e.nota).map((e) => e.nota))];
  if (notas.length) lineas.push(`ℹ️ ${notas.join(' · ')}`);
  if (sobrantes) lineas.push(`…y ${sobrantes} opción${sobrantes > 1 ? 'es' : ''} más. Dime cuál necesitas.`);
  lineas.push(`📞 Agendar: ${TELEFONO_RADIOLOGIA}`);
  return lineas.join('\n');
}

/** Resumen de una categoría: cuánto va desde y cuántos hay. */
function bloqueResumenTipo(tipo) {
  const precios = preciosDe(tipo);
  const total = estudios.filter((e) => e.tipo === tipo).length;
  return [
    `${ICONO_TIPO[tipo]} *${tipo}*`,
    `💵 Desde *$${precios[0]}*`,
    `📋 Tenemos *${total}* estudios de ${tipo.toLowerCase()}.`,
    `👉 Dime el nombre exacto (por ejemplo *"${ejemploDe(tipo)}"*) y te doy su precio.`,
    `📞 Agendar: ${TELEFONO_RADIOLOGIA}`,
  ].join('\n');
}

/** Un ejemplo corto y representativo de cada categoría. */
function ejemploDe(tipo) {
  const ej = {
    'Rayos X': 'rayos x de columna cervical',
    'Ecosonograma': 'eco abdominal',
    'Tomografía': 'tac de cráneo',
    'Mamografía': 'mamografía bilateral',
    'Densitometría': 'densitometría de cuerpo completo',
    'Paquete': 'paquete mujer',
    'Contrastes': 'kit de contraste',
  };
  return ej[tipo] || tipo.toLowerCase();
}

function bloqueEspecialidad(e) {
  const lineas = [`👨‍⚕️ *${e.nombre}* – ${e.doctor}`];
  if (e.ubicacion) lineas.push(`📍 ${e.ubicacion}`);
  if (e.precio) lineas.push(`💵 Consulta: *${e.precio}*`);
  if (e.telefono) lineas.push(`📞 Citas: ${e.telefono}`);
  if (e.horario) lineas.push(`🕒 ${e.horario}`);
  return lineas.join('\n');
}

function listaCompleta() {
  const partes = [];
  if (servicios.length) {
    partes.push(
      `🏥 *Otros servicios*\n` +
        servicios.map((s) => `• ${s.nombre} — *${s.precio}*`).join('\n')
    );
  }
  partes.push(
    `🩻 *Estudios de radiología (imágenes)*\n` +
      ORDEN_TIPOS.filter((t) => estudios.some((e) => e.tipo === t))
        .map((t) => {
          const precios = preciosDe(t);
          return `• *${t}* — desde *$${precios[0]}* (${estudios.filter((e) => e.tipo === t).length} estudios)`;
        })
        .join('\n')
  );
  if (especialidades.length) {
    partes.push(
      `👨‍⚕️ *Especialidades*\n` +
        especialidades.map((e) => `• ${e.nombre} (${e.doctor})`).join('\n')
    );
  }
  partes.push(
    'Escríbeme el nombre del estudio o la especialidad y te doy los detalles. 📲\n' +
      'Ejemplos: *"eco abdominal"*, *"rayos x de rodilla"*, *"tac de cráneo"*, *"mamografía"*.'
  );
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

  // 2b) Estudios de radiología por nombre ("rayos x de rodilla")
  const tiposPedidos = tiposMencionados(texto);
  let coincidencias = buscarEstudios(texto);
  // Si dijo un tipo ("un eco abdominal") solo se muestran estudios de ese tipo.
  if (tiposPedidos.length === 1) {
    const delTipo = coincidencias.filter((e) => e.tipo === tiposPedidos[0]);
    if (delTipo.length) coincidencias = delTipo;
  }

  const encontrados = coincidencias.slice(0, MAX_OPCIONES);
  const sobrantes = coincidencias.length - encontrados.length;

  if (encontrados.length === 1) {
    bloques.push(bloqueEstudio(encontrados[0]));
    resuelto = true;
  } else if (encontrados.length > 1) {
    const titulo = tiposPedidos.length === 1 ? `${tiposPedidos[0]} – opciones` : `Encontré ${encontrados.length} estudios para eso:`;
    bloques.push(bloqueLista(titulo, encontrados, sobrantes));
    resuelto = true;
  } else {
    // Recargos sueltos ("digitalización", "reimpresión de informe")
    const extra = buscarExtra(texto);
    if (extra) {
      bloques.push(bloqueEstudio(extra));
      resuelto = true;
    } else if (tiposPedidos.length === 1) {
      // Preguntó por una categoría completa ("quiero ver los rayos x")
      bloques.push(bloqueResumenTipo(tiposPedidos[0]));
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

module.exports = { generarRespuesta, normalizar, listaCompleta, buscarEstudios };
