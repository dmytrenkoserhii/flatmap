import { useEffect, useRef } from 'react'
import { MapMLGL, MarkerMLGL } from '@maptiler/sdk'
import type { ResolvedLocation } from '../location/types'

type MapInstance = InstanceType<typeof MapMLGL>
type MarkerInstance = InstanceType<typeof MarkerMLGL>

type MapViewProps = {
  apiKey: string
  location: ResolvedLocation
}

function MapView({ apiKey, location }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapInstance | null>(null)
  const markerRef = useRef<MarkerInstance | null>(null)
  const initialLocationRef = useRef(location)

  useEffect(() => {
    if (!mapContainerRef.current) {
      return
    }

    const initialLocation = initialLocationRef.current
    const map = new MapMLGL({
      container: mapContainerRef.current,
      center: initialLocation.coordinates,
      style: getMapTilerStyleUrl(apiKey),
      zoom: 13,
    })
    const marker = new MarkerMLGL()
      .setLngLat(initialLocation.coordinates)
      .addTo(map)

    mapRef.current = map
    markerRef.current = marker
    fitMapToLocation(map, initialLocation)

    map.on('styleimagemissing', ({ id }) => {
      addMissingStyleImage(map, id)
    })

    return () => {
      mapRef.current = null
      markerRef.current = null
      marker.remove()
      map.remove()
    }
  }, [apiKey])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current

    if (!map || !marker) {
      return
    }

    marker.setLngLat(location.coordinates)
    fitMapToLocation(map, location)
  }, [location])

  return (
    <div
      ref={mapContainerRef}
      className="flatmap-map"
      data-testid="flatmap-map"
    />
  )
}

function getMapTilerStyleUrl(apiKey: string): string {
  return `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(apiKey)}`
}

function fitMapToLocation(map: MapInstance, location: ResolvedLocation) {
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
    return
  }

  map.jumpTo({
    center: location.coordinates,
    zoom: 13,
  })
}

function addMissingStyleImage(map: MapInstance, id: string) {
  if (!id || map.hasImage(id)) {
    return
  }

  map.addImage(id, {
    data: new Uint8Array([0, 0, 0, 0]),
    height: 1,
    width: 1,
  })
}

export default MapView
