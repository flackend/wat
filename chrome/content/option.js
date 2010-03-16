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

const Cc = Components.classes;
const Ci = Components.interfaces;
const prefService = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService)
                    .getBranch("extensions.wat.");
const ioService = Cc["@mozilla.org/network/io-service;1"]
                    .getService(Ci.nsIIOService);

let wat = (function(){
  // --------------------------------------------------------------------------
  // Private Section
  // ----------------------------------------------------------------------{{{1
  let siteNameTextBox, urlTextBox, listBox, statusLabel,
      addButton, deleteButton, upButton, downButton, feedaccountPopup;
  let isError = false;
  /**
   * like prototype.js
   * @param {String} id
   * @return {Element}
   */
  function $(id){
    return document.getElementById(id);
  }
  /**
   * save URL data to pereferences
   */
  function updateData(){
    let pages = [];
    for (let i=0, len=listBox.itemCount; i<len; i++){
      let item = listBox.getItemAtIndex(i);
      pages.push({
        label: item.childNodes[0].getAttribute("label"),
        url  : item.childNodes[1].getAttribute("label"),
        icon : item.childNodes[0].getAttribute("image") || null
      });
    }
    let supportString = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
    supportString.data = JSON.stringify(pages);
    prefService.setComplexValue("pages", Ci.nsISupportsString, supportString);
  }
  /**
   * create listitem element
   * and append to listbox#pageListBox
   * @param {Object} page
   *                 {
   *                  label: "page-title",
   *                  url: "page-url"
   *                  icon: "favicon-url"(optional)
   *                 }
   */
  function addItem(page){
    let item = document.createElement("listitem");
    let nameCell = document.createElement("listcell");
    nameCell.setAttribute("label", page.label);
    nameCell.setAttribute("class", "listcell-iconic");
    nameCell.setAttribute("image", page.icon || "");
    let urlCell = document.createElement("listcell");
    urlCell.setAttribute("label", page.url);
    item.appendChild(nameCell);
    item.appendChild(urlCell);
    listBox.appendChild(item);
  }
  /**
   * @param {String} url
   * @return {nsIURI|null}
   */
  function getURI(url){
    try {
      let uri = ioService.newURI(url, null, null);
      return uri;
    } catch(e){
      return null;
    }
  }
  /**
   * @param {String} msg Error Message
   */
  function showErrorStatus(msg){
    statusLabel.setAttribute("value", "ERROR: " + msg);
    statusLabel.setAttribute("class", "error");
    isError = true;
  }
  function resetStatus(){
    if (isError){
      statusLabel.setAttribute("value", "");
      statusLabel.setAttribute("class", "");
      isError = false;
    }
  }
  function resetTextboxes(){
    siteNameTextBox.value = "";
    urlTextBox.value = "";
    addButton.setAttribute("disabled","true");
  }
  function supportsArrayIterator(array, iface){
    let iter = function(){
      var count = array.Count();
      for (let i = 0; i < count; i++){
        yield array.QueryElementAt(i, iface);
      }
    };
    return {__iterator__: iter};
  }
  function initializeFeedAccount(){
    const am = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);
    let feedAccountExists = false;
    for (let account in supportsArrayIterator(am.accounts, Ci.nsIMsgAccount)){
      if (account.incomingServer.type == "rss"){
        feedAccountExists = true;
        let elm = document.createElement("menuitem");
        elm.setAttribute("label", account.incomingServer.prettyName);
        elm.setAttribute("value", account.key);
        feedaccountPopup.appendChild(elm);
        if (feedaccountPopup.parentNode.value == account.key){
          feedaccountPopup.parentNode.selectedItem = elm;
        }
      }
    }
    if (!feedaccountPopup.parentNode.selectedItem){
      if (feedAccountExists){
        feedaccountPopup.parentNode.selectedIndex = 0;
        prefService.setCharPref("feedaccount", feedaccountPopup.parentNode.selectedItem.value)
      } else {
        let elm = document.createElement("menuitem");
        elm.setAttribute("label", "-");
        elm.setAttribute("value", "");
        feedaccountPopup.appendChild(elm);
        feedaccountPopup.parentNode.selectedItem = elm;
      }
    }
  }
  // 1}}}
  // --------------------------------------------------------------------------
  // Public Section
  // ----------------------------------------------------------------------{{{1
  let self = {
    /**
     * called from options.xul when the window is loaded
     */
    init: function wat_init(){
      siteNameTextBox = $("siteNameTextBox");
      urlTextBox      = $("urlTextBox");
      listBox         = $("pageListBox");
      statusLabel     = $("statusLabel");
      addButton       = $("addButton");
      deleteButton    = $("deleteButton");
      upButton        = $("upButton");
      downButton      = $("downButton");
      feedaccountPopup= $("feedaccountPopup");
      
      // get and show stored pages data in prefereces
      let pages = [];
      if (prefService.prefHasUserValue("pages")){
        let pageString = prefService.getComplexValue("pages", Ci.nsIPrefLocalizedString).data;
        pages = JSON.parse(pageString);
      }
      pages.forEach(addItem);

      initializeFeedAccount();
    },
    /**
     * called from button#addButton in option.xul
     */
    add: function wat_add(){
      let name = siteNameTextBox.value,
          url  = urlTextBox.value;
      if (!name || !url){
        return;
      }
      let uri = getURI(url);
      if (!uri){
        showErrorStatus(url + " is someting wrong !!");
        return;
      }
      addItem({label: name, url: url});
      updateData();
      resetTextboxes();
    },
    /**
     * called from button#deleteButton in option.xul
     */
    delete: function wat_onDelete(){
      let index = listBox.selectedIndex;
      listBox.removeItemAt(index);
      updateData();
    },
    /**
     * move up or down the selected row on listbox#pageListBox
     * called from button#upButton or button#downButton in option.xul
     * @param {String} command it's must be "up" or "down"
     */
    move: function wat_move(command){
      let index = listBox.selectedIndex;
      if (index < 0) return;
      let item = listBox.getItemAtIndex(index);
      let count = listBox.getRowCount();
      switch(command){
        case 'up':
          if (index > 0){
            let prev = listBox.removeItemAt(index - 1);
            if (index < count -1){
              let next = listBox.getItemAtIndex(index);
              listBox.insertBefore(prev, next);
            } else {
              listBox.appendChild(prev);
            }
          }
          break;
        case 'down':
          if (index < count - 1){
            let next = listBox.removeItemAt(index + 1);
            listBox.insertBefore(next, item);
          }
          break;
      }
      updateData();
    },
    /**
     * input event handler of textbox#siteNameTextBox and textbox#urlTextBox.
     *
     * button#addButton change to enabled, if both of
     * textbox#siteNameTextBox and textbox#urlTextBox were filled.
     */
    onInput: function wat_onInput(){
      if (siteNameTextBox.value && urlTextBox.value){
        if (addButton.hasAttribute("disabled")){
          addButton.removeAttribute("disabled");
        }
      } else {
        addButton.setAttribute("disabled","true");
      }
      resetStatus();
    },
    /**
     * select event handler of listbox#pageListBox
     *
     * if the row is selected, enable button
     * #deleteButton, #upButton and #downButton.
     */
    onSelect: function wat_onSelect(){
      if (listBox.selectedIndex < 0){
        deleteButton.setAttribute("disabled","true");
        upButton.setAttribute("disabled","true");
        downButton.setAttribute("disabled","true");
      } else {
        deleteButton.removeAttribute("disabled");
        upButton.removeAttribute("disabled");
        downButton.removeAttribute("disabled");
      }
    }
  };
  return self;
  // 1}}}
})();

// vim: sw=2 ts=2 et fdm=marker:
