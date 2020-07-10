import sqlite3
import os

from flask import Flask, render_template, request, url_for, redirect, session, jsonify
from flask_socketio import SocketIO, emit
from werkzeug.security import check_password_hash, generate_password_hash
from termcolor import colored
from markdown import markdown
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker

from helpers import *

if not os.getenv('DATABASE_URL'):
    conn = sqlite3.connect("db.sqlite3", check_same_thread=False)
    c = conn.cursor()
else:
    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration

    sentry_sdk.init(
        dsn=os.getenv("sentry_dsn"),
        integrations=[FlaskIntegration()]
    )
    engine = create_engine(os.getenv("DATABASE_URL"))
    db = scoped_session(sessionmaker(bind=engine))
    conn = db()
    c = conn


app = Flask(__name__)
app.config["SECRET_KEY"] = "secretkey"
socketio = SocketIO(app)

users = []

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/search", methods=["GET"])
@login_required
def search():
    if request.args.get("search"):
        results = c.execute(f"SELECT * FROM rooms WHERE name LIKE '%{request.args.get('search')}%' AND status='public'").fetchall()
        return render_template("searched.html", results=results)
    else:
        return render_template("search.html")


@app.route("/room/<string:room_id>", methods=["GET", "POST"])
@login_required
def room(room_id):
    if request.method == "POST":
        invite = request.form.get("invite").split(",")
        room = c.execute("SELECT * FROM rooms WHERE room_id=:r_id", {"r_id": room_id}).fetchall()

        if room[0][3] != "private":
            return "You can't explicitly invite people unless it's your own private room"

        user = c.execute("SELECT * FROM user_Room WHERE room_id=:r_id AND user_id=:u_id AND role='owner'", {"r_id": room_id, "u_id": session["user_id"]}).fetchall()

        if len(user) == 0:
            return "You can't explicitly invite people unless it's your own private room"

        for i in invite:

            user_id = c.execute("SELECT * FROM users WHERE email=:val OR username=:val", {"val": i}).fetchall()

            if len(user_id) == 0:
                return f"{i} not found"

            if len(c.execute("SELECT * FROM user_room WHERE user_id=:u_id AND room_id=:r_id", {"u_id": user_id[0][0], "r_id": room_id}).fetchall()) != 0:
                continue

            c.execute("INSERT INTO user_room (user_id, room_id, role) VALUES (:u_id, :r_id, 'user')", {"u_id": user_id[0][0], "r_id": room_id})
            conn.commit()

        return "successfully invited all people on your list!"

    else:
        private = False
        room = c.execute("SELECT * FROM rooms WHERE room_id=:r_id", {"r_id": room_id}).fetchall()

        if len(room) == 0:
            return "Room not found"

        if room[0][3] == "private":
            access = c.execute("SELECT * FROM user_room WHERE user_id=:u_id AND room_id=:r_id", {"u_id": session.get("user_id"), "r_id": room_id}).fetchall()

            if len(access) == 0:
                return "404"

            private = True

        if len(c.execute("SELECT * FROM user_room WHERE room_id=:r_id and user_id=:u_id", {"r_id": room_id, "u_id": session.get("user_id")}).fetchall()) == 0:

            rooms = c.execute("SELECT * FROM user_room WHERE user_id=:u_id", {"u_id": session["user_id"]}).fetchall()
            rs = []
            for r in rooms:
                name = c.execute("SELECT name FROM rooms WHERE room_id=:r_id", {"r_id": r[1]}).fetchall()[0][0]
                rs.append((name, r[1]))
            session["rooms"] = rs

            c.execute("INSERT INTO user_room (user_id, room_id, role) VALUES (:u_id, :r_id, 'user')", {"r_id": room_id, "u_id": session.get("user_id")})
            conn.commit()
            username = c.execute("SELECT username FROM users WHERE user_id=:id", {"id": session.get("user_id")}).fetchall()[0][0]
            c.execute("INSERT INTO messages (message, author, room, timestamp) VALUES (:m, :a, :r, :t)", {"m": f"Welcome {username}!", "a": "Bot", "r": room_id, "t": timestamp()})
            conn.commit()
            print(colored(room_id, "red"))
            socketio.emit("new people joined", {"message": f"Welcome {username}!", "room": room_id}, broadcast=True)
            # socketio.emit("show message", {"message": f"Welcome {username}!"}, broadcast=True)

        messages = c.execute("SELECT * FROM messages WHERE room=:r_id", {"r_id": room_id}).fetchall()
        users = c.execute("SELECT * FROM user_room WHERE room_id=:r_id", {"r_id": room_id}).fetchall()
        usernames = []
        for user in users:
            username = c.execute("SELECT username FROM users WHERE user_id=:u_id", {"u_id": user[0]}).fetchall()[0][0]
            usernames.append(username)
        return render_template("message.html", messages=messages, private=private, room_id=room_id, users=usernames)


