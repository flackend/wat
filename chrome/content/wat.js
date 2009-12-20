
let WAT = (function(){
  const WAT_PREFBRANCH_PAGES = "extensions.wat.pages";
  let popupElm = null, menuSep = null;
  let prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService)
                              .QueryInterface(Components.interfaces.nsIPrefBranch2);
  let pagesObserver = {
    observe: function pages_observe(aSubject, aTopic, aData){
      self.regenerateMenu();
    }
  };
  prefService.addObserver(WAT_PREFBRANCH_PAGES, pagesObserver, false);
  function init(){
    window.removeEventListener("load", init, false);
    self.tabMail = document.getElementById("tabmail");
    popupElm = document.getElementById("wat_menuPopup");
    menuSep = document.getElementById("wat_menu_sep");
    self.regenerateMenu();
  }
  function removeAllElementUntilSep(parentElm, sepId){
    for (let i=0, len=parentElm.childNodes.length; i<len; i++){
      let elm = parentElm.firstChild;
      if (elm.id == sepId)
        return;

      parentElm.removeChild(elm);
    }
  }
  let self = {
    tabMail: null,
    openTab: function WAT_openTab (url){
      let pageName = (url.indexOf("chrome://") == 0) ? "chrome" : "content";
      let args = {};
      args[pageName + "Page"] = url;
      return this.tabMail.openTab(pageName + "Tab", args);
    },
    regenerateMenu: function WAT_regenerateMenu(){
      removeAllElementUntilSep(popupElm, menuSep.id);
      if (!prefService.prefHasUserValue(WAT_PREFBRANCH_PAGES)){
        return;
      }
      let pageString = prefService.getComplexValue(WAT_PREFBRANCH_PAGES, Components.interfaces.nsIPrefLocalizedString).data;
      let pages = JSON.parse(pageString);
      if (!(pages instanceof Array)) return;

      pages.forEach(function(page){
        let menuitem = document.createElement("menuitem");
        menuitem.setAttribute("label", page.label);
        menuitem.setAttribute("oncommand", "WAT.openTab('" + page.url + "')");
        popupElm.insertBefore(menuitem, menuSep);
      });
    }
  };
  window.addEventListener("load", init, false);
  return self;
})();
// vim: sw=2 ts=2 et:
