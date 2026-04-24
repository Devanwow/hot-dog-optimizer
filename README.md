# Hot Dog Optimizer

A vendor profitability & menu engine. Plug in your route, fuel config, operational costs, and inventory, then get net profit, break-even unit count, and pricing strategy recommendations before you hit the road.

## Stack

- **React 19** + **Vite 8**
- **Tailwind CSS 3** (high-contrast Black / White / Safety-Yellow theme)
- **react-leaflet 5** + **Leaflet 1.9** (OpenStreetMap tiles, no API key required)
- **Nominatim** for zip-code geocoding (no API key required)

## Run

```bash
npm install
npm run dev     # development
npm run build   # production bundle
npm run lint    # eslint
```

## How profitability is calculated

```
Travel Cost = (totalMiles / MPG) * pricePerGallon
Time Cost   = (travelMinutes + setupMin + teardownMin) * (wage / 60)
Burn Cost   = hoursAtLocation * (propanePerHour + generatorPerHour)
Net Profit  = totalUnits * (salePrice - unitCost) - (Travel + Time + Burn)
```

Distance is straight-line x a 1.3 road factor (estimated, no routing API). Travel time assumes a 35 mph average urban speed.

## Strategy signals

- **High Risk** - inventory cannot cover travel cost alone at current pricing.
- **Premium Menu** - (Travel + Burn) > 30% of projected revenue -> raise prices 20%.
- **Limited Menu** - toggled on via "High Density Mode" for throughput events.

## Defaults (used if fields are blank)

| Field            | Value     |
|------------------|-----------|
| Gas price        | $3.50/gal |
| Vehicle MPG      | 15 mpg    |
| Unit cost (COGS) | $1.50     |
