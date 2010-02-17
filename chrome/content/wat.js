/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is WAT
 *
 * The Initial Developer of the Original Code is WAT
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   teramako <teramako@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

let WAT = (function(){
  // --------------------------------------------------------------------------
  // Private Section
  // ----------------------------------------------------------------------{{{1
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
      /** @see WAT_regenerateMenu */
      self.regenerateMenu();
    }
  };
  prefService.addObserver(WAT_PREFBRANCH_PAGES, pagesObserver, false);
  /**
   * called when thunderbird is loaded
   */
  function init(){
    window.removeEventListener("load", init, false);
    self.tabMail = document.getElementById("tabmail");
    popupElm = document.getElementById("wat_menuPopup");
    menuSep = document.getElementById("wat_menu_sep");
    bundle = document.getElementById("bundle_wat");
    self.regenerateMenu();

    // add openInNewTab ContextMenu on HTMLAnchorElement
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

    // overwrite contentArea(message panel in mail3pane) click handler
    // @see WAT_contentAreaClickHandler
    document.getElementById("messagepane")
      .setAttribute("onclick", "return WAT.contentAreaClickHandler(event) || contentAreaClick(event)"); 

    appendTabContextMenu();
  }
  /**
   * createElement
   * @param tagName {String}
   * @param attrs {Object} attribute's names and values.
   *              like that:
   *              {
   *                attributeName: attributeValue,
   *                ...
   *              }
   * @return elem {Element}
   */
  function createElement(tagName, attrs){
    let elem = document.createElement(tagName);
    for (let name in attrs){
      elem.setAttribute(name, attrs[name]);
    }
    return elem;
  }
  /**
   * append feature copy the URL or the title
   * to tab's context menu
   * @see WAT_copy
   */
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

    // on popupshowing tab's context menu
    // show copy menus if tab's type is "contentTab" or "chromeTab"
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
  /**
   * remove {parentElm}'s childNodes from first element to {sepId}'s element
   * @param parentElm {Element} should be "menupoup" element
   * @param sepId {String}
   */
  function removeAllElementUntilSep(parentElm, sepId){
    for (let i=0, len=parentElm.childNodes.length; i<len; i++){
      let elm = parentElm.firstChild;
      if (elm.id == sepId)
        return;

      parentElm.removeChild(elm);
    }
  }
  /**
   * get favicon URL and set the URL to the tab and 
   * preferece data.
   * favicon URL:
   *  1) href attribute of link[rel="shortcut icon"] in the content
   *  2) /favicon.ico
   * @param {Object} tabInfo
   */
  function setTabIconUpdater(tabInfo){
    let browser = tabInfo.browser;
    let currentPrePath;
    /**
     * set the favicon to the tab and update registered preference data if exists
     * @param {String} iconURL
     */
    function setIcon(iconURL){ // {{{2
      tabInfo.tabNode.image = iconURL;
      let isUpdated = false;
      if (prefService.prefHasUserValue(WAT_PREFBRANCH_PAGES)){
        let pages = JSON.parse(prefService.getComplexValue(WAT_PREFBRANCH_PAGES, Ci.nsIPrefLocalizedString).data);
        if (!(pages instanceof Array)) return;
        let prePath = browser.currentURI.prePath;
        for (let i=0, len=pages.length; i<len; i++){
          let page = pages[i];
          if (page.icon != iconURL && page.url.indexOf(prePath) == 0){
            page.icon = iconURL;
            isUpdated = true;
          }
        }
        if (isUpdated){
          let supportString = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
          supportString.data = JSON.stringify(pages);
          prefService.setComplexValue(WAT_PREFBRANCH_PAGES, Ci.nsISupportsString, supportString);
        }
      }
    } // 2}}}
    /**
     * on DOMContentLoaded hander
     * @param {Event} aEvent
     */
    function onDOMContentLoaded(aEvent){ // {{{2
      let doc = aEvent.originalTarget;
      // only HTMLDocument and non-frame
      if (!(doc instanceof HTMLDocument) || doc.defaultView.frameElement)
        return;
      let link = browser.contentDocument.querySelector('link[rel="shortcut icon"]');
      if (link){
        setIcon(link.href);
      } else {
        let prePath = browser.currentURI.prePath;
        if (prePath == currentPrePath)
          return;
        let faviconURL = prePath + "/favicon.ico";
        let xhr = new XMLHttpRequest;
        xhr.mozBackgroundRequest = true;
        xhr.open("HEAD", faviconURL, true);
        xhr.onreadystatechange = function XHR_onreadystatechange(){
          if (xhr.readyState != 4)
            return;
          if (xhr.status == 200 && xhr.getResponseHeader("Content-Type") == "image/x-icon"){
            setIcon(faviconURL);
            cuurentPrePath = prePath;
          }
        };
        xhr.send(null);
      } // 2}}}
    }
    browser.addEventListener("DOMContentLoaded", onDOMContentLoaded, false);
  }
  // 1}}}
  // --------------------------------------------------------------------------
  // Public Section
  // ----------------------------------------------------------------------{{{1
  let self = {
    /** tabmail element is set on thunderbird loaded. @see init() */
    tabMail: null,
    /**
     * @param url {String}
     * If the URL scheme given argument {url} is "chrome" or "about",
     *   use "chromeTab" type and
     *   set {url} to "chromePage" property
     * else
     *   use "contentTab" type and
     *   set {url} to "contentPage" property and
     *       siteClickHandler (@see WAT_siteClickHandler)
     *       which checks HTMLAnchorElement's href attribute
     *       whether the URL scheme is specific (e.g. "http" or "https") or not,
     *       then opens the URL in a new tab or external browser.
     *
     * Now, Thunderbird limits amount of tabs to 10 each types.
     * if the type of tab will over the limit,
     * show prompt about whether force open or not.
     */
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
      let tab = this.tabMail.openTab(type, args);
      setTabIconUpdater(tab);
      return tab;
    },
    /**
     * @type {Boolean}
     * @see WAT_siteClickHandler
     * if true, opens in a new tab on middle-click
     */
    get middleClickIsNewTab(){
      return prefService.getBoolPref(WAT_PREFBRANCH_MIDDLECLICK_IN_NEWTAB);
    },
    set middleClickIsNewTab(value){
      let bool = !!value;
      prefService.setBoolPref(WAT_PREFBRANCH_MIDDLECLICK_IN_NEWTAB, bool);
      return bool;
    },
    /**
     * @param aEvent {Event} MouseEvent
     * @return {Boolean} if true, the other operation should not be done
     * add middle-click handler on HTMLAnchorElement
     * to "messagepane" (message panel in mail3pane)
     * if {Event} is middle-click and the URL scheme is specific,
     *   opens the URL in a new tab and
     *   return true
     * else
     *   return false
     */
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
    /**
     * @param aEvent {Event} MouseEvent expect left or middle button
     * @param aSiteRegExp {RegExp} used whether
     *                    matches {aSiteRegExp} and the anchor URL or not.
     * @see WAT_openTab
     * @see middleClickIsNewTab
     *
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
    /**
     * called when thunderbird is loaded and
     * "extensions.wat.pages" is modified
     */
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
          image: page.icon || "",
          validate: "never",
          class: "menuitem-iconic",
          oncommand: "WAT.openTab('" + page.url + "')"
        });
        popupElm.insertBefore(menuitem, menuSep);
      });
    },
    /**
     * called from context menu on HTMLAnchorElement
     * @see command#wat_openNewTabCmd in windowOverlay.xul
     */
    onOpenNewTab: function WAT_onOpenNewTab(){
      let target = document.popupNode;
      if (target instanceof HTMLAnchorElement && target.href){
        this.openTab(target.href);
      }
    },
    /**
     * called from menu in Toolbar(WAT)
     * @see command#wat_openURLCmd in windowOverlay.xul
     */
    openURLDialog: function WAT_openURLDialog(){
      openDialog("chrome://wat/content/openURL.xul","_blank", "chrome,modal,titlebar", window);
    },
    /**
     * called from tab's context menu
     * @param {String} label should be "TITLE" or "URL"
     */
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
  // 1}}}
})();
// vim: sw=2 ts=2 et fdm=marker:
