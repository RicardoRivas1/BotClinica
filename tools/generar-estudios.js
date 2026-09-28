/**
 * ============================================================
 *  GENERA estudios.js A PARTIR DEL EXCEL DE PRECIOS
 * ============================================================
 *  Uso:
 *    node tools/generar-estudios.js
 *    node tools/generar-estudios.js "01-11-22"      (una pestaña en particular)
 *
 *  Toma la pestaña con la fecha más reciente del Excel y escribe
 *  estudios.js, que es lo que lee el bot.
 *
 *  No necesita instalar nada: el .xlsx se lee con la librería zip
 *  que ya viene incluida en Node.
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RAIZ = path.join(__dirname, '..');
const EXCEL = path.join(RAIZ, 'LISTADO Precios RADIOLOGIA.xlsx');
const SALIDA = path.join(RAIZ, 'estudios.js');

// ---------- LECTOR DE ZIP (los .xlsx son archivos comprimidos) ----------
function leerZip(ruta, interesan) {
  const buf = fs.readFileSync(ruta);

  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 65558; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('El archivo no parece un .xlsx válido.');

  const cuantos = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const salida = {};

  for (let n = 0; n < cuantos; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('Directorio central del .xlsx corrupto.');
    const metodo = buf.readUInt16LE(off + 10);
    const tamComprimido = buf.readUInt32LE(off + 20);
    const lenNombre = buf.readUInt16LE(off + 28);
    const lenExtra = buf.readUInt16LE(off + 30);
    const lenComentario = buf.readUInt16LE(off + 32);
    const offsetLocal = buf.readUInt32LE(off + 42);
    const nombre = buf.toString('utf8', off + 46, off + 46 + lenNombre);

    if (interesan(nombre)) {
      const inicio = offsetLocal + 30 + buf.readUInt16LE(offsetLocal + 26) + buf.readUInt16LE(offsetLocal + 28);
      const datos = buf.slice(inicio, inicio + tamComprimido);
      salida[nombre] = (metodo === 0 ? datos : zlib.inflateRawSync(datos)).toString('utf8');
    }
    off += 46 + lenNombre + lenExtra + lenComentario;
  }
  return salida;
}

// ---------- XML DEL EXCEL ----------
function texto(xml) {
  return xml
    .replace(/<t[^>]*\/>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&');
}

function Hojas(xml) {
  const hojas = [];
  const re = /<sheet[^>]*name="([^"]*)"[^>]*r:id="rId(\d+)"[^>]*\/?>/g;
  let m;
  while ((m = re.exec(xml))) hojas.push({ nombre: texto(m[1]), rid: m[2] });
  return hojas;
}

/** Fecha de una pestaña tipo "01-11-22" o "15-06-2022"; null si no tiene fecha. */
function fechaDe(nombre) {
  const m = nombre.match(/(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{2,4})/);
  if (!m) return null;
  let [, dia, mes, anio] = m.map(Number);
  if (anio < 100) anio += 2000;
  return new Date(anio, mes - 1, dia).getTime();
}

