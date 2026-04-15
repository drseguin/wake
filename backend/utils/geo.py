"""
Spatial helpers — convert between (lat, lng) tuples and PostGIS Geography.

@fileoverview Centralises the lat/lng <-> WKT conversions so blueprint
code stays readable. Uses GeoAlchemy2's WKTElement for inserts and
shapely's to_shape for reads.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

from geoalchemy2 import WKTElement
from geoalchemy2.shape import to_shape


def point_wkt(lat: float, lng: float) -> WKTElement:
    """Build a SRID 4326 POINT WKTElement suitable for assigning to a
    Geography column. Note: WKT order is (lng, lat)."""
    return WKTElement(f'POINT({lng} {lat})', srid=4326)


def point_to_latlng(geog) -> tuple[float, float] | None:
    """Convert a Geography column value (WKBElement) to (lat, lng)."""
    if geog is None:
        return None
    pt = to_shape(geog)
    return (pt.y, pt.x)


def valid_latlng(lat, lng) -> bool:
    """Return True when lat/lng look like sensible numbers."""
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except (TypeError, ValueError):
        return False
    return -90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0