@socketio.on("broadcast message")
def message_display(data):
    ts = timestamp()
    if session.get("user_id"):
        user = c.execute("SELECT username FROM users WHERE user_id=:id", {"id": session["user_id"]}).fetchall()[0][0]
    else:
        user = "unknown"
    messages = data["message"].split("\n")
    markdowns = []
    for m in messages:
        markdowns.append(markdown(m))
    markdowns = "<br>".join(markdowns)
    # print(markdowns)
    c.execute("INSERT INTO messages (message, author, room, timestamp) VALUES (:m, :a, :r, :t)", {"m": markdowns, "a": user, "r": data["room_id"], "t": ts})
    conn.commit()
    emit("show message", {"message": markdowns, "timestamp": ts, "name": user, "room_id": data["room_id"]}, broadcast=True)


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        # check if the form is valid

            if not request.form.get("email") or not request.form.get("password") or not request.form.get("confirmation") or not request.form.get("username"):
                return "please fill out all fields"

            if request.form.get("password") != request.form.get("confirmation"):
                return "password confirmation doesn't match password"

            # check if email exist in the database
            exist = c.execute("SELECT * FROM users WHERE email=:email OR username=:username", {"email": request.form.get("email"), "username": request.form.get("username")}).fetchall()

            if len(exist) != 0:
                return "user already registered"

            # hash the password
            pwhash = generate_password_hash(request.form.get("password"), method="pbkdf2:sha256", salt_length=8)

            # insert the row
            c.execute("INSERT INTO users (email, password, username) VALUES (:email, :password, :username)", {"email": request.form.get("email"), "password": pwhash, "username": request.form.get("username")})
            conn.commit()

            # return success
            return "registered successfully!"
    else:
        return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":
        # check the form is valid
        if not request.form.get("username") or not request.form.get("password"):
            return "please fill out all required fields"

        # check if email exist in the database
        user = c.execute("SELECT * FROM users WHERE email=:email OR username=:username", {"email": request.form.get("username"), "username": request.form.get("username")}).fetchall()

        if len(user) != 1:
            return render_template("login.html", message1="Invalid username/email")

        # check the password is same to password hash
        pwhash = user[0][3]
        if check_password_hash(pwhash, request.form.get("password")) == False:
            return render_template("login.html", message2="Password doesn't match")

        # login the user using session
        session["user_id"] = user[0][0]

        # return success
        return redirect("/")

    else:
        return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/create-room", methods=["GET", "POST"])
