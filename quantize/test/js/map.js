import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.10.0/dist/maplibre-gl.mjs';


// ============================================================
// MAP STYLE
// ============================================================

const style = {
    version: 8,
    sources: {},
    layers: [
        // Very dark base
        {
            id: 'background',
            type: 'background',
            paint: {
                'background-color': '#050b12'
            }
        }
    ]
};

const estyle = {
    version: 8,
    sources: {},
    layers: []
};

let isSatelliteActive = false;


// ============================================================
// MAP
// ============================================================

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',

    center: [-5.886601053237628, 54.60845678141215],
    zoom: 16,

    touchZoomRotate: true,
    touchPitch: true,

    // Gives the map a more "game camera" feel
    pitch: 35,
    bearing: 0
});


// ============================================================
// ADD MAP DATA
// ============================================================

function loadGeoJSONData() {

    // --------------------------------------------------------
    // SOURCE
    // --------------------------------------------------------

    if (!map.getSource('park-data-source')) {

        map.addSource('park-data-source', {
            type: 'geojson',
            data: '../json/cybermap.geojson'
        });
    }


    // ========================================================
    // POLYGON / BUILDING LAYERS
    // ========================================================

    // --------------------------------------------------------
    // 1. Very subtle polygon shadow
    // --------------------------------------------------------

    if (!map.getLayer('polygon-shadow')) {

        map.addLayer({
            id: 'polygon-shadow',
            type: 'fill',
            source: 'park-data-source',

            filter: [
                '==',
                ['geometry-type'],
                'Polygon'
            ],

            paint: {
                'fill-color': '#000000',
                'fill-opacity': 0.55
            }
        });
    }


    // --------------------------------------------------------
    // 2. Main building / polygon fill
    // --------------------------------------------------------

    if (!map.getLayer('buildings')) {

        map.addLayer({
            id: 'buildings',
            type: 'fill',
            source: 'park-data-source',

            filter: [
                '==',
                ['geometry-type'],
                'Polygon'
            ],

            paint: {
                'fill-color': '#081522',
                'fill-opacity': 0.92
            }
        });
    }


    // --------------------------------------------------------
    // 3. Building inner highlight
    // --------------------------------------------------------

    if (!map.getLayer('building-highlight')) {

        map.addLayer({
            id: 'building-highlight',
            type: 'line',
            source: 'park-data-source',

            filter: [
                '==',
                ['geometry-type'],
                'Polygon'
            ],

            paint: {
                'line-color': '#12354a',
                'line-width': 1,
                'line-opacity': 0.8
            }
        });
    }


    // --------------------------------------------------------
    // 4. Building edge glow
    // --------------------------------------------------------

    if (!map.getLayer('building-glow')) {

        map.addLayer({
            id: 'building-glow',
            type: 'line',
            source: 'park-data-source',

            filter: [
                '==',
                ['geometry-type'],
                'Polygon'
            ],

            paint: {
                'line-color': '#008fb5',
                'line-width': 3,
                'line-opacity': 0.08,
                'line-blur': 3
            }
        });
    }


    // ========================================================
    // LINE / ROAD SYSTEM
    // ========================================================

    // --------------------------------------------------------
    // 5. Large road glow
    // --------------------------------------------------------

    if (!map.getLayer('road-glow')) {

        map.addLayer({
            id: 'road-glow',
            type: 'line',
            source: 'park-data-source',

            filter: [
                '==',
                ['geometry-type'],
                'LineString'
            ],

            paint: {
                'line-color': '#00bfff',
                'line-width': 8,
                'line-opacity': 0.07,
                'line-blur': 4
            }
        });
    }


    // --------------------------------------------------------
    // 6. Main road
    // --------------------------------------------------------

    if (!map.getLayer('main-roads')) {

        map.addLayer({
            id: 'main-roads',
            type: 'line',
            source: 'park-data-source',

            filter: [
                '==',
                ['geometry-type'],
                'LineString'
            ],

            paint: {
                'line-color': '#087d9f',
                'line-width': 3,
                'line-opacity': 0.95
            }
        });
    }


    // --------------------------------------------------------
    // 7. Bright road centre
    // --------------------------------------------------------

    if (!map.getLayer('road-core')) {

        map.addLayer({
            id: 'road-core',
            type: 'line',
            source: 'park-data-source',

            filter: [
                '==',
                ['geometry-type'],
                'LineString'
            ],

            paint: {
                'line-color': '#00d9ff',
                'line-width': 1,
                'line-opacity': 0.9
            }
        });
    }


    // --------------------------------------------------------
    // 8. Fine road network
    // --------------------------------------------------------

    if (!map.getLayer('minor-roads')) {

        map.addLayer({
            id: 'minor-roads',
            type: 'line',
            source: 'park-data-source',

            filter: [
                '==',
                ['geometry-type'],
                'LineString'
            ],

            paint: {
                'line-color': '#15506a',
                'line-width': 1,
                'line-opacity': 0.65
            }
        });
    }


    // ========================================================
    // FANTASY / GAME MAP DETAILS
    // ========================================================

    // --------------------------------------------------------
    // 9. Road intersections / nodes
    // --------------------------------------------------------

    if (!map.getLayer('road-nodes')) {

        map.addLayer({
            id: 'road-nodes',
            type: 'circle',
            source: 'park-data-source',

            filter: [
                '==',
                ['geometry-type'],
                'Point'
            ],

            paint: {
                'circle-radius': 2,
                'circle-color': '#00d9ff',
                'circle-opacity': 0.45,
                'circle-blur': 0.5
            }
        });
    }


    // --------------------------------------------------------
    // 10. Small bright points
    // --------------------------------------------------------

    if (!map.getLayer('micro-points')) {

        map.addLayer({
            id: 'micro-points',
            type: 'circle',
            source: 'park-data-source',

            filter: [
                '==',
                ['geometry-type'],
                'Point'
            ],

            paint: {
                'circle-radius': 1,
                'circle-color': '#a7efff',
                'circle-opacity': 0.8
            }
        });
    }


    // ========================================================
    // CUSTOM HUD-LIKE BORDER EFFECT
    // ========================================================

    // --------------------------------------------------------
    // 11. Very subtle polygon border
    // --------------------------------------------------------

    if (!map.getLayer('territory-lines')) {

        map.addLayer({
            id: 'territory-lines',
            type: 'line',
            source: 'park-data-source',

            filter: [
                '==',
                ['geometry-type'],
                'Polygon'
            ],

            paint: {
                'line-color': '#1b6682',
                'line-width': 0.6,
                'line-opacity': 0.5
            }
        });
    }
}


// ============================================================
// INITIAL LOAD
// ============================================================

map.on('load', () => {
    loadGeoJSONData();
});


// ============================================================
// RELOAD DATA AFTER STYLE CHANGES
// ============================================================

map.on('styledata', () => {

    // Don't immediately execute during every styledata event
    if (map.isStyleLoaded()) {
        loadGeoJSONData();
    }
});


// ============================================================
// OPTIONAL SATELLITE TOGGLE
// ============================================================

document.getElementById('mapbutton').addEventListener('click', () => {

    if (isSatelliteActive) {

        map.setStyle(style);
        isSatelliteActive = false;

    } else {

        // If you want satellite back later,
        // put your satellite style here.

        map.setStyle(style);
        isSatelliteActive = true;
    }
});
