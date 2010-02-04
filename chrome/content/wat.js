
let WAT = (function(){
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const WAT_PREFBRANCH_PAGES = "extensions.wat.pages";
  let popupElm = null, menuSep = null, bundle = null;
  let prefService = Cc["@mozilla.org/preferences-service;1"]
                      .getService(Ci.nsIPrefService)
                      .QueryInterface(Ci.nsIPrefBranch2);
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
    bundle = document.getElementById("bundle_wat");
    self.regenerateMenu();

    let openTabMenu = document.getElementById("wat_openNewTabMenu");
    document.getElementById("mailContext").addEventListener("popupshowing", function(evt){
      let xulMenu = evt.target;
      let target = document.popupNode;
      if (target instanceof HTMLAnchorElement){
        openTabMenu.removeAttribute("hidden");
      } else {
        openTabMenu.setAttribute("hidden", "true");
      }
      return true;
    },false);
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
      let pageName = (url.indexOf("chrome://") == 0 || url.indexOf("about:") == 0) ? "chrome" : "content";
      let type = pageName + "Tab", page = pageName + "Page";
      let args = {};
      args[page] = url;
      if (pageName == "content"){
        let uri = makeURI(url, null, null);
        let reg = new RegExp("^" + uri.prePath.replace(/\./g, "\\.") + "($|/)");
        args.clickHandler = function contentClickHandler(aEvent){
          specialTabs.siteClickHandler(aEvent, reg);
        }
      }
      let tabMode = this.tabMail.tabModes[type];
      if (tabMode.tabs.length >= tabMode.maxTabs){
        let res = {};
        let promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService2);
        promptService.alertCheck(window,
          bundle.getFormattedString("maxTabs.overwrite.title", [tabMode.maxTabs]),
          bundle.getString("maxTabs.overwrite.msg"),
          bundle.getString("mexTabs.overwrite.check"),
          res);
        if (!res.value){
          return false;
        }
        this.tabMail.tabModes[type].maxTabs++;
      }
      return this.tabMail.openTab(type, args);
    },
    regenerateMenu: function WAT_regenerateMenu(){
      removeAllElementUntilSep(popupElm, menuSep.id);
      if (!prefService.prefHasUserValue(WAT_PREFBRANCH_PAGES)){
        return;
      }
      let pageString = prefService.getComplexValue(WAT_PREFBRANCH_PAGES, Ci.nsIPrefLocalizedString).data;
      let pages = JSON.parse(pageString);
      if (!(pages instanceof Array)) return;

      pages.forEach(function(page){
        let menuitem = document.createElement("menuitem");
        menuitem.setAttribute("label", page.label);
        menuitem.setAttribute("oncommand", "WAT.openTab('" + page.url + "')");
        popupElm.insertBefore(menuitem, menuSep);
      });
    },
    onOpenNewTab: function WAT_onOpenNewTab(){
      let target = document.popupNode;
      if (target instanceof HTMLAnchorElement && target.href){
        this.openTab(target.href);
      }
    },
    openURLDialog: function WAT_openURLDialog(){
      openDialog("chrome://wat/content/openURL.xul","_blank", "chrome,modal,titlebar", window);
    }
  };
  window.addEventListener("load", init, false);
  return self;
})();
// vim: sw=2 ts=2 et:
