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

type ForwardGeocode = (
  query: string,
  options: GeocodingOptions,
) => Promise<{ features: GeocodingFeatureLike[] }>

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
      response = await forwardGeocode(candidate.query, {
        apiKey,
        autocomplete: false,
        country: ['ua'],
        language: 'uk',
        limit: 1,
      })
    } catch {
      return { ok: false, code: 'request-failed' }
    }

    const feature = response.features[0]
    const coordinates = toCoordinates(feature?.center)

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
  }

  return { ok: false, code: 'no-results' }
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
