    // Vue instance creation
var socket;
var peer;

const
ipc      = require('electron').ipcRenderer,
syncBtn  = document.querySelector('#syncBtn'),
asyncBtn = document.querySelector('#asyncBtn');

var data = {
    peers: [],
    selectedPeer:'',
    conn: '',
    connected: false,
    peerConnected: false,

    user: {
        email: '',
        password: '',
        fiName: '',
        faName: '',
        pseudo: ''
    },

    files: []
};

var app = new Vue({
    el: '#app',

    data: () => { return data; },

    mounted: () => {
        console.log("Welcome to the Ultimate P2P testing interface");

            // Set P2P & socket.io connection
        socket = io.connect('http://127.0.0.1:8080');
        socket.on('connect', () => {
            console.log("Session socket ID is: "+socket.io.engine.id);
        });

        peer = new Peer({key: 'lwjd5qra8257b9'});   //TODO Get a real key somehow :p
        peer.on('open', function(id) {
            console.log('Session peer ID is: ' + id);

            //Send peer ID to server
            socket.emit("newPeerId", {peerId: id, socketId: socket.io.engine.id});
        });


            //User logged in
        socket.on('signInSuccess', (user) => {
            data.connected = true;
            data.user.fiName = user.fiName;
            data.user.faName = user.faName;
            data.user.pseudo = user.pseudo;
            data.user.password = '';

            ipc.send('signInSuccess', {email: data.user.email});
            console.log("Sign in successfull!")
        });

        socket.on('signUpFailure', (user) => {
            console.log("Fuck, something went wrong!");
        });

            // Receive file list from main
        ipc.on('filesList', (event, data) => {
            data.files = data.list;
            console.log("Received files:");
            console.log(data.files);
            console.log("We have "+data.files.length+" fucking files");
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
            shaObj.update(data.user.password);
            var hash= shaObj.getHash("HEX");

            socket.emit('signIn', {password: hash, email: data.user.email});
        },

        connectPeer: () => {
            console.log(data.selectedPeer);
            data.conn = peer.connect(data.selectedPeer);
            data.peerConnected = true;
        }

    }
});
