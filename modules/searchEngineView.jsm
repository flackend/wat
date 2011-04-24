
const Cc = Components.classes,
      Ci = Components.interfaces,
      Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const ENGINE_FLAVOR = "text/x-moz-search-engine";

XPCOMUtils.defineLazyServiceGetter(this, "searchService",
  "@mozilla.org/browser/search-service;1", "nsIBrowserSearchService");

var EXPORTED_SYMBOLS = ["EngineListView"];

/**
 * @constructor
 * @public
 */
function EngineListView () {
  /**
   * @type {nsITreeBoxObject} see {@link EngineListView#setTree}
   * @see http://www.oxymoronical.com/experiments/apidocs/interface/nsITreeBoxObject
   */
  this.treeBox = null;
  /**
   * @type {nsISearchEngine[]}
   * @see http://www.oxymoronical.com/experiments/apidocs/interface/nsISearchEngine
   */
  this.engines = [];
}
EngineListView.prototype = {
  rebuild: function ELV_rebuild () {
    this.engines = searchService.getVisibleEngines();
  },
  rowCountChanged: function ELV_rowCountChanged (aEngine, aCount) {
    var i;
    if (aCount > 0) {
      this.rebuild();
      i = this.engines.indexOf(aEngine);
    } else if (aCount < 0) {
      i = this.engines.indexOf(aEngine);
      this.rebuild();
    }
    this.treeBox.rowCountChanged(i, aCount);
  },
  invalidate: function ELV_invalidate () {
    this.treeBox.invalidate();
  },
  get lastIndex () {
    return this.rowCount - 1;
  },
  get selectedIndex () {
    var seln = this.selection;
    if (seln.getRangeCount() > 0) {
      var min = {};
      seln.getRangeAt(0, min, {});
      return min.value;
    }
    return -1;
  },
  getSourceIndexFromDrag: function ELV_getSourceIndexFromDrag (aDataTransfer) {
    return parseInt(aDataTransfer.getData(ENGINE_FLAVOR), 10);
  },
  setTree: function ELV_setTree (aTreeBox) {
    this.rebuild();
    this.treeBox = aTreeBox;
  },
  get rowCount() {
    return this.engines.length;
  },
  getImageSrc: function ELV_getImageSrc (aRow, aColumn) {
    if (aColumn.index == 0 && this.engines[aRow].iconURI)
      return this.engines[aRow].iconURI.spec;
    return "";
  },
  getCellText: function ELV_getCellText (aRow, aColumn) {
    switch (aColumn.element.getAttribute("anonid")) {
    case "name":
      return this.engines[aRow].name;
    case "keyword":
      return this.engines[aRow].alias;
    case "description":
      return this.engines[aRow].description;
    }
    return "";
  },
  getCellValue: function ELV_getCellValue (aRow, aColumn) {
    if (aColumn.type == aColumn.TYPE_CHECKBOX &&
        aColumn.element.getAttribute("anonid") == "suggest")
      return this.engines[aRow].supportsResponseType("application/x-suggestions+json");
    return "";
  },
  canDrop: function ELV_canDrop (aTargetIndex, aOrientation, aDataTransfer) {
    var sourceIndex = this.getSourceIndexFromDrag(aDataTransfer);
    return sourceIndex != -1 && sourceIndex != aTargetIndex && sourceIndex != (aTargetIndex + aOrientation);
  },
  drop: function ELV_drop (aTargetIndex, aOrientation, aDataTransfer) {
    var sourceIndex = this.getSourceIndexFromDrag(aDataTransfer);
    var sourceEngine = this.engines[sourceIndex];
    if (aTargetIndex > sourceIndex) {
      if (aOrientation == Ci.nsITreeView.DROP_BEFORE)
        aTargetIndex--;
    } else if (aOrientation == Ci.nsITreeView.DROP_AFTER)
      aTargetIndex++;

    searchService.moveEngine(sourceEngine, aTargetIndex);
    this.engines = searchService.getVisibleEngines();
    this.treeBox.invalidate();
    this.selection.clearSelection();
    this.selection.select(aTargetIndex);
  },
  selection: null,
  getRowProperties: function ELV_getRowProperties (aRow, aProperites) {},
  getCellProperties: function ELV_getCellProperties (aRow, aColumn, aProperties) {},
  getColumnProperties: function ELV_getColumnProperties (aColumn, aProperties) {},
  isContainer: function ELV_isContainer (aRow) { return false; },
  isContainerOpen: function ELV_isContainerOpen (aRow) { return false; },
  isContainerEmpty: function ELV_isContainerEmpty (aRow) { return false; },
  isSeparator: function ELV_isSeparator (aRow) { return false; },
  isSorted: function ELV_isSorted (aRow) { return false; },
  getParentIndex: function ELV_getParentIndex (aRow) { return -1; },
  hasNextSibling: function ELV_hasNextSibling (aRow, aAfterRow) {
    return !!this.engines[aAfterRow];
  },
  getLevel: function ELV_getLevel (aRow) { return 0; },
  getProgressMode: function ELV_getProgressMode (aRow, aColumn) {},
  toggleOpenState: function ELV_toggleOpenState (aRow) {},
  cycleHeader: function ELV_cycleHeader (aColumn) {},
  selectionChanged: function ELV_selectionChanged() {},
  cycleCell: function ELV_cycleCell (aRow, aColumn) {},
  isEditable: function ELV_isEditable (aRow, aColumn) {
    return aColumn.editable;
  },
  isSelectable: function ELV_isSelectable (aRow, aColumn) { return false; },
  setCellValue: function ELV_setCellValue (aRow, aColumn, aValue) {},
  setCellText: function ELV_setCellText (aRow, aColumn, aValue) {
    if (aColumn.element.getAttribute("anonid") != "keyword")
      return;
    this.engines[aRow].alias = aValue;
  },
  performAction: function ELV_performAction (aAction) {},
  performActionOnRow: function ELV_performActionOnRow (aAction, aRow) {},
  performActionOnCell: function ELV_performActionOnCell (aAction, aRow, aColumn) {},
};

/**
 * @methodOf EngineListView
 */
function onDragEngineStart (aEvent) {
  var tree = aEvent.target.parentNode;
  var sel = tree.view.selection;
  if (sel.getRangeCount() > 0) {
    let min = {};
    sel.getRangeAt(0, min, {});
    aEvent.dataTransfer.setData(ENGINE_FLAVOR, min.value);
    aEvent.dataTransfer.effectAllowd = "move";
  }
}
EngineListView.onDragEngineStart = onDragEngineStart;

// vim: sw=2 ts=2 et fdm=marker:
