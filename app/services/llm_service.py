import json
from fastapi import HTTPException
from openai import AsyncOpenAI
from app.core.config import settings
from app.models.domain import CharacterModel

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL)

def build_system_prompt(character: CharacterModel) -> str:
    return f"""你扮演{character.name}。
性格特征：{character.personality}
当前场景：{character.scenario}

你们正在微信上聊天。
你需要在回复用户的同时，在后台输出心理分析的JSON。
请严格返回JSON格式，结构如下：
{{
  "coach_analysis": {{"flaw": "指出男方话语中的直男问题/缺点", "subtext": "女方真实的潜台词/心理活动", "advice": "教练给男方的建议"}},
  "girl_reply": {{"reply_text": "{character.name}发给男方的具体文字内容"}}
}}
注意：请直接返回合法的 JSON 文本，不要包裹 Markdown 的 ```json 标签，也不要包含任何多余的解释。"""

async def generate_chat_response(character: CharacterModel, recent_messages: list):
    system_prompt = build_system_prompt(character)
    
    gpt_messages = [{"role": "system", "content": system_prompt}]
    
    for msg in recent_messages:
        role = "assistant" if msg.role == "girl" else "user"
        gpt_messages.append({"role": role, "content": msg.content})

    try:
        completion = await client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=gpt_messages,
            temperature=0.7
        )
        
        response_content = completion.choices[0].message.content.strip()
        
        if response_content.startswith("```json"):
            response_content = response_content[7:]
        if response_content.endswith("```"):
            response_content = response_content[:-3]
        response_content = response_content.strip()
        
        response_json = json.loads(response_content)
        
        girl_reply_text = response_json.get("girl_reply", {}).get("reply_text", "")
        coach_analysis_data = response_json.get("coach_analysis", {})
        
        return girl_reply_text, coach_analysis_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
