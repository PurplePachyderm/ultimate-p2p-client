    // Vue instance creation
var socket;
var peer;

const
ipc      = require('electron').ipcRenderer,
syncBtn  = document.querySelector('#syncBtn'),
asyncBtn = document.querySelector('#asyncBtn');

var data = {
    peerId: '',
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
    files: [],
    research: '',
    results: []
};

var app = new Vue({
    el: '#app',

    data: () => { return data; },

    mounted: () => {
        console.log("Welcome to the Ultimate P2P testing interface");

            // Set socket.io connection
        socket = io.connect('http://127.0.0.1:8080');
        socket.on('connect', () => {
            console.log("Session socket ID is: "+socket.io.engine.id);
        });


            //Connect to Peer.js
        peer = new Peer({key: 'lwjd5qra8257b9'});   //TODO Get a real key somehow :p
        peer.on('open', function(id) {
            console.log('Session peer ID is: ' + id);
            data.peerId = id;
            console.log(data.peerId);
        });


            //User logged in
        socket.on('signInSuccess', (user) => {
                //Set Vue data
            data.connected = true;
            data.user.fiName = user.fiName;
            data.user.faName = user.faName;
            data.user.pseudo = user.pseudo;
            data.user.password = '';

                //Send peer ID to server
            socket.emit("newPeerId", {peerId: data.peerId, socketId: socket.io.engine.id});

                //Request files
            ipc.send('signInSuccess', {email: data.user.email});
            console.log("Sign in successfull!")
        });



        socket.on('signUpFailure', (user) => {
            console.log("Fuck, something went wrong!");
        });



            // Receive file list from main
        ipc.on('filesList', (event, newData) => {
            data.files = newData.list;
            console.log("Received files!");
            console.log(data.files);
        });

            // Send unrepertoried files to server
        ipc.on('clientListUpdate', (event, data) => {
            data.socketId = socket.io.engine.id;
            socket.emit('clientListUpdate', data);
        });



            //Accept incoming connections
        peer.on('connection', function(conn) {
            console.log("Wow, someone is connected");
        });


            //Event to rebuild filesData.json
        socket.on('rebuildData', (data) => {
            ipc.send('rebuildData', data);
        });


            //Display researched files
        socket.on('searchResult', (newData) => {
            data.results =  newData.results;
        });

    },

    methods: {
        login: () => {
            let shaObj = new jsSHA("SHA-512", "TEXT");
            shaObj.update(data.user.password);
            var hash= shaObj.getHash("HEX");

            socket.emit('signIn', {password: hash, email: data.user.email, socketId: socket.io.engine.id, peerId: data.peerId});
        },

        logout: () => {
            data.connected = false;
            data.files = [];

            socket.emit('signOut', {socketId: socket.io.engine.id});
        },

        connectPeer: (peerId) => {
            console.log(peerId);
            data.conn = peer.connect(peerId);
            data.peerConnected = true;
        },

        refresh: () => {
            ipc.send('signInSuccess', {email: data.user.email});
        },

        search: () => {
            console.log(data.research);
            socket.emit('search', {research: data.research});
        }

    }
});
