import { useEffect, useRef } from 'react'
import { config as mapTilerConfig, Map, MapStyle, Marker } from '@maptiler/sdk'
import type { ResolvedLocation } from '../location/types'

type MapViewProps = {
  apiKey: string
  location: ResolvedLocation
}

function MapView({ apiKey, location }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current) {
      return
    }

    mapTilerConfig.apiKey = apiKey

    const map = new Map({
      container: mapContainerRef.current,
      center: location.coordinates,
      style: MapStyle.STREETS,
      zoom: 13,
    })

    const marker = new Marker().setLngLat(location.coordinates).addTo(map)

    if (location.boundingBox) {
      const [west, south, east, north] = location.boundingBox

      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        {
          maxZoom: 14,
          padding: 32,
        },
      )
    }

    return () => {
      marker.remove()
      map.remove()
    }
  }, [apiKey, location])

  return (
    <div
      ref={mapContainerRef}
      className="flatmap-map"
      data-testid="flatmap-map"
    />
  )
}

export default MapView
