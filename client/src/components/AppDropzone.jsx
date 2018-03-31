import React from 'react'
import DropzoneComponent from 'react-dropzone-component';
import './css/dropzone.min.css';
import './css/filepicker.css';
import { API_ROOT } from '../api-config';

//var myDropZone;

var componentConfig = {
    iconFiletypes: ['.jpg', '.png', '.gif'],
    showFiletypeIcon: false,
    postUrl: API_ROOT + 'apps/appupload'
};
var djsConfig = {
    acceptedFiles: "text/html,text/css,.js",
    autoProcessQueue: true,
    addRemoveLinks: false,
    paramName: "appUploader",
    dictDefaultMessage: "Drop your code here"
};

var eventHandlers = {
    //init: (dropzone) => { myDropZone = dropzone},
    error: (file, error, xhr) => console.log("Error in app dropzone", error, xhr)
    //success: (file) => console.log("Success"),
}
const AppDropzone = ({ appid, getData, folder, folderName, index }) => {

    // Folder = Drone
    // FolderName = DB bug, keep name
    djsConfig.params = {
        appid: appid,
        folder: folder,
        index: index,
        folderName: folderName
    }
    eventHandlers.complete = getData ? getData : undefined;
    return (
        <DropzoneComponent config={componentConfig}
            eventHandlers={eventHandlers}
            djsConfig={djsConfig} />
    );
}

export default AppDropzone