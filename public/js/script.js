const socket = io();
let locationObtained = false;
const MIN_PRELOADER_TIME = 3000; // 3 seconds minimum display time
const preloaderStartTime = Date.now(); // Track when preloader started

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            socket.emit("send-location", { 
                latitude, 
                longitude, 
                accuracy: position.coords.accuracy 
            });
            
            // Hide preloader once we have location, but ensure minimum display time
            if (!locationObtained) {
                locationObtained = true;
                
                const elapsedTime = Date.now() - preloaderStartTime;
                if (elapsedTime >= MIN_PRELOADER_TIME) {
                    // 3 seconds have passed, hide immediately
                    hidePreloader();
                } else {
                    // Wait for remaining time before hiding
                    const remainingTime = MIN_PRELOADER_TIME - elapsedTime;
                    setTimeout(hidePreloader, remainingTime);
                }
            }
        },
        (error) => {
            console.error(error);
            // For errors, still respect minimum preloader time
            const elapsedTime = Date.now() - preloaderStartTime;
            if (elapsedTime >= MIN_PRELOADER_TIME) {
                hidePreloader();
            } else {
                const remainingTime = MIN_PRELOADER_TIME - elapsedTime;
                setTimeout(hidePreloader, remainingTime);
            }
            
            // Show error message to user
            alert("Could not get your location. Please check your location permissions.");
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
        }
    );
} else {
    // For browsers without geolocation, still respect minimum time
    const elapsedTime = Date.now() - preloaderStartTime;
    if (elapsedTime >= MIN_PRELOADER_TIME) {
        hidePreloader();
    } else {
        const remainingTime = MIN_PRELOADER_TIME - elapsedTime;
        setTimeout(hidePreloader, remainingTime);
    }
    
    alert("Geolocation is not supported by your browser");
}

// Function to hide preloader
function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        preloader.style.transition = 'opacity 0.5s';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }
}

const map = L.map("map").setView([0, 0], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "OpenStreetMap",
}).addTo(map);

const markers = {};

// Set user ID in the sidebar
socket.on("connect", () => {
    document.getElementById("user-id").textContent = socket.id;
    document.getElementById("connection-text").textContent = "Connected";
    document.getElementById("connection-indicator").style.backgroundColor = "#2ecc71";
});

// Update connection status on disconnect
socket.on("disconnect", () => {
    document.getElementById("connection-text").textContent = "Disconnected";
    document.getElementById("connection-indicator").style.backgroundColor = "#e74c3c";
    document.getElementById("status").textContent = "Inactive";
});

// Keep track of connected users
const connectedUsers = new Set();

socket.on("receive-location", (data) => {
    console.log("Location received:", data);
    const { id, latitude, longitude } = data;
    map.setView([latitude, longitude]);
    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude]); // Fixed typo
    } else {
        markers[id] = L.marker([latitude, longitude]).addTo(map);
    }

    // Update users list
    if (!connectedUsers.has(data.id)) {
        connectedUsers.add(data.id);
        updateUsersList();
    }
});

socket.on("user-disconnect", (id) => {
    console.log("User disconnected:", id);
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }

    if (connectedUsers.has(id)) {
        connectedUsers.delete(id);
        updateUsersList();
    }
});

// Update the users list in the sidebar
function updateUsersList() {
    const usersList = document.getElementById("users-list");
    usersList.innerHTML = "";
    
    if (connectedUsers.size === 0) {
        const li = document.createElement("li");
        li.textContent = "No other users connected";
        usersList.appendChild(li);
        return;
    }
    
    connectedUsers.forEach(userId => {
        if (userId === socket.id) return; // Skip current user
        
        const li = document.createElement("li");
        li.textContent = userId.substring(0, 6) + "..."; // Show abbreviated ID
        usersList.appendChild(li);
    });
}

// Center map on user's location
document.getElementById("center-map").addEventListener("click", () => {
    if (markers[socket.id]) {
        const position = markers[socket.id].getLatLng();
        map.setView(position, 16);
    }
});

// Share location button
document.getElementById("share-location").addEventListener("click", () => {
    if (markers[socket.id]) {
        const position = markers[socket.id].getLatLng();
        const shareUrl = `https://www.google.com/maps?q=${position.lat},${position.lng}`;
        
        // Use Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: 'My Location',
                text: 'Check out my current location!',
                url: shareUrl
            }).catch(err => {
                // Fallback to copying to clipboard
                copyToClipboard(shareUrl);
            });
        } else {
            // Fallback to copying to clipboard
            copyToClipboard(shareUrl);
        }
    }
});

// Helper function to copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            alert('Location URL copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback
            prompt("Copy this link to share your location:", text);
        });
}

// Initialize empty users list
updateUsersList();

