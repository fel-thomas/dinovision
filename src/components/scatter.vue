<template>
    <h2>Scatter Plot Demo</h2>
    <!-- add toggle that control if we use energy to scale the points -->
    <!-- create a toolbar with a lot of option panel with a v-checkbox to toggle useEnergy -->
    <v-toolbar>
        <v-toolbar-title>Options</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-toolbar-items>
            <div style="margin-right: 30px; width: 150px; margin-top: 5px;">
                <v-text-field label="Distance" placeholder="Distance to neighbours" variant="filled"
                    v-model="distNeighbours"></v-text-field>
            </div>
            <div style="margin-right: 30px;">
                <v-checkbox v-model="useEnergy" label="Energy" />
            </div>
        </v-toolbar-items>
    </v-toolbar>




    <div ref="chartContainer" class="chart-container"></div>
    <v-navigation-drawer v-model="drawer" location="end" width="800" expand-on-hover rail rail-width="600">
        <!-- Show concept.id, then put an image using id as url https://concept/id.webp -->
        <!-- only show this if selectedPoint is not null -->
        <v-card v-if="selectedPoint">
            <div v-for="item in selectedPoint" :key="item.id">
                <v-card-title>
                    <!-- color for chip passport is yellow if first element else purple -->
                    <v-chip :color="item.id == selectedPoint[0].id ? 'amber' : 'purple'" class="ma-2">
                        <v-icon>mdi-passport</v-icon>
                        {{ item.id }}
                    </v-chip>
                    <v-chip color="pink" class="ma-2">
                        <v-icon>mdi-fire</v-icon>
                        {{ item.energy }}
                    </v-chip>
                </v-card-title>
                <v-card-text>
                    <v-img
                        :src="'https://storage.googleapis.com/serrelab/prj_fossils/fossil_v8/heatmaps/' + item.id + '.webp'" />
                </v-card-text>
            </div>
        </v-card>
    </v-navigation-drawer>

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
        default: 1200,
    },
    height: {
        type: Number,
        default: 800,
    },
});

const chartContainer = ref(null);
const drawer = ref(false);
const selectedPoint = ref(null);
const useEnergy = ref(true);
const distNeighbours = ref(1.0);

let svg, mainGroup, xScale, yScale;

const nb_concepts = 32000
const ORIGINAL_OPACITY = 0.7
const ORIGINAL_COLOR = '#64748B'
const ACTIVE_COLOR = '#60A5FA'

const CLICK_COLOR = '#FACC15'
const SELECTED_COLOR = '#818CF8'

let CURRENT_CLICK_ID = null
let CURRENT_SELECTED_ID = []


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
console.log(dataset[0])

onMounted(() => {
    createChart();
});

function createChart() {
    svg = d3.select(chartContainer.value)
        .append('svg')
        .attr('width', props.width)
        .attr('height', props.height);

    // X/Y scales (domain from data, range from left/right or top/bottom)
    xScale = d3.scaleLinear()
        .domain(d3.extent(dataset, d => d.x))
        .range([50, props.width - 50]);

    yScale = d3.scaleLinear()
        .domain(d3.extent(dataset, d => d.y))
        .range([props.height - 50, 50]);

    // Group to hold all points and be transformed on zoom/pan
    mainGroup = svg.append('g');

    // Draw points
    drawPoints();

    // Add zoom & pan behavior
    const zoomBehavior = d3.zoom()
        .scaleExtent([0.5, 10])
        .translateExtent([[0, 0], [props.width, props.height]])
        .on('zoom', event => {
            mainGroup.attr('transform', event.transform);
        });

    svg.call(zoomBehavior);
}

// --------------------------------------------------
// 2) Draw circles for each data point
// --------------------------------------------------
function drawPoints() {
    mainGroup
        .selectAll('.data-point')
        .data(dataset)
        .enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('cx', d => xScale(d.x))
        .attr('cy', d => yScale(d.y))
        .attr('r', d => {
            if (useEnergy.value) {
                return clamp(Math.sqrt(d.normalized_energy) * 35.0, 0.3, 5)
            }
            return 1
        })
        .attr('opacity', ORIGINAL_OPACITY)
        .attr('fill', ORIGINAL_COLOR)
        .attr('stroke', 'none')
        .on('mouseover', (event, d) => {
            // transition to border of the same color than point with opacity 0.5
            d3.select(event.currentTarget)
                .filter(d => d.id != CURRENT_CLICK_ID && !CURRENT_SELECTED_ID.includes(d.id))
                .transition()
                .duration(100)
                .attr('fill', ACTIVE_COLOR)
                .attr('stroke', ACTIVE_COLOR)
                .attr('stroke-width', 2)
                .attr('opacity', 1.0)

        })
        .on('mouseout', (event, d) => {
            // transition back
            d3.select(event.currentTarget)
                .filter(d => d.id != CURRENT_CLICK_ID && !CURRENT_SELECTED_ID.includes(d.id))
                .transition()
                .duration(100)
                .attr('fill', ORIGINAL_COLOR)
                .attr('stroke', 'none')
                .attr('stroke-width', 0)
                .attr('opacity', ORIGINAL_OPACITY);

        })
        .on('click', (event, d) => {
            // Stop the event from propagating to the zoom/pan handler
            event.stopPropagation();
            onPointClick(d);
        });
}

function resetPoints() {
    mainGroup.selectAll('.data-point')
        .attr('fill', ORIGINAL_COLOR)
        .attr('stroke', 'none')
        .attr('stroke-width', 0)
        .attr('opacity', ORIGINAL_OPACITY);
}

function onPointClick(point) {
    resetPoints();
    console.log('Clicked point:', point);
    const neighbors = findNearestPoints(point, distNeighbours.value);

    CURRENT_SELECTED_ID = point.id
    CURRENT_SELECTED_ID = neighbors.map(d => d.id)

    console.log(`Nearest ${neighbors.length} neighbors:`, neighbors);
    console.log(CURRENT_SELECTED_ID)
    // apply a color to the neighbors
    mainGroup.selectAll('.data-point')
        .filter(d => CURRENT_SELECTED_ID.includes(d.id) && d.id != point.id)
        .transition()
        .duration(100)
        .attr('fill', SELECTED_COLOR)
        .attr('opacity', ORIGINAL_OPACITY);
    // apply a color to the selected point
    mainGroup.selectAll('.data-point')
        .filter(d => d.id == point.id)
        .attr('fill', CLICK_COLOR)
        .attr('stroke', CLICK_COLOR)
        .attr('stroke-width', 2)
        .attr('opacity', ORIGINAL_OPACITY);

    selectedPoint.value = neighbors
    drawer.value = true;
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

// redraw the chart when useEnergy changes
watch(useEnergy, () => {
    // remove all points
    console.log('useEnergy changed, redrawing chart', useEnergy.value);
    mainGroup.selectAll('.data-point').remove();
    drawPoints();
});

</script>

<style scoped>
.chart-container {
    border: 1px solid #ccc;
    margin: 20px;
    text-align: center;
    /* make container as wide as the svg chart */
    display: inline-block;
    /* overflow: hidden; */
    /* position: relative; */

}
</style>
