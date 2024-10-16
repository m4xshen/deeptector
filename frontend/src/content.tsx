const uniqueImageSources = new Set<string>()
const urlToProbabilityMap = new Map<string, number>()

async function realAIGeneratedDetection(imageUrl: string): Promise<number> {
  if (urlToProbabilityMap.has(imageUrl)) {
    return urlToProbabilityMap.get(imageUrl)!
  }

  try {
    const apiUrl = new URL("https://api.sightengine.com/1.0/check.json")
    apiUrl.searchParams.append("models", "genai")
    apiUrl.searchParams.append("api_user", process.env.PLASMO_PUBLIC_API_USER)
    apiUrl.searchParams.append(
      "api_secret",
      process.env.PLASMO_PUBLIC_API_SECRET
    )
    apiUrl.searchParams.append("url", imageUrl)

    const response = await fetch(apiUrl.toString())

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== "success") {
      throw new Error("API request failed")
    }

    const probability = data.type.ai_generated

    // Store the result in the map
    urlToProbabilityMap.set(imageUrl, probability)

    return probability
  } catch (error) {
    console.error("Error in AI generated detection:", error)
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
    const probability = await realAIGeneratedDetection(img.src)
    label.textContent = `AI Generated: ${(probability * 100).toFixed(2)}%`
  } catch (error) {
    label.textContent = "Analysis failed"
  }
}

async function printImageSources() {
  const newSources = await extractTweetImages()
  if (newSources.length > 0) {
    console.log("New Tweet Images (with AI Generated Probabilities):")
    newSources.forEach((src) => {
      const probability = urlToProbabilityMap.get(src)
      if (probability !== undefined) {
        console.log(
          `${src} - AI Generated Probability: ${(probability * 100).toFixed(2)}%`
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
