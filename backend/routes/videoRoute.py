import logging
from fastapi import APIRouter, Response, HTTPException
from controllers.videoController import extract_video_content_by_id
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/videoDetect")
async def video_detect_route(response: Response, video_id: str):
    try:
        response.headers["Access-Control-Allow-Origin"] = "*"
        logger.info(f"Processing video with ID: {video_id}")
        
        video_content = await extract_video_content_by_id(video_id)
        
        logger.info(f"Video content extracted successfully for ID: {video_id}")
        return video_content
    except Exception as e:
        logger.error(f"Error processing video ID {video_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")