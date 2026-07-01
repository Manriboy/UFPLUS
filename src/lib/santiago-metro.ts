// src/lib/santiago-metro.ts
// Fuente: mapa oficial Metro de Santiago + coordenadas OSM.
// Orden de estaciones: según recorrido oficial de cada línea.

export type MetroLine       = 'L1' | 'L2' | 'L3' | 'L4' | 'L4A' | 'L5' | 'L6'
export type MetroLineFuture = 'L7' | 'L8' | 'L9' | 'L6-EXT'
export type AnyMetroLine    = MetroLine | MetroLineFuture

export type MetroStation = {
  name: string
  line: MetroLine
  lat: number
  lng: number
  transfers?: MetroLine[]
}

export type FutureMetroStation = {
  name: string
  line: MetroLineFuture
  lat: number
  lng: number
}

export const METRO_LINE_COLORS: Record<MetroLine, string> = {
  L1:  '#EE2C2D',
  L2:  '#FAA61A',
  L3:  '#6D5A30',
  L4:  '#1B50A2',
  L4A: '#5B9BD5',
  L5:  '#3F9A3C',
  L6:  '#8A2BE2',
}

export const FUTURE_LINE_COLORS: Record<MetroLineFuture, string> = {
  'L7':    '#96989A',
  'L8':    '#FF6414',
  'L9':    '#EE7FA9',
  'L6-EXT':'#8E2A8B',
}

// ── Polylines en orden oficial ────────────────────────

