
var EXPORTED_SYMBOLS = [
  "validateHost",
];

const eTLD = Components.classes["@mozilla.org/network/effective-tld-service;1"]
              .getService(Components.interfaces.nsIEffectiveTLDService),
      NS_ERROR_HOST_IS_IP_ADDRESS = Components.results.NS_ERROR_HOST_IS_IP_ADDRESS;

const SUFFIXES = [
  // gTLD
  "aero", "arpa", "asia", "biz", "cat", "com", "coop", "edu", "gov", "info", "int",
  "jobs", "mil", "mobi", "museum", "name", "net", "org", "pro", "tel", "travel", "xxx",
  // ccTLD
  "ac", "ad", "ae", "af", "ag", "ai", "al", "am", "an", "ao", "aq", "ar", "as", "at", "au", "aw", "ax", "az",
  "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bm", "bn", "bo", "br", "bs", "bt", "bv", "bw", "by", "bz",
  "ca", "cc", "cd", "cf", "cg", "ch", "ci", "ck", "cl", "cm", "cn", "co", "cr", "cs", "cu", "cv", "cx", "cy", "cz",
  "dd", "de", "dj", "dk", "dm", "do", "dz",
  "ec", "ee", "eg", "eh", "er", "es", "et", "eu",
  "fi", "fj", "fk", "fm", "fo", "fr",
  "ga", "gb", "gd", "ge", "gf", "gg", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw", "gy",
  "hk", "hm", "hn", "hr", "ht", "hu",
  "id", "ie", "il", "im", "in", "io", "iq", "ir", "is", "it",
  "je", "jm", "jo", "jp",
  "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz",
  "la", "lb", "lc", "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly",
  "ma", "mc", "md", "me", "mg", "mh", "mk", "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz",
  "na", "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr", "nu", "nz",
  "om",
  "pa", "pe", "pf", "pg", "ph", "pk", "pl", "pm", "pn", "pr", "ps", "pt", "pw", "py",
  "qa",
  "re", "ro", "rs", "ru", "rw",
  "sa", "sb", "sc", "sd", "se", "sg", "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "st", "su", "sv", "sy", "sz",
  "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tp", "tr", "tt", "tv", "tw", "tz",
  "ua", "ug", "uk", "um", "us", "uy", "uz",
  "va", "vc", "ve", "vg", "vi", "vn", "vu",
  "wf", "ws",
  "ye", "yt", "yu",
  "za", "zm", "zr", "zw",
];

function validateHost (host) {
  try {
    var suffix = eTLD.getPublicSuffixFromHost(host);
  } catch (e) {
    return e.result === NS_ERROR_HOST_IS_IP_ADDRESS
  }
  // co.jp など "." が含まれていたらドメイン名だとみなす
  if (suffix.indexOf(".") > 0)
    return true;

  return SUFFIXES.indexOf(suffix) != -1;
}

