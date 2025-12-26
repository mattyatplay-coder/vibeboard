"use client";

/**
 * LightingPreview3D - Professional 3D Lighting Preview
 *
 * A Three.js-based "Live Viewfinder" that shows real-time shadow visualization
 * on a neutral grey bust model. Maps 2D stage light positions to 3D scene lights.
 *
 * Features:
 * - Neutral grey Lambert/Standard material (professional standard)
 * - Real-time shadow updates as lights are dragged on 2D stage
 * - Hard/soft shadow visualization based on softness slider
 * - Orbit controls for rotation
 */

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { LightSource } from "@/lib/lightingStore";

interface LightingPreview3DProps {
    lights: LightSource[];
    size?: number | 'full';  // 'full' = fill container
}

// Convert 2D stage coordinates to 3D positions
// Stage: x=0-1 (left to right), y=0-1 (back to front)
// 3D: We want lights positioned around a central subject
// lightDistance: 0.1-1.0 affects how far from subject (for falloff visualization)
function stageToWorld(x: number, y: number, lightDistance: number = 0.5): [number, number, number] {
    // Convert to -1 to 1 range, centered at 0
    const stageX = (x - 0.5) * 2;  // -1 (left) to 1 (right)
    const stageY = (y - 0.5) * 2;  // -1 (back) to 1 (front)

    // Base distance scales with light.distance property (inverse square law visualization)
    // distance 0.1 = very close (1.5 units), distance 1.0 = far (6 units)
    const baseDistance = 1.5 + (lightDistance * 4.5);

    // Place lights in a hemisphere around the subject
    const worldX = stageX * baseDistance;
    const worldZ = stageY * baseDistance;
    const worldY = 1.5; // Slightly above eye level

    return [worldX, worldY, worldZ];
}

// Convert hex color to THREE.Color
function hexToColor(hex: string): THREE.Color {
    return new THREE.Color(hex);
}

// Convert Kelvin temperature to RGB color
function kelvinToColor(kelvin: number): THREE.Color {
    const temp = kelvin / 100;
    let r, g, b;

    if (temp <= 66) {
        r = 255;
        g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
        b = temp <= 19 ? 0 : Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
    } else {
        r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
        g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
        b = 255;
    }

    return new THREE.Color(r / 255, g / 255, b / 255);
}

// Simple bust geometry - head and shoulders approximation
function BustModel() {
    const bustRef = useRef<THREE.Group>(null);

    // Neutral grey material - professional standard
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0x808080,  // Neutral 50% grey
        roughness: 0.7,   // Slightly rough for visible shadows
        metalness: 0.0,   // Non-metallic for accurate lighting
    }), []);

    return (
        <group ref={bustRef}>
            {/* Head - sphere */}
            <mesh position={[0, 0.6, 0]} material={material} castShadow receiveShadow>
                <sphereGeometry args={[0.5, 32, 32]} />
            </mesh>

            {/* Neck - cylinder */}
            <mesh position={[0, 0.1, 0]} material={material} castShadow receiveShadow>
                <cylinderGeometry args={[0.15, 0.2, 0.3, 16]} />
            </mesh>

            {/* Shoulders - stretched sphere / ellipsoid */}
            <mesh position={[0, -0.2, 0]} material={material} castShadow receiveShadow>
                <sphereGeometry args={[0.7, 32, 16]} />
            </mesh>

            {/* Nose - small cone for shadow reference */}
            <mesh position={[0, 0.55, 0.42]} rotation={[Math.PI / 2, 0, 0]} material={material} castShadow receiveShadow>
                <coneGeometry args={[0.08, 0.15, 8]} />
            </mesh>

            {/* Brow ridge - for shadow visualization */}
            <mesh position={[0, 0.75, 0.35]} material={material} castShadow receiveShadow>
                <boxGeometry args={[0.4, 0.08, 0.1]} />
            </mesh>
        </group>
    );
}

// Individual light component with shadow support
interface SceneLightProps {
    light: LightSource;
}

