# Changelog - The Cosmic Weaver

## [2026-04-16]
### Added
- **Multiplayer Disconnect**: Added a "Thoát Phòng" button in the multiplayer sidebar. Players can now leave a room and return to the join/create state without refreshing.
- **Server Side Room Exit**: Implemented `LEAVE_ROOM` event on the server to handle intentional exits, properly updating host status and room occupancy.

### Fixed
- **UI Synchronization**: Resolved critical functional bugs where the Adjacency Matrix and Adjacency List failed to update in real-time during the "Repair Phase" (PHASE_FIXING).
- **Hard Mode Real-time State**: The "Đường 1 Chiều" checkbox now triggers an immediate map regeneration in local mode.
- **CSS Responsiveness**: Adjusted the `.matrix-table` to ensure it fits properly in the sidebar and remains readable on different screen sizes.
- **Custom Alert System**: Overrode the browser's default `alert()` with a premium, non-blocking UI overlay for better aesthetic and UX.

### Improved
- **Repair Phase Feedback**: Added color-coded highlights (Red for odd degrees, Blue for selected nodes) to guide players during graph repair.
- **Map Regeneration Logic**: Ensured PRNG seeds are correctly synchronized between host and clients in multiplayer mode.
