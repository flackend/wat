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
  const Cc = Components.classes,
        Ci = Components.interfaces,
        Cu = Components.utils;
  const WAT_FORWARD_CMD = "wat_cmd_browserGoForward",
        WAT_BACK_CMD    = "wat_cmd_browserGoBack";
  let popupElm = null, menuSep = null, bundle = null;

  /**
   * Support browser forward and back.
   * @type {Ci.nsIController}
   */
  let browserController = {
    supportsCommand: function watBrowserSupportsCommand(aCommand){
      switch(aCommand){
        case WAT_FORWARD_CMD:
        case WAT_BACK_CMD:
          return true;
        default:
          return false;
      }
    },
    isCommandEnabled: function watBrowserIsCommandEnabled(aCommand){
      let forward = false;
      switch(aCommand){
        case WAT_FORWARD_CMD:
          forward = true;
        case WAT_BACK_CMD:
          let browser = WAT.tabMail.getBrowserForSelectedTab();
          if (browser.sessionHistory)
            return forward ? browser.canGoForward : browser.canGoBack;
          else
            return false;
        default:
          return false;
      }
    },
    doCommand: function watBrowserDoCommand(aCommand){
      switch(aCommand){
        case WAT_FORWARD_CMD:
          WAT.tabMail.getBrowserForSelectedTab().goForward();
          break;
        case WAT_BACK_CMD:
          WAT.tabMail.getBrowserForSelectedTab().goBack();
          break;
      }
    },
    onEvent: function watBrowserOnEvent(aEvent){ }
  };
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

    updateTabMail(self.tabMail);
    /**
     * @see browserController
     */
    window.controllers.appendController(browserController);

    // add openInNewTab ContextMenu on HTMLAnchorElement
    // and set forward and back menus
    document.getElementById("mailContext")
      .addEventListener("popupshowing", onMailContextPopupShowing, false);

    // overwrite contentArea(message panel in mail3pane) click handler
    // @see WAT_contentAreaClickHandler
    document.getElementById("messagepane")
      .setAttribute("onclick", "return WAT.handlers.contentAreaClickHandler(event) || contentAreaClick(event)"); 

    // on Thunderbird started up and restored tabs,
    // call setTabIconUpdator each tabInfo of "contentTab" type
    // once.
    let restoreTabsFunc = self.tabMail.restoreTabs;
    self.tabMail.restoreTabs = function(){
      restoreTabsFunc.apply(self.tabMail, arguments);
      for each(let info in self.tabMail.tabInfo){
        if ("browser" in info && info.mode.type == "contentTab"){
          enableSessionHistory(info.browser);
          info.tabNode.setAttribute("onerror", "this.removeAttribute('image')");
        }
      }
      self.tabMail.restoreTabs = restoreTabsFunc;
    }
    delete restoreTabsFunc;

    // overwrite openUILink
    // add a feature case of middle-click
    window.openUILink = function watOpenUILink(url, event){
      if (!event.button){
          messenger.launchExternalURL(url);
      } else if (event.button == 1){
        let uri = makeURI(url);
        if (uri.schemeIs("http") || uri.schemeIs("https")){
          WAT.openTab(uri);
        }
      }
    };

    appendTabContextMenu();

    self.loadScript("chrome://wat/content/plugins/init.js", self.plugins);
  }

  /**
   * append functions to #tabmail
   * @param {Element} tabMail
   */
  function updateTabMail(tabMail){
    /**
     * @param {Object} aTabInfo
     */
    tabMail.updateIcon = function watUpdateIcon(aTabInfo){
      if (!("browser" in aTabInfo))
        return;

      let browser = aTabInfo.browser;
      if (!aTabInfo.busy && browser.mIconURL){
        aTabInfo.tabNode.setAttribute("image", browser.mIconURL);
        prefUpdateIcon(aTabInfo, browser.mIconURL);
      } else {
        aTabInfo.tabNode.removeAttribute("image");
      }
    };
    /**
     * @param {Object} aTabInfo
     */
    tabMail.useDefaultIcon = function watUseDefaultIcon(aTabInfo){
      if (!("browser" in aTabInfo))
        return;
      let browser = aTabInfo.browser;
      let uri = browser.contentDocument.documentURIObject;
      if (browser.contentDocument instanceof ImageDocument){
        // XXX: now not implemented
        return;
      } else if (uri.schemeIs("http") || uri.schemeIs("https")){
        browser.mIconURL = uri.prePath + "/favicon.ico";
        this.updateIcon(aTabInfo);
      }
    };
    /**
     * @param {Object} aTabInfo
     * @param {String} iconURL
     */
    function prefUpdateIcon(aTabInfo, iconURL){
      let isUpdated = false;
      let pages = WAT.prefs.pages;
      let prePath = aTabInfo.browser.currentURI.prePath;
      for (let i=0, len=pages.length; i<len; i++){
        let page = pages[i];
        if (page.icon != iconURL && page.url.indexOf(prePath) == 0){
          page.icon = iconURL;
          isUpdated = true;
        }
      }
      if (isUpdated)
        WAT.prefs.pages = pages;
    }
    /**
     * @param {Document} aDocument
     */
    function getTabForDocument(aDocument){
      let info = tabMail.tabInfo.filter(function(tabInfo){
        return ("browser" in tabInfo && tabInfo.browser.contentDocument == aDocument)
      });
      if (info.length > 0)
        return info[0];
      return null;
    }
    /**
     * @param {Event} aEvent DOMLinkAdded event
     */
    function onDOMLinkAdded(aEvent){
      let link = aEvent.originalTarget;
      let rel = link.rel && link.rel.toLowerCase();
      let iconAdded = false;
      if (!link || !link.ownerDocument || !rel || !link.href)
        return;
      let rels = rel.split(/\s+/);
      for (let i=0, len=rels.length; i<len; i++){
        switch(rels[i]){
          case "feed":
          case "alternate":
            // XXX: not implemented
            break;
          case "icon":
            if (iconAdded)
              break;
            let targetDoc = link.ownerDocument;
            let uri = makeURI(link.href, targetDoc.characterSet);
            if (uri.schemeIs("chrome"))
              break;
            try {
              urlSecurityCheck(uri, targetDoc.nodePrincipal, Ci.nsIScriptSecurityManager.DISALLOW_SCRIPT);
            } catch(e){
              break;
            }
            try {
              var contentPolicy = Cc["@mozilla.org/layout/content-policy;1"]
                                  .getService(Ci.nsIContentPolicy);
            } catch(e){
              break;
            }
            if (contentPolicy.shouldLoad(Ci.nsIContentPolicy.TYPE_IMAGE,
                                         uri, targetDoc.documentURIObject,
                                         link, link.type, null)
              != Ci.nsIContentPolicy.ACCEPT)
              break;
            let tabInfo = getTabForDocument(targetDoc);
            if (!tabInfo)
              break;
            tabInfo.browser.mIconURL = uri.spec;
            tabMail.updateIcon(tabInfo);
            iconAdded = true;
        }
      }
    }
    tabMail.addEventListener("DOMLinkAdded", onDOMLinkAdded, false);
  }

  const os = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
  /**
   * enable session history of the browser
   * @param {Element} browser
   */
  function enableSessionHistory(browser){
    if (!browser.hasAttribute("disablehistory"))
      return;
    browser.removeAttribute("disablehistory");
    try {
      os.addObserver(browser, "browser:purge-session-history", false);
      browser.webNavigation.sessionHistory =
        Cc["@mozilla.org/browser/shistory;1"].createInstance(Ci.nsISHistory);
    } catch(e){
      Components.utils.reportError(e);
    }
  }

  /**
   * popup#mailContext's popupshowing event handler
   * @see nsContextMenu in chrome://messenger/content/nsContextMenu.js
   */
  function onMailContextPopupShowing(aEvent){
    let c = gContextMenu;
    let notOnSpecialItem = !(c.inMessageArea || c.isContentSelected ||
                             c.onCanvas || c.onLink || c.onImage ||
                             c.onPlayableMedia || c.onTextInput);
    c.showItem("wat_openNewTabMenu", c.onLink && !c.onMailtoLink &&
                c.linkProtocol != "about" && c.linkProtocol != "chrome");
    ["wat_goForwardContextMenu", "wat_goBackContextMenu"]
      .forEach(function(id){
        let elm = document.getElementById(id);
        c.showItem(elm, notOnSpecialItem);
        if (notOnSpecialItem){
          goUpdateCommand(elm.command);
        }
      });

    return true;
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
            oncommand: "WAT.handlers.copy('TITLE')"
          }),
          createElement("menuitem", {
            label: bundle.getString("tabContextMenu.copyUrl.label"),
            oncommand: "WAT.handlers.copy('URL')"
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
  // 1}}}
  // --------------------------------------------------------------------------
  // Public Section
  // ----------------------------------------------------------------------{{{1
  let self = {
    /** tabmail element is set on thunderbird loaded. @see init() */
    tabMail: null,
    /**
     * @param {nsIURI|String} uri
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
     *   and enable session-history (@see enableSessionHistory)
     *
     * Now, Thunderbird limits amount of tabs to 10 each types.
     * if the type of tab will over the limit,
     * show prompt about whether force open or not.
     */
    openTab: function WAT_openTab (uri){
      if (!(uri instanceof Ci.nsIURI)){
        try {
          uri = makeURI(uri, null, null);
        } catch(e){
          Components.utils.reportError(e);
          return;
        }
      }
      let pageName = (uri.schemeIs("chrome") || uri.schemeIs("about")) ? "chrome" : "content";
      let type = pageName + "Tab", page = pageName + "Page";
      let args = {};
      args[page] = uri.spec;
      if (pageName == "content"){
        let reg = new RegExp("^" + uri.prePath.replace(/\./g, "\\.") + "($|/)");
        args.clickHandler = "WAT.handlers.siteClickHandler(event, " + reg.toSource() + ")";
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
      if (tab && type == "contentTab"){
        enableSessionHistory(tab.browser);
        tab.tabNode.setAttribute("onerror", "this.removeAttribute('image')");
      }
      return tab;
    },
    /**
     * preferences
     * {{{2
     */
    prefs: (function(){
      const WAT_PREFBRANCH_PAGES = "extensions.wat.pages",
            WAT_PREFBRANCH_MIDDLECLICK_IN_NEWTAB = "extensions.wat.middleClickIsNewTab";
      const prefService = Cc["@mozilla.org/preferences-service;1"]
                          .getService(Ci.nsIPrefService)
                          .QueryInterface(Ci.nsIPrefBranch2);
      let pagesObserver = {
        observe: function pages_observe(aSubject, aTopic, aData){
          /** @see WAT_regenerateMenu */
          WAT.regenerateMenu();
        }
      };
      prefService.addObserver(WAT_PREFBRANCH_PAGES, pagesObserver, false);
      // ----------------------------------------------------------------------
      // Preference Public Section
      // ------------------------------------------------------------------{{{3
      let publicPrefs = {
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
         * @return {Array}
         * [{
         *    label: "page-title",
         *    url: "page-url"
         *    icon: "favicon-url"(optional)
         * }, {
         *    // ...
         * }]
         */
        get pages(){
          if (!prefService.prefHasUserValue(WAT_PREFBRANCH_PAGES))
            return [];
          let pageString = prefService.getComplexValue(WAT_PREFBRANCH_PAGES, Ci.nsIPrefLocalizedString).data;
          let pages = JSON.parse(pageString);
          if (pages instanceof Array)
            return pages;
          return [];
        },
        set pages(value){
          try {
            var pages = JSON.stringify(value);
          } catch(e){
            Cu.reportError(e);
            return null;
          }
          let supportString = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
          supportString.data = pages
          prefService.setComplexValue(WAT_PREFBRANCH_PAGES, Ci.nsISupportsString, supportString);
          return pages;
        }
      };
      return publicPrefs;
      // 3}}}
    })(),
    // 2}}}
    /**
     * hadlers
     * {{{2
     */
    handlers: { 
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
          if (uri.schemeIs("javascript")){
            WAT.tabMail.currentTabInfo.browser.loadURI(uri.spec);
          } else if (!specialTabs._protocolSvc.isExposedProtocol(uri.scheme) ||
              ((uri.schemeIs("http") || uri.schemeIs("https") ||
                uri.schemeIs("about")) && !aSiteRegExp.test(uri.spec))) {
            aEvent.preventDefault();
            if (aEvent.button == 1 && WAT.prefs.middleClickIsNewTab)
              WAT.openTab(href);
            else
              openLinkExternally(href);
          } else if (aEvent.button == 1) {
            aEvent.preventDefault();
            if (WAT.prefs.middleClickIsNewTab)
              WAT.openTab(href);
            else
              openLinkExternally(href);
          }
        }
      },
      /**
       * called from context menu on HTMLAnchorElement
       * or RSS feed message header
       * @see command#wat_openNewTabCmd in windowOverlay.xul
       * @see popup#copyUrlPopup in chrome://messenger/content/msgHdrViewOverlay.xul
       * @see nsContextMenu in chrome://messenger/content/nsContextMenu.js
       */
      onOpenNewTab: function WAT_onOpenNewTab(){
        if (gContextMenu && gContextMenu.linkURI){
          WAT.openTab(gContextMenu.linkURI);
        } else if (document.popupNode){
          let node = document.popupNode;
          try {
            var uri = makeURI(node.textContent);
          } catch(e){
            Components.reportError(e);
          }
          if (uri)
            WAT.openTab(uri);
        }
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
      },
    },
    // 2}}}
    /**
     * called when thunderbird is loaded and
     * "extensions.wat.pages" is modified
     */
    regenerateMenu: function WAT_regenerateMenu(){
      removeAllElementUntilSep(popupElm, menuSep.id);
      let pages = this.prefs.pages;

      pages.forEach(function(page){
        let menuitem = createElement("menuitem", {
          label: page.label,
          image: page.icon || "",
          validate: "never",
          class: "menuitem-iconic",
          url: page.url,
          oncommand: "WAT.openTab(this.getAttribute('url'))"
        });
        popupElm.insertBefore(menuitem, menuSep);
      });
    },
    /**
     * called from menu in Toolbar(WAT)
     * @see command#wat_openURLCmd in windowOverlay.xul
     */
    openURLDialog: function WAT_openURLDialog(){
      openDialog("chrome://wat/content/openURL.xul","_blank", "chrome,modal,titlebar", window);
    },
    /**
     * @param {String} url
     * @param {Object} context
     */
    loadScript: function WAT_loadScript(url, context){
      const ssl = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);
      ssl.loadSubScript(url, context);
    },
    plugins: { },
  };
  window.addEventListener("load", init, false);
  return self;
  // 1}}}
})();
// vim: sw=2 ts=2 et fdm=marker:
