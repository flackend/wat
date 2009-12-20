
const Cc = Components.classes;
const Ci = Components.interfaces;
const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
let textbox, openButton, statusLabel, win;
function onLoad(){
  textbox = document.getElementById("urlTextBox");
  statusLabel = document.getElementById("statusLabel");
  openButton = document.documentElement.getButton("accept");

  win = window.arguments[0];

  doEnabing();
}

function doEnabing(){
  openButton.disabled = !textbox.value;
  statusLabel.value = "";
}

function open(){
  let url = textbox.value;
  try {
    ioService.newURI(url, null, null)
  } catch(e){
    statusLabel.value = url + " is invalid";
    return false;
  }
  win.WAT.openTab(url);
  window.close();
  return false;
}

