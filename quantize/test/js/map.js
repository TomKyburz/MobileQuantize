import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.10.0/dist/maplibre-gl.mjs';
// 1. Initialize your empty canvas environment
const map = new maplibregl.Map({
    container: 'map',
    style: {
        "version": 8,
        "sources": {},
        "layers": []
    },
    // Replace these two values with your actual park center coordinates [longitude, latitude]
    center: [-5.886601053237628, 54.60845678141215],
    zoom: 16
});

map.on('load', () => {
    // 2. Point to your real downloaded Overpass file
    map.addSource('park-data-source', {
        'type': 'geojson',
        'data': '../json/park-data.geojson'
    });

    // 3. Render ALL Polygons (Park areas, grass lawns, building outlines)
    map.addLayer({
        'id': 'osm-polygons',
        'type': 'fill',
        'source': 'park-data-source',
        'filter': ['==', ['geometry-type'], 'Polygon'], // Target raw shape types
        'paint': {
            'fill-color': '#4caf50', // Default green color for shapes
            'fill-opacity': 0.6,
            'fill-outline-color': '#ffffff'
        }
    });

    // 4. Render ALL Lines (Footpaths, roads, fences, tracks)
    map.addLayer({
        'id': 'osm-lines',
        'type': 'line',
        'source': 'park-data-source',
        'filter': ['==', ['geometry-type'], 'LineString'], // Target raw line types
        'paint': {
            'line-color': '#ff9800', // Default orange color for tracks/paths
            'line-width': 3
        }
    });

    // 5. Render ALL Points (Benches, trees, gates, lights)
    map.addLayer({
        'id': 'osm-points',
        'type': 'circle',
        'source': 'park-data-source',
        'filter': ['==', ['geometry-type'], 'Point'], // Target raw point dots
        'paint': {
            'circle-radius': 6,
            'circle-color': '#2196f3', // Default blue dot for points
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
        }
    });
});
