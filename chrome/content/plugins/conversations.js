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

