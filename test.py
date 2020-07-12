import unittest

from app import app, socketio
import os

class BasicTests(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.socketio_test_client = socketio.test_client(app, flask_test_client=app.test_client())


    def test_home(self):
        assert self.app.get("/").status_code == 200

    def test_not_conn(self):
        print(self.socketio_test_client.is_connected())
        assert not self.socketio_test_client.is_connected()



if __name__ == '__main__':
    unittest.main()