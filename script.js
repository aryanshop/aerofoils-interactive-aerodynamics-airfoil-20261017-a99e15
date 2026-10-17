// AeroFoils Simulation Engine & UI Controller

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simCanvas');
    const ctx = canvas.getContext('2d');

    // UI Controls
    const presetSelect = document.getElementById('presetSelect');
    const camberRange = document.getElementById('camberRange');
    const camberVal = document.getElementById('camberVal');
    const thicknessRange = document.getElementById('thicknessRange');
    const thicknessVal = document.getElementById('thicknessVal');
    const aoaRange = document.getElementById('aoaRange');
    const aoaVal = document.getElementById('aoaVal');
    const speedRange = document.getElementById('speedRange');
    const speedVal = document.getElementById('speedVal');
    const smokeDensityRange = document.getElementById('smokeDensityRange');
    const smokeDensityVal = document.getElementById('smokeDensityVal');

    const toggleStreamlines = document.getElementById('toggleStreamlines');
    const togglePressure = document.getElementById('togglePressure');
    const toggleVectors = document.getElementById('toggleVectors');
    const toggleForces = document.getElementById('toggleForces');

    const btnReset = document.getElementById('btnReset');
    const btnStall = document.getElementById('btnStall');

    // Telemetry displays
    const liftVal = document.getElementById('liftVal');
    const clVal = document.getElementById('clVal');
    const dragVal = document.getElementById('dragVal');
    const cdVal = document.getElementById('cdVal');
    const ldRatioVal = document.getElementById('ldRatioVal');
    const stallMarginVal = document.getElementById('stallMarginVal');
    const flowStateBadge = document.getElementById('flowStateBadge');
    const stallBadge = document.getElementById('stallBadge');

    // Simulation Parameters
    let state = {
        preset: 'naca2412',
        camber: 2.0,
        thickness: 12.0,
        aoa: 5.0,
        speed: 20,
        smokeDensity: 2,
        showStreamlines: true,
        showPressure: true,
        showVectors: false,
        showForces: true
    };

    // Airfoil geometry points cache
    let airfoilPoints = [];
    const chordLength = 260;
    const centerX = canvas.width / 2 - 20;
    const centerY = canvas.height / 2;

    // Smoke particle system
    let particles = [];
    const maxParticles = 180;

    function initParticles() {
        particles = [];
        const count = state.smokeDensity === 1 ? 60 : state.smokeDensity === 2 ? 120 : 180;
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width * 0.3,
                y: Math.random() * canvas.height,
                origY: 0,
                speedMultiplier: 0.8 + Math.random() * 0.4,
                alpha: 0.2 + Math.random() * 0.5
            });
        }
        // Distribute evenly along y
        let spacing = canvas.height / (count / 2);
        particles.forEach((p, idx) => {
            p.y = (idx % (count / 2)) * spacing + Math.random() * 10;
            p.origY = p.y;
            p.x = Math.random() * 150;
        });
    }

    // Preset configurations
    function applyPreset(preset) {
        if (preset === 'naca0012') {
            state.camber = 0;
            state.thickness = 12;
        } else if (preset === 'naca2412') {
            state.camber = 2;
            state.thickness = 12;
        } else if (preset === 'naca4415') {
            state.camber = 4;
            state.thickness = 15;
        } else if (preset === 'flatplate') {
            state.camber = 0.5;
            state.thickness = 3;
        } else if (preset === 'wedge') {
            state.camber = 1;
            state.thickness = 18;
        }
        camberRange.value = state.camber;
        thicknessRange.value = state.thickness;
        updateUIValues();
    }

    function updateUIValues() {
        camberVal.textContent = state.camber.toFixed(1) + '%';
        thicknessVal.textContent = state.thickness.toFixed(1) + '%';
        aoaVal.textContent = state.aoa.toFixed(1) + '°';
        speedVal.textContent = state.speed + ' m/s';

        const densityNames = ['Low', 'Medium', 'High'];
        smokeDensityVal.textContent = densityNames[state.smokeDensity - 1];
    }

    // Generate Airfoil coordinates based on parameters
    function generateAirfoil() {
        airfoilPoints = [];
        const steps = 65;
        const m = state.camber / 100;
        const p = 0.4;
        const t = state.thickness / 100;

        for (let i = 0; i <= steps; i++) {
            let beta = (i / steps) * Math.PI;
            let xRatio = (1 - Math.cos(beta)) / 2; // Cosine spacing for better leading edge resolution
            
            let yt = 5 * t * (
                0.2969 * Math.sqrt(xRatio) -
                0.1260 * xRatio -
                0.3516 * Math.pow(xRatio, 2) +
                0.2843 * Math.pow(xRatio, 3) -
                0.1036 * Math.pow(xRatio, 4)
            );

            let yc = 0;
            let dyc_dx = 0;

            if (state.preset !== 'flatplate' && state.preset !== 'wedge') {
                if (xRatio < p && p > 0) {
                    yc = (m / Math.pow(p, 2)) * (2 * p * xRatio - Math.pow(xRatio, 2));
                    dyc_dx = (2 * m / Math.pow(p, 2)) * (p - xRatio);
                } else if (p < 1) {
                    yc = (m / Math.pow(1 - p, 2)) * ((1 - 2 * p) + 2 * p * xRatio - Math.pow(xRatio, 2));
                    dyc_dx = (2 * m / Math.pow(1 - p, 2)) * (p - xRatio);
                }
            } else if (state.preset === 'wedge') {
                yt = (t * 0.8) * (1 - xRatio);
            }

            let theta = Math.atan(dyc_dx);

            let xu = xRatio - yt * Math.sin(theta);
            let yu = yc + yt * Math.cos(theta);
            let xl = xRatio + yt * Math.sin(theta);
            let yl = yc - yt * Math.cos(theta);

            airfoilPoints.push({ x: xu, y: yu, surface: 'upper' });
        }

        // Lower surface in reverse order
        for (let i = steps; i >= 0; i--) {
            let beta = (i / steps) * Math.PI;
            let xRatio = (1 - Math.cos(beta)) / 2;
            let yt = 5 * t * (
                0.2969 * Math.sqrt(xRatio) -
                0.1260 * xRatio -
                0.3516 * Math.pow(xRatio, 2) +
                0.2843 * Math.pow(xRatio, 3) -
                0.1036 * Math.pow(xRatio, 4)
            );
            let yc = 0, dyc_dx = 0;
            if (state.preset !== 'flatplate' && state.preset !== 'wedge') {
                if (xRatio < p && p > 0) {
                    yc = (m / Math.pow(p, 2)) * (2 * p * xRatio - Math.pow(xRatio, 2));
                    dyc_dx = (2 * m / Math.pow(p, 2)) * (p - xRatio);
                } else if (p < 1) {
                    yc = (m / Math.pow(1 - p, 2)) * ((1 - 2 * p) + 2 * p * xRatio - Math.pow(xRatio, 2));
                    dyc_dx = (2 * m / Math.pow(1 - p, 2)) * (p - xRatio);
                }
            } else if (state.preset === 'wedge') {
                yt = (t * 0.8) * (1 - xRatio);
            }
            let theta = Math.atan(dyc_dx);
            let xl = xRatio + yt * Math.sin(theta);
            let yl = yc - yt * Math.cos(theta);
            airfoilPoints.push({ x: xl, y: yl, surface: 'lower' });
        }
    }

    // Physics Calculations
    function calculateAerodynamics() {
        const aoaRad = (state.aoa * Math.PI) / 180;
        const camberFactor = state.camber / 50;
        
        // Critical stall angle approx 15 deg + camber bonus
        const stallAngle = 14 + (state.camber * 0.8);
        const isStalled = state.aoa > stallAngle;

        // Lift coefficient (Cl) ~ 2*pi*alpha + camber effect, drops sharply if stalled
        let cl = 0;
        let cd = 0;

        if (!isStalled) {
            cl = 2.0 * Math.PI * aoaRad + (camberFactor * 2.5);
            cd = 0.015 + 0.05 * Math.pow(cl, 2) + (Math.abs(state.aoa) / 100);
        } else {
            // Post stall drop
            let stallExcess = state.aoa - stallAngle;
            cl = (2.0 * Math.PI * ((stallAngle * Math.PI)/180) + (camberFactor * 2.5)) * Math.max(0.2, (1 - stallExcess * 0.08));
            cd = 0.15 + stallExcess * 0.08;
        }

        // Dynamic pressure q = 0.5 * rho * v^2 (rho ~ 1.225 kg/m^3)
        const rho = 1.225;
        const v = state.speed;
        const S = 0.5; // reference area scale
        const q = 0.5 * rho * Math.pow(v, 2);

        const lift = q * S * cl;
        const drag = q * S * cd;
        const ldRatio = drag > 0 ? (lift / drag).toFixed(1) : '0.0';
        const stallMargin = (stallAngle - state.aoa).toFixed(1);

        // Update UI Text
        liftVal.textContent = Math.max(0, lift).toFixed(1) + ' N';
        clVal.textContent = '$C_L$ = ' + cl.toFixed(2);
        dragVal.textContent = Math.max(0, drag).toFixed(1) + ' N';
        cdVal.textContent = '$C_D$ = ' + cd.toFixed(3);
        ldRatioVal.textContent = ldRatio;
        stallMarginVal.textContent = stallMargin + '°';

        if (isStalled) {
            flowStateBadge.textContent = 'Flow: STALLED';
            flowStateBadge.style.color = 'var(--accent-red)';
            stallBadge.style.display = 'block';
        } else if (state.aoa > 10) {
            flowStateBadge.textContent = 'Flow: Turbulent';
            flowStateBadge.style.color = 'var(--accent-orange)';
            stallBadge.style.display = 'none';
        } else {
            flowStateBadge.textContent = 'Flow: Laminar';
            flowStateBadge.style.color = 'var(--accent-blue)';
            stallBadge.style.display = 'none';
        }

        return { cl, cd, isStalled, aoaRad };
    }

    // Render Scene
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const aero = calculateAerodynamics();
        const aoaRad = aero.aoaRad;

        // Transformation matrix for airfoil rotation around quarter-chord (centerX, centerY)
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-aoaRad); // Negative because canvas Y is inverted

        // 1. Draw Pressure Heatmap on Airfoil
        if (state.showPressure && airfoilPoints.length > 0) {
            ctx.beginPath();
            airfoilPoints.forEach((pt, idx) => {
                let px = (pt.x - 0.25) * chordLength;
                let py = -pt.y * chordLength;
                if (idx === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.closePath();

            // Gradient fill representing pressure (Upper surface low pressure/blue, lower high pressure/red)
            let grad = ctx.createLinearGradient(0, -50, 0, 50);
            grad.addColorStop(0, 'rgba(56, 189, 248, 0.85)'); // Low pressure suction top
            grad.addColorStop(0.5, 'rgba(30, 41, 59, 0.9)');
            grad.addColorStop(1, 'rgba(248, 113, 113, 0.85)'); // High pressure bottom
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (airfoilPoints.length > 0) {
            // Standard Airfoil render
            ctx.beginPath();
            airfoilPoints.forEach((pt, idx) => {
                let px = (pt.x - 0.25) * chordLength;
                let py = -pt.y * chordLength;
                if (idx === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw chord line reference
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(-0.25 * chordLength, 0);
        ctx.lineTo(0.75 * chordLength, 0);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();

        // 2. Draw Streamlines / Smoke Particles
        if (state.showStreamlines) {
            ctx.lineWidth = 2;
            particles.forEach(p => {
                // Move particle
                let speedFactor = (state.speed / 20) * p.speedMultiplier;
                p.x += speedFactor * 2.5;

                // Interaction with airfoil
                let dx = p.x - centerX;
                let dy = p.y - centerY;
                
                // Rotate point into airfoil local frame to check collision/deflection
                let cos = Math.cos(aoaRad);
                let sin = Math.sin(aoaRad);
                let localX = dx * cos + dy * sin;
                let localY = -dx * sin + dy * cos;

                let airfoilXCoord = (localX / chordLength) + 0.25;

                if (airfoilXCoord >= 0 && airfoilXCoord <= 1) {
                    // Approximate thickness at this x
                    let t = state.thickness / 100;
                    let halfThick = 5 * t * (0.2969 * Math.sqrt(airfoilXCoord) - 0.1260 * airfoilXCoord);
                    
                    if (aero.isStalled && airfoilXCoord > 0.3) {
                        // Turbulent swirling behind stall
                        p.y += (Math.random() - 0.5) * 8;
                    } else {
                        // Smooth deflection
                        if (localY > 0 && localY < halfThick * chordLength * 1.8) {
                            let deflection = (state.aoa * 1.5 + state.camber * 3) * (1 - airfoilXCoord);
                            p.y -= deflection * 0.15;
                        } else if (localY < 0 && localY > -halfThick * chordLength * 1.8) {
                            let deflection = (state.aoa * 1.5 + state.camber * 3) * (1 - airfoilXCoord);
                            p.y += deflection * 0.15;
                        }
                    }
                }

                // Wrap around screen
                if (p.x > canvas.width) {
                    p.x = 0;
                    p.y = p.origY + (Math.random() - 0.5) * 20;
                }

                // Draw particle trail / dot
                ctx.strokeStyle = `rgba(56, 189, 248, ${p.alpha})`;
                ctx.beginPath();
                ctx.moveTo(p.x - speedFactor * 6, p.y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            });
        }

        // 3. Draw Velocity Vectors
        if (state.showVectors) {
            ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
            ctx.lineWidth = 1;
            let gridStepX = 60;
            let gridStepY = 50;
            for (let gx = 40; gx < canvas.width; gx += gridStepX) {
                for (let gy = 40; gy < canvas.height; gy += gridStepY) {
                    let dx = gx - centerX;
                    let dy = gy - centerY;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist > 70 && dist < 350) {
                        let vxLength = 15 * (state.speed / 20);
                        let vyLength = -aero.cl * 5 * (gx < centerX ? 0 : 1);
                        
                        ctx.beginPath();
                        ctx.moveTo(gx, gy);
                        ctx.lineTo(gx + vxLength, gy + vyLength);
                        ctx.stroke();

                        // Arrowhead
                        ctx.fillStyle = 'rgba(74, 222, 128, 0.6)';
                        ctx.fillRect(gx + vxLength - 2, gy + vyLength - 2, 4, 4);
                    }
                }
            }
        }

        // 4. Draw Lift & Drag Force Vectors
        if (state.showForces) {
            const liftVectorScale = Math.min(120, Math.max(10, aero.cl * 35));
            const dragVectorScale = Math.min(120, Math.max(10, aero.cd * 150));

            // Lift Vector (Green, pointing perpendicular to oncoming flow / upwards)
            ctx.strokeStyle = '#4ade80';
            ctx.fillStyle = '#4ade80';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX, centerY - liftVectorScale);
            ctx.stroke();

            // Arrowhead for Lift
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - liftVectorScale - 6);
            ctx.lineTo(centerX - 5, centerY - liftVectorScale);
            ctx.lineTo(centerX + 5, centerY - liftVectorScale);
            ctx.fill();

            // Lift label
            ctx.font = '12px system-ui, sans-serif';
            ctx.fillText('LIFT', centerX + 10, centerY - liftVectorScale / 2);

            // Drag Vector (Orange, pointing downstream)
            ctx.strokeStyle = '#fb923c';
            ctx.fillStyle = '#fb923c';
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + dragVectorScale, centerY);
            ctx.stroke();

            // Arrowhead for Drag
            ctx.beginPath();
            ctx.moveTo(centerX + dragVectorScale + 6, centerY);
            ctx.lineTo(centerX + dragVectorScale, centerY - 5);
            ctx.lineTo(centerX + dragVectorScale, centerY + 5);
            ctx.fill();

            // Drag label
            ctx.fillText('DRAG', centerX + dragVectorScale / 2, centerY + 18);
        }

        requestAnimationFrame(render);
    }

    // Event Listeners
    presetSelect.addEventListener('change', (e) => {
        state.preset = e.target.value;
        applyPreset(state.preset);
        generateAirfoil();
    });

    camberRange.addEventListener('input', (e) => {
        state.camber = parseFloat(e.target.value);
        updateUIValues();
        generateAirfoil();
    });

    thicknessRange.addEventListener('input', (e) => {
        state.thickness = parseFloat(e.target.value);
        updateUIValues();
        generateAirfoil();
    });

    aoaRange.addEventListener('input', (e) => {
        state.aoa = parseFloat(e.target.value);
        updateUIValues();
    });

    speedRange.addEventListener('input', (e) => {
        state.speed = parseInt(e.target.value, 10);
        updateUIValues();
    });

    smokeDensityRange.addEventListener('input', (e) => {
        state.smokeDensity = parseInt(e.target.value, 10);
        updateUIValues();
        initParticles();
    });

    toggleStreamlines.addEventListener('change', (e) => {
        state.showStreamlines = e.target.checked;
    });

    togglePressure.addEventListener('change', (e) => {
        state.showPressure = e.target.checked;
    });

    toggleVectors.addEventListener('change', (e) => {
        state.showVectors = e.target.checked;
    });

    toggleForces.addEventListener('change', (e) => {
        state.showForces = e.target.checked;
    });

    btnReset.addEventListener('click', () => {
        state.preset = 'naca2412';
        presetSelect.value = 'naca2412';
        applyPreset('naca2412');
        state.aoa = 5.0;
aoaRange.value = 5.0;
        state.speed = 20;
speedRange.value = 20;
        updateUIValues();
        generateAirfoil();
        initParticles();
    });

    btnStall.addEventListener('click', () => {
        state.aoa = 18.0;
        aoaRange.value = 18.0;
        updateUIValues();
    });

    // Initialize
    applyPreset('naca2412');
    generateAirfoil();
    initParticles();
    requestAnimationFrame(render);
});
