# DinoVision

<div align="center">
  <img src="src/assets/images/dino_vision_logo.png" alt="DinoVision Logo" width="200">
</div>


<div align="center">

 <a href="https://fel-thomas.github.io/dinovision/">
An interactive 2D UMAP projection visualization for exploring SAE concepts extracted from DINOv2. <br>
 fel-thomas.github.io/dinovision
 </a>
</div>



<b>Dino</b>Vision provides an interactive interface to explore 32,000 concept vectors. Each point represents a concept learned by sparse autoencoders.

## Features

- Interactive exploration of concept space with zoom and pan
- Click any point to view concept details and connections
- Search concepts by ID
- Adjustable visualization parameters (size, distance, opacity)
- Co-occurrence analysis showing related concepts
- Energy-based or uniform point sizing


## Usage

Navigate the visualization using mouse interactions:
- Zoom with mouse wheel
- Pan by clicking and dragging
- Hover over points to highlight them
- Click points to view details

Use the control panel to:
- Jump to specific concept IDs
- Adjust neighbor distance threshold
- Control point sizes and opacity
- Toggle energy-based sizing

## Technical Details

Built with Vue 3, D3.js, and Vuetify. Uses Canvas rendering for performance with large datasets. The visualization supports real-time interaction with 32,000+ data points.
The visualization expects a JSON file with the following structure:

```json
{
  "umap_x": [float, ...],                    // UMAP x-coordinates for concepts
  "umap_y": [float, ...],                    // UMAP y-coordinates for concepts
  "umap_colors": [[r, g, b], ...],           // RGB color values (0-1 range)
  "umap_scale": [float, ...],                // Scale multipliers for point sizes
  "energy": [float, ...],                    // Activation energy values
  "is_dead": [0 or 1, ...],                  // Binary flags for active/inactive concepts
  "connections_idx": [[int, ...], ...],      // Connected concept IDs
  "connections_val": [[float, ...], ...],    // Connection strength values
  "nb_fire": [int, ...]                      // Activation frequency counts
}
```