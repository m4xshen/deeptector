const uniqueImageSources = new Set<string>()
const urlToProbabilityMap = new Map<string, number>()

async function realDeepfakeDetection(imageUrl: string): Promise<number> {
  try {
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    const formData = new FormData()

    formData.append("img", blob, "image.jpg")

    const result = await fetch("http://localhost:3000/inference", {
      method: "POST",
      body: formData
    })

    if (!result.ok) {
      throw new Error(`HTTP error! status: ${result.status}`)
    }

    const data = await result.json()
    return data[0].output[0]
  } catch (error) {
    console.error("Error in deepfake detection:", error)
    throw error
  }
}

async function extractTweetImages() {
  const articles = document.querySelectorAll("article")
  const newImageSources: string[] = []
  for (const article of articles) {
    const images = article.querySelectorAll(
      'img[src^="https://pbs.twimg.com/media/"]'
    )
    for (const img of images) {
      const imgElement = img as HTMLImageElement
      if (!uniqueImageSources.has(imgElement.src)) {
        uniqueImageSources.add(imgElement.src)
        newImageSources.push(imgElement.src)
        await addLabelToImage(imgElement)
      } else if (!imgElement.parentElement?.querySelector(".image-label")) {
        await addLabelToImage(imgElement)
      }
    }
  }
  return newImageSources
}

async function addLabelToImage(img: HTMLImageElement) {
  if (img.parentElement?.querySelector(".image-label")) return
  const label = document.createElement("div")
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
  label.textContent = "Analyzing..."
  const loader = document.createElement("div")
  loader.className = "loader"
  loader.style.cssText = `
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    border-top-color: transparent;
    margin-left: 5px;
    animation: spin 1s linear infinite;
  `
  label.appendChild(loader)

  if (!document.querySelector("#loader-keyframes")) {
    const style = document.createElement("style")
    style.id = "loader-keyframes"
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)
  }

  try {
    const probability = await realDeepfakeDetection(img.src)
    urlToProbabilityMap.set(img.src, probability)
    label.textContent = `Deepfake: ${(probability * 100).toFixed(2)}%`
  } catch (error) {
    label.textContent = "Analysis failed"
  }
}

async function printImageSources() {
  const newSources = await extractTweetImages()
  if (newSources.length > 0) {
    console.log("New Tweet Images (with Deepfake Probabilities):")
    newSources.forEach((src) => {
      const probability = urlToProbabilityMap.get(src)
      if (probability !== undefined) {
        console.log(
          `${src} - Deepfake Probability: ${(probability * 100).toFixed(2)}%`
        )
      } else {
        console.log(`${src} - Analysis pending`)
      }
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
    setTimeout(initializeObserver, 1000)
  }
}

setTimeout(initializeObserver, 2000)

export default {}
