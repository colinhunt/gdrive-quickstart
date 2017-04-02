// Client ID and API key from the Developer Console
var CLIENT_ID = '362180645600-g1ci4nerq982ptbdaarv6tnllf38abs1.apps.googleusercontent.com';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = 
  'https://www.googleapis.com/auth/drive.metadata.readonly ' +
  'https://www.googleapis.com/auth/drive.file';

var authorizeButton = document.getElementById('authorize-button');
var signoutButton = document.getElementById('signout-button');
var updateButton = document.getElementById('update-button');

let file;
let folder;

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
  gapi.client.init({
    discoveryDocs: DISCOVERY_DOCS,
    clientId: CLIENT_ID,
    scope: SCOPES
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    authorizeButton.onclick = handleAuthClick;
    signoutButton.onclick = handleSignoutClick;
    updateButton.onclick = handleUpdateClick;
  });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    authorizeButton.style.display = 'none';
    signoutButton.style.display = 'block';
    createAndLoadFile();
    // appendPre(data);
    // createFile();

  } else {
    authorizeButton.style.display = 'block';
    signoutButton.style.display = 'none';
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}

function handleUpdateClick(event) {
  onFileList(folder.id)({result: {files: [file]}})
}

/**
 * Append a pre element to the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 * @param {string} message Text to be placed in pre element.
 */
function appendPre(message) {
  var pre = document.getElementById('content');
  var textContent = document.createTextNode(message + '\n');
  pre.appendChild(textContent);
}

/**
 * Print files.
 */
function listFiles() {
  gapi.client.drive.files.list({
    'pageSize': 10,
    'fields': "nextPageToken, files(id, name)"
  }).then(function(response) {
    appendPre('Files:');
    var files = response.result.files;
    if (files && files.length > 0) {
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        appendPre(file.name + ' (' + file.id + ')');
      }
    } else {
      appendPre('No files found.');
    }
  });
}

function createFolder() {
  var fileMetadata = {
    'name' : 'Drive Quickstart',
    'mimeType' : 'application/vnd.google-apps.folder',
  };
  console.log('createFolder()')
  var request = gapi.client.drive.files.create({
     resource: fileMetadata,
     fields: 'id',
  }).then(function(result) {
    return onFolderList({result: {files: [result.result]}})
  });
}

function onFolderList(result) {
  console.log('onFolderList', result)
  folder = result.result.files[0]
  if (!folder) {
    return createFolder();
  }
  console.log("found folder", folder)

  gapi.client.drive.files.list({
    q: `name = 'quickstart.json' and '${folder.id}' in parents and trashed = false `,
    fields: 'files(id, name, parents)',
    spaces: 'drive'
  }).then(onFileList(folder.id));
}

function onFileList(folderId) {
  function _onFileList(result) {
    console.log('onFileList', result)
    file = result.result.files[0]
    if (!file) {
      return createFile(folderId);
    }
    console.log('Found file: ', file.name)
    appendPre(file.name)
    gapi.client.drive.files.get({
      fileId: file.id,
      alt: 'media'
    }).then(function (result) {
      onFileGet(file.id, result)
    });
  }
  return _onFileList;
}

function onFileGet(fileId, result) {
  console.log('onFileGet', fileId, result)
  const data = result.result;

  appendPre(JSON.stringify(data));

  data.key += 1;
  data.list.push(data.key);

  save(fileId, data).then(function(result) {
    console.log('onFileGet save', result)
  });
}

// http://stackoverflow.com/questions/40387834/how-to-create-google-docs-document-with-text-using-google-drive-javascript-sdk
function createAndLoadFile() {
  console.log('createAndLoadFile')
  gapi.client.drive.files.list({
    q: "name = 'Drive Quickstart' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: 'files(id, name)',
    spaces: 'drive'
  }).then(onFolderList);
}

function createFile(parent) {
  console.log('createFile', parent)
  gapi.client.drive.files.create({
    name: 'quickstart.json',
    parents: [parent],
    params: {
      uploadType: 'media'
    },
    fields: 'id'
  }).then(function(result) {
    console.log('File create: ', result)
    save(result.result.id, {"key": 0, "list": [0]}).then(function(result) {
      console.log('File update', result)
      onFileList(parent)({result: {files: [result.result]}})
    })
  })
}

function save(fileId, data) {
  console.log('save', fileId)
  return gapi.client
    .request({
      path: '/upload/drive/v3/files/' + fileId,
      method: 'PATCH',
      params: {
        uploadType: 'media'
      },
      body: data
    })
}
