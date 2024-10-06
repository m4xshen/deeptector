const uniqueImageSources = new Set()

function extractTweetImages() {
  const articles = document.querySelectorAll("article")
  const newImageSources = []
  articles.forEach((article) => {
    const images = article.querySelectorAll(
      'img[src^="https://pbs.twimg.com/media/"]'
    )
    images.forEach((img) => {
      if (!uniqueImageSources.has(img.src)) {
        uniqueImageSources.add(img.src)
        newImageSources.push(img.src)
        addLabelToImage(img)
      } else if (!img.parentElement.querySelector(".image-label")) {
        // Re-add label if it's missing
        addLabelToImage(img)
      }
    })
  })
  return newImageSources
}

function addLabelToImage(img) {
  if (img.parentElement.querySelector(".image-label")) return
  const label = document.createElement("div")
  label.textContent = "test"
  label.className = "image-label"
  label.style.cssText = `
    position: absolute;
    top: 12px;
    right: 12px;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 3px 6px;
    border-radius: 6px;
    font-size: 15px;
    font-family: Inter, sans-serif;
    z-index: 1000;
  `
  img.parentElement.appendChild(label)
}

function printImageSources() {
  const newSources = extractTweetImages()
  if (newSources.length > 0) {
    console.log("New Tweet Image Sources:")
    newSources.forEach((src, index) => {
      console.log(
        `${uniqueImageSources.size - newSources.length + index + 1}. ${src}`
      )
    })
  }
}

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      printImageSources()
    }
  })
})

function initializeObserver() {
  const timeline = document.querySelector('div[aria-label="Home timeline"]')
  if (timeline) {
    observer.observe(timeline, { childList: true, subtree: true })
    console.log("Observing timeline for new tweets...")
    printImageSources()
  } else {
    console.log(
      "Timeline not found. Make sure you're on the Twitter home page."
    )
    setTimeout(initializeObserver, 1000) // Retry after 1 second
  }
}

setTimeout(initializeObserver, 2000)

export default {}
