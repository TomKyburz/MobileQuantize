import osmium
import json

# ==========================================================
# DEFINE YOUR BOUNDING BOX HERE (Min Lon, Min Lat, Max Lon, Max Lat)
# Example: Central London
# =============================================
BBOX = [-5.963173,54.572858,-5.782242,54.635697]

def is_in_bbox(lon, lat):
    return BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]

class CyberpunkGeoJsonWriter(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.geojson_data = {"type": "FeatureCollection", "features": []}
        self.geometry_factory = osmium.geom.GeoJSONFactory()

    def way(self, w):
        tags = w.tags
        properties = {}
        matched = False

        # 1. Quick Bounding Box Check on the first node of the street/building
        try:
            first_node_loc = w.nodes[0].location
            if not is_in_bbox(first_node_loc.lon, first_node_loc.lat):
                return # Skip completely if it starts outside our bounds
        except Exception:
            return # Skip if locations are missing

        # 2. Tag Filters (Vehicular, Rail, & Pedestrian Networks)
        if 'highway' in tags:
            hw = tags['highway']
            if hw in ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'service', 'footway', 'pedestrian', 'path', 'living_street', 'steps', 'track', 'cycleway']:
                properties = {"type": "path", "class": hw, "name": tags.get('name', '')}
                matched = True
        elif 'railway' in tags:
            rw = tags['railway']
            if rw in ['rail', 'tram', 'subway']:
                properties = {"type": "railway", "class": rw, "name": tags.get('name', '')}
                matched = True

        # 3. Tag Filters (Buildings & Car Parks)
        elif 'building' in tags:
            properties = {"type": "building", "class": tags['building'], "name": tags.get('name', '')}
            matched = True
        elif tags.get('amenity') == 'parking':
            properties = {"type": "parking", "name": tags.get('name', '')}
            matched = True

        # 4. Tag Filters (Parks, Pitches, and Green Zones)
        elif tags.get('leisure') in ['park', 'recreation_ground', 'playground', 'pitch', 'track'] or tags.get('landuse') in ['grass', 'cemetery']:
            park_class = tags.get('leisure') or tags.get('landuse')
            properties = {"type": "park_zone", "class": park_class, "name": tags.get('name', '')}
            matched = True
        elif tags.get('natural') == 'water':
            properties = {"type": "water", "name": tags.get('name', '')}
            matched = True

        # 5. Build Geometry if matched
        if matched:
            try:
                geojson_geom_str = self.geometry_factory.create_linestring(w)
                geometry_obj = json.loads(geojson_geom_str)

                if properties["type"] in ["building", "park_zone", "parking", "water"] and w.is_closed():
                    geometry_obj["type"] = "Polygon"
                    geometry_obj["coordinates"] = [geometry_obj["coordinates"]]

                feature = {
                    "type": "Feature",
                    "geometry": geometry_obj,
                    "properties": properties
                }
                self.geojson_data["features"].append(feature)
            except Exception:
                pass

    def save_to_file(self, output_filename):
        print(f"Writing {len(self.geojson_data['features'])} bounded features...")
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(self.geojson_data, f, ensure_ascii=False, indent=2)
        print("Done!")

if __name__ == '__main__':
    input_pbf = "ireland-and-northern-ireland-260920.osm.pbf"
    output_geojson = "cyberpunk_bounded_map.geojson"

    handler = CyberpunkGeoJsonWriter()
    print("Parsing file and cropping to bounding box locally...")
    handler.apply_file(input_pbf, locations=True, idx='flex_mem')
    handler.save_to_file(output_geojson)
