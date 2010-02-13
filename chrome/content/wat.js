
let WAT = (function(){
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const WAT_PREFBRANCH_PAGES = "extensions.wat.pages",
        WAT_PREFBRANCH_MIDDLECLICK_IN_NEWTAB = "extensions.wat.middleClickIsNewTab";
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

    document.getElementById("messagepane")
      .setAttribute("onclick", "return WAT.contentAreaClickHandler(event) || contentAreaClick(event)"); 

    appendTabContextMenu();
  }
  function createElement(tagName, attrs){
    let elem = document.createElement(tagName);
    for (let name in attrs){
      elem.setAttribute(name, attrs[name]);
    }
    return elem;
  }
  function appendTabContextMenu(){
    let popup = document.getAnonymousElementByAttribute(self.tabMail, "anonid", "tabContextMenu"),
        items = [
          createElement("menuitem", {
            label: bundle.getString("tabContextMenu.copyTitle.label"),
            oncommand: "WAT.copy('TITLE')"
          }),
          createElement("menuitem", {
            label: bundle.getString("tabContextMenu.copyUrl.label"),
            oncommand: "WAT.copy('URL')"
          })
        ];
    items.forEach(function(item){
      popup.appendChild(item);
    });

    popup.addEventListener("popupshowing", function(event){
      let [iTab, tab, tabNode] = self.tabMail._getTabContextForTabbyThing(document.popupNode);
      if ("mode" in tab && (tab.mode.type == "contentTab" || tab.mode.type == "chromeTab")){
          items.forEach(function(item){
            if (item.hasAttribute("hidden"))
              item.removeAttribute("hidden");
          });
      } else {
        items.forEach(function(item){
          item.setAttribute("hidden", "true");
        });
      }
    }, true);
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
        args.clickHandler = "WAT.siteClickHandler(event, " + reg.toSource() + ")";
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
    get middleClickIsNewTab(){
      return prefService.getBoolPref(WAT_PREFBRANCH_MIDDLECLICK_IN_NEWTAB);
    },
    set middleClickIsNewTab(value){
      let bool = !!value;
      prefService.setBoolPref(WAT_PREFBRANCH_MIDDLECLICK_IN_NEWTAB, bool);
      return bool;
    },
    contentAreaClickHandler: function WAT_contentAreaClickHandler(aEvent){
      let href = hRefForClickEvent(aEvent);
      if (href && aEvent.button == 1){
        let uri = makeURI(href);
        if (uri.schemeIs("http") || uri.schemeIs("https") || uri.schemeIs("about")){
          aEvent.preventDefault();
          WAT.openTab(href);
          return true;
        }
      }
      return false;
    },
    /*
     * @see specialTabs.siteClickHandler
     */
    siteClickHandler: function WAT_siteClickHandler(aEvent, aSiteRegExp){
      if (!aEvent.isTrusted || aEvent.getPreventDefault() || aEvent.button == 2)
        return true;

      let href = hRefForClickEvent(aEvent, true);
      if (href){
        let uri = makeURI(href);
        if (!specialTabs._protocolSvc.isExposedProtocol(uri.scheme) ||
            ((uri.schemeIs("http") || uri.schemeIs("https") ||
              uri.schemeIs("about")) && !aSiteRegExp.test(uri.spec))) {
          aEvent.preventDefault();
          if (aEvent.button == 1 && WAT.middleClickIsNewTab)
            WAT.openTab(href);
          else
            openLinkExternally(href);
        } else if (aEvent.button == 1) {
          aEvent.preventDefault();
          if (WAT.middleClickIsNewTab)
            WAT.openTab(href);
          else
            openLinkExternally(href);
        }
      }
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
        let menuitem = createElement("menuitem", {
          label: page.label,
          oncommand: "WAT.openTab('" + page.url + "')"
        });
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
    },
    copy: function WAT_copy(label){
      const clipboardHelper = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
      let [iTab, tab, tabNode] = this.tabMail._getTabContextForTabbyThing(document.popupNode);
      if (!("browser" in tab))
        return;
      switch(label){
        case "TITLE":
          str = tab.browser.contentTitle;
          break;
        case "URL":
          str = tab.browser.currentURI.spec;
          break;
        default:
          return;
      }
      if (str)
        clipboardHelper.copyString(str);
    }
  };
  window.addEventListener("load", init, false);
  return self;
})();
// vim: sw=2 ts=2 et:
