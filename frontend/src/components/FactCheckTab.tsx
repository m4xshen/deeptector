import { Skeleton } from "@/components/ui/skeleton"
import Markdown from "markdown-to-jsx"

import { Card, CardHeader } from "./ui/card"

const getOgImage = (url: string) => {
  const domain = new URL(url).hostname
  return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`
}

const StreamingSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-[80%]" />
    <Skeleton className="h-4 w-[60%]" />
    <Skeleton className="h-4 w-[70%]" />
  </div>
)

export default function FactCheckTab({
  factCheckResult,
  isStreaming,
  streamingSummary
}: {
  factCheckResult: any
  isStreaming: boolean
  streamingSummary: string
}) {
  if (typeof factCheckResult === "string") {
    return <div className="text-center mt-10">{factCheckResult}</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {factCheckResult.claims &&
        factCheckResult.claims.map((claim, index) => (
          <Card
            key={index}
            onClick={() => window.open(claim.claimReview[0].url, "_blank")}
            className="cursor-pointer hover:bg-gray-100 transition-colors duration-200 min-h-24">
            <CardHeader className="flex flex-row items-center gap-5">
              <img
                src={getOgImage(claim.claimReview[0].url)}
                className="h-12 rounded border-black"
              />
              <div className="flex flex-col">
                <div>
                  查核單位:{" "}
                  {claim.claimReview[0].publisher.name ||
                    claim.claimReview[0].publisher.site}
                </div>
                <div>
                  結果 : <strong>{claim.claimReview[0].textualRating}</strong>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}

      <div className="mt-4 border-t pt-2 prose">
        {isStreaming && streamingSummary === "" ? (
          <StreamingSkeleton />
        ) : (
          streamingSummary && <Markdown>{streamingSummary}</Markdown>
        )}
      </div>
    </div>
  )
}
