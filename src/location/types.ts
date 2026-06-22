export type LocationPrecision = 'address' | 'area'

export type LocationCandidate = {
  query: string
  label: string
  precision: LocationPrecision
}
