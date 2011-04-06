
/**
 * @namespace
 */
var gSearchEngineManager = {
  tree: null,
  init: function () {
    Components.utils.import("resource://wat/searchEngineView.jsm", this);
    this.tree = document.getElementById("engineList");
    this.tree.view = new this.EngineListView();
  }
};

// vim: sw=2 ts=2 et fdm=marker:
