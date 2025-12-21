export interface SeiMetadata {
    version: number;
    gearState: string;
    frameSeqNo: number;
    vehicleSpeedMps: number;
    acceleratorPedalPosition: number;
    steeringWheelAngle: number;
    blinkerOnLeft: boolean;
    blinkerOnRight: boolean;
    brakeApplied: boolean;
    autopilotState: string;
    latitudeDeg: number;
    longitudeDeg: number;
    headingDeg: number;
    linearAccelerationMps2X: number;
    linearAccelerationMps2Y: number;
    linearAccelerationMps2Z: number;
    timestampMs: number;
}

export interface RenderAssets {
    steeringWheel: ImageBitmap;
    fontFamily?: string;
}
