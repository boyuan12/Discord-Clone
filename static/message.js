window.onload = function(e) {

    fetch('http://0.0.0.0:2000/api', {
        method: 'GET', // or 'PUT'
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => response.json())
      .then(data => {
            console.log(data)
            for(let i=0; i<data["users"].length; i++) {
                console.log(data["users"][i])
                try {
                    document.getElementById(data["users"][i]).innerHTML = "online";
                    document.getElementById(data["users"][i]).setAttribute("style", "color: green;")
                } catch(err) {
                    var span = document.createElement("SPAN");
                    span.innerHTML = `<span id=${data["users"][i]} style="color: green;">online</span>`
                    document.getElementById("users").appendChild(span);
                }
            }
      })

    $("#messageForm").submit(function(e) {
        e.preventDefault();
    });

    var socket = io.connect(location.protocol + "//" + document.domain + ":" + location.port);

    socket.on("connect", () => {
        var button = document.getElementById("sendMessageButton");
        button.onclick = () => {
            var message = document.getElementById("message").value;
            document.getElementById("message").value = " ";
            var room_id = location.pathname.split("/")[location.pathname.split("/").length-1];
            console.log(room_id)
            socket.emit("broadcast message", {"message": message, "room_id": room_id});
        }
        // socket.emit("connect")
    });

    socket.on("show message", data => {
        if (data["room_id"] == location.pathname.split("/")[location.pathname.split("/").length-1]) {
            $(".container").append(`<small>${data.timestamp}</small><h4>${data.name}:</h4><p>${data.message}</p>`);
            window.scrollTo(0, document.getElementById("messages").scrollHeight);
        }
    });

    socket.on("update status", data => {
        console.log("status updated")
        if (data["status"] == "online") {
            document.getElementById(data["user"]).setAttribute("style", "color: green;")
        } else {
            document.getElementById(data["user"]).setAttribute("style", "color: gray;")
        }
        document.getElementById(data["user"]).innerHTML = data["status"];
    });

    socket.on("new people joined", data => {
        console.log("hi")
        var room_id = location.pathname.split("/")[location.pathname.split("/").length-1];
        if (room_id === data["room_id"]) {
            $(".container").append(`<small>${data.timestamp}</small><h4>${data.name}:</h4><p>${data.message}</p>`);
            window.scrollTo(0, document.getElementById("messages").scrollHeight);
            window.location.reload(true);
        }
    })
}


