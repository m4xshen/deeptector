import { generateText } from "ai"

import { openai } from "./openai"

interface Claim {
  text: string
  claimReview: Array<{
    publisher: {
      name: string
      site: string
    }
    url: string
    textualRating: string
    languageCode: string
    reviewDate: string
  }>
}

export interface FactCheckResponse {
  claims: Array<Claim>
}

export async function checkClaim(
  tweetContent: string
): Promise<FactCheckResponse | null> {
  const apiKey = process.env.PLASMO_PUBLIC_GOOGLE_API_KEY
  const baseUrl = "https://factchecktools.googleapis.com/v1alpha1/claims:search"

  async function searchFactCheck(
    query: string
  ): Promise<FactCheckResponse | null> {
    const url = new URL(baseUrl)
    url.searchParams.append("key", apiKey)
    url.searchParams.append("query", query)
    try {
      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error fetching fact check:", error)
      return null
    }
  }

  // First, try searching with the original tweet content
  const originalResult = await searchFactCheck(tweetContent)
  if (
    originalResult &&
    originalResult.claims &&
    originalResult.claims.length > 0
  ) {
    console.log("Fact check found with original content")
    return originalResult
  }

  // If no claims found, use AI to reformulate the query
  console.log("No claims found with original content. Trying AI reformulation.")
  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: `You are a fact-checking assistant. Your task is to extract the main claim or factual assertion from a given tweet and rephrase it as a concise statement. The goal is to create a clear, searchable phrase that captures the essence of the claim for fact-checking purposes. Provide only the rephrased statement, without any additional commentary or quotation marks. No matter what the language of the tweet is, provide the rephrased statement in English.`,
    prompt: `Here is the tweet content:\n${tweetContent}`
  })

  console.log("AI reformulated fact check text:", text)

  // Search again with the AI-reformulated query
  const aiResult = await searchFactCheck(text)
  if (aiResult && aiResult.claims && aiResult.claims.length > 0) {
    console.log("Fact check found with AI-reformulated content")
    return aiResult
  }

  console.log("No claims found even after AI reformulation")
  return null
}

export async function checkDeepfake(imageBlob) {
  const formData = new FormData()
  formData.append("media", imageBlob, "image.png")
  formData.append("models", "deepfake")
  formData.append("api_user", "1283281248")
  formData.append("api_secret", "B3gFhFi3qHJi2N6VBuhCz6B4myMSUeEi")

  try {
    const response = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: formData
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error calling Sightengine API:", error)
    throw error
  }
}

export async function extractAllArticles(claims: Claim[]): Promise<string[]> {
  const articlePromises = claims.flatMap((claim) =>
    claim.claimReview.map((review) => extractContent(review.url))
  )
  const articles = await Promise.all(articlePromises)
  return articles
    .map((article) => article.content)
    .filter((content) => content !== "")
}

export async function extractContent(
  url: string
): Promise<{ content: string }> {
  try {
    const response = await fetch(
      `${process.env.PLASMO_PUBLIC_BACKEND_URL}/api/extract`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: url })
      }
    )
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error extracting content from", url, ":", error)
    return { content: "" }
  }
}
