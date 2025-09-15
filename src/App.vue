<template>
    <v-app>
        <!-- Content Warning Dialog -->
        <v-dialog v-model="show_warning_dialog" max-width="500" persistent>
            <v-card>
                <v-card-title class="text-h5 text-center pa-4">
                    <v-icon color="warning" size="large" class="mr-2">mdi-alert</v-icon>
                    Content Warning
                </v-card-title>

                <v-card-text class="pa-4">
                    <p class="text-body-1 mb-3">
                        This visualization contains over 32,000 unfiltered concepts extracted from ImageNet and other
                        datasets.
                    </p>
                    <p class="text-body-1 mb-3">
                        <strong>Some content may be inappropriate or disturbing</strong> including but not limited to:
                    </p>
                    <ul class="ml-4 mb-3">
                        <li>Medical imagery</li>
                        <li>Violence or weapons</li>
                        <li>Adult content</li>
                        <li>Potentially offensive material</li>
                    </ul>
                    <p class="text-body-2 text-medium-emphasis">
                        By continuing, you acknowledge that you understand this content is unfiltered research data
                        and may encounter unexpected or inappropriate imagery.
                    </p>
                </v-card-text>

                <v-card-actions class="pa-4">
                    <v-btn color="red" variant="outlined" @click="leave_site" class="mr-3">
                        Leave Site
                    </v-btn>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" variant="elevated" @click="accept_warning">
                        I Understand, Continue
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-app-bar app elevation="2">
            <span class="dinovision-logo">
                <img src="@/assets/images/dino_vision_logo.png" alt="DINO Vision" class="dinovision-logo"
                    style="max-height: 40px; margin-left: 15px" />
            </span>

            <v-app-bar-title class="text-h5 font-weight-bold">
                <v-app-bar-title>DINO<b>Vision</b></v-app-bar-title>
                <v-spacer></v-spacer>
            </v-app-bar-title>

            <v-spacer></v-spacer>

            <v-btn icon href="https://github.com/fel-thomas/dinovision" target="_blank" rel="noopener"
                class="custom-link">
                <v-icon>mdi-github</v-icon>
            </v-btn>

            <v-btn icon>
                <v-icon>mdi-information-outline</v-icon>
            </v-btn>

            <v-btn icon>
                <v-icon>mdi-cog-outline</v-icon>
            </v-btn>

            <v-btn icon @click="toggleTheme">
                <v-icon>{{ isDarkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
            </v-btn>
        </v-app-bar>

        <v-main style="margin: auto">
            <div style="max-width: 1600px;" v-if="!show_warning_dialog">
                <ScatterPlotDemo />
            </div>
        </v-main>

        <v-footer app absolute class="text-caption text-disabled">
            <span>&copy; {{ new Date().getFullYear() }} DINO<b>Vision</b></span>
            <v-spacer></v-spacer>
            <span><a href="https://thomasfel.me">Thomas Fel</a> @ Kempner Institute, Harvard University</span>
        </v-footer>
    </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTheme } from 'vuetify';
import ScatterPlotDemo from './components/umap.vue';

const drawer = ref(false);
const theme = useTheme();
const isDarkTheme = computed(() => theme.global.name.value === 'dark');
const show_warning_dialog = ref(true);

function toggleTheme() {
    theme.global.name.value = isDarkTheme.value ? 'light' : 'dark';
}

function accept_warning() {
    show_warning_dialog.value = false;
    localStorage.setItem('dinovision_warning_accepted', 'true');
}

function leave_site() {
    window.history.back();
}

onMounted(() => {
    const warning_accepted = localStorage.getItem('dinovision_warning_accepted');
    if (warning_accepted === 'true') {
        show_warning_dialog.value = false;
    }
});
</script>

<style>
.gradient-header {
    background: linear-gradient(to right, #1E293B, #334155);
    color: white;
}

.v-card {
    border-radius: 8px;
    overflow: hidden;
}

::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: rgba(100, 116, 139, 0.1);
}

::-webkit-scrollbar-thumb {
    background-color: rgba(100, 116, 139, 0.3);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background-color: rgba(100, 116, 139, 0.5);
}
</style>