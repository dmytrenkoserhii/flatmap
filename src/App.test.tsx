import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import type { GeocodingResult } from './location/geocodeLocation'
import type { LocationCandidate, ResolvedLocation } from './location/types'

const candidate: LocationCandidate = {
  label: 'ЖК Park Avenue, пр. Голосіївський, 62',
  precision: 'address',
  query: 'ЖК Park Avenue, пр. Голосіївський, 62, Київ, Україна',
}

const resolvedLocation: ResolvedLocation = {
  ...candidate,
  boundingBox: [30.5, 50.3, 30.6, 50.4],
  coordinates: [30.52, 50.39],
}

const successResult: GeocodingResult = {
  location: resolvedLocation,
  ok: true,
}

const nextCandidate: LocationCandidate = {
  label: 'вул Деміївська 16',
  precision: 'address',
  query: 'вул Деміївська 16, Київ',
}

const nextSuccessResult: GeocodingResult = {
  location: {
    ...nextCandidate,
    coordinates: [30.5, 50.4],
  },
  ok: true,
}

function StubMap({ location }: { apiKey: string; location: ResolvedLocation }) {
  return <div data-testid="map-view">{location.label}</div>
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })

  return { promise, resolve }
}

describe('App', () => {
  it('renders the FlatMap button without geocoding before click', () => {
    const geocodeCandidates = vi.fn()

    render(
      <App
        apiKey="test-key"
        geocodeCandidates={geocodeCandidates}
        MapComponent={StubMap}
        resolveCandidates={() => [candidate]}
      />,
    )

    expect(screen.getByRole('button', { name: 'FlatMap' })).toBeVisible()
    expect(geocodeCandidates).not.toHaveBeenCalled()
  })

  it('shows loading and then renders the resolved location map', async () => {
    const user = userEvent.setup()
    const deferred = createDeferred<GeocodingResult>()
    const geocodeCandidates = vi.fn(() => deferred.promise)

    render(
      <App
        apiKey="test-key"
        geocodeCandidates={geocodeCandidates}
        MapComponent={StubMap}
        resolveCandidates={() => [candidate]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'FlatMap' }))

    expect(screen.getByRole('status')).toHaveTextContent('Шукаю місце...')
    expect(geocodeCandidates).toHaveBeenCalledWith([candidate], 'test-key')

    deferred.resolve(successResult)

    expect(await screen.findByTestId('map-view')).toHaveTextContent(
      resolvedLocation.label,
    )
    expect(screen.getByText('Приблизне місце за описом')).toBeInTheDocument()
  })

  it('keeps a successful result in memory when the panel is reopened', async () => {
    const user = userEvent.setup()
    const geocodeCandidates = vi.fn().mockResolvedValue(successResult)

    render(
      <App
        apiKey="test-key"
        geocodeCandidates={geocodeCandidates}
        MapComponent={StubMap}
        resolveCandidates={() => [candidate]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'FlatMap' }))
    expect(await screen.findByTestId('map-view')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Закрити FlatMap' }))
    expect(screen.queryByTestId('flatmap-panel')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'FlatMap' }))

    expect(screen.getByTestId('map-view')).toBeInTheDocument()
    expect(geocodeCandidates).toHaveBeenCalledTimes(1)
  })

  it('reloads listing location when the OLX URL changes while the panel is open', async () => {
    const user = userEvent.setup()
    const geocodeCandidates = vi
      .fn()
      .mockResolvedValueOnce(successResult)
      .mockResolvedValueOnce(nextSuccessResult)
    const resolveCandidates = vi
      .fn()
      .mockReturnValueOnce([candidate])
      .mockReturnValueOnce([nextCandidate])

    const { rerender } = render(
      <App
        apiKey="test-key"
        currentPageUrl="https://www.olx.ua/d/uk/obyavlenie/one.html"
        geocodeCandidates={geocodeCandidates}
        MapComponent={StubMap}
        navigationReloadDelayMs={0}
        resolveCandidates={resolveCandidates}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'FlatMap' }))
    expect(await screen.findByTestId('map-view')).toHaveTextContent(
      resolvedLocation.label,
    )

    rerender(
      <App
        apiKey="test-key"
        currentPageUrl="https://www.olx.ua/d/uk/obyavlenie/two.html"
        geocodeCandidates={geocodeCandidates}
        MapComponent={StubMap}
        navigationReloadDelayMs={0}
        resolveCandidates={resolveCandidates}
      />,
    )

    await waitFor(() => expect(geocodeCandidates).toHaveBeenCalledTimes(2))
    expect(await screen.findByTestId('map-view')).toHaveTextContent(
      nextCandidate.label,
    )
  })

  it('clears cached location when the OLX URL changes while the panel is closed', async () => {
    const user = userEvent.setup()
    const geocodeCandidates = vi
      .fn()
      .mockResolvedValueOnce(successResult)
      .mockResolvedValueOnce(nextSuccessResult)
    const resolveCandidates = vi
      .fn()
      .mockReturnValueOnce([candidate])
      .mockReturnValueOnce([nextCandidate])

    const { rerender } = render(
      <App
        apiKey="test-key"
        currentPageUrl="https://www.olx.ua/d/uk/obyavlenie/one.html"
        geocodeCandidates={geocodeCandidates}
        MapComponent={StubMap}
        navigationReloadDelayMs={0}
        resolveCandidates={resolveCandidates}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'FlatMap' }))
    expect(await screen.findByTestId('map-view')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Закрити FlatMap' }))

    rerender(
      <App
        apiKey="test-key"
        currentPageUrl="https://www.olx.ua/d/uk/obyavlenie/two.html"
        geocodeCandidates={geocodeCandidates}
        MapComponent={StubMap}
        navigationReloadDelayMs={0}
        resolveCandidates={resolveCandidates}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'FlatMap' }))

    await waitFor(() => expect(geocodeCandidates).toHaveBeenCalledTimes(2))
    expect(await screen.findByTestId('map-view')).toHaveTextContent(
      nextCandidate.label,
    )
  })

  it('retries geocoding after an error', async () => {
    const user = userEvent.setup()
    const geocodeCandidates = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: 'no-results' })
      .mockResolvedValueOnce(successResult)

    render(
      <App
        apiKey="test-key"
        geocodeCandidates={geocodeCandidates}
        MapComponent={StubMap}
        resolveCandidates={() => [candidate]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'FlatMap' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'MapTiler не знайшов це місце.',
    )

    await user.click(screen.getByRole('button', { name: 'Спробувати ще раз' }))

    await waitFor(() => expect(geocodeCandidates).toHaveBeenCalledTimes(2))
    expect(await screen.findByTestId('map-view')).toBeInTheDocument()
  })

  it('shows a configuration error without calling geocoding when API key is missing', async () => {
    const user = userEvent.setup()
    const geocodeCandidates = vi.fn()

    render(
      <App
        apiKey={null}
        geocodeCandidates={geocodeCandidates}
        MapComponent={StubMap}
        resolveCandidates={() => [candidate]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'FlatMap' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Додай VITE_MAPTILER_API_KEY у .env.local і перезбери extension.',
    )
    expect(geocodeCandidates).not.toHaveBeenCalled()
  })
})
