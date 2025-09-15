const imageCache = new Map();

export async function check_image_exists(url) {
    if (imageCache.has(url)) {
        return imageCache.get(url);
    }

    return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
            imageCache.set(url, true);
            resolve(true);
        };

        img.onerror = () => {
            imageCache.set(url, false);
            resolve(false);
        };

        setTimeout(() => {
            imageCache.set(url, false);
            resolve(false);
        }, 3000);

        img.src = url;
    });
}

export function get_fviz_url(concept_id) {
    return `https://kempner-prod-thomasfel-storage.s3.amazonaws.com/dinov2_fviz/fviz_${concept_id}.webp`;
}

// preload fv for visible points
export async function preload_fviz_images(point_ids) {
    const promises = point_ids.map(id => {
        const url = get_fviz_url(id);
        return check_image_exists(url);
    });

    return Promise.all(promises);
}