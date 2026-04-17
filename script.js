document.addEventListener('DOMContentLoaded', () => {
    const loadImageButton = document.getElementById('loadImageButton');
    const fileInput = document.getElementById('fileInput');
    const resolutionSlider = document.getElementById('resolutionSlider');
    const resolutionValue = document.getElementById('resolutionValue');
    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdValue = document.getElementById('thresholdValue');
    const entityRadios = document.querySelectorAll('input[name="entityType"]');
    const imageCanvas = document.getElementById('imageCanvas');
    const generateBlueprintButton = document.getElementById('generateBlueprintButton');
    const copyToClipboardButton = document.getElementById('copyToClipboardButton');
    const outputText = document.getElementById('outputText');
    const backgroundMap = document.getElementById('backgroundMap');
    const invertImageCheckbox = document.getElementById('invertImage');
    const noiseReductionSlider = document.getElementById('noiseReductionSlider');
    const noiseReductionValue = document.getElementById('noiseReductionValue');
    let image = null;
    let processedImage = null;

    // Initialize the preview with the background map once it's loaded
    backgroundMap.onload = () => {
        console.log('Background map loaded:', backgroundMap.width, 'x', backgroundMap.height);
        // Show background map immediately on startup with the current resolution
        const resolution = parseInt(resolutionSlider.value);
        console.log('Initial resolution:', resolution);
        processImage();
    };

    // If the image is already loaded (from cache), trigger the onload handler
    if (backgroundMap.complete) {
        backgroundMap.onload();
    }

    // Event listeners
    loadImageButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', loadImage);
    resolutionSlider.addEventListener('input', updateResolution);
    resolutionValue.addEventListener('change', updateResolutionFromInput);
    thresholdSlider.addEventListener('input', updateThreshold);
    thresholdValue.addEventListener('change', updateThresholdFromInput);
    generateBlueprintButton.addEventListener('click', generateBlueprint);
    copyToClipboardButton.addEventListener('click', copyToClipboard);
    entityRadios.forEach(radio => radio.addEventListener('change', processImage));
    invertImageCheckbox.addEventListener('change', processImage);
    noiseReductionSlider.addEventListener('input', updateNoiseReduction);
    noiseReductionValue.addEventListener('change', updateNoiseReductionFromInput);

    // Load image from file input
    function loadImage(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    image = img;
                    processImage();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    // Update resolution from slider
    function updateResolution() {
        resolutionValue.value = resolutionSlider.value;
        resolutionSlider.style.setProperty('--value', `${(resolutionSlider.value - resolutionSlider.min) / (resolutionSlider.max - resolutionSlider.min) * 100}%`);
        processImage();
    }

    // Update resolution from text input
    function updateResolutionFromInput() {
        resolutionSlider.value = resolutionValue.value;
        resolutionSlider.style.setProperty('--value', `${(resolutionSlider.value - resolutionSlider.min) / (resolutionSlider.max - resolutionSlider.min) * 100}%`);
        processImage();
    }

    // Update threshold from slider
    function updateThreshold() {
        thresholdValue.value = thresholdSlider.value;
        thresholdSlider.style.setProperty('--value', `${(thresholdSlider.value - thresholdSlider.min) / (thresholdSlider.max - thresholdSlider.min) * 100}%`);
        processImage();
    }

    // Update threshold from text input
    function updateThresholdFromInput() {
        thresholdSlider.value = thresholdValue.value;
        thresholdSlider.style.setProperty('--value', `${(thresholdSlider.value - thresholdSlider.min) / (thresholdSlider.max - thresholdSlider.min) * 100}%`);
        processImage();
    }

    // Update noise reduction from slider
    function updateNoiseReduction() {
        noiseReductionValue.value = noiseReductionSlider.value;
        noiseReductionSlider.style.setProperty('--value', `${(noiseReductionSlider.value - noiseReductionSlider.min) / (noiseReductionSlider.max - noiseReductionSlider.min) * 100}%`);
        processImage();
    }
    
    // Update noise reduction from text input
    function updateNoiseReductionFromInput() {
        noiseReductionSlider.value = noiseReductionValue.value;
        noiseReductionSlider.style.setProperty('--value', `${(noiseReductionSlider.value - noiseReductionSlider.min) / (noiseReductionSlider.max - noiseReductionSlider.min) * 100}%`);
        processImage();
    }

    // Draw background map with zooming for small resolutions
    function drawBackgroundMap(previewCtx, resolution) {
        if (!backgroundMap.complete || backgroundMap.naturalWidth === 0) {
            console.log('Background map not fully loaded yet');
            return false;
        }
        
        try {
            const maxZoomResolution = 400;
            const minZoomResolution = 100;
            let zoomFactor = 1;
            
            if (resolution < minZoomResolution) {
                // Stop zooming in and decrease preview image size by 1 for each resolution decrease
                zoomFactor = maxZoomResolution / minZoomResolution;
                resolution = minZoomResolution - (minZoomResolution - resolution);
            } else if (resolution < maxZoomResolution) {
                // Linear zoom: as resolution decreases, zoom increases proportionally
                zoomFactor = maxZoomResolution / resolution;
            }
            
            console.log(`Resolution: ${resolution}, Linear zoom factor: ${zoomFactor.toFixed(2)}x`);
            
            // Calculate the portion of the background to show based on zoom factor
            const sourceWidth = imageCanvas.width / zoomFactor;
            const sourceHeight = imageCanvas.height / zoomFactor;
            
            // Center the viewport on the background image
            const sourceX = (backgroundMap.width - sourceWidth) / 2;
            const sourceY = (backgroundMap.height - sourceHeight) / 2;
            
            // Clear the canvas
            previewCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
            
            // Always disable image smoothing for crisp pixels
            previewCtx.imageSmoothingEnabled = false;
            
            // Draw the zoomed background
            previewCtx.drawImage(
                backgroundMap,
                Math.max(0, sourceX), Math.max(0, sourceY), 
                Math.min(sourceWidth, backgroundMap.width), Math.min(sourceHeight, backgroundMap.height),
                0, 0, imageCanvas.width, imageCanvas.height
            );
            return true;
        } catch (e) {
            console.error('Error drawing background map:', e);
            return false;
        }
    }

    // Process the image based on resolution and threshold
    function processImage() {
        const resolution = parseInt(resolutionSlider.value);
        console.log('Processing with resolution:', resolution);
        
        // Create a new canvas for the preview at full size
        const previewCanvas = document.createElement('canvas');
        const previewCtx = previewCanvas.getContext('2d');
        previewCanvas.width = imageCanvas.width;
        previewCanvas.height = imageCanvas.height;
        
        // First draw the background map with appropriate zoom
        const backgroundDrawn = drawBackgroundMap(previewCtx, resolution);
        if (!backgroundDrawn) {
            console.warn('Could not draw background map');
        }
        
        // If no user image is loaded, just show the background map and return
        if (!image) {
            showImagePreview(previewCanvas);
            return;
        }
        
        // Process user image at requested resolution
        const threshold = parseInt(thresholdSlider.value);
        const processCanvas = document.createElement('canvas');
        const processCtx = processCanvas.getContext('2d', { willReadFrequently: true });
        processCanvas.width = resolution;
        processCanvas.height = resolution;
        
        // Draw the image at the specified resolution
        processCtx.drawImage(image, 0, 0, resolution, resolution);
        
        // Get the image data for processing
        let bwImageData = processCtx.getImageData(0, 0, resolution, resolution);
        let bwData = bwImageData.data;
        
        // Check if inversion is enabled
        const isInverted = invertImageCheckbox.checked;
        
        // Convert to black and white based on threshold and handle transparency
        for (let i = 0; i < bwData.length; i += 4) {
            // Check if the pixel is transparent (alpha < 128)
            if (bwData[i + 3] < 128) {
                if (isInverted) {
                    // When inverted, make transparent pixels black (entity pixels)
                    bwData[i] = bwData[i + 1] = bwData[i + 2] = 0;
                } else {
                    // When not inverted, make transparent pixels white (background)
                    bwData[i] = bwData[i + 1] = bwData[i + 2] = 255;
                }
                bwData[i + 3] = 255; // Make fully opaque
            } else {
                // Process non-transparent pixels normally
                const avg = (bwData[i] + bwData[i + 1] + bwData[i + 2]) / 3;
                // Apply threshold and inversion if checked
                let value;
                if (isInverted) {
                    // If inverted, black becomes white and white becomes black
                    value = avg > threshold ? 0 : 255;  
                } else {
                    // Normal (non-inverted) mode
                    value = avg > threshold ? 255 : 0;
                }
                bwData[i] = bwData[i + 1] = bwData[i + 2] = value;
                bwData[i + 3] = 255; // Ensure the alpha channel is fully opaque
            }
        }
        
        // Apply noise reduction if enabled
        const noiseReduction = parseInt(noiseReductionSlider.value);
        if (noiseReduction > 0) {
            bwImageData = applyNoiseReduction(bwImageData, resolution, noiseReduction);
            bwData = bwImageData.data;
        }
        
        // Store the black and white image for blueprint generation
        processCtx.putImageData(bwImageData, 0, 0);
        processedImage = processCanvas;
        
        // For preview, show the entities in the selected color over the background
        const entityType = Array.from(entityRadios).find(radio => radio.checked).value;
        let color;
        switch (entityType) {
            case 'transport-belt':
                color = getComputedStyle(document.documentElement).getPropertyValue('--transport-belt-color').trim();
                break;
            case 'pipe':
                color = getComputedStyle(document.documentElement).getPropertyValue('--pipe-color').trim();
                break;
            case 'concrete':
                color = getComputedStyle(document.documentElement).getPropertyValue('--concrete-color').trim();
                break;
        }
        
        // Convert the color for entity drawing
        const [r, g, b] = hexToRgb(color);
        
        // Calculate the display size and scaling for preview
        // For resolution 300-400: Scale preview image appropriately
        // For resolution 1-300: Keep preview size constant at 300x300
        const minPreviewSize = 400;
        const maxPreviewSize = 500;
        
        let displaySize;
        if (resolution >= minPreviewSize && resolution <= maxPreviewSize) {
            // Scale preview linearly between 300 and 400
            displaySize = resolution;
        } 
        else if (resolution < 100) {
            displaySize = (resolution * 4)
        }
         else if (resolution < minPreviewSize) {
            // Keep preview at constant size for small resolutions
            displaySize = minPreviewSize;
        } else {
            // Cap at max size
            displaySize = maxPreviewSize;
        }
        
        // Calculate the centered position for the preview
        const centerX = imageCanvas.width / 2;
        const centerY = imageCanvas.height / 2;
        const previewX = centerX - (displaySize / 2);
        const previewY = centerY - (displaySize / 2);
        
        // Calculate the exact block size for each entity pixel
        const blockSize = displaySize / resolution;
        
        // Make sure pixelation is disabled for sharp pixels
        previewCtx.imageSmoothingEnabled = false;
        
        // Draw entity pixels without any gaps
        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                const index = (y * resolution + x) * 4;
                if (bwData[index] === 0) { // Black pixel = entity
                    // Calculate exact pixel position - use Math.floor to avoid sub-pixel rendering
                    const entityX = Math.floor(previewX + (x * blockSize));
                    const entityY = Math.floor(previewY + (y * blockSize));
                    
                    // Calculate exact pixel size - use Math.ceil to ensure coverage
                    const width = Math.ceil(blockSize + 0.5); 
                    const height = Math.ceil(blockSize + 0.5);
                    
                    // Fill a block for this entity
                    previewCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    previewCtx.fillRect(entityX, entityY, width, height);
                }
            }
        }
        
        showImagePreview(previewCanvas);
    }

    // Function to apply noise reduction by removing isolated pixels
    function applyNoiseReduction(imageData, resolution, noiseThreshold) {
        const data = imageData.data;
        // Create a copy of the image data to store the result
        const result = new Uint8ClampedArray(data);
        
        // For each pixel in the image
        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                const idx = (y * resolution + x) * 4;
                
                // Only process black pixels (entities)
                if (data[idx] === 0) {
                    // Count neighboring black pixels (8-connected)
                    let neighborCount = 0;
                    
                    for (let ny = Math.max(0, y - 1); ny <= Math.min(resolution - 1, y + 1); ny++) {
                        for (let nx = Math.max(0, x - 1); nx <= Math.min(resolution - 1, x + 1); nx++) {
                            // Skip the pixel itself
                            if (nx === x && ny === y) continue;
                            
                            const nidx = (ny * resolution + nx) * 4;
                            if (data[nidx] === 0) { // If neighbor is black
                                neighborCount++;
                            }
                        }
                    }
                    
                    // If this pixel has fewer neighbors than threshold, remove it (make it white)
                    if (neighborCount < noiseThreshold) {
                        result[idx] = result[idx + 1] = result[idx + 2] = 255;
                    }
                }
            }
        }
        
        // Create a new ImageData object with the processed data
        const processedImageData = new ImageData(result, resolution, resolution);
        return processedImageData;
    }

    // Helper function to make a pixel black
    function makePixelBlack(data, resolution, x, y) {
        if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
            const index = (y * resolution + x) * 4;
            data[index] = data[index + 1] = data[index + 2] = 0;
            data[index + 3] = 255;
        }
    }

    // Show image preview on the main canvas
    function showImagePreview(canvas) {
        const ctx = imageCanvas.getContext('2d');
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        
        // Disable image smoothing for the main canvas as well
        ctx.imageSmoothingEnabled = false;
        
        ctx.drawImage(canvas, 0, 0, imageCanvas.width, imageCanvas.height);

        // Load and draw the logo
        /*const logo = new Image();
        logo.onload = () => {
            ctx.drawImage(logo, 10, 10, 50, 50); // Draw logo at (10, 10) with size 50x50
        };
        logo.src = 'images/logo.webp'; // Path to your logo*/
    }

    // Generate blueprint JSON and compress it
    function generateBlueprint() {
        if (!processedImage) {
            alert('No image processed. Please load and adjust the image.');
            return;
        }
        const blueprint = createBlueprintJson(processedImage);
        
        // Add debug info about the entities count and canvas size
        console.log(`Resolution: ${processedImage.width}x${processedImage.height}`);
        console.log(`Total entities: ${blueprint.blueprint.entities.length}`);
        
        try {
            const blueprintJsonStr = JSON.stringify(blueprint);
            console.log('Blueprint JSON length:', blueprintJsonStr.length); // Log JSON length
            
            const compressedData = pako.deflate(blueprintJsonStr, { level: 9 });
            console.log('Compressed data length:', compressedData.length); // Log compressed length
            
            // Use a more robust method to encode large binary data to base64
            // First convert the compressed data to a binary string
            let binaryString = '';
            const bytes = new Uint8Array(compressedData);
            for (let i = 0; i < bytes.byteLength; i++) {
                binaryString += String.fromCharCode(bytes[i]);
            }
            
            // Now encode the binary string to base64
            const encodedData = btoa(binaryString);
            console.log('Encoded data length:', encodedData.length); // Log encoded length
            
            const blueprintString = '0' + encodedData;
            outputText.value = blueprintString;
        } catch (e) {
            console.error('Error generating blueprint string:', e);
            alert('Error generating blueprint string: ' + e.message);
        }
    }

    // Copy blueprint string to clipboard
    function copyToClipboard() {
        outputText.select();
        document.execCommand('copy');
    }

    // Create blueprint JSON from canvas
    function createBlueprintJson(canvas) {
        const entityType = Array.from(entityRadios).find(radio => radio.checked).value;
        const isConcrete = entityType === 'concrete';
        
        // Create the basic blueprint structure
        const blueprint = {
            blueprint: {
                icons: [{ 
                    signal: { 
                        type: isConcrete ? 'item' : 'item',  // Concrete is still an item for icon
                        name: entityType 
                    }, 
                    index: 1 
                }],
                entities: [],
                tiles: [],  // Add tiles array for concrete
                item: 'blueprint',
                version: 73016960
            }
        };
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        console.log('Creating blueprint JSON with resolution:', canvas.width, canvas.height);
        console.log('Image data length:', data.length);
        
        let entityCount = 0;
        let tileCount = 0;
        let blackPixels = 0;
        
        // Debug - count black pixels before we start
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] === 0) blackPixels++;
        }
        console.log(`Total black pixels detected: ${blackPixels}`);
        
        // Log a sample of pixels around the center
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        console.log(`Center pixel at (${centerX}, ${centerY}):`);
        for (let y = centerY - 1; y <= centerY + 1; y++) {
            for (let x = centerX - 1; x <= centerX + 1; x++) {
                if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                    const index = (y * canvas.width + x) * 4;
                    console.log(`Pixel (${x}, ${y}): R=${data[index]}, G=${data[index+1]}, B=${data[index+2]}`);
                }
            }
        }
        
        // Go through each pixel - add entity or tile where pixel is black (0)
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const index = (y * canvas.width + x) * 4;
                if (data[index] === 0) { // Black pixel
                    if (isConcrete) {
                        // Add as tile if concrete
                        blueprint.blueprint.tiles.push({
                            position: { x, y },
                            name: "concrete"  // Using concrete as the tile name
                        });
                        tileCount++;
                    } else {
                        // Add as entity for other types
                        blueprint.blueprint.entities.push({
                            entity_number: ++entityCount,
                            name: entityType,
                            position: { x, y }
                        });
                    }
                }
            }
        }
        
        console.log(`Added ${isConcrete ? tileCount + " tiles" : entityCount + " entities"} to the blueprint`);
        return blueprint;
    }

    // Initialize slider fill
    resolutionSlider.style.setProperty('--value', `${(resolutionSlider.value - resolutionSlider.min) / (resolutionSlider.max - resolutionSlider.min) * 100}%`);
    thresholdSlider.style.setProperty('--value', `${(thresholdSlider.value - thresholdSlider.min) / (thresholdSlider.max - thresholdSlider.min) * 100}%`);
    noiseReductionSlider.style.setProperty('--value', `${(noiseReductionSlider.value - noiseReductionSlider.min) / (noiseReductionSlider.max - noiseReductionSlider.min) * 100}%`);

    // Helper function to convert hex color to RGB
    function hexToRgb(hex) {
        const bigint = parseInt(hex.replace('#', ''), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return [r, g, b];
    }
});
