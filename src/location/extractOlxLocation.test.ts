import { beforeEach, describe, expect, it } from 'vitest'
import { extractOlxLocationCandidates } from './extractOlxLocation'

describe('extractOlxLocationCandidates', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('extracts an address from the main description and adds the OLX area', () => {
    document.body.innerHTML = `
      <div data-testid="offer_title">Оренда квартири</div>
      <div data-testid="ad_description">
        Актуально!<br>
        ЖК Park Avenue, пр. Голосіївський, 62, здається квартира.<br>
      </div>
      <div>
        <div>
          <img alt="Location">
          <div><p>Київ, Голосіївський</p><p>Київська область</p></div>
        </div>
        <div data-testid="open-dialog"></div>
      </div>
    `

    expect(extractOlxLocationCandidates(document)).toEqual([
      {
        label: 'ЖК Park Avenue, пр. Голосіївський, 62',
        query:
          'ЖК Park Avenue, пр. Голосіївський, 62, Київ, Голосіївський, Київська область',
        precision: 'address',
      },
      {
        label: 'Київ, Голосіївський, Київська область',
        query: 'Київ, Голосіївський, Київська область',
        precision: 'area',
      },
    ])
  })

  it('falls back to the unique main OLX location block', () => {
    document.body.innerHTML = `
      <div data-testid="ad_description">Квартира після ремонту.</div>
      <div>
        <div><img alt="Location"><div><p>Львів</p><p>Львівська область</p></div></div>
        <div data-testid="open-dialog"></div>
      </div>
    `

    expect(extractOlxLocationCandidates(document)).toEqual([
      {
        label: 'Львів, Львівська область',
        query: 'Львів, Львівська область',
        precision: 'area',
      },
    ])
  })

  it('ignores address-like text from recommended listings', () => {
    document.body.innerHTML = `
      <div data-testid="ad_description">Затишна квартира.</div>
      <div>
        <div><img alt="Location"><div><p>Київ, Подільський</p></div></div>
        <div data-testid="open-dialog"></div>
      </div>
      <section aria-label="Рекомендації">
        <article>вул. Хрещатик, 10</article>
      </section>
    `

    expect(extractOlxLocationCandidates(document)).toEqual([
      {
        label: 'Київ, Подільський',
        query: 'Київ, Подільський',
        precision: 'area',
      },
    ])
  })

  it('uses JSON-LD areaServed when the visible location block is missing', () => {
    document.head.innerHTML = `
      <script type="application/ld+json">
        {"@type":"Product","offers":{"areaServed":{"name":"Голосіївський"}}}
      </script>
    `

    expect(extractOlxLocationCandidates(document)).toEqual([
      {
        label: 'Голосіївський',
        query: 'Голосіївський',
        precision: 'area',
      },
    ])
  })

  it('returns no candidates when OLX location data is unavailable', () => {
    document.body.innerHTML = '<main>Оголошення без локації</main>'

    expect(extractOlxLocationCandidates(document)).toEqual([])
  })
})
