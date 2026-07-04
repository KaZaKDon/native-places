const API_ORIGIN = "https://native-places.ru";

function getImageSrc(image) {
    if (!image) {
        return "";
    }

    const path = image.src || image.url || image.image_path || "";

    if (!path) {
        return "";
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    if (path.startsWith("/")) {
        return `${API_ORIGIN}${path}`;
    }

    return `${API_ORIGIN}/${path}`;
}

export function PlaceGallery({ images = [] }) {
    const normalizedImages = images
        .map((image) => ({
            ...image,
            src: getImageSrc(image),
        }))
        .filter((image) => image.src);

    if (!normalizedImages.length) {
        return (
            <div className="place-gallery-empty">
                Фотографии не загружены.
            </div>
        );
    }

    const mainImage = normalizedImages[0];

    return (
        <div className="place-gallery">
            <img
                className="place-gallery__main"
                src={mainImage.src}
                alt="Фотография объявления"
            />

            {normalizedImages.length > 1 ? (
                <div className="place-gallery__thumbs">
                    {normalizedImages.slice(1).map((image) => (
                        <img
                            key={image.id || image.src}
                            src={image.src}
                            alt="Фотография объявления"
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}