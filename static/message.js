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
        // emit("update status online")
    });

    socket.on("show message", data => {
        if (data["room_id"] == location.pathname.split("/")[location.pathname.split("/").length-1]) {
            $(".container").append(`<small>${data.timestamp}</small><h4>${data.name}:</h4><p>${data.message}</p>`);
        }
    });

    socket.on("update status", data => {
        console.log("status updated")
        document.getElementById(data["user"]).innerHTML = data["status"]
    })
}


