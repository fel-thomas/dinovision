<template>
    <div class="canvas-container">
        <!-- toolbar -->
        <v-toolbar>
            <v-toolbar-title>UMAP Options</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-toolbar-items>
                <div style="margin-right: 30px; width: 150px; margin-top: 5px;">
                    <v-text-field label="Specific ID" placeholder="Enter concept ID" variant="filled"
                        v-model="selected_id"></v-text-field>
                </div>
                <div style="margin-right: 30px; width: 150px; margin-top: 5px;">
                    <v-text-field label="Distance" placeholder="Distance to neighbours" variant="filled"
                        v-model="dist_neighbours"></v-text-field>
                </div>
                <div style="margin-right: 30px; width: 150px; margin-top: 5px;">
                    <v-text-field label="Size" placeholder="Point size" variant="filled"
                        v-model="point_size"></v-text-field>
                </div>
                <div style="margin-right: 30px;">
                    <v-checkbox v-model="use_energy" label="Energy" />
                </div>
                <div style="margin-right: 10px; width: 150px; margin-top:10px">
                    <div class="text-caption">
                        Heatmap Opacity
                    </div>
                    <v-slider v-model="global_heatmap_opacity" step="0.01" min="0" max="1" thumb-label></v-slider>
                </div>
                <div style="margin-right: 30px;">
                    <v-checkbox v-model="auto_opacity_cycle" label="Auto Opacity" />
                </div>

            </v-toolbar-items>
        </v-toolbar>

        <!-- chart -->
        <div ref="chart_container" class="chart-container"></div>

        <v-card class="mt-2 pa-3 explanation-card">
            <v-card-title class="text-subtitle-1 font-weight-bold">Understanding the Visualization</v-card-title>
            <v-card-text class="text-body-2">
                <p>This 2D UMAP projection visualizes the dictionary of SAE concepts extracted from vision-language
                    models. Each point represents a concept vector (a linear direction in the shared embedding space).
                    <b>UMAP preserves local distances</b>, so points close together in the visualization correspond to
                    similar concepts in the original high-dimensional space, though larger-scale clusters should be
                    interpreted cautiously.
                </p>

                <p class="mt-3 mb-2"><b>Interact with concepts:</b></p>
                <ul class="mb-2 pl-3">
                    <li><b>Click any point</b> to explore that concept's examples and properties</li>
                    <li>Use the <b>Specific ID</b> field to return to a concept by its identifier</li>
                    <li>Check the <b>Co-Occurrence tab</b> to see how concepts Co-occurs together</li>
                </ul>

                <p class="mt-3 mb-2"><b>Concept metrics:</b></p>
                <div class="d-flex flex-wrap align-center">
                    <div class="mr-4 mb-2 d-flex flex-column align-center">
                        <v-chip color="black" size="small"><v-icon size="x-small">mdi-passport</v-icon> 123</v-chip>
                        <span class="caption mt-1">Concept ID</span>
                    </div>
                    <div class="mr-4 mb-2 d-flex flex-column align-center">
                        <v-chip color="orange" size="small"><v-icon size="x-small">mdi-image-area</v-icon> 456</v-chip>
                        <span class="caption mt-1">Image activations</span>
                    </div>
                    <div class="mr-4 mb-2 d-flex flex-column align-center">
                        <v-chip color="indigo" size="small"><v-icon size="x-small">mdi-bridge</v-icon> 0.75</v-chip>
                        <span class="caption mt-1">Co-occurence score</span>
                    </div>
                </div>

                <p class="mt-3"><b>Bridging modalities:</b> Although concepts are primarily unimodal (activating for
                    either images or text), the Co-Occurrence tab reveals how the model creates cross-modal connections.
                    These bridges allow concepts to fire together on aligned image-caption pairs, enabling the model to
                    connect meaning across modalities even when individual concepts are specialized.</p>
            </v-card-text>
        </v-card>

        <!-- details drawer -->
        <v-navigation-drawer v-model="drawer" location="end" width="600" rail rail-width="600" elevation="10">
            <v-toolbar app dark fixed>
                <v-toolbar-title>Details</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn icon @click="drawer = false">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-toolbar>

            <v-tabs v-model="active_tab" bg-color="dark" dark>
                <v-tab value="selected">Selected</v-tab>
                <v-tab value="cooccurrence">Co-Occurrence</v-tab>
            </v-tabs>

            <v-window v-model="active_tab">
                <!-- selected tab -->
                <v-window-item value="selected">
                    <v-card v-if="selected_point">
                        <ItemComponent v-for="item in selected_point" :key="item.id" :item="item"
                            :highlight="item.id === selected_point[0].id" :compact-image="compact_image"
                            :opacity="global_heatmap_opacity" />
                    </v-card>
                </v-window-item>

                <!-- co-occurrence tab -->
                <v-window-item value="cooccurrence">
                    <v-card v-if="co_occurring_concepts.length > 0">
                        <ItemComponent v-for="item in co_occurring_concepts" :key="item.id" :item="item"
                            :highlight="item.id === selected_point[0].id" :compact-image="compact_image"
                            :opacity="global_heatmap_opacity" />
                    </v-card>
                </v-window-item>
            </v-window>
        </v-navigation-drawer>
    </div>
