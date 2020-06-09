window.onload = function(e) {

    $("#messageForm").submit(function(e) {
        e.preventDefault();
    });

    var socket = io.connect(location.protocol + "//" + document.domain + ":" + location.port);

    socket.on("connect", () => {
        var button = document.getElementById("sendMessageButton");
        button.onclick = () => {
            var message = document.getElementById("message").value;
            var room_id = location.pathname.split("/")[location.pathname.split("/").length-1];
            console.log(room_id)
            socket.emit("broadcast message", {"message": message, "room_id": room_id});
        }
    });

    socket.on("show message", data => {
        if (data["room_id"] == location.pathname.split("/")[location.pathname.split("/").length-1]) {
            var li = document.createElement("LI");
            li.textContent = data.message
            document.getElementById("messages").appendChild(li);
        }
    });
}


