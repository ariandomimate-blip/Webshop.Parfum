import os
from flask import Flask,send_from_directory,jsonify
app=Flask(__name__,static_folder='.',static_url_path='')
@app.get('/')
def index():return send_from_directory('.','index.html')
@app.post('/api/chat')
def chat():return jsonify(reply='Der ATG AI-Service ist online. Für Produkt- und Bestellfragen nutze bitte den Shop-Checkout.')
@app.get('/api/health')
def health():return jsonify(ok=True,service='webshop-parfum',cryptomus=False)
@app.route('/<path:path>')
def static_files(path):return send_from_directory('.',path)
if __name__=='__main__':app.run(host='0.0.0.0',port=int(os.getenv('PORT','5000')))
