'use strict';

/*
 /test
 /api/new
 /api/contentUpload
 /api/list
 /api/update
*/

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

const express = require('express');
const app = express();
// Reuse express server
const server = require('http').createServer(app);
// Port
const port = process.env.BACKEND_PORT || 8080;
// CORS
const cors = require('cors');
// Sockets
const io = require('socket.io')(server)
// Zip
const fs = require('fs');
const archiver = require('archiver');
const admzip = require('adm-zip');

// Copy folders utility
const ncp = require('ncp').ncp;

// Connection to Mongo
const dbLib = require('./database/dbLib.js');

const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path')

// CORS
app.use(cors());

// HTTP request in req.body as json
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Serve static files
// URL/id/display
app.use(express.static(__dirname + '/database/apps'));

// Upload content
const contentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dir = "./database/media"
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    dir = `${dir}/${req.body.appid}`
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    dir = `${dir}/${req.body.folderId}`
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    cb(null, dir)
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  }
});

const contentUpload = multer({ storage: contentStorage }).array("imgUploader", 3);

// Upload App's HTML
const appStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dir = "./database/apps"
    let name = file.originalname.slice()
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)

    dir = `${dir}/${req.body.appid}`
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)

    dir = `${dir}/${req.body.folderId}`
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)

    //database/apps/appId/folderUUID/Name(Display-Phone)
    dir = `${dir}/${req.body.folderName}`
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)

    if (name.includes("-")) {
      let index = name.indexOf("-")
      let folder = name.slice(0, index)
      dir = `${dir}/${folder}`
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    }
    //console.log("Server appstorage", req.body, file)
    cb(null, dir)
  },
  filename: function (req, file, callback) {
    let name = file.originalname.slice()
    if (name.includes("-")) {
      let index = name.indexOf("-")
      name = name.slice(index + 1)
    }
    if (file.mimetype === 'text/html' && !name.includes("-")) {
      name = 'index.html'
    }
    callback(null, name);
  }
});
const appUpload = multer({ storage: appStorage }).array("appUploader", 5);

//Routes
app.get("/test", function (req, res, next) {
  res.send("OK!")
});

app.get("/error", function (req, res, next) {
  next("My Error")
});

app.post("/api/apps/new", async function (req, res, next) {
  let appId
  const { name, appData, displays } = req.body
  if (!name || !appData || !displays) return next(new Error("Request not valid"))
  try {
    appId = await dbLib.newApp(name, "author", "scenario", "category", appData, displays)
  } catch (error) {
    return next(error)
  }
  // Copy HTMLTest in the new app's folder
  let dir = "./database/apps"
  if (!fs.existsSync(dir)) fs.mkdirSync(dir)

  dir = `${dir}/${appId}`
  if (!fs.existsSync(dir)) fs.mkdirSync(dir)
  dir = `${dir}/Example`
  if (!fs.existsSync(dir)) fs.mkdirSync(dir)
  ncp('./HTMLTest', dir, function (err) {
    if (err) {
      return next(err);
    }
  });
  res.send({ response: "New App created" })
});

app.put("/api/apps/updatedata/:id", async function (req, res, next) {
  if (!req.params.id || Object.keys(req.body).length === 0) return next(new Error("Request not valid"))
  try {
    await dbLib.updateAppData(req.params.id, req.body)
  } catch (error) {
    return next(error)
  }
  res.send({ response: "Updated!" })
})

app.put("/api/apps/updatedisplays/:id", async function (req, res, next) {
  if (!req.params.id || Object.keys(req.body).length === 0) return next(new Error("Request not valid"))
  try {
    await dbLib.updateAppDisplays(req.params.id, req.body)
  } catch (error) {
    return next(error)
  }
  res.send({ response: "Updated!" })
})

app.post("/api/apps/appupload", function (req, res, next) {
  appUpload(req, res, function (err) {
    if (err) {
      return next(err)
    }
    let path
    try {
      req.files.forEach(file => {
        path = file.destination
        let filePath = file.path
        if (file.originalname.indexOf('.zip') > -1) {
          let zip = new admzip(filePath);
          zip.extractAllTo(path, true);
        }
      })
    } catch (error) {
      return next(error)
    }
  });

  res.send({ response: "App upload complete!" })

  /**
  console.log(req.files)
  const { appid, folder, folderName, index } = req.body
  for (let i = 0; i < req.files.length; i++) {
      let path
      let name = req.files[i].originalname.slice()
      if (name.includes("-")) {
          let index = name.indexOf("-")
          path = name.slice(0, index)
          name = name.slice(index + 1)
          await dbLib.addAppCode(index, appid, folder, path, folderName)
      }
  }
   */
});

app.post("/api/apps/upload", function (req, res, next) {
  contentUpload(req, res, async function (err) {
    if (err) {
      return next(err)
    }
    const { appid, index } = req.body
    for (let i = 0; i < req.files.length; i++) {
      try {
        await dbLib.addAppContent(appid, index, req.files[i].filename)
      } catch (error) {
        return next(error)
      }
    }
    res.send({ response: "Content upload complete!" })
  });
});
app.put("/api/apps/:id/remove/:content", async function (req, res, next) {
  const { index } = req.body
  try {
    await dbLib.deleteAppContent(req.params.id, index, req.params.content)
    fs.unlink(`${__dirname}/database/media/${req.params.id}/${req.params.content}`,
      () => res.send({ response: "Content removed!" }))
  } catch (error) {
    return next(error)
  }
});

app.get("/api/apps/list", async function (req, res, next) {
  try {
    const data = await dbLib.listAllApp();
    res.json(data);
  } catch (error) {
    next(error)
  }
});