export const METRO_POLYLINES: Record<MetroLine, [number, number][]> = {
  // L1: San Pablo → Los Dominicos
  L1: [
    [-33.44422,-70.72325], // San Pablo
    [-33.45158,-70.72268], // Neptuno
    [-33.45747,-70.71545], // Pajaritos
    [-33.45754,-70.70676], // Las Rejas
    [-33.45592,-70.69973], // Ecuador
    [-33.45420,-70.69227], // San Alberto Hurtado
    [-33.45286,-70.68656], // U. de Santiago
    [-33.45082,-70.67896], // Estación Central
    [-33.44936,-70.67335], // ULA
    [-33.44770,-70.66714], // República
    [-33.44619,-70.66045], // Los Héroes
    [-33.44487,-70.65487], // La Moneda
    [-33.44385,-70.65067], // Universidad de Chile
    [-33.44246,-70.64474], // Santa Lucía
    [-33.43976,-70.63989], // Universidad Católica
    [-33.43722,-70.63341], // Baquedano
    [-33.43272,-70.62609], // Salvador
    [-33.42855,-70.61965], // Manuel Montt
    [-33.42548,-70.61380], // Pedro de Valdivia
    [-33.42202,-70.60856], // Los Leones
    [-33.41822,-70.60149], // Tobalaba
    [-33.41662,-70.59571], // El Golf
    [-33.41545,-70.58999], // Alcántara
    [-33.41348,-70.58268], // Escuela Militar
    [-33.40946,-70.56973], // Manquehue
    [-33.40794,-70.55585], // Hernando de Magallanes
    [-33.40789,-70.54499], // Los Dominicos
  ],
  // L2: Hospital El Pino → Vespucio Norte (sur a norte)
  L2: [
    [-33.58288,-70.67681], // Hospital El Pino
    [-33.57067,-70.67338], // Copa Lo Martínez
    [-33.56040,-70.67055], // Observatorio
    [-33.54657,-70.66675], // El Bosque
    [-33.53735,-70.66433], // La Cisterna
    [-33.51727,-70.65882], // Lo Ovalle
    [-33.50954,-70.65665], // Ciudad del Niño
    [-33.50244,-70.65463], // Departamental
    [-33.49683,-70.65301], // Lo Vial
    [-33.48872,-70.65107], // San Miguel
    [-33.48260,-70.64938], // El Llano
    [-33.47666,-70.64948], // Franklin
    [-33.46966,-70.65637], // Rondizzoni
    [-33.46085,-70.65685], // Parque O'Higgins
    [-33.45297,-70.65859], // Toesca
    [-33.44619,-70.66045], // Los Héroes
    [-33.43825,-70.65990], // Santa Ana
    [-33.43284,-70.65308], // Puente Cal y Canto
    [-33.42973,-70.64712], // Patronato
    [-33.42275,-70.64506], // Cerro Blanco
    [-33.41398,-70.64360], // Cementerios
    [-33.40595,-70.64317], // Einstein
    [-33.39696,-70.64274], // Dorsal
    [-33.39094,-70.64274], // Zapadores
    [-33.38075,-70.64634], // Vespucio Norte
  ],
  // L3: Plaza Quilicura → Fernando Castillo Velasco
  L3: [
    [-33.36572,-70.72889], // Plaza Quilicura
    [-33.36683,-70.71977], // Lo Cruzat
    [-33.36547,-70.70554], // Ferrocarril
    [-33.36543,-70.69199], // Los Libertadores
    [-33.37326,-70.68634], // Cardenal Caro
    [-33.38538,-70.67964], // Vivaceta
    [-33.39789,-70.66960], // Conchalí
    [-33.40677,-70.66097], // Plaza Chacabuco
    [-33.41767,-70.65646], // Hospitales
    [-33.43284,-70.65308], // Puente Cal y Canto
    [-33.43742,-70.65128], // Plaza de Armas
    [-33.44385,-70.65067], // Universidad de Chile
    [-33.45139,-70.65056], // Parque Almagro
    [-33.45827,-70.64308], // Matta
    [-33.45505,-70.62832], // Irarrázaval
    [-33.45319,-70.61352], // Monseñor Eyzaguirre
    [-33.45419,-70.60497], // Ñuñoa
    [-33.45491,-70.59814], // Chile España
    [-33.45467,-70.58148], // Villa Frei
    [-33.45349,-70.57082], // Plaza Egaña
    [-33.45210,-70.55811], // Fernando Castillo Velasco
  ],
  // L4: Plaza de Puente Alto → Tobalaba (sur a norte)
  L4: [
    [-33.60952,-70.57584], // Plaza de Puente Alto
    [-33.60138,-70.57748], // Las Mercedes
    [-33.58957,-70.57983], // Protectora de la Infancia
    [-33.57690,-70.58232], // Hospital Sótero del Río
    [-33.56929,-70.58381], // Elisa Correa
    [-33.56123,-70.58527], // Los Quillayes
    [-33.55382,-70.58656], // San José de la Estrella
    [-33.54629,-70.58810], // Trinidad
    [-33.53611,-70.59270], // Rojas Magallanes
    [-33.52642,-70.59679], // Vicente Valdés
    [-33.51976,-70.59621], // Vicuña Mackenna
    [-33.50924,-70.59005], // Macul
    [-33.49911,-70.58655], // Las Torres
    [-33.48826,-70.58042], // Quilín
    [-33.47984,-70.57867], // Los Presidentes
    [-33.46953,-70.57650], // Grecia
    [-33.46262,-70.57392], // Los Orientales
    [-33.45349,-70.57082], // Plaza Egaña
    [-33.44618,-70.57193], // Simón Bolívar
    [-33.43920,-70.57315], // Príncipe de Gales
    [-33.43179,-70.58470], // Francisco Bilbao
    [-33.42632,-70.59098], // Cristóbal Colón
    [-33.41822,-70.60149], // Tobalaba
  ],
  // L4A: La Cisterna → Vicuña Mackenna
  L4A: [
    [-33.53735,-70.66433], // La Cisterna
    [-33.54123,-70.64313], // San Ramón
    [-33.54239,-70.63413], // Santa Rosa
    [-33.54113,-70.61605], // La Granja
    [-33.53110,-70.60554], // Santa Julia
    [-33.51976,-70.59621], // Vicuña Mackenna
  ],
  // L5: Plaza de Maipú → Vicente Valdés
  L5: [
    [-33.50993,-70.75731], // Plaza de Maipú
    [-33.49624,-70.75743], // Santiago Bueras
    [-33.49024,-70.75312], // Del Sol
    [-33.48229,-70.74544], // Monte Tabor
    [-33.47527,-70.73998], // Las Parcelas
    [-33.46216,-70.73791], // Laguna Sur
    [-33.45298,-70.73904], // Barrancas
    [-33.44486,-70.74114], // Pudahuel
    [-33.44422,-70.72325], // San Pablo
    [-33.44341,-70.71675], // Lo Prado
    [-33.44133,-70.70665], // Blanqueado
    [-33.43801,-70.69103], // Gruta de Lourdes
    [-33.44037,-70.68029], // Quinta Normal
    [-33.43914,-70.66853], // Cumming
    [-33.43825,-70.65990], // Santa Ana
    [-33.43742,-70.65128], // Plaza de Armas
    [-33.43663,-70.64413], // Bellas Artes
    [-33.43722,-70.63341], // Baquedano
    [-33.44280,-70.63196], // Parque Bustamante
    [-33.44712,-70.63043], // Santa Isabel
    [-33.45505,-70.62832], // Irarrázaval
    [-33.46736,-70.62476], // Ñuble
    [-33.47782,-70.62226], // Rodrigo de Araya
    [-33.48640,-70.61918], // Carlos Valdovinos
    [-33.49179,-70.61752], // Camino Agrícola
    [-33.49934,-70.61583], // San Joaquín
    [-33.50795,-70.61245], // Pedrero
    [-33.51330,-70.60591], // Mirador
    [-33.51952,-70.60003], // Bellavista de La Florida
    [-33.52642,-70.59679], // Vicente Valdés
  ],
  // L6: Cerrillos → Los Leones
  L6: [
    [-33.48343,-70.69556], // Cerrillos
    [-33.47840,-70.68090], // Lo Valledor
    [-33.47869,-70.66479], // Presidente Pedro Aguirre Cerda
    [-33.47666,-70.64948], // Franklin
    [-33.47661,-70.64218], // Bio Bio
    [-33.46736,-70.62476], // Ñuble
    [-33.46238,-70.60622], // Estadio Nacional
    [-33.45419,-70.60497], // Ñuñoa
    [-33.43872,-70.60734], // Inés de Suárez
    [-33.42202,-70.60856], // Los Leones
  ],
}

