<p align="center">
  <a href="https://fel-thomas.github.io/dinovision/">
    <img src="src/assets/images/dino.png" alt="DinoVision Logo" width="300">
  </a>
</p>

### <b>Dino</b>Vision

<b>Dino</b>Vision provides an interactive interface to explore 32,000 concept vectors. Each point represents a concept learned by sparse autoencoders. Click here to explore **[Launch DinoVision →](https://fel-thomas.github.io/dinovision/)**


    🔬 This project accompanies "Into the Rabbit Hull: From Task-Relevant Concepts in DINO to Minkowski Geometry" by Thomas Fel, Binxu Wang, and collaborators from the Kempner Institute at Harvard University.


---

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

```
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

# 👏 Credits
<div align="right">
  <picture>
    <source srcset="https://kempnerinstitute.harvard.edu/app/uploads/2024/08/Kempner-logo_Full-Color-Kempner-and-Harvard-Logo-Lockup-2048x552.png"  width="60%" align="right">
    <img alt="Kempner Logo" src="https://kempnerinstitute.harvard.edu/app/uploads/2024/08/Kempner-logo_Full-Color-Kempner-and-Harvard-Logo-Lockup-2048x552.png" width="60%" align="right">
  </picture>
</div>

This work has been made possible in part by the generous support provided by the Kempner Institute at Harvard University. The institute, established through a gift from the Chan Zuckerberg Initiative Foundation, is dedicated to advancing research in natural and artificial intelligence. The resources and commitment of the Kempner Institute have been instrumental in the development and completion of this project.


## Citation

If you use DinoVision in your research, please cite:

```bibtex
@article{fel2024rabbit,
  title={Into the Rabbit Hull: From Task-Relevant Concepts in DINO to Minkowski Geometry},
  author={Fel, Thomas and Wang, Binxu and Lepori, Mikey and Kowal, Matt and Lee, Andrew and Balestriero, Randall and Joseph, Sonia and Konkle, Talia and Ba, Demba and Wattenberg, Martin},
  journal={arXiv preprint},
  year={2025}
}