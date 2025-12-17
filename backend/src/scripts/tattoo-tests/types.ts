export interface TestConfig {
    baseImage: string;
    designImage: string;
    referenceImage: string;
    outputPath: string;
}

export interface CompositeOptions {
    opacity?: number;
    blendMode?: 'multiply' | 'overlay' | 'normal';
    rotate?: number;
    scale?: number;
    xOffset?: number;
    yOffset?: number;
}
