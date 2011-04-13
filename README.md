WAT
===

This is a addon for Mozilla Thunderbird.
WAT(Wab Application Tab) is enable to open web contents in new tab.

Requirement
-----------

 * [Thunderbird >= 3.3](http://mozilla.org/thunderbird/)

Version 1.0
-----------

 * change WAT menu to the button in tab-bar.
 * _NewFeature_: bookmarks and history system like Firefox
 * _NewFeature_: URL & search bar
 * obsoleted: WAT menu in menubar
 * obsoleted: Open URL in tab menu
 * obsoleted: old bookmark system

Features
--------

 * register Name and URL like bookmark from WAT -> Option
 * open in tab quickly from WAT -> Open URL in tab
 * open in tab from link contex menu
 * can copy to clipboard the title or the URL from tab context menu (version 0.2.4)
 * can open in a new tab on middle-click (version 0.3.0)
   * if _Open tab in background_ option (see Option dialog) is on,
     open in background and Shfit+Middle-Click opens in foreground (version 0.6)
   * if the option is off, the behavior is reverse.
 * can open in a new tab on ctrl + click (version 0.6.2)
 * can forward and back from key-navigation (likes firefox)
   menus in "Go" on the menubar or the context menu (version 0.4.0)
   * on Windows Back: Alt-Left or BS, Forward: Alt-Rieght or Shift-BS
   * on MacOS Back: Cmd-Left or Cmd-[ or Cmd-Delete, Forward: Cmd-Right or Cmd-] or Cmd-Shfit-Delete
   * on Linux Back: Alt-Left or Ctrl-[ or BS, Forward: Alt-Right or Ctrl-] or Shift-BS
 * redirects by meta tab refresh is available (version 0.4.3)
 * open a new tab the link in RSS feed message header on middle-click or context-menu
   (version 0.4.5)
   * and compatible for [CompactHeader](https://addons.mozilla.org/en-US/thunderbird/addon/13564)
 * show feed icon for subscribing, if the page has RSS feeds (version 0.5)

License
-------
Thease code are licensed under a disjunctive tri-license
giving you the choice of one of the three following sets of free software/open source licensing terms.

 * [MPL 1.1](http://www.mozilla.org/MPL/MPL-1.1.html "Mozilla Public License version 1.1")
 * [GPL 2.0](http://www.gnu.org/licenses/gpl-2.0.html "GNU General Public License version 2.0")
 * [LGPL 2.1](http://www.gnu.org/licenses/lgpl-2.1.html "GNU Lesser General Public License version 2.1")
 
Get Extension
----------------------

 * From [AMO](https://addons.mozilla.org/en-US/thunderbird):
   [WAT (WebApplicationTab) :: Add-ons for Thunderbird](https://addons.mozilla.org/en-US/thunderbird/addon/55713)
 * From GitHub:
   [Downloads - GitHub](http://github.com/teramako/wat/downloads)

How to build
------------

 1. Build xpi
     
    ``sh build.sh``

 2. Install xpi from Addons dialog
    
    then restart Thunderbird
    'WAT' toolbar menu apears.
    
 3. Resister PageName and URL from WAT -> Option
    which is opened in new tab.

ScreenShots
-----------

<table style="width:194px;"><tr><td align="center" style="height:194px;background:url(http://picasaweb.google.co.jp/s/c/transparent_album_background.gif) no-repeat left"><a href="http://picasaweb.google.co.jp/teramako/WATWebApplicationTab?feat=embedwebsite"><img src="http://lh5.ggpht.com/_Rv7aS9PPjZQ/S3ffvfrlmVE/AAAAAAAACVU/RvUYhhZONfc/s160-c/WATWebApplicationTab.jpg" width="160" height="160" style="margin:1px 0 0 4px;"></a></td></tr><tr><td style="text-align:center;font-family:arial,sans-serif;font-size:11px"><a href="http://picasaweb.google.co.jp/teramako/WATWebApplicationTab?feat=embedwebsite" style="color:#4D4D4D;font-weight:bold;text-decoration:none;">WAT (WebApplicationTab)</a></td></tr></table>

Issues
------

 * don't work ToDo list on Google Calendar 
   
   it's seems that following code doesn't work :(

       &lt;iframe src="javascript:'&lt;html&gt;....&lt;/html&gt;'"&gt;

