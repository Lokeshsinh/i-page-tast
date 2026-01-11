require("dotenv").config()
const express  =  require("express");
const cors  =  require("cors");
const turf = require('@turf/turf'); // For area calculation on server-side
const proj4 = require('proj4'); 
const mongoose  =  require("mongoose")
const SitePolygon = require('./models/SitePolygon');
const serverless = require("serverless-http");

const app =  express()

app.use(express.json());
app.use(cors());

const PROT = 4000;
const MONGODB_URL =  process.env.MONGODB_URL

proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs');
app.get("/", (req,res) => {
    res.send("Hello World")
})


const calculateArea = (coordinates, fromCRS = 'EPSG:4326') => {
  try {
    // Convert coordinates to turf polygon
    const polygon = turf.polygon(coordinates);
    
    // Calculate area in square meters
    // Note: For EPSG:4326, turf calculates area on a sphere
    // For EPSG:3857, we would need to transform first
    return turf.area(polygon); // Returns area in square meters
  } catch (error) {
    console.error('Error calculating area:', error);
    return 0;
  }
};

// Helper function to transform coordinates between CRS
const transformCoordinates = (coordinates, fromCRS, toCRS) => {
  if (fromCRS === toCRS) return coordinates;
  
  const transformDeep = (coords) => {
    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
      // Nested array (Polygon)
      return coords.map(ring => transformDeep(ring));
    } else if (Array.isArray(coords[0])) {
      // Array of coordinates (LineString or ring)
      return coords.map(coord => proj4(proj4.defs(fromCRS), proj4.defs(toCRS), coord));
    } else {
      // Single coordinate
      return proj4(proj4.defs(fromCRS), proj4.defs(toCRS), coords);
    }
  };
  
  return transformDeep(coordinates);
};

