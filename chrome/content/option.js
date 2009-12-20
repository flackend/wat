
/*
const WAT_STORAGE_RESOURCE = "resource://wat/storage.jsm";
Components.utils.import(WAT_STORAGE_RESOURCE);
*/

const Cc = Components.classes;
const Ci = Components.interfaces;
const prefService = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService)
                    .getBranch("extensions.wat.");
const ioService = Cc["@mozilla.org/network/io-service;1"]
                    .getService(Ci.nsIIOService);

let wat = (function(){
  let siteNameTextBox, urlTextBox, listBox, statusLabel,
      addButton, deleteButton, upButton, downButton;
  let isError = false;
  function $(id){
    return document.getElementById(id);
  }
  function updateData(){
    let pages = [];
    for (let i=0, len=listBox.itemCount; i<len; i++){
      let item = listBox.getItemAtIndex(i);
      pages.push({
        label: item.childNodes[0].getAttribute("label"),
        url  : item.childNodes[1].getAttribute("label")
      });
    }
    let supportString = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
    supportString.data = JSON.stringify(pages);
    prefService.setComplexValue("pages", Ci.nsISupportsString, supportString);
  }
  function addItem(page){
    let item = document.createElement("listitem");
    let nameCell = document.createElement("listcell");
    nameCell.setAttribute("label", page.label);
    let urlCell = document.createElement("listcell");
    urlCell.setAttribute("label", page.url);
    item.appendChild(nameCell);
    item.appendChild(urlCell);
    listBox.appendChild(item);
  }
  function getURI(url){
    try {
      let uri = ioService.newURI(url, null, null);
      return uri;
    } catch(e){
      return null;
    }
  }
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
  let self = {
    init: function wat_init(){
      siteNameTextBox = $("siteNameTextBox");
      urlTextBox      = $("urlTextBox");
      listBox         = $("pageListBox");
      statusLabel     = $("statusLabel");
      addButton       = $("addButton");
      deleteButton    = $("deleteButton");
      upButton        = $("upButton");
      downButton      = $("downButton");
      
      let pages = [];
      if (prefService.prefHasUserValue("pages")){
        let pageString = prefService.getComplexValue("pages", Ci.nsIPrefLocalizedString).data;
        pages = JSON.parse(pageString);
      }
      pages.forEach(addItem);
    },
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
    delete: function wat_onDelete(){
      let index = listBox.selectedIndex;
      listBox.removeItemAt(index);
      updateData();
    },
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
})();

// vim: sw=2 ts=2 et:
