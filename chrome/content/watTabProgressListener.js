
// swap tabProgressListener
let orignal_tabProgressListenerPrototype = tabProgressListener.prototype;
tabProgressListener.prototype =
{
  mTab: null,
  mBrowser: null,
  mBlank: null,

  // cache flags for correct status bar update after tab switching
  mStateFlags: 0,
  mStatus: 0,
  mMessage: "",
  mTotalProgress: 0,

  // count of open requests (should always be 0 or 1)
  mRequestCount: 0,

  onProgressChange: function wat_onProgressChange(aWebProgress, aRequest,
                                                  aCurSelfProgress,
                                                  aMaxSelfProgress,
                                                  aCurTotalProgress,
                                                  aMaxTotalProgress) {
     this.mTotalProgress = aMaxTotalProgress ? aCurTotalProgress / aMaxTotalProgress : 0;
  },
  onProgressChange64: function wat_onProgressChange64(aWebProgress, aRequest,
                                                      aCurSelfProgress,
                                                      aMaxSelfProgress,
                                                      aCurTotalProgress,
                                                      aMaxTotalProgress) {
    this.onProgressChange(aWebProgress, aRequest, aCurSelfProgress,
                          aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress);
  },
  onLocationChange: function wat_onLocationChange(aWebProgress, aRequest,
                                                  aLocationURI) {
    if (this.mBrowser.userTypedClear > 0)
      this.mBrowser.userTypedValue = null;

    var location = aLocationURI ? aLocationURI.spec : "";
    if (aWebProgress.DOMWindow == this.mBrowser.contentWindow){
      if (aWebProgress.isLoadingDocument)
        this.mBrowser.mIconURL = null;

      this.mTab.reloadEnabled =
        !((location == "about:blank" && !this.mBrowser.contentWindow.opener) ||
          location == "");
    }

    this.mBrowser.missingPlugins = null;
  },
  onStateChange: function wat_onStateChange(aWebProgress, aRequest, aStateFlags,
                                            aStatus) {
    if (!aRequest)
      return;

    const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
    let tabmail = document.getElementById("tabmail");

    if (aStateFlags & nsIWebProgressListener.STATE_START) {
      this.mRequestCount++;
    }
    else if (aStateFlags & nsIWebProgressListener.STATE_STOP) {
      const NS_ERROR_UNKNOWN_HOST = 2152398878;
      if (--this.mRequestCount > 0 && aStatus == NS_ERROR_UNKNOWN_HOST)
        return;
      // Since we (try to) only handle STATE_STOP of the last request,
      // the count of open requests should now be 0.
      this.mRequestCount = 0;
    }

    if (aStateFlags & nsIWebProgressListener.STATE_START &&
        aStateFlags & nsIWebProgressListener.STATE_IS_NETWORK) {
      if (aWebProgress.DOMWindow == this.mBrowser.contentWindow)
        this.mBrowser.userTypedClear += 2;

      if (!this.mBlank) {
        tabmail.setTabBusy(this.mTab, true);
        if (!(aStateFlags & nsIWebProgressListener.STATE_RESTORING)){
          this.mTab.title = specialTabs.contentTabType.loadingTabString;
          tabmail.setTabTitle(this.mTab);
          tabmail.updateIcon(this.mTab);
        }
      }
    } else if (aStateFlags & nsIWebProgressListener.STATE_STOP &&
             aStateFlags & nsIWebProgressListener.STATE_IS_NETWORK) {
      if (aWebProgress.DOMWindow == this.mBrowser.contentWindow){
        if (this.mBrowser.userTypedClear > 1)
          this.mBrowser.userTypedClear -= 2;
        else if (this.mBrowser.userTypedClear > 0)
          this.mBrowser.userTypedClear--;

        if (!this.mBrowser.mIconURL)
          tabmail.useDefaultIcon(this.mTab);
      }
      if (this.mBlank)
        this.mBlank = false;

      tabmail.setTabBusy(this.mTab, false);
      tabmail.updateIcon(this.mTab);
    }

    if (aStateFlags & (nsIWebProgressListener.STATE_START |
                       nsIWebProgressListener.STATE_STOP)){
      this.mMessage = "";
      this.mTotalProgress = 0;
    }
    this.mStateFlags = aStateFlags;
    this.mStatus = aStatus;
  },
  onStatusChange: function wat_onStatusChange(aWebProgress, aRequest, aStatus,
                                              aMessage) {
    if (this.mBlank)
      return;

    this.mMessage = aMessage;
  },
  onSecurityChange: function wat_onSecurityChange(aWebProgress, aRequest,
                                                  aState) {
  },
  onRefreshAttempted: function wat_OnRefreshAttempted(aWebProgress, aURI,
                                                      aDelay, aSameURI) {
    return (aWebProgress.allowMetaRedirects && aWebProgress.currentURI.host == aURI.host);
  },
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIWebProgressListener,
                                         Components.interfaces.nsIWebProgressListener2,
                                         Components.interfaces.nsISupportsWeakReference])
};
// vim: sw=2 ts=2 et:
