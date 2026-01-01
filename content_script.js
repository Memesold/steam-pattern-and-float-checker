// Inject the page script into the page context so it can access page JS variables
const s = document.createElement('script');
s.src = chrome.runtime.getURL('page_inject.js');
s.onload = function() { this.remove(); };
(document.head || document.documentElement).appendChild(s);
