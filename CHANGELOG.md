# Changelog - The Cosmic Weaver

## [2026-04-22]
### Added
- **C++ Verification Tool**: Created `euler_verify.cpp`, a robust C++ implementation of the Hierholzer algorithm, supporting both directed (Hard Mode) and undirected graphs for academic verification.
- **Matrix Export**: Added a "Copy Matrix" button to the sidebar, allowing users to quickly export the current adjacency matrix in a format compatible with standard C++ input.

### Fixed
- **Adjacency Matrix Synchronization**: Fixed a bug where edges in the matrix were not correctly marked as visited ("x") in Hard Mode due to inconsistent edge key generation.
- **Button Text Visibility**: Resolved an issue where text on primary buttons (Red, Purple, Slate) disappeared when hovered in Light Theme.
- **Algorithm Consistency**: Synchronized the neighbor traversal order in `GraphGenerator` (JS) and `euler_verify.cpp` (C++) to ensure identical Euler path outputs for the same seed.

### Improved
- **Light Theme UI**: Refined the Light Mode aesthetics with higher contrast, a Slate-based color palette (#f8fafc), and improved Glassmorphism effects for headers and overlays.
- **Debug Mode Trace**: Optimized the recursive debug pathfinder to be more predictable and aligned with the synchronized traversal logic.


## [2026-04-16]
### Added
- **Multiplayer Disconnect**: Added a "Thoát Phòng" button in the multiplayer sidebar. Players can now leave a room and return to the join/create state without refreshing.
- **Server Side Room Exit**: Implemented `LEAVE_ROOM` event on the server to handle intentional exits, properly updating host status and room occupancy.
- **Debug Path Visualization**: Implemented a tree-based recursive rendering logic for "Debug Mode". Wrong branches that lead to backtracking are now grouped in parentheses `( )`, with unnecessary nesting flattened for better readability.
- **Custom Seed Loading**: Added a "Mã Seed..." input field and "Load" button in the header. Players can now manually load specific map configurations by entering their corresponding seed strings.

### Fixed
- **UI Synchronization**: Resolved critical functional bugs where the Adjacency Matrix and Adjacency List failed to update in real-time during the "Repair Phase" (PHASE_FIXING).
- **Hard Mode Real-time State**: The "Đường 1 Chiều" checkbox now triggers an immediate map regeneration in local mode.
- **CSS Responsiveness**: Adjusted the `.matrix-table` to ensure it fits properly in the sidebar and remains readable on different screen sizes.
- **Custom Alert System**: Overrode the browser's default `alert()` with a premium, non-blocking UI overlay for better aesthetic and UX.

### Improved
- **Repair Phase Feedback**: Added color-coded highlights (Red for odd degrees, Blue for selected nodes) to guide players during graph repair.
- **Map Regeneration Logic**: Ensured PRNG seeds are correctly synchronized between host and clients in multiplayer mode.
