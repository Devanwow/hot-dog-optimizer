import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import { useOptimizer, geocodeZip, DEFAULTS } from './useOptimizer'
import './index.css'

import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const startIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;background:#FFE600;border:3px solid #0A0A0A;border-radius:50%;box-shadow:0 0 0 2px #FFE600"></div>`,
  className: '',
  iconAnchor: [8, 8],
  popupAnchor: [0, -12],
})
const destIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;background:#F5F5F5;border:3px solid #FFE600;transform:rotate(45deg);box-shadow:0 0 0 2px #F5F5F5"></div>`,
  className: '',
  iconAnchor: [8, 8],
  popupAnchor: [0, -12],
})

function MapController({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(L.latLngBounds(positions), { padding: [48, 48], maxZoom: 13 })
    } else if (positions.length === 1) {
      map.setView(positions[0], 12)
    }
  }, [map, positions])
  return null
}

function ProfitLight({ netProfit }) {
  const isGreen  = netProfit > 200
  const isYellow = netProfit >= 0 && netProfit <= 200
  const isRed    = netProfit < 0

  const color  = isGreen ? '#22c55e' : isYellow ? '#FFE600' : '#ef4444'
  const label  = isGreen ? 'PROFITABLE' : isYellow ? 'BREAK EVEN' : 'LOSS'
  const sign   = isRed ? '-' : ''
  const amount = `${sign}$${Math.abs(netProfit).toFixed(2)}`

  return (
    <div className="flex flex-col items-center justify-center py-6 border-b-2 border-safety-yellow">
      <div
        className="relative flex items-center justify-center rounded-full mb-3"
        style={{
          width: 120, height: 120,
          boxShadow: `0 0 0 6px ${color}33, 0 0 32px ${color}66`,
          border: `4px solid ${color}`,
          background: `${color}18`,
        }}
      >
        <div className="text-center">
          <div className="font-bold text-xs uppercase tracking-widest" style={{ color }}>
            {label}
          </div>
          <div className="font-bold text-lg leading-tight mt-1" style={{ color }}>
            {amount}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 uppercase tracking-widest">Net Profit Indicator</p>
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <span className="text-xs uppercase tracking-widest text-gray-400 flex-1">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-14 items-center border-2 cursor-pointer transition-colors shrink-0 ${
          checked ? 'border-safety-yellow bg-safety-yellow' : 'border-gray-600 bg-hc-black'
        }`}
      >
        <span className={`inline-block h-4 w-4 border-2 transition-transform ${
          checked ? 'translate-x-7 bg-hc-black border-hc-black' : 'translate-x-1 bg-gray-600 border-gray-600'
        }`} />
      </button>
    </label>
  )
}

export default function App() {
  const {
    startingPoint, setStartingPoint,
    destination, setDestination,
    geoStatus,
    fuelConfig, operationalCosts, inventory, session,
    highDensityMode, setHighDensityMode,
    results, error,
    requestGeolocation,
    updateFuelConfig, updateOperationalCosts, updateInventory, updateSession,
    calculate,
  } = useOptimizer()

  const [startZip, setStartZip] = useState('')
  const [destZip, setDestZip]   = useState('')
  const [zipError, setZipError] = useState('')
  const [geocoding, setGeocoding] = useState(false)

  async function handleZipLookup(type) {
    const zip = type === 'start' ? startZip : destZip
    if (!/^\d{5}$/.test(zip)) { setZipError('Enter a valid 5-digit US zip'); return }
    setZipError('')
    setGeocoding(true)
    try {
      const loc = await geocodeZip(zip)
      if (type === 'start') setStartingPoint(loc)
      else setDestination(loc)
    } catch (e) {
      setZipError(e.message)
    } finally {
      setGeocoding(false)
    }
  }

  const fmt   = (n) => `$${Math.abs(n).toFixed(2)}`
  const fmtN  = (n) => n.toFixed(2)

  const mapPositions = [
    ...(startingPoint ? [[startingPoint.lat, startingPoint.lng]] : []),
    ...(destination   ? [[destination.lat,   destination.lng]]   : []),
  ]

  const sellOutWarning = results && session.hoursAtLocation > 0
    && (inventory.totalUnits / (session.hoursAtLocation * 60)) > 1

  return (
    <div className="min-h-screen bg-hc-black text-hc-white flex flex-col">
      <header className="border-b-4 border-safety-yellow px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-safety-yellow font-bold uppercase tracking-widest text-lg leading-none">
            Hot Dog Optimizer
          </h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
            Vendor Profitability &amp; Menu Engine
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 uppercase tracking-widest hidden sm:block">High Density</span>
          <Toggle checked={highDensityMode} onChange={setHighDensityMode} label="" />
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
        <div className="p-4 lg:p-5 lg:border-r-2 lg:border-safety-yellow overflow-y-auto space-y-0">
          <section className="hc-section">
            <div className="hc-section-title">01 / Location</div>

            <div className="mb-4">
              <label className="hc-label">Starting Point</label>
              {startingPoint ? (
                <div className="border border-safety-yellow p-2 text-xs text-gray-300 flex justify-between items-start gap-2">
                  <span className="leading-relaxed">{startingPoint.address}</span>
                  <button onClick={() => setStartingPoint(null)} className="text-safety-yellow font-bold shrink-0 hover:text-white">X</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {geoStatus !== 'denied' && (
                    <button
                      onClick={requestGeolocation}
                      disabled={geoStatus === 'loading'}
                      className="hc-btn w-full py-3 text-base flex items-center justify-center gap-2"
                    >
                      {geoStatus === 'loading' ? 'Locating...' : 'Use My GPS Location'}
                    </button>
                  )}
                  {geoStatus === 'denied' && (
                    <p className="text-red-400 text-xs uppercase tracking-wide font-bold">
                      GPS denied - enter zip code below
                    </p>
                  )}
                  <div className="flex gap-2">
                    <input className="hc-input flex-1" placeholder="OR enter start ZIP (e.g. 90210)"
                      maxLength={5} value={startZip}
                      onChange={e => setStartZip(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && handleZipLookup('start')} />
                    <button onClick={() => handleZipLookup('start')} disabled={geocoding} className="hc-btn shrink-0">GO</button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="hc-label">Vending Destination</label>
              {destination ? (
                <div className="border border-safety-yellow p-2 text-xs text-gray-300 flex justify-between items-start gap-2">
                  <span className="leading-relaxed">{destination.address}</span>
                  <button onClick={() => setDestination(null)} className="text-safety-yellow font-bold shrink-0 hover:text-white">X</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input className="hc-input flex-1" placeholder="Destination ZIP (e.g. 10001)"
                    maxLength={5} value={destZip}
                    onChange={e => setDestZip(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleZipLookup('dest')} />
                  <button onClick={() => handleZipLookup('dest')} disabled={geocoding} className="hc-btn shrink-0">GO</button>
                </div>
              )}
              {zipError  && <p className="text-red-400 text-xs mt-1 uppercase tracking-wide font-bold">{zipError}</p>}
              {geocoding && <p className="text-safety-yellow text-xs mt-1 uppercase tracking-wide">Geocoding...</p>}
            </div>
          </section>

          <section className="hc-section">
            <div className="hc-section-title">02 / Fuel &amp; Vehicle</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="hc-label">Gas ($/gal)</label>
                <input type="number" step="0.01" min="0" className="hc-input"
                  value={fuelConfig.pricePerGallon}
                  onChange={e => updateFuelConfig('pricePerGallon', e.target.value)} />
              </div>
              <div>
                <label className="hc-label">Vehicle MPG</label>
                <input type="number" step="1" min="1" className="hc-input"
                  value={fuelConfig.vehicleMPG}
                  onChange={e => updateFuelConfig('vehicleMPG', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="hc-section">
            <div className="hc-section-title">03 / Operational Costs</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="hc-label">Propane ($/hr)</label>
                <input type="number" step="0.01" min="0" className="hc-input"
                  value={operationalCosts.propanePerHour}
                  onChange={e => updateOperationalCosts('propanePerHour', e.target.value)} />
              </div>
              <div>
                <label className="hc-label">Generator ($/hr)</label>
                <input type="number" step="0.01" min="0" className="hc-input"
                  value={operationalCosts.generatorFuelPerHour}
                  onChange={e => updateOperationalCosts('generatorFuelPerHour', e.target.value)} />
              </div>
              <div>
                <label className="hc-label">Wage ($/hr)</label>
                <input type="number" step="0.50" min="0" className="hc-input"
                  value={operationalCosts.targetHourlyWage}
                  onChange={e => updateOperationalCosts('targetHourlyWage', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="hc-section">
            <div className="hc-section-title">04 / Inventory</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="hc-label">Units</label>
                <input type="number" step="1" min="0" className="hc-input"
                  value={inventory.totalUnits}
                  onChange={e => updateInventory('totalUnits', e.target.value)} />
              </div>
              <div>
                <label className="hc-label">Cost/Unit ($)</label>
                <input type="number" step="0.01" min="0" className="hc-input"
                  value={inventory.unitCost}
                  onChange={e => updateInventory('unitCost', e.target.value)} />
              </div>
              <div>
                <label className="hc-label">Sale Price ($)</label>
                <input type="number" step="0.25" min="0" className="hc-input"
                  value={inventory.unitSalePrice}
                  onChange={e => updateInventory('unitSalePrice', e.target.value)} />
              </div>
            </div>
            {sellOutWarning && (
              <p className="text-yellow-400 text-xs mt-2 uppercase tracking-wide font-bold">
                Sell-out rate exceeds 1 unit/min - inventory may be too high for session length
              </p>
            )}
          </section>

          <section className="hc-section">
            <div className="hc-section-title">05 / Session Timing</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="hc-label">Setup (min)</label>
                <input type="number" step="5" min="0" className="hc-input"
                  value={session.setupMinutes}
                  onChange={e => updateSession('setupMinutes', e.target.value)} />
              </div>
              <div>
                <label className="hc-label">Teardown (min)</label>
                <input type="number" step="5" min="0" className="hc-input"
                  value={session.teardownMinutes}
                  onChange={e => updateSession('teardownMinutes', e.target.value)} />
              </div>
              <div>
                <label className="hc-label">Hours at Location</label>
                <input type="number" step="0.5" min="0" className="hc-input"
                  value={session.hoursAtLocation}
                  onChange={e => updateSession('hoursAtLocation', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="hc-section">
            <div className="hc-section-title">06 / Strategy Toggles</div>
            <div className="space-y-3">
              <Toggle
                checked={highDensityMode}
                onChange={setHighDensityMode}
                label="High Density / Volume Mode - suggests Limited Menu for fast throughput"
              />
            </div>
            {highDensityMode && (
              <div className="mt-3 p-2 border border-gray-700 text-xs text-gray-400 space-y-1">
                <p className="text-safety-yellow font-bold uppercase tracking-widest text-xs">Limited Menu active</p>
                <p>- Reduce to top 3 fastest sellers only</p>
                <p>- Pre-stage condiments for throughput</p>
                <p>- Batch-cook in advance</p>
              </div>
            )}
          </section>

          <button
            onClick={calculate}
            disabled={!startingPoint || !destination}
            className="hc-btn w-full py-4 text-base"
          >
            Calculate Profitability
          </button>
          {(!startingPoint || !destination) && (
            <p className="text-xs text-gray-600 text-center uppercase tracking-widest mt-2">
              Set both locations to run - defaults active: ${DEFAULTS.fuelConfig.pricePerGallon}/gal, {DEFAULTS.fuelConfig.vehicleMPG} MPG, ${DEFAULTS.inventory.unitCost} COGS
            </p>
          )}
          {error && <div className="alert-high-risk mt-3">{error}</div>}
        </div>

        <div className="flex flex-col min-h-0">
          <div className="h-56 lg:h-72 shrink-0 border-b-2 border-safety-yellow">
            <MapContainer
              center={[39.8283, -98.5795]}
              zoom={4}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {startingPoint && (
                <Marker position={[startingPoint.lat, startingPoint.lng]} icon={startIcon}>
                  <Popup><strong>Start:</strong><br />{startingPoint.address}</Popup>
                </Marker>
              )}
              {destination && (
                <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
                  <Popup><strong>Destination:</strong><br />{destination.address}</Popup>
                </Marker>
              )}
              {startingPoint && destination && (
                <Polyline
                  positions={[[startingPoint.lat, startingPoint.lng], [destination.lat, destination.lng]]}
                  color="#FFE600" weight={2} dashArray="10 5"
                />
              )}
              <MapController positions={mapPositions} />
            </MapContainer>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!results ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <p className="text-gray-500 uppercase tracking-widest text-sm">Awaiting calculation</p>
                <p className="text-gray-700 text-xs mt-2">
                  Defaults: ${DEFAULTS.fuelConfig.pricePerGallon}/gal, {DEFAULTS.fuelConfig.vehicleMPG} MPG, ${DEFAULTS.inventory.unitCost} COGS
                </p>
              </div>
            ) : (
              <>
                <ProfitLight netProfit={results.netProfit} />

                <div className="p-4 space-y-4">
                  {results.isHighRisk ? (
                    <div className="alert-high-risk">
                      HIGH RISK - You need <strong>{results.breakEvenUnits} units</strong> to break even
                      but only have <strong>{inventory.totalUnits}</strong> in inventory.
                      You cannot cover overhead at current pricing.
                    </div>
                  ) : results.netProfit < 0 ? (
                    <div className="alert-warning">
                      NET LOSS PROJECTED - Reduce travel distance or raise prices.
                    </div>
                  ) : (
                    <div className="alert-success">
                      RUN IS PROFITABLE - Break-even at {results.breakEvenUnits} units, you have {inventory.totalUnits}.
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      [results.netProfit < 0 ? `-$${Math.abs(results.netProfit).toFixed(2)}` : `$${results.netProfit.toFixed(2)}`, 'Net Profit', results.netProfit < 0 ? 'text-red-400' : 'text-green-400'],
                      [`${results.oneWayMiles.toFixed(1)} mi`, 'Est. One-Way', 'text-safety-yellow'],
                      [results.breakEvenUnits === Infinity ? 'inf' : results.breakEvenUnits, 'Break-Even Units', 'text-safety-yellow'],
                      [`${(results.overheadToRevenueRatio * 100).toFixed(0)}%`, 'Overhead / Rev', 'text-safety-yellow'],
                    ].map(([val, lbl, cls]) => (
                      <div key={lbl} className="stat-box">
                        <div className={`stat-value text-xl ${cls}`}>{val}</div>
                        <div className="stat-label">{lbl}</div>
                      </div>
                    ))}
                  </div>

                  <div className="hc-section !mb-0">
                    <div className="hc-section-title">Strategy</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {results.suggestPremiumMenu
                        ? <span className="strategy-badge">Premium Menu +20%</span>
                        : <span className="strategy-badge-outline">Standard Pricing</span>
                      }
                      {highDensityMode && <span className="strategy-badge">Limited Menu</span>}
                    </div>
                    {results.suggestPremiumMenu && (
                      <p className="text-xs text-gray-400 uppercase tracking-widest">
                        Travel + burn = {(results.travelBurnRatio * 100).toFixed(0)}% of revenue
                        (threshold: 30%) - raise prices to ${fmtN(results.premiumUnitPrice)}/unit.
                        Projected profit at premium: {results.premiumNetProfit < 0 ? '-' : ''}${Math.abs(results.premiumNetProfit).toFixed(2)}
                      </p>
                    )}
                    {highDensityMode && (
                      <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">
                        Target sell-through: {results.targetUnitsPerHour} units/hr
                      </p>
                    )}
                  </div>

                  <div className="hc-section !mb-0">
                    <div className="hc-section-title">Cost Breakdown</div>
                    <div className="space-y-1 text-sm font-mono">
                      {[
                        ['Travel Cost',    results.travelCost,    `${results.totalMiles.toFixed(1)} mi x $${fmtN(fuelConfig.pricePerGallon)}/gal`],
                        ['Time Cost',      results.timeCost,      `Wage + setup/teardown`],
                        ['Burn Cost',      results.burnCost,      `${session.hoursAtLocation}h propane + generator`],
                        ['COGS',           results.cogs,          `${inventory.totalUnits} x ${fmt(inventory.unitCost)}`],
                      ].map(([label, value, note]) => (
                        <div key={label} className="flex justify-between items-start border-b border-gray-800 pb-1 gap-2">
                          <div className="min-w-0">
                            <span className="text-hc-white">{label}</span>
                            <span className="text-gray-600 text-xs block">{note}</span>
                          </div>
                          <span className="text-red-400 shrink-0">{fmt(value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-1">
                        <span className="text-gray-400">Gross Revenue</span>
                        <span className="text-green-400">{fmt(results.grossRevenue)}</span>
                      </div>
                      <div className="flex justify-between border-t-2 border-safety-yellow pt-2 mt-1">
                        <span className="font-bold text-safety-yellow uppercase tracking-wide">Net Profit</span>
                        <span className={`font-bold text-lg ${results.netProfit < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {results.netProfit < 0 ? '-' : ''}{fmt(results.netProfit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {results.isHighRisk && (
                    <div className="alert-high-risk">
                      INVENTORY SHORT - Need {results.breakEvenUnits - inventory.totalUnits} more units
                      to reach break-even at ${fmtN(inventory.unitSalePrice)}/unit.
                      Consider: raise price to ${fmtN(results.premiumUnitPrice)} or reduce overhead.
                    </div>
                  )}

                  <p className="text-xs text-gray-700 text-center uppercase tracking-widest pb-4">
                    Distance = straight-line x 1.3 road factor (estimated), speed assumed 35 mph avg
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
