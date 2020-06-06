from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = "secretkey"
socketio = SocketIO(app)

@app.route("/")
def index():
    return render_template("message.html")

@socketio.on("broadcast message")
def message_display(data):
    emit("show message", {"message": data["message"]}, broadcast=True)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=2000, debug=True)