// API Endpoint: Get features
app.get('/get-features', async (req, res) => {
  try {
    const { tenant_id, epoch_start, epoch_end, crs = 'EPSG:4326' } = req.query;
    
    if (!tenant_id || !epoch_start || !epoch_end) {
      return res.status(400).json({ 
        error: 'Missing required parameters: tenant_id, epoch_start, epoch_end' 
      });
    }

    // Parse dates
    const startDate = new Date(epoch_start);
    const endDate = new Date(epoch_end);
    
    // Query MongoDB
    const features = await SitePolygon.find({
      tenant_id,
      epoch_id: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ epoch_id: -1 });

    // Transform to GeoJSON FeatureCollection
    const geoJsonFeatures = features.map(feature => {
      let geometry = feature.geometry;
      let calculatedArea = feature.area_m2;
      
      // Transform coordinates if different CRS requested
      if (crs !== 'EPSG:4326') {
        const transformedCoords = transformCoordinates(
          geometry.coordinates,
          'EPSG:4326',
          crs
        );
        
        geometry = {
          type: geometry.type,
          coordinates: transformedCoords
        };
        
        // Recalculate area for transformed coordinates
        if (crs === 'EPSG:3857') {
          // EPSG:3857 uses meters, so we can calculate planar area
          calculatedArea = calculateArea(transformedCoords, crs);
        }
      }
      
      return {
        type: 'Feature',
        id: feature._id,
        properties: {
          feature_name: feature.feature_name,
          owner: feature.owner,
          epoch_id: feature.epoch_id,
          area_m2: calculatedArea.toFixed(2),
          original_area_m2: feature.area_m2.toFixed(2)
        },
        geometry
      };
    });

    const featureCollection = {
      type: 'FeatureCollection',
      features: geoJsonFeatures
    };

    res.json({featureCollection});
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API Endpoint: Create/Update feature with area calculation
app.post('/features', async (req, res) => {
  try {
    const { tenant_id, epoch_id, feature_name, owner, geometry, crs = 'EPSG:4326' } = req.body;
    
    // Validate geometry
    if (!geometry || geometry.type !== 'Polygon' || !geometry.coordinates) {
      return res.status(400).json({ error: 'Invalid geometry' });
    }

    // Calculate area based on CRS
    let area_m2 = 0;
    if (crs === 'EPSG:4326') {
      area_m2 = calculateArea(geometry.coordinates, crs);
    } else {
      // Convert to EPSG:4326 for consistent area calculation
      const wgs84Coords = transformCoordinates(geometry.coordinates, crs, 'EPSG:4326');
      area_m2 = calculateArea(wgs84Coords, 'EPSG:4326');
    }

    const feature = new SitePolygon({
      tenant_id,
      epoch_id: new Date(epoch_id),
      feature_name,
      owner,
      geometry: {
        type: 'Polygon',
        coordinates: geometry.coordinates
      },
      area_m2,
      crs
    });

    await feature.save();
    
    res.status(201).json({
      message: 'Feature created successfully',
      feature: {
        id: feature._id,
        area_m2: feature.area_m2
      }
    });
  } catch (error) {
    console.error('Error creating feature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Seed sample data endpoint
app.post('/seed-data', async (req, res) => {
  try {
    // Clear existing data
    await SitePolygon.deleteMany({});
    
    // Sample data for tenant_1
    const sampleFeatures = [
      {
        tenant_id: 'tenant_1',
        epoch_id: new Date('2024-01-01T10:00:00Z'),
        feature_name: 'Central Park',
        owner: 'City of New York',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-73.9819, 40.7681],
            [-73.9493, 40.7681],
            [-73.9493, 40.8006],
            [-73.9819, 40.8006],
            [-73.9819, 40.7681]
          ]]
        }
      },
      {
        tenant_id: 'tenant_1',
        epoch_id: new Date('2024-02-01T10:00:00Z'),
        feature_name: 'Battery Park',
        owner: 'NYC Parks Department',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-74.0166, 40.7030],
            [-74.0110, 40.7030],
            [-74.0110, 40.7075],
            [-74.0166, 40.7075],
            [-74.0166, 40.7030]
          ]]
        }
      },
      {
        tenant_id: 'tenant_2', // Different tenant
        epoch_id: new Date('2024-01-01T10:00:00Z'),
        feature_name: 'Golden Gate Park',
        owner: 'City of San Francisco',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-122.5117, 37.7683],
            [-122.4558, 37.7683],
            [-122.4558, 37.7702],
            [-122.5117, 37.7702],
            [-122.5117, 37.7683]
          ]]
        }
      }
    ];

    // Calculate areas and save
    for (const featureData of sampleFeatures) {
      const area_m2 = calculateArea(featureData.geometry.coordinates);
      const feature = new SitePolygon({
        ...featureData,
        area_m2
      });
      await feature.save();
    }

    res.json({ 
      message: 'Sample data seeded successfully',
      count: sampleFeatures.length
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.get('/search-feature', async (req, res) => {
//   try {
//     const { tenant_id, feature_name } = req.query;
//     if (!tenant_id || !feature_name) return res.status(400).json({ error: 'Missing parameters' });

//     const feature = await SitePolygon.findOne({ tenant_id, feature_name });
//     if (!feature) return res.status(404).json({ error: 'Feature not found' });

//     res.json({
//       type: 'Feature',
//       id: feature._id,
//       geometry: feature.geometry,
//       properties: {
//         feature_name: feature.feature_name,
//         owner: feature.owner,
//         epoch_id: feature.epoch_id,
//         area_m2: feature.area_m2
//       }
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });


// Geospatial query example: Find features within a bounding box
// app.get('/features-within-bbox', async (req, res) => {
//   try {
//     const { tenant_id, minLon, minLat, maxLon, maxLat } = req.query;
    
//     const query = {
//       tenant_id,
//       geometry: {
//         $geoWithin: {
//           $geometry: {
//             type: 'Polygon',
//             coordinates: [[
//               [parseFloat(minLon), parseFloat(minLat)],
//               [parseFloat(maxLon), parseFloat(minLat)],
//               [parseFloat(maxLon), parseFloat(maxLat)],
//               [parseFloat(minLon), parseFloat(maxLat)],
//               [parseFloat(minLon), parseFloat(minLat)]
//             ]]
//           }
//         }
//       }
//     };

//     const features = await SitePolygon.find(query);
//     res.json(features);
//   } catch (error) {
//     console.error('Error querying features:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

app.get('/features-within-bbox', async (req, res) => {
  try {
    console.log('QUERY:', req.query);

    const { tenant_id, minLon, minLat, maxLon, maxLat } = req.query;

    if (!tenant_id || !minLon || !minLat || !maxLon || !maxLat) {
      return res.status(400).json({
        error: 'Missing required parameters'
      });
    }

    const minLonN = Number(minLon);
    const minLatN = Number(minLat);
    const maxLonN = Number(maxLon);
    const maxLatN = Number(maxLat);

    if (
      isNaN(minLonN) ||
      isNaN(minLatN) ||
      isNaN(maxLonN) ||
      isNaN(maxLatN)
    ) {
      return res.status(400).json({
        error: 'Invalid coordinate values'
      });
    }

    const bboxPolygon = {
      type: 'Polygon',
      coordinates: [[
        [minLonN, minLatN],
        [maxLonN, minLatN],
        [maxLonN, maxLatN],
        [minLonN, maxLatN],
        [minLonN, minLatN]
      ]]
    };

    const features = await SitePolygon.find({
      tenant_id,
      geometry: {
        $geoWithin: {
          $geometry: bboxPolygon
        }
      }
    });

    res.json(features);

  } catch (error) {
    console.error('MongoDB Geo Error:', error.message);
    res.status(500).json({
      error: error.message
    });
  }
});


app.listen(PROT, () => {
    console.log("Server running From http://localhost:4000")
    mongoose.connect(MONGODB_URL).then(() =>{
        console.log("Mongoose Connected")
    }).catch(() => {
        console.log("Mongoose disconnected")
    })
})

module.exports.handler = serverless(app);