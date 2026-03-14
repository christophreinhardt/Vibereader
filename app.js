var rendition;
var book;

document.getElementById("input").addEventListener("change", function(e){
    if (e.target.files.length == 0) return;
    
    var file = e.target.files[0];
    var reader = new FileReader();
    
    reader.onload = function(e){
        var data = e.target.result;
        book = ePub(data);
        rendition = book.renderTo("viewer", {
            width: "100%",
            height: "100%",
            flow: "paginated"
        });
        rendition.display();
    };
    reader.readAsArrayBuffer(file);
});

document.getElementById("next").addEventListener("click", () => rendition.next());
document.getElementById("prev").addEventListener("click", () => rendition.prev());
