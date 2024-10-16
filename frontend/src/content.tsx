const uniqueImageSources = new Set<string>()
const urlToCountMap = new Map<string, number>()
let counter = 0

function extractTweetImages() {
  const articles = document.querySelectorAll("article")
  const newImageSources: string[] = []
  articles.forEach((article) => {
    const images = article.querySelectorAll(
      'img[src^="https://pbs.twimg.com/media/"]'
    )
    images.forEach((img) => {
      const imgElement = img as HTMLImageElement
      if (!uniqueImageSources.has(imgElement.src)) {
        uniqueImageSources.add(imgElement.src)
        newImageSources.push(imgElement.src)
        urlToCountMap.set(imgElement.src, counter++)
        addLabelToImage(imgElement)
      } else if (!imgElement.parentElement?.querySelector(".image-label")) {
        // Re-add label if it's missing
        addLabelToImage(imgElement)
      }
    })
  })
  return newImageSources
}

function addLabelToImage(img: HTMLImageElement) {
  if (img.parentElement?.querySelector(".image-label")) return
  const label = document.createElement("div")
  label.textContent = urlToCountMap.get(img.src)?.toString() ?? ""
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
  img.parentElement?.appendChild(label)
}

function printImageSources() {
  const newSources = extractTweetImages()
  if (newSources.length > 0) {
    console.log("New Tweet Image Sources:")
    newSources.forEach((src) => {
      console.log(`${urlToCountMap.get(src)}. ${src}`)
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
