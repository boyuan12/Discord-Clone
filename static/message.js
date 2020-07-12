window.onload = function(e) {

    // if (location.protocol === "http:") {
    //     window.location.replace(window.location.href.replace("http", "https"))
    // }

    const BASE_URL = location.origin;
    // const BASE_URL = "http://0.0.0.0:2000/";

    function timestamp() {

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

        var str = ""
        const date = new Date();
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

    function utcToLocal(ts) {
        const months = {
            "Jan": "01",
            "Feb": "02",
            "Mar": "03",
            "Apr": "04",
            "May": "05",
            "Jun": "06",
            "Jul": "07",
            "Aug": "08",
            "Sep": "09",
            "Oct": "10",
            "Nov": "11",
            "Dec": "12"
        }
        var ts = ts.split("-");
        var year = ts[2].split(" (")
        var utc = `${year[0]}-${months[ts[0]]}-${ts[1]}T${year[1].split(")")[0]}:00.000Z`;
        var localDate = new Date(utc);
        var localDate = localDate.toString().split("GMT-")[0];

        var t = localDate.toString().split(" ")
        var messages = `${t[1]}-${t[2]}-${t[3]} (${t[4].split(":")[0]}:${t[4].split(":")[1]})`
        return messages;
    }

    var room_id = location.pathname.split("/")[location.pathname.split("/").length-1];

    $("#messageForm").submit(function(e) {
        e.preventDefault();
    });

    var socket = io.connect(location.protocol + "//" + document.domain + ":" + location.port);

    socket.on("connect", () => {
        var textArea = document.getElementById("message");
        textArea.addEventListener("input", () => {
            console.log("typpppiiiing")
            socket.emit("typing", {"room_id": room_id});
        })
        var button = document.getElementById("sendMessageButton");
        button.onclick = () => {
            var message = document.getElementById("message").value;
            document.getElementById("message").value = " ";
            if (message.length !== 0) {
                socket.emit("broadcast message", {"message": message, "room_id": room_id})
            };
        }
        // socket.emit("connect")
    });

    socket.on("show message", data => {
        if (data["room_id"] == location.pathname.split("/")[location.pathname.split("/").length-1]) {
            var message = document.createElement("SPAN");
            message.innerHTML = `<small>${utcToLocal(data.timestamp)}</small><h4>${data.name}:</h4><p>${data.message}</p>`
            $(".container").append(message);
            var objDiv = document.getElementById("messages");
            objDiv.scrollTop = objDiv.scrollHeight;
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
                    SPAN.innerHTML = `${data["user"]} <span id="${data['user']}" style="color: green;">online</span> <br>`
                    document.getElementById("users").appendChild(SPAN);
                    $(".container").append(`<small>${utcToLocal(timestamp())}</small><h4>Bot:</h4><p>Welcome ${data["user"]}</p>`);
                    var objDiv = document.getElementById("messages");
                    objDiv.scrollTop = objDiv.scrollHeight;
                }
            }
        } else {
            try {
                document.getElementById(data["user"]).setAttribute("style", "color: gray;");
            } catch(err) {
                var SPAN = document.createElement("SPAN");
                // SPAN.setAttribute("id", data["user"]);
                SPAN.innerHTML = `${data["user"]} <span id="${data['user']}" style="color: gray;">offline</span> <br>`
                document.getElementById("users").appendChild(SPAN);
                // $(".container").append(`<small>${utcToLocal(timestamp())}</small><h4>Bot:</h4><p>Welcome ${data["user"]}</p>`);
                var objDiv = document.getElementById("messages");
                objDiv.scrollTop = objDiv.scrollHeight;
            }
        }
        document.getElementById(data["user"]).innerHTML = data["status"];
    });

    socket.on("new people joined", data => {
        console.log("hi")
        var room_id = location.pathname.split("/")[location.pathname.split("/").length-1];
        console.log(room_id)
        if (room_id === data["room_id"]) {
            $(".container").append(`<small>${utcToLocal(data.timestamp)}</small><h4>${data.name}:</h4><p>${data.message}</p>`);
            var objDiv = document.getElementById("messages");
            objDiv.scrollTop = objDiv.scrollHeight;
        }
    });

    fetch(`${BASE_URL}/api?room_id=${room_id}&api=users`, {
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
    });

    fetch(`${BASE_URL}/api?room_id=${room_id}&api=messages`, {
        method: "GET",
        headers: {
            "Content-Type": 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        for (let i=0; i<data.messages.length; i++) {
            var message = document.createElement("SPAN");
            message.innerHTML = `<small>${utcToLocal(data["messages"][i].timestamp)}</small><h4>${data["messages"][i].author}:</h4><p>${data["messages"][i].message}</p>`
            $(".container").append(message);
        };
        var objDiv = document.getElementById("messages");
        objDiv.scrollTop = objDiv.scrollHeight;
    });

}


