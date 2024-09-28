from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import markdown2
from details import (custom_instructions, title_name, title_icons, nav_img_url,bot_name, custom_questions)

app = Flask(__name__)

# Load configuration from JSON file

genai.configure(api_key="AIzaSyC0br2ojApvYftpmJ6vwtdjzlwPHzmIf40")

generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
    system_instruction=custom_instructions,
)

chat_session = model.start_chat(history=[])

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        user_input = request.form['query']
        response = chat_session.send_message(user_input)
        bot_output = markdown2.markdown(response.text)
        return jsonify(user_input=user_input, bot_output=bot_output)
    
    # Reload config for each request to ensure we have the latest data
    
    title = request.args.get('title', title_name)
    bot = request.args.get("bot_name", bot_name)
    nav_image_url = request.args.get("bot_image", nav_img_url)
    title_img = title_icons["url"]
    title_img_type = title_icons["type"]
    q1 = request.args.get("q1", custom_questions[1])
    q2 = request.args.get("q2", custom_questions[2])
    q3 = request.args.get("q3", custom_questions[3])
    q4 = request.args.get("q4", custom_questions[4])

    return render_template('index.html', title=title, bot_name=bot, nav_img=nav_image_url, title_img=title_img, title_img_type=title_img_type, q1=q1, q2=q2,q3=q3,q4=q4)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)



    