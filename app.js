window.onload = function () {
    const status = document.getElementById("status");
    const placeholder = document.getElementById("placeholder");
    const input = document.getElementById("input");
    const nextBtn = document.getElementById("next");
    const prevBtn = document.getElementById("prev");
    const tocBtn = document.getElementById("toc");
    const viewer = document.getElementById("viewer");

    if (typeof ePub === "undefined") {
        status.innerText = "KRITISCH: ePub.js fehlt.";
        return;
    }

    let book;
    let rendition;
    let estimatedMinutes = 0;
    let brightnessLevel = 1;
    let touchStart = null;

    function setStatus(text) {
        status.innerText = text;
    }

    function setControlsEnabled(enabled) {
        nextBtn.disabled = !enabled;
        prevBtn.disabled = !enabled;
        tocBtn.disabled = !enabled;
    }

    function applyBrightness() {
        viewer.style.filter = `brightness(${brightnessLevel.toFixed(2)})`;
    }

    function changeBrightness(delta) {
        const next = Math.min(1.4, Math.max(0.5, brightnessLevel + delta));
        if (next === brightnessLevel) return;

        brightnessLevel = next;
        applyBrightness();
        const percent = Math.round((brightnessLevel / 1.4) * 100);
        setStatus(`${estimatedMinutes} Min. · Helligkeit ${percent}%`);
    }

    function goNext() {
        if (rendition) rendition.next();
    }

    function goPrev() {
        if (rendition) rendition.prev();
    }

    function handleTouchStart(event) {
        const point = event.changedTouches?.[0];
        if (!point) return;

        touchStart = {
            x: point.clientX,
            y: point.clientY,
            time: Date.now()
        };
    }

    function handleTouchEnd(event) {
        if (!touchStart || !rendition) return;

        const point = event.changedTouches?.[0];
        if (!point) return;

        const dx = point.clientX - touchStart.x;
        const dy = point.clientY - touchStart.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const duration = Date.now() - touchStart.time;

        const viewportWidth = window.innerWidth;
        const leftThird = viewportWidth / 3;
        const rightThird = (viewportWidth / 3) * 2;

        if (duration < 300 && absDx < 20 && absDy < 20) {
            if (touchStart.x <= leftThird) {
                goPrev();
            } else if (touchStart.x >= rightThird) {
                goNext();
            }
            touchStart = null;
            return;
        }

        const isMiddleThird = touchStart.x > leftThird && touchStart.x < rightThird;
        const isVerticalSwipe = absDy > 40 && absDy > absDx;

        if (isMiddleThird && isVerticalSwipe) {
            if (dy < 0) {
                changeBrightness(0.08);
            } else {
                changeBrightness(-0.08);
            }
        }

        touchStart = null;
    }

    function bindTouchGesturesToDocument(doc) {
        doc.addEventListener("touchstart", handleTouchStart, { passive: true });
        doc.addEventListener("touchend", handleTouchEnd, { passive: true });
    }

    setControlsEnabled(false);
    applyBrightness();

    viewer.addEventListener("touchstart", handleTouchStart, { passive: true });
    viewer.addEventListener("touchend", handleTouchEnd, { passive: true });

    input.addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (!file) return;

        if (book) {
            book.destroy();
        }

        setStatus("Lade EPUB …");
        placeholder.style.display = "none";
        setControlsEnabled(false);

        const reader = new FileReader();
        reader.onload = async function (loadEvent) {
            try {
                const data = loadEvent.target.result;
                book = ePub(data);

                rendition = book.renderTo("viewer", {
                    width: "100%",
                    height: "100%",
                    flow: "paginated",
                    manager: "default"
                });

                rendition.hooks.content.register((contents) => {
                    bindTouchGesturesToDocument(contents.document);
                });

                await rendition.display();
                await calculateStats();
                attachRenditionEvents();
                setControlsEnabled(true);
                setStatus(`Buch geladen · ${estimatedMinutes} Min. · Position 0%`);
            } catch (error) {
                setStatus(`Fehler beim Laden: ${error.message}`);
            }
        };

        reader.readAsArrayBuffer(file);
    });

    async function calculateStats() {
        setStatus("Berechne Lesezeit …");
        const items = book.spine.spineItems;
        const sample = items.slice(0, Math.min(items.length, 10));
        let chars = 0;

        await Promise.all(
            sample.map(async (item) => {
                const doc = await item.load(book.load.bind(book));
                chars += (doc?.documentElement?.textContent || "").length;
                item.unload();
            })
        );

        const scaledChars = sample.length ? Math.round(chars * (items.length / sample.length)) : 0;
        estimatedMinutes = Math.max(1, Math.round(scaledChars / 1200));
    }

    function attachRenditionEvents() {
        rendition.on("relocated", (location) => {
            const percentage = Math.round((location?.start?.percentage || 0) * 100);
            const page = location?.start?.displayed?.page;
            const total = location?.start?.displayed?.total;
            const pageInfo = page && total ? `Seite ${page}/${total}` : `Position ${percentage}%`;
            setStatus(`${estimatedMinutes} Min. · ${pageInfo}`);
        });
    }

    tocBtn.addEventListener("click", async () => {
        if (!book || !rendition) return;

        const toc = await book.loaded.navigation;
        if (!toc?.toc?.length) {
            setStatus("Kein Inhaltsverzeichnis verfügbar.");
            return;
        }

        const first = toc.toc[0];
        await rendition.display(first.href);
        setStatus("Zum ersten Kapitel gesprungen.");
    });

    nextBtn.addEventListener("click", goNext);
    prevBtn.addEventListener("click", goPrev);

    window.addEventListener("keydown", (event) => {
        if (!rendition) return;
        if (event.key === "ArrowRight") goNext();
        if (event.key === "ArrowLeft") goPrev();
    });
};
