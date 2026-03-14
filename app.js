window.onload = function() {
    const status = document.getElementById("status");
    const placeholder = document.getElementById("placeholder");

    if (typeof ePub === 'undefined') {
        status.innerText = "KRITISCH: Bibliothek fehlt!";
        return;
    }

    var book;
    var rendition;

    document.getElementById("input").addEventListener("change", function(e) {
        const file = e.target.files[0];
        if (!file) return;

        status.innerText = "Lese Datei...";
        placeholder.style.display = "none";

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = event.target.result;
                book = ePub(data);
                
                // Wir nutzen 'iframe' statt 'canvas' - das ist sicherer für iOS
                rendition = book.renderTo("viewer", {
                    width: "100%",
                    height: "100%",
                    flow: "paginated",
                    manager: "default",
                    method: "default"
                });

                rendition.display().then(() => {
                    status.innerText = "Buch geladen!";
                    calculateStats();
                }).catch(err => {
                    status.innerText = "Anzeigefehler: " + err.message;
                });

            } catch (err) {
                status.innerText = "Fehler: " + err.message;
            }
        };
        reader.readAsArrayBuffer(file);
    });

    async function calculateStats() {
        status.innerText = "Berechne Lesezeit...";
        const spine = await book.ready;
        let totalChars = 0;
        
        // Wir zählen nur die ersten paar Kapitel für den Speed-Vibe
        const promises = book.spine.spineItems.slice(0, 10).map(item => 
            item.load(book.load.bind(book)).then(doc => {
                totalChars += doc.innerText ? doc.innerText.length : 0;
            })
        );

        await Promise.all(promises);
        const estMinutes = Math.round((totalChars * (book.spine.spineItems.length / 10)) / 1200);
        status.innerText = `Ca. ${estMinutes} Min. Lesezeit | Seite: 1`;
        
        // Update Seitenzahl beim Umblättern
        rendition.on("relocated", (location) => {
            status.innerText = `Ca. ${estMinutes} Min. | Position: ${location.start.displayed.page}`;
        });
    }

    document.getElementById("next").addEventListener("click", () => rendition && rendition.next());
    document.getElementById("prev").addEventListener("click", () => rendition && rendition.prev());
};
