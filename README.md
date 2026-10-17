# AeroFoils: Interactive Aerodynamics & Airfoil Flow Simulator

## Overview
AeroFoils is an educational science demo and interactive aerodynamics sandbox that simulates subsonic wind tunnel physics. Users can design and test airfoil cross-sections in real-time by adjusting camber, thickness, angle of attack, and air speed.

## Features
- **Airfoil Geometry Designer:** Select from NACA presets (NACA 0012, NACA 2412, NACA 4415, Flat Plate, Wedge) or fine-tune camber and thickness parameters.
- **Real-time Flight Conditions:** Adjust angle of attack (-10° to 25°) and freestream airspeed to observe laminar flow, turbulent separation, and aerodynamic stall.
- **Interactive Visualizations:** 
  - Animated smoke particle streamlines demonstrating flow deflection.
  - Dynamic pressure heatmap overlay on the airfoil surface.
  - Velocity vector grid.
  - Real-time Lift ($L$) and Drag ($D$) force vectors.
- **Telemetry Dashboard:** Instant calculation of Lift coefficient ($C_L$), Drag coefficient ($C_D$), Lift-to-Drag efficiency ratio ($L/D$), and stall margin.

## Local Run Instructions
1. Download or clone this repository.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. No installation, build tools, or network connection required.

## Technical Stack
- Pure HTML5, CSS3, and Vanilla JavaScript.
- HTML5 Canvas API for high-performance rendering.
