
let WAT = (function(){
  let tabMail = null;
  let self = {
    get tabMail(){
      if (tabMail) return tabMail;
      tabMail = document.getElementById("tabmail");
      return tabMail;
    },
    openTabChrome: function WAT_openTabChrome (url){
      let args = { chromePage: url };
      return this.tabMail.openTab("chromeTab", args);
    },
    openTabContent: function WAT_openTabContent (url){
      let args = { contentPage: url };
      return this.tabMail.openTab("contentTab", args);
    },
  };
  return self;
})();
// vim: sw=2 ts=2 et:
