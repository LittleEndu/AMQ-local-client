const { app, BrowserWindow, Menu, MenuItem, dialog } = require('electron')
const windowStateKeeper = require('electron-window-state');
const edge = require('electron-edge-js')
const open = require('open')
const fs = require('fs');
const path = require('path')

//main electron window
var win
var start = Date.now()

//util functions
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}



//logging
if (!fs.existsSync(app.getPath('userData'))) {
    fs.mkdirSync(app.getPath('userData'));
}
if (!fs.existsSync(app.getPath('userData') + '/logs')) {
    fs.mkdirSync(app.getPath('userData') + '/logs');
}
const logFile = app.getPath('userData') + '/logs/' + start + '.log'
fs.writeFileSync(logFile, "Anime Music Quiz - local client log file\n")
function logToFile(args) {
    fs.appendFile(logFile, args + "\n", function (err) {
        if (err) throw err;
    });
}



// discord presence 
var dllFile = app.getAppPath() + "/AnimeMusicQuiz.dll"
if (process.env.PORTABLE_EXECUTABLE_DIR) {
    if (fs.existsSync(process.env.PORTABLE_EXECUTABLE_DIR + "/AnimeMusicQuiz.dll")) {
        dllFile = process.env.PORTABLE_EXECUTABLE_DIR + "/AnimeMusicQuiz.dll"
    } else {
        tempDir = path.parse(app.getPath('exe')).dir
        if (fs.existsSync(tempDir + "/AnimeMusicQuiz.dll")) {
            dllFile = tempDir + "/AnimeMusicQuiz.dll"
        }
    }
}

if (fs.existsSync(dllFile)) {
    var discord_rich = edge.func(dllFile);
    var discordCallbacks = discord_rich(null, true);
} else {
    logToFile("Unable to find AnimeMusicQuiz.dll")
}

var currentView = null
var gameMode
var currentSongs
var totalSongs
var currentPlayers
var totalPlayers
var lobbyIsPrivate
var avatar
var isSpectator
var songName
var animeName
var artistName
var typeName
var lobbyId
var lobbyPassword

function discordTask() {
    if (win && win.webContents) {
        win.webContents.executeJavaScript('try{viewChanger._currentView}catch{}').then(_view => {
            currentView = null
            if (!_view) { return }
            currentView = toTitleCase(_view.replace(/([a-z])([A-Z])/g, '$1 $2'))

            win.webContents.executeJavaScript("avatarController.currentAvatar").then(_avatar => {
                avatar = _avatar
            })

            if (_view == "expandLibrary") {
                win.webContents.executeJavaScript("expandLibrary.selectedSong").then(_selectedSong => {
                    if (_selectedSong) {
                        animeName = _selectedSong.animeName
                        songName = _selectedSong.name
                        artistName = _selectedSong.artist
                        typeName = _selectedSong.typeName
                    }
                })
            }
            if (_view == "quiz") {
                win.webContents.executeJavaScript("quiz.infoContainer.$currentSongCount.text()").then(_songs => {
                    win.webContents.executeJavaScript("quiz.infoContainer.$totalSongCount.text()").then(_totalSongs => {
                        currentSongs = _songs
                        totalSongs = _totalSongs
                    })
                })
                win.webContents.executeJavaScript("quiz.gameMode").then(_gameMode => {
                    gameMode = _gameMode
                })
                win.webContents.executeJavaScript("quiz.isSpectator").then(_isSpectator => {
                    isSpectator = _isSpectator
                })
            }
            if (_view == "lobby") {
                win.webContents.executeJavaScript('lobby.settings').then(_settings => {
                    gameMode = _settings.gameMode
                    totalPlayers = _settings.roomSize
                    lobbyIsPrivate = _settings.privateRoom
                    lobbyPassword = _settings.password
                })
                win.webContents.executeJavaScript('lobby.players').then(_players => {
                    currentPlayers = Object.keys(_players).length
                })
                win.webContents.executeJavaScript('lobby.gameId').then(_gameId => {
                    if (_gameId === null) {
                        totalPlayers = currentPlayers
                        lobbyId = -1
                    } else {
                        lobbyId = _gameId
                    }
                })
            }
        })

        // Using JavaScript castings in here because C# is stupid like that :/
        var payload = {
            currentView: currentView ? currentView : null,
            gameMode: gameMode,
            currentSongs: currentSongs,
            totalSongs: totalSongs,
            currentPlayers: currentPlayers,
            totalPlayers: totalPlayers,
            lobbyIsPrivate: lobbyIsPrivate,
            avatar: avatar ? avatar : null,
            isSpectator: isSpectator,
            songName: songName ? songName : null,
            animeName: animeName ? animeName : null,
            artistName: artistName ? artistName : null,
            typeName: typeName,
            lobbyId: lobbyId,
            lobbyPassword: lobbyPassword,
        }
        if (discordCallbacks) {
            var toExecute = discordCallbacks(payload, true)
            if (toExecute) {
                win.webContents.executeJavaScript(toExecute)
            }
        }
    }
}
setInterval(discordTask, 1000)




