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

Components.utils.import("resource://gre/modules/Services.jsm");

var gGeneral = {
  init: function gGeneral_init () {
    const Cc = Components.classes;
    const Ci = Components.interfaces;
    const prefService = Cc["@mozilla.org/preferences-service;1"]
                        .getService(Ci.nsIPrefService)
                        .getBranch("extensions.wat.");
    var feedaccountPopup = document.getElementById("feedaccountPopup");

    function supportsArrayIterator(array, iface){
      let iter = function(){
        var count = array.Count();
        for (let i = 0; i < count; i++){
          yield array.QueryElementAt(i, iface);
        }
      };
      return {__iterator__: iter};
    }

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
};

// vim: sw=2 ts=2 et fdm=marker:
