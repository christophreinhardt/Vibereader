var rendition;
var book;

document.getElementById("input").addEventListener("change", function(e){
    const file = e.target.files[0];
    if (!file) return;

    // Status-Update für dich
    console.log("Lade Datei: " + file.name);
    
    const reader = new FileReader();
    reader.onload = function(event){
        try {
            if (rendition) rendition.destroy();

            // Wir laden das Buch aus dem Speicher (ArrayBuffer)
            book = ePub(event.target.result);
            
            rendition = book.renderTo("viewer", {
                width: "100%",
                height: "100%",
                flow: "paginated",
                manager: "default"
            });

            // WICHTIG: Erzwinge schwarze Schrift, falls Dark Mode stört
            rendition.display().then(() => {
                rendition.themes.default({ "body": { "color": "#000000 !important" }});
                console.log("Anzeige bereit");
            });

        } catch (err) {
            alert("Fehler: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
});

document.getElementById("next").addEventListener("click", () => rendition && rendition.next());
document.getElementById("prev").addEventListener("click", () => rendition && rendition.prev());
