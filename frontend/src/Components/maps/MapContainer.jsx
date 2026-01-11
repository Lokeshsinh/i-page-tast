import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapContainer.css';

const MapContainer = forwardRef(function MapContainer({
  epochA,
  epochB,
  featuresA,
  featuresB,
  onFeatureClick,
  selectedFeature,
}, ref) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popup = useRef(null);
  const marker = useRef(null);
  const [coordinates, setCoordinates] = useState({ lat: 40.7128, lng: -74.006 });

  // Expose flyToFeature method to parent
  useImperativeHandle(ref, () => ({
    flyToFeature: (feature) => {
      if (!map.current || !feature?.geometry?.coordinates) return;
      
      const coords = feature.geometry.coordinates[0];
      const center = coords.reduce(
        (acc, coord) => [acc[0] + coord[0] / coords.length, acc[1] + coord[1] / coords.length],
        [0, 0]
      );

      // Remove existing marker
      if (marker.current) {
        marker.current.remove();
      }

      // Fly to the feature
      map.current.flyTo({
        center: center,
        zoom: 14,
        duration: 1500
      });

      // Add a marker to highlight the searched feature
      marker.current = new maplibregl.Marker({ color: '#22c55e' })
        .setLngLat(center)
        .addTo(map.current);
    },
    getMap: () => map.current
  }));

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          },
        },
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: [-74.006, 40.7128],
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    // Track mouse position
    map.current.on('mousemove', (e) => {
      setCoordinates({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    // Add sources for epochs when map loads
    map.current.on('load', () => {
      if (!map.current) return;

      // Add empty sources
      map.current.addSource('epoch-a', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current.addSource('epoch-b', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Epoch A layers
      map.current.addLayer({
        id: 'epoch-a-fill',
        type: 'fill',
        source: 'epoch-a',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.3,
        },
      });

      map.current.addLayer({
        id: 'epoch-a-line',
        type: 'line',
        source: 'epoch-a',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
        },
      });

      // Epoch B layers
      map.current.addLayer({
        id: 'epoch-b-fill',
        type: 'fill',
        source: 'epoch-b',
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': 0.3,
        },
      });

      map.current.addLayer({
        id: 'epoch-b-line',
        type: 'line',
        source: 'epoch-b',
        paint: {
          'line-color': '#ef4444',
          'line-width': 2,
        },
      });

      // Click handlers
      const handleClick = (e, epoch) => {
        const layerId = epoch === 'A' ? 'epoch-a-fill' : 'epoch-b-fill';
        const features = map.current?.queryRenderedFeatures(e.point, { layers: [layerId] });
        
        if (features && features.length > 0) {
          const feature = features[0];
          onFeatureClick({
            ...feature,
            epoch,
            properties: feature.properties,
            geometry: feature.geometry,
          });
        }
      };

      map.current.on('click', 'epoch-a-fill', (e) => handleClick(e, 'A'));
      map.current.on('click', 'epoch-b-fill', (e) => handleClick(e, 'B'));

      // Cursor change on hover
      ['epoch-a-fill', 'epoch-b-fill'].forEach((layer) => {
        map.current?.on('mouseenter', layer, () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current?.on('mouseleave', layer, () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update Epoch A data
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;

    const source = map.current.getSource('epoch-a');
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: featuresA,
      });
    }
  }, [featuresA]);

  // Update Epoch B data
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;

    const source = map.current.getSource('epoch-b');
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: featuresB,
      });
    }
  }, [featuresB]);

  // Toggle Epoch A visibility
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;

    const visibility = epochA.active ? 'visible' : 'none';
    map.current.setLayoutProperty('epoch-a-fill', 'visibility', visibility);
    map.current.setLayoutProperty('epoch-a-line', 'visibility', visibility);
  }, [epochA.active]);

  // Toggle Epoch B visibility
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;

    const visibility = epochB.active ? 'visible' : 'none';
    map.current.setLayoutProperty('epoch-b-fill', 'visibility', visibility);
    map.current.setLayoutProperty('epoch-b-line', 'visibility', visibility);
  }, [epochB.active]);

  // Show popup for selected feature
  useEffect(() => {
    if (popup.current) {
      popup.current.remove();
      popup.current = null;
    }

    if (!map.current || !selectedFeature) return;

    const coords = selectedFeature.geometry.coordinates[0];
    const center = coords.reduce(
      (acc, coord) => [acc[0] + coord[0] / coords.length, acc[1] + coord[1] / coords.length],
      [0, 0]
    );

    popup.current = new maplibregl.Popup({ closeOnClick: false, className: 'feature-popup' })
      .setLngLat(center)
      .setHTML(`
        <div class="popup-content">
          <h3 class="popup-title">${selectedFeature.properties.feature_name || 'Unnamed Feature'}</h3>
          <div class="popup-details">
            <p><span class="popup-label">Owner:</span> ${selectedFeature.properties.owner || 'N/A'}</p>
            <p><span class="popup-label">Area:</span> ${Number(selectedFeature.properties.area_m2 || 0).toLocaleString()} m²</p>
            <p><span class="popup-label">Epoch:</span> <span class="${selectedFeature.epoch === 'A' ? 'epoch-a-text' : 'epoch-b-text'}">${selectedFeature.epoch}</span></p>
          </div>
        </div>
      `)
      .addTo(map.current);
  }, [selectedFeature]);

  return (
    <div className="map-container-wrapper">
      <div ref={mapContainer} className="map-canvas" />
      
      {/* Coordinates display */}
      <div className="coordinates-display">
        <p className="coordinates-text">
          <span className="coord-label">Lat:</span> {coordinates.lat.toFixed(5)}{' '}
          <span className="coord-label">Lng:</span> {coordinates.lng.toFixed(5)}
        </p>
      </div>
    </div>
  );
});

export default MapContainer;
