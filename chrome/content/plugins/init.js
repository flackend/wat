
let scripts = [
  {
    NAME: "CompactHeader",
    EXTENSION_ID: "{58D4392A-842E-11DE-B51A-C7B855D89593}",
    VERSION: "1.1.*",
    FILENAME: "compactHeader.js"
  }
];
const Cc = Components.classes,
      Ci = Components.interfaces;
const extManager= Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager);
const comparator = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
const contexts = {};
function load(url, scriptObj){
  if (!scriptObj)
    scriptObj = {};
  let context = {};
  let name = scriptObj.FILENAME.replace(/\.js$/,"");;
  for (let key in scriptObj){
    context["__" + key + "__"] = scriptObj[key];
  }
  contexts[name] = context;
  WAT.loadScript(url, context);
}
function isExtensionEnabled(extItem){
  const rdf = Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService),
        PREFIX_ITEM_URI = "urn:mozilla:item:",
        PREFIX_NS_EM = "http://www.mozilla.org/2004/em-rdf#";
  let enabled = false;
  let item = rdf.GetResource(PREFIX_ITEM_URI + extItem.id);
  if (item){
    let target = extManager.datasource.GetTarget(item, rdf.GetResource(PREFIX_NS_EM + "isDisabled"), true);
    if (target && target instanceof Ci.nsIRDFLiteral){
      enabled = (target.Value != "true");
    }
  }
  return enabled;
}
(function(){
  const PRE_PATH = "chrome://wat/content/plugins/";
  for (let i=0, len=scripts.length; i<len; i++){
    let s = scripts[i];
    let url = PRE_PATH + s.FILENAME;
    let ext = extManager.getItemForID(s.EXTENSION_ID);
    if (ext && isExtensionEnabled(ext)){
      if (s.VERSION && comparator.compare(s.VERSION, ext.version) < 0){
        continue;
      }
      load(url, s);
    }
  }
})();

// vim: sw=2 ts=2 et:
