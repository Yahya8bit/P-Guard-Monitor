Use claude-sonnet-4-5 for this task.

Fix the dark-mode rendering of the "Dernière position et trajet" map on the Dashboard (and check the Statistiques map for the same bug): the basemap renders as a solid dark void — tiles are not displayed — while the polyline and markers render fine.

**1. Force TileLayer remount on theme change**
react-leaflet does not reload tiles when the url prop changes. Give the TileLayer a key tied to the theme:
<TileLayer key={theme} url={theme === 'dark' ? DARK_URL : LIGHT_URL} attribution={...} />
DARK_URL: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
LIGHT_URL: https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png

**2. Verify nothing covers the tiles**
Check that no dark-theme CSS sets a background/filter on .leaflet-container or its tile panes that hides tiles. The container background can stay dark as a loading backdrop, but tiles must render above it. Open the browser console and report any 4xx on tile requests if the key fix isn't enough.

**3. Style the zoom controls for dark mode**
Add CSS so .leaflet-control-zoom buttons follow the theme (dark background, light icon, subtle border in dark mode) instead of the default white.

Apply the same fixes to the Statistiques "Trajet de patrouille (GPS)" map if it shares the issue.