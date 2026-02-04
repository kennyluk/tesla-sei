import { SeiMetadata, RenderAssets } from '../types';

export function drawTelemetryFrame(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    metadata: SeiMetadata,
    width: number,
    height: number,
    assets: RenderAssets,
    showGps?: boolean
) {
    // RESOLUTION INDEPENDENT SCALING
    // Base design is approx 1280px wide. We scale everything relative to that.
    const BASE_WIDTH = 1280;
    const scale = width / BASE_WIDTH;

    // Safety clamp for very small/large resolutions if needed, but linear should be fine.
    // s(v) scales a value v
    const s = (v: number) => v * scale;

    ctx.save();

    // Global Text Settings
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const mainFont = assets.fontFamily || 'Inter, sans-serif'; // Fallback

    // Define Layout Structure (Bottom Bar)
    const PADDING_B = s(60); // Bottom padding
    const CENTER_Y = height - PADDING_B;

    // 1. Draw GPS (Top Right)
    if (showGps !== false) {
        drawGps(ctx, metadata, width, height, s, mainFont);
    }

    // 2. Draw Center Cluster (Speed, Blinkers)
    drawCenterCluster(ctx, metadata, width / 2, CENTER_Y, s, mainFont);

    // 3. Draw Left Cluster (Brake, G-Force)
    // Position: Left side.
    // Brake is at x ~ s(100), G-Ball at x ~ s(250) (Roughly based on flex-1 justified start)
    // Let's align them relative to left edge + padding
    const leftStartX = s(80);
    const gap = s(60);

    // Brake Pedal
    const brakeX = leftStartX;
    drawBrakePedal(ctx, metadata, brakeX, CENTER_Y, s, mainFont);

    // Separator? (Invisible in UI code mostly, but we have spacers)

    // G-Force Ball
    const gBallX = brakeX + s(120); // Gap
    drawGForceBall(ctx, metadata, gBallX, CENTER_Y, s, mainFont);


    // 4. Draw Right Cluster (Compass, Wheel, Accel)
    // Position: Right side.
    const rightStartX = width - s(80);

    // Accel Pedal (Rightmost)
    const accelX = rightStartX;
    drawAcceleratorPedal(ctx, metadata, accelX, CENTER_Y, s, mainFont);

    // Steering Wheel (Left of Accel)
    const wheelX = accelX - s(140);
    drawSteeringWheel(ctx, metadata, wheelX, CENTER_Y, assets, s, mainFont);

    // Compass (Left of Wheel)
    const compassX = wheelX - s(160);
    drawCompass(ctx, metadata, compassX, CENTER_Y, s, mainFont);

    ctx.restore();
}

/**
 * GPS Coordinates (Top Right)
 */
