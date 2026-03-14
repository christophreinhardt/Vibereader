var rendition;
var book;

document.getElementById("input").addEventListener("change", function(e){
    if (e.target.files.length == 0) return;
    
    var file = e.target.files[0];
    var reader = new FileReader();
    
    reader.onload = function(e){
        var data = e.target.result;
        
        // Altes Buch löschen, falls vorhanden
        if (rendition) rendition.destroy();
        
        book = ePub(data);
        rendition = book.renderTo("viewer", {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "default"
        });

        var display = rendition.display();
        
        display.then(() => {
            console.log("Buch erfolgreich geladen!");
        }).catch(err => {
            console.error("Fehler beim Anzeigen:", err);
            alert("Fehler beim Laden der Buchseiten.");
        });
    };
    reader.readAsArrayBuffer(file);
});

document.getElementById("next").addEventListener("click", () => rendition && rendition.next());
document.getElementById("prev").addEventListener("click", () => rendition && rendition.prev());