@login_required
def create_room():
    if request.method == "POST":
        while True:
            room_id = random_str()
            rooms = c.execute("SELECT * FROM rooms WHERE room_id=:r_id", {"r_id": room_id}).fetchall()
            if len(rooms) == 0:
                c.execute("INSERT INTO rooms (room_id, name, description, status) VALUES (:r_id, :name, :desc, :status)", {"r_id": room_id, "name": request.form.get("name"), "desc": request.form.get("description"), "status": request.form.get('status')})
                conn.commit()
                break

        c.execute("INSERT INTO user_room (user_id, room_id, role) VALUES (:u_id, :r_id, 'owner')", {"r_id": room_id, "u_id": session.get("user_id")})
        conn.commit()
        username = c.execute("SELECT username FROM users WHERE user_id=:id", {"id": session.get("user_id")}).fetchall()[0][0]
        c.execute("INSERT INTO messages (message, author, room, timestamp) VALUES (:m, :a, :r, :t)", {"m": f"Welcome {username}!", "a": "Bot", "r": room_id, "t": timestamp()})
        conn.commit()
        socketio.emit("new people joined", {"message": f"Welcome {username}!", "room": room_id}, broadcast=True)
        return redirect(f"/room/{room_id}")
    else:
        return render_template("create-room.html")


@socketio.on("disconnect")
def exist():
    print(session.get("user_id"), "disconnected!")
    username = c.execute("SELECT username FROM users WHERE user_id=:id", {"id": session["user_id"]}).fetchall()[0][0]
    users.remove(username)
    if not username in users:
        emit("update status", {"user": username, "status": "offline"}, broadcast=True)


@socketio.on("connect")
def connect():
    print(str(session.get("user_id")) + " connected!")
    username = c.execute("SELECT username FROM users WHERE user_id=:id", {"id": session["user_id"]}).fetchall()[0][0]
    users.append(username)
    room = []
    rooms = c.execute("SELECT room_id FROM user_room WHERE user_id=:u_id", {"u_id": session.get("user_id")}).fetchall()
    for r in rooms:
        room.append(r[0])
    emit("update status", {"user": username, "status": "online", "room_id": room}, broadcast=True)


@app.route("/api")
def api():
    if request.args.get("api") == "users":
        room_id = request.args.get("room_id")
        user = []
        for i in users:
            u_id = c.execute("SELECT user_id FROM users WHERE username=:u", {"u": i}).fetchall()[0][0]
            print(u_id)
            if len(c.execute("SELECT room_id FROM user_room WHERE user_id=:u_id AND room_id=:r_id", {"u_id": u_id, "r_id": room_id}).fetchall()) != 0:
                user.append(i)
        return jsonify(users=list(set(user)))

    elif request.args.get("api") == "messages":
        room_id = request.args.get("room_id")
        messages = []
        dbms = c.execute("SELECT * FROM messages WHERE room=:r_id", {"r_id": room_id}).fetchall()
        for d in dbms:
            messages.append({"author": d[1], "message": d[2], "timestamp": d[4]})
        return jsonify(messages=messages)


@app.route("/dm", methods=["GET"])
@login_required
def dm():
    messages = c.execute("SELECT * FROM messages WHERE room=:room", {"room": session.get('user_id')}).fetchall()
    username = c.execute("SELECT username FROM users WHERE user_id=:u_id", {"u_id": session["user_id"]}).fetchall()[0][0]
    return render_template("dm.html", messages=messages, username=username)


@socketio.on("dm")
def dm_socket(data):
    ts = timestamp()
    user_id = c.execute("SELECT * FROM users WHERE username=:name", {"name": data["username"]}).fetchall()[0][0]
    c.execute("INSERT INTO messages (author, message, room, timestamp) VALUES (:a, :m, :r, :t)", {"a": data["author"], "m": data["message"], "r": user_id, "t": ts})
    conn.commit()
    emit("broadcast dm", {"author": data["author"], "receiver": data["username"], "t": ts, "message": data["message"]})


@app.route("/@me")
def me():
    rooms = c.execute("SELECT * FROM user_room WHERE user_id=:u_id", {"u_id": session["user_id"]}).fetchall()
    rs = []
    for r in rooms:
        name = c.execute("SELECT name FROM rooms WHERE room_id=:r_id", {"r_id": r[1]}).fetchall()[0][0]
        rs.append((name, r[1]))
    return render_template("me.html", rooms=rs)
    # return str(rooms)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=2000, debug=True)