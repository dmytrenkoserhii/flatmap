export type LocationPrecision = 'address' | 'area'

export type LocationCandidate = {
  query: string
  label: string
  precision: LocationPrecision
}

export type ResolvedLocation = LocationCandidate & {
  coordinates: [longitude: number, latitude: number]
  boundingBox?: [west: number, south: number, east: number, north: number]
}
