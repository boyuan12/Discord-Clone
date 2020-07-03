from functools import wraps
from flask import request, redirect, url_for, session
import random
import string

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("user_id"):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def random_str(digit=7):
    answer = ""
    for i in range(digit):
        answer += random.choice(string.ascii_letters + string.digits)
    return answer

def timestamp():
    from datetime import datetime
    datetimeobj = datetime.now()
    timestamp = datetimeobj.strftime("%b-%d-%Y (%H:%M)")
    return timestamp