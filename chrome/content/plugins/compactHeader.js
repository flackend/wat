/**
 * Complatible for CompactHeader addon
 * NAME: "CompactHeader",
 * EXTENSION_ID: "{58D4392A-842E-11DE-B51A-C7B855D89593}",
 * VERSION: "1.1.*",
 */

function swapFunc(obj, name, func){
  let original = obj[name];
  let restore = function restoreFunc() obj[name] = orignal;
  let current = obj[name] = function watSwapFunc(){
    let self = this, args = arguments;
    return func.call(self , function(_args) original.apply(self, _args||args), args);
  }
  let res = {
    original: original,
    current: current,
    restore: restore
  }
  return res;
}

function replaceOnClick(){
  let deck = document.getElementById('msgHeaderViewDeck');
  if (deck.selectedPanel.id == "collapsedHeaderView"){
    let label = document.getElementById("collapsedsubjectlinkBox");
    if (!label.collapsed){
      label.setAttribute("onclick", "if (event.button != 2) openUILink(event.target.getAttribute('url'), event)");
    }
  }
}

let coheToggleHeaderView =
swapFunc(org.mozdev.compactHeader.pane, "coheToggleHeaderView", function(origFunc, args){
  let result = origFunc();
  replaceOnClick();
  return result;
});

(function (){
  let coheCopyUrlPopup = document.getElementById("CohecopyUrlPopup");
  let openTabMenu = document.createElement("menuitem");
  let label = document.getElementById("wat_copyPopupOpenNewTabMenu").getAttribute("label");
  openTabMenu.setAttribute("label", label);
  openTabMenu.setAttribute("oncommand", "WAT.openTab(document.popupNode.getAttribute('url'))");
  coheCopyUrlPopup.appendChild(openTabMenu);
})();

let messageListener = {
  onStartHeaders: function(){},
  onEndHeaders: function wat_onEnHeaders(){
   replaceOnClick(); 
  }
}
gMessageListeners.push(messageListener);


function onUnload(){
  coheToggleHeaderView.restore();
  let i = gMessageListeners.indexOf(messageListener);
  if (i != -1){
    gMessageListeners.splice(i, 1);
  }
}

// vim: sw=2 ts=2 et:
