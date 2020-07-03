window.onload = function(e) {

    function timestamp() {
        var str = ""
        const date = new Date();
        const months = {
            0: "Jan",
            1: "Feb",
            2: "Mar",
            3: "Apr",
            4: "May",
            5: "Jun",
            6: "Jul",
            7: "Aug",
            8: "Sep",
            9: "Oct",
            10: "Nov",
            11: "Dec"
        };
        str += months[date.getMonth()] + "-"; // add month
        var day = date.getDate();
        if (day < 10) {
            day = "0" + day.toString();
        }
        str += day + "-"
        str += date.getFullYear() + " ("
        str += date.getHours() + ":";
        var min = date.getMinutes();
        if (date.getMinutes() < 10) {
            min = "0" + min.toString();
        }
        str += min + ")"
        return str
    }

    var room_id = location.pathname.split("/")[location.pathname.split("/").length-1];

    $("#messageForm").submit(function(e) {
        e.preventDefault();
    });

    var socket = io.connect(location.protocol + "//" + document.domain + ":" + location.port);

    socket.on("connect", () => {
        var button = document.getElementById("sendMessageButton");
        button.onclick = () => {
            var message = document.getElementById("message").value;
            document.getElementById("message").value = " ";
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
            if (data["room_id"].includes(room_id)) {
                try {
                    document.getElementById(data["user"]).setAttribute("style", "color: green;");
                } catch (err) {
                    var SPAN = document.createElement("SPAN");
                    // SPAN.setAttribute("id", data["user"]);
                    SPAN.innerHTML = `${data["user"]} <span id="${data['user']}" style="color: green;">online</span>`
                    document.getElementById("users").appendChild(SPAN);
                    $(".container").append(`<small>${timestamp()}</small><h4>Bot:</h4><p>Welcome ${data["user"]}</p>`);
                }
            }
        } else {
            document.getElementById(data["user"]).setAttribute("style", "color: gray;")
        }
        document.getElementById(data["user"]).innerHTML = data["status"];
    });

    socket.on("new people joined", data => {
        console.log("hi")
        var room_id = location.pathname.split("/")[location.pathname.split("/").length-1];
        console.log(room_id)
        if (room_id === data["room_id"]) {
            $(".container").append(`<small>${data.timestamp}</small><h4>${data.name}:</h4><p>${data.message}</p>`);
            window.scrollTo(0, document.getElementById("messages").scrollHeight);
            window.location.reload(true);
        }
    });

    fetch(`http://discord-clone-flask.herokuapp.com/api?room_id=${room_id}`, {
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
                span.innerHTML = `${data["users"][i]} <span id=${data["users"][i]} style="color: green;">online</span>`
                document.getElementById("users").appendChild(span);
            }
        }
      })
}


