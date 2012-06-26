/**
 * Complatible for Thunderbird Conversations addon
 * NAME: "Conversation",
 * EXTENSION_ID: "gconversation@xulforum.org"
 * VERSION: "2.2.*",
 */

document.getElementById("multimessage").addEventListener("click", onClick, true);

function onClick (aEvent) {
  if (WAT.handlers.contentAreaClickHandler(aEvent)) {
    aEvent.preventDefault();
    aEvent.stopPropagation();
  }
}

nsContextMenu.prototype.setMessageTargets = function WAT_setMessageTargets (aNode) {
  var tabmail = document.getElementById("tabmail");
  if (tabmail) {
      this.inMessageArea = tabmail.selectedTab.mode.name in mailTabType.modes;
  } else {
      this.inMessageArea = true;
  }
  if (!this.inMessageArea) {
      this.inThreadPane = false;
      this.numSelectedMessages = 1;
      this.isNewsgroup = false;
      this.hideMailItems = true;
      return;
  }
  this.inThreadPane = this.popupNodeIsInThreadPane(aNode);
  this.messagepaneIsBlank = document.getElementById("messagepane").contentWindow.location.href == "about:blank";
  this.numSelectedMessages = GetNumSelectedMessages();
  if (this.numSelectedMessages > 0 && Services.prefs.getBoolPref("conversations.enabled")) {
    this.messagepaneIsBlank = false;
  }
  this.isNewsgroup = gFolderDisplay.selectedMessageIsNews;
  this.hideMailItems = !this.inThreadPane && (this.onImage || this.onLink);
};

