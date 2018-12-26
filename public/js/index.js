    // Vue instance creation
var socket;
var peer;

var data = {
    peers: [],
    selectedPeer:'',
    message: "Wesh alors",
    conn: '',
    connected: false,
    peerConnected: false,
    peer: '',
    socket: '',
    email: '',
    password: '',
    fiName: '',
    faName: ''
}

var app = new Vue({
    el: '#app',

    data: () => { return data; },

    mounted: () => {
            // Set P2P & socket.io connection
        socket = io.connect('http://127.0.0.1:8080');
        console.log("Welcome to Ultimate P2P testing interface");
        peer = new Peer({key: 'lwjd5qra8257b9'});


            //User logged in
        socket.on('signInSuccess', (user) => {
            data.connected = true;
            data.fiName = user.fiName;
            data.faName = user.faName;
        });


            // Open connection
        peer.on('open', function(id) {
          console.log('My peer ID is: ' + id);

          socket.emit("newPeerId", {peerId: id, socketId: socket.io.engine.id});
        });


            //New user notice
        socket.on("newPeerId", (newData) => {
            console.log("New connected: "+newData.peerId);

            data.peers.push(newData);
        });


            //Accept incoming connections
        peer.on('connection', function(conn) {
            console.log("Wow, someone is connected");
        });

    },

    methods: {
        login: () => {
            let shaObj = new jsSHA("SHA-512", "TEXT");
            shaObj.update(data.password);
            var hash= shaObj.getHash("HEX");

            socket.emit('signIn', {password: hash, email: data.email});
        },

        connectPeer: () => {
            console.log(data.selectedPeer);
            data.conn = peer.connect(data.selectedPeer);
            data.peerConnected = true;
        }

    }
});
