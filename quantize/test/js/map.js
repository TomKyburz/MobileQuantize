import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.10.0/dist/maplibre-gl.mjs';


function open() {
  console.log(isSatelliteActive);
    if (isSatelliteActive) {
        // Change to empty style
        map.setStyle(estyle);
        isSatelliteActive = false;
    } else {
        // Change back to satellite style
        map.setStyle(style);
        isSatelliteActive = true;
    }
}
document.getElementById('mapbutton').addEventListener('click', open);

const style = {
  "version": 8,
  "sources": {
      "satellite": {
          "type": "raster",
          "tiles": [
              "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"
          ],
          "tileSize": 256
      }
  },
  "layers": [{
      "id": "satellite",
      "type": "raster",
      "source": "satellite"
  }]
}

const estyle = {
    version: 8,
    sources: {},
    layers: []
};

let isSatelliteActive = true;

const map = new maplibregl.Map({
    container: 'map',
    style: style,
    // Replace these two values with your actual park center coordinates [longitude, latitude]
    center: [-5.886601053237628, 54.60845678141215],
    zoom: 16,
    touchZoomRotate: true,
    touchPitch: true
});

function loadGeoJSONData() {
    // Check if the source already exists to prevent duplicate errors
    if (!map.getSource('park-data-source')) {
        map.addSource('park-data-source', {
            'type': 'geojson',
            'data': '../json/cybermap.geojson'
        });

        map.addLayer({
            'id': 'osm-polygons',
            'type': 'fill',
            'source': 'park-data-source',
            'filter': ['==', ['geometry-type'], 'Polygon'],
            'paint': {
                'fill-color': '#ff0000',
                'fill-opacity': 0.6,
                'fill-outline-color': '#ffffff'
            }
        });

        map.addLayer({
            'id': 'osm-lines',
            'type': 'line',
            'source': 'park-data-source',
            'filter': ['==', ['geometry-type'], 'LineString'],
            'paint': {
                'line-color': '#00ffff',
                'line-width': 3
            }
        });
    }
}

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
            'fill-color': '#ff0000', // Default green color for shapes
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
            'line-color': '#00ffff', // Default orange color for tracks/paths
            'line-width': 3
        }
    });

    // // 5. Render ALL Points (Benches, trees, gates, lights)
    // map.addLayer({
    //     'id': 'osm-points',
    //     'type': 'circle',
    //     'source': 'park-data-source',
    //     'filter': ['==', ['geometry-type'], 'Point'], // Target raw point dots
    //     'paint': {
    //         'circle-radius': 6,
    //         'circle-color': '#0000ff', // Default blue dot for points
    //         'circle-stroke-width': 1,
    //         'circle-stroke-color': '#ffffff'
    //     }
    // });
});

map.on('styledata', loadGeoJSONData);
