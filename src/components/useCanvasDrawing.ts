import { useCallback } from 'react';
import { StationData, CanvasDimensions } from './type';
import { scaleCoordinates, interpolateColor, getColorForRidership } from './utils';


export const useCanvasDrawing = (
    canvasDimensions: CanvasDimensions,
    maxRidership: number,
    minRidership: number,
    midpointRidership: number
) => {
    const calculateGradient = useCallback((hourInt: number, ctx: CanvasRenderingContext2D) => {
        const pink = '#C63CBC';
        const orange = '#FF4500';
        const darkBlue = '#141233';
        const black = '#000000';

        let gradient: string | CanvasGradient = black;

        if (hourInt > 5 && hourInt <= 7) {
            const ratio = (hourInt - 5) / 2;
            const gradient = ctx.createLinearGradient(0, canvasDimensions.height, 0, canvasDimensions.height - 100);
            gradient.addColorStop(0, interpolateColor(pink, orange, ratio));
            gradient.addColorStop(1, interpolateColor(black, darkBlue, ratio));
        } else if (hourInt >= 7 && hourInt <= 14) {
            gradient = darkBlue;
        } else if (hourInt >= 15 && hourInt < 18) {
            gradient = darkBlue;
        } else if (hourInt >= 18 && hourInt < 20) {
            const ratio = (hourInt - 18) / 2; // Ratio from 0 to 1
            gradient = ctx.createLinearGradient(0, canvasDimensions.height, 0, canvasDimensions.height - 100);
            gradient.addColorStop(0, interpolateColor(orange, pink, ratio)); // Orange to pink
            gradient.addColorStop(1, interpolateColor(darkBlue, black, ratio)); // Dark blue to black
        } else if (hourInt >= 21 && hourInt < 24) {
            gradient = black;
        } else {
            gradient = black; 
        }
        return gradient;
    }, [canvasDimensions.height]);

    const drawOnCanvas = useCallback((
        ctx: CanvasRenderingContext2D,
        bgCtx: CanvasRenderingContext2D | null,
        day: string,
        hour: string,
        typedData: StationData[]
    ) => {
        ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);

        const hourInt = parseInt(hour, 10);
        const gradient = calculateGradient(hourInt, ctx);

        // Apply background gradient
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);

        // Update background canvas
        if (bgCtx) {
            bgCtx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
            bgCtx.fillStyle = gradient;
            bgCtx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);
        }

        // Draw stations
        typedData.forEach((station: StationData) => {
            if (station.transit_day === day && station.transit_hour === hour) {
                const { x, y } = scaleCoordinates(station.latitude, station.longitude, canvasDimensions);
                
                const minRadius = 4;
                const maxRadius = 8;
                let brightness: number;
                let radius: number;
                let gradient;

                if (station.total_ridership <= midpointRidership) {
                    brightness = 0.8;
                    const normalizedRidership = station.total_ridership / maxRidership;
                    radius = minRadius + (normalizedRidership * (maxRadius - minRadius));

                    gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                    gradient.addColorStop(0, getColorForRidership(station.total_ridership, midpointRidership, 1));
                    gradient.addColorStop(0.5, getColorForRidership(station.total_ridership, midpointRidership, brightness));
                    gradient.addColorStop(1, getColorForRidership(station.total_ridership, midpointRidership, brightness * 0.01));
                } else {
                    const normalizedRidership = station.total_ridership / maxRidership;
                    brightness = 0.8 + (normalizedRidership * 0.2);
                    radius = maxRadius;

                    gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                    gradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
                    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${brightness})`);
                    gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
                }

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = gradient;
                ctx.fill();
            }
        });
    }, [canvasDimensions, calculateGradient, maxRidership, midpointRidership]);

    return { drawOnCanvas };
};