//set up for AMQ and other ux
function startup() {
    let winState = windowStateKeeper({
        defaultWidth: 800,
        defaultHeight: 600
    });

    win = new BrowserWindow({
        x: winState.x,
        y: winState.y,
        width: winState.width,
        height: winState.height,
        icon: __dirname + '/favicon.png',
        title: "AMQ",
        show: false,
        backgroundColor: "#424242",
    })
    win.onerror = (err) => { console.log(err) }
    winState.manage(win)
    var menu = new Menu()
    menu.append(new MenuItem({
        label: "Fullscreen",
        accelerator: "F11",
        click: () => { win.setFullScreen(!win.isFullScreen()) },
        visible: false
    }))
    menu.append(new MenuItem({
        label: "Close",
        accelerator: "Alt+F4",
        click: () => { win.close() },
        visible: false
    }))
    menu.append(new MenuItem({
        label: "Zoom in",
        accelerator: "CommandOrControl+numadd",
        click: () => { win.webContents.setZoomFactor(win.webContents.getZoomFactor() + 0.1) },
        visible: false
    }))
    menu.append(new MenuItem({
        label: "Zoom out",
        accelerator: "CommandOrControl+numsub",
        click: () => { win.webContents.setZoomFactor(win.webContents.getZoomFactor() - 0.1) },
        visible: false
    }))
    menu.append(new MenuItem({
        label: "Reset zoom",
        accelerator: "CommandOrControl+num0",
        click: () => { win.webContents.setZoomFactor(1) },
        visible: false
    }))
    menu.append(new MenuItem({
        label: "Refresh",
        accelerator: "F5",
        click: () => { win.reload() },
        visible: false
    }))
    /*menu.append(new MenuItem({
        label: "Debug",
        accelerator: "F12",
        click: () => { win.webContents.openDevTools() },
        visible: false
    }))*/
    win.setMenu(menu)
    win.setMenuBarVisibility(false)
    win.loadURL("https://animemusicquiz.com/")



    win.on('closed', () => {
        win = null
    })
    win.on('ready-to-show', () => {
        win.show()
    })

    win.webContents.on('will-navigate', () => {
        console.log('Navigating to new page')
        win.webContents.insertCSS('html, body { background-color: #424242; }')
    })

    win.webContents.on('new-window', (event, url, frameName, disposition, options) => {
        event.preventDefault()
        open(url)
    })

    win.webContents.on('will-prevent-unload', (event) => {
        var response = dialog.showMessageBoxSync(win, {
            type: 'question',
            buttons: ['Leave', 'Stay'],
            title: 'Are you sure you want to leave?',
            message: "Leaving now might mean you can't come back.",
            defaultId: 0,
            cancelId: 1
        })
        if (response == 0) {
            event.preventDefault()
        }
    })

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        logToFile(message)
    })

    win.webContents.session.on('will-download', (event, item, webContents) => {
        event.preventDefault()
        open(item.getURL())
    })
}

app.on('ready', startup)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (win === null) {
        startup()
    }
})
