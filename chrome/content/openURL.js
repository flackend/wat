
const Cc = Components.classes;
const Ci = Components.interfaces;
const fixup = Cc["@mozilla.org/docshell/urifixup;1"].getService(Ci.nsIURIFixup);
let textbox, openButton, statusLabel, win;
function onLoad(){
  textbox = document.getElementById("urlTextBox");
  statusLabel = document.getElementById("statusLabel");
  openButton = document.documentElement.getButton("accept");

  win = window.arguments[0];

  doEnabing();
  textbox.focus();
}

function doEnabing(){
  openButton.disabled = !textbox.value;
  statusLabel.value = "";
}

function open(){
  let url = textbox.value,
      uri;
  try {
    uri = fixup.createFixupURI(url, fixup.FIXUP_FLAG_NONE);
  } catch(e){
    statusLabel.value = url + " is invalid";
    return false;
  }
  win.WAT.openTab(uri.spec);
  window.close();
  return false;
}

// vim: sw=2 ts=2 et:
