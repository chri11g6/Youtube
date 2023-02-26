const popup = document.querySelector('#popup');
// Buttons/Input
const saveButton = document.querySelector('#saveBtn');
const newFolderButton = document.querySelector('#newFolderBtn');
const addFolderButton = document.querySelector('#addFolderBtn');
const addFolderInput = document.querySelector('#addFolderInput');
const mainFolderButton = document.querySelector('#main-folder');

// Containers
const videosContainer = document.querySelector('#video-collection');
const folderContainer = document.querySelector('#folder-collection');
const newFolderContainer = document.querySelector('#create-folder-container');

// Global
let selectedVideoContainer = null;
let selectedFolder = mainFolderButton;
let errorTimeout = null;

window.addEventListener('DOMContentLoaded', (event) => {
    fillFolders();
    constructVideos();
});

// ===================================================================================
// DOM HYDRATION
// ===================================================================================

hydrateFolder(mainFolderButton, false);
popup.addEventListener('click', () => {
    hideDeleteButton();
    cancelFolderDelete();
});

addFolderButton.addEventListener('click', async () => {
    const folderName = addFolderInput.value;

    if (folderName.match(/^[a-zæøåA-ZÆØÅ0-9\s\-/\\$\+]+$/)) {
        let folders = await readStorageAsync('folders');
        if (folders === undefined || folders === null) {
            chrome.storage.sync.set({ folders: [folderName] });
            return;
        } else {
            if (!folders.includes(folderName)) {
                const data = folders.concat([folderName]);
                chrome.storage.sync.set({ folders: data });
                appendFolder(folderName);
                closeNewFolderOverlay();
                return;
            }
        }
    }

    // Invalid input or folder name already exists
    addFolderInput.classList.add('error');
    clearTimeout(errorTimeout);
    errorTimeout = setTimeout(() => {
        addFolderInput.classList.remove('error');
    }, 1000);
});

newFolderButton.addEventListener('click', ({ currentTarget: target }) => {
    if (target.classList.contains('active')) {
        closeNewFolderOverlay();
    } else {
        addFolderInput.focus();
        newFolderButton.textContent = 'Cancel';
        newFolderButton.classList.add('active');
        newFolderContainer.classList.add('show');
    }
});

addFolderInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addFolderButton.click();
    }
});

saveButton.addEventListener('click', () => {
    closeNewFolderOverlay();
    const folder = selectedFolder === mainFolderButton ? null : selectedFolder.textContent;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].url.startsWith('https://www.youtube.com/watch?')) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: getTimestamp,
                args: [tabs[0], folder]
            },
                (res) => addOrUpdateVideo(res[0].result))
        }
    });
});

// ===================================================================================
// APP LOGIC
// ===================================================================================

function hydrateFolder(folder, allowDelete = true) {
    folder.addEventListener('click', () => {
        if (folder.classList.contains('delete')) {
            if (selectedFolder === folder) {
                mainFolderButton.click();
            }

            deleteFolder(folder);
            return;
        }

        selectedFolder.classList.remove('active');
        selectedFolder = folder;
        selectedFolder.classList.add('active');

        constructVideos(mainFolderButton === folder ? null : selectedFolder.textContent);
    });

    folder.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const classList = e.currentTarget.classList;

        if (!allowDelete) {
            cancelFolderDelete();
            return;
        }

        if (classList.contains('delete')) {
            classList.remove('delete');
        } else {
            folderContainer.querySelector('.folder.delete')?.classList.remove('delete');
            classList.add('delete');
        }
    });
}

function deleteFolder(element) {
    chrome.storage.sync.get("folders", (data) => {
        const index = data.folders.findIndex(e => e === element.textContent);
        if (index > -1) {
            element.remove();
            data.folders.splice(index, 1);
            chrome.storage.sync.set({ folders: data.folders });
        }
    });

    chrome.storage.sync.get("videos", (data) => {
        data.videos.forEach((video) => {
            if (video.folder === element.textContent) {
                video.folder = null;
            }
        });

        chrome.storage.sync.set({ videos: data.videos });
    });
}

function addOrUpdateVideo(video) {
    const container = videosContainer.querySelector(`[id='${video.id}']`);
    if (container) {
        const timestamp = container.querySelector('.time-stamp');
        timestamp.textContent = formatTime(video.timestamp);

        container.addEventListener('click', () => {
            window.open(video.url, '_blank');
        });
    } else {
        if (selectedFolder === mainFolderButton || selectedFolder.textContent === video.folder)
            videosContainer.prepend(createVideoContainer(video));
    }
}

