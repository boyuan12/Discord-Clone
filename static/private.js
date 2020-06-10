window.onload = function(e) {

    $("#messageForm").submit(function(e) {
        e.preventDefault();
    });

    var socket = io.connect(location.protocol + "//" + document.domain + ":" + location.port);

    socket.on("connect", () => {
        var button = document.getElementById("dmButton");
        button.onclick = () => {
            console.log("clicked")
            var username = document.getElementById("username").value;
            var message = document.getElementById("message").value;
            var author = document.getElementById("sender").value;
            socket.emit("dm", {"username": username, "message": message, "author": author});
        }
    })

    socket.on("broadcast dm", data => {
        console.log("dm received")
        if (data["receiver"] == document.getElementById("sender").value) {
            console.log(data["message"]);
        }
    })
}