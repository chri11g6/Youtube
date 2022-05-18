const saveButton = document.querySelector('#saveBtn');
const getButton = document.querySelector('#getDataBtn');
const videos = document.querySelector('#video-collection');

getButton.addEventListener('click', () => {
    chrome.storage.sync.get((result) => console.log(result));
});

saveButton.addEventListener('click', () => {
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
    const channel = document.querySelector('#owner-and-teaser #channel-name a').textContent;
    const timestamp = Math.floor(video.currentTime);    
    const params = new URLSearchParams(window.location.search);
    const id = params.get('v');
    params.set('t', timestamp);

    // console.log('Title:', title);
    // console.log('Url:', `https://www.youtube.com/watch?${params}s`);
    // console.log('Img:', `https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
    // console.log('Channel', channel);

    const url = `https://www.youtube.com/watch?${params}s`;
    const img = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    chrome.storage.sync.get("videos", (data) => {
        const index = data.videos.findIndex(e => e.id === id);

        if(index === -1) {   
            chrome.storage.sync.set({ videos: [{ id, url, img, title, timestamp, channel }, ...data.videos]});
        } else {
            data.videos[index].url = url;
            data.videos[index].timestamp = timestamp;
            chrome.storage.sync.set({ videos: data.videos});
        }
    });
}

function createVideoContainer(video) {
    const image = document.createElement('img');
    image.src = video.img;
    image.alt = 'Thumbnail image';
    image.className = 'thumbnail-img';

    const timeStamp = document.createElement('p');
    timeStamp.className = 'time-stamp';
    timeStamp.textContent = formatTime(video.timestamp);

    const imageContainer = document.createElement('div');
    imageContainer.className = 'img-container';
    imageContainer.append(image, timeStamp);

    const header = document.createElement('h1');
    header.className = 'header-1';
    header.textContent = formatTitle(video.title);

    const channel = document.createElement('p');
    channel.className = 'channel';
    channel.textContent = video.channel;

    const contentContainer = document.createElement('div');
    contentContainer.className = 'content-container';
    contentContainer.append(header, channel);

    const container = document.createElement('div');
    container.className = 'video-container';
    container.append(imageContainer, contentContainer);

    container.addEventListener('click', () => {
        window.open(video.url, '_blank');
    })

    return container;

}

function formatTime(s) {
    const hours = parseInt(s / 3600);
    const minutes = parseInt(s % 3600 / 60);
    const seconds = parseInt(s % 60);

    const formattedHours = (hours / 10 > 1) ? hours : `0${hours}`;
    const formattedMinutes = (minutes / 10 > 1) ? minutes : `0${minutes}`;  
    const formattedSeconds = (seconds / 10 > 1) ? seconds : `0${seconds}`; 

    return `${hours ? formattedHours + ':' : ''}${formattedMinutes}:${formattedSeconds}`;
}

function formatTitle(title) {
    if(title.length > 45) {
        title = title.slice(0, 45);
        title += '...';
    }

    return title;
}

function construct() {
    chrome.storage.sync.get("videos", (data) => {
        for(const video of data.videos) {
            videos.appendChild(createVideoContainer(video));
        }
    });
}

construct();