// ── Marcadores individuales ───────────────────────────

export const METRO_STATIONS: MetroStation[] = [
  // ── L1 ──────────────────────────────────────────────
  { line: 'L1', name: 'San Pablo',              lat: -33.44422, lng: -70.72325, transfers: ['L5'] },
  { line: 'L1', name: 'Neptuno',                lat: -33.45158, lng: -70.72268 },
  { line: 'L1', name: 'Pajaritos',              lat: -33.45747, lng: -70.71545 },
  { line: 'L1', name: 'Las Rejas',              lat: -33.45754, lng: -70.70676 },
  { line: 'L1', name: 'Ecuador',                lat: -33.45592, lng: -70.69973 },
  { line: 'L1', name: 'San Alberto Hurtado',    lat: -33.45420, lng: -70.69227 },
  { line: 'L1', name: 'U. de Santiago',         lat: -33.45286, lng: -70.68656 },
  { line: 'L1', name: 'Estación Central',       lat: -33.45082, lng: -70.67896 },
  { line: 'L1', name: 'ULA',                    lat: -33.44936, lng: -70.67335 },
  { line: 'L1', name: 'República',              lat: -33.44770, lng: -70.66714 },
  { line: 'L1', name: 'Los Héroes',             lat: -33.44619, lng: -70.66045, transfers: ['L2'] },
  { line: 'L1', name: 'La Moneda',              lat: -33.44487, lng: -70.65487 },
  { line: 'L1', name: 'Universidad de Chile',   lat: -33.44385, lng: -70.65067, transfers: ['L3'] },
  { line: 'L1', name: 'Santa Lucía',            lat: -33.44246, lng: -70.64474 },
  { line: 'L1', name: 'Universidad Católica',   lat: -33.43976, lng: -70.63989 },
  { line: 'L1', name: 'Baquedano',              lat: -33.43722, lng: -70.63341, transfers: ['L5'] },
  { line: 'L1', name: 'Salvador',               lat: -33.43272, lng: -70.62609 },
  { line: 'L1', name: 'Manuel Montt',           lat: -33.42855, lng: -70.61965 },
  { line: 'L1', name: 'Pedro de Valdivia',      lat: -33.42548, lng: -70.61380 },
  { line: 'L1', name: 'Los Leones',             lat: -33.42202, lng: -70.60856, transfers: ['L6'] },
  { line: 'L1', name: 'Tobalaba',               lat: -33.41822, lng: -70.60149, transfers: ['L4'] },
  { line: 'L1', name: 'El Golf',                lat: -33.41662, lng: -70.59571 },
  { line: 'L1', name: 'Alcántara',              lat: -33.41545, lng: -70.58999 },
  { line: 'L1', name: 'Escuela Militar',        lat: -33.41348, lng: -70.58268 },
  { line: 'L1', name: 'Manquehue',              lat: -33.40946, lng: -70.56973 },
  { line: 'L1', name: 'Hernando de Magallanes', lat: -33.40794, lng: -70.55585 },
  { line: 'L1', name: 'Los Dominicos',          lat: -33.40789, lng: -70.54499 },
  // ── L2 ──────────────────────────────────────────────
  { line: 'L2', name: 'Hospital El Pino',       lat: -33.58288, lng: -70.67681 },
  { line: 'L2', name: 'Copa Lo Martínez',       lat: -33.57067, lng: -70.67338 },
  { line: 'L2', name: 'Observatorio',           lat: -33.56040, lng: -70.67055 },
  { line: 'L2', name: 'El Bosque',              lat: -33.54657, lng: -70.66675 },
  { line: 'L2', name: 'La Cisterna',            lat: -33.53735, lng: -70.66433, transfers: ['L4A'] },
  { line: 'L2', name: 'Lo Ovalle',              lat: -33.51727, lng: -70.65882 },
  { line: 'L2', name: 'Ciudad del Niño',        lat: -33.50954, lng: -70.65665 },
  { line: 'L2', name: 'Departamental',          lat: -33.50244, lng: -70.65463 },
  { line: 'L2', name: 'Lo Vial',                lat: -33.49683, lng: -70.65301 },
  { line: 'L2', name: 'San Miguel',             lat: -33.48872, lng: -70.65107 },
  { line: 'L2', name: 'El Llano',               lat: -33.48260, lng: -70.64938 },
  { line: 'L2', name: 'Franklin',               lat: -33.47666, lng: -70.64948, transfers: ['L6'] },
  { line: 'L2', name: 'Rondizzoni',             lat: -33.46966, lng: -70.65637 },
  { line: 'L2', name: "Parque O'Higgins",       lat: -33.46085, lng: -70.65685 },
  { line: 'L2', name: 'Toesca',                 lat: -33.45297, lng: -70.65859 },
  { line: 'L2', name: 'Los Héroes',             lat: -33.44619, lng: -70.66045, transfers: ['L1'] },
  { line: 'L2', name: 'Santa Ana',              lat: -33.43825, lng: -70.65990, transfers: ['L5'] },
  { line: 'L2', name: 'Puente Cal y Canto',     lat: -33.43284, lng: -70.65308, transfers: ['L3'] },
  { line: 'L2', name: 'Patronato',              lat: -33.42973, lng: -70.64712 },
  { line: 'L2', name: 'Cerro Blanco',           lat: -33.42275, lng: -70.64506 },
  { line: 'L2', name: 'Cementerios',            lat: -33.41398, lng: -70.64360 },
  { line: 'L2', name: 'Einstein',               lat: -33.40595, lng: -70.64317 },
  { line: 'L2', name: 'Dorsal',                 lat: -33.39696, lng: -70.64274 },
  { line: 'L2', name: 'Zapadores',              lat: -33.39094, lng: -70.64274 },
  { line: 'L2', name: 'Vespucio Norte',         lat: -33.38075, lng: -70.64634 },
  // ── L3 ──────────────────────────────────────────────
  { line: 'L3', name: 'Plaza Quilicura',        lat: -33.36572, lng: -70.72889 },
  { line: 'L3', name: 'Lo Cruzat',              lat: -33.36683, lng: -70.71977 },
  { line: 'L3', name: 'Ferrocarril',            lat: -33.36547, lng: -70.70554 },
  { line: 'L3', name: 'Los Libertadores',       lat: -33.36543, lng: -70.69199 },
  { line: 'L3', name: 'Cardenal Caro',          lat: -33.37326, lng: -70.68634 },
  { line: 'L3', name: 'Vivaceta',               lat: -33.38538, lng: -70.67964 },
  { line: 'L3', name: 'Conchalí',               lat: -33.39789, lng: -70.66960 },
  { line: 'L3', name: 'Plaza Chacabuco',        lat: -33.40677, lng: -70.66097 },
  { line: 'L3', name: 'Hospitales',             lat: -33.41767, lng: -70.65646 },
  { line: 'L3', name: 'Puente Cal y Canto',     lat: -33.43284, lng: -70.65308, transfers: ['L2'] },
  { line: 'L3', name: 'Plaza de Armas',         lat: -33.43742, lng: -70.65128, transfers: ['L5'] },
  { line: 'L3', name: 'Universidad de Chile',   lat: -33.44385, lng: -70.65067, transfers: ['L1'] },
  { line: 'L3', name: 'Parque Almagro',         lat: -33.45139, lng: -70.65056 },
  { line: 'L3', name: 'Matta',                  lat: -33.45827, lng: -70.64308 },
  { line: 'L3', name: 'Irarrázaval',            lat: -33.45505, lng: -70.62832, transfers: ['L5'] },
  { line: 'L3', name: 'Monseñor Eyzaguirre',    lat: -33.45319, lng: -70.61352 },
  { line: 'L3', name: 'Ñuñoa',                  lat: -33.45419, lng: -70.60497, transfers: ['L6'] },
  { line: 'L3', name: 'Chile España',           lat: -33.45491, lng: -70.59814 },
  { line: 'L3', name: 'Villa Frei',             lat: -33.45467, lng: -70.58148 },
  { line: 'L3', name: 'Plaza Egaña',            lat: -33.45349, lng: -70.57082, transfers: ['L4'] },
  { line: 'L3', name: 'Fernando Castillo V.',   lat: -33.45210, lng: -70.55811 },
  // ── L4 ──────────────────────────────────────────────
  { line: 'L4', name: 'Plaza de Puente Alto',   lat: -33.60952, lng: -70.57584 },
  { line: 'L4', name: 'Las Mercedes',           lat: -33.60138, lng: -70.57748 },
  { line: 'L4', name: 'Protectora',             lat: -33.58957, lng: -70.57983 },
  { line: 'L4', name: 'Hospital Sótero',        lat: -33.57690, lng: -70.58232 },
  { line: 'L4', name: 'Elisa Correa',           lat: -33.56929, lng: -70.58381 },
  { line: 'L4', name: 'Los Quillayes',          lat: -33.56123, lng: -70.58527 },
  { line: 'L4', name: 'San José de la Estrella',lat: -33.55382, lng: -70.58656 },
  { line: 'L4', name: 'Trinidad',               lat: -33.54629, lng: -70.58810 },
  { line: 'L4', name: 'Rojas Magallanes',       lat: -33.53611, lng: -70.59270 },
  { line: 'L4', name: 'Vicente Valdés',         lat: -33.52642, lng: -70.59679, transfers: ['L5'] },
  { line: 'L4', name: 'Vicuña Mackenna',        lat: -33.51976, lng: -70.59621, transfers: ['L4A'] },
  { line: 'L4', name: 'Macul',                  lat: -33.50924, lng: -70.59005 },
  { line: 'L4', name: 'Las Torres',             lat: -33.49911, lng: -70.58655 },
  { line: 'L4', name: 'Quilín',                 lat: -33.48826, lng: -70.58042 },
  { line: 'L4', name: 'Los Presidentes',        lat: -33.47984, lng: -70.57867 },
  { line: 'L4', name: 'Grecia',                 lat: -33.46953, lng: -70.57650 },
  { line: 'L4', name: 'Los Orientales',         lat: -33.46262, lng: -70.57392 },
  { line: 'L4', name: 'Plaza Egaña',            lat: -33.45349, lng: -70.57082, transfers: ['L3'] },
  { line: 'L4', name: 'Simón Bolívar',          lat: -33.44618, lng: -70.57193 },
  { line: 'L4', name: 'Príncipe de Gales',      lat: -33.43920, lng: -70.57315 },
  { line: 'L4', name: 'Francisco Bilbao',       lat: -33.43179, lng: -70.58470 },
  { line: 'L4', name: 'Cristóbal Colón',        lat: -33.42632, lng: -70.59098 },
  { line: 'L4', name: 'Tobalaba',               lat: -33.41822, lng: -70.60149, transfers: ['L1'] },
  // ── L4A ─────────────────────────────────────────────
  { line: 'L4A', name: 'La Cisterna',           lat: -33.53735, lng: -70.66433, transfers: ['L2'] },
  { line: 'L4A', name: 'San Ramón',             lat: -33.54123, lng: -70.64313 },
  { line: 'L4A', name: 'Santa Rosa',            lat: -33.54239, lng: -70.63413 },
  { line: 'L4A', name: 'La Granja',             lat: -33.54113, lng: -70.61605 },
  { line: 'L4A', name: 'Santa Julia',           lat: -33.53110, lng: -70.60554 },
  { line: 'L4A', name: 'Vicuña Mackenna',       lat: -33.51976, lng: -70.59621, transfers: ['L4'] },
  // ── L5 ──────────────────────────────────────────────
  { line: 'L5', name: 'Plaza de Maipú',         lat: -33.50993, lng: -70.75731 },
  { line: 'L5', name: 'Santiago Bueras',        lat: -33.49624, lng: -70.75743 },
  { line: 'L5', name: 'Del Sol',                lat: -33.49024, lng: -70.75312 },
  { line: 'L5', name: 'Monte Tabor',            lat: -33.48229, lng: -70.74544 },
  { line: 'L5', name: 'Las Parcelas',           lat: -33.47527, lng: -70.73998 },
  { line: 'L5', name: 'Laguna Sur',             lat: -33.46216, lng: -70.73791 },
  { line: 'L5', name: 'Barrancas',              lat: -33.45298, lng: -70.73904 },
  { line: 'L5', name: 'Pudahuel',               lat: -33.44486, lng: -70.74114 },
  { line: 'L5', name: 'San Pablo',              lat: -33.44422, lng: -70.72325, transfers: ['L1'] },
  { line: 'L5', name: 'Lo Prado',               lat: -33.44341, lng: -70.71675 },
  { line: 'L5', name: 'Blanqueado',             lat: -33.44133, lng: -70.70665 },
  { line: 'L5', name: 'Gruta de Lourdes',       lat: -33.43801, lng: -70.69103 },
  { line: 'L5', name: 'Quinta Normal',          lat: -33.44037, lng: -70.68029 },
  { line: 'L5', name: 'Cumming',                lat: -33.43914, lng: -70.66853 },
  { line: 'L5', name: 'Santa Ana',              lat: -33.43825, lng: -70.65990, transfers: ['L2'] },
  { line: 'L5', name: 'Plaza de Armas',         lat: -33.43742, lng: -70.65128, transfers: ['L3'] },
  { line: 'L5', name: 'Bellas Artes',           lat: -33.43663, lng: -70.64413 },
  { line: 'L5', name: 'Baquedano',              lat: -33.43722, lng: -70.63341, transfers: ['L1'] },
  { line: 'L5', name: 'Parque Bustamante',      lat: -33.44280, lng: -70.63196 },
  { line: 'L5', name: 'Santa Isabel',           lat: -33.44712, lng: -70.63043 },
  { line: 'L5', name: 'Irarrázaval',            lat: -33.45505, lng: -70.62832, transfers: ['L3'] },
  { line: 'L5', name: 'Ñuble',                  lat: -33.46736, lng: -70.62476, transfers: ['L6'] },
  { line: 'L5', name: 'Rodrigo de Araya',       lat: -33.47782, lng: -70.62226 },
  { line: 'L5', name: 'Carlos Valdovinos',      lat: -33.48640, lng: -70.61918 },
  { line: 'L5', name: 'Camino Agrícola',        lat: -33.49179, lng: -70.61752 },
  { line: 'L5', name: 'San Joaquín',            lat: -33.49934, lng: -70.61583 },
  { line: 'L5', name: 'Pedrero',                lat: -33.50795, lng: -70.61245 },
  { line: 'L5', name: 'Mirador',                lat: -33.51330, lng: -70.60591 },
  { line: 'L5', name: 'Bellavista de La Florida',lat:-33.51952, lng: -70.60003 },
  { line: 'L5', name: 'Vicente Valdés',         lat: -33.52642, lng: -70.59679, transfers: ['L4'] },
  // ── L6 ──────────────────────────────────────────────
  { line: 'L6', name: 'Cerrillos',              lat: -33.48343, lng: -70.69556 },
  { line: 'L6', name: 'Lo Valledor',            lat: -33.47840, lng: -70.68090 },
  { line: 'L6', name: 'Pdte. Pedro Aguirre C.', lat: -33.47869, lng: -70.66479 },
  { line: 'L6', name: 'Franklin',               lat: -33.47666, lng: -70.64948, transfers: ['L2'] },
  { line: 'L6', name: 'Bio Bio',                lat: -33.47661, lng: -70.64218 },
  { line: 'L6', name: 'Ñuble',                  lat: -33.46736, lng: -70.62476, transfers: ['L5'] },
  { line: 'L6', name: 'Estadio Nacional',       lat: -33.46238, lng: -70.60622 },
  { line: 'L6', name: 'Ñuñoa',                  lat: -33.45419, lng: -70.60497, transfers: ['L3'] },
  { line: 'L6', name: 'Inés de Suárez',         lat: -33.43872, lng: -70.60734 },
  { line: 'L6', name: 'Los Leones',             lat: -33.42202, lng: -70.60856, transfers: ['L1'] },
]

