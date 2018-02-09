let backendHost;
let socketPort = ''

const hostname = window && window.location && window.location.hostname;

if (hostname === 'https://dronecast.azurewebsites.net') {
    backendHost = 'https://dronecastapi.azurewebsites.net';
} else {
    backendHost = "http://localhost:8080";
    socketPort = window.location.port || 8080
}

export const API_ROOT = `${backendHost}/api/`;
export const SOCKET_ROOT = `${backendHost}/`;
export const SOCKET_PORT = socketPort