import { describe, expect, it, vi } from 'vitest'
import { geocodeLocationCandidates } from './geocodeLocation'
import type { LocationCandidate } from './types'

const addressCandidate: LocationCandidate = {
  label: 'вул. Хрещатик, 10',
  query: 'вул. Хрещатик, 10, Київ',
  precision: 'address',
}

const areaCandidate: LocationCandidate = {
  label: 'Київ, Шевченківський',
  query: 'Київ, Шевченківський',
  precision: 'area',
}

describe('geocodeLocationCandidates', () => {
  it('does not call MapTiler when the API key is missing', async () => {
    const forwardGeocode = vi.fn()

    await expect(
      geocodeLocationCandidates([addressCandidate], null, forwardGeocode),
    ).resolves.toEqual({ ok: false, code: 'missing-api-key' })
    expect(forwardGeocode).not.toHaveBeenCalled()
  })

  it('does not call MapTiler when there are no location candidates', async () => {
    const forwardGeocode = vi.fn()

    await expect(
      geocodeLocationCandidates([], 'test-key', forwardGeocode),
    ).resolves.toEqual({ ok: false, code: 'missing-location' })
    expect(forwardGeocode).not.toHaveBeenCalled()
  })

  it('returns the first valid result with MapTiler search options', async () => {
    const forwardGeocode = vi.fn().mockResolvedValue({
      features: [
        {
          center: [30.5234, 50.4501],
          bbox: [30.51, 50.44, 30.54, 50.46],
        },
      ],
    })

    await expect(
      geocodeLocationCandidates(
        [addressCandidate, areaCandidate],
        'test-key',
        forwardGeocode,
      ),
    ).resolves.toEqual({
      ok: true,
      location: {
        ...addressCandidate,
        coordinates: [30.5234, 50.4501],
        boundingBox: [30.51, 50.44, 30.54, 50.46],
      },
    })
    expect(forwardGeocode).toHaveBeenCalledOnce()
    expect(forwardGeocode).toHaveBeenCalledWith(addressCandidate.query, {
      apiKey: 'test-key',
      autocomplete: false,
      country: ['ua'],
      language: 'uk',
      limit: 1,
    })
  })

  it('uses the area candidate when the address has no valid result', async () => {
    const forwardGeocode = vi
      .fn()
      .mockResolvedValueOnce({ features: [] })
      .mockResolvedValueOnce({
        features: [{ center: [30.5, 50.45] }],
      })

    await expect(
      geocodeLocationCandidates(
        [addressCandidate, areaCandidate],
        'test-key',
        forwardGeocode,
      ),
    ).resolves.toEqual({
      ok: true,
      location: {
        ...areaCandidate,
        coordinates: [30.5, 50.45],
        boundingBox: undefined,
      },
    })
    expect(forwardGeocode).toHaveBeenCalledTimes(2)
  })

  it('returns no-results when MapTiler finds no valid coordinates', async () => {
    const forwardGeocode = vi.fn().mockResolvedValue({
      features: [{ center: [Number.NaN, 50.45] }],
    })

    await expect(
      geocodeLocationCandidates([addressCandidate], 'test-key', forwardGeocode),
    ).resolves.toEqual({ ok: false, code: 'no-results' })
  })

  it('returns request-failed when MapTiler rejects the request', async () => {
    const forwardGeocode = vi.fn().mockRejectedValue(new Error('Network error'))

    await expect(
      geocodeLocationCandidates([addressCandidate], 'test-key', forwardGeocode),
    ).resolves.toEqual({ ok: false, code: 'request-failed' })
  })
})