</template>

<script setup>
import * as d3 from 'd3';
import { onMounted, ref, watch } from 'vue';
import dataDino from '@/assets/dinovision_website_data.json'
import { clamp } from '@/assets/math_utils';
import ItemComponent from './item.vue';

// props
const props = defineProps({
    width: { type: Number, default: 1560 },
    height: { type: Number, default: 800 },
});

// reactive state
const chart_container = ref(null);
const drawer = ref(false);
const selected_point = ref(null);
const use_energy = ref(true);
const dist_neighbours = ref(1.0);
const point_size = ref(1.0);
const compact_image = ref(false);
const selected_id = ref(null);
const active_tab = ref("selected");
const co_occurring_concepts = ref([]);
const global_heatmap_opacity = ref(0.6);
const auto_opacity_cycle = ref(false);
let opacity_interval = null;



// initial data
let data = dataDino

// canvas vars
let canvas, context, x_scale, y_scale, zoom;

// constants
const CONCEPTS_IDS = Array.from({ length: 32000 }, (_, i) => i);
const ORIGINAL_OPACITY = 0.8;
const CLICK_COLOR = '#8e51ff';
const HOVER_COLOR = '#a684ff';
const SELECTED_COLOR = '#a684ff';
const STROKE_COLOR = 'rgba(71, 85, 105, 0.5)';
const DEFAULT_SIZE = 10.0;
const MIN_RADIUS = 0.5;
const MAX_RADIUS = 10000.0;

// state tracking
let current_clicked_id = null;
let current_selected_ids = [];
let hovered_point_id = null;

