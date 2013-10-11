
function openUILinkIn (aURL, aWhere) {
  let mail3pane = Services.wm.getMostRecentWindow("mail:3pane");
  if (mail3pane) {
    mail3pane.focus();
    mail3pane.WAT.openTab(aURL, (aWhere == "background"));
    return;
  }
  messenger.openURL(aURL);
}

function whereToOpenLink (aEvent) {
  var loadBackground = Services.prefs.getBoolPref("mail.tabs.loadInBackground");
  if (aEvent.shiftKey)
    loadBackground = !loadBackground;

  return loadBackground ? "background" : "tab";
}

function checkForMiddleClick (node, event) {
  if (node.getAttribute("disabled") == "true")
    return; // Do nothing

  if (event.button == 1) {
    var target = node.hasAttribute("oncommand") ? node :
                 node.ownerDocument.getElementById(node.getAttribute("command"));
    var fn = new Function("event", target.getAttribute("oncommand"));
    fn.call(target, event);

    closeMenus(event.target);
  }
}

function closeMenus (node) {
  if ("tagName" in node) {
    if (node.namespaceURI == "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
    && (node.tagName == "menupopup" || node.tagName == "popup"))
      node.hidePopup();

    closeMenus(node.parentNode);
  }
}

// vim: sw=2 ts=2 et fdm=marker:
