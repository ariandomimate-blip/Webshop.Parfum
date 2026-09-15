import os
from flask import Flask,send_from_directory,jsonify
from cryptomus import register_cryptomus
app=Flask(__name__,static_folder='.',static_url_path='')
CATALOG={str(p['id']):p for p in [
 {'id':1,'name':'ATG No.1','price':89.90},
 {'id':2,'name':'White Essence','price':79.90},
 {'id':3,'name':'Black Phantom','price':89.90},
 {'id':4,'name':'Golden Aura','price':84.90}]
}
register_cryptomus(app,CATALOG)
@app.get('/')
def index():return send_from_directory('.','index.html')
@app.post('/api/chat')
def chat():return jsonify(reply='Der ATG AI-Service ist online. Für Produkt- und Bestellfragen nutze bitte den Shop-Checkout.')
@app.get('/api/health')
def health():return jsonify(ok=True,service='webshop-parfum',cryptomus=bool(os.getenv('CRYPTOMUS_MERCHANT_ID') and os.getenv('CRYPTOMUS_PAYMENT_API_KEY')))
@app.route('/<path:path>')
def static_files(path):return send_from_directory('.',path)
if __name__=='__main__':app.run(host='0.0.0.0',port=int(os.getenv('PORT','5000')))
