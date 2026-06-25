import type { LocationCandidate } from './types'

const STREET_MARKER =
  /(?:вул(?:иця)?\.?|ул\.?|просп(?:ект)?\.?|пр\.|пров(?:улок)?\.?|шосе|наб(?:ережна)?\.?)/iu
const RESIDENTIAL_COMPLEX_MARKER = /(?:^|[\s,(])жк\s+/iu
const HOUSE_NUMBER =
  /(?:^|[\s,])(\d{1,4}[а-яa-z]?(?:[/-]\d{1,4}[а-яa-z]?)?)(?=$|[\s,.])/iu

export function extractOlxLocationCandidates(
  document: Document,
): LocationCandidate[] {
  const areaLabel = extractAreaLabel(document)
  const addressLabel = extractAddressLabel(document)
  const candidates: LocationCandidate[] = []

  if (addressLabel) {
    candidates.push({
      label: addressLabel,
      query: joinLocationParts(addressLabel, areaLabel),
      precision: 'address',
    })
  }

  if (areaLabel && areaLabel !== addressLabel) {
    candidates.push({
      label: areaLabel,
      query: areaLabel,
      precision: 'area',
    })
  }

  return candidates
}

function extractAddressLabel(document: Document): string | null {
  const description = document.querySelector<HTMLElement>(
    '[data-testid="ad_description"]',
  )
  const title = document.querySelector<HTMLElement>(
    '[data-testid="offer_title"]',
  )
  const sourceLines = [...getTextLines(description), ...getTextLines(title)]

  for (const line of sourceLines) {
    const address = extractAddressFromLine(line)

    if (address) {
      return address
    }
  }

  return null
}

function extractAddressFromLine(line: string): string | null {
  const streetMatch = STREET_MARKER.exec(line)

  if (streetMatch?.index !== undefined) {
    const afterStreet = line.slice(streetMatch.index + streetMatch[0].length)
    const houseMatch = HOUSE_NUMBER.exec(afterStreet)

    if (houseMatch?.index !== undefined) {
      const residentialComplexMatch = RESIDENTIAL_COMPLEX_MARKER.exec(line)
      const start = residentialComplexMatch
        ? residentialComplexMatch.index
        : streetMatch.index
      const end =
        streetMatch.index +
        streetMatch[0].length +
        houseMatch.index +
        houseMatch[0].length

      return normalizeText(line.slice(start, end))
    }
  }

  const residentialComplexMatch = RESIDENTIAL_COMPLEX_MARKER.exec(line)

  if (residentialComplexMatch?.index !== undefined) {
    const fragment = line
      .slice(residentialComplexMatch.index)
      .split(/[.;]/u, 1)[0]
    const label = normalizeText(fragment.split(',', 1)[0]).slice(0, 100)

    return label.length > 3 ? label : null
  }

  return null
}

function extractAreaLabel(document: Document): string | null {
  const mapAnchor = document.querySelector<HTMLElement>(
    '[data-testid="open-dialog"]',
  )
  const locationIcon =
    mapAnchor?.parentElement?.querySelector<HTMLImageElement>(
      'img[alt="Location"]',
    )
  const locationRoot = locationIcon?.parentElement
  const parts = Array.from(locationRoot?.querySelectorAll('p') ?? [])
    .map((element) => normalizeText(element.textContent ?? ''))
    .filter(Boolean)

  if (parts.length > 0) {
    return parts.join(', ')
  }

  return extractJsonLdArea(document)
}

function extractJsonLdArea(document: Document): string | null {
  for (const script of document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  )) {
    try {
      const area = findAreaServed(JSON.parse(script.textContent ?? ''))

      if (area) {
        return area
      }
    } catch {
      // Ignore malformed third-party structured data and continue searching.
    }
  }

  return null
}

function findAreaServed(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const area = findAreaServed(item)

      if (area) {
        return area
      }
    }

    return null
  }

  if (!isRecord(value)) {
    return null
  }

  const areaServed = value.areaServed

  if (typeof areaServed === 'string') {
    return normalizeText(areaServed) || null
  }

  if (isRecord(areaServed) && typeof areaServed.name === 'string') {
    return normalizeText(areaServed.name) || null
  }

  for (const child of Object.values(value)) {
    const area = findAreaServed(child)

    if (area) {
      return area
    }
  }

  return null
}

function getTextLines(element: HTMLElement | null): string[] {
  if (!element) {
    return []
  }

  const clone = element.cloneNode(true) as HTMLElement
  clone.querySelectorAll('br').forEach((breakElement) => {
    breakElement.replaceWith('\n')
  })

  return (clone.textContent ?? '')
    .split(/\n+/u)
    .map(normalizeText)
    .filter(Boolean)
}

function joinLocationParts(address: string, area: string | null): string {
  if (
    !area ||
    normalizeForComparison(address).includes(normalizeForComparison(area))
  ) {
    return address
  }

  return `${address}, ${area}`
}

function normalizeText(value: string): string {
  return value.replace(/\s+/gu, ' ').replace(/\s+,/gu, ',').trim()
}

function normalizeForComparison(value: string): string {
  return normalizeText(value).toLocaleLowerCase('uk-UA')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
