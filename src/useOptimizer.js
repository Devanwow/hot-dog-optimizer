import { useState, useCallback } from 'react'
import L from 'leaflet'

export const DEFAULTS = {
  fuelConfig: {
    pricePerGallon: 3.50,
    vehicleMPG: 15,
  },
  operationalCosts: {
    propanePerHour: 0.75,
    generatorFuelPerHour: 0.50,
    targetHourlyWage: 15.00,
  },
  inventory: {
    totalUnits: 100,
    unitCost: 1.50,
    unitSalePrice: 4.00,
  },
  session: {
    setupMinutes: 30,
    teardownMinutes: 20,
    hoursAtLocation: 4,
  },
}

const METERS_PER_MILE = 1609.344
const ROAD_FACTOR = 1.3
const AVG_SPEED_MPH = 35

export function distanceMiles(a, b) {
  const from = L.latLng(a.lat, a.lng)
  const to = L.latLng(b.lat, b.lng)
  return (from.distanceTo(to) / METERS_PER_MILE) * ROAD_FACTOR
}

export async function geocodeZip(zip) {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?postalcode=${encodeURIComponent(zip)}&country=US&format=json&limit=1`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  if (!res.ok) throw new Error('Geocoding service unavailable')
  const data = await res.json()
  if (!data.length) throw new Error(`Zip code "${zip}" not found`)
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    address: data[0].display_name,
  }
}

export async function reverseGeocode(lat, lng) {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${lat}&lon=${lng}&format=json`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  const data = await res.json()
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export function calculateProfitability({
  startingPoint,
  destination,
  fuelConfig,
  operationalCosts,
  inventory,
  session,
}) {
  if (!startingPoint || !destination) {
    throw new Error('Both startingPoint and destination are required')
  }

  const {
    pricePerGallon = DEFAULTS.fuelConfig.pricePerGallon,
    vehicleMPG = DEFAULTS.fuelConfig.vehicleMPG,
  } = fuelConfig

  const {
    propanePerHour = DEFAULTS.operationalCosts.propanePerHour,
    generatorFuelPerHour = DEFAULTS.operationalCosts.generatorFuelPerHour,
    targetHourlyWage = DEFAULTS.operationalCosts.targetHourlyWage,
  } = operationalCosts

  const {
    totalUnits = DEFAULTS.inventory.totalUnits,
    unitCost = DEFAULTS.inventory.unitCost,
    unitSalePrice = DEFAULTS.inventory.unitSalePrice,
  } = inventory

  const {
    setupMinutes = DEFAULTS.session.setupMinutes,
    teardownMinutes = DEFAULTS.session.teardownMinutes,
    hoursAtLocation = DEFAULTS.session.hoursAtLocation,
  } = session

  const oneWayMiles = distanceMiles(startingPoint, destination)
  const totalMiles = oneWayMiles * 2

  const travelCost = (totalMiles / vehicleMPG) * pricePerGallon

  const travelMinutes = (totalMiles / AVG_SPEED_MPH) * 60
  const totalTimeMinutes = travelMinutes + setupMinutes + teardownMinutes
  const timeCost = totalTimeMinutes * (targetHourlyWage / 60)

  const burnCost = hoursAtLocation * (propanePerHour + generatorFuelPerHour)

  const totalOverhead = travelCost + timeCost + burnCost
  const grossRevenue = totalUnits * unitSalePrice
  const cogs = totalUnits * unitCost
  const grossProfit = grossRevenue - cogs
  const netProfit = grossProfit - totalOverhead

  const marginPerUnit = unitSalePrice - unitCost
  const breakEvenUnits =
    marginPerUnit > 0 ? Math.ceil(totalOverhead / marginPerUnit) : Infinity

  const isHighRisk = totalUnits < breakEvenUnits

  const travelBurnRatio = grossRevenue > 0 ? (travelCost + burnCost) / grossRevenue : 1
  const overheadToRevenueRatio = grossRevenue > 0 ? totalOverhead / grossRevenue : 1

  const suggestPremiumMenu = travelBurnRatio > 0.30

  const premiumUnitPrice = unitSalePrice * 1.20
  const premiumRevenue = totalUnits * premiumUnitPrice
  const premiumNetProfit = premiumRevenue - cogs - totalOverhead

  return {
    oneWayMiles,
    totalMiles,
    travelCost,
    timeCost,
    burnCost,
    totalOverhead,
    grossRevenue,
    cogs,
    grossProfit,
    netProfit,
    marginPerUnit,
    breakEvenUnits,
    travelBurnRatio,
    overheadToRevenueRatio,
    isHighRisk,
    suggestPremiumMenu,
    premiumUnitPrice,
    premiumRevenue,
    premiumNetProfit,
    targetUnitsPerHour:
      hoursAtLocation > 0 ? Math.ceil(totalUnits / hoursAtLocation) : 0,
  }
}

export function useOptimizer() {
  const [startingPoint, setStartingPoint] = useState(null)
  const [destination, setDestination] = useState(null)
  const [geoStatus, setGeoStatus] = useState('idle')

  const [fuelConfig, setFuelConfig] = useState({ ...DEFAULTS.fuelConfig })
  const [operationalCosts, setOperationalCosts] = useState({ ...DEFAULTS.operationalCosts })
  const [inventory, setInventory] = useState({ ...DEFAULTS.inventory })
  const [session, setSession] = useState({ ...DEFAULTS.session })

  const [highDensityMode, setHighDensityMode] = useState(false)

  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('denied')
      return
    }
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          const address = await reverseGeocode(lat, lng)
          setStartingPoint({ lat, lng, address })
          setGeoStatus('success')
        } catch {
          setStartingPoint({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: 'Current Location',
          })
          setGeoStatus('success')
        }
      },
      () => setGeoStatus('denied'),
      { timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  const updateFuelConfig = useCallback((field, raw) => {
    const value = parseFloat(raw)
    setFuelConfig((prev) => ({
      ...prev,
      [field]: isNaN(value) ? DEFAULTS.fuelConfig[field] : value,
    }))
  }, [])

  const updateOperationalCosts = useCallback((field, raw) => {
    const value = parseFloat(raw)
    setOperationalCosts((prev) => ({
      ...prev,
      [field]: isNaN(value) ? DEFAULTS.operationalCosts[field] : value,
    }))
  }, [])

  const updateInventory = useCallback((field, raw) => {
    const value = field === 'totalUnits' ? parseInt(raw) : parseFloat(raw)
    setInventory((prev) => ({
      ...prev,
      [field]: isNaN(value) ? DEFAULTS.inventory[field] : value,
    }))
  }, [])

  const updateSession = useCallback((field, raw) => {
    const value = parseFloat(raw)
    setSession((prev) => ({
      ...prev,
      [field]: isNaN(value) ? DEFAULTS.session[field] : value,
    }))
  }, [])

  const calculate = useCallback(() => {
    setError(null)
    try {
      const result = calculateProfitability({
        startingPoint,
        destination,
        fuelConfig,
        operationalCosts,
        inventory,
        session,
      })
      setResults(result)
    } catch (err) {
      setError(err.message)
      setResults(null)
    }
  }, [startingPoint, destination, fuelConfig, operationalCosts, inventory, session])

  return {
    startingPoint,
    setStartingPoint,
    destination,
    setDestination,
    geoStatus,
    fuelConfig,
    operationalCosts,
    inventory,
    session,
    highDensityMode,
    setHighDensityMode,
    results,
    error,
    requestGeolocation,
    updateFuelConfig,
    updateOperationalCosts,
    updateInventory,
    updateSession,
    calculate,
  }
}
