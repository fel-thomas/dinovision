<template>
    <div class="canvas-container">
        <v-toolbar>
            <v-toolbar-title>umap options</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-toolbar-items>
                <div style="margin-right: 30px; width: 150px; margin-top: 5px;">
                    <v-text-field label="specific id" placeholder="enter concept id" variant="filled"
                        v-model="selected_id"></v-text-field>
                </div>
                <div style="margin-right: 30px; width: 150px; margin-top: 5px;">
                    <v-text-field label="distance" placeholder="distance to neighbours" variant="filled"
                        v-model="dist_neighbours"></v-text-field>
                </div>
                <div style="margin-right: 30px; width: 150px; margin-top: 5px;">
                    <v-text-field label="size" placeholder="point size" variant="filled"
                        v-model="point_size"></v-text-field>
                </div>
                <div style="margin-right: 30px;">
                    <v-checkbox v-model="use_energy" label="energy" />
                </div>
                <div style="margin-right: 10px; width: 150px; margin-top:10px">
                    <div class="text-caption">
                        heatmap opacity
                    </div>
                    <v-slider v-model="global_heatmap_opacity" step="0.01" min="0" max="1" thumb-label></v-slider>
                </div>
                <div style="margin-right: 30px;">
                    <v-checkbox v-model="auto_opacity_cycle" label="auto opacity" />
                </div>
            </v-toolbar-items>
        </v-toolbar>

        <div ref="chart_container" class="chart-container"></div>

        <HelperComponent />

        <v-navigation-drawer v-model="drawer" location="end" width="600" rail rail-width="600" elevation="10">
            <v-toolbar app dark fixed>
                <v-toolbar-title>details</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn icon @click="drawer = false">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-toolbar>

            <v-tabs v-model="active_tab" bg-color="dark" dark>
                <v-tab value="selected">selected</v-tab>
                <v-tab value="cooccurrence">co-occurrence</v-tab>
            </v-tabs>

            <v-window v-model="active_tab">
                <v-window-item value="selected">
                    <v-card v-if="selected_point">
                        <item-component v-for="item in selected_point" :key="item.id" :item="item"
                            :highlight="item.id === selected_point[0].id" :compact-image="compact_image"
                            :opacity="global_heatmap_opacity" />
                    </v-card>
                </v-window-item>

                <v-window-item value="cooccurrence">
                    <v-card v-if="co_occurring_concepts.length > 0">
                        <item-component v-for="item in co_occurring_concepts" :key="item.id" :item="item"
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
import data_dino from '@/assets/dinovision_website_data.json'
import { create_dataset, get_radius, find_nearest_points, constants } from '@/assets/data_processor.js';
import ItemComponent from './item.vue';
import HelperComponent from './helper.vue';

const props = defineProps({
    width: { type: Number, default: 1560 },
    height: { type: Number, default: 800 },
});

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
const auto_opacity_cycle = ref(true);
let opacity_interval = null;

let data = data_dino;
let canvas, context, x_scale, y_scale, zoom;
let current_clicked_id = null;
let current_selected_ids = [];
let hovered_point_id = null;

const dataset = create_dataset(data);

function draw_point(x, y, radius, color, opacity) {
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fillStyle = color;
    context.globalAlpha = opacity;
    context.fill();
}

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

    dataset.forEach(d => {
        if (d.is_dead !== 0) return;

        const x = transform.applyX(x_scale(d.x));
        const y = transform.applyY(y_scale(d.y));
        const radius = get_radius(d, transform, use_energy.value, point_size.value);

        const color_mult = 255;
        let color = "rgba(" + d.color.map(c => c * color_mult).join(",") + ")";
        let opacity = constants.ORIGINAL_OPACITY;

        if (d.id === current_clicked_id) {
            color = constants.CLICK_COLOR;
            opacity = 1.0;
            clicked_point = { x, y, radius, color, opacity };
        } else if (current_selected_ids.includes(d.id)) {
            color = constants.SELECTED_COLOR;
            opacity = 0.9;
            selected_points.push({ x, y, radius, color, opacity });
        } else if (d.id === hovered_point_id) {
            color = constants.HOVER_COLOR;
            opacity = 1.0;
            hovered_points.push({ x, y, radius, color, opacity });
        } else {
            other_points.push({ x, y, radius, color, opacity });
        }
    });

    other_points.forEach(p => draw_point(p.x, p.y, p.radius, p.color, p.opacity));

    if (co_occurring_concepts.value.length > 0 && clicked_point) {
        const x2 = clicked_point.x;
        const y2 = clicked_point.y;
        context.strokeStyle = constants.STROKE_COLOR;

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

    selected_points.forEach(p => draw_point(p.x, p.y, p.radius, p.color, p.opacity));
    hovered_points.forEach(p => draw_point(p.x, p.y, p.radius, p.color, p.opacity));
    if (clicked_point) {
        draw_point(clicked_point.x, clicked_point.y, clicked_point.radius, clicked_point.color, clicked_point.opacity);
    }
}

function handle_zoom(event) {
    draw(event.transform);
}

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
        const hit_radius = get_radius(d, transform, use_energy.value, point_size.value) * 2 * transform.k;

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

function handle_click(event) {
    if (hovered_point_id !== null) {
        const clicked_point = dataset.find(d => d.id === hovered_point_id);
        if (clicked_point) {
            on_point_click(clicked_point);
        }
    }
}

function on_point_click(point) {
    current_clicked_id = point.id;
    const neighbors = find_nearest_points(dataset, point, dist_neighbours.value);
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

onMounted(() => create_chart());

watch(use_energy, () => {
    if (canvas) draw(d3.zoomTransform(canvas));
});

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
            t += 50;
            const seconds = (t % 3000) / 3000;
            global_heatmap_opacity.value = 0.5 * (1 + Math.sin(2 * Math.PI * seconds - Math.PI / 2));
        }, 50);
    } else {
        clearInterval(opacity_interval);
        opacity_interval = null;
    }
}, { immediate: true });
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