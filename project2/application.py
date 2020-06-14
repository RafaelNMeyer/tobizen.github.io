import os
import json
import json
import datetime

from json import JSONEncoder
from flask import Flask, jsonify ,render_template
from flask_socketio import SocketIO, emit
from collections import namedtuple

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

channels = []
users = []
class Channel:

    counter = 1

    def __init__(self, channel_name):
        self.channel_name = channel_name
        self.messages = []
        self.id = Channel.counter
        Channel.counter += 1
        self.message_counter = 0

    def add_message(self, m):
        self.messages.append(m)
        self.message_counter+=1
        if self.message_counter > 100:
            self.messages.pop(0)

    def delete_message(self, m):
        self.messages.remove(m)
        self.message_counter-=1

class Message:
    message_id = 1
    def __init__(self, user, date, message):
        self.user = user
        self.date = date
        self.message = message
        self.message_id = Message.message_id
        Message.message_id += 1
class User:
    counter = 1
    def __init__(self, name):
        self.name = name
        self.id = User.counter
        User.counter+=1

class Encoder(JSONEncoder):
    def default(self, o):
        return o.__dict__

def decoder(dict):
    return namedtuple('X', dict.keys())(*dict.values())
    


@app.route("/")
def index():
    return render_template("index.html", channels=channels)

@socketio.on("create user")
def create_user(data):
    user = User(data["user"])
    userJSON = json.dumps(user, indent=4, cls=Encoder)
    emit("announce user", userJSON, broadcast=False)

@socketio.on("delete message")
def delete_message(data):
    m_id = data["message_id"]
    current_channel = data["current_channel"]
    for channel in channels:
        if current_channel == channel.channel_name:
            for m in channel.messages:
                if m.message_id == int(m_id):
                    channel.delete_message(m)
    emit("announce delete", m_id,broadcast=True)

@socketio.on("exists")
def exists(data):
    exists = False
    for channel in channels:
        if channel.channel_name == data["channel_name"]:
            exists = True
    emit("exists channel", exists, broadcast=False)

@socketio.on("create channel")
def channel(data):
    exists = False
    channelJSON = False
    for channel in channels:
        if channel.channel_name == data["channel_name"]:
            exists = True
    if not exists:
        channel = Channel(data["channel_name"])
        channelJSON = json.dumps(channel, indent=4, cls=Encoder)
        channels.append(channel)
    ce = {"c":channelJSON, "e":exists}
    emit("announce channel", ce, broadcast=True)

@socketio.on("load channels")
def load_channels():
    channelsJSONS = []
    for channel in channels:
        channelsJSONS.append(json.dumps(channel, indent=4, cls=Encoder))
    emit("announce channels", channelsJSONS, broadcast=False)

@socketio.on("load messages")
def load_messages(data):
    channel_name = data["channel_name"]
    messagesJSON = []
    for channel in channels:
        if (channel.channel_name == channel_name):
            for message in channel.messages:
                messagesJSON.append(json.dumps(message, indent=4, cls=Encoder))
    emit("announce messages", messagesJSON, broadcast=False)

@socketio.on("send message")
def send_message(data):
    channel_name = data["channel_name"]
    message = data["message"]
    user = data["user"]
    date_now = datetime.datetime.now()
    date_time = date_now.strftime("%d/%m/%Y %H:%M:%S") 
    m = Message(message=message, user=user, date=date_time)
    mJSON = json.dumps(m, indent=4, cls=Encoder)
    mJSON_counter = {'mJSON': mJSON, 'counter': 0}
    for channel in channels:
        if (channel.channel_name == channel_name):
            channel.add_message(m)
            mJSON_counter['counter'] = channel.message_counter
    emit("announce message", mJSON_counter, broadcast=True)
    