// ── Estaciones futuras ────────────────────────────────
// Fuente: UFPLUS_HERE_metro_futuro_IA.json

export const FUTURE_METRO_STATIONS: FutureMetroStation[] = [
  // ── L7 (Renca → Estoril) ────────────────────────────
  { line: 'L7', name: 'Brasil',             lat: -33.3995759, lng: -70.7468143 },
  { line: 'L7', name: 'José Miguel Infante',lat: -33.4057077, lng: -70.7455486 },
  { line: 'L7', name: 'Salvador Gutiérrez', lat: -33.4147,    lng: -70.74465   },
  { line: 'L7', name: 'Huelén',             lat: -33.42313,   lng: -70.74013   },
  { line: 'L7', name: 'Neptuno',            lat: -33.4240677, lng: -70.7185269 },
  { line: 'L7', name: 'Radal',              lat: -33.428463,  lng: -70.7040032 },
  { line: 'L7', name: 'Walker Martínez',    lat: -33.4315281, lng: -70.6924074 },
  { line: 'L7', name: 'Matucana',           lat: -33.43209,   lng: -70.6807    },
  { line: 'L7', name: 'Cumming',            lat: -33.4325,    lng: -70.66908   },
  { line: 'L7', name: 'Puente Cal y Canto', lat: -33.43284,   lng: -70.65308   },
  { line: 'L7', name: 'Baquedano',          lat: -33.43722,   lng: -70.63341   },
  { line: 'L7', name: 'Pedro de Valdivia',  lat: -33.42504,   lng: -70.61313   },
  { line: 'L7', name: 'Isidora Goyenechea', lat: -33.41395,   lng: -70.60013   },
  { line: 'L7', name: 'Vitacura',           lat: -33.40546,   lng: -70.5967    },
  { line: 'L7', name: 'Américo Vespucio',   lat: -33.39931,   lng: -70.5862    },
  { line: 'L7', name: 'Parque Araucano',    lat: -33.401,     lng: -70.57378   },
  { line: 'L7', name: 'Gerónimo de Alderete',lat:-33.40176,   lng: -70.56018   },
  { line: 'L7', name: 'Padre Hurtado',      lat: -33.4016,    lng: -70.54828   },
  { line: 'L7', name: 'Estoril',            lat: -33.40257,   lng: -70.53686   },
  // ── L8 (Los Leones → Mall Plaza Tobalaba) ───────────
  { line: 'L8', name: 'Los Leones',         lat: -33.42202,   lng: -70.60944   },
  { line: 'L8', name: 'Eliodoro Yáñez',     lat: -33.43145,   lng: -70.60683   },
  { line: 'L8', name: 'Diagonal Oriente',   lat: -33.4431,    lng: -70.5974    },
  { line: 'L8', name: 'Chile-España',        lat: -33.45491,   lng: -70.59814   },
  { line: 'L8', name: 'Grecia',             lat: -33.46648,   lng: -70.5981    },
  { line: 'L8', name: 'Rodrigo de Araya',   lat: -33.47667,   lng: -70.59843   },
  { line: 'L8', name: 'Quilín',             lat: -33.48888,   lng: -70.59895   },
  { line: 'L8', name: 'Doctor Amador Neghme',lat:-33.50123,   lng: -70.60031   },
  { line: 'L8', name: 'Macul',              lat: -33.51582,   lng: -70.59813   },
  { line: 'L8', name: 'Walker Martínez',    lat: -33.52429,   lng: -70.59714   },
  { line: 'L8', name: 'Rojas Magallanes',   lat: -33.5357,    lng: -70.59692   },
  { line: 'L8', name: 'Trinidad',           lat: -33.54693,   lng: -70.59685   },
  { line: 'L8', name: 'Diego Portales',     lat: -33.56795,   lng: -70.58355   },
  { line: 'L8', name: 'Mall Plaza Tobalaba',lat: -33.58289,   lng: -70.57622   },
  // ── L9 (Puente Cal y Canto → Plaza de Puente Alto) ──
  { line: 'L9', name: 'Puente Cal y Canto', lat: -33.43068,   lng: -70.64727   },
  { line: 'L9', name: 'Santa Lucía',        lat: -33.44214,   lng: -70.64413   },
  { line: 'L9', name: 'Matta',              lat: -33.45127,   lng: -70.64042   },
  { line: 'L9', name: 'Ñuble',              lat: -33.46364,   lng: -70.63577   },
  { line: 'L9', name: 'Bío Bío',            lat: -33.47557,   lng: -70.63088   },
  { line: 'L9', name: 'La Legua–Pedro Alarcón',lat:-33.48572, lng: -70.62674   },
  { line: 'L9', name: 'La Legua',           lat: -33.49608,   lng: -70.62271   },
  { line: 'L9', name: 'Departamental',      lat: -33.5082,    lng: -70.61782   },
  { line: 'L9', name: 'Lo Ovalle',          lat: -33.51885,   lng: -70.61342   },
  { line: 'L9', name: 'Linares',            lat: -33.52742,   lng: -70.60994   },
  { line: 'L9', name: 'Santa Rosa',         lat: -33.53821,   lng: -70.60517   },
  { line: 'L9', name: 'Hospital Padre Hurtado',lat:-33.54894, lng: -70.60084   },
  { line: 'L9', name: 'Observatorio',       lat: -33.56093,   lng: -70.5962    },
  { line: 'L9', name: 'Plaza La Pintana',   lat: -33.57472,   lng: -70.59094   },
  { line: 'L9', name: 'La Primavera',       lat: -33.58633,   lng: -70.5865    },
  { line: 'L9', name: 'Eyzaguirre',         lat: -33.59913,   lng: -70.58114   },
  { line: 'L9', name: 'Juanita',            lat: -33.6042,    lng: -70.5871    },
  { line: 'L9', name: 'Ejército',           lat: -33.60735,   lng: -70.5802    },
  { line: 'L9', name: 'Plaza de Puente Alto',lat:-33.61195,   lng: -70.57585   },
  // ── L6-EXT ──────────────────────────────────────────
  { line: 'L6-EXT', name: 'Lo Errázuriz',   lat: -33.4905,    lng: -70.7228056 },
]

