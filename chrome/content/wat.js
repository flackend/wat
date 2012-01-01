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
  const searchService = Cc["@mozilla.org/browser/search-service;1"].getService(Ci.nsIBrowserSearchService);
  const WAT_FORWARD_CMD = "wat_cmd_browserGoForward",
        WAT_BACK_CMD    = "wat_cmd_browserGoBack",
        WAT_BOOKMARK_PAGE_CMD = "wat_cmd_bookmarkThisPage",
        WAT_SEND_PAGE_CMD = "wat_cmd_sendpage",
        WAT_SEND_LINK_CMD = "wat_cmd_sendlink";

  /**
   * Support browser forward and back.
   * @type {Ci.nsIController}
   */
  let browserController = {
    supportsCommand: function watBrowserSupportsCommand(aCommand){
      switch(aCommand){
        case WAT_FORWARD_CMD:
        case WAT_BACK_CMD:
        case WAT_BOOKMARK_PAGE_CMD:
        case WAT_SEND_PAGE_CMD:
        case WAT_SEND_LINK_CMD:
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
        case WAT_BOOKMARK_PAGE_CMD:
          let (browser = WAT.tabMail.getBrowserForSelectedTab()) {
            switch (browser.currentURI.scheme) {
              case "http":
              case "https":
              case "about":
              case "chrome":
                return true;
            }
            return false;
          }
        case WAT_SEND_LINK_CMD:
          if (!gContextMenu)
            return false;
          var uri = gContextMenu.getLinkURI();
        case WAT_SEND_PAGE_CMD:
          if (!uri)
            uri = WAT.tabMail.getBrowserForSelectedTab().currentURI;
          switch (uri.scheme) {
            case "http":
            case "https":
            case "ftp":
              return true;
          }
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
        case WAT_BOOKMARK_PAGE_CMD:
          WAT.bookmarkPage(WAT.tabMail.getBrowserForSelectedTab());
          break;
        case WAT_SEND_PAGE_CMD:
          WAT.mail.sendPage(WAT.tabMail.getBrowserForSelectedTab().contentWindow);
          break;
        case WAT_SEND_LINK_CMD:
          WAT.mail.sendMessage({ body: gContextMenu.getLinkURL() });
          break;
      }
    },
    onEvent: function watBrowserOnEvent(aEvent){ }
  };

  /**
   * An alias to document.getElementById
   * @param {String} id
   * @param {Element}
   */
  function $(id) {
    return document.getElementById(id);
  }

  /**
   * called when thunderbird is loaded
   */
  function init(){
    window.removeEventListener("load", init, false);

    migrateBookmarks();

    self.tabMail.addEventListener("DOMLinkAdded", WAT.handlers.onDOMLinkAdded, false);
    self.tabMail.registerTabMonitor(WAT.handlers.feeds.tabMonitor);

    /**
     * update tabProgressListener
     * @see chrome://messenger/content/specialTabs.js
     */
    _extends(tabProgressListener, {
      onLocationChange: function wat_onLocationChange (aWebProgress, aRequest, aLocationURI) {
        wat_onLocationChange.super.apply(this, arguments);
        WAT.handlers.feeds.update(this.mTab);
      },
      onStateChange: function wat_onStateChange (aWebProgress, aRequest, aStateFlags, aStatus) {
        wat_onStateChange.super.apply(this, arguments);
        const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
        if (aStateFlags & nsIWebProgressListener.STATE_START &&
            aStateFlags & nsIWebProgressListener.STATE_IS_NETWORK &&
            aRequest && aWebProgress.DOMWindow == this.mBrowser.contentWindow)
          this.mTab.feeds = null;
      },
      onRefreshAttempted: function wat_onRefreshAttempted (aWebProgress, aURI, aDelay, aSameURI) {
        return (aWebProgress.allowMetaRedirects && aWebProgress.currentURI.host == aURI.host);
      },
    });

    /**
     * @see browserController
     */
    window.controllers.appendController(browserController);

    // add openInNewTab ContextMenu on HTMLAnchorElement
    // and set forward and back menus
    $("mailContext").addEventListener("popupshowing", onMailContextPopupShowing, false);

    // overwrite contentArea(message panel in mail3pane) click handler
    // @see WAT_contentAreaClickHandler
    $("messagepane")
      .setAttribute("onclick", "return WAT.handlers.contentAreaClickHandler(event) || contentAreaClick(event)");

    // overwrite openUILink
    // add a feature case of middle-click
    window.openUILink = function watOpenUILink(url, event){
      if (event.button == 2)
        return;

      if (event.button == 1 || WAT.prefs.openLinkInTab) {
        let uri = makeURI(url);
        if (uri.schemeIs("http") || uri.schemeIs("https")){
          WAT.openTab(uri, isLoadInBackground(event));
          return;
        }
      }
      messenger.launchExternalURL(url);
    };

    appendTabContextMenu();

    window.addEventListener("customizationchange", initToolbar, false);
    initToolbar();
    self.searchEngines.init();

    let accounts = getAccountsByType("rss");
    let accountKey = WAT.prefs.feedAccountKey;
    if (accounts.length > 0) {
      if (!accountKey || !accounts.some(function(a) a.key == accountKey)){
        WAT.prefs.feedAccountKey = accounts[0].key;
      }
    } else if (accountKey){
      WAT.prefs.feedAccountKey = "";
    }
    Services.scriptloader.loadSubScript("chrome://wat/content/plugins/init.js", self.plugins);
  }

  function initToolbar () {
    initPlacesToolbar();
    self.searchEngines.init();
  }

  function initPlacesToolbar () {
    var placesToolbar = $("wat_PlacesToolbar");
    if (placesToolbar && !placesToolbar._viewElt)
      new PlacesToolbar("place:folder=TOOLBAR");
  }

  /**
   * import old bookmarks data to Places
   */
  function migrateBookmarks () {
    const WAT_PREFBRANCH_PAGES = "extensions.wat.pages";
    const prefs = window.Services.prefs;
    const BS = PlacesUtils.bookmarks;
    if (!prefs.prefHasUserValue(WAT_PREFBRANCH_PAGES))
      return;
    let pageString = prefs.getComplexValue(WAT_PREFBRANCH_PAGES, Ci.nsIPrefLocalizedString).data;
    let pages = JSON.parse(pageString);
    if (!(pages instanceof Array))
      return;

    for (let i = 0, len = pages.length; i < len; i++) {
      let page = pages[i];
      BS.insertBookmark(BS.bookmarksMenuFolder, makeURI(page.url), BS.DEFAULT_INDEX, page.label);
    }
    prefs.clearUserPref(WAT_PREFBRANCH_PAGES);
  }

  /**
   * @param {Object|Function} base
   * @param {Object} obj
   */
  function _extends (base, obj) {
    if (typeof base == "function")
      base = base.prototype;

    for (let [key, value] in Iterator(obj)) {
      if (typeof value == "function" && (key in base))
        value.super = base[key];

      base[key] = value;
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
    let isExternalLink = (c.onLink && !c.onMailtoLink &&
                          c.linkProtocol !== "about" && c.linkProtocol !== "chrome");
    c.showItem("wat_openNewTabMenu", isExternalLink);
    c.showItem("wat_sendLinkMenu", isExternalLink);
    [
      "wat_goForwardContextMenu",
      "wat_goBackContextMenu",
      "wat_bookmarkThisPage",
      "wat_sendPageMenu",
    ].forEach(function(id){
        let elm = $(id);
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
    let popup = document.getElementById("tabContextMenu") ||
                document.getAnonymousElementByAttribute(self.tabMail, "anonid", "tabContextMenu"),
        items = [
          createElement("menuitem", {
            label: self.bundle.getString("tabContextMenu.copyTitle.label"),
            oncommand: "WAT.handlers.copy('TITLE')"
          }),
          createElement("menuitem", {
            label: self.bundle.getString("tabContextMenu.copyUrl.label"),
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
  /**
   * @param {String} aType
   */
  function getAccountsByType(aType){
    const accountMgr = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);
    let accounts = [];
    for (let a in fixIterator(accountMgr.accounts, Ci.nsIMsgAccount)){
      if (!aType || a.incomingServer.type == aType)
        accounts.push(a);
    }
    return accounts;
  }
  /**
   * @param {Event} aEvent
   */
  function isLoadInBackground(aEvent){
    let bg = WAT.prefs.loadInBackground;
    if (aEvent.shiftKey)
      bg = !bg;
    return bg;
  }
  // 1}}}
  // --------------------------------------------------------------------------
  // Public Section
  // ----------------------------------------------------------------------{{{1
  let self = {
    /**
     * lazy get the 'tabmail' element
     * @type {Element}
     */
    get tabMail() {
      var tabmail = $("tabmail");
      delete this.tabMail;
      return this.tabMail = tabmail;
    },
    /**
     * lazy get the 'bundle_wat' element
     * @type {Element}
     */
    get bundle() {
      var bundle = $("bundle_wat");
      delete this.bundle;
      return this.bundle = bundle;
    },
    /**
     * @method
     * @param {String} host
     */
    get validateHost() {
      var validator = {};
      Cu.import("resource://wat/hostValidator.jsm", validator);
      delete this.validateHost;
      return this.validateHost = validator.validateHost;
    },
    /**
     * @param {nsIURI|String} uri
     * If the URL scheme given argument {url} is "chrome",
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
     * @param {Boolean} background
     * open tab in background
     *
     * Now, Thunderbird limits amount of tabs to 10 each types.
     * if the type of tab will over the limit,
     * show prompt about whether force open or not.
     */
    openTab: function WAT_openTab (uri, background){
      if (!(uri instanceof Ci.nsIURI)){
        try {
          uri = makeURI(uri, null, null);
        } catch(e){
          Components.utils.reportError(e);
          return;
        }
      }
      if (uri.schemeIs("mailto")) {
        msgComposeService.OpenComposeWindowWithURI(null, uri);
        return;
      }
      let pageName = uri.schemeIs("chrome") ? "chrome" : "content";
      let type = pageName + "Tab", page = pageName + "Page";
      let args = { background: !!background };
      args[page] = uri.spec;
      if (pageName == "content"){
        let reg;
        if (uri.schemeIs("http") || uri.schemeIs("https"))
          reg = new RegExp("^https?://" + uri.host.replace(/\./g,"\\.") + "($|/)");
        else
          reg = new RegExp("^" + uri.prePath.replace(/\./g, "\\.") + "($|/)");
        args.clickHandler = "WAT.handlers.siteClickHandler(event, " + reg.toSource() + ")";
      }
      let tabMode = this.tabMail.tabModes[type];
      if (tabMode.tabs.length >= tabMode.maxTabs){
        let res = {};
        Services.prompt.alertCheck(window,
          this.bundle.getFormattedString("maxTabs.overwrite.title", [tabMode.maxTabs]),
          this.bundle.getString("maxTabs.overwrite.msg"),
          this.bundle.getString("mexTabs.overwrite.check"),
          res);
        if (!res.value){
          return false;
        }
        this.tabMail.tabModes[type].maxTabs++;
      }
      let tab = this.tabMail.openTab(type, args);
      if (tab && type == "contentTab"){
        tab.tabNode.setAttribute("onerror", "this.removeAttribute('image')");
      }
      return tab;
    },
    /**
     * @param {String} text URL or search word
     */
    openURLorSearch: function WAT_openURLorSearch (text) {
      if (!text)
        return;

      var keyword = "",
          param = "",
          offset = text.indexOf(" "),
          url;
      if (offset > 0) {
        keyword = text.substr(0, offset);
        param = text.substr(offset).trim();
      } else {
        keyword = text;
      }
      var engine = searchService.getEngineByAlias(keyword);
      if (engine) {
        var submission = engine.getSubmission(param, null);
        url = submission.uri.spec;
      } else if (keyword) {
        var uri = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
                            .getService(Ci.nsINavBookmarksService)
                            .getURIForKeyword(keyword);
        if (uri) {
          var encodedParam = encodeURIComponent(param);
          url = uri.spec.replace(/%s/g, encodedParam).replace(/%S/g, param);
        }
      }
      if (url) {
        this.openTab(url);
      } else {
        try {
          uri = Cc["@mozilla.org/docshell/urifixup;1"].getService(Ci.nsIURIFixup)
                  .createFixupURI(text, Ci.nsIURIFixup.FIXUP_FLAG_ALLOW_KEYWORD_LOOKUP);
        } catch(e) {}

        if (!uri || ((uri.schemeIs("http") || uri.schemeIs("https")) && !this.validateHost(uri.host)))
          uri = searchService.currentEngine.getSubmission(text, null).uri;

        this.openTab(uri);
      }
    },
    /**
     * @param {String} aLeftPaneRoot
     */
    showPlacesOrganizer: function WAT_showPlacesOrganizer (aLeftPaneRoot) {
      var organizer = Services.wm.getMostRecentWindow("Places:Organizer");
      if (!organizer) {
        openDialog("chrome://wat/content/places/places.xul", "", "chrome,toolbar=yes,dialog=no,resizable", aLeftPaneRoot);
      } else {
        organizer.PlacesOrganizer.selectLeftPaneQuery(aLeftPaneRoot);
        organizer.focus();
      }
    },
    /**
     * @param {String} [aPanelID]
     */
    openPreferences: function WAT_openPreferences (aPanelID) {
      var prefWin = Services.wm.getMostRecentWindow("WAT:Preferences");
      if (prefWin) {
        prefWin.focus();
        if (aPanelID) {
          var pane = prefWin.document.getElementById(aPanelID);
          prefWin.document.documentElement.showPane(pane);
        }
        return prefWin;
      }
      return openDialog("chrome://wat/content/option.xul", "Preferences",
                        "chrome,titlebar,toolbar,centerscreen,resizable,dialog=no", aPanelID);
    },
    /**
     * mail
     * {{{2
     */
    mail: {
      sendMessage: function (aFields) {
        var params = Cc["@mozilla.org/messengercompose/composeparams;1"].createInstance(Ci.nsIMsgComposeParams);
        params.composeFields = Cc["@mozilla.org/messengercompose/composefields;1"].createInstance(Ci.nsIMsgCompFields);
        for (let key in aFields)
          params.composeFields[key] = aFields[key];

        params.type = Ci.nsIMsgCompType.New;
        msgComposeService.OpenComposeWindowWithParams(null, params);
      },
      sendPage: function (aWindow) {
        this.sendMessage({ subject: aWindow.document.title, body: aWindow.location.href });
      },
    },
    // 2}}}
    /**
     * preferences
     * {{{2
     */
    prefs: {
      /**
       * @type {String}
       */
      get feedAccountKey(){
        return Services.prefs.getCharPref("extensions.wat.feedaccount");
      },
      set feedAccountKey(value){
        value = value.toString();
        Services.prefs.setCharPref("extensions.wat.feedaccount");
        return value;
      },
      /**
       * @type {Boolean}
       */
      get openLinkInTab(){
        return Services.prefs.getBoolPref("extensions.wat.openLinkInTab");
      },
      set openLinkInTab(value){
        value = !!value;
        Services.prefs.setBoolPref("extensions.wat.openLinkInTab", value);
        return value;
      },
      /**
       * @type {Boolean}
       * @see WAT_siteClickHandler
       * if true, opens in a new tab on middle-click
       */
      get middleClickIsNewTab(){
        return Services.prefs.getBoolPref("extensions.wat.middleClickIsNewTab");
      },
      set middleClickIsNewTab(value){
        value = !!value;
        Services.prefs.setBoolPref("extensions.wat.middleClickIsNewTab", value);
        return value;
      },
      /**
       * @type {Boolean}
       * @see prefs "mail.tabs.loadInBackground"
       */
      get loadInBackground(){
        return Services.prefs.getBoolPref("mail.tabs.loadInBackground");
      },
      set loadInBackground(value){
        value = !!value;
        Services.prefs.setBoolPref("mail.tabs.loadInBackground", value);
        return value;
      }
    },
    // 2}}}
    /**
     * search engines
     * {{{2
     */
    searchEngines: (function(){
      const SEARCH_ENGINE_TOPIC   = "browser-search-engine-modified",
            SEARCH_ENGINE_ADDED   = "engine-added",
            SEARCH_ENGINE_CHANGED = "engine-changed",
            SEARCH_ENGINE_REMOVED = "engine-removed",
            SEARCH_ENGINE_CURRENT = "engine-current";
      var popupMenu = null, menuButton = null, inited = false;
      function createMenus () {
        while (popupMenu.hasChildNodes())
          popupMenu.removeChild(popupMenu.firstChild);

        var currentEngine = searchService.currentEngine;
        for (let [, engine] in Iterator(searchService.getVisibleEngines())) {
          var elm = createElement("menuitem", {
            label: engine.name,
            src: engine.iconURI.spec,
            class: "menuitem-iconic",
            tooltiptext: engine.description,
            oncommand: "WAT.searchEngines.setCurrent(this.label)"
          });
          if (currentEngine === engine)
            elm.setAttribute("selected", "true");

          popupMenu.appendChild(elm);
        }
      }
      function setCurrentEngine (engine) {
        menuButton.setAttribute("image", engine.iconURI.spec);
        menuButton.setAttribute("tooltiptext", engine.description);
        popupMenu.querySelector("menuitem[selected=true]").removeAttribute("selected");
        popupMenu.querySelector("menuitem[label=\"" + engine.name + "\"]").setAttribute("selected", "true");
        return engine;
      }
      var self = {
        init: function () {
          menuButton = $("wat_searchEngineButton");
          popupMenu = $("wat_searchEngineMenuPopup");
          if (popupMenu && menuButton) {
            createMenus();
            setCurrentEngine(searchService.currentEngine);
            Services.obs.addObserver(this, SEARCH_ENGINE_TOPIC, false);
            inited = true;
          } else if (inited && !(menuButton && popupMenu)) {
            Services.obs.removeObserver(this, SEARCH_ENGINE_TOPIC);
            inited = false;
          }
        },
        setCurrent: function setCurrentSearchEngine (engineName) {
          var engine = searchService.getEngineByName(engineName);
          if (engine)
            searchService.currentEngine = engine;

          return engine;
        },
        observe: function (aEngine, aTopic, aVerb) {
          if (aTopic !== SEARCH_ENGINE_TOPIC)
            return;

          switch (aVerb) {
          case SEARCH_ENGINE_ADDED:
          case SEARCH_ENGINE_CHANGED:
          case SEARCH_ENGINE_REMOVED:
            createMenus();
            break;
          case SEARCH_ENGINE_CURRENT:
            setCurrentEngine(aEngine);
            break;
          }
        }
      };
      return self;
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
       * or Ctrl + left-click or {@link WAT.prefs.openLinkInTab} is true
       *   opens the URL in a new tab and
       *   return true
       * else
       *   return false
       */
      contentAreaClickHandler: function WAT_contentAreaClickHandler(aEvent){
        let href = hRefForClickEvent(aEvent);
        if (href) {
          let uri = makeURI(href);
          if (aEvent.button == 1 || (aEvent.button == 0 && (aEvent.ctrlKey || WAT.prefs.openLinkInTab))) {
            if (uri.schemeIs("http") || uri.schemeIs("https") || uri.schemeIs("about")){
              aEvent.preventDefault();
              WAT.openTab(href, isLoadInBackground(aEvent));
              return true;
            }
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
        let background = isLoadInBackground(aEvent);
        if (href){
          let uri = makeURI(href);
          if (uri.schemeIs("javascript")){
            WAT.tabMail.currentTabInfo.browser.loadURI(uri.spec);
          } else if (!specialTabs._protocolSvc.isExposedProtocol(uri.scheme) ||
              ((uri.schemeIs("http") || uri.schemeIs("https") ||
                uri.schemeIs("about")) && !aSiteRegExp.test(uri.spec))) {
            aEvent.preventDefault();
            if ((aEvent.button == 1 && WAT.prefs.middleClickIsNewTab) ||
                (aEvent.button == 0 && aEvent.ctrlKey) ||
                WAT.prefs.openLinkInTab)
              WAT.openTab(href, background);
            else
              openLinkExternally(href);
          } else if (aEvent.button == 1) {
            aEvent.preventDefault();
            if (WAT.prefs.middleClickIsNewTab || aEvent.ctrlKey || WAT.prefs.openLinkInTab)
              WAT.openTab(href, background);
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
        let background = WAT.prefs.loadInBackground;
        if (gContextMenu && gContextMenu.linkURI){
          WAT.openTab(gContextMenu.linkURI, background);
        } else if (document.popupNode){
          let node = document.popupNode;
          try {
            var uri = makeURI(node.textContent);
          } catch(e){
            Components.reportError(e);
          }
          if (uri)
            WAT.openTab(uri, background);
        }
      },
      /**
       * called from tab's context menu
       * @param {String} label should be "TITLE" or "URL"
       */
      copy: function WAT_copy(label){
        const clipboardHelper = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
        let [iTab, tab, tabNode] = WAT.tabMail._getTabContextForTabbyThing(document.popupNode);
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
      feeds: {
        add: function wat_addFeed(link, tabInfo){
          if (!tabInfo.browser || !tabInfo.feeds)
            tabInfo.feeds = [];
          tabInfo.feeds.push({href: link.href, title: link.title});
          let currentTabInfo = WAT.tabMail.currentTabInfo;
          if (currentTabInfo.browser && currentTabInfo.browser == tabInfo.browser){
            let feedPanel = $("wat_feedpanel");
            if (feedPanel)
              feedPanel.collapsed = false;
          }
        },
        onSubscribe: function wat_feedSubscribe(aURL){
          let accounts = getAccountsByType("rss");
          if (accounts.length){
            //FIXME: should supports multi feed acounts
            //openSubscriptionsDialog(accounts[0].incomingServer.rootFolder);
            let w = Services.wm.getMostRecentWindow("Mail:News-BlogSubscriptions");
            let rootFolder = accounts[0].incomingServer.rootFolder;
            if (w){
              w.focus();
              w.gFeedSubscriptionsWindow.addFeed(aURL, rootFolder.URI);
            } else {
              w = window.openDialog("chrome://messenger-newsblog/content/feed-subscriptions.xul","",
                                "centerscreen,chrome,dialog=no,resizable",
                                { server: rootFolder.server, folder: rootFolder });
              w.addEventListener("load", function(){
                w.removeEventListener("load", arguments.collee, false);
                setTimeout(function(){
                  w.gFeedSubscriptionsWindow.addFeed(aURL, rootFolder.URI);
                }, 500);
              }, false);
            }
          }
        },
        popupShowing: function wat_feedMenuPopupShowing(){
          let feedMenus = $("wat_feedMenuPopup");
          while (feedMenus.firstChild)
            feedMenus.removeChild(feedMenus.firstChild);
          let tabInfo = WAT.tabMail.currentTabInfo;
          let feeds = tabInfo.feeds;
          if (!feeds || feeds.length == 0)
            return false;
          feeds.forEach(function(feed){
            let label = WAT.bundle.getFormattedString('feed.show.label', [feed.title || feed.href]);
            let menu = createElement("menuitem", {
              label: label,
              feed: feed.href,
              tooltiptext: feed.href,
              oncommand: "WAT.handlers.feeds.onSubscribe(this.getAttribute('feed'))",
              crop: "center"
            });
            feedMenus.appendChild(menu);
          });
          return true;
        },
        update: function(aTab){
          let feedPanel = $("wat_feedpanel");
          if (!WAT.prefs.feedAccountKey){
            feedPanel.collapsed = true;
            return;
          }
          if (!aTab)
            aTab = WAT.tabMail.currentTabInfo;
          if (aTab.feeds && aTab.feeds.length > 0)
            feedPanel.collapsed = false;
          else
            feedPanel.collapsed = true;
        },
        tabMonitor: {
          onTabSwitched: function wat_feedOnTabSwitched(aTab, aOldTab){
            WAT.handlers.feeds.update(aTab);
          },
          onTabTitleChanged: function(){ }
        },
      },
      /**
       * @param {Event} aEvent DOMLinkAdded event
       */
      onDOMLinkAdded: function wat_onDOMLinkAdded (aEvent){
        let link = aEvent.originalTarget;
        let rel = link.rel && link.rel.toLowerCase();
        let feedAdded = false;
        if (!link || !link.ownerDocument || !rel || !link.href)
          return;
        let rels = rel.split(/\s+/);
        for (let i=0, len=rels.length; i < len; i++){
          switch(rels[i]){
          case "alternate":
            if (rels.some(function(r) r == "stylesheet"))
              break;
          case "feed":
            if (feedAdded)
              break;
            let type = link.type.replace(/^\s*|\s*(?:;.*)?$/g, "");
            if (type == "application/rss+xml" || type == "application/atom+xml"){
              try {
                urlSecurityCheck(link.href, link.ownerDocument.nodePrincipal,
                  Ci.nsIScriptSecurityManager.DISALLOW_INHERIT_PRINCIPAL);
              } catch(e){
                break;
              }
              let tabInfo = WAT.tabMail.getBrowserForDocument(link.ownerDocument.defaultView);
              if (tabInfo){
                WAT.handlers.feeds.add(link, tabInfo);
                feedAdded = true;
              }
            }
            break;
          case "icon":
            /**
             * @deprecated Already in Thunderbird 3.3a3
             * @see https://bugzilla.mozilla.org/show_bug.cgi?id=516777
             * @see http://hg.mozilla.org/comm-central/rev/c51913c44f24
             */
            break;
          }
        }
      },
    },
    // 2}}}
    bookmarkPage: function WAT_BookmarkPage (aBrowser) {
      var uri = aBrowser.currentURI,
          webNav = aBrowser.webNavigation,
          info = {
            action: "add",
            type: "bookmark",
            uri: uri,
          };
      try {
        info.title = webNav.document.title || uri.spec;
        info.description = PlacesUIUtils.getDescriptionFromDocument(webNav.document);
        info.charset = webNav.document.characterSet;
      } catch (e) { }

      return PlacesUIUtils.showBookmarkDialog(info, window, true);
    },
    plugins: { },
  };
  window.addEventListener("load", init, false);
  return self;
  // 1}}}
})();
// vim: sw=2 ts=2 et fdm=marker:
