// src/lib/iris-zones.ts
// Zonas disponibles en Iris (iris.yapo.cl) para Chile
// IDs obtenidos directamente desde la API de Iris

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
