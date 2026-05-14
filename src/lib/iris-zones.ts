// src/lib/iris-zones.ts
// Zonas disponibles en Iris (iris.yapo.cl) para Chile
// IDs obtenidos directamente desde la API de Iris

// Coordenadas centrales por zone ID (para pines en el mapa)
export const ZONE_COORDS: Record<number, [number, number]> = {
  // Metropolitana
  3988: [-33.4935, -70.7069], // Cerrillos
  3990: [-33.3827, -70.6618], // Conchalí
  3992: [-33.4556, -70.6850], // Estación Central
  3993: [-33.3614, -70.6489], // Huechuraba
  3994: [-33.4186, -70.6538], // Independencia
  3995: [-33.5275, -70.6614], // La Cisterna
  3996: [-33.5189, -70.5939], // La Florida
  4000: [-33.4171, -70.5797], // Las Condes
  4004: [-33.4817, -70.5914], // Macul
  4009: [-33.4330, -70.6108], // Providencia
  4011: [-33.3619, -70.7247], // Quilicura
  4012: [-33.4408, -70.7028], // Quinta Normal
  4025: [-33.5914, -70.7022], // San Bernardo
  4720: [-33.4939, -70.6278], // San Joaquín
  3987: [-33.4489, -70.6693], // Santiago
  4018: [-33.3898, -70.5758], // Vitacura
  4006: [-33.4564, -70.6056], // Ñuñoa
  // Valparaíso
  4339: [-32.9217, -71.5189], // Concón
  4351: [-32.5083, -71.4467], // Papudo
  4341: [-32.7433, -71.4206], // Puchuncaví
  // Coquimbo
  4322: [-29.9027, -71.2519], // La Serena
  4323: [-29.9564, -71.3417], // Coquimbo
  // O'Higgins
  4375: [-34.1703, -70.7404], // Rancagua
  // Biobío
  4438: [-36.8201, -73.0444], // Concepción
  // La Araucanía
  4492: [-38.7359, -72.5904], // Temuco
  // Los Ríos
  4524: [-39.8196, -73.2452], // Valdivia
  // Los Lagos
  3936: [-41.4719, -72.9418], // Puerto Montt
  3944: [-41.3199, -72.9878], // Puerto Varas
  // Arica y Parinacota
  4293: [-18.4746, -70.2979], // Arica
}

export interface IrisZone {
  id: number
  name: string
}

export interface IrisRegion {
  id: number
  name: string
  zones: IrisZone[]
}

export const IRIS_REGIONS: IrisRegion[] = [
  {
    id: 652,
    name: 'Metropolitana',
    zones: [
      { id: 3988, name: 'Cerrillos' },
      { id: 3990, name: 'Conchalí' },
      { id: 3992, name: 'Estación Central' },
      { id: 3993, name: 'Huechuraba' },
      { id: 3994, name: 'Independencia' },
      { id: 3995, name: 'La Cisterna' },
      { id: 3996, name: 'La Florida' },
      { id: 4000, name: 'Las Condes' },
      { id: 4004, name: 'Macul' },
      { id: 4009, name: 'Providencia' },
      { id: 4011, name: 'Quilicura' },
      { id: 4012, name: 'Quinta Normal' },
      { id: 4025, name: 'San Bernardo' },
      { id: 4720, name: 'San Joaquín' },
      { id: 3987, name: 'Santiago' },
      { id: 4018, name: 'Vitacura' },
      { id: 4006, name: 'Ñuñoa' },
    ],
  },
  {
    id: 643,
    name: 'Valparaíso',
    zones: [
      { id: 4339, name: 'Concón' },
      { id: 4351, name: 'Papudo' },
      { id: 4341, name: 'Puchuncaví' },
    ],
  },
  {
    id: 642,
    name: 'Coquimbo',
    zones: [
      { id: 4322, name: 'La Serena' },
      { id: 4323, name: 'Coquimbo' },
    ],
  },
  {
    id: 644,
    name: "O'Higgins",
    zones: [
      { id: 4375, name: 'Rancagua' },
    ],
  },
  {
    id: 646,
    name: 'Biobío',
    zones: [
      { id: 4438, name: 'Concepción' },
    ],
  },
  {
    id: 647,
    name: 'La Araucanía',
    zones: [
      { id: 4492, name: 'Temuco' },
    ],
  },
  {
    id: 648,
    name: 'Los Ríos',
    zones: [
      { id: 4524, name: 'Valdivia' },
    ],
  },
  {
    id: 649,
    name: 'Los Lagos',
    zones: [
      { id: 3936, name: 'Puerto Montt' },
      { id: 3944, name: 'Puerto Varas' },
    ],
  },
  {
    id: 638,
    name: 'Arica y Parinacota',
    zones: [
      { id: 4293, name: 'Arica' },
    ],
  },
]
