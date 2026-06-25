import { geocoding, type GeocodingOptions } from '@maptiler/client'
import type { LocationCandidate, ResolvedLocation } from './types'

export type GeocodingFailureCode =
  | 'missing-api-key'
  | 'missing-location'
  | 'no-results'
  | 'request-failed'

export type GeocodingResult =
  | { ok: true; location: ResolvedLocation }
  | { ok: false; code: GeocodingFailureCode }

type GeocodingFeatureLike = {
  center: readonly number[]
  bbox?: readonly number[]
}

type GeocodingBias = {
  bbox: [west: number, south: number, east: number, north: number]
  proximity: [longitude: number, latitude: number]
}

type ForwardGeocode = (
  query: string,
  options: GeocodingOptions,
) => Promise<{ features: GeocodingFeatureLike[] }>

const KYIV_BIAS: GeocodingBias = {
  bbox: [30.2, 50.2, 30.85, 50.6],
  proximity: [30.5234, 50.4501],
}

export async function geocodeLocationCandidates(
  candidates: LocationCandidate[],
  apiKey: string | null,
  forwardGeocode: ForwardGeocode = geocoding.forward,
): Promise<GeocodingResult> {
  if (!apiKey) {
    return { ok: false, code: 'missing-api-key' }
  }

  if (candidates.length === 0) {
    return { ok: false, code: 'missing-location' }
  }

  for (const candidate of candidates) {
    let response: { features: GeocodingFeatureLike[] }

    try {
      const bias = getGeocodingBias(candidate.query)

      response = await forwardGeocode(candidate.query, {
        apiKey,
        autocomplete: false,
        bbox: bias?.bbox,
        country: ['ua'],
        fuzzyMatch: false,
        language: 'uk',
        limit: 5,
        proximity: bias?.proximity,
        types: candidate.precision === 'address' ? ['address'] : undefined,
      })

      const feature = pickBestFeature(response.features, bias)

      if (!feature) {
        continue
      }

      const coordinates = toCoordinates(feature.center)

      if (!coordinates) {
        continue
      }

      return {
        ok: true,
        location: {
          ...candidate,
          coordinates,
          boundingBox: toBoundingBox(feature.bbox),
        },
      }
    } catch {
      return { ok: false, code: 'request-failed' }
    }
  }

  return { ok: false, code: 'no-results' }
}

function getGeocodingBias(query: string): GeocodingBias | null {
  return /(^|[^\p{L}])(київ|киев|kyiv|kiev)(?=$|[^\p{L}])/iu.test(query)
    ? KYIV_BIAS
    : null
}

function pickBestFeature(
  features: GeocodingFeatureLike[],
  bias: GeocodingBias | null,
): GeocodingFeatureLike | undefined {
  if (!bias) {
    return features[0]
  }

  return features.find((feature) => {
    const coordinates = toCoordinates(feature.center)

    return coordinates ? isInsideBoundingBox(coordinates, bias.bbox) : false
  })
}

function isInsideBoundingBox(
  [longitude, latitude]: ResolvedLocation['coordinates'],
  [west, south, east, north]: GeocodingBias['bbox'],
): boolean {
  return (
    longitude >= west &&
    longitude <= east &&
    latitude >= south &&
    latitude <= north
  )
}

function toCoordinates(
  value: readonly number[] | undefined,
): ResolvedLocation['coordinates'] | null {
  if (!value || value.length < 2 || !value.slice(0, 2).every(Number.isFinite)) {
    return null
  }

  return [value[0], value[1]]
}

function toBoundingBox(
  value: readonly number[] | undefined,
): ResolvedLocation['boundingBox'] {
  if (!value || value.length < 4 || !value.slice(0, 4).every(Number.isFinite)) {
    return undefined
  }

  return [value[0], value[1], value[2], value[3]]
}
