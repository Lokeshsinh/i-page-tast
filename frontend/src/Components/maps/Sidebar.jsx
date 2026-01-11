import { useState } from 'react';
import { 
  Layers, 
  MapPin, 
  Database, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  User,
  Maximize2,
  Plus,
  RefreshCw
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({
  epochA,
  epochB,
  onToggleEpochA,
  onToggleEpochB,
  selectedFeature,
  statsA,
  statsB,
  onSeedData,
  onReloadData,
  onCreateFeature,
  loading,
  tenantId,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('layers');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFeature, setNewFeature] = useState({
    feature_name: '',
    owner: '',
    epoch_id: new Date().toISOString().slice(0, 16),
    coordinates: '-74.006, 40.7128, -74.004, 40.7128, -74.004, 40.7148, -74.006, 40.7148'
  });

  const tabs = [
    { id: 'layers', label: 'Layers', icon: Layers },
    { id: 'details', label: 'Details', icon: MapPin },
    { id: 'api', label: 'Data', icon: Database },
  ];

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    
    // Parse coordinates string to array
    const coordsArray = newFeature.coordinates.split(',').map(c => parseFloat(c.trim()));
    const coordinates = [];
    for (let i = 0; i < coordsArray.length; i += 2) {
      coordinates.push([coordsArray[i], coordsArray[i + 1]]);
    }
    // Close the polygon
    coordinates.push(coordinates[0]);
    

    const featureData = {
      tenant_id: tenantId,
      epoch_id: new Date(newFeature.epoch_id).toISOString(),
      feature_name: newFeature.feature_name,
      owner: newFeature.owner,
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      },
      crs: 'EPSG:4326'
    };

    onCreateFeature(featureData);
    setShowCreateForm(false);
    setNewFeature({
      feature_name: '',
      owner: '',
      epoch_id: new Date().toISOString().slice(0, 16),
      coordinates: '-74.006, 40.7128, -74.004, 40.7128, -74.004, 40.7148, -74.006, 40.7148'
    });
  };
  

  return (
    <>
      {isOpen && (
        <aside className="sidebar">
          {/* Header */}
          <div className="sidebar-header">
            <h1 className="sidebar-title">Site Manager</h1>
            <p className="sidebar-tenant">Tenant: {tenantId}</p>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'layers' && (
              <div className="layers-content">
                {/* Epoch A */}
                <div className="epoch-card epoch-a">
                  <div className="epoch-header">
                    <div className="epoch-info">
                      <div className="epoch-indicator epoch-a-indicator" />
                      <span className="epoch-name">Epoch A</span>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={epochA.active} 
                        onChange={onToggleEpochA} 
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="epoch-details">
                    <p className="feature-count">{statsA} features</p>
                    <div className="date-range">
                      <Calendar size={12} />
                      <span>{epochA.startDate.split('T')[0]} — {epochA.endDate.split('T')[0]}</span>
                    </div>
                  </div>
                </div>

                {/* Epoch B */}
                <div className="epoch-card epoch-b">
                  <div className="epoch-header">
                    <div className="epoch-info">
                      <div className="epoch-indicator epoch-b-indicator" />
                      <span className="epoch-name">Epoch B</span>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={epochB.active} 
                        onChange={onToggleEpochB} 
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="epoch-details">
                    <p className="feature-count">{statsB} features</p>
                    <div className="date-range">
                      <Calendar size={12} />
                      <span>{epochB.startDate.split('T')[0]} — {epochB.endDate.split('T')[0]}</span>
                    </div>
                  </div>
                </div>

                <div className="separator" />

                {/* Legend */}
                <div className="legend">
                  <h3 className="legend-title">Legend</h3>
                  <div className="legend-item">
                    <div className="legend-color epoch-a-color" />
                    <span>January 2024 Sites</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color epoch-b-color" />
                    <span>February 2024 Sites</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="details-content">
                {selectedFeature ? (
                  <div className="feature-details">
                    <div className="feature-card">
                      <h3 className="feature-title">
                        {selectedFeature.properties.feature_name || 'Unnamed Feature'}
                      </h3>
                      
                      <div className="feature-info">
                        <div className="info-row">
                          <User size={16} className="info-icon" />
                          <span className="info-label">Owner:</span>
                          <span className="info-value">{selectedFeature.properties.owner || 'N/A'}</span>
                        </div>
                        
                        <div className="info-row">
                          <Maximize2 size={16} className="info-icon" />
                          <span className="info-label">Area:</span>
                          <span className="info-value mono">
                            {Number(selectedFeature.properties.area_m2 || 0).toLocaleString()} m²
                          </span>
                        </div>
                        
                        <div className="info-row">
                          <Calendar size={16} className="info-icon" />
                          <span className="info-label">Epoch:</span>
                          <span className={`info-value ${selectedFeature.epoch === 'A' ? 'epoch-a-text' : 'epoch-b-text'}`}>
                            {selectedFeature.epoch}
                          </span>
                        </div>

                        {selectedFeature.properties.epoch_id && (
                          <div className="info-row">
                            <Calendar size={16} className="info-icon" />
                            <span className="info-label">Date:</span>
                            <span className="info-value">
                              {new Date(selectedFeature.properties.epoch_id).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {selectedFeature.id && (
                      <p className="feature-id">ID: {selectedFeature.id}</p>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <MapPin size={48} className="empty-icon" />
                    <p>Click on a feature to view details</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'api' && (
              <div className="api-content">
                <button
                  className="api-button"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  <Plus size={16} />
                  {showCreateForm ? 'Cancel' : 'Create New Feature'}
                </button>

                {showCreateForm && (
                  <form className="create-form" onSubmit={handleCreateSubmit}>
                    <div className="form-group">
                      <label>Feature Name</label>
                      <input
                        type="text"
                        value={newFeature.feature_name}
                        onChange={(e) => setNewFeature({...newFeature, feature_name: e.target.value})}
                        placeholder="e.g., Tata Company"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Owner</label>
                      <input
                        type="text"
                        value={newFeature.owner}
                        onChange={(e) => setNewFeature({...newFeature, owner: e.target.value})}
                        placeholder="e.g., Tata Group"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Epoch Date</label>
                      <input
                        type="datetime-local"
                        value={newFeature.epoch_id}
                        onChange={(e) => setNewFeature({...newFeature, epoch_id: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Coordinates (lng,lat pairs)</label>
                      <textarea
                        value={newFeature.coordinates}
                        onChange={(e) => setNewFeature({...newFeature, coordinates: e.target.value})}
                        placeholder="lng1,lat1, lng2,lat2, lng3,lat3, lng4,lat4"
                        rows={3}
                        required
                      />
                      <small>Enter at least 4 coordinate pairs (polygon vertices)</small>
                    </div>
                    <button type="submit" className="submit-button" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Feature'}
                    </button>
                  </form>
                )}

                <button
                  className="api-button"
                  onClick={onSeedData}
                  disabled={loading}
                >
                  <Database size={16} />
                  {loading ? 'Seeding...' : 'Seed Sample Data'}
                </button>

                <button
                  className="api-button"
                  onClick={onReloadData}
                  disabled={loading}
                >
                  <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                  {loading ? 'Loading...' : 'Reload All Data'}
                </button>

                <div className="separator" />

                <div className="debug-info">
                  <h4>Debug Info</h4>
                  <div className="debug-stats">
                    <p>Epoch A: {statsA} features</p>
                    <p>Epoch B: {statsB} features</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sidebar-footer">
            <div className="status-indicator">
              <div className={`status-dot ${loading ? 'loading' : 'connected'}`} />
              <span>{loading ? 'Loading data...' : 'Data loaded'}</span>
            </div>
          </div>
        </aside>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`toggle-button ${isOpen ? 'open' : 'closed'}`}
      >
        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>
    </>
  );
}
