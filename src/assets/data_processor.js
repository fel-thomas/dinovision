import { clamp } from '@/assets/math_utils';

const CONCEPTS_IDS = Array.from({ length: 32000 }, (_, i) => i);
const ORIGINAL_OPACITY = 0.8;
const CLICK_COLOR = '#8e51ff';
const HOVER_COLOR = '#a684ff';
const SELECTED_COLOR = '#a684ff';
const STROKE_COLOR = 'rgba(71, 85, 105, 0.5)';
const DEFAULT_SIZE = 10.0;
const MIN_RADIUS = 0.5;
const MAX_RADIUS = 10000.0;

export function create_dataset(source_data) {
    const result = [];
    const energies = CONCEPTS_IDS.map(i => source_data.energy[i]);
    const max_energy = Math.max(...energies);

    CONCEPTS_IDS.forEach(i => {
        result.push({
            id: i,
            x: source_data.umap_x[i],
            y: source_data.umap_y[i],
            color: [source_data.umap_colors[i][0], source_data.umap_colors[i][1], source_data.umap_colors[i][2], 1.0],
            normalized_energy: energies[i] / max_energy,
            scale: source_data.umap_scale[i],
            links: source_data.connections_idx[i],
            links_value: source_data.connections_val[i],
            is_dead: Number(source_data.is_dead[i]),
            nb_fire: Number(source_data.nb_fire[i]),
        });
    });

    return result;
}

export function get_radius(d, transform, use_energy, point_size) {
    let radius = 1;
    if (use_energy) {
        radius = Number(d.scale) ** 0.5 * DEFAULT_SIZE;
    }
    radius *= transform.k ** 0.8;
    radius = clamp(radius, MIN_RADIUS, MAX_RADIUS);
    radius *= point_size;
    return radius;
}

export function find_nearest_points(dataset, target, dist) {
    dist = Number(dist);

    let distances = dataset.map(d => {
        const dx = d.x - target.x;
        const dy = d.y - target.y;
        return { point: d, distance: Math.sqrt(dx * dx + dy * dy) };
    });

    distances = distances.filter(obj => obj.distance <= dist * 0.05);
    distances = distances.filter(obj => obj.point.id != target.id);
    distances = distances.filter(obj => obj.point.is_dead == 0);
    distances.unshift({ point: target, distance: 0 });

    return distances.map(obj => obj.point);
}

export const constants = {
    ORIGINAL_OPACITY,
    CLICK_COLOR,
    HOVER_COLOR,
    SELECTED_COLOR,
    STROKE_COLOR,
    DEFAULT_SIZE,
    MIN_RADIUS,
    MAX_RADIUS
};