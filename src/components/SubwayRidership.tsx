import React, { useEffect, useState, useRef } from 'react';
import data from '../assets/MTA_ridership_data.json'; // Import JSON data without type assertion
// Ensure data is typed as an array of StationData
const typedData: StationData[] = data as StationData[]; // Type assertion after import


// Define the data structure based on your dataset
interface StationData {
  station_complex_id: string;
  transit_day: string;
  transit_hour: string;
  station_complex: string;
  total_ridership: number;
  latitude: number;
  longitude: number;
  borough: string;
}

const SubwayRidership: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWidth = 1200; // Set canvas width
  const canvasHeight = 1000; // Set canvas height

  const [currentTime, setCurrentTime] = useState<{ day: string, hour: string }>({ day: '', hour: '' });
  const [dayHourCombinations, setDayHourCombinations] = useState<string[]>([]);
  const [sliderIndex, setSliderIndex] = useState(0); // Index for slider
  const [isAnimating, setIsAnimating] = useState(false); // Animation state

  // Scale lat/lon values to canvas coordinates
  const scaleCoordinates = (latitude: number, longitude: number) => {
    const latMin = 40.6; // Adjusted to move closer
    const latMax = 40.9; // Adjusted to move closer
    const lonMin = -74.2; // Adjusted to move closer
    const lonMax = -73.8; // Adjusted to move closer
    
    const x = ((longitude - lonMin) / (lonMax - lonMin)) * canvasWidth;
    const y = ((latMax - latitude) / (latMax - latMin)) * canvasHeight;
    
    return { x, y };
  };


  // Draw data points on canvas based on the selected day and hour
  const drawOnCanvas = (ctx: CanvasRenderingContext2D, day: string, hour: string) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear the canvas

    // Define color variables
    const pink = '#C63CBC'; // Pink
    const orange = '#FF4500'; // Orange
    const darkBlue = '#0A3777'; // Darker blue
    const black = '#000000'; // Black

    // Determine the background color based on the time of day
    const hourInt = parseInt(hour, 10); // Convert hour to integer
    let gradient;

    // Create gradient based on the hour
    if (hourInt > 5 && hourInt <= 7) {
      // Sunrise (5 AM to 7 AM)
      const ratio = (hourInt - 5) / 2; // Ratio from 0 to 1
      gradient = ctx.createLinearGradient(0, canvasHeight, 0, canvasHeight - 200);
      gradient.addColorStop(0, interpolateColor(pink, orange, ratio)); // Pink to orange
      gradient.addColorStop(1, interpolateColor(black, darkBlue, ratio)); // Light blue
    } else if (hourInt >= 7 && hourInt < 14) {
      gradient = darkBlue;
    } else if (hourInt >= 15 && hourInt < 18) {
      gradient = darkBlue;
    } else if (hourInt >= 18 && hourInt < 20) {
      // Sunset (6 PM to 8 PM)
      const ratio = (hourInt - 18) / 2; // Ratio from 0 to 1
      gradient = ctx.createLinearGradient(0, canvasHeight, 0, canvasHeight - 200);
      gradient.addColorStop(0, interpolateColor(orange, pink, ratio)); // Pink to orange
      gradient.addColorStop(1, interpolateColor(darkBlue, black, ratio)); // Dark blue
    } else if (hourInt >= 21 && hourInt < 24) {
      gradient = black;
    
    }else {
      gradient = black; // From dark blue to light blue 
    }

    // Fill the canvas with the determined gradient

    ctx.fillStyle = gradient;


    ctx.fillRect(0, 0, canvasWidth, canvasHeight); // Fill the canvas with the gradient

    // Draw NYC outline first
    //drawNYCOutline(ctx);

    // Draw subway stations
    typedData.forEach((station: StationData) => {
      if (station.transit_day === day && station.transit_hour === hour) {
        const { x, y } = scaleCoordinates(station.latitude, station.longitude);

        // Scale brightness between 50% (0.5) to 100% (1.0)
        const minBrightness = 0.2;
        const maxBrightness = 1.0;
        const brightness = minBrightness + (Math.min(1, station.total_ridership / 100) * (maxBrightness - minBrightness));

        // Create a radial gradient for each station
        const radius = 5; // Define the radius of the circle
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(255, 255, 0, ${brightness})`); // Inner color (yellow with variable brightness)
        gradient.addColorStop(1, `rgba(255, 255, 0, 0)`); // Outer color (fades out)

        // Draw the circle with gradient
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    });
  };

  // Function to interpolate between two colors
  const interpolateColor = (color1: string, color2: string, factor: number) => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    const result = rgb1.map((c, i) => Math.round(c + factor * (rgb2[i] - c)));
    return `rgb(${result.join(',')})`;
  };

  // Function to convert hex color to RGB
  const hexToRgb = (hex: string) => {
    const bigint = parseInt(hex.replace(/^#/, ''), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  };

  // Get unique day-hour combinations
  useEffect(() => {
    const combinations = Array.from(
      new Set(typedData.map((station: StationData) => `${station.transit_day} ${station.transit_hour}`))
    ).sort(); // Sorting ensures combinations are in order
    setDayHourCombinations(combinations);

    // Set initial time
    if (combinations.length > 0) {
      const [day, hour] = combinations[0].split(' ');
      setCurrentTime({ day, hour });
    }
  }, []);

  // Handle slider change
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(event.target.value);
    setSliderIndex(newIndex);

    const currentCombination = dayHourCombinations[newIndex];
    const [day, hour] = currentCombination.split(' ');
    setCurrentTime({ day, hour });

    // Redraw the canvas with the new day/hour combination
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawOnCanvas(ctx, day, hour);
      }
    }
  };

  // Toggle animation
  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };

  // Animation loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isAnimating) {
      interval = setInterval(() => {
        setSliderIndex((prevIndex) => {
          const newIndex = (prevIndex + 1) % dayHourCombinations.length;
          const currentCombination = dayHourCombinations[newIndex];
          const [day, hour] = currentCombination.split(' ');
          setCurrentTime({ day, hour });

          return newIndex;
        });
      }, 1000); // Each combination lasts 1 second
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnimating, dayHourCombinations]);

  // Redraw canvas when currentTime changes
  useEffect(() => {
    if (dayHourCombinations.length > 0 && currentTime.day && currentTime.hour) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawOnCanvas(ctx, currentTime.day, currentTime.hour);
        }
      }
    }
  }, [currentTime, dayHourCombinations]);

  return (
    <div>
      <h1>NYC Subway Ridership Data - Canvas with Sliding Scale and Animation</h1>
      <p>Current Time: {currentTime.day} {currentTime.hour}</p>

      {/* Slider to control the current time */}
      <input
        type="range"
        min="0"
        max={dayHourCombinations.length - 1}
        value={sliderIndex}
        onChange={handleSliderChange}
        style={{ width: '100%' }}
      />

      {/* Button to toggle animation */}
      <button onClick={toggleAnimation}>
        {isAnimating ? 'Stop Animation' : 'Start Animation'}
      </button>

      <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} style={{ border: '1px solid black' }}></canvas>
    </div>
  );
};

export default SubwayRidership;