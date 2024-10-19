import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

export default function ImageCheckGrid({
  tweetImages
}: {
  tweetImages: string[]
}) {
  const [imageData, setImageData] = useState<
    Array<{ url: string; aiGeneratedScore: number | null }>
  >([])

  useEffect(() => {
    const fetchAiData = async () => {
      const initialData = tweetImages.map((url) => ({
        url,
        aiGeneratedScore: null
      }))
      setImageData(initialData)

      await Promise.all(
        tweetImages.map(async (image, index) => {
          try {
            const response = await fetch(
              `https://api.sightengine.com/1.0/check.json?models=genai&api_user=1283281248&api_secret=B3gFhFi3qHJi2N6VBuhCz6B4myMSUeEi&url=${encodeURIComponent(image)}`
            )
            const data = await response.json()
            const aiGeneratedScore =
              data.status === "success" ? data.type.ai_generated : null
            setImageData((prev) => {
              const newData = [...prev]
              newData[index] = { url: image, aiGeneratedScore }
              return newData
            })
          } catch (error) {
            console.error("Error fetching AI data:", error)
          }
        })
      )
    }
    fetchAiData()
  }, [tweetImages])

  if (imageData.length === 0) {
    return <div className="text-center py-4">沒有圖片</div>
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {imageData.map((image, index) => (
        <div key={index} className="flex flex-col items-center">
          <div className="w-full aspect-square relative overflow-hidden mb-2">
            <img
              src={image.url}
              alt={`Tweet image ${index + 1}`}
              className="absolute w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="text-center w-full">
            {image.aiGeneratedScore === null ? (
              <div className="flex justify-center items-center text-gray-500">
                <Loader2 className="animate-spin mr-2" />
              </div>
            ) : (
              <AIContentDetector percentage={image.aiGeneratedScore * 100} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const AIContentDetector = ({ percentage }) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex justify-between">
        <span className="text-sm font-medium">真實</span>
        <span className="text-sm font-medium">AI</span>
      </div>
      <Progress value={percentage} className="h-2" />
      {percentage >= 50 ? (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertDescription>有{percentage}%的機率是AI生成</AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription>僅有{percentage}%的機率是AI生成</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