function columnaDe(ref) {
  const letras = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/** Devuelve las filas de una hoja como arreglos de celdas. */
function filasDe(xml, compartidas) {
  const filas = [];
  const filaRe = /<row[^>]*r="\d+"[^>]*>([\s\S]*?)<\/row>/g;
  let fm;
  while ((fm = filaRe.exec(xml))) {
    const celdas = [];
    const cRe = /<c([^>]*)>([\s\S]*?)<\/c>|<c([^>]*)\/>/g;
    let cm;
    while ((cm = cRe.exec(fm[1]))) {
      const attrs = cm[1] || cm[3] || '';
      const inside = cm[2] || '';
      const ref = attrs.match(/r="([A-Z]+\d+)"/);
      const tipo = (attrs.match(/t="([^"]+)"/) || [])[1] || 'n';
      const v = inside.match(/<v>([\s\S]*?)<\/v>/);
      let valor = '';
      if (tipo === 's') valor = v ? compartidas[+v[1]] : '';
      else if (tipo === 'inlineStr') valor = texto(inside);
      else valor = v ? texto(v[1]) : '';
      celdas[ref ? columnaDe(ref[1]) : celdas.length] = String(valor).trim();
    }
    filas.push(celdas);
  }
  return filas;
}

// ---------- LIMPIEZA DE LOS NOMBRES DEL EXCEL ----------
const RENOMBRES = {
  'Paquete Mujer eco mamario - desintometria - mamografia 3 Digitalizacion - 3 Soportes - 1 Kit de eco':
    { nombre: 'Paquete Mujer (Eco Mamario + Densitometría + Mamografía)' },
  'Paquete Mujer Eco Mamario - Mamografia 2 Digitalizacion - 2 Soportes - 1 Kit de eco':
    { nombre: 'Paquete Mujer (Eco Mamario + Mamografía)' },
  'Kit de Contraste Oral + Costo examen': { nombre: 'Kit de Contraste Oral', nota: 'Más el costo del examen' },
  'EE Kit de Contraste E,V': { nombre: 'Kit de Contraste E,V' },
  'EE/Transito Intestinal con Contraste Hidrosoluble': { nombre: 'Tránsito Intestinal con Contraste Hidrosoluble' },
  'Mielotac o Cisternografica': { nombre: 'Mielografía o Cisternografía' },
  'Re-impresión Informe': { nombre: 'Reimpresión de Informe' },
  'Eco Abdominoplevico': { nombre: 'Eco Abdominopélvico' },
  'Test de Farril (Medición de Miembros Inferiores)': { nombre: 'Test de Farril' },
  'Eco Mamario 35 AÑOS EN ADELANTE Y TRAER LA ULTIMA MAMOGRAFIA':
    { nombre: 'Eco Mamario', nota: 'A partir de los 35 años, traer la última mamografía' },
  'Eco Doppler Testicular DE 2 AÑOS EN ADELANTE': { nombre: 'Eco Doppler Testicular', nota: 'A partir de los 2 años' },
  'Eco Testicular HASTA LOS 2 AÑOS': { nombre: 'Eco Testicular', nota: 'Solo hasta los 2 años' },
  'Eco Vesical con Medición de Residuos Post Miccional': { nombre: 'Eco Vesical', nota: 'Con medición de residuos post miccional' },
  'Abdomen 2 Proyecciones Colangiografia Trans Kehr':
    { nombre: 'Abdomen 2 Proyecciones', nota: 'Colangiografía trans Kehr: debe venir con su médico y los insumos' },
  'Rinofaringe(Cavum) 2 Proyecciones': { nombre: 'Rinofaringe (Cavum) 2 Proyecciones' },
  'Huesos Propios de Nariz 1 Proyeccion': { nombre: 'Huesos Propios de Nariz 1 Proyección (Waters)' },
  'Atm (2) 4 Proyecciones': { nombre: 'ATM 4 Proyecciones' },
  'TAC de Rodillas con Contracción del Cuádriceps en 0° 15° Y 30°':
    { nombre: 'Tac de Rodillas con Contracción del Cuádriceps' },
};

// Prefijos para textos que el Excel escribe con símbolos raros.
const RENOMBRES_PREFIJO = [['tac de rodillas con contr', { nombre: 'Tac de Rodillas con Contracción del Cuádriceps' }]];

// Lo que el Excel escribe en mayúsculas dentro del nombre y es una indicación
// para el paciente, no parte del nombre del estudio.
const INDICACIONES = [
  [/TRAER VEJIGA LLENA/gi, 'Con la vejiga llena'],
  [/VENIR EN AYUNAS VEJIGA LLENA/gi, 'Venir en ayunas y con la vejiga llena'],
  [/VEJIGA LLENA/gi, 'Con la vejiga llena'],
  [/VENIR EN AYUNAS/gi, 'Venir en ayunas'],
  [/CADA BRAZO ARTERIAL O VENOSO/gi, 'Precio por cada brazo (arterial o venoso)'],
  [/CADA PIERNA ARTERIAL O VENOSO/gi, 'Precio por cada pierna (arterial o venoso)'],
  [/DEBE VENIR CON SU MEDICO \+ INSUMOS/gi, 'Debe venir con su médico y los insumos'],
  [/BOCA ABIERTA BOCA CERRADA/gi, 'Boca abierta y boca cerrada'],
  [/\s*1 DIGITALIZACION 1 SOPORTE/gi, ''],
  [/\s+en\s+[\d\s°ºÂ]+$/gi, ''],
];

const TIPOS = {
  Densitometr\u00eda: 'Densitometría',
  Mamograf\u00eda: 'Mamografía',
  Tomograf\u00eda: 'Tomografía',
};

function clave(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const RENOMBRES_INDICE = new Map();
for (const [k, v] of Object.entries(RENOMBRES)) {
  const nk = clave(k);
  if (!RENOMBRES_INDICE.has(nk)) RENOMBRES_INDICE.set(nk, v);
}

function renombreDe(nombre) {
  const nk = clave(nombre);
  if (RENOMBRES_INDICE.has(nk)) return RENOMBRES_INDICE.get(nk);
  for (const [k, v] of RENOMBRES_PREFIJO) if (nk.startsWith(k)) return v;
  return {};
}

// ---------- PROGRAMA ----------
if (!fs.existsSync(EXCEL)) {
  console.error(`\n❌ No se encontró el Excel: ${EXCEL}`);
  console.error('   Ponlo en la carpeta del bot y vuelve a ejecutar el comando.\n');
  process.exit(1);
}

const pedido = process.argv[2];
const zip = leerZip(EXCEL, (n) =>
  n === 'xl/workbook.xml' || n === 'xl/_rels/workbook.xml.rels' || n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n)
);

const compartidas = [];
{
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(zip['xl/sharedStrings.xml'] || ''))) compartidas.push(texto(m[1]));
}