app.get("/api/apps/find/:id", async function (req, res, next) {
  try {
    const data = await dbLib.findApp(req.params.id)
    res.json(data);
  } catch (error) {
    return next(error)
  }
});

//Content
app.get("/api/apps/:id/content/:folder/:name", function (req, res) {
  res.sendFile(path.join(__dirname, './database/media/', req.params.id, '/', req.params.folder, '/', req.params.name));
});
app.get("/api/apps/:id/qr", async function (req, res, next) {
  try {
    const data = await dbLib.findApp(req.params.id)
    data["socketURL"] = `${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}`
    // const qrdata = {
    //     appdata: `${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/api/apps/find/${req.params.id}`,
    //     socketURL: `${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}`
    // }
    res.json(data);
  } catch (error) {
    next(error)
  }
})
app.get("/api/apps/:id/download/:folderid/:name", function (req, res, next) {
  let archive = archiver('zip', {});
  archive.on('error', function (err) {
    return next(err);
  });
  archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
      console.log(err)
    } else {
      return next(err);
    }
  });
  const path = `./database/apps/${req.params.id}/${req.params.folderid}/${req.params.name}`
  if (!fs.existsSync(path)) {
    return next({ message: "Path to be downloaded does not exist" })
  }
  archive.directory(path, false);
  archive.pipe(res)
  archive.finalize()
  res.header('Content-Type', 'application/zip');
  res.header('Content-Disposition', `attachment; filename=${req.params.id}.zip`);
})

//Displays
app.get("/api/displays/list", async function (req, res, next) {
  try {
    const data = await dbLib.listAllDisplays();
    res.json(data);
  } catch (error) {
    next(error)
  }
});

app.post("/api/displays/new", async function (req, res, next) {
  if (req.body) {
    try {
      await dbLib.insertDisplay(req.body.name, false)
      res.send({ response: "Added " + req.body.name + " to the DB" })
    } catch (error) {
      return next(error)
    }
  } else {
    return next(new Error('Error on adding a display'))
  }
});

app.put("/api/displays/edit/:id", async function (req, res, next) {
  if (req.body) {
    try {
      await dbLib.updateDisplay(req.params.id, req.body.name)
      res.send({ response: "Display " + req.params.id + " updated" })
    } catch (error) {
      next(error)
    }
  } else {
    next(new Error('Error on adding a display'))
  }
});

app.delete("/api/apps/delete/:id", async function (req, res, next) {
  try {
    await dbLib.deleteApp(req.params.id)
    deleteFolderRecursive(__dirname + '/database/apps/' + req.params.id)
    deleteFolderRecursive(__dirname + '/database/media/' + req.params.id)
    res.send({ response: "App deleted" })
  } catch (error) {
    next(error)
  }
})
app.delete("/api/displays/delete/:id", async function (req, res, next) {
  try {
    await dbLib.deleteDisplay(req.params.id)
    res.send({ response: "Display deleted" })
  } catch (error) {
    next(error)
  }
})

// Last middleware - No response - 404
app.use(function (req, res, next) {
  res.status(404);
  res.send({ error: 'Route not defined' });
});

// Error handling
app.use(function (error, req, res, next) {
  console.log("logging", error)
  res.status(500).send(`Error: ${error.message}`)
});

// Start server
server.listen(port, async function () {
  console.log('Server listening at port %d', port, "in", process.env.NODE_ENV);
  try {
    await dbLib.testConnection();
    await dbLib.createCol("Dev", "Apps");
    await dbLib.createCol("Dev", "Displays")
  } catch (error) {
    console.log("Error connecting to database: ", error)
  }
});

// Socket logic
var avDisplays = new Map()

const displaysIo = io.of('/drones'),
  appsIo = io.of('/clients');

displaysIo.on('connection', (socket) => {
  console.log("Display connected");

  socket.on('message', (msg) => {
    console.log("From Display to server:", msg);
    //To apps -> apps.emit('message',msg)
  });

  socket.on('init', (msg) => {
    if (typeof msg === 'string') {
      msg = JSON.parse(msg)
    }
    console.log("SOCKET_DRONE: Init msg from display:", msg.id)
    dbLib.insertDisplay(msg.id, true)
    avDisplays.set(msg.id, socket)
  })

  socket.on('disconnect', (reason) => {
    for (let [key, value] of avDisplays.entries()) {
      if (value.id === socket.id) {
        dbLib.insertDisplay(key, false)
        avDisplays.delete(key)
        return
      }
    }
  })
});
appsIo.on('connection', (socket) => {
  console.log("Client connected");

  socket.on('message', (msg) => {
    console.log("From client to server:", msg);
  });
  socket.on('toHTML', (msg) => {
    console.log("Client sending (toHTML):", msg);
    displaysIo.emit('toHTML', msg)
  });
  socket.on('data', (msg) => {
    console.log("Data sent from client to display:", msg)
    const { drones } = msg // Displays bound to the app
    try {
      if (drones === undefined) return
      for (let key of avDisplays.keys()) {
        drones.forEach(display => {
          console.log("AvDisplays-Drones received in data", key, display)
          if (display === key) {
            console.log("Sending data from server to display", display)
            const sock = avDisplays.get(key)
            sock.emit('message', msg.content)
          }
        });
      }
    } catch (error) {
      console.log(error)
    }
  })
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected. Reason:', reason)
  })
});

var deleteFolderRecursive = function (path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        try {
          fs.unlinkSync(curPath);
        } catch (err) {
          console.log(err)
        }
      }
    });
    fs.rmdirSync(path);
  }
};