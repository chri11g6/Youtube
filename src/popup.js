const popup = document.querySelector('#popup');
const saveButton = document.querySelector('#saveBtn');
const videos = document.querySelector('#video-collection');
const contextMenu = document.querySelector('#contextmenu');
const openBtn = document.querySelector('#open-btn');
const deleteBtn = document.querySelector('#delete-btn');

let selectedVideo = {};

popup.addEventListener('click', closeContextMenu);
videos.addEventListener('scroll', closeContextMenu);

openBtn.addEventListener('click', () => {
    window.open(selectedVideo.url, '_blank');
});

deleteBtn.addEventListener('click', () => {
    videos.querySelector(`[id='${selectedVideo.id}']`).remove();
    closeContextMenu();
    deleteVideo(selectedVideo.id);
})

saveButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].url.startsWith('https://www.youtube.com/watch?')) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: getTimestamp,
                args: [tabs[0]]
            },
                (res) => addOrUpdateVideo(res[0].result))
        }
    });
});

function addOrUpdateVideo(video) {
    const container = videos.querySelector(`[id='${video.id}']`);
    if (container) {
        const timestamp = container.querySelector('.time-stamp');
        timestamp.textContent = formatTime(video.timestamp);

        container.addEventListener('click', () => {
            window.open(video.url, '_blank');
        });
    } else {
        videos.prepend(createVideoContainer(video));
    }
}

function deleteVideo(id) {
    chrome.storage.sync.get("videos", (data) => {
        const index = data.videos.findIndex(e => e.id === id);

        if (index > -1) {
            data.videos.splice(index, 1);
            chrome.storage.sync.set({ videos: data.videos });
        }
    });
    selectedVideo = {};
}

function closeContextMenu() {
    contextMenu.classList.remove('open');
}

async function getTimestamp(_tab) {
    const req = await fetch(`https://www.youtube.com/oembed?format=json&url=${_tab.url}`);
    const result = await req.json();

    const channel = result.author_name;
    const title = result.title;
    const img = result.thumbnail_url;

    const video = document.querySelector('.video-stream.html5-main-video');
    const timestamp = Math.floor(video.currentTime);
    
    const params = new URLSearchParams(window.location.search);
    const id = params.get('v');
    params.set('t', timestamp);

    const url = `https://www.youtube.com/watch?${params}s`;

    chrome.storage.sync.get("videos", (data) => {
        const index = data.videos.findIndex(e => e.id === id);

        if (index === -1) {
            chrome.storage.sync.set({ videos: [{ id, url, img, title, timestamp, channel }, ...data.videos] });
        } else {
            data.videos[index].url = url;
            data.videos[index].timestamp = timestamp;
            chrome.storage.sync.set({ videos: data.videos });
        }
    });

    return { id, url, img, title, timestamp, channel };
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
    container.id = video.id;
    container.append(imageContainer, contentContainer);

    container.addEventListener('click', (e) => {
        window.open(video.url, '_blank');
    });

    container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        selectedVideo = video;
        contextMenu.classList.add('open');

        if ((e.clientY + contextMenu.clientHeight) > popup.clientHeight)
            contextMenu.style.top = (e.clientY - contextMenu.clientHeight) + 'px';
        else
            contextMenu.style.top = e.clientY + 'px';

        if ((e.clientX + contextMenu.clientWidth) > popup.clientWidth)
            contextMenu.style.left = (popup.clientWidth - contextMenu.clientWidth) + 'px';
        else
            contextMenu.style.left = e.clientX + 'px';

        return false;
    });

    return container;
}

function formatTime(s) {
    const hours = parseInt(s / 3600);
    const minutes = parseInt(s % 3600 / 60);
    const seconds = parseInt(s % 60);

    const formattedHours = (hours / 10 > 1) ? hours : `0${hours}`;
    const formattedMinutes = (minutes / 10 >= 1) ? minutes : `0${minutes}`;
    const formattedSeconds = (seconds / 10 >= 1) ? seconds : `0${seconds}`;

    return `${hours ? formattedHours + ':' : ''}${formattedMinutes}:${formattedSeconds}`;
}

function formatTitle(title) {
    if (title.length > 45) {
        title = title.slice(0, 45);
        title += '...';
    }

    return title;
}

function construct() {
    chrome.storage.sync.get("videos", (data) => {
        for (const video of data.videos) {
            videos.appendChild(createVideoContainer(video));
        }
    });
}

construct();