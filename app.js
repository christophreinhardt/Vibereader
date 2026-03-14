window.onload = function() {
    if (typeof ePub === 'undefined') {
        document.getElementById("status").innerText = "Fehler: epub.js fehlt!";
        return;
    }
    
    var rendition;
    var book;
    const status = document.getElementById("status");
    const input = document.getElementById("input");

    input.addEventListener("change", function(e){
        const file = e.target.files[0];
        if (!file) return;

        status.innerText = "Analysiere Buch...";
        
        const reader = new FileReader();
        reader.onload = function(event){
            book = ePub(event.target.result);
            
            rendition = book.renderTo("viewer", {
                width: "100%",
                height: "100%",
                flow: "paginated"
            });

            rendition.display();

            // --- NEU: Zeichen zählen & Lesezeit schätzen ---
            book.ready.then(() => {
                // Wir holen uns den gesamten Text aus den Buch-Metadaten/Spine
                return Promise.all(
                    book.spine.spineItems.map(item => item.load(book.load.bind(book)))
                );
            }).then(sections => {
                let totalChars = 0;
                sections.forEach(section => {
                    // Wir entfernen HTML-Tags, um nur den reinen Text zu zählen
                    const text = section.innerHTML.replace(/<[^>]*>/g, "");
                    totalChars += text.length;
                });

                const words = totalChars / 6; // Grobe Schätzung: 6 Zeichen pro Wort
                const minutes = Math.round(words / 250); // 250 Wörter pro Minute
                
                status.style.display = 'block';
                status.innerHTML = `<b>${totalChars.toLocaleString()}</b> Zeichen | <br>Geschätzte Lesezeit: <b>${minutes} Min.</b>`;
            });
        };
        reader.readAsArrayBuffer(file);
    });

    document.getElementById("next").addEventListener("click", () => rendition && rendition.next());
    document.getElementById("prev").addEventListener("click", () => rendition && rendition.prev());
};
