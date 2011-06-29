
const WAT = {
  init: function WAT_initMessageWindow () {
    window.removeEventListener("load", arguments.callee, false);
    document.getElementById("messagepane").setAttribute("onclick",
      "return WAT.contentAreaClick(event) || contentAreaClick(event);")
  },
  isLoadInBackground: function WAT_isLoadInBackground (aEvent) {
    var bg = Services.prefs.getBoolPref("mail.tabs.loadInBackground");
    return aEvent.shiftKey ? !bg : bg;
  },
  contentAreaClick: function WAT_contentAreaClick (aEvent) {
    var href = hRefForClickEvent(aEvent);
    if (href) {
      let win = Services.wm.getMostRecentWindow("mail:3pane"),
          uri = makeURI(href);
      if (win && win.WAT) {
        if (aEvent.button == 1 || (aEvent.button == 0 && (aEvent.ctrlKey || win.WAT.prefs.openLinkInTab))) {
          if (uri.schemeIs("http") || uri.schemeIs("https") || uri.schemeIs("about")) {
            aEvent.preventDefault();
            win.WAT.openTab(href, this.isLoadInBackground(aEvent));
            return true;
          }
        }
      }
    }
    return false;
  }
};
window.addEventListener("load", WAT.init, false);

