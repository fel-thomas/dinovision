<template>
    <v-card class="data-card">
        <v-card-title>
            <v-chip :color="highlight ? 'purple' : 'blue-grey'" class="ma-2">
                <v-icon>mdi-passport</v-icon>
                {{ item.id }}
            </v-chip>
            <v-chip color="orange" class="ma-2">
                <v-icon>mdi-image-area</v-icon>
                {{ parseInt(item.nb_fire / 256, 10) }}
            </v-chip>

            <v-btn icon size="small" class="ml-2" @click="copyVisibleImage('base')">
                <v-icon size="18">mdi-content-copy</v-icon>
            </v-btn>
            <v-btn icon size="small" class="ml-1" @click="copyVisibleImage('heatmap')">
                <v-icon size="18">mdi-fire</v-icon>
            </v-btn>
        </v-card-title>

        <div class="fviz">
            <img class="fviz-image" :src="fvizUrl" crossorigin="anonymous" />
        </div>

        <v-card-text>
            <div class="image-stack-container" :class="{ compact: compactImage }">
                <div v-if="!baseLoaded || !heatmapLoaded" class="loading-overlay">
                    <v-progress-circular indeterminate color="primary" />
                </div>

                <img ref="baseImageRef" class="base-image" :src="imageUrl" crossorigin="anonymous"
                    @load="baseLoaded = true" />

                <img ref="heatmapImageRef" class="heatmap-image" :src="heatmapUrl" :style="{ opacity }"
                    crossorigin="anonymous" @load="heatmapLoaded = true" />
            </div>
        </v-card-text>
    </v-card>
</template>


<script setup>
import { ref, nextTick } from 'vue';

const props = defineProps({
    item: Object,
    highlight: Boolean,
    compactImage: {
        type: Boolean,
        default: false,
    },
    opacity: {
        type: Number,
        default: 0.6,
    },
});

const imageUrl = `https://kempner-prod-thomasfel-storage.s3.amazonaws.com/dinov2/${props.item.id}_image.webp`;
const heatmapUrl = `https://kempner-prod-thomasfel-storage.s3.amazonaws.com/dinov2/${props.item.id}_heatmap.webp`;
const fvizUrl = `https://kempner-prod-thomasfel-storage.s3.amazonaws.com/dinov2_fviz/fviz_${props.item.id}.webp`;

const baseImageRef = ref(null);
const heatmapImageRef = ref(null);
const baseLoaded = ref(false);
const heatmapLoaded = ref(false);

async function copyVisibleImage(type = 'base') {
    await nextTick();

    const imgEl = type === 'base' ? baseImageRef.value : heatmapImageRef.value;
    if (!imgEl?.complete) {
        console.warn('⛔ image not loaded yet');
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0);

    canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob }),
            ]);
            console.log(`✅ ${type} image copied to clipboard`);
        } catch (err) {
            console.error('❌ clipboard write failed', err);
        }
    }, 'image/png');
}
</script>

<style scoped>
.data-card {
    transition: all 0.2s ease;
    opacity: 0.9;
    border: dashed 2px transparent;
    margin: 3px;
    border-radius: 3px;
}

.data-card:hover {
    opacity: 1.0;
    border-color: #cbd5e1;
}

.image-stack-container {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 4px;
    display: inline-block;
}

.image-stack-container img,
.image-stack-container .v-img {
    display: block;
    width: 100%;
    height: auto;
    object-fit: contain;
}

.base-image,
.heatmap-image {
    position: relative;
    z-index: 1;
}

.base-image {
    mix-blend-mode: normal;
    filter: saturate(1.0) contrast(1.0);
    transition: filter 0.2s ease;
}

.data-card:hover .base-image {
    filter: saturate(1.1) contrast(1.1);
}

.heatmap-image {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    pointer-events: none;
    mix-blend-mode: normal;
}

.fviz {
    position: absolute;
    top: 5px;
    left: 320px;
    width: 56px;
    height: 56px;
    z-index: 30;
    opacity: 1;
    transition: all 0.3s ease-in-out;
    border-radius: 50%;
    overflow: hidden;
    background: none;
    box-shadow: none;
}

.fviz img {
    opacity: 1;
    width: 100%;
    height: 100%;
    background-color: none;
    box-shadow: none;
    user-select: none;
}

.data-card:hover .fviz {
    /*transform: scale(1.5) translateY(35px) translateX(35px);*/
    transform: scale(1.2);
}
</style>
