
/**
 * @namespace
 */
var gSearchEngineManager = {
  tree: null,
  view: null,
  observerTopic: "browser-search-engine-modified",
  init: function () {
    Components.utils.import("resource://wat/searchEngineView.jsm", this);
    this.tree = document.getElementById("engineList");
    this.view = new this.EngineListView();
    this.tree.view = this.view;
    Services.obs.addObserver(this, this.observerTopic, false);
    window.addEventListener("unload", this.onUnload, false);
  },
  onUnload: function searchEnginePaneUnload () {
    window.removeEventListener("unload", arguments.callee, false);
    Services.obs.removeObserver(gSearchEngineManager, gSearchEngineManager.observerTopic);
  },
  loadOpenSearch: function loadOpenSearch () {
    var textBox = document.getElementById("openSearchURLText");
    var url = textBox.value;
    if (!url) {
      return;
    }
    var type = Components.interfaces.nsISearchEngine.DATA_XML;
    Services.search.addEngine(url, Components.interfaces.nsISearchEngine.DATA_XML, null, true);
  },
  observe: function enginObserve (aEngine, aTopic, aVerb) {
    if (aTopic == "browser-search-engine-modified") {
      aEngine.QueryInterface(Components.interfaces.nsISearchEngine);
      let view = gSearchEngineManager.view;
      switch (aVerb) {
      case "engine-changed":
      case "engine-current":
        break;
      case "engine-added":
        view.rowCountChanged(aEngine, 1);
        break;
      case "engine-removed":
        view.rowCountChanged(aEngine, -1);
        break;
      }
      view.invalidate();
    }
  },
};

// vim: sw=2 ts=2 et fdm=marker:
