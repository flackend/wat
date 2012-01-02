
let scripts = [
  {
    NAME: "CompactHeader",
    EXTENSION_ID: "{58D4392A-842E-11DE-B51A-C7B855D89593}",
    VERSION: "1.4",
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
(function(){
  const PRE_PATH = "chrome://wat/content/plugins/";
  for (let i=0, len=scripts.length; i<len; i++){
    let s = scripts[i];
    let url = PRE_PATH + s.FILENAME;
    AddonManager.getAddonByID(s.EXTENSION_ID, function (ext) {
      if (ext && ext.isActive && Services.vc.compare(s.VERSION, ext.version) <= 0) {
        load(url, s);
      }
    });
  }
})();

// vim: sw=2 ts=2 et:
