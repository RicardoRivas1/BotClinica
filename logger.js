/**
 * Guarda las consultas que el bot no pudo resolver,
 * para que el personal de la clínica las revise.
 */
const fs = require('fs');
const path = require('path');

const CARPETA = path.join(__dirname, 'data');
const ARCHIVO = path.join(CARPETA, 'pendientes.json');

function asegurarArchivo() {
  if (!fs.existsSync(CARPETA)) fs.mkdirSync(CARPETA, { recursive: true });
  if (!fs.existsSync(ARCHIVO)) fs.writeFileSync(ARCHIVO, '[]', 'utf8');
}

function leerPendientes() {
  asegurarArchivo();
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * @param {string} numero  Número del paciente (ej: 584121234567@c.us)
 * @param {string} nombre  Nombre de contacto de WhatsApp
 * @param {string} mensaje Texto original del paciente
 */
function guardarPendiente(numero, nombre, mensaje) {
  const pendientes = leerPendientes();
  const registro = {
    fecha: new Date().toLocaleString('es-VE'),
    numero: String(numero).replace('@c.us', ''),
    nombre: nombre || 'Sin nombre',
    mensaje,
    atendido: false,
  };
  pendientes.push(registro);
  fs.writeFileSync(ARCHIVO, JSON.stringify(pendientes, null, 2), 'utf8');
  console.log(`📝 Consulta pendiente guardada: ${registro.numero} → "${mensaje}"`);
  return registro;
}

module.exports = { guardarPendiente, leerPendientes, ARCHIVO };
