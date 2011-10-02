
var BookmarksEventHandler = {
  onClick: function BEH_onClick (aEvent, aView) {
    var modifKey = aEvent.ctrlKey || aEvent.shiftKey;
    if (aEvent.button == 2 || (aEvent.button == 0 && !modifKey))
      return;

    var target = aEvent.originalTarget;
    if (target.localName == "menu" || target.localName == "menuitem") {
      out:
      for (let node = target.parentNode; node; node = node.parentNode) {
        if (node.localName == "menupopup")
          node.hidePopup();
        else {
          switch (node.localName) {
          case "menu":
          case "splitmenu":
          case "hbox":
          case "vbox":
            break;
          default:
            break out;
          }
        }
      }
    }
    if (target._placesNode && PlacesUtils.nodeIsContainer(target._placesNode)) {
      if (target.localName == "menu" || target.localName == "toolbarbutton")
        PlacesUIUtils.openContainerNodeInTabs(target._placesNode, aEvent, aView);
    } else if (aEvent.button == 1) {
      this.onCommand(aEvent, aView);
    }
  },
  onCommand: function BEH_onCommand (aEvent, aView) {
    var target = aEvent.originalTarget;
    if (target._placesNode)
      PlacesUIUtils.openNodeWithEvent(target._placesNode, aEvent, aView || {});
  },
  fillInBHTooltip: function BEH_fillInBHTooltip (aDocument, aEvent) {
    var node, cropped = false, targetURI;
    if (aDocument.tooltipNode.localName == "treechildren") {
      var tree = aDocument.tooltipNode.parentNode;
      var row = {}, column = {};
      var tbo = tree.treeBoxObject;
      tbo.getCellAt(aEvent.clientX, aEvent.clientY, row, column, {});
      if (row.value == -1)
        return false;
      node = tree.view.nodeForTreeIndex(row.value);
      cropped = tbo.isCellCropped(row.value, column.value);
    } else {
      var tooltipNode = aDocument.tooltipNode;
      if (tooltipNode._placesNode)
        node = tooltipNode._placesNode;
      else
        targetURI = tooltipNode.getAttribute("targetURI");
    }
    if (!node && !targetURI)
      return false;

    var title = node ? node.title : tooltipNode.label;
    var url;
    if (targetURI || PlacesUtils.nodeIsURI(node))
      url = targetURI || node.uri;

    if (!cropped && !url)
      return false;

    var tooltipTitle = aDocument.getElementById("bhtTitleText");
    tooltipTitle.hidden = (!title || (title == url));
    if (!tooltipTitle.hidden)
      tooltipTitle.textContent = title;

    var tooltipUrl = aDocument.getElementById("bhtUrlText");
    tooltipUrl.hidden = !url;
    if (!tooltipUrl.hidden)
      tooltipUrl.value = url;

    return true;
  },
};

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
