    // Vue instance creation
var socket;
var peer;

const
ipc      = require('electron').ipcRenderer,
syncBtn  = document.querySelector('#syncBtn'),
asyncBtn = document.querySelector('#asyncBtn');

var data = {

    connected: false,
    peerConnected: false,

    user: {
        email: '',
        password: '',
        password2: '',
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

        peer.on('open', (id) => {
            console.log('Session peer ID is: ' + id);
            data.peerId = id;
        });

            //Listen to file requests
        peer.on('connection', (conn) => {
            console.log("Wow someone is connected!")

                // Receive messages
            conn.on('data', (newData) => {

                let i=0;
                let fileName;
                while(i<data.files.length){

                    if(data.files[i].id == newData){
                        console.log("Found file: "+data.files[i].name);

                        ipc.send('readFile', {name: data.files[i].name, email: data.user.email});
                        fileName = data.files[i].name;
                        i = data.files.length;
                    }

                    i++
                }

                    // Receive file content from main process
                ipc.on('readFile', (event, data) => {
                    //Send to peer
                    conn.send({file: fileName, content: data.content.toString('base64'), id: newData});
                });
            });
        });


        socket.on('signUpSuccess', (userData) => {
            //Send request to automatically log in

            let shaObj = new jsSHA("SHA-512", "TEXT");
            shaObj.update(data.user.password);
            var hash= shaObj.getHash("HEX");

            socket.emit('signIn', {password: hash, email: userData.email, socketId: socket.io.engine.id, peerId: data.peerId});
        });


            //User logged in
        socket.on('signInSuccess', (user) => {
                //Set Vue data
            data.connected = true;
            data.user.fiName = user.fiName;
            data.user.faName = user.faName;
            data.user.pseudo = user.pseudo;
            data.user.password = '';


                //Request files to main process
            ipc.send('signInSuccess', {email: data.user.email});
            console.log("Sign in successfull!")
        });



        socket.on('signUpFailure', (user) => {
            console.log("Fuck, something went wrong!");
        });



            // Receive file list from main
        ipc.on('filesList', (event, newData) => {
            data.files = newData.list;
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


            //Start download
        socket.on('peerFound', newData => {
            console.log('Peer found: '+newData.peerId);
            var conn = peer.connect(newData.peerId);

            conn.on('open', function() {
                // Send messages (file request)
                conn.send(newData.fileId);


                // Receive messages (file content)
                conn.on('data', function(data) {


                    ipc.send('saveFile', data);
                });


            });
        });


        // Receive messages
        ipc.on('saveFile', (event) => {
            ipc.send('signInSuccess', {email: data.user.email});
        });

    },

    methods: {
        login: () => {
            let shaObj = new jsSHA("SHA-512", "TEXT");
            shaObj.update(data.user.password);
            var hash= shaObj.getHash("HEX");

            socket.emit('signIn', {password: hash, email: data.user.email, socketId: socket.io.engine.id, peerId: data.peerId});
        },

        signup: () => {
            let shaObj = new jsSHA("SHA-512", "TEXT");

            if(data.password == data.password2){
                shaObj.update(data.user.password);
                var hash= shaObj.getHash("HEX");

                socket.emit('signUp', {password: hash, email: data.user.email, fiName: data.user.fiName, faName: data.user.faName, email: data.user.email});
            }
        },

        logout: () => {
            data.connected = false;
            data.files = [];

            socket.emit('signOut', {socketId: socket.io.engine.id});
        },


        refresh: () => {
            ipc.send('signInSuccess', {email: data.user.email});
        },

        search: () => {
            socket.emit('search', {research: data.research});
        },

        download: (id) => {
            socket.emit('download', {id: id});
        }

    }
});
