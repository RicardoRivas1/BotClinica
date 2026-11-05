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
  nombre: 'Clínica Dr. A.L. Briceño Rossi, Serviascorp C.A.',
  bienvenida:
    'Bienvenido a la Clínica Dr. A.L. Briceño Rossi, Serviascorp C.A.\n' +
    'Para radiología, ecos y tomografías:\n' +
    '02125071719\n' +
    '02125071895\n' +
    '02125071838',
  horario: 'Lunes a Viernes de 8:00 am a 5:00 pm | Sábados de 8:00 am a 12:00 m',
  direccion: null, // Ej: 'Av. Principal, Torre Médica, Piso 1'
  telefonoGeneral: null, // Ej: '+58 212-XXXXXXX'
};

// ---------- 0. ESTUDIOS DE RADIOLOGÍA (precios del Excel) ----------
// Se cargan desde estudios.js, que se genera a partir del Excel de precios.
// No hace falta tocarlos aquí: el bot los encuentra solo.
const { estudios } = require('./estudios');

// Teléfonos para agendar los estudios de radiología (radiología, ecos y tomografías).
const TELEFONOS_RADIOLOGIA = ['02125071719', '02125071895', '02125071838'];
const TELEFONO_RADIOLOGIA = TELEFONOS_RADIOLOGIA.join(' / ');

// Teléfonos de contacto para todo lo relacionado con cardiología.
const TELEFONOS_CARDIOLOGIA = ['04242128645', '02125071720'];

// Seguros aceptados.
const SEGUROS = [
  'Seguros Miranda',
  'Banesco',
  'Makler',
  'Mapfre',
  'Caracas',
  'Plan Administrado Rontarca',
  'Previsora',
];

// Requisitos para la atención.
const REQUISITOS = [
  'Copia de cédula del paciente; si es menor, copia de la partida de nacimiento.',
  'Copia de la cédula del titular de la póliza y carnet de dónde labora.',
  'Informe médico de referencia.',
  'Para estudios de laboratorio, orden médica.',
];

// ---------- 1. SERVICIOS Y ESTUDIOS ----------
// Los estudios de radiología (rayos x, ecos, tomografías, mamografías, densitometrías)
// ya NO se escriben aquí: se cargan solos desde estudios.js con los precios del Excel.
// Este arreglo es solo para otros servicios que quieras agregar (análisis, consultas, etc).
const servicios = [
  {
    nombre: 'LABORATORIO CLÍNICO',
    precio: null,
    telefono: '02125071885',
    palabrasClave: [
      'laboratorio',
      'laboratorio clinico',
      'hematologia',
      'perfil 20',
      'perfil 21',
      'quimica sanguinea',
      'heces',
      'orina',
      'examen de laboratorio',
      'analisis de laboratorio',
    ],
    nota: 'Atención las 24 horas',
  },
  {
    nombre: 'ENDOSCOPIA SUPERIOR',
    precio: '$250',
    telefono: null,
    palabrasClave: ['endoscopia superior', 'endoscopia digestiva alta', 'endoscopia alta'],
    nota: 'Incluye biopsia',
  },
  {
    nombre: 'ENDOSCOPIA INFERIOR',
    precio: '$280',
    telefono: null,
    palabrasClave: ['endoscopia inferior', 'endoscopia digestiva baja', 'colonoscopia', 'endoscopia baja'],
    nota: 'Incluye biopsia',
  },
  {
    nombre: 'ENDOSCOPIA',
    precio: null,
    telefono: null,
    palabrasClave: ['endoscopia'],
    nota: 'Superior: $250 · Inferior: $280. Incluye biopsia.',
    generico: true,
  },
  {
    nombre: 'ATENCIÓN MÉDICA PRIMARIA (APS)',
    precio: null,
    telefono: null,
    palabrasClave: ['aps', 'atencion medica primaria', 'atencion primaria', 'medicina general', 'consulta general'],
    nota: null,
  },
  /* ---- PLANTILLA: copia este bloque para agregar más servicios ----
  {
    nombre: 'consulta médica general',
    precio: '$40',
    telefono: '+58 412-XXXXXXX',
    palabrasClave: ['consulta general', 'medico general'],
    nota: null, // Ej: 'Trae tu cédula y el resultado de tus exámenes'
  },
  ------------------------------------------------------------------ */
];

