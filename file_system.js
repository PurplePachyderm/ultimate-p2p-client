// Manages the "Shared files" directory by dealing with the OS file fileSystem
//NOTE Linux support only for now (and probably forever :p)

let username;
let dir;


function getFilesList(fs, dir) {

    var results = [];

    fs.readdirSync(dir).forEach(function(file) {

        file = dir+'/'+file;
        var stat = fs.statSync(file);

        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesList(fs, file));
        } else results.push(file);

    });

    return results;
}


function init (fs, ipc) {
    //Creates all listeners to communicate with renderer
    //To be called on app startup

    ipc.on('signInSuccess', (event, data) => {

            //Get OS username and path of shared folder
        console.log("Succesfully connected with email: "+data.email);
        osUserName = require("os").userInfo().username;
        console.log("OS username: "+osUserName);
        dir = '/home/'+osUserName+'/UP2P/'+data.email;


            //Get list of shared files
        let filesNames;
        let files = [];

        fs.ensureDir( dir, err => {
            console.log(err); // => null

            filesNames = getFilesList(fs, dir);

            //Remove full path in files names
            for(let i=0; i<filesNames.length; i++){
                files.push({name: ""});
                files[i].name = filesNames[i].split("/").pop();
            }

            console.log(files);
            event.sender.send('filesList', {list: files});
        });

    });
}


module.exports = {
    username,
    dir,
    init
};
