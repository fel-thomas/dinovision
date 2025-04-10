<template>
    <div class="canvas-container">
        <v-toolbar>
            <v-toolbar-title>UMAP Options</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-toolbar-items>
                <div style="margin-right: 30px; width: 150px; margin-top: 5px;">
                    <v-text-field label="Distance" placeholder="Distance to neighbours" variant="filled"
                        v-model="distNeighbours"></v-text-field>
                </div>
                <div style="margin-right: 30px; width: 150px; margin-top: 5px;">
                    <v-text-field label="Size" placeholder="Point size" variant="filled"
                        v-model="pointSize"></v-text-field>
                </div>
                <div style="margin-right: 30px;">
                    <v-checkbox v-model="useEnergy" label="Energy" />
                </div>
            </v-toolbar-items>
        </v-toolbar>
        <div ref="chartContainer" class="chart-container"></div>
        <v-navigation-drawer v-model="drawer" location="end" width="800" expand-on-hover rail rail-width="600"
            elevation="10">
            <v-toolbar app dark fixed>
                <v-toolbar-title>Visualization options</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-toolbar-items>
                    <div style="margin-right: 30px;">
                        <v-checkbox v-model="compactImage" label="Compact" />
                    </div>
                    <!-- button the close the drawer -->
                    <v-btn icon @click="drawer = false">
                        <v-icon>mdi-close</v-icon>
                    </v-btn>
                </v-toolbar-items>
            </v-toolbar>
            <!-- Show concept.id, then put an image using id as url https://concept/id.webp -->
            <!-- only show this if selectedPoint is not null -->
            <v-card v-if="selectedPoint">
                <div v-for="item in selectedPoint" :key="item.id">
                    <v-card-title>
                        <!-- color for chip passport is yellow if first element else purple -->
                        <v-chip :color="item.id == selectedPoint[0].id ? 'green' : 'purple'" class="ma-2">
                            <v-icon>mdi-passport</v-icon>
                            {{ item.id }}
                        </v-chip>
                        <v-chip color="pink" class="ma-2">
                            <v-icon>mdi-fire</v-icon>
                            {{ item.energy }}
                        </v-chip>
                    </v-card-title>
                    <v-card-text>
                        <!-- display the full image if compactImage is false -->
                        <v-img
                            :src="'https://kempner-prod-thomasfel-storage.s3.amazonaws.com/dinov2/top_heatmaps/' + item.id + '.webp'"
                            :class="{ 'compact': compactImage }" />
                    </v-card-text>
                </div>
            </v-card>
        </v-navigation-drawer>
    </div>
</template>

<script setup>

import * as d3 from 'd3';
import { onMounted, ref, watch } from 'vue';
import data from '@/assets/data.json';
import { clamp } from '@/assets/math_utils';

// Props: just a few for demonstration
const props = defineProps({
    width: {
        type: Number,
        default: 1200 - 40,
    },
    height: {
        type: Number,
        default: 600,
    },
});

const chartContainer = ref(null);
const drawer = ref(false);
const selectedPoint = ref(null);
const useEnergy = ref(true);
const distNeighbours = ref(3.0);
const pointSize = ref(1.0);
const compactImage = ref(true);

let canvas, context, xScale, yScale, zoom;

const nb_concepts = 32000
const ORIGINAL_OPACITY = 0.7
const ORIGINAL_COLOR = '#64748B'
const HOVER_COLOR = '#4ADE80'

const CLICK_COLOR = '#4ADE80'
const SELECTED_COLOR = '#818CF8'

let CURRENT_CLICK_ID = null
let CURRENT_SELECTED_ID = []
let hoveredPointId = null;

const dataset = []
// we can't use .map() on data, but we can use 'i' index as string
const energies = [...Array(nb_concepts).keys()].map(i => data[i].energy)
const max_energy = Math.max(...energies)
for (let i = 0; i < nb_concepts; i++) {
    let obj = {
        id: i,
        ...data[i]
    }
    // add normalized energy
    obj.normalized_energy = obj.energy / max_energy
    dataset.push(obj)
}

onMounted(() => {
    createChart();
});

function createChart() {
    // Clear container
    chartContainer.value.innerHTML = '';

    // Create canvas
    canvas = d3.select(chartContainer.value)
        .append('canvas')
        .attr('width', props.width)
        .attr('height', props.height)
        .style('display', 'block')
        .node();

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = props.width * pixelRatio;
    canvas.height = props.height * pixelRatio;
    canvas.style.width = `${props.width}px`;
    canvas.style.height = `${props.height}px`;

    // change also the chartContainer style
    chartContainer.value.style.width = `${props.width}px`;
    chartContainer.value.style.height = `${props.height}px`;

    context = canvas.getContext('2d');
    context.scale(pixelRatio, pixelRatio);

    // Create scales
    xScale = d3.scaleLinear()
        .domain(d3.extent(dataset, d => d.x))
        .range([50, props.width - 50]);

    yScale = d3.scaleLinear()
        .domain(d3.extent(dataset, d => d.y))
        .range([props.height - 50, 50]);

    // Attach d3.zoom to canvas
    zoom = d3.zoom()
        .scaleExtent([0.5, 10])
        .on('zoom', handleZoom);

    // Create a d3 selection for the canvas to apply zoom
    const canvasSelection = d3.select(canvas);
    canvasSelection.call(zoom);

    // Handle mouse events
    canvasSelection.on('mousemove', handleMouseMove);
    canvasSelection.on('click', handleClick);

    // Initial draw
    draw(d3.zoomIdentity);
}

function draw_single_point(x, y, radius, color, opacity) {
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fillStyle = color;
    context.globalAlpha = opacity;
    context.fill();
}

