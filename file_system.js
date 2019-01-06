// Manages the "Shared files" directory by dealing with the OS file file system
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

        //Function to manage shared files on session startup

            //Get OS username and path of shared folder
        osUserName = require("os").userInfo().username;
        dir = '/home/'+osUserName+'/UP2P/'+data.email;


            //Get list of shared files
        let filesNames; //Contains full path
        let files = []; //Contains names only

        //Get ID of those files
        fs.ensureFileSync(dir + '/.filesData.json');
        let filesData = fs.readJsonSync(dir + '/.filesData.json', { throws: false });
        if(filesData == null)
            filesData = {list: []};


        filesNames = getFilesList(fs, dir);

            //WARNING Exploit bug: replacing a file while keeping the same name would
            //result in the same file in the DB to have several versions
            //FIX Hash content of the file to ensure its integrity but I'm
            //way too lazy for now

            //Remove full path in files names
            //and check that file exists in database
            //(we're gonna build an array of files missing in the .filesData.json)

        let fileName;   //Temp var to contain file name only (without full path)
        let j;  //Temp var to cycle filesData array
        let fileMatched;   //Temp var to check that every file is included in filesData
        let unmatchedFiles = []; //Array containing new files to be added to DB

        for(let i=0; i<filesNames.length; i++){
            // Add files names only to array to be sent to renderer process

            fileName = filesNames[i].split("/").pop();

            if(fileName != '.filesData.json'){


                // Try to match files in .filesData.json
                j=0;
                fileMatched = false
                while(j < filesData.list.length){

                    if(filesData.list[j].name == fileName){
                        fileMatched = true;
                        break;
                    }
                    j++;
                }

                // Add description, ID, etc..
                if(fileMatched){
                    files.push({
                        name: fileName,
                        id: filesData.list[j].id,
                        description: filesData.list[j].description
                    });
                }
                else{
                    unmatchedFiles.push(fileName);
                    files.push({
                        name: fileName
                    });
                }
            }
        }

            //Look for deleted files
        let deletedFiles = [];
        let fileDeleted;
        for(let i=0; i<filesData.list.length; i++){
            j=0;
            fileDeleted = true;
            while(j < files.length){
                if(filesData.list[i].name == files[j].name){
                    fileDeleted = false;
                    break;
                }
                j++;
            }
            if(fileDeleted){
                deletedFiles.push(filesData.list[i].id);
                filesData.list.splice(i, 1);
            }
        }


        event.sender.send('filesList', {list: files});

        //Decide wether or not it's usefull to update filesData.json
        if(unmatchedFiles.length + deletedFiles.length > 0){
            event.sender.send('clientListUpdate', {
                unmatchedFiles: unmatchedFiles,
                deletedFiles: deletedFiles
            });
        }

        //Remove deleted files form filesData.json
        if(deletedFiles.length > 0){
            fs.outputJsonSync(dir + '/.filesData.json', filesData);
        }
    });



    ipc.on('rebuildData', (event, data) => {

        let files = fs.readJsonSync(dir + '/.filesData.json', { throws: false });
        if(files == null)
            files = {list: []};

        for(let i=0; i < data.list.length; i++){
            files.list.push({
                id: data.list[i].id,
                name: data.list[i].name,
                description: ''
            });
        };

        event.sender.send('filesList', files);

            //Write file
        fs.outputJsonSync(dir + '/.filesData.json', files);
    });



    ipc.on('readFile', (event, data) => {

        fs.readFile(dir+'/'+data.name, 'base64', function(err, data) {
            event.sender.send('readFile', { content: data });
        });

    });



    ipc.on('saveFile', (event, data) => {

        //fs.outputFileSync(dir+'/'+data.file, data.content);
        var fd =  fs.openSync(dir+'/'+data.file, 'w');

        let buffer = new Buffer(data.content, 'base64');

        //BUG fs.write asks function on param 5 (seems to get content as string?)

        fs.write(fd, buffer, 0, buffer.length, 0, (err,written) =>{
        });

        let files = fs.readJsonSync(dir + '/.filesData.json', { throws: false });
        files.list.push({
            id: data.id,
            name: data.file,
            description: ''
        });
        fs.outputJsonSync(dir + '/.filesData.json', files);

        event.sender.send('saveFile');
    });

}


module.exports = {
    username,
    dir,
    init
};