function deleteVideo(id) {
    chrome.storage.sync.get("videos", (data) => {
        const index = data.videos.findIndex(e => e.id === id);

        if (index > -1) {
            selectedVideoContainer.classList.add('fade-out');
            setTimeout(() => {
                selectedVideoContainer.remove();
            }, 500);

            data.videos.splice(index, 1);
            chrome.storage.sync.set({ videos: data.videos });
        }
    });
}

async function getTimestamp(_tab, folder) {
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
            chrome.storage.sync.set({ videos: [{ id, url, img, title, timestamp, channel, folder }, ...data.videos] });
        } else {
            if (folder !== null)
                data.videos[index].folder = folder;

            data.videos[index].url = url;
            data.videos[index].timestamp = timestamp;
            chrome.storage.sync.set({ videos: data.videos });
        }
    });

    return { id, url, img, title, timestamp, channel, folder };
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
    header.textContent = video.title;

    const channel = document.createElement('p');
    channel.className = 'channel';
    channel.textContent = video.channel;

    // header and channel name
    const headerSection = document.createElement('div');
    headerSection.append(header, channel)

    const folder = document.createElement('p');
    folder.className = 'video-folder';
    folder.textContent = video.folder === null ? '-' : video.folder;

    const contentContainer = document.createElement('div');
    contentContainer.className = 'content-container';
    contentContainer.title = video.title;
    contentContainer.append(headerSection, folder);

    const trashIcon = document.createElement('img');
    trashIcon.src = '../images/trash.png';
    trashIcon.alt = 'Trashbin';
    trashIcon.className = 'delete-icon';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-btn';
    deleteButton.appendChild(trashIcon);

    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteVideo(video.id);
    });

    const container = document.createElement('div');
    container.className = 'video-container';
    container.id = video.id;
    container.append(imageContainer, contentContainer, deleteButton);

    container.addEventListener('click', () => {
        window.open(video.url, '_blank');
    });

    container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        closeNewFolderOverlay();

        if (container === selectedVideoContainer) {
            hideDeleteButton();
        } else {
            hideDeleteButton();
            container.classList.add('delete-btn-active');
            selectedVideoContainer = container;
        }

        return false;
    });

    return container;
}

// ===================================================================================
// VISUAL
// ===================================================================================

function constructVideos(folder = null) {
    empty(videosContainer);

    chrome.storage.sync.get('videos', (data) => {
        if (folder !== null) {
            data.videos = data.videos.filter(e => e.folder === folder);
        }

        data.videos.forEach(video => {
            videosContainer.appendChild(createVideoContainer(video));
        });
    });
}

function fillFolders() {
    chrome.storage.sync.get('folders', (data) => {
        data.folders.forEach(e => {
            appendFolder(e);
        });
    });
}

function hideDeleteButton() {
    if (selectedVideoContainer) {
        selectedVideoContainer.classList.remove('delete-btn-active');
        selectedVideoContainer = null;
    }
}

function appendFolder(name) {
    const folder = document.createElement('div');
    folder.textContent = name;
    folder.classList.add('folder');
    hydrateFolder(folder);
    folderContainer.appendChild(folder);
}

function cancelFolderDelete() {
    folderContainer.querySelector('.folder.delete')?.classList.remove('delete');
}

function closeNewFolderOverlay() {
    addFolderInput.blur();
    newFolderButton.textContent = 'New Folder';
    newFolderButton.classList.remove('active');
    newFolderContainer.classList.remove('show');
    addFolderInput.value = '';
}


// ===================================================================================
// HELPERS
// ===================================================================================

const readStorageAsync = async (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get([key], (result) => {
            resolve(result[key]);
        });
    });
};

function formatTime(s) {
    const hours = parseInt(s / 3600);
    const minutes = parseInt(s % 3600 / 60);
    const seconds = parseInt(s % 60);

    const formattedHours = (hours / 10 > 1) ? hours : `0${hours}`;
    const formattedMinutes = (minutes / 10 >= 1) ? minutes : `0${minutes}`;
    const formattedSeconds = (seconds / 10 >= 1) ? seconds : `0${seconds}`;

    return `${hours ? formattedHours + ':' : ''}${formattedMinutes}:${formattedSeconds}`;
}

function empty(container) {
    while (container.firstChild)
        container.firstChild.remove();
}