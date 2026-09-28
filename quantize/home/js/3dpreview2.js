import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.10.0/dist/maplibre-gl.mjs';

const map = new maplibregl.Map({
    container: 'map',
    zoom: 12,
    center: [11.39085, 47.27574],
    pitch: 70,
    maxPitch: 95
});

map.setStyle('https://tiles.openfreemap.org/styles/bright', {
        transformStyle: (previousStyle, nextStyle) => {
            nextStyle.projection = {type: 'globe'};
            nextStyle.sources = {
                ...nextStyle.sources,
                /*
                satelliteSource: {
                    type: 'raster',
                    tiles: [
                        'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'
                    ],
                    tileSize: 256
                },
                */
                // Placeholder Image Source: Replace 'your-image-filename.png' and coordinates with your own
                myCustomImageSource: {
                    type: 'image',
                    url: '../img/flashmap.jpg',
                    coordinates: [
                        [11.370, 47.290], // Northwest corner [lng, lat]
                        [11.410, 47.290], // Northeast corner [lng, lat]
                        [11.410, 47.260], // Southeast corner [lng, lat]
                        [11.370, 47.260]  // Southwest corner [lng, lat]
                    ]
                },
                terrainSource: {
                    type: 'raster-dem',
                    url: 'https://tiles.mapterhorn.com/tilejson.json'
                },
                hillshadeSource: {
                    type: 'raster-dem',
                    url: 'https://tiles.mapterhorn.com/tilejson.json'
                }
            }
            nextStyle.terrain = {
                source: 'terrainSource',
                exaggeration: 1
            }

            nextStyle.sky = {
                'atmosphere-blend': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 1,
                    2, 0
                ],
            }

            nextStyle.layers.push({
                id: 'hills',
                type: 'hillshade',
                source: 'hillshadeSource',
                layout: { visibility: 'visible' },
                paint: { 'hillshade-shadow-color': '#473B24' }
            })

            const firstNonFillLayer = nextStyle.layers.find(layer => layer.type !== 'fill' && layer.type !== 'background');

            /*
            nextStyle.layers.splice(nextStyle.layers.indexOf(firstNonFillLayer), 0, {
                id: 'satellite',
                type: 'raster',
                source: 'satelliteSource',
                layout: { visibility: 'visible' },
                paint: { 'raster-opacity': 1 }
            });
            */

            // Render the placeholder custom image layer into the map stack
            nextStyle.layers.splice(nextStyle.layers.indexOf(firstNonFillLayer), 0, {
                id: 'custom-image-layer',
                type: 'raster',
                source: 'myCustomImageSource',
                layout: { visibility: 'visible' },
                paint: { 'raster-opacity': 1 }
            });

            return nextStyle;
        }
    })

// map.addControl(
//     new maplibregl.NavigationControl({
//         visualizePitch: true,
//         showZoom: true,
//         showCompass: true
//     })
// );
//
//
// map.addControl(
//     new maplibregl.GlobeControl()
// );
//
// map.addControl(
//     new maplibregl.TerrainControl({
//         source: 'terrainSource',
//         exaggeration: 1
//     })
// );
