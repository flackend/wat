
let scripts = [
  {
    NAME: "CompactHeader",
    EXTENSION_ID: "{58D4392A-842E-11DE-B51A-C7B855D89593}",
    VERSION: "1.2.*",
    FILENAME: "compactHeader.js"
  }
];
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
  Services.scriptloader.loadSubScript(url, context);
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
    AddonManager.getAddonByID(s.EXTENSION_ID, function (ext) {
      if (ext && ext.isActive && Services.vc.compare(s.VERSION, ext.version) < 0) {
        load(url, s);
      }
    });
  }
})();

// vim: sw=2 ts=2 et:
