 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/app.js b/app.js
index e7fcad98fc0129b23b511437d5dfbae032acbb07..7104421ee9d87583c67e88cd954e47333567eb11 100644
--- a/app.js
+++ b/app.js
@@ -1,73 +1,267 @@
-window.onload = function() {
+window.onload = function () {
     const status = document.getElementById("status");
     const placeholder = document.getElementById("placeholder");
+    const input = document.getElementById("input");
+    const nextBtn = document.getElementById("next");
+    const prevBtn = document.getElementById("prev");
+    const tocBtn = document.getElementById("toc");
+    const tocCloseBtn = document.getElementById("toc-close");
+    const tocPanel = document.getElementById("toc-panel");
+    const tocList = document.getElementById("toc-list");
+    const viewer = document.getElementById("viewer");
 
-    if (typeof ePub === 'undefined') {
-        status.innerText = "KRITISCH: Bibliothek fehlt!";
+    if (typeof ePub === "undefined") {
+        status.innerText = "KRITISCH: ePub.js fehlt.";
         return;
     }
 
-    var book;
-    var rendition;
+    let book;
+    let rendition;
+    let estimatedMinutes = 0;
+    let brightnessLevel = 1;
+    let touchStart = null;
 
-    document.getElementById("input").addEventListener("change", function(e) {
-        const file = e.target.files[0];
+    function setStatus(text) {
+        status.innerText = text;
+    }
+
+    function setControlsEnabled(enabled) {
+        nextBtn.disabled = !enabled;
+        prevBtn.disabled = !enabled;
+        tocBtn.disabled = !enabled;
+    }
+
+    function applyBrightness() {
+        viewer.style.filter = `brightness(${brightnessLevel.toFixed(2)})`;
+    }
+
+    function setTocOpen(open) {
+        tocPanel.classList.toggle("open", open);
+        tocPanel.setAttribute("aria-hidden", open ? "false" : "true");
+        tocBtn.setAttribute("aria-expanded", open ? "true" : "false");
+    }
+
+    function flattenToc(entries, depth = 0) {
+        const flattened = [];
+        entries.forEach((entry) => {
+            flattened.push({
+                label: entry.label || "(ohne Titel)",
+                href: entry.href,
+                depth
+            });
+
+            if (entry.subitems?.length) {
+                flattened.push(...flattenToc(entry.subitems, depth + 1));
+            }
+        });
+        return flattened;
+    }
+
+    async function showToc() {
+        if (!book || !rendition) return;
+
+        const navigation = await book.loaded.navigation;
+        const toc = navigation?.toc || [];
+
+        if (!toc.length) {
+            setStatus("Kein Inhaltsverzeichnis verfügbar.");
+            return;
+        }
+
+        tocList.innerHTML = "";
+        const chapters = flattenToc(toc);
+
+        chapters.forEach((chapter) => {
+            const item = document.createElement("button");
+            item.className = "toc-entry";
+            item.style.paddingLeft = `${12 + chapter.depth * 18}px`;
+            item.textContent = chapter.label;
+            item.addEventListener("click", async () => {
+                if (!chapter.href) return;
+                await rendition.display(chapter.href);
+                setTocOpen(false);
+                setStatus(`Kapitel geöffnet: ${chapter.label}`);
+            });
+            tocList.appendChild(item);
+        });
+
+        setTocOpen(true);
+    }
+
+    function changeBrightness(delta) {
+        const next = Math.min(1.4, Math.max(0.5, brightnessLevel + delta));
+        if (next === brightnessLevel) return;
+
+        brightnessLevel = next;
+        applyBrightness();
+        const percent = Math.round((brightnessLevel / 1.4) * 100);
+        setStatus(`${estimatedMinutes} Min. · Helligkeit ${percent}%`);
+    }
+
+    function goNext() {
+        if (rendition) rendition.next();
+    }
+
+    function goPrev() {
+        if (rendition) rendition.prev();
+    }
+
+    function handleTouchStart(event) {
+        const point = event.changedTouches?.[0];
+        if (!point) return;
+
+        touchStart = {
+            x: point.clientX,
+            y: point.clientY,
+            time: Date.now()
+        };
+    }
+
+    function handleTouchEnd(event) {
+        if (!touchStart || !rendition || tocPanel.classList.contains("open")) return;
+
+        const point = event.changedTouches?.[0];
+        if (!point) return;
+
+        const dx = point.clientX - touchStart.x;
+        const dy = point.clientY - touchStart.y;
+        const absDx = Math.abs(dx);
+        const absDy = Math.abs(dy);
+        const duration = Date.now() - touchStart.time;
+
+        const viewportWidth = window.innerWidth;
+        const leftThird = viewportWidth / 3;
+        const rightThird = (viewportWidth / 3) * 2;
+
+        if (duration < 300 && absDx < 20 && absDy < 20) {
+            if (touchStart.x <= leftThird) {
+                goPrev();
+            } else if (touchStart.x >= rightThird) {
+                goNext();
+            }
+            touchStart = null;
+            return;
+        }
+
+        const isMiddleThird = touchStart.x > leftThird && touchStart.x < rightThird;
+        const isVerticalSwipe = absDy > 40 && absDy > absDx;
+
+        if (isMiddleThird && isVerticalSwipe) {
+            if (dy < 0) {
+                changeBrightness(0.08);
+            } else {
+                changeBrightness(-0.08);
+            }
+        }
+
+        touchStart = null;
+    }
+
+    function bindTouchGesturesToDocument(doc) {
+        doc.addEventListener("touchstart", handleTouchStart, { passive: true });
+        doc.addEventListener("touchend", handleTouchEnd, { passive: true });
+    }
+
+    setControlsEnabled(false);
+    applyBrightness();
+    setTocOpen(false);
+
+    viewer.addEventListener("touchstart", handleTouchStart, { passive: true });
+    viewer.addEventListener("touchend", handleTouchEnd, { passive: true });
+
+    tocCloseBtn.addEventListener("click", () => setTocOpen(false));
+    tocPanel.addEventListener("click", (event) => {
+        if (event.target === tocPanel) setTocOpen(false);
+    });
+
+    input.addEventListener("change", function (event) {
+        const file = event.target.files[0];
         if (!file) return;
 
-        status.innerText = "Lese Datei...";
+        if (book) {
+            book.destroy();
+        }
+
+        setTocOpen(false);
+        tocList.innerHTML = "";
+        setStatus("Lade EPUB …");
         placeholder.style.display = "none";
+        setControlsEnabled(false);
 
         const reader = new FileReader();
-        reader.onload = function(event) {
+        reader.onload = async function (loadEvent) {
             try {
-                const data = event.target.result;
+                const data = loadEvent.target.result;
                 book = ePub(data);
-                
-                // Wir nutzen 'iframe' statt 'canvas' - das ist sicherer für iOS
+
                 rendition = book.renderTo("viewer", {
                     width: "100%",
                     height: "100%",
                     flow: "paginated",
-                    manager: "default",
-                    method: "default"
+                    manager: "default"
                 });
 
-                rendition.display().then(() => {
-                    status.innerText = "Buch geladen!";
-                    calculateStats();
-                }).catch(err => {
-                    status.innerText = "Anzeigefehler: " + err.message;
+                rendition.hooks.content.register((contents) => {
+                    bindTouchGesturesToDocument(contents.document);
                 });
 
-            } catch (err) {
-                status.innerText = "Fehler: " + err.message;
+                await rendition.display();
+                await calculateStats();
+                attachRenditionEvents();
+                setControlsEnabled(true);
+                setStatus(`Buch geladen · ${estimatedMinutes} Min. · Position 0%`);
+            } catch (error) {
+                setStatus(`Fehler beim Laden: ${error.message}`);
             }
         };
+
         reader.readAsArrayBuffer(file);
     });
 
     async function calculateStats() {
-        status.innerText = "Berechne Lesezeit...";
-        const spine = await book.ready;
-        let totalChars = 0;
-        
-        // Wir zählen nur die ersten paar Kapitel für den Speed-Vibe
-        const promises = book.spine.spineItems.slice(0, 10).map(item => 
-            item.load(book.load.bind(book)).then(doc => {
-                totalChars += doc.innerText ? doc.innerText.length : 0;
+        setStatus("Berechne Lesezeit …");
+        const items = book.spine.spineItems;
+        const sample = items.slice(0, Math.min(items.length, 10));
+        let chars = 0;
+
+        await Promise.all(
+            sample.map(async (item) => {
+                const doc = await item.load(book.load.bind(book));
+                chars += (doc?.documentElement?.textContent || "").length;
+                item.unload();
             })
         );
 
-        await Promise.all(promises);
-        const estMinutes = Math.round((totalChars * (book.spine.spineItems.length / 10)) / 1200);
-        status.innerText = `Ca. ${estMinutes} Min. Lesezeit | Seite: 1`;
-        
-        // Update Seitenzahl beim Umblättern
+        const scaledChars = sample.length ? Math.round(chars * (items.length / sample.length)) : 0;
+        estimatedMinutes = Math.max(1, Math.round(scaledChars / 1200));
+    }
+
+    function attachRenditionEvents() {
         rendition.on("relocated", (location) => {
-            status.innerText = `Ca. ${estMinutes} Min. | Position: ${location.start.displayed.page}`;
+            const percentage = Math.round((location?.start?.percentage || 0) * 100);
+            const page = location?.start?.displayed?.page;
+            const total = location?.start?.displayed?.total;
+            const pageInfo = page && total ? `Seite ${page}/${total}` : `Position ${percentage}%`;
+            setStatus(`${estimatedMinutes} Min. · ${pageInfo}`);
         });
     }
 
-    document.getElementById("next").addEventListener("click", () => rendition && rendition.next());
-    document.getElementById("prev").addEventListener("click", () => rendition && rendition.prev());
+    tocBtn.addEventListener("click", async () => {
+        if (tocPanel.classList.contains("open")) {
+            setTocOpen(false);
+            return;
+        }
+        await showToc();
+    });
+
+    nextBtn.addEventListener("click", goNext);
+    prevBtn.addEventListener("click", goPrev);
+
+    window.addEventListener("keydown", async (event) => {
+        if (!rendition) return;
+        if (event.key === "ArrowRight") goNext();
+        if (event.key === "ArrowLeft") goPrev();
+        if (event.key.toLowerCase() === "t") await showToc();
+        if (event.key === "Escape") setTocOpen(false);
+    });
 };
 
EOF
)
