const express = require("express");
const app = express();
const path = require("path");
const http = require("http");
const socketio = require("socket.io");

const server = http.createServer(app);
const io = socketio(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", function (socket) {
    console.log("New client connected:", socket.id);

    socket.on("send-location", function (data) {
        io.emit("receive-location", { id: socket.id, ...data });
    });

    socket.on("disconnect", function () {
        console.log("Client disconnected:", socket.id);
        io.emit("user-disconnect", socket.id);
    });
});

app.get("/", function (req, res) {
    res.render("index");
});

app.get("/ayush", (req, res) => {
    res.send("<div>ayush</div>");
});

server.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});

server.on("error", (err) => {
    console.error("Server error:", err);
});





