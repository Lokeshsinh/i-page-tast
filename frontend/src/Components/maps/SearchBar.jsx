import { useState } from 'react';
import { Search, X } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({ onSearch, searchResults, onSelectResult, onClear }) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      onSearch(query);
      setShowResults(true);
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    if (!e.target.value) {
      setShowResults(false);
      onClear();
    }
  };

  const handleSelectResult = (feature) => {
    onSelectResult(feature);
    setShowResults(false);
  };

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
    onClear();
  };

  return (
    <div className="search-container">
      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search features by name (e.g., Tata Company)..."
          value={query}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
        />
        {query && (
          <button className="clear-button" onClick={handleClear}>
            <X size={14} />
          </button>
        )}
        <span className="search-hint">Press Enter</span>
      </div>

      {showResults && searchResults && searchResults.length > 0 && (
        <div className="search-results">
          <div className="results-header">
            <span>Found {searchResults.length} feature(s)</span>
          </div>
          <div className="results-list">
            {searchResults.map((feature, index) => (
              <button
                key={feature.id || index}
                className="result-item"
                onClick={() => handleSelectResult(feature)}
              >
                <div className="result-name">
                  {feature.properties?.feature_name || 'Unnamed Feature'}
                </div>
                <div className="result-details">
                  <span>Owner: {feature.properties?.owner || 'N/A'}</span>
                  <span>Area: {Number(feature.properties?.area_m2 || 0).toLocaleString()} m²</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showResults && searchResults && searchResults.length === 0 && query && (
        <div className="search-results">
          <div className="no-results">
            No features found matching "{query}"
          </div>
        </div>
      )}
    </div>
  );
}