function draw(transform) {
    // Clear canvas
    context.clearRect(0, 0, props.width, props.height);

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    // prepare all the points, then draw first the one we have clicked on, then the selected ones,
    // then the hovered one, then the others
    let clicked_point = null
    let selected_points = []
    let hovered_points = []
    let other_points = []

    dataset.forEach(d => {
        // Apply zoom transform
        const x = transform.applyX(xScale(d.x));
        const y = transform.applyY(yScale(d.y));

        // Calculate radius, scaled by zoom
        let radius = 1;
        if (useEnergy.value) {
            radius = clamp(Math.sqrt(d.normalized_energy) * 35.0, 0.3, 5);
        }
        radius *= transform.k;
        radius *= pointSize.value;

        // Set color and opacity based on point state
        let color = ORIGINAL_COLOR;
        let opacity = ORIGINAL_OPACITY;
        let zindex = 0;
        if (d.id === CURRENT_CLICK_ID) {
            color = CLICK_COLOR;
            opacity = 1.0;
            clicked_point = { x, y, radius, color, opacity, zindex }
        } else if (CURRENT_SELECTED_ID.includes(d.id)) {
            color = SELECTED_COLOR;
            opacity = 0.9;
            selected_points.push({ x, y, radius, color, opacity, zindex })
        } else if (d.id === hoveredPointId) {
            color = HOVER_COLOR;
            opacity = 1.0;
            hovered_points.push({ x, y, radius, color, opacity, zindex })
        } else {
            other_points.push({ x, y, radius, color, opacity, zindex })
        }
    });

    // draw the points
    other_points.forEach(p => draw_single_point(p.x, p.y, p.radius, p.color, p.opacity))
    selected_points.forEach(p => draw_single_point(p.x, p.y, p.radius, p.color, p.opacity))
    hovered_points.forEach(p => draw_single_point(p.x, p.y, p.radius, p.color, p.opacity))
    clicked_point && draw_single_point(clicked_point.x, clicked_point.y, clicked_point.radius, clicked_point.color, clicked_point.opacity)
}

function handleZoom(event) {
    draw(event.transform);
}

function handleMouseMove(event) {
    const transform = d3.zoomTransform(canvas);
    const [mouseX, mouseY] = d3.pointer(event);

    // Convert mouse coordinates to data space
    const dataX = transform.invertX(mouseX);
    const dataY = transform.invertY(mouseY);

    // Find closest point
    let closestPoint = null;
    let minDistance = Infinity;

    dataset.forEach(d => {
        const x = xScale(d.x);
        const y = yScale(d.y);
        const distance = Math.sqrt((x - dataX) ** 2 + (y - dataY) ** 2);

        // Get point radius for hit detection
        let radius = 1;
        if (useEnergy.value) {
            radius = clamp(Math.sqrt(d.normalized_energy) * 35.0, 0.3, 5);
        }

        // Slightly larger hit area for better UX
        const hitRadius = radius * 2;

        if (distance < hitRadius && distance < minDistance) {
            minDistance = distance;
            closestPoint = d;
        }
    });

    // Update hover state if changed
    if (closestPoint?.id !== hoveredPointId) {
        hoveredPointId = closestPoint?.id || null;
        draw(d3.zoomTransform(canvas));
    }
}

function handleClick(event) {
    if (hoveredPointId !== null) {
        const clickedPoint = dataset.find(d => d.id === hoveredPointId);
        if (clickedPoint) {
            onPointClick(clickedPoint);
        }
    }
}

function onPointClick(point) {
    CURRENT_CLICK_ID = point.id;
    const neighbors = findNearestPoints(point, distNeighbours.value);
    CURRENT_SELECTED_ID = neighbors.map(d => d.id);

    // Update UI components
    selectedPoint.value = neighbors;
    drawer.value = true;

    // Redraw with selection
    draw(d3.zoomTransform(canvas));
}

function resetPoints() {
    CURRENT_CLICK_ID = null;
    CURRENT_SELECTED_ID = [];
    draw(d3.zoomTransform(canvas));
}

function findNearestPoints(target, dist) {
    dist = Number(dist)
    let distances = dataset.map(d => {
        const dx = d.x - target.x;
        const dy = d.y - target.y;
        return { point: d, distance: Math.sqrt(dx * dx + dy * dy) };
    });
    distances = distances.filter(obj => obj.distance <= dist * 0.05);
    // sort by energy value, higher first, but the one with have clicked on is first
    distances = distances.sort((a, b) => b.point.energy - a.point.energy);
    // now we have to remove the one we have clicked on
    distances = distances.filter(obj => obj.point.id != target.id);
    // we put it back at the beginning
    distances.unshift({ point: target, distance: 0 });
    // we keep only the point
    distances = distances.map(obj => obj.point)
    return distances
}

// Watch for changes to useEnergy
watch(useEnergy, () => {
    console.log('useEnergy changed:', useEnergy.value);
    // Just redraw with current transform
    if (canvas) {
        draw(d3.zoomTransform(canvas));
    }
});

// Watch for changes to distNeighbours
watch(distNeighbours, () => {
    if (CURRENT_CLICK_ID !== null) {
        const selectedPoint = dataset.find(d => d.id === CURRENT_CLICK_ID);
        if (selectedPoint) {
            onPointClick(selectedPoint);
        }
    }
});

</script>

<style>
.chart-container {
    border: 1px solid rgba(13, 13, 21, 0.3);
    text-align: center;
    /* make container as wide as the svg chart */
    display: inline-block;
    /* overflow: hidden; */
    /* position: relative; */
    border-radius: 3px;
}

.canvas-container {
    padding: 20px;
}

.compact {
    width: 100%;
    position: relative;
    padding-top: 20%;
    overflow: hidden;
}

.compact img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
}

.v-responsive__sizer {
    padding-bottom: 0 !important;
}
</style>
