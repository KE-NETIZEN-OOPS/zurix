// Approximate coordinates [lat, lng] for common Kenyan locations.
// Used to give text-only/seeded profiles a position and to compute distances.
export const KENYA_PLACES: Record<string, [number, number]> = {
  nairobi: [-1.286389, 36.817223],
  mombasa: [-4.043477, 39.668206],
  kisumu: [-0.091702, 34.767956],
  nakuru: [-0.303099, 36.080026],
  eldoret: [0.514277, 35.269779],
  thika: [-1.0333, 37.0693],
  nyeri: [-0.4169, 36.9514],
  meru: [0.0463, 37.6559],
  kakamega: [0.2827, 34.7519],
  kisii: [-0.6817, 34.7667],
  kericho: [-0.3689, 35.2864],
  machakos: [-1.5177, 37.2634],
  kitale: [1.0157, 35.0062],
  garissa: [-0.4536, 39.6401],
  kiambu: [-1.1714, 36.8356],
  ruiru: [-1.1452, 36.9580],
  naivasha: [-0.7172, 36.4310],
  malindi: [-3.2192, 40.1169],
  kilifi: [-3.6305, 39.8499],
  bungoma: [0.5635, 34.5606],
  busia: [0.4601, 34.1115],
  homabay: [-0.5273, 34.4571],
  migori: [-1.0634, 34.4731],
  embu: [-0.5310, 37.4575],
  narok: [-1.0833, 35.8667],
  kajiado: [-1.8521, 36.7820],
  nyahururu: [0.0333, 36.3667],
  kerugoya: [-0.4986, 37.2803],
  kirinyaga: [-0.4986, 37.2803],
  voi: [-3.3960, 38.5560],
  lamu: [-2.2717, 40.9020],
  isiolo: [0.3546, 37.5822],
  'uasin gishu': [0.5143, 35.2698],
}

// Common Nairobi estates -> Nairobi center (so "Komarock, Nairobi" maps correctly)
const NAIROBI_HINT = /nairobi|komarock|kasarani|roysambu|umoja|embakasi|pipeline|zimmerman|kahawa|huruma|kawangware|kangemi|githurai|donholm|buruburu|ruai|utawala|njiru|imara daima|south c|south b|kileleshwa|lavington|westlands|karen|langata|ngara|eastleigh|dagoretti|mountain view|lucky summer/i

export function geocodeCity(city: string | null | undefined): [number, number] | null {
  if (!city) return null
  const c = city.toLowerCase().trim()
  for (const key of Object.keys(KENYA_PLACES)) {
    if (c.includes(key)) return KENYA_PLACES[key]
  }
  if (NAIROBI_HINT.test(c)) return KENYA_PLACES.nairobi
  return null
}

// Distance in MILES between two lat/lng points (Haversine).
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8 // earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}
