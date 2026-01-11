// models/SitePolygon.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const PolygonSchema = new Schema({
  tenant_id: {
    type: String,
    required: true,
    index: true
  },
  epoch_id: {
    type: Date,
    required: true,
    index: true
  },
  feature_name: String,
  owner: String,
  geometry: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of [longitude, latitude]
      required: true
    }
  },
  area_m2: { // Pre-calculated area for efficiency
    type: Number,
    default: 0
  },
  crs: {
    type: String,
    default: 'EPSG:4326'
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
PolygonSchema.index({ geometry: '2dsphere' });
PolygonSchema.index({ tenant_id: 1, epoch_id: 1 });

module.exports = mongoose.model('SitePolygon', PolygonSchema);