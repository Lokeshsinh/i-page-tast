import { useState, useEffect, useCallback, useRef } from 'react';
import MapContainer from './MapContainer';
import Sidebar from './Sidebar';
import SearchBar from './SearchBar';
import { toast } from 'sonner';
import './MapInterface.css';

const API_BASE_URL = 'http://localhost:4000';
const TENANT_ID = 'tenant_1';

const EPOCH_A_CONFIG = {
  id: 'epoch-a',
  name: 'Epoch A',
  color: '#3b82f6',
  fillColor: 'rgba(59, 130, 246, 0.3)',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-01-31T23:59:59Z',
  active: true,
};

const EPOCH_B_CONFIG = {
  id: 'epoch-b',
  name: 'Epoch B',
  color: '#ef4444',
  fillColor: 'rgba(239, 68, 68, 0.3)',
  startDate: '2024-02-01T00:00:00Z',
  endDate: '2024-02-28T23:59:59Z',
  active: true,
};

export default function MapInterface() {
  const mapRef = useRef(null);
  const [epochA, setEpochA] = useState(EPOCH_A_CONFIG);
  const [epochB, setEpochB] = useState(EPOCH_B_CONFIG);
  const [featuresA, setFeaturesA] = useState([]);
  const [featuresB, setFeaturesB] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Load features from API
  const loadEpochData = useCallback(async (epoch) => {
    const config = epoch === 'a' ? epochA : epochB;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/get-features?tenant_id=${TENANT_ID}&epoch_start=${config.startDate}&epoch_end=${config.endDate}&crs=EPSG:4326`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      const features = result.featureCollection?.features || [];
      
      if (epoch === 'a') {
        setFeaturesA(features);
      } else {
        setFeaturesB(features);
      }
      
      return features.length;
    } catch (error) {
      console.error(`Error loading Epoch ${epoch.toUpperCase()} data:`, error);
      return 0;
    }
  }, [epochA, epochB]);

  // Load all data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [countA, countB] = await Promise.all([
        loadEpochData('a'),
        loadEpochData('b'),
      ]);
      toast.success(`Loaded ${countA + countB} features from API`);
    } catch (error) {
      toast.error('Failed to load data from API');
    } finally {
      setLoading(false);
    }
  }, [loadEpochData]);

  // Seed sample data
  const seedData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/seed-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Seed failed');
      
      const result = await response.json();
      toast.success(result.message || 'Sample data seeded successfully');
      
      // Reload data after seeding
      setTimeout(loadAllData, 500);
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed data - make sure backend is running');
    } finally {
      setLoading(false);
    }
  };

  // Create new feature
  const createFeature = async (featureData) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(featureData),
      });
      
      if (!response.ok) throw new Error('Create failed');
      
      const result = await response.json();
      toast.success(result.message || 'Feature created successfully');
      
      // Reload data to show new feature
      setTimeout(loadAllData, 500);
    } catch (error) {
      console.error('Error creating feature:', error);
      toast.error('Failed to create feature - check backend connection');
    } finally {
      setLoading(false);
    }
  };

  // Search features by name
  const handleSearch = (query) => {
    const allFeatures = [
      ...featuresA.map(f => ({ ...f, epoch: 'A' })),
      ...featuresB.map(f => ({ ...f, epoch: 'B' }))
    ];
    
    const filtered = allFeatures.filter((f) =>
      f.properties?.feature_name?.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchResults(filtered);
    
    if (filtered.length > 0) {
      toast.info(`Found ${filtered.length} feature(s) matching "${query}"`);
    } else {
      toast.warning(`No features found matching "${query}"`);
    }
  };

  // Handle selecting a search result
  const handleSelectResult = (feature) => {
    setSelectedFeature(feature);
    
    // Fly to the feature on the map
    if (mapRef.current) {
      mapRef.current.flyToFeature(feature);
    }
    
    toast.success(`Zoomed to "${feature.properties?.feature_name}"`);
  };

  // Clear search results
  const handleClearSearch = () => {
    setSearchResults([]);
  };

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <div className="map-wrapper">
      <MapContainer
        ref={mapRef}
        epochA={epochA}
        epochB={epochB}
        featuresA={featuresA}
        featuresB={featuresB}
        onFeatureClick={setSelectedFeature}
        selectedFeature={selectedFeature}
      />
      
      <Sidebar
        epochA={epochA}
        epochB={epochB}
        onToggleEpochA={() => setEpochA((prev) => ({ ...prev, active: !prev.active }))}
        onToggleEpochB={() => setEpochB((prev) => ({ ...prev, active: !prev.active }))}
        selectedFeature={selectedFeature}
        statsA={featuresA.length}
        statsB={featuresB.length}
        onSeedData={seedData}
        onReloadData={loadAllData}
        onCreateFeature={createFeature}
        loading={loading}
        tenantId={TENANT_ID}
      />
      
      <SearchBar 
        onSearch={handleSearch} 
        searchResults={searchResults}
        onSelectResult={handleSelectResult}
        onClear={handleClearSearch}
      />
    </div>
  );
}
