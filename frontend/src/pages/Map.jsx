/**
 * Map page — full-bleed marine dashboard.
 *
 * @fileoverview The default landing page after login. Wraps MapView in a
 * full-height container that breaks out of the standard page padding.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import React from 'react';
import MapView from '../components/MapView';

function MapPage() {
  return (
    <div className="map-page">
      <MapView />
    </div>
  );
}

export default MapPage;
