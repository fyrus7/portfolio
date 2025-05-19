
let loadedImageData = [];
let currentIndex = 0;
let loadOffset = 0;
const LIMIT = 10;

// === GRID MODE HANDLING ===
let gridMode = localStorage.getItem('gridMode') || 'less';

function setGridMode(mode) {
  if (mode !== 'more' && mode !== 'less') return;

  gridMode = mode;
  localStorage.setItem('gridMode', mode);
  renderAllImages();

  const btnMore = document.getElementById('btnGridMore');
  const btnLess = document.getElementById('btnGridLess');

  // Toggle "active" class only
  btnMore.classList.toggle('active', mode === 'more');
  btnLess.classList.toggle('active', mode === 'less');
}


window.onload = () => {
  setGridMode(gridMode);
  loadMoreImages();
};

function loadMoreImages() {
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const loader = document.querySelector(".loader");

  loadMoreBtn.innerHTML = "Loading...";
  loadMoreBtn.disabled = true;
  loader.style.display = "inline-block";

  const currentScrollPosition = window.scrollY;

  google.script.run
    .withSuccessHandler((newImages) => {
      loader.style.display = "none";
      appendImages(newImages);
      window.scrollTo(0, currentScrollPosition);
    })
    .getImagesFromFolder(LIMIT, loadOffset);
}

function appendImages(newImages) {
  if (!newImages || newImages.length === 0) {
    document.getElementById("loadMoreBtn").style.display = "none";
    return;
  }

  const uniqueNewImages = newImages.filter(
    newImg => !loadedImageData.some(existing => existing.url === newImg.url)
  );

  if (uniqueNewImages.length === 0) {
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    loadMoreBtn.innerHTML = "No More Images";
    loadMoreBtn.disabled = true;
    return;
  }

  loadOffset += uniqueNewImages.length;
  loadedImageData = loadedImageData.concat(uniqueNewImages);
  renderNewImages(uniqueNewImages, true);
  
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  loadMoreBtn.innerHTML = "Load More";
  loadMoreBtn.disabled = false;
}

function renderAllImages() {
  document.getElementById("imageGrid").innerHTML = "";
  renderNewImages(loadedImageData);
}

function renderNewImages(imagesToRender, isNew = false) {
  const container = document.getElementById("imageGrid");

  const TARGET_ROW_HEIGHT = 200;
  let MAX_IMAGES_PER_ROW = 5;
  const width = window.innerWidth;

  if (gridMode === 'less') {
    if (width < 850) {
      MAX_IMAGES_PER_ROW = 1;
    } else if (width < 1050) {
      MAX_IMAGES_PER_ROW = 2;
    } else if (width < 1550) {
      MAX_IMAGES_PER_ROW = 3;
    } else {
      MAX_IMAGES_PER_ROW = 4;
    }
  } else { // more
    if (width < 850) {
      MAX_IMAGES_PER_ROW = 2;
    } else if (width < 1050) {
      MAX_IMAGES_PER_ROW = 3;
    } else if (width < 1550) {
      MAX_IMAGES_PER_ROW = 4;
    } else {
      MAX_IMAGES_PER_ROW = 5;
    }
  }

  const containerWidth = container.clientWidth;
  let row = [];
  let rowWidth = 0;

  function addRow(row, rowWidth) {
    const rowDiv = document.createElement("div");
    rowDiv.className = "row";
    const scale = containerWidth / rowWidth;

    row.forEach(item => {
      const img = document.createElement("img");
      img.src = item.thumbnailUrl;
      img.alt = item.name;
      img.style.height = `${TARGET_ROW_HEIGHT * scale}px`;
      img.style.width = `${TARGET_ROW_HEIGHT * scale * item.ratio}px`;
      img.classList.add("thumbnail-image");

      if (isNew) img.classList.add("fade-in");

      img.onclick = () => {
        openModal(loadedImageData.findIndex(i => i.url === item.url));
      };

      rowDiv.appendChild(img);
    });

    container.appendChild(rowDiv);
  }

  const preload = imagesToRender.map(img => new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const ratio = image.naturalWidth / image.naturalHeight;
      resolve({ ...img, ratio });
    };
    image.src = img.thumbnailUrl;
  }));

  Promise.all(preload).then(loadedImages => {
    for (let i = 0; i < loadedImages.length; i++) {
      const img = loadedImages[i];
      const scaledWidth = img.ratio * TARGET_ROW_HEIGHT;
      row.push(img);
      rowWidth += scaledWidth;

      if (row.length >= MAX_IMAGES_PER_ROW) {
        addRow(row, rowWidth);
        row = [];
        rowWidth = 0;
      }
    }

    if (row.length > 0) {
      addRow(row, rowWidth);
    }
  });
}

