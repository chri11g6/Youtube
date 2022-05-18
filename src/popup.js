const saveButton = document.querySelector('#saveBtn');
const getButton = document.querySelector('#getDataBtn');
const input = document.querySelector('#textInput');
const label = document.querySelector('.label');

getButton.addEventListener('click', () => {
    chrome.storage.sync.get((result) => console.log(result));

    chrome.storage.sync.get("input", (data) => {
        label.textContent = data.input;
        
    });
})

saveButton.addEventListener('click', () => {

    const inputValue = input.value;
    if(inputValue) {
        chrome.storage.sync.set({ input: inputValue });
        input.value = '';
    }


    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if(tabs[0].url.startsWith('https://www.youtube.com/watch?')) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: getTimestamp,
                args: [ tabs[0] ]
            });
        }
    });
});

function getTimestamp(_tab) {
    const video = document.querySelector('.video-stream.html5-main-video');
    const title = document.querySelector('h1 .style-scope.ytd-watch-metadata').textContent;
    const timestamp = Math.floor(video.currentTime);    
    const params = new URLSearchParams(window.location.search);
    params.set('t', timestamp);

    console.log('Title:', title);
    console.log('Url:', `https://www.youtube.com/watch?${params}s`);
    console.log('Img:', `https://i.ytimg.com/vi/${params.get('v')}/hqdefault.jpg`);
}