function SceneLight({ light }: SceneLightProps) {
    const lightRef = useRef<THREE.PointLight>(null);

    // Calculate 3D position from 2D stage coordinates, accounting for distance
    const lightDistance = light.distance ?? 0.5;
    const position = useMemo(
        () => stageToWorld(light.x, light.y, lightDistance),
        [light.x, light.y, lightDistance]
    );

    // Calculate light color - use gel color if enabled, otherwise Kelvin temperature
    const color = useMemo(() => {
        if (light.useGel && light.gelColor) {
            return hexToColor(light.gelColor);
        }
        return kelvinToColor(light.colorTemp);
    }, [light.useGel, light.gelColor, light.colorTemp]);

    // Calculate intensity with inverse square law falloff
    // Closer lights (low distance) are brighter, farther lights (high distance) are dimmer
    const intensity = useMemo(() => {
        const baseIntensity = (light.intensity / 100) * 2;
        // Inverse square law: I = I0 / d^2
        // At distance 0.5 (default), intensity is as set
        // At distance 0.1, intensity is ~25x stronger
        // At distance 1.0, intensity is ~0.25x
        const falloffFactor = Math.pow(0.5 / Math.max(0.1, lightDistance), 2);
        return Math.min(baseIntensity * falloffFactor, 5); // Cap at 5 to prevent blowout
    }, [light.intensity, lightDistance]);

    // Shadow map resolution based on softness (higher softness = lower res = softer shadows)
    // Note: True soft shadows require shadow map manipulation or VSM/PCF
    const shadowMapSize = useMemo(() => {
        // Hard light (0) = sharp shadows = high resolution
        // Soft light (100) = diffused shadows = lower resolution
        const baseSize = 512;
        const softnessFactor = 1 - (light.softness / 100);
        return Math.max(128, Math.round(baseSize * (0.5 + softnessFactor * 0.5)));
    }, [light.softness]);

    // Shadow blur/radius based on softness
    const shadowRadius = useMemo(() => {
        // Higher softness = larger radius = softer shadow edges
        return (light.softness / 100) * 4;
    }, [light.softness]);

    useEffect(() => {
        if (lightRef.current && lightRef.current.shadow) {
            lightRef.current.shadow.mapSize.width = shadowMapSize;
            lightRef.current.shadow.mapSize.height = shadowMapSize;
            lightRef.current.shadow.radius = shadowRadius;
            lightRef.current.shadow.bias = -0.0005;
        }
    }, [shadowMapSize, shadowRadius]);

    if (!light.enabled) return null;

    return (
        <pointLight
            ref={lightRef}
            position={position}
            color={color}
            intensity={intensity}
            castShadow
            shadow-mapSize-width={shadowMapSize}
            shadow-mapSize-height={shadowMapSize}
            shadow-radius={shadowRadius}
            shadow-bias={-0.0005}
        />
    );
}

// Scene setup with all lights and model
interface SceneProps {
    lights: LightSource[];
    enableZoom?: boolean;
}

function Scene({ lights, enableZoom = false }: SceneProps) {
    const { gl } = useThree();

    // Enable shadow map
    useEffect(() => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
    }, [gl]);

    return (
        <>
            {/* Ambient fill light - very low to preserve shadow contrast */}
            <ambientLight intensity={0.1} />

            {/* Dynamic lights from stage */}
            {lights.map(light => (
                <SceneLight key={light.id} light={light} />
            ))}

            {/* The bust model */}
            <BustModel />

            {/* Ground plane for shadow catching */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]} receiveShadow>
                <planeGeometry args={[4, 4]} />
                <shadowMaterial opacity={0.3} />
            </mesh>

            {/* Camera controls */}
            <OrbitControls
                enablePan={false}
                enableZoom={enableZoom}
                minDistance={2}
                maxDistance={8}
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI / 2}
                target={[0, 0.3, 0]}
            />
        </>
    );
}

export function LightingPreview3D({ lights, size = 80 }: LightingPreview3DProps) {
    const isFullSize = size === 'full';

    return (
        <div
            style={isFullSize ? {
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                background: 'transparent',
            } : {
                width: size,
                height: size,
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#1a1a1a',
            }}
        >
            <Canvas
                shadows
                camera={{
                    position: isFullSize ? [0, 0.8, 4] : [0, 0.5, 3],  // Pull back for larger view
                    fov: isFullSize ? 30 : 35,  // Narrower FOV for larger, more cinematic look
                    near: 0.1,
                    far: 20,
                }}
                gl={{
                    antialias: true,
                    alpha: true,
                    preserveDrawingBuffer: true,
                }}
                style={{ background: 'transparent' }}
            >
                <Scene lights={lights} enableZoom={isFullSize} />
            </Canvas>
        </div>
    );
}