window.addEventListener("resize", () => {
  renderAllImages();
});


let touchStartX = 0;
let touchEndX = 0;

const modalImg = document.getElementById("modal-img");

modalImg.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

modalImg.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipeThreshold = 50;

  if (touchEndX < touchStartX - swipeThreshold) {
    if (currentIndex < loadedImageData.length - 1) {
      animateSwipe("left", () => {
        currentIndex++;
        showModalImage(currentIndex);
      });
    }
  } else if (touchEndX > touchStartX + swipeThreshold) {
    if (currentIndex > 0) {
      animateSwipe("right", () => {
        currentIndex--;
        showModalImage(currentIndex);
      });
    }
  }
}

function animateSwipe(direction, callback) {
  const modalImg = document.getElementById("modal-img");

  modalImg.style.transition = "transform 0.3s ease, opacity 0.3s ease";
  modalImg.style.transform = direction === "left" ? "translateX(-100%)" : "translateX(100%)";
  modalImg.style.opacity = "0";

  setTimeout(() => {
    callback();

    modalImg.style.transition = "none";
    modalImg.style.transform = direction === "left" ? "translateX(100%)" : "translateX(-100%)";

    requestAnimationFrame(() => {
      modalImg.style.transition = "transform 0.3s ease, opacity 0.3s ease";
      modalImg.style.transform = "translateX(0)";
      modalImg.style.opacity = "1";
    });
  }, 300);
}

document.getElementById("modal-close").onclick = function () {
  const modal = document.getElementById("modal");
  modal.classList.add("fade-out");
  setTimeout(() => {
    modal.style.display = "none";
    modal.classList.remove("fade-out");
    document.getElementById("modal-img").src = "";
  }, 300);
};

document.getElementById("modal-prev").onclick = function () {
  if (currentIndex > 0) {
    currentIndex--;
    showModalImage(currentIndex);
  }
};

document.getElementById("modal-next").onclick = function () {
  if (currentIndex < loadedImageData.length - 1) {
    currentIndex++;
    showModalImage(currentIndex);
  }
};

function updateModal(index) {
  const modalImg = document.getElementById("modal-img");
//  const downloadBtn = document.getElementById("download-btn");
  
  const item = loadedImageData[index];
  modalImg.src = item.url;
//  downloadBtn.href = item.downloadUrl;
//  downloadBtn.setAttribute("download", item.name);
}

function showModalImage(index) {
  updateModal(index);  // Panggil updateModal untuk kemas kini modal
}

function openModal(index) {
  currentIndex = index;
  const modal = document.getElementById("modal");
  
  updateModal(index);  // Panggil updateModal untuk kemas kini modal

  modal.classList.remove("fade-out");
  modal.style.display = "flex";
}


window.onclick = function (event) {
  const modal = document.getElementById("modal");
  if (event.target === modal) {
    modal.classList.add("fade-out");
    setTimeout(() => {
      modal.style.display = "none";
      modal.classList.remove("fade-out");
      document.getElementById("modal-img").src = "";
    }, 300);
  }
};

document.addEventListener("keydown", function (e) {
  const modal = document.getElementById("modal");
  if (modal.style.display === "flex") {
    if (e.key === "ArrowLeft" && currentIndex > 0) {
      currentIndex--;
      showModalImage(currentIndex);
    } else if (e.key === "ArrowRight" && currentIndex < loadedImageData.length - 1) {
      currentIndex++;
      showModalImage(currentIndex);
    } else if (e.key === "Escape") {
      document.getElementById("modal-close").click();
    }
  }
});

</script>


<script> // scroll from header to imageGrid
  document.addEventListener("DOMContentLoaded", function () {
    const scrollLink = document.getElementById("scrollLink");
    const target = document.getElementById("scrollTarget");

    if (scrollLink && target) {
      scrollLink.addEventListener("click", function () {
        target.scrollIntoView({ behavior: "smooth" });
      });
    }
  });
</script>

<script>
  const topBtn = document.getElementById('scrollToTopBtn');
  const header = document.querySelector('.header-image-container');
  let scrollTimeout;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      topBtn.style.display = 'block';

      // Reset timeout setiap kali scroll
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        topBtn.style.display = 'none';
      }, 5000); // 5 saat
    } else {
      topBtn.style.display = 'none';
      clearTimeout(scrollTimeout);
    }
  });

  topBtn.addEventListener('click', () => {
    header.scrollIntoView({ behavior: 'smooth' });
  });
