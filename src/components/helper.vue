<template>
    <v-card class="mt-2 pa-4 explanation-card">
        <v-card-title class="text-h6 font-weight-bold mb-2">
            Understanding the Visualization
        </v-card-title>

        <v-card-text class="pa-0">
            <v-container fluid class="pa-0">
                <v-row>
                    <v-col cols="12" md="5">
                        <div class="text-body-2 mb-4">
                            <p class="mb-3">
                                This 2D UMAP projection displays <strong>32,000+ concept vectors</strong> extracted from
                                DINOv2 using
                                <a href="https://arxiv.org/abs/2502.12892" target="_blank">RA-SAE</a>. Each point
                                represents a concept: a
                                learned direction in the high-dimensional embedding space capturing specific visual
                                patterns.
                            </p>

                            <div class="mb-4">
                                <h4 class="text-subtitle-2 font-weight-bold mb-2">Visual Elements</h4>
                                <v-row dense>
                                    <v-col cols="12" sm="6">
                                        <div class="d-flex align-center mb-2">
                                            <v-icon color="primary" size="small" class="mr-2">mdi-circle</v-icon>
                                            <span><strong>Point size:</strong> is proportional to activation
                                                frequency</span>
                                        </div>
                                        <div class="d-flex align-center mb-2">
                                            <v-icon color="secondary" size="small" class="mr-2">mdi-palette</v-icon>
                                            <span><strong>Point color:</strong> if a concept is selected, its color
                                                indicates turn purple</span>
                                        </div>
                                    </v-col>
                                    <v-col cols="12" sm="6">
                                        <div class="d-flex align-center mb-2">
                                            <v-icon color="accent" size="small" class="mr-2">mdi-connection</v-icon>
                                            <span><strong>Lines:</strong> co-occurrence patterns, two concept are linked
                                                if they tend to co-fire </span>
                                        </div>
                                        <div class="d-flex align-center mb-2">
                                            <v-icon color="info" size="small"
                                                class="mr-2">mdi-map-marker-distance</v-icon>
                                            <span><strong>Proximity:</strong> concept similarity, two concept are close
                                                if they cosine similarity is high</span>
                                        </div>
                                    </v-col>
                                </v-row>
                            </div>

                            <!-- Interaction Section -->
                            <div class="mb-4">
                                <h4 class="text-subtitle-2 font-weight-bold mb-2">Interaction</h4>
                                <div class="d-flex flex-wrap gap-2 mb-2">
                                    To start, you can click any point to explore that concept's examples and properties.
                                    You can then inspect on which images the concept activates most strongly, view its
                                    token map, and see related concepts based on co-occurrence and similarity.
                                </div>
                            </div>

                            <div class="mb-3">
                                <h4 class="text-subtitle-2 font-weight-bold mb-2">Concept Data</h4>
                                <div class="d-flex flex-wrap gap-3">
                                    <div class="d-flex flex-column align-center">
                                        <v-chip color="black" size="small">
                                            <v-icon start size="x-small">mdi-passport</v-icon>
                                            123
                                        </v-chip>
                                        <span class="mt-1">Concept ID</span>
                                    </div>
                                    <div class="d-flex flex-column align-center">
                                        <v-chip color="orange" size="small">
                                            <v-icon start size="x-small">mdi-image-area</v-icon>
                                            456
                                        </v-chip>
                                        <span class="mt-1">Nb fire</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </v-col>

                    <v-col cols="12" md="5">
                        <div class="d-flex flex-column h-100">
                            <div class="text-left mb-3">
                                <img src="@/assets/images/how_to_interpret.png" alt="Token structure explanation"
                                    style="max-width: 100%; height: auto; max-height: 200px; border-radius: 8px;" />
                            </div>

                            <div class="text-body-2">
                                <h4 class="text-subtitle-2 font-weight-bold mb-2">Token Structure</h4>
                                <p class="mb-2">
                                    DINOv2 processes images using <strong>261 tokens total:</strong>
                                </p>
                                <ul class="pl-4 mb-2">
                                    <li><strong>256 spatial tokens</strong> (16×16 grid)</li>
                                    <li><strong>1 CLS token</strong> (global features)</li>
                                    <li><strong>4 REG tokens</strong> (auxiliary processing)</li>
                                </ul>
                                <p>
                                    Redder patches indicate stronger concept activation. CLS and REG tokens appear below
                                    the spatial grid.
                                </p>
                            </div>
                        </div>
                    </v-col>
                </v-row>
            </v-container>
        </v-card-text>
    </v-card>
</template>

<style scoped>
.explanation-card {
    max-width: 100%;
    overflow: hidden;
}

.explanation-card .v-card-text {
    line-height: 1.5;
}

.explanation-card h4 {
    color: rgb(var(--v-theme-primary));
}

.explanation-card .caption {
    font-size: 0.75rem;
    color: rgb(var(--v-theme-on-surface-variant));
}

.gap-2 {
    gap: 0.5rem;
}

.gap-3 {
    gap: 0.75rem;
}

/* Responsive text sizing */
@media (max-width: 1400px) {
    .explanation-card .text-body-2 {
        font-size: 0.875rem;
    }
}

@media (max-width: 960px) {
    .explanation-card .text-body-2 {
        font-size: 0.8rem;
    }

    .explanation-card .text-subtitle-2 {
        font-size: 0.9rem;
    }
}
</style>