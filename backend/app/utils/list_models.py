import os
from google import genai
from dotenv import load_dotenv

# 1. Load API Key
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

def list_my_available_models():
    if not api_key:
        print("LỖI: Kiểm tra lại file .env, chưa thấy GEMINI_API_KEY!")
        return

    client = genai.Client(api_key=api_key)
    
    print(f"{'='*80}")
    print(f"{'MODEL NAME':<40} | {'SUPPORTED METHODS'}")
    print(f"{'='*80}")

    try:
        # Lấy danh sách model từ Google
        for model in client.models.list():
            # Thử lấy supported_methods, nếu không có thì để trống
            methods = getattr(model, 'supported_methods', [])
            # Lọc bớt các phương thức thừa cho gọn
            method_str = ", ".join([m.replace("generateContent", "📝") for m in methods if "generateContent" in m])
            
            print(f"{model.name:<40} | {method_str if method_str else 'N/A'}")
            
    except Exception as e:
        print(f"❌ Lỗi hệ thống: {str(e)}")

    print(f"{'='*80}")

if __name__ == "__main__":
    list_my_available_models()