// ── Polylines futuras ─────────────────────────────────
export const FUTURE_METRO_POLYLINES: Record<MetroLineFuture, [number, number][]> = {
  'L7': [
    [-33.3995759,-70.7468143],[-33.4057077,-70.7455486],[-33.4147,-70.74465],
    [-33.42313,-70.74013],[-33.4240677,-70.7185269],[-33.428463,-70.7040032],
    [-33.4315281,-70.6924074],[-33.43209,-70.6807],[-33.4325,-70.66908],
    [-33.43284,-70.65308],[-33.43722,-70.63341],[-33.42504,-70.61313],
    [-33.41395,-70.60013],[-33.40546,-70.5967],[-33.39931,-70.5862],
    [-33.401,-70.57378],[-33.40176,-70.56018],[-33.4016,-70.54828],
    [-33.40257,-70.53686],
  ],
  'L8': [
    [-33.42202,-70.60944],[-33.43145,-70.60683],[-33.4431,-70.5974],
    [-33.45491,-70.59814],[-33.46648,-70.5981],[-33.47667,-70.59843],
    [-33.48888,-70.59895],[-33.50123,-70.60031],[-33.51582,-70.59813],
    [-33.52429,-70.59714],[-33.5357,-70.59692],[-33.54693,-70.59685],
    [-33.56795,-70.58355],[-33.58289,-70.57622],
  ],
  'L9': [
    [-33.43068,-70.64727],[-33.44214,-70.64413],[-33.45127,-70.64042],
    [-33.46364,-70.63577],[-33.47557,-70.63088],[-33.48572,-70.62674],
    [-33.49608,-70.62271],[-33.5082,-70.61782],[-33.51885,-70.61342],
    [-33.52742,-70.60994],[-33.53821,-70.60517],[-33.54894,-70.60084],
    [-33.56093,-70.5962],[-33.57472,-70.59094],[-33.58633,-70.5865],
    [-33.59913,-70.58114],[-33.6042,-70.5871],[-33.60735,-70.5802],
    [-33.61195,-70.57585],
  ],
  'L6-EXT': [
    [-33.4905,-70.7228056],
  ],
}