// ---------- 2. ESPECIALIDADES Y DOCTORES ----------
const especialidades = [
  {
    nombre: 'ANESTESIOLOGÍA',
    doctor: 'Dra. Xiomara Nuñez',
    telefono: '+584242572135',
    ubicacion: null,
    precio: null,
    palabrasClave: ['anestesia', 'anestesiologo', 'xiomara', 'nunez'],
    horario: null,
  },
  {
    nombre: 'CARDIOLOGÍA',
    doctor: 'Dra. Maria Alejandra Jaimes',
    telefono: '+584149470153',
    ubicacion: 'CARDIO P3',
    precio: null,
    palabrasClave: ['cardiologia', 'cardiologo', 'corazon', 'maria', 'alejandra'],
    horario: null,
  },
  {
    nombre: 'CARDIOLOGÍA',
    doctor: 'Dra. Aura Fernandez',
    telefono: '+584241762695',
    ubicacion: 'CARDIO P3, PISO 3',
    precio: null,
    palabrasClave: ['cardiologia', 'cardiologo', 'corazon', 'aura', 'fernandez'],
    horario: null,
  },
  {
    nombre: 'CARDIOLOGÍA',
    doctor: 'Dr. Jhonny Ramirez',
    telefono: '+584149900181',
    ubicacion: 'CARDIO P3, PISO 3',
    precio: null,
    palabrasClave: ['cardiologia', 'cardiologo', 'corazon', 'jhonny', 'ramirez'],
    horario: null,
  },
  {
    nombre: 'CARDIOLOGÍA',
    doctor: 'Dra Genesis Rodriguez',
    telefono: '+584142972086',
    ubicacion: 'CARDIO P3, PISO 3',
    precio: null,
    palabrasClave: ['cardiologia', 'cardiologo', 'corazon', 'genesis', 'rodriguez'],
    horario: null,
  },
  {
    nombre: 'CARDIOLOGÍA',
    doctor: 'Dra Francheska Rodriguez',
    telefono: '+584144747550',
    ubicacion: 'CARDIO P3, PISO 3',
    precio: null,
    palabrasClave: ['cardiologia', 'cardiologo', 'corazon', 'francheska', 'rodriguez'],
    horario: null,
  },
  {
    nombre: 'CARDIOLOGÍA PEDIÁTRICA',
    doctor: 'Dr. Juan Rodríguez',
    telefono: null,
    ubicacion: null,
    precio: null,
    palabrasClave: [
      'cardiologia pediatrica',
      'cardiologia infantil',
      'cardiopediatria',
      'cardiologia',
      'corazon',
      'juan',
      'rodriguez',
    ],
    horario: null,
  },
  {
    nombre: 'CARDIOLOGÍA',
    doctor: 'Dr. Alexander Hernández',
    telefono: '02125071790',
    ubicacion: 'Consultorio 901, PISO 9',
    precio: null,
    palabrasClave: ['cardiologia', 'cardiologo', 'corazon', 'alexander', 'hernandez'],
    horario: null,
  },
  {
    nombre: 'CIRUGÍA GENERAL',
    doctor: 'Dr. Carrasco P, Jesús A.',
    telefono: '+584166331980',
    ubicacion: 'Consultorio 704, PISO 7',
    precio: null,
    palabrasClave: ['cirugia', 'cirugia general', 'cirujano', 'carrasco', 'jesus'],
    horario: null,
  },
  {
    nombre: 'CIRUGÍA GENERAL',
    doctor: 'Dra. Marellys Matheus',
    telefono: '+584247677556',
    ubicacion: 'Consultorio 806, PISO 8',
    precio: null,
    palabrasClave: ['cirugia', 'cirugia general', 'cirujano', 'marellys', 'matheus'],
    horario: null,
  },
  {
    nombre: 'CIRUGÍA GENERAL',
    doctor: 'Dra. Yelitza Manrique',
    telefono: '+584241105401',
    ubicacion: 'Consultorio 104, PISO 10',
    precio: null,
    palabrasClave: ['cirugia', 'cirugia general', 'cirujano', 'yelitza', 'manrique'],
    horario: null,
  },
  {
    nombre: 'CIRUGÍA ONCOLÓGICA',
    doctor: 'Dra. Pezzetti T, Lucía A. C.',
    telefono: null,
    ubicacion: 'Consultorio 705',
    precio: null,
    palabrasClave: ['cirugia oncologica', 'oncologo', 'pezzetti', 'lucia'],
    horario: null,
  },
  {
    nombre: 'CIRUGÍA ONCOLÓGICA',
    doctor: 'Dr. Carrasco P, Jesús A.',
    telefono: '+584166331980',
    ubicacion: 'Consultorio 704, PISO 7',
    precio: null,
    palabrasClave: ['cirugia oncologica', 'oncologo', 'carrasco', 'jesus'],
    horario: null,
  },
  {
    nombre: 'CIRUGÍA PEDIÁTRICA',
    doctor: 'Dr. González G. Rafael A.',
    telefono: '+584143255718',
    ubicacion: null,
    precio: null,
    palabrasClave: ['cirugia pediatrica', 'cirujano pediatrico', 'gonzalez', 'rafael'],
    horario: null,
  },
  {
    nombre: 'ANESTESIOLOGÍA',
    doctor: 'Dr. Ricardo Aguiar',
    telefono: '+584120254925',
    ubicacion: 'PISO 1',
    precio: null,
    palabrasClave: ['anestesia', 'anestesiologo', 'ricardo', 'aguiar'],
    horario: null,
  },
  {
    nombre: 'ANESTESIOLOGÍA',
    doctor: 'Dr Jean Malpica',
    telefono: '+584120254925',
    ubicacion: 'PISO 1',
    precio: null,
    palabrasClave: ['anestesia', 'anestesiologo', 'jean', 'malpica'],
    horario: null,
  },
  {
    nombre: 'ANESTESIOLOGÍA',
    doctor: 'Dra Alejandra Diaz',
    telefono: '+584241508216',
    ubicacion: 'PISO 1',
    precio: null,
    palabrasClave: ['anestesia', 'anestesiologo', 'alejandra', 'diaz'],
    horario: null,
  },
  {
    nombre: 'ANESTESIOLOGÍA',
    doctor: 'Dra. Evimar Perez',
    telefono: '+584243398237',
    ubicacion: 'PISO 1',
    precio: null,
    palabrasClave: ['anestesia', 'anestesiologo', 'evimar'],
    horario: null,
  },
  {
    nombre: 'NEFROLOGÍA',
    doctor: 'Dra. Yoynis Gonzalez',
    telefono: '+584243347093',
    ubicacion: 'PISO 1',
    precio: null,
    palabrasClave: ['nefrologia', 'nefrologo', 'yoynis', 'gonzalez'],
    horario: null,
  },
  {
    nombre: 'ANESTESIOLOGÍA',
    doctor: 'Dra Mileydi Rivera',
    telefono: '+584243186544',
    ubicacion: 'PISO 1',
    precio: null,
    palabrasClave: ['anestesia', 'anestesiologo', 'mileydi', 'rivera'],
    horario: null,
  },
  {
    nombre: 'ENDOCRINOLOGÍA',
    doctor: 'Dr. Camperos S. Paúl E.',
    telefono: '+584242932248',
    ubicacion: 'Consultorio 101, PISO 10',
    precio: null,
    palabrasClave: ['endocrinologia', 'endocrinologo', 'tiroides', 'camperos', 'paul'],
    horario: null,
  },
  {
    nombre: 'GASTROENTEROLOGÍA',
    doctor: 'Dr. Santiago D. Mario de J.',
    telefono: '+584126168774',
    ubicacion: 'Consultorio 302, PISO 3',
    precio: null,
    palabrasClave: ['gastroenterologia', 'gastroenterologo', 'gastro', 'santiago', 'mario'],
    horario: null,
  },
  {
    nombre: 'GASTROENTEROLOGÍA',
    doctor: 'Dr. Orellana S. Simón E.',
    telefono: '+584163026360',
    ubicacion: 'Consultorio 306, PISO 3',
    precio: null,
    palabrasClave: ['gastroenterologia', 'gastroenterologo', 'gastro', 'orellana', 'simon'],
    horario: null,
  },
  {
    nombre: 'GINECOLOGÍA ONCOLÓGICA',
    doctor: 'Dra Johatson Freytez',
    telefono: '+584242527070',
    ubicacion: 'Consultorio 105',
    precio: null,
    palabrasClave: ['ginecologia oncologica', 'oncologo ginecologo', 'johatson', 'freytez'],
    horario: null,
  },
  {
    nombre: 'GINECOLOGÍA',
    doctor: 'Dra Samanta Rossi',
    telefono: '+584143517835',
    ubicacion: 'Consultorio 107, PISO 10',
    precio: null,
    palabrasClave: ['ginecologia', 'ginecologo', 'gineco', 'obstetra', 'samanta', 'rossi'],
    horario: null,
  },
  {
    nombre: 'GINECOLOGÍA',
    doctor: 'Dra. Mayerlin Fajardo',
    telefono: '+584141152651',
    ubicacion: 'Consultorio 107, PISO 10',
    precio: null,
    palabrasClave: ['ginecologia', 'ginecologo', 'gineco', 'obstetra', 'mayerlin', 'fajardo'],
    horario: null,
  },
  {
    nombre: 'GINECOLOGÍA',
    doctor: 'Dra. Arellano S. Alba J.',
    telefono: '+584129618669',
    ubicacion: 'Consultorio 707, PISO 7',
    precio: null,
    palabrasClave: ['ginecologia', 'ginecologo', 'gineco', 'obstetra', 'arellano', 'alba'],
    horario: null,
  },
  {
    nombre: 'GINECOLOGÍA',
    doctor: 'Dr. Segura B. Luis D.',
    telefono: '+584166206315',
    ubicacion: 'Consultorio 803, PISO 8',
    precio: null,
    palabrasClave: ['ginecologia', 'ginecologo', 'gineco', 'obstetra', 'segura'],
    horario: null,
  },
  {
    nombre: 'GINECOLOGÍA',
    doctor: 'Dr. Eduardo Reyes',
    telefono: '+584142773142',
    ubicacion: 'Consultorio 803, PISO 8',
    precio: null,
    palabrasClave: ['ginecologia', 'ginecologo', 'gineco', 'obstetra', 'eduardo'],
    horario: null,
  },
  {
    nombre: 'GINECOLOGÍA',
    doctor: 'Dr. Manuel Marin',
    telefono: '+584165386646',
    ubicacion: 'Consultorio 905, PISO 9',
    precio: null,
    palabrasClave: ['ginecologia', 'ginecologo', 'gineco', 'obstetra', 'marin'],
    horario: null,
  },
  {
    nombre: 'GINECOLOGÍA',
    doctor: 'Dra Viviana Elisa',
    telefono: '+584146884575',
    ubicacion: 'Consultorio 105, PISO 10',
    precio: null,
    palabrasClave: ['ginecologia', 'ginecologo', 'gineco', 'obstetra', 'viviana', 'elisa'],
    horario: null,
  },
  {
    nombre: 'HEMATOLOGÍA',
    doctor: 'Dr. Inaty L. Joaquín J.',
    telefono: null,
    ubicacion: 'piso 4',
    precio: null,
    palabrasClave: ['hematologia', 'hematologo', 'hematologos', 'sangre', 'inaty', 'joaquin'],
    horario: null,
  },
  {
    nombre: 'GINECOLOGÍA ONCOLÓGICA',
    doctor: 'Dra Viviana Elisa',
    telefono: '+584146884575',
    ubicacion: 'Consultorio 105, PISO 10',
    precio: null,
    palabrasClave: ['ginecologia oncologica', 'oncologo ginecologo', 'viviana', 'elisa'],
    horario: null,
  },
  {
    nombre: 'MEDICINA INTERNA',
    doctor: 'Dr. Reyes H. Héctor José',
    telefono: null,
    ubicacion: 'Consultorio 101',
    precio: null,
    palabrasClave: ['internista', 'medicina interna', 'reyes', 'hector'],
    horario: null,
  },
  {
    nombre: 'HEMATOLOGÍA ONCOLÓGICA',
    doctor: 'Dra. Andrea Sanchez',
    telefono: '+584125444863',
    ubicacion: 'piso 4, PISO 4',
    precio: null,
    palabrasClave: ['hematologia', 'hematologo', 'hematologos', 'hematologia oncologica', 'andrea', 'sanchez'],
    horario: null,
  },
  {
    nombre: 'MEDICINA INTENSIVA',
    doctor: 'Dr. Jose Pernalete',
    telefono: '+584166229538',
    ubicacion: 'PISO 1',
    precio: null,
    palabrasClave: ['intensivista', 'jose', 'pernalete'],
    horario: null,
  },
  {
    nombre: 'MEDICINA INTERNA',
    doctor: 'Dr. Vázquez G. Luis Manuel',
    telefono: '+584140140074',
    ubicacion: 'Consultorio 802, PISO 8',
    precio: null,
    palabrasClave: ['internista', 'medicina interna', 'vazquez', 'luis'],
    horario: null,
  },
  {
    nombre: 'MEDICINA INTERNA',
    doctor: 'Dra Josselyn Pazos',
    telefono: '+584249339654',
    ubicacion: 'Consultorio 703, PISO 7',
    precio: null,
    palabrasClave: ['internista', 'medicina interna', 'josselyn', 'pazos'],
    horario: null,
  },
  {
    nombre: 'NEUMOLOGÍA',
    doctor: 'Dra. Quiñones S. Maira E.',
    telefono: '+584166207877',
    ubicacion: 'Consultorio 906, PISO 9',
    precio: null,
    palabrasClave: ['neumologia', 'neumonologia', 'neumologo', 'pulmon', 'quinones', 'maira'],
    horario: null,
  },
  {
    nombre: 'REUMATOLOGÍA',
    doctor: 'Dra Josselyn Pazos',
    telefono: '+584249339654',
    ubicacion: 'Consultorio 703, PISO 7',
    precio: null,
    palabrasClave: ['reumatologia', 'reumatologo', 'reumas', 'josselyn', 'pazos'],
    horario: null,
  },
  {
    nombre: 'REUMATOLOGÍA',
    doctor: 'Dr. Marcos Prieto',
    telefono: '+584121445768',
    ubicacion: 'Consultorio 903, PISO 9',
    precio: null,
    palabrasClave: ['reumatologia', 'reumatologo', 'reumas', 'marcos', 'prieto'],
    horario: null,
  },
  {
    nombre: 'NEUMOLOGÍA',
    doctor: 'Dr. Salazar B. Lisbeth C.',
    telefono: '+584166130136',
    ubicacion: 'Consultorio 801, PISO 8',
    precio: null,
    palabrasClave: ['neumologia', 'neumonologia', 'neumologo', 'pulmon', 'salazar', 'lisbeth'],
    horario: null,
  },
  {
    nombre: 'NEUMOLOGÍA',
    doctor: 'Dra. Edermary Nuñez',
    telefono: '+584246811400',
    ubicacion: 'Consultorio 506, PISO 5',
    precio: null,
    palabrasClave: ['neumologia', 'neumonologia', 'neumologo', 'pulmon', 'nunez', 'edermary'],
    horario: null,
  },
  {
    nombre: 'NEUROCIRUGÍA',
    doctor: 'Dr Franquis Samuel Herrera',
    telefono: '+584263054685',
    ubicacion: 'Consultorio 607, PISO 6',
    precio: null,
    palabrasClave: ['neurocirugia', 'neurocirujano', 'cerebro', 'franquis', 'samuel'],
    horario: null,
  },
  {
    nombre: 'NEUROCIRUGÍA',
    doctor: 'Dr Daniel Torres',
    telefono: '+584242606795',
    ubicacion: 'Consultorio 706, PISO 7',
    precio: null,
    palabrasClave: ['neurocirugia', 'neurocirujano', 'cerebro', 'daniel', 'torres'],
    horario: null,
  },
  {
    nombre: 'NEUROLOGÍA',
    doctor: 'Dr. López N., Arévalo Francisco',
    telefono: '+584166370511',
    ubicacion: 'Consultorio 701, PISO 7',
    precio: null,
    palabrasClave: ['neurologia', 'neurologo', 'cerebro', 'lopez', 'arevalo'],
    horario: null,
  },
  {
    nombre: 'PEDIATRÍA',
    doctor: 'Dr. Bermúdez B., Belkis C.',
    telefono: null,
    ubicacion: 'Consultorio 505',
    precio: null,
    palabrasClave: ['pediatria', 'pediatra', 'ninos', 'bermudez', 'belkis'],
    horario: null,
  },
  {
    nombre: 'ONCOLOGÍA',
    doctor: 'Dr. Manuel Serrano',
    telefono: '+584124830204',
    ubicacion: 'piso 4, PISO 4',
    precio: null,
    palabrasClave: ['oncologia', 'oncologo', 'cancer', 'quimioterapia', 'manuel', 'serrano'],
    horario: null,
  },
  {
    nombre: 'OTORRINOLARINGOLOGÍA',
    doctor: 'Dra Carmen Maria Artigas',
    telefono: '+584242018259',
    ubicacion: 'PB',
    precio: null,
    palabrasClave: ['otorrinolaringologia', 'otorrino', 'nariz', 'oido', 'carmen', 'maria'],
    horario: null,
  },
  {
    nombre: 'ALERGOLOGÍA',
    doctor: 'Dr. Oswaldo Perez',
    telefono: '+584126131474',
    ubicacion: 'Consultorio 506, PISO 5',
    precio: null,
    palabrasClave: ['alergologia', 'alergologo', 'alergia', 'oswaldo', 'perez'],
    horario: null,
  },
  {
    nombre: 'PEDIATRÍA',
    doctor: 'Dr. Maria Francia Rojas',
    telefono: '+584242741201',
    ubicacion: 'Consultorio 507, PISO 5',
    precio: null,
    palabrasClave: ['pediatria', 'pediatra', 'infectologia', 'maria', 'francia'],
    horario: null,
  },
  {
    nombre: 'PEDIATRÍA',
    doctor: 'Dra Edermary Nuñez',
    telefono: '+584246811400',
    ubicacion: 'Consultorio 506, PISO 5',
    precio: null,
    palabrasClave: ['pediatria', 'pediatra', 'edermary', 'nunez'],
    horario: null,
  },
  {
    nombre: 'PEDIATRÍA',
    doctor: 'Dra. Kerlin Duran',
    telefono: '+584144199036',
    ubicacion: 'Consultorio 603, PISO 6',
    precio: null,
    palabrasClave: ['pediatria', 'pediatra', 'puericultura', 'kerlin', 'duran'],
    horario: null,
  },
  {
    nombre: 'NEFROLOGÍA PEDIÁTRICA',
    doctor: 'Dra. Franddie Vasquez',
    telefono: '+584166848307',
    ubicacion: 'Consultorio 504, PISO 5',
    precio: null,
    palabrasClave: ['nefrologia pediatrica', 'riñon', 'franddie', 'vasquez'],
    horario: null,
  },
  {
    nombre: 'TRAUMATOLOGÍA',
    doctor: 'Dra Yuliana Garcia',
    telefono: '+584247298658',
    ubicacion: 'Consultorio 606, PISO 6',
    precio: null,
    palabrasClave: ['traumatologia', 'traumatologo', 'ortopedia', 'huesos', 'yuliana', 'garcia'],
    horario: null,
  },
  {
    nombre: 'TRAUMATOLOGÍA',
    doctor: 'Dr. Pérez V. Nelson J.',
    telefono: '+584143228899',
    ubicacion: 'Consultorio 102, PISO 10',
    precio: null,
    palabrasClave: ['traumatologia', 'traumatologo', 'ortopedia', 'huesos', 'perez', 'nelson'],
    horario: null,
  },
  {
    nombre: 'TRAUMATOLOGÍA',
    doctor: 'Dr. Saddy Silva',
    telefono: '+584241937392',
    ubicacion: 'Consultorio 103, PISO 10',
    precio: null,
    palabrasClave: ['traumatologia', 'traumatologo', 'ortopedia', 'huesos', 'saddy', 'silva'],
    horario: null,
  },
  {
    nombre: 'TRAUMATOLOGÍA',
    doctor: 'Dra Carolina Alvarez',
    telefono: '+584149976190',
    ubicacion: 'Consultorio 804, PISO 8',
    precio: null,
    palabrasClave: ['traumatologia', 'traumatologo', 'ortopedia', 'huesos', 'carolina', 'alvarez'],
    horario: null,
  },
  {
    nombre: 'UROLOGÍA',
    doctor: 'Dr. Ali Hamad Alkam',
    telefono: '+584127236283',
    ubicacion: 'Consultorio 906, PISO 9',
    precio: null,
    palabrasClave: ['urologia', 'urologo', 'riñon', 'ali', 'hamad'],
    horario: null,
  },
  {
    nombre: 'DERMATOLOGÍA',
    doctor: 'Dra Abril Sarmiento',
    telefono: '+584122525764',
    ubicacion: 'Consultorio 705, PISO 7',
    precio: null,
    palabrasClave: ['dermatologia', 'dermatologo', 'piel', 'abril', 'sarmiento'],
    horario: null,
  },
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

module.exports = {
  clinica,
  servicios,
  especialidades,
  estudios,
  config,
  TELEFONO_RADIOLOGIA,
  TELEFONOS_RADIOLOGIA,
  TELEFONOS_CARDIOLOGIA,
  SEGUROS,
  REQUISITOS,
};
