export interface Claim {
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
  claim: string
): Promise<FactCheckResponse | null> {
  const apiKey = process.env.PLASMO_PUBLIC_GOOGLE_API_KEY
  const baseUrl = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
  const url = new URL(baseUrl)
  url.searchParams.append("key", apiKey)
  url.searchParams.append("query", claim)

  try {
    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    return null
  }
}
