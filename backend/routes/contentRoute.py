from fastapi import APIRouter, Response
from controllers.contentController import extract_content
from models.contentModel import UrlInput

router = APIRouter()

@router.post("/extract")
async def extract_content_route(input: UrlInput, response: Response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    return await extract_content(input.url)