const relaciones = {};
{
  const re = /<Relationship[^>]*Id="rId(\d+)"[^>]*Target="([^"]*)"[^>]*\/?>/g;
  let m;
  while ((m = re.exec(zip['xl/_rels/workbook.xml.rels']))) relaciones[m[1]] = m[2];
}

const hojas = Hojas(zip['xl/workbook.xml']);
let elegida;
if (pedido) {
  elegida = hojas.find((h) => h.nombre === pedido);
  if (!elegida) {
    console.error(`\n❌ No existe la pestaña "${pedido}". Pestañas disponibles:`);
    console.error('   ' + hojas.map((h) => h.nombre).join(' | ') + '\n');
    process.exit(1);
  }
} else {
  // La pestaña con la fecha más reciente; si ninguna tiene fecha, la última.
  const conFecha = hojas.map((h) => ({ h, f: fechaDe(h.nombre) })).filter((x) => x.f !== null);
  elegida = conFecha.length
    ? conFecha.reduce((a, b) => (b.f > a.f ? b : a)).h
    : hojas[hojas.length - 1];
}
console.log(`Pestaña usada: "${elegida.nombre}"`);

const archivoHoja = 'xl/' + relaciones[elegida.rid].replace(/^\/?xl\//, '');
const filas = filasDe(zip[archivoHoja], compartidas);

const estudios = [];
for (const celdas of filas.slice(1)) {
  const examen = (celdas[0] || '').replace(/\s+/g, ' ').trim();
  const tipo = (celdas[1] || '').trim();
  if (!examen || !tipo) continue; // fila de encabezado de sección

  if (/NO SE REALIZA/i.test(examen)) {
    if (/TIROIDEO/i.test(examen)) {
      estudios.push({ nombre: 'Eco Tiroideo', tipo: 'Ecosonograma', precio: null, nota: 'No se realiza simple, se hace con Doppler' });
    }
    continue;
  }

  // El total es el último número de la fila. En algunas hojas la columna del
  // total quedó corrida y marca 0, por eso se toma el último mayor que cero.
  const numeros = celdas.slice(2).map(Number).filter((n) => !Number.isNaN(n) && n > 0);
  const precio = Math.round(numeros[numeros.length - 1] || 0);
  if (!precio) {
    console.log(`   ⚠️  sin precio, se omite: ${examen}`);
    continue;
  }

  const inicial = renombreDe(examen);
  let nombre = inicial.nombre || examen;
  let nota = inicial.nota || null;
  if (!inicial.nombre) {
    for (const [re, textoIndicacion] of INDICACIONES) {
      if (!re.test(nombre)) continue;
      nombre = nombre.replace(re, textoIndicacion === '' ? '' : ' ').replace(/\s+/g, ' ').trim();
      if (textoIndicacion) nota = nota || textoIndicacion;
    }
  }
  const final = inicial.nombre ? inicial : renombreDe(nombre);
  if (final.nombre) nombre = final.nombre;
  if (final.nota) nota = final.nota;
  if (!nombre) continue;

  estudios.push({ nombre, tipo: TIPOS[tipo] || tipo, precio, nota });
}

// Si el Excel repite un estudio con precios distintos, se queda el más barato.
const unicos = new Map();
for (const e of estudios) {
  const k = `${e.tipo}|${e.nombre.toLowerCase()}`;
  if (!unicos.has(k) || e.precio < unicos.get(k).precio) unicos.set(k, e);
}

const ORDEN = ['Densitometría', 'Mamografía', 'Ecosonograma', 'Rayos X', 'Tomografía', 'Paquete', 'Contrastes', 'Especiales', 'Adicional'];
const finales = [...unicos.values()].sort(
  (a, b) => ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo) || a.nombre.localeCompare(b.nombre, 'es')
);

const cuerpo = finales
  .map(
    (e) =>
      `  { nombre: ${JSON.stringify(e.nombre)}, tipo: ${JSON.stringify(e.tipo)}, precio: ${
        e.precio === null ? 'null' : JSON.stringify('$' + e.precio)
      }, nota: ${e.nota ? JSON.stringify(e.nota) : 'null'} },`
  )
  .join('\n');

fs.writeFileSync(
  SALIDA,
  `/**
 * ============================================================
 *  ESTUDIOS DE RADIOLOGÍA (imágenes) Y SUS PRECIOS
 * ============================================================
 *  Origen: "${path.basename(EXCEL)}" -> pestaña "${elegida.nombre}"
 *  Precios en dólares ($).
 *
 *  NO EDITES ESTE ARCHIVO A MANO.
 *  Para actualizar los precios, reemplaza el Excel y ejecuta:
 *    node tools/generar-estudios.js
 * ============================================================
 */

const estudios = [
${cuerpo}
];

module.exports = { estudios };
`,
  'utf8'
);

const porTipo = {};
for (const e of finales) porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
console.log(`\n✅ ${finales.length} estudios escritos en ${path.relative(RAIZ, SALIDA)}`);
for (const [t, n] of Object.entries(porTipo)) console.log(`   ${n} ${t}`);
