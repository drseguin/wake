/**
 * mapIcons — Leaflet divIcon factories for waypoints + crew boats.
 *
 * @fileoverview Centralises the inline-SVG markup used by Leaflet markers
 * so MapView, WaypointDialog and CrewDetail all show the same iconography.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import L from 'leaflet';

const ICON_PATHS = {
  anchor:
    '<path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480h80q0 116 75.5 207.5T440-163v-377h-80v-80h80v-58q-18-12-29-29t-11-43q0-33 23.5-56.5T480-840q33 0 56.5 23.5T560-760q0 26-11 43t-29 29v58h80v80h-80v377q129-18 204.5-109.5T800-480h80q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-640q17 0 28.5-11.5T520-760q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760q0 17 11.5 28.5T480-720Z"/>',
  fuel:
    '<path d="M120-120v-680q0-33 23.5-56.5T200-880h320q33 0 56.5 23.5T600-800v360h60q33 0 56.5 23.5T740-360v200q0 17 11.5 28.5T780-120q17 0 28.5-11.5T820-160v-360h-40q-17 0-28.5-11.5T740-560v-120l-30-30q-6-6-8-13t-2-15q0-8 2-15t8-13l18-18q6-6 13.5-9t15.5-3q8 0 15.5 3t13.5 9l112 112q6 6 9 13.5t3 15.5v453q0 50-35 85t-85 35q-50 0-85-35t-35-85v-200h-60v320H120Zm80-440h320v-240H200v240Zm0 360h320v-280H200v280Zm0 0v-280 280Z"/>',
  fishing:
    '<path d="M480-160q-117 0-198.5-81.5T200-440h80q0 83 58.5 141.5T480-240q83 0 141.5-58.5T680-440h80q0 117-81.5 198.5T480-160Zm0-200q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-80q17 0 28.5-11.5T520-480q0-17-11.5-28.5T480-520q-17 0-28.5 11.5T440-480q0 17 11.5 28.5T480-440Z"/>',
  hazard:
    '<path d="M109-120q-11 0-20-5.5T75-140q-5-9-5.5-19.5T75-180l370-640q6-10 15.5-15t19.5-5q10 0 19.5 5t15.5 15l370 640q6 10 5.5 20.5T885-140q-5 9-14 14.5t-20 5.5H109Zm69-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm-40-120h80v-200h-80v200Z"/>',
  marina:
    '<path d="M480-80q-104 0-189-50T160-265l-80 25v-90l40-12v-298l-40 12v-90l400-122v-80h-40q-17 0-28.5-11.5T400-960q0-17 11.5-28.5T440-1000h80q17 0 28.5 11.5T560-960q0 17-11.5 28.5T520-920h-40v80l400 122v90l-40-12v298l40 12v90l-80-25q-46 85-131 135T480-80Zm0-80q70 0 132-30t110-83l-242-65-242 65q48 53 110 83t132 30Zm-280-93 280-79 280 79v-256l-280-86-280 86v256Z"/>',
  other:
    '<path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Z"/>',
  boat:
    '<path d="M180-80q-37 0-67.5-22T70-160h820q-12 36-42.5 58T780-80H180Zm0-100q-26 0-49.5-7.5T80-220l130-462q4-15 16.5-26.5T256-720h448q17 0 29.5 11.5T750-682l130 462q-27 25-50.5 32.5T780-180H180Zm103-80h394q21 0 32-15t6-35l-22-90H267l-22 90q-5 20 6 35t32 15Zm-19-220h432l-22-80H286l-22 80Zm45-160h342l-23-80H332l-23 80Z"/>',
};

const ICON_COLORS = {
  anchor:  '#1976d2',
  fuel:    '#e65100',
  fishing: '#388e3c',
  hazard:  '#d32f2f',
  marina:  '#7b1fa2',
  other:   '#455a64',
  boat:    '#0288d1',
};

/**
 * Build a Leaflet divIcon for the given waypoint icon kind.
 *
 * @param {keyof typeof ICON_PATHS} kind
 * @returns {L.DivIcon}
 */
export function waypointDivIcon(kind = 'other') {
  const k = ICON_PATHS[kind] ? kind : 'other';
  const color = ICON_COLORS[k];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="18" height="18" fill="white">
      ${ICON_PATHS[k]}
    </svg>`;
  return L.divIcon({
    className: 'wake-waypoint-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<span class="wake-waypoint-pin" style="background:${color}">${svg}</span>`,
  });
}

/**
 * Build a Leaflet divIcon for a crew member's boat marker.
 * @param {string} display — boat or display name shown beside the pin
 * @param {number|null} headingDeg — rotation in degrees, north = 0
 */
export function crewBoatDivIcon(display, headingDeg = null) {
  const color = ICON_COLORS.boat;
  const rotate = Number.isFinite(headingDeg) ? `transform:rotate(${headingDeg}deg);` : '';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="18" height="18" fill="white" style="${rotate}">
      ${ICON_PATHS.boat}
    </svg>`;
  return L.divIcon({
    className: 'wake-crew-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `
      <span class="wake-crew-pin" style="background:${color}">${svg}</span>
      <span class="wake-crew-label">${escapeHtml(display)}</span>
    `,
  });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const ICON_KINDS = ['anchor', 'fuel', 'fishing', 'hazard', 'marina', 'other'];
