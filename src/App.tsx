import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react'
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
  currentPageUrl?: string
  geocodeCandidates?: typeof geocodeLocationCandidates
  MapComponent?: ComponentType<FlatMapViewProps>
  navigationReloadDelayMs?: number
  resolveCandidates?: () => LocationCandidate[]
  urlPollIntervalMs?: number
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
  currentPageUrl,
  geocodeCandidates = geocodeLocationCandidates,
  MapComponent = MapView,
  navigationReloadDelayMs = 700,
  resolveCandidates = () => extractOlxLocationCandidates(document),
  urlPollIntervalMs = 500,
}: AppProps = {}) {
  const observedPageUrl = useCurrentPageUrl(urlPollIntervalMs)
  const pageUrl = currentPageUrl ?? observedPageUrl
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<GeocodingResult | null>(null)
  const requestIdRef = useRef(0)
  const previousPageUrlRef = useRef(pageUrl)

  const loadLocation = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!apiKey) {
      setResult({ ok: false, code: 'missing-api-key' })
      return
    }

    setIsLoading(true)
    setResult((currentResult) => (currentResult?.ok ? currentResult : null))

    const candidates = resolveCandidates()
    const nextResult = await geocodeCandidates(candidates, apiKey)

    if (requestId !== requestIdRef.current) {
      return
    }

    setResult(nextResult)
    setIsLoading(false)
  }, [apiKey, geocodeCandidates, resolveCandidates])

  useEffect(() => {
    if (previousPageUrlRef.current === pageUrl) {
      return
    }

    previousPageUrlRef.current = pageUrl
    requestIdRef.current += 1
    setIsLoading(false)
    setResult((currentResult) =>
      isOpen && currentResult?.ok ? currentResult : null,
    )

    if (!isOpen) {
      return
    }

    const reloadTimer = window.setTimeout(() => {
      void loadLocation()
    }, navigationReloadDelayMs)

    return () => window.clearTimeout(reloadTimer)
  }, [isOpen, loadLocation, navigationReloadDelayMs, pageUrl])

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

function useCurrentPageUrl(pollIntervalMs: number): string {
  const [pageUrl, setPageUrl] = useState(() => window.location.href)

  useEffect(() => {
    let previousUrl = window.location.href

    const updatePageUrl = () => {
      const nextUrl = window.location.href

      if (nextUrl !== previousUrl) {
        previousUrl = nextUrl
        setPageUrl(nextUrl)
      }
    }

    window.addEventListener('hashchange', updatePageUrl)
    window.addEventListener('popstate', updatePageUrl)

    const timer = window.setInterval(updatePageUrl, pollIntervalMs)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('hashchange', updatePageUrl)
      window.removeEventListener('popstate', updatePageUrl)
    }
  }, [pollIntervalMs])

  return pageUrl
}

export default App
