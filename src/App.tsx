import { useCallback, useState, type ComponentType } from 'react'
import { mapTilerApiKey } from './config/maptiler'
import MapView from './components/MapView'
import { extractOlxLocationCandidates } from './location/extractOlxLocation'
import {
  geocodeLocationCandidates,
  type GeocodingFailureCode,
  type GeocodingResult,
} from './location/geocodeLocation'
import type { LocationCandidate, ResolvedLocation } from './location/types'

type FlatMapViewProps = {
  apiKey: string
  location: ResolvedLocation
}

type AppProps = {
  apiKey?: string | null
  geocodeCandidates?: typeof geocodeLocationCandidates
  MapComponent?: ComponentType<FlatMapViewProps>
  resolveCandidates?: () => LocationCandidate[]
}

const errorMessages: Record<GeocodingFailureCode, string> = {
  'missing-api-key':
    'Додай VITE_MAPTILER_API_KEY у .env.local і перезбери extension.',
  'missing-location': 'Не вдалося знайти локацію в оголошенні.',
  'no-results': 'MapTiler не знайшов це місце.',
  'request-failed': 'Не вдалося звернутися до MapTiler.',
}

function App({
  apiKey = mapTilerApiKey,
  geocodeCandidates = geocodeLocationCandidates,
  MapComponent = MapView,
  resolveCandidates = () => extractOlxLocationCandidates(document),
}: AppProps = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<GeocodingResult | null>(null)

  const loadLocation = useCallback(async () => {
    if (!apiKey) {
      setResult({ ok: false, code: 'missing-api-key' })
      return
    }

    setIsLoading(true)
    setResult(null)

    const candidates = resolveCandidates()
    const nextResult = await geocodeCandidates(candidates, apiKey)

    setResult(nextResult)
    setIsLoading(false)
  }, [apiKey, geocodeCandidates, resolveCandidates])

  const openPanel = () => {
    setIsOpen(true)

    if (!result && !isLoading) {
      void loadLocation()
    }
  }

  const retry = () => {
    void loadLocation()
  }

  return (
    <div className="flatmap-widget">
      <button type="button" className="flatmap-button" onClick={openPanel}>
        FlatMap
      </button>

      {isOpen ? (
        <section
          aria-label="FlatMap"
          className="flatmap-panel"
          data-testid="flatmap-panel"
        >
          <header className="flatmap-panel__header">
            <div>
              <h2>FlatMap</h2>
              <p>Мапа для поточного оголошення</p>
            </div>

            <button
              type="button"
              className="flatmap-close"
              aria-label="Закрити FlatMap"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </header>

          {isLoading ? (
            <div className="flatmap-state" role="status">
              Шукаю місце...
            </div>
          ) : null}

          {result?.ok && apiKey ? (
            <>
              <MapComponent apiKey={apiKey} location={result.location} />

              <div className="flatmap-details">
                <strong>{result.location.label}</strong>
                <span>
                  {result.location.precision === 'address'
                    ? 'Приблизне місце за описом'
                    : 'Приблизний район OLX'}
                </span>
              </div>
            </>
          ) : null}

          {result && !result.ok ? (
            <div className="flatmap-state flatmap-state--error" role="alert">
              <p>{errorMessages[result.code]}</p>
              <button type="button" onClick={retry}>
                Спробувати ще раз
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

export default App
