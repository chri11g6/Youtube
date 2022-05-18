chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ videos: [] });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    
    if (changeInfo.status === 'complete' && tab.url.startsWith('https://www.youtube.com/watch?')) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: keyPressed,
        });
    }
});

function keyPressed() {
    document.addEventListener('keypress', (e) => {
        if (e.code === 'KeyB') {
            console.log("Time to save!!!");
        }
    });
}