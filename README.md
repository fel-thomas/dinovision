# dino-vision

```json
{
  "umap_x": [float, ...],               // UMAP x-coordinates for concepts
  "umap_y": [float, ...],               // UMAP y-coordinates for concepts
  "umap_colors": [[r, g, b], ...],      // RGB color array (modality spectrum)
  "umap_scale": [float, ...],           // Visual size scale of each point
  "energy": [float, ...],               // Energy from image activations
  "is_dead": [0 or 1, ...],             // Whether concept is inactive
  "connections_idx": [[float, ...], ...], // Co-occuring concepts
  "connections_val": [[float, ...], ...], // Strength of co-occurence connections
  "nb_fire": [int, ...]                 , // Number of time a concept fire
}
```
