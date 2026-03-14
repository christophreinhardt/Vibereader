// Dieser Teil wartet, bis die Seite komplett geladen ist
window.onload = function() {
    if (typeof ePub === 'undefined') {
        document.getElementById("status").innerText = "Fehler: epub.js nicht geladen. Seite neu laden!";
        return;
    }
    
    var rendition;
    var book;
    const status = document.getElementById("status");
    const input = document.getElementById("input");

    input.addEventListener("change", function(e){
        const file = e.target.files[0];
        if (!file) return;

        status.innerText = "Lade " + file.name + "...";
        
        const reader = new FileReader();
        reader.onload = function(event){
            try {
                if (rendition) rendition.destroy();

                book = ePub(event.target.result);
                rendition = book.renderTo("viewer", {
                    width: "100%",
                    height: "100%",
                    flow: "paginated"
                });

                rendition.display().then(() => {
                    status.style.display = 'none';
                });

            } catch (err) {
                status.innerText = "Fehler: " + err.message;
            }
        };
        reader.readAsArrayBuffer(file);
    });

    document.getElementById("next").addEventListener("click", () => rendition && rendition.next());
    document.getElementById("prev").addEventListener("click", () => rendition && rendition.prev());
};