function drawGps(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: SeiMetadata,
    width: number,
    height: number,
    s: (v: number) => number,
    font: string
) {
    if (!data.latitudeDeg || !data.longitudeDeg) return;

    const lat = data.latitudeDeg.toFixed(6);
    const lon = data.longitudeDeg.toFixed(6);
    const fontSize = s(16);
    const padding = s(16);
    const top = s(40);
    const right = s(40);

    ctx.save();

    // UI has them in a pill. 
    const pillW = s(280);
    const pillH = s(40);
    const pillX = width - right - pillW;
    const pillY = top - s(10);

    // Pill bg
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(20, 20, 30, 0.6)'; // Glass dark
    // Round rect
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text inside pill
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${fontSize}px ${font}`;
    ctx.fillStyle = '#00E5FF';
    ctx.fillText(`${lat}°   ${lon}°`, pillX + pillW / 2, pillY + pillH / 2);

    ctx.restore();
}

/**
 * Speed & Blinkers (Center)
 */
function drawCenterCluster(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: SeiMetadata,
    x: number,
    y: number,
    s: (v: number) => number,
    font: string
) {
    const mph = Math.round(data.vehicleSpeedMps * 0.00);

    ctx.save();
    ctx.translate(x, y);

    // Speed Value
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = `bold ${s(72)}px ${font}`;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = s(10);
    ctx.fillText(mph.toString(), 0, s(0)); // Center

    // MPH Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = `600 ${s(14)}px ${font}`;
    ctx.fillText('km/h', 0, s(45));

    // Gear State
    if (data.gearState) {
        const gearLetter = data.gearState.replace('GEAR_', '')[0];
        ctx.fillStyle = '#00E5FF';
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = s(8);
        ctx.font = `bold ${s(12)}px ${font}`;
        ctx.fillText(gearLetter, 0, s(56));
    }

    // Blinkers
    const blinkerOffset = s(80);
    const arrowSize = s(32);
    ctx.font = `${arrowSize}px ${font}`;

    // Left
    if (data.blinkerOnLeft) {
        ctx.fillStyle = '#4caf50';
        ctx.shadowColor = '#4caf50';
        ctx.shadowBlur = s(15);
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.shadowBlur = 0;
    }
    ctx.fillText('◀', -blinkerOffset, s(5));

    // Right
    if (data.blinkerOnRight) {
        ctx.fillStyle = '#4caf50';
        ctx.shadowColor = '#4caf50';
        ctx.shadowBlur = s(15);
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.shadowBlur = 0;
    }
    ctx.fillText('▶', blinkerOffset, s(5));

    ctx.restore();
}

/**
 * G-Force Ball
 */
function drawGForceBall(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: SeiMetadata,
    x: number,
    y: number,
    s: (v: number) => number,
    font: string
) {
    const RADIUS = s(42);
    const SCALE = s(120); // Sensitivity
    const MAX_OFFSET = s(36); // Limit inside the circle

    // Invert X/Y as needed based on data (usually X is lateral, Y is longitudinal)
    // Based on GForceBall.tsx: x={data.X} y={data.Y}
    const gX = data.linearAccelerationMps2X / 9.81;
    const gY = data.linearAccelerationMps2Y / 9.81;
    const gZ = data.linearAccelerationMps2Z / 9.81;

    const ballX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, gX * SCALE));
    const ballY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, -gY * SCALE));

    ctx.save();
    ctx.translate(x, y);

    // Background Circle
    ctx.beginPath();
    ctx.arc(0, 0, RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 20, 25, 0.6)'; // Darker bg
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = s(2);
    ctx.stroke();

    // Inner Rings (Dotted)
    ctx.beginPath();
    ctx.arc(0, 0, RADIUS * 0.3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath(); ctx.moveTo(-RADIUS, 0); ctx.lineTo(RADIUS, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -RADIUS); ctx.lineTo(0, RADIUS); ctx.stroke();

    // The Red Ball
    ctx.beginPath();
    ctx.arc(ballX, ballY, s(6), 0, Math.PI * 2);
    ctx.fillStyle = '#ff3b30';
    ctx.shadowColor = '#ff3b30';
    ctx.shadowBlur = s(12);
    ctx.fill();

    // Numerical Data (Right of ball)
    ctx.save();
    ctx.translate(RADIUS + s(10), 0);
    ctx.textAlign = 'left';
    ctx.font = `bold ${s(10)}px ${font}`;

    const drawRow = (label: string, val: number, dy: number) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText(`${label}:`, 0, dy);

        ctx.font = `bold ${s(10)}px ${font}`;
        const absVal = Math.abs(val);
        const displayVal = absVal < 0.05 ? '0.0' : val.toFixed(1);
        if (val >= 0.05) ctx.fillStyle = '#4caf50';
        else if (val <= -0.05) ctx.fillStyle = '#ff3b30';
        else ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

        ctx.fillText(displayVal, s(15), dy);
    };

    drawRow('X', gX, -s(12));
    drawRow('Y', gY, 0);
    drawRow('Z', gZ, s(12));
    ctx.restore();

    // Label below
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `bold ${s(10)}px ${font}`;
    ctx.fillText('G-FORCE', 0, RADIUS + s(5));

    ctx.restore();
}

/**
 * Brake Pedal
 */
function drawBrakePedal(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: SeiMetadata,
    x: number,
    y: number,
    s: (v: number) => number,
    font: string
) {
    const isApplied = data.brakeApplied;
    const width = s(40);
    const height = s(28); // Pedal pad size

    ctx.save();
    ctx.translate(x, y);

    // Draw Rod (Line up)
    // Rod goes from topish to the pedal pad.
    // Let's simulate the path: M30 5 ...
    // Simplified Canvas Path for Brake Rod
    ctx.beginPath();
    // Coordinates relative to center 0,0. Let's say 0,0 is center of pedal pad.
    // Rod goes up.
    ctx.moveTo(s(4), -s(10));
    ctx.lineTo(s(8), -s(30));
    ctx.lineTo(s(15), -s(45));
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = s(4);
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. Erase where pad will be (to avoid showing rod through transparency)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, s(6));
    ctx.fill();
    ctx.restore();

    // 3. Draw Background Pad
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, s(6));
    ctx.fill();
    ctx.strokeStyle = isApplied ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = s(2);
    ctx.stroke();

    // Active State Fill (Gradient)
    if (isApplied) {
        const grad = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
        grad.addColorStop(0, '#ff3d00');
        grad.addColorStop(1, '#ff7043');
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(255, 61, 0, 0.6)';
        ctx.shadowBlur = s(15);
        ctx.beginPath();
        ctx.roundRect(-width / 2, -height / 2, width, height, s(6));
        ctx.fill();
    }

    // Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `bold ${s(10)}px ${font}`;
    ctx.fillText('BRAKE', 0, s(35));

    ctx.restore();
}

/**
 * Accelerator Pedal
 */
function drawAcceleratorPedal(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: SeiMetadata,
    x: number,
    y: number,
    s: (v: number) => number,
    font: string
) {
    // Value 0-100
    // Fix: acceleratorPedalPosition might be 0-100 or 0-1. 
    // Usually standard signals are %. Let's assume % based on name.
    const val = Math.min(100, Math.max(0, data.acceleratorPedalPosition || 0));

    const w = s(18);
    const h = s(50);

    ctx.save();
    ctx.translate(x, y);

    // Rod (Simplified)
    ctx.beginPath();
    ctx.moveTo(s(5), -s(10));
    ctx.lineTo(s(8), -s(40));
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = s(4);
    ctx.stroke();

    // 2. Erase where pad will be
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, s(6));
    ctx.fill();
    ctx.restore();

    // 3. Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, s(6));
    ctx.fill();
    ctx.strokeStyle = val > 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = s(2);
    ctx.stroke();

    // Fill (Bottom up)
    if (val > 0) {
        const fillH = h * (val / 100);
        const fillY = (h / 2) - fillH; // Start from bottom (h/2) goes up

        const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        grad.addColorStop(0, '#00e5ff');
        grad.addColorStop(1, '#80deea');

        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0, 229, 255, 0.6)';
        ctx.shadowBlur = s(10);

        ctx.beginPath();
        // Clip to rounded rect of pedal
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, s(6));
        ctx.clip();

        ctx.fillRect(-w / 2, fillY, w, fillH);
        ctx.restore();
    }

    // Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `bold ${s(10)}px ${font}`;
    ctx.fillText('ACCEL', 0, s(45));

    ctx.restore();
}

/**
 * Compass
 */
function drawCompass(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: SeiMetadata,
    x: number,
    y: number,
    s: (v: number) => number,
    font: string
) {
    const w = s(180);
    const h = s(50);

    ctx.save();
    ctx.translate(x, y);

    // Container Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    // Clip
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.clip();

    // Tape Logic
    const heading = data.headingDeg || 0;
    const PIXELS_PER_DEG = s(5); // 5px per degree
    // Range visible: w / 5 = 36 deg approx.
    const startDeg = Math.floor(heading - 40);
    const endDeg = Math.ceil(heading + 40);

    ctx.textAlign = 'center';

    for (let i = startDeg; i <= endDeg; i++) {
        // Draw tick every 5 deg
        if (i % 5 !== 0) continue;

        const deg = i;
        const normalized = ((deg % 360) + 360) % 360;

        // Offset from center
        const offset = (deg - heading) * PIXELS_PER_DEG;

        // Tick height
        // Major (15) vs Minor (5)
        const isMajor = (i % 15 === 0);
        const tickH = isMajor ? s(12) : s(6);
        const tickY = (h / 2) - tickH;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(offset - 0.5, tickY, 1, tickH); // From bottom

        // Text for Major
        if (isMajor) {
            let label = normalized.toString();
            let isCardinal = false;
            let color = 'rgba(255, 255, 255, 0.8)';

            if (normalized === 0) { label = 'N'; isCardinal = true; color = '#ff3b30'; }
            else if (normalized === 90) { label = 'E'; isCardinal = true; color = '#ff3b30'; }
            else if (normalized === 180) { label = 'S'; isCardinal = true; color = '#ff3b30'; }
            else if (normalized === 270) { label = 'W'; isCardinal = true; color = '#ff3b30'; }

            ctx.fillStyle = color;
            ctx.font = isCardinal ? `900 ${s(14)}px ${font}` : `600 ${s(11)}px ${font}`;
            ctx.fillText(label, offset, -s(5));
        }
    }

    // Center Red Line
    ctx.restore(); // Unclip
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ff3b30';
    ctx.shadowColor = 'rgba(255, 59, 48, 0.8)';
    ctx.shadowBlur = s(8);
    ctx.fillRect(-1, -h / 2, 2, h);

    // Bottom Value
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00E5FF';
    ctx.font = `800 ${s(16)}px ${font}`;
    ctx.fillText(`${Math.round(heading)}°`, 0, s(50));

    ctx.restore();
}

/**
 * Steering Wheel
 */
function drawSteeringWheel(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: SeiMetadata,
    x: number,
    y: number,
    assets: RenderAssets,
    s: (v: number) => number,
    font: string
) {
    const angle = data.steeringWheelAngle || 0;
    const rad = (angle * Math.PI) / 180;
    const size = s(80); // Wheel size

    ctx.save();
    ctx.translate(x, y);

    // AP State Label (Above)
    let apState = data.autopilotState; // TACC, AUTOSTEER, SELF_DRIVING
    let apText = '';
    let apColor = '#2962FF'; // Blue

    if (apState === 'TACC') { apText = 'TACC'; apColor = '#2962FF'; }
    if (apState === 'AUTOSTEER') { apText = 'AUTOSTEER'; apColor = '#2962FF'; }
    if (apState === 'SELF_DRIVING') { apText = 'FSD'; apColor = '#2962FF'; }

    if (apText) {
        ctx.save();
        ctx.font = `800 ${s(10)}px ${font}`;
        ctx.fillStyle = apColor;
        ctx.shadowColor = apColor;
        ctx.shadowBlur = s(10);
        ctx.letterSpacing = '2px';
        ctx.fillText(apText, 0, -size / 2 - s(20));
        ctx.restore();
    }

    // Wheel Icon
    ctx.save();
    ctx.rotate(rad);
    if (assets.steeringWheel) {
        const isAutopilot = ['TACC', 'AUTOSTEER', 'SELF_DRIVING'].includes(apState);

        // If Autosteer, add glow
        if (isAutopilot) {
            ctx.shadowColor = '#2962FF';
            ctx.shadowBlur = s(20);
        }

        if (isAutopilot) {
            // Create isolated tint layer using an OffscreenCanvas
            // This prevents source-in from affecting the main canvas background
            const scratch = new OffscreenCanvas(size, size);
            const sCtx = scratch.getContext('2d')!;
            sCtx.drawImage(assets.steeringWheel, 0, 0, size, size);
            sCtx.globalCompositeOperation = 'source-in';
            sCtx.fillStyle = '#2962FF';
            sCtx.fillRect(0, 0, size, size);

            ctx.drawImage(scratch, -size / 2, -size / 2, size, size);
        } else {
            ctx.drawImage(assets.steeringWheel, -size / 2, -size / 2, size, size);
        }
    }
    ctx.restore();

    // Angle Value (Below)
    ctx.font = `600 ${s(14)}px ${font}`;
    ctx.fillStyle = '#00E5FF'; // Blue logic
    ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';
    ctx.shadowBlur = s(5);
    ctx.fillText(`${Math.round(angle)}°`, 0, s(50));

    ctx.restore();
}
