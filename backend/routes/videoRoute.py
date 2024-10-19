from fastapi import APIRouter, File, UploadFile, Response
from controllers.videoController import extract_video_content

router = APIRouter()

@router.post("/videoDetect")
async def video_detect_route(response: Response, file: UploadFile = File(...)):
    response.headers["Access-Control-Allow-Origin"] = "*"
    
    # 檢查上傳的檔案是否是 MP4 格式
    if file.content_type != "video/mp4":
        return {"error": "The file must be in MP4 format"}
    
    video_content = await extract_video_content(file)
    
    return video_content