// dataset creation function
function create_dataset(source_data) {
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

// initialize dataset
const dataset = create_dataset(data);

// get radius based on energy and zoom
function get_radius(d, transform) {
    let radius = 1;
    if (use_energy.value) {
        radius = Number(d.scale) ** 0.5 * DEFAULT_SIZE;
    }
    radius *= transform.k ** 0.8;
    radius = clamp(radius, MIN_RADIUS, MAX_RADIUS);
    radius *= point_size.value;
    return radius;
}

// init on mount
onMounted(() => create_chart());

// create chart and set up events
function create_chart() {
    chart_container.value.innerHTML = '';

    canvas = d3.select(chart_container.value)
        .append('canvas')
        .attr('width', props.width)
        .attr('height', props.height)
        .style('display', 'block')
        .node();

    const pixel_ratio = window.devicePixelRatio || 1;
    canvas.width = props.width * pixel_ratio;
    canvas.height = props.height * pixel_ratio;
    canvas.style.width = `${props.width}px`;
    canvas.style.height = `${props.height}px`;

    chart_container.value.style.width = `${props.width}px`;
    chart_container.value.style.height = `${props.height}px`;

    context = canvas.getContext('2d');
    context.scale(pixel_ratio, pixel_ratio);

    x_scale = d3.scaleLinear()
        .domain(d3.extent(dataset, d => d.x))
        .range([0.0, props.width]);

    y_scale = d3.scaleLinear()
        .domain(d3.extent(dataset, d => d.y))
        .range([props.height - 1, 1]);

    zoom = d3.zoom()
        .scaleExtent([0.1, 100])
        .on('zoom', handle_zoom);

    const canvas_selection = d3.select(canvas);
    canvas_selection.call(zoom);
    canvas_selection.on('mousemove', handle_mouse_move);
    canvas_selection.on('click', handle_click);

    draw(d3.zoomIdentity);
}

// draw single point
function draw_point(x, y, radius, color, opacity) {
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fillStyle = color;
    context.globalAlpha = opacity;
    context.fill();
}

// main drawing function
function draw(transform) {
    context.fillStyle = 'white';
    context.clearRect(0, 0, props.width, props.height);
    context.fillRect(0, 0, props.width, props.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    let clicked_point = null;
    const selected_points = [];
    const hovered_points = [];
    const other_points = [];

    // collect points by type
    dataset.forEach(d => {
        if (d.is_dead !== 0) return;

        const x = transform.applyX(x_scale(d.x));
        const y = transform.applyY(y_scale(d.y));
        const radius = get_radius(d, transform);

        const color_mult = 255;
        let color = "rgba(" + d.color.map(c => c * color_mult).join(",") + ")";
        let opacity = ORIGINAL_OPACITY;

        if (d.id === current_clicked_id) {
            color = CLICK_COLOR;
            opacity = 1.0;
            clicked_point = { x, y, radius, color, opacity };
        } else if (current_selected_ids.includes(d.id)) {
            color = SELECTED_COLOR;
            opacity = 0.9;
            selected_points.push({ x, y, radius, color, opacity });
        } else if (d.id === hovered_point_id) {
            color = HOVER_COLOR;
            opacity = 1.0;
            hovered_points.push({ x, y, radius, color, opacity });
        } else {
            other_points.push({ x, y, radius, color, opacity });
        }
    });

    // draw regular points first
    other_points.forEach(p => draw_point(p.x, p.y, p.radius, p.color, p.opacity));

    // draw connections
    if (co_occurring_concepts.value.length > 0 && clicked_point) {
        const x2 = clicked_point.x;
        const y2 = clicked_point.y;
        context.strokeStyle = STROKE_COLOR;

        const max_link_value = Math.max(...co_occurring_concepts.value.map(d => d.links_value));

        co_occurring_concepts.value.forEach(d => {
            const x1 = transform.applyX(x_scale(d.x));
            const y1 = transform.applyY(y_scale(d.y));
            context.lineWidth = d.links_value / max_link_value * 5.0;

            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2 - 50;

            context.beginPath();
            context.moveTo(x1, y1);
            context.quadraticCurveTo(cx, cy, x2, y2);
            context.stroke();
        });
    }

    // draw highlighted points on top
    selected_points.forEach(p => draw_point(p.x, p.y, p.radius, p.color, p.opacity));
    hovered_points.forEach(p => draw_point(p.x, p.y, p.radius, p.color, p.opacity));
    if (clicked_point) {
        draw_point(clicked_point.x, clicked_point.y, clicked_point.radius, clicked_point.color, clicked_point.opacity);
    }
}

// handle zoom
function handle_zoom(event) {
    draw(event.transform);
}

// handle mouse movement
function handle_mouse_move(event) {
    const transform = d3.zoomTransform(canvas);
    const [mouse_x, mouse_y] = d3.pointer(event);
    const data_x = transform.invertX(mouse_x);
    const data_y = transform.invertY(mouse_y);

    let closest_point = null;
    let min_distance = Infinity;

    dataset.forEach(d => {
        if (d.is_dead !== 0) return;

        const x = x_scale(d.x);
        const y = y_scale(d.y);
        const distance = Math.sqrt((x - data_x) ** 2 + (y - data_y) ** 2);
        const hit_radius = get_radius(d, transform) * 2 * transform.k;

        if (distance < hit_radius && distance < min_distance) {
            min_distance = distance;
            closest_point = d;
        }
    });

    if (closest_point?.id !== hovered_point_id) {
        hovered_point_id = closest_point?.id || null;
        draw(d3.zoomTransform(canvas));
    }
}

// handle click
function handle_click(event) {
    if (hovered_point_id !== null) {
        const clicked_point = dataset.find(d => d.id === hovered_point_id);
        if (clicked_point) {
            on_point_click(clicked_point);
        }
    }
}

// process point click
function on_point_click(point) {
    current_clicked_id = point.id;
    const neighbors = find_nearest_points(point, dist_neighbours.value);
    current_selected_ids = neighbors.map(d => d.id);

    selected_point.value = neighbors;
    drawer.value = true;

    co_occurring_concepts.value = point.links.map((id, index) => {
        const linked_concept = dataset.find(d => d.id === id);
        if (linked_concept) {
            return {
                ...linked_concept,
                links_value: point.links_value[index],
            };
        }
        return null;
    }).filter(Boolean);

    draw(d3.zoomTransform(canvas));
}

// find nearby points
function find_nearest_points(target, dist) {
    dist = Number(dist);

    let distances = dataset.map(d => {
        const dx = d.x - target.x;
        const dy = d.y - target.y;
        return { point: d, distance: Math.sqrt(dx * dx + dy * dy) };
    });

    distances = distances.filter(obj => obj.distance <= dist * 0.05);
    distances = distances.sort((a, b) => b.point.normalized_energy - a.point.normalized_energy);
    distances = distances.filter(obj => obj.point.id != target.id);
    distances = distances.filter(obj => obj.point.is_dead == 0);
    distances.unshift({ point: target, distance: 0 });

    return distances.map(obj => obj.point);
}

// watch for display option changes
watch(use_energy, () => {
    if (canvas) draw(d3.zoomTransform(canvas));
});

// watch for selected id
watch(selected_id, () => {
    if (selected_id.value !== null && selected_id.value !== '') {
        const found_point = dataset.find(d => d.id === Number(selected_id.value));
        if (found_point) {
            on_point_click(found_point);
        } else {
            selected_point.value = null;
            current_clicked_id = null;
            current_selected_ids = [];
            co_occurring_concepts.value = [];
        }
    }
});

// watch for distance changes
watch(dist_neighbours, () => {
    if (current_clicked_id !== null) {
        const point = dataset.find(d => d.id === current_clicked_id);
        if (point) on_point_click(point);
    }
});

watch(auto_opacity_cycle, (enabled) => {
    if (enabled) {
        let t = 0;
        opacity_interval = setInterval(() => {
            // smoothly go 0 → 1 → 0 with a 3 sec period
            t += 50;
            const seconds = (t % 3000) / 3000;
            global_heatmap_opacity.value = 0.5 * (1 + Math.sin(2 * Math.PI * seconds - Math.PI / 2)); // sine wave from 0 to 1
        }, 50);
    } else {
        clearInterval(opacity_interval);
        opacity_interval = null;
    }
});
</script>

<style scoped>
.chart-container {
    border: 1px solid rgba(13, 13, 21, 0.3);
    text-align: center;
    overflow: hidden;
    border-radius: 3px;
    margin: auto;
}

.canvas-container {
    padding: 20px;
}

.explanation-card {
    font-size: 0.9em;
    margin-top: 10px;
}

img.compact {
    object-fit: cover;
}

img {
    object-fit: contain;
    width: 100%;
    height: 100%;
}

.v-responsive__sizer {
    padding-bottom: 0 !important;
}

pre {
    display: inline-block;
    text-wrap: auto;
    background-color: #e2e8f0;
    border-radius: 2px;
    padding: 10px;
    overflow: hidden;
    color: #020617;
}

.data-card {
    transition: all 0.2s ease;
    opacity: 0.8;
    border: dashed 2px transparent;
    margin: 3px;
    border-radius: 3px;
}

.data-card:hover {
    opacity: 1.0;
    border-color: #cbd5e1;
}

.gradient-bar {
    height: 12px;
    width: 120px;
    background: linear-gradient(to right, #65c7de, #5776b4, #582949, #b16243, #e8b548);
    border-radius: 6px;
}

.caption {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
